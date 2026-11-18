"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict");
const policy=require("../functions/admin-mfa-policy");
const profiles=require("../functions/current-access-profile");
class HttpsError extends Error {constructor(code,message,details){super(message);Object.assign(this,{code,details});}}
const uid="optional-fixture",admin={status:"active",capabilities:{"admin.full":true}};
let data=admin,reads=0,writes=0;
const db={collection(name){assert.equal(name,"users");return{doc(actor){assert.equal(actor,uid);return{get:async()=>{reads++;return{exists:data!==null,data:()=>data,ref:{set:async()=>writes++}};}};}};}};
const request=()=>({auth:{uid,token:{}},data:{adminMfaRequired:true,requireAdminMfa:true}});
async function main(){
 for(const token of [{},{firebase:{sign_in_second_factor:"totp"}},{firebase:{sign_in_second_factor:"phone"}}]){
  const req={auth:{uid,token},data:{requireAdminMfa:true}};
  assert.equal(policy.adminMfaRequired(req,admin),false);
  policy.assertAdminMfa(req,admin,HttpsError);
  assert.equal((await profiles.readCurrentAccessProfile(req,{db,HttpsError})).data.capabilities["admin.full"],true);
  assert.equal(profiles.currentAccessCapabilities(req,{db,HttpsError})["admin.full"],true);
 }
 assert.equal(reads,3,"One current profile read per request, shared by subsequent checks");
 const ctx={db,HttpsError,ADMIN_UIDS:new Set(),cleanText:v=>String(v||""),activeCapabilitiesFromMap:map=>Object.keys(map).filter(k=>map[k]===true),competitionEmailNotificationsEnabled:()=>false,portalReadStats:()=>({baseDocuments:1})};
 const own=await require("../functions/backend/portal-access-handlers/get-current-access-user").createAccessHandlers_getCurrentAccessUser(ctx).getCurrentAccessUser(request());
 assert.equal(own.adminMfaRequired,false);assert.deepEqual(own.capabilities,["admin.full"]);assert.equal(writes,0);
 const direct=require("../functions/nap-direct-service");
 assert.equal((await direct.readActor(request(),{db,adminUids:new Set()})).national,true);
 data={status:"active",capabilities:{"consoles.access":true}};
 assert.equal((await direct.readActor(request(),{db,adminUids:new Set([uid])})).national,false,"A former admin UID cannot restore revoked rights");
 data={status:"inactive",capabilities:{"admin.full":true}};
 await assert.rejects(profiles.readCurrentAccessProfile(request(),{db,HttpsError}),e=>e.code==="permission-denied");
 data=null;await assert.rejects(profiles.readCurrentAccessProfile(request(),{db,HttpsError}),e=>e.code==="permission-denied");
 await assert.rejects(profiles.readCurrentAccessProfile({data:{}},{db,HttpsError}),e=>e.code==="unauthenticated");
 assert.equal(policy.createAdminMfaPolicy({required:true}).adminMfaRequired(request(),admin),true,"Mandatory policy remains explicit and fixture-only");
 assert.equal(policy.createAdminMfaPolicy({required:"true"}).adminMfaRequired(request(),admin),false);
 console.log("Optional MFA: password-only and TOTP admins admitted, fresh rights and disabled-account guards preserved, no client activation or factor mutation.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
