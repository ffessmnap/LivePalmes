"use strict";
const p = require("./club-merge-plan"), crypto = require("node:crypto");
const root = "https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents";
const prefix = "projects/livepalmes/databases/(default)/documents/";
const hash = v => crypto.createHash("sha256").update(v).digest("hex");
function adapter(token,fetcher=fetch,scope=p) {
  const ids=[...scope.ids];
  if (!ids.length || ids.length>26 || new Set(ids).size!==ids.length || ids.some(id=>!/^\d+$/.test(id)||Number(id)<=0||Number(id)>2147483647)) p.fail("INVALID_FIRESTORE_CLUB_SCOPE");
  async function api(action,body) {
    const response = await fetcher(root+action,{method:"POST",headers:{Authorization:"Bearer "+await token(),"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    if (!response.ok) p.fail("FIRESTORE_REQUEST_FAILED_"+response.status);
    return response.json();
  }
  const normalize = d => ({path:d.name.slice(prefix.length),fields:d.fields || {},updateTime:d.updateTime});
  async function get(paths) {
    const docs = [];
    for (let i=0;i<paths.length;i+=100) {
      const data = await api(":batchGet",{documents:paths.slice(i,i+100).map(v => prefix+v)});
      if (!Array.isArray(data) || data.length !== Math.min(100,paths.length-i)) p.fail("FIRESTORE_BATCH_INCOMPLETE");
      for (const row of data) {
        if (row.found) docs.push(normalize(row.found));
        else if (row.missing) docs.push({path:row.missing.slice(prefix.length),fields:null,updateTime:null});
        else p.fail("FIRESTORE_BATCH_INCOMPLETE");
      }
    }
    if (new Set(docs.map(d => d.path)).size !== paths.length || docs.some(d => !paths.includes(d.path))) p.fail("FIRESTORE_BATCH_MISMATCH");
    return docs.sort((a,b) => a.path.localeCompare(b.path));
  }
  async function query(collection,field,values,limit=101) {
    const result = await api(":runQuery",{structuredQuery:{from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:field},op:"IN",value:{arrayValue:{values}}}},limit}});
    const docs = result.filter(r => r.document).map(r => normalize(r.document));
    if (docs.length >= limit) p.fail("FIRESTORE_QUERY_LIMIT");
    return docs;
  }
  async function inventory(sql) {
    const docs = new Map();
    const queries = [["users","clubId"],["users","accessScopes.`engagements.club.manage`.scopeId"],["accessGrants","scopeId"],["engagementAccessRequests","clubId"],...["engagementClubSwimmers","engagementClubPeople","engagementClubEntries","performances"].map(c => [c,"clubId"])];
    for (const [collection,field] of queries) for (const type of ["stringValue","integerValue"]) {
      const found = await query(collection,field,ids.map(id => ({[type]:id})),["users","accessGrants"].includes(collection) ? 101 : 501);
      if (!["users","accessGrants","engagementAccessRequests"].includes(collection) && found.length) p.fail("NEW_FIRESTORE_DEPENDENCY");
      for (const doc of found) docs.set(doc.path,doc);
    }
    const direct = await get(ids.flatMap(id => ["engagementClubs","engagementClubRosters","engagementClubPeopleRosters"].map(c => c+"/"+id)));
    if (direct.some(d => d.fields)) p.fail("NEW_CLUB_DOCUMENT");
    const swimmers = sql.nageurs.map(r => String(r.id));
    if (swimmers.length > 4000) p.fail("SWIMMER_RESERVATION_LIMIT");
    const reservations = await get(swimmers.map(id => "auditLogs/nap-swimmer-merge-person-"+id));
    if (reservations.some(d => p.wire(d,"state") === "pending")) p.fail("SWIMMER_MERGE_PENDING");
    return {docs:[...docs.values()].sort((a,b) => a.path.localeCompare(b.path)),safety:{direct,reservations}};
  }
  async function commit(plan,direction) {
    const current = await get(plan.docs.map(d => d.path)), writes = [];
    for (const doc of current) {
      const change = plan.firestore.find(o => o.path === doc.path), original = plan.docs.find(d => d.path === doc.path);
      const goal = change ? direction === "restore" ? change.before : change.after : original.fields;
      const other = change ? direction === "restore" ? change.after : change.before : original.fields;
      if (!doc.fields || !p.equal(doc.fields,goal) && !p.equal(doc.fields,other)) p.fail("FIRESTORE_PROFILE_DRIFT");
      if (p.equal(doc.fields,goal)) writes.push({verify:prefix+doc.path,currentDocument:{updateTime:doc.updateTime}});
      else writes.push({update:{name:prefix+doc.path,fields:goal},updateMask:{fieldPaths:change.mask},currentDocument:{updateTime:doc.updateTime}});
    }
    // All profile, scope and request changes are one atomic CAS. Verifications
    // also protect both accounts kept as-is and their existing grants.
    await api(":commit",{writes});
  }
  async function projections(plan,club) {
    const user = plan.firestore.find(d => d.path.startsWith("users/")), uid = user.path.slice(6);
    const expected = club === "126" ? user.after : user.before;
    const region = expected.regionId?.stringValue;
    const paths = ["accessDirectorySnapshotState/default","accessDirectorySnapshots/national","engagementClubAdminDirectories/default",`engagementMailRecipientShards/engagements_club_manage-${parseInt(hash(uid).slice(0,8),16)%32}`];
    if (region) paths.push("accessDirectorySnapshots/region:"+encodeURIComponent(region));
    const result = await get(paths), find = path => result.find(d => d.path === path);
    if (p.wire(find(paths[0]),"status") !== "ready") p.fail("PRIVATE_DIRECTORY_NOT_READY");
    for (const path of paths.filter(v => v.startsWith("accessDirectorySnapshots/"))) {
      const entry = find(path)?.fields?.entries?.mapValue?.fields?.[hash(uid).slice(0,32)]?.mapValue?.fields;
      if (!entry || entry.clubId?.stringValue !== club || !p.equal(entry.accessScopes,expected.accessScopes)) p.fail("PRIVATE_DIRECTORY_NOT_CONVERGED");
    }
    const admin = find(paths[2])?.fields?.admins?.mapValue?.fields?.[hash(uid).slice(0,24)]?.mapValue?.fields;
    const recipient = find(paths[3])?.fields?.recipients?.mapValue?.fields?.[hash(uid).slice(0,24)]?.mapValue?.fields;
    if (admin?.clubId?.stringValue !== club || recipient?.clubId?.stringValue !== club) p.fail("ADMIN_OR_RECIPIENT_NOT_CONVERGED");
    return result;
  }
  return {get,query,inventory,commit,projections};
}
module.exports = {adapter,root,prefix};
