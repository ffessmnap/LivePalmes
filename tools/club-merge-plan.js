"use strict";
// Fixed, one-off operation. No connection or write at module load.
const crypto = require("node:crypto");
const {isDeepStrictEqual: equal} = require("node:util");
const pairs = Object.freeze([[389,413],[551,209],[718,719],[223,444],[457,345],[123,278],[382,662],[532,639],[518,126],[664,45],[708,188],[651,220],[699,220],[698,220]].map(p => Object.freeze(p.map(String))));
const targets = [...new Set(pairs.map(p => p[1]))], ids = [...new Set(pairs.flat())], mapping = new Map(pairs);
// table, fields, primary key, index for each field. All identifiers are constants.
const relations = Object.freeze([
  ["chefsdequipe",["club","pourclub"],["id"],["livepalmes_club_id","livepalmes_pourclub_id"]],
  ["engagements_relais",["club"],["id"],["livepalmes_club_id"]],
  ["import_relais",["club"],["id"],["livepalmes_club_id"]],
  ["livepalmes_club_entry_options",["club_id"],["competition_id","club_id"],["club_competition"]],
  ["livepalmes_club_people_options",["club_id"],["source","person_id"],["club_person"]],
  ["livepalmes_deleted_people_history",["entry_club","club"],["engagement_id"],["livepalmes_entry_club_id","livepalmes_club_id"]],
  ["livepalmes_qualification_grants",["club_id"],["competition_id","swimmer_id","event_code"],["livepalmes_club_id"]],
  ["nageurs",["club"],["id"],["livepalmes_club_id"]],
  ["officiels",["club"],["id"],["livepalmes_club_id"]],
  ["officielsengager",["club"],["id"],["livepalmes_club_id"]],
  ["perfs",["club"],["id"],["livepalmes_club_id"]],
  ["perfs_relais",["club"],["id"],["livepalmes_club_id"]],
  ["txt_clubs",["club"],["id"],["livepalmes_club_id"]],
  ["txt_nageurs",["club"],["id"],["livepalmes_club_id"]],
  ["winpalme_lignes",["club"],["id"],["livepalmes_club_id"]]
]);
const tables = ["clubs",...relations.map(r => r[0])];
function fail(code) { throw new Error(code); }
// Tagged encoding does not confuse SQL buffers with user JSON objects; refuses
// unsafe JS numbers and Date (SQL dates must keep all fractional digits).
function encode(value) {
  if (value === null) return ["null"];
  if (Buffer.isBuffer(value)) return ["bytes",value.toString("base64")];
  if (Array.isArray(value)) return ["array",value.map(encode)];
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) return ["object",Object.keys(value).sort().map(k => [k,encode(value[k])])];
  if (["string","boolean"].includes(typeof value)) return [typeof value,value];
  if (typeof value === "number" && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))) return ["number",value];
  fail("UNSUPPORTED_OR_LOSSY_VALUE");
}
function decode(value) {
  const [tag,v] = value;
  if (tag === "null") return null;
  if (tag === "bytes") return Buffer.from(v,"base64");
  if (tag === "array") return v.map(decode);
  if (tag === "object") return Object.fromEntries(v.map(([k,x]) => [k,decode(x)]));
  if (["string","boolean","number"].includes(tag)) return v;
  fail("INVALID_ENCODING");
}
const clone = v => decode(encode(v));
const digest = v => crypto.createHash("sha256").update(JSON.stringify(encode(v))).digest("hex");
const key = (row,pk) => JSON.stringify(pk.map(f => { if (!Object.hasOwn(row,f) || row[f] === null) fail("MISSING_PRIMARY_KEY"); return String(row[f]); }));
function wire(doc,field) { return doc?.fields?.[field]?.stringValue ?? doc?.fields?.[field]?.integerValue ?? ""; }
function scope(doc) { return doc?.fields?.accessScopes?.mapValue?.fields?.["engagements.club.manage"]?.mapValue?.fields; }
function changeDoc(doc,target,clubName) {
  const after = clone(doc.fields);
  if (doc.path.startsWith("users/")) {
    if (wire(doc,"clubId") !== "518" || scope(doc)?.scopeId?.stringValue !== "518" || scope(doc)?.scopeType?.stringValue !== "club") fail("CORBIE_SCOPE_CHANGED");
    after.clubId = {stringValue:target}; after.clubName = {stringValue:clubName};
    after.accessScopes.mapValue.fields["engagements.club.manage"].mapValue.fields.scopeId = {stringValue:target};
    return {path:doc.path,before:doc.fields,after,mask:["clubId","clubName","accessScopes.`engagements.club.manage`.scopeId"]};
  }
  const field = doc.path.startsWith("accessGrants/") ? "scopeId" : "clubId";
  after[field] = {stringValue:target};
  return {path:doc.path,before:doc.fields,after,mask:[field]};
}
function prepare(inventory,operation) {
  if (!/^[a-z0-9-]{8,80}$/.test(operation || "") || inventory.project !== "livepalmes" || inventory.database !== "nage-palmes") fail("INVALID_OPERATION_OR_TARGET");
  if (!inventory.complete || !inventory.meta || !Array.isArray(inventory.docs)) fail("INCOMPLETE_INVENTORY");
  if (Buffer.byteLength(JSON.stringify(encode(inventory))) > 32000000) fail("INVENTORY_TOO_LARGE");
  const sql = {}, changes = [], guards = [], clubs = inventory.sql.clubs;
  if (!Array.isArray(clubs) || clubs.length !== 26 || new Set(clubs.map(r => String(r.num_club))).size !== 26 || clubs.some(r => !ids.includes(String(r.num_club)))) fail("CLUB_SET_CHANGED");
  for (const expected of require("./club-merge-clubs.json").clubs) {
    const current = clubs.find(r => Number(r.num_club) === expected.num_club);
    if (Object.keys(expected).some(f => !equal(current[f],expected[f]))) fail("APPROVED_CLUB_IDENTITY_CHANGED");
  }
  for (const table of tables) {
    const rows = inventory.sql[table];
    if (!Array.isArray(rows) || rows.length >= 10001) fail("ROW_LIMIT_OR_TABLE_MISSING");
    const relation = relations.find(r => r[0] === table), pk = relation?.[2] || ["num_club"];
    sql[table] = [...rows].sort((a,b) => key(a,pk).localeCompare(key(b,pk)));
    const seen = new Set(), finalKeys = new Set();
    for (const row of sql[table]) {
      const rowKey = key(row,pk);
      if (seen.has(rowKey)) fail("DUPLICATE_PRIMARY_KEY"); seen.add(rowKey);
      let after = clone(row);
      if (table === "clubs") {
        if (mapping.has(String(row.num_club))) after = null;
      } else for (const f of relation[1]) {
        const target = mapping.get(String(row[f]));
        if (target) after[f] = typeof row[f] === "number" ? Number(target) : target;
      }
      if (after) {
        const finalKey = key(after,pk);
        if (finalKeys.has(finalKey)) fail("PRIMARY_KEY_COLLISION"); finalKeys.add(finalKey);
      }
      if (!equal(row,after)) {
        // These tables were empty in the approved audit. Never rewrite an audit
        // history or a qualification grant discovered after that audit.
        if (["livepalmes_deleted_people_history","livepalmes_qualification_grants"].includes(table)) fail("NEW_SENSITIVE_DEPENDENCY");
        changes.push({table,pk,before:clone(row),after});
      } else guards.push({table,pk,row:clone(row)});
    }
  }
  const docs = inventory.docs;
  if (new Set(docs.map(d => d.path)).size !== docs.length || docs.some(d => !/^(users|accessGrants|engagementAccessRequests)\/[^/]+$/.test(d.path) || !d.updateTime || !d.fields)) fail("DOCUMENT_SET_INVALID");
  const users = docs.filter(d => d.path.startsWith("users/"));
  if (docs.length !== 7 || docs.filter(d => d.path.startsWith("accessGrants/")).length !== 3 || docs.filter(d => d.path.startsWith("engagementAccessRequests/")).length !== 1) fail("ACCOUNT_DEPENDENCY_SET_CHANGED");
  if (users.length !== 3 || users.filter(d => wire(d,"clubId") === "126").length !== 2 || users.filter(d => wire(d,"clubId") === "518").length !== 1) fail("ACCOUNT_SET_CHANGED");
  const moved = users.find(d => wire(d,"clubId") === "518"), uid = moved.path.split("/")[1];
  if (users.some(d => wire(d,"status") !== "active" || Object.keys(d.fields.capabilities?.mapValue?.fields || {}).filter(k => d.fields.capabilities.mapValue.fields[k].booleanValue === true).join() !== "engagements.club.manage")) fail("ROLES_CHANGED");
  if (users.some(d => scope(d)?.scopeType?.stringValue !== "club" || scope(d)?.scopeId?.stringValue !== wire(d,"clubId"))) fail("ACCOUNT_SCOPE_CHANGED");
  if (docs.filter(d => d.path.startsWith("accessGrants/")).some(d => !users.some(u => u.path === "users/"+wire(d,"uid") && wire(u,"clubId") === wire(d,"scopeId")) || wire(d,"scopeType") !== "club" || wire(d,"status") !== "active" || wire(d,"capability") !== "engagements.club.manage")) fail("ACCOUNT_GRANTS_CHANGED");
  const grants = docs.filter(d => d.path.startsWith("accessGrants/") && wire(d,"scopeId") === "518");
  const requests = docs.filter(d => d.path.startsWith("engagementAccessRequests/") && wire(d,"clubId") === "518");
  if (grants.length !== 1 || wire(grants[0],"uid") !== uid || wire(grants[0],"scopeType") !== "club" || wire(grants[0],"capability") !== "engagements.club.manage" || wire(grants[0],"status") !== "active" || requests.length !== 1 || !["approved","rejected"].includes(wire(requests[0],"status"))) fail("CORBIE_DEPENDENCIES_CHANGED");
  const clubName = clubs.find(r => String(r.num_club) === "126").nom_club;
  const firestore = [moved,grants[0],requests[0]].map(d => changeDoc(d,"126",clubName));
  const plan = {kind:"club-merge-14-v1",operation,project:"livepalmes",database:"nage-palmes",pairs:clone(pairs),meta:clone(inventory.meta),sql,docs:clone(docs),changes,guards,firestore,projection:clone(inventory.projection),safety:clone(inventory.safety)};
  if (changes.length > 5000) fail("MUTATION_LIMIT");
  return {...plan,digest:digest(plan)};
}
function validate(plan) {
  const rebuilt = prepare({project:plan.project,database:plan.database,complete:true,meta:plan.meta,sql:plan.sql,docs:plan.docs,projection:plan.projection,safety:plan.safety},plan.operation);
  if (!equal(rebuilt,plan)) fail("PLAN_TAMPERED");
  return plan;
}
module.exports = {pairs,targets,ids,mapping,relations,tables,encode,decode,clone,digest,equal,key,wire,scope,prepare,validate,fail};
