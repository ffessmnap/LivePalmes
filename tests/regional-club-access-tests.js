"use strict";
const assert=require("node:assert/strict");
const {createAccessService}=require("../functions/server-access-service");
const {createAccessHandlers}=require("../functions/portal-access-handlers");
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
(async()=>{
 let caps={"engagements.region.manage":true}, region="1", clubRegion="1", reads=0,sql=0,writes=0,existing=false;
 const data=()=>({status:"active",regionId:region,capabilities:caps,accessScopes:{"engagements.region.manage":{scopeId:region}},clubId:"10"});
 const context={HttpsError,cleanText:x=>String(x??"").trim(),ADMIN_UIDS:new Set(),CLUB_REFERENCE_BY_ID:new Map(),CLUB_REFERENCE_REGION_LABELS:{1:"Region A",2:"Region B"},ENVIRONMENT:{sportingDataSource:"legacy"},
 db:{collection:()=>({doc:id=>({id,get:async()=>{reads++;return {exists:true,data};}})})}};
 const service=createAccessService(context);
 // Legacy lookup injected through its existing bounded batch helper.
 context.ENGAGEMENT_CLUBS_COLLECTION="clubs";
 context.db.getAll=async ref=>{sql++;return [{exists:true,id:ref.id,data:()=>({clubId:ref.id,clubName:"Club reel",regionId:clubRegion})}];};
 const req={auth:{uid:"region",token:{}},data:{activeClubId:"20"}};
 assert.equal((await service.engagementClubAccessContext(req)).clubId,"20");
 caps["engagements.club.manage"]=true;caps["engagements.club.switch"]=true;
 clubRegion="2";await assert.rejects(()=>service.engagementClubAccessContext(req),e=>e.code==="permission-denied");
 await assert.rejects(()=>service.engagementClubAccessContext({...req,data:{}}),e=>e.code==="permission-denied");
 caps["engagements.national.manage"]=true;delete caps["engagements.club.manage"];delete caps["engagements.club.switch"];
 assert.equal((await service.engagementClubAccessContext(req)).clubId,"20");
 delete caps["engagements.national.manage"];clubRegion="1";
 const handlers=createAccessHandlers({...context,accessManagementContext:service.accessManagementContext,canonicalAccessDirectoryRegionId:service.canonicalAccessDirectoryRegionId,
 cleanAccessProfile:service.cleanAccessProfile,engagementClubAccessContext:service.engagementClubAccessContext,
 ACCESS_CAPABILITY_SET:new Set(["engagements.club.manage","admin.full"]),
 auth:{getUserByEmail:async()=>{if(existing)return {uid:"old"};throw {code:"auth/user-not-found"};}},
 saveAccessUserProfile:async p=>{writes++;assert.equal(p.createOnly,true);assert.equal(p.clubName,"Club reel");return p;}});
 // cleanAccessProfile reads these through the live context.
 context.ACCESS_CAPABILITY_SET=new Set(["engagements.club.manage","admin.full"]);
 const payload={firstName:"Test",lastName:"Fictif",email:"test@example.invalid",clubId:"20",regionId:"Region A",capabilities:["engagements.club.manage"]};
 await handlers.createOrUpdateAccessUser({...req,data:payload});assert.equal(writes,1);
 for(const attack of [{uid:"victim"},{capabilities:["admin.full"]},{capabilities:["engagements.club.manage","admin.full"]},{regionId:"2"},{clubId:""}]){
 await assert.rejects(()=>handlers.createOrUpdateAccessUser({...req,data:{...payload,...attack}}));assert.equal(writes,1);}
 clubRegion="2";await assert.rejects(()=>handlers.createOrUpdateAccessUser({...req,data:payload}),e=>e.code==="permission-denied");assert.equal(writes,1);
 caps={"engagements.national.manage":true};
 await assert.rejects(()=>handlers.createOrUpdateAccessUser({...req,data:payload}),e=>e.code==="permission-denied");assert.equal(writes,1);
 caps={"engagements.national.manage":true,"engagements.region.manage":true};
 await assert.rejects(()=>handlers.createOrUpdateAccessUser({...req,data:{...payload,capabilities:["admin.full"]}}),e=>e.code==="permission-denied");assert.equal(writes,1);
 clubRegion="1";existing=true;await assert.rejects(()=>handlers.createOrUpdateAccessUser({...req,data:payload}),e=>e.code==="already-exists");assert.equal(writes,1);
 const authService=createAccessService({...context,auth:{createUser:async()=>{throw {code:"auth/email-already-exists"};},updateUser:()=>{throw Error("Existing account must remain untouched");}}});
 await assert.rejects(()=>authService.userByEmailOrCreate({...payload,createOnly:true}),e=>e.code==="auth/email-already-exists");
 console.log("Regional creation/switch: actual factories, region/cumulative rights, forged payloads, existing accounts/race rejected; bounded reads",reads,sql);
})().catch(e=>{console.error(e);process.exitCode=1;});
