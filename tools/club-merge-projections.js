"use strict";
// Executes the actual existing trigger against a private in-memory database.
// No Firebase SDK initialization, credentials, HTTP request or real account.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
function fixture() {
  const data = new Map([["engagementClubAdminDirectories/default",{status:"ready",admins:{}}]]);
  const deleted = Symbol("deleted");
  const versions=new Map(), stats={reads:0,attempts:0,writes:0}, hooks={beforeCommit:null,readFailure:null};
  const copy=v=>v===deleted ? deleted : Array.isArray(v) ? v.map(copy) : v && typeof v==="object" ? Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x)])) : v;
  function put(location,value){versions.set(location,(versions.get(location)||0)+1);if(value===null)data.delete(location);else data.set(location,copy(value));}
  function merge(a,b) {
    const out={...a};
    for (const [k,v] of Object.entries(b)) {
      if (v === deleted) delete out[k];
      else if (v && typeof v === "object" && !Array.isArray(v)) out[k]=merge(out[k] || {},v);
      else out[k]=v;
    }
    return out;
  }
  const snap = ref => {const value=copy(data.get(ref.path));return {id:ref.id,exists:data.has(ref.path),data:()=>value};};
  const ref = location => ({path:location,id:location.split("/").at(-1),get:async()=>snap(ref(location))});
  const writer = () => {
    const ops=[],reads=new Map();
    const read=r=>{if(ops.length)throw Error("READ_AFTER_WRITE");if(hooks.readFailure===r.path)throw Error("INJECTED_READ_FAILURE");stats.reads++;reads.set(r.path,versions.get(r.path)||0);return snap(r);};
    return {reads,get:async r=>read(r),getAll:async(...rs)=>rs.map(read),set(r,value,options){ops.push(()=>{stats.writes++;put(r.path,options?.merge ? merge(data.get(r.path)||{},value) : value);});},commit:async()=>{ops.forEach(f=>f());}};
  };
  const db={collection:name=>({doc:id=>ref(name+"/"+id)}),batch:writer,runTransaction:async(cb,options={})=>{
    if(options.maxAttempts!==5)throw Error("EXPLICIT_RETRY_BOUND_REQUIRED");
    for(let attempt=0;attempt<options.maxAttempts;attempt++){
      stats.attempts++;const tx=writer(),result=await cb(tx);
      if(hooks.beforeCommit)await hooks.beforeCommit({attempt,reads:tx.reads,put,data});
      if([...tx.reads].some(([k,v])=>(versions.get(k)||0)!==v))continue;
      await tx.commit();return result;
    }
    throw Error("TRANSACTION_RETRY_LIMIT");
  }};
  const cleanText=v=>String(v ?? "").trim(), stableHash=v=>crypto.createHash("sha256").update(v).digest("hex");
  const mail=require("../functions/server-mail-service").createMailService({db,cleanText,stableHash,cleanFirestoreValue:v=>v,normalizeEmail:cleanText,activeCapabilitiesFromMap:m=>Object.keys(m).filter(k=>m[k]===true),ENGAGEMENT_MAIL_CAPABILITIES:["engagements.club.manage","engagements.region.manage","engagements.national.manage"],ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT:32,ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION:"engagementMailRecipientShards",ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION:"engagementClubAdminDirectories",ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES:500000,engagementClubName:(_,name)=>name,competitionEmailNotificationsEnabled:d=>d.emailPreferences?.competitionNotifications!==false});
  const source=fs.readFileSync(path.join(__dirname,"../functions/index.js"),"utf8");
  const start=source.indexOf("exports.syncEngagementMailRecipientIndex = onDocumentWritten("), end=source.indexOf("exports.rebuildEngagementMailRecipientIndexNextPage",start);
  if (start < 0 || end < 0) throw Error("PROJECTION_REPLAY_REVIEW_REQUIRED");
  const exports={};
  vm.runInNewContext(source.slice(start,end),{exports,db,REGION:"offline",onDocumentWritten:(_,fn)=>fn,cleanText,FieldValue:{delete:()=>deleted},syncAccessDirectorySnapshotFromUserChange:async()=>{},...mail,console:{error:()=>{}}},{timeout:1000});
  const uid="fiction-corbie", profile=club=>({clubId:club,clubName:"Fiction only",status:"active",email:"fiction@example.invalid",capabilities:{"engagements.club.manage":true},emailPreferences:{competitionNotifications:false}});
  const event=(a,b)=>({params:{uid},data:{before:{id:uid,exists:a!==null,data:()=>typeof a==="string"?profile(a):a},after:{id:uid,exists:b!==null,data:()=>typeof b==="string"?profile(b):b}}});
  const key=stableHash(uid).slice(0,24), shard=parseInt(stableHash(uid).slice(0,8),16)%32;
  const admin=()=>data.get("engagementClubAdminDirectories/default")?.admins?.[key];
  const recipient=(capability="engagements.club.manage")=>data.get("engagementMailRecipientShards/"+capability.replace(/[^a-z0-9]+/gi,"_")+"-"+shard)?.recipients?.[key];
  return {data,put,db,mail,trigger:exports.syncEngagementMailRecipientIndex,uid,key,shard,profile,event,admin,recipient,stats,hooks};
}
async function review() {
  const f=fixture();
  const checks=[];
  for (const [current,old] of [["126","518"],["518","126"]]) {
    f.put("users/"+f.uid,f.profile(current));
    await f.trigger(f.event(old,current));
    await f.trigger(f.event(old,old));
    checks.push({direction:current === "126" ? "apply" : "restore",adminCurrent:f.admin()?.clubId===current,recipientCurrent:f.recipient()?.clubId===current});
  }
  return {mode:"offline-actual-trigger",readyForCorbie:checks.every(c=>c.adminCurrent && c.recipientCurrent),checks};
}
module.exports={review,fixture};
if (require.main === module) review().then(result=>{console.log(JSON.stringify(result));if(!result.readyForCorbie)process.exitCode=2;}).catch(()=>{console.error("PROJECTION_REPLAY_REVIEW_REQUIRED");process.exitCode=1;});
