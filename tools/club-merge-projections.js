"use strict";
// Executes the actual existing trigger against a private in-memory database.
// No Firebase SDK initialization, credentials, HTTP request or real account.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
async function review() {
  const data = new Map([["engagementClubAdminDirectories/default",{status:"ready",admins:{}}]]);
  const deleted = Symbol("deleted");
  function merge(a,b) {
    const out={...a};
    for (const [k,v] of Object.entries(b)) {
      if (v === deleted) delete out[k];
      else if (v && typeof v === "object" && !Array.isArray(v)) out[k]=merge(out[k] || {},v);
      else out[k]=v;
    }
    return out;
  }
  const snap = ref => ({id:ref.id,exists:data.has(ref.path),data:()=>data.get(ref.path)});
  const ref = location => ({path:location,id:location.split("/").at(-1),get:async()=>snap(ref(location))});
  const writer = () => {
    const ops=[];
    return {get:async r=>snap(r),getAll:async(...rs)=>rs.map(snap),set(r,value,options){ops.push(()=>data.set(r.path,options?.merge ? merge(data.get(r.path) || {},value) : value));},commit:async()=>{ops.forEach(f=>f());}};
  };
  const db={collection:name=>({doc:id=>ref(name+"/"+id)}),batch:writer,runTransaction:async cb=>{const tx=writer();const result=await cb(tx);await tx.commit();return result;}};
  const cleanText=v=>String(v ?? "").trim(), stableHash=v=>crypto.createHash("sha256").update(v).digest("hex");
  const mail=require("../functions/server-mail-service").createMailService({db,cleanText,stableHash,cleanFirestoreValue:v=>v,normalizeEmail:cleanText,activeCapabilitiesFromMap:m=>Object.keys(m).filter(k=>m[k]===true),ENGAGEMENT_MAIL_CAPABILITIES:["engagements.club.manage"],ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT:32,ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION:"engagementMailRecipientShards",ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION:"engagementClubAdminDirectories",ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES:500000,engagementClubName:(_,name)=>name,competitionEmailNotificationsEnabled:()=>false});
  const source=fs.readFileSync(path.join(__dirname,"../functions/index.js"),"utf8");
  const start=source.indexOf("exports.syncEngagementMailRecipientIndex = onDocumentWritten("), end=source.indexOf("exports.rebuildEngagementMailRecipientIndexNextPage",start);
  if (start < 0 || end < 0) throw Error("PROJECTION_REPLAY_REVIEW_REQUIRED");
  const exports={};
  vm.runInNewContext(source.slice(start,end),{exports,db,REGION:"offline",onDocumentWritten:(_,fn)=>fn,cleanText,FieldValue:{delete:()=>deleted},syncAccessDirectorySnapshotFromUserChange:async()=>{},...mail,console:{error:()=>{}}},{timeout:1000});
  const uid="fiction-corbie", profile=club=>({clubId:club,clubName:"Fiction only",status:"active",email:"fiction@example.invalid",capabilities:{"engagements.club.manage":true}});
  const event=(a,b)=>({params:{uid},data:{before:{id:uid,exists:true,data:()=>profile(a)},after:{id:uid,exists:true,data:()=>profile(b)}}});
  const key=stableHash(uid).slice(0,24), shard=parseInt(stableHash(uid).slice(0,8),16)%32;
  const checks=[];
  for (const [current,old] of [["126","518"],["518","126"]]) {
    data.set("users/"+uid,profile(current));
    await exports.syncEngagementMailRecipientIndex(event(old,current));
    await exports.syncEngagementMailRecipientIndex(event(old,old));
    checks.push({direction:current === "126" ? "apply" : "restore",adminCurrent:data.get("engagementClubAdminDirectories/default")?.admins?.[key]?.clubId===current,recipientCurrent:data.get("engagementMailRecipientShards/engagements_club_manage-"+shard)?.recipients?.[key]?.clubId===current});
  }
  return {mode:"offline-actual-trigger",readyForCorbie:checks.every(c=>c.adminCurrent && c.recipientCurrent),checks};
}
module.exports={review};
if (require.main === module) review().then(result=>{console.log(JSON.stringify(result));if(!result.readyForCorbie)process.exitCode=2;}).catch(()=>{console.error("PROJECTION_REPLAY_REVIEW_REQUIRED");process.exitCode=1;});
