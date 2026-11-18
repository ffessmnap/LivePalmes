"use strict";
require("./helpers/offline-network");
// Explicit synthetic mandatory policy: the deployed default remains optional.
const policyPath=require.resolve("../functions/admin-mfa-policy");
const optionalPolicy=require(policyPath);
require.cache[policyPath].exports={...optionalPolicy,...optionalPolicy.createAdminMfaPolicy({required:true})};
const assert=require("node:assert/strict"),policy=require(policyPath),profiles=require("../functions/current-access-profile"),{createPortalSessions}=require("../functions/portal-session");
class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
const active=capabilities=>({status:"active",capabilities}),admin=active({"admin.full":true}),totp={sign_in_second_factor:"totp",second_factor_identifier:"fixture-factor"};
const req=(firebase,claims={})=>({auth:{uid:"fixture-actor",token:{...claims,...(firebase?{firebase}:{})}},data:{adminMfaRequired:false,firebase:totp,totpVerified:true}});
const mfaDenied=p=>assert.rejects(p,e=>e.code==="unauthenticated"&&e.details?.adminMfaRequired===true);
function fixture(initial=admin){
 let data=initial,reads=0,writes=0;
 const db={collection(name){
  assert.equal(name,"users");
  return {doc(uid){
   assert.equal(uid,"fixture-actor","No target read before authorization");
   return {get:async()=>{
    reads++;
    return {exists:data!==null,data:()=>data,ref:{set:async()=>{writes++;}}};
   }};
  }};
 }};
 return {db,get reads(){return reads;},get writes(){return writes;},set data(value){data=value;},options:{db,HttpsError}};
}
async function main(){
 for(const value of [undefined,{}, {sign_in_second_factor:"phone",second_factor_identifier:"fixture-factor"}]){
  const h=fixture(),request=req(value,{livepalmesAccess:true,livepalmesCapabilities:{"admin.full":true},totpVerified:true});assert.equal(policy.hasVerifiedTotp(request),false);await mfaDenied(profiles.readCurrentAccessProfile(request,h.options));assert.equal(h.reads,1);
 }
 assert.equal(policy.hasVerifiedTotp(req({sign_in_second_factor:"totp"})),true,"The reserved factor proof suffices; its optional identifier is not an extra requirement");
 const h=fixture(),request=req();
 const own=await profiles.readCurrentAccessProfile(request,{...h.options,allowAdminMfaEnrollment:true});assert.equal(own.data.capabilities["admin.full"],true);
 await mfaDenied(profiles.readCurrentAccessProfile(request,h.options));assert.throws(()=>profiles.currentAccessCapabilities(request,h.options),e=>e.details.adminMfaRequired);
 await mfaDenied(profiles.readCurrentAccessProfile(request,{...h.options,allowAdminMfaEnrollment:"true"}));assert.equal(h.reads,1,"An enrollment read cannot cache an MFA authorization");
 const verified=req(totp);assert.equal(policy.hasVerifiedTotp(verified),true);await profiles.readCurrentAccessProfile(verified,h.options);assert.equal(profiles.currentAccessCapabilities(verified,h.options)["admin.full"],true);
 h.data=active({"engagements.club.manage":true});await profiles.readCurrentAccessProfile(req(undefined,{livepalmesCapabilities:{"admin.full":true}}),h.options);
 h.data=admin;await mfaDenied(profiles.readCurrentAccessProfile(req(undefined,{livepalmesCapabilities:{}}),h.options));
 h.data={status:"inactive",capabilities:{"admin.full":true}};await assert.rejects(profiles.readCurrentAccessProfile(req(totp),h.options),e=>e.code==="permission-denied");
 const absent=fixture(null),pinRequest=req();await profiles.readCurrentAccessProfile(pinRequest,{...absent.options,allowConsoleIdentity:true});
 await assert.rejects(profiles.readCurrentAccessProfile(pinRequest,absent.options),e=>e.code==="permission-denied");assert.equal(absent.reads,1);assert.throws(()=>profiles.currentAccessCapabilities(pinRequest,absent.options),e=>e.code==="permission-denied");
 const direct=require("../functions/nap-direct-service"),directDb=fixture();
 await assert.rejects(direct.readActor(req(),{db:directDb.db,adminUids:new Set(["fixture-actor"])}),e=>e.directCode==="unauthenticated"&&e.details.adminMfaRequired);
 assert.equal((await direct.readActor(req(totp),{db:directDb.db,adminUids:new Set()})).national,true);
 directDb.data=active({"consoles.access":true});assert.equal((await direct.readActor(req(),{db:directDb.db,adminUids:new Set(["fixture-actor"])})).national,false,"Historical UID cannot promote a non-admin profile in Direct");
 const pdf=require("../functions/backend/server-console-service/assert-computer-pdf-access"),pdfDb=fixture();let grants=0;
 const guard=pdf.createConsoleService_assertComputerPdfAccess({...pdfDb.options,ADMIN_UIDS:new Set(),cleanText:v=>String(v||""),consoleGrantRef:()=>({get:async()=>{grants++;return{exists:true,data:()=>({role:"computer",competitionId:"fixture-competition",expiresAt:new Date(Date.now()+300000).toISOString()})};}})}).assertComputerPdfAccess;
 await mfaDenied(guard(req(undefined,{livepalmesCapabilities:{"admin.full":true}}),"fixture-competition"));assert.equal(grants,0);
 await guard(req(totp,{livepalmesCapabilities:{"admin.full":true}}),"fixture-competition");assert.equal(grants,0);
 pdfDb.data=active({"consoles.access":true});await assert.rejects(guard(req(totp,{livepalmesCapabilities:{"admin.full":true}}),"fixture-competition"),e=>e.code==="permission-denied");
 pdfDb.data=null;await guard(req(undefined,{livepalmesAccess:true,livepalmesConsoleAccess:true,livepalmesConsole:true,livepalmesRole:"computer",livepalmesCompetition:"fixture-competition"}),"fixture-competition");assert.equal(grants,1,"Ordinary PIN grants remain valid without portal profile or MFA");
 const actor=fixture(),ctx={...actor.options,ADMIN_UIDS:new Set(["fixture-actor"])};
 ctx.assertAdmin=require("../functions/backend/server-access-service/assert-admin").createAccessService_assertAdmin(ctx).assertAdmin;
 const mutation=require("../functions/backend/portal-access-handlers/set-access-user-status").createAccessHandlers_setAccessUserStatus(ctx).setAccessUserStatus;
 const deniedMutation=req(undefined,{livepalmesCapabilities:{"admin.full":true}});deniedMutation.data.uid="fixture-target";deniedMutation.data.status="inactive";
 await mfaDenied(mutation(deniedMutation));assert.equal(actor.reads,1);assert.equal(actor.writes,0,"No user or Auth mutation before MFA guard");
 const ownContext={...actor.options,ADMIN_UIDS:new Set(),cleanText:v=>String(v||""),activeCapabilitiesFromMap:map=>Object.keys(map).filter(key=>map[key]),competitionEmailNotificationsEnabled:()=>false,portalReadStats:()=>({baseDocuments:1})};
 const ownProfile=await require("../functions/backend/portal-access-handlers/get-current-access-user").createAccessHandlers_getCurrentAccessUser(ownContext).getCurrentAccessUser(req());
 assert.equal(ownProfile.adminMfaRequired,true);assert.deepEqual(ownProfile.capabilities,[],"Enrollment-only profile never advertises privileged access to older clients");assert.equal(ownProfile.uid,"fixture-actor");assert.equal(actor.writes,0);
 let sessionReads=0,sessionWrites=0,authorized=false;
 const sessionDb={collection:()=>({doc:()=>({get:async()=>{sessionReads++;return{exists:true,data:()=>({uid:"fixture-actor",authTime:1793600000000,lastActivityAt:1793600000000,closed:false})};}})}),runTransaction:async fn=>fn({get:async()=>{sessionReads++;throw Error("No session target before onboarding");},set:()=>sessionWrites++})};
 const service=createPortalSessions({getDb:()=>sessionDb,HttpsError,now:()=>1793600000000,readProfile:async()=>ownProfile,readAccessProfile:async request=>{if(!authorized)policy.assertAdminMfa(request,admin,HttpsError);}});
 const pending=req();pending.auth.token.auth_time=1793600000;pending.data._portalSession="a".repeat(32);
 const opened=await service.open(pending);assert.equal(opened.adminMfaRequired,true);assert.equal(opened.ok,false);assert.equal(sessionReads,0);assert.equal(sessionWrites,0);
 await mfaDenied(service.assertSession(pending));await mfaDenied(service.touch(pending));assert.equal(sessionWrites,0,"Old password-only portal sessions cannot authorize or refresh activity");
 authorized=true;await service.assertSession(pending);assert.equal(sessionWrites,0);
 console.log("Admin MFA: signed TOTP proof, old tokens, promotion/demotion, enrollment cache isolation, own setup, no mutation before guard and old session rejection verified offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
