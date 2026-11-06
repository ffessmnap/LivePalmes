"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const {createPortalSessions,DAY,INTERVAL} = require("../functions/portal-session");
class HttpsError extends Error { constructor(code,message,details){super(message);this.code=code;this.details=details;} }
function fixture() {
  const documents = new Map(), calls = {reads:0,writes:0}; let time=1793600000000;
  const db = {collection(name){assert.equal(name,"portalSessions");return {doc:id=>({id,get:async()=>{calls.reads++;return snapshot(id);}})};},async runTransaction(fn){return fn({get:async ref=>{calls.reads++;return snapshot(ref.id);},set:(ref,data)=>{calls.writes++;documents.set(ref.id,{...data});},update:(ref,data)=>{calls.writes++;documents.set(ref.id,{...documents.get(ref.id),...data});}});}};
  const snapshot=id=>({exists:documents.has(id),data:()=>documents.get(id)});
  const profile={uid:"user",status:"active",capabilities:["engagements.club.manage"]};
  const service=createPortalSessions({getDb:()=>db,HttpsError,now:()=>time,readProfile:async()=>profile});
  const request=(uid="user",authTime=Math.floor(time/1000),id="a".repeat(32))=>({auth:{uid,token:{auth_time:authTime}},data:{_portalSession:id}});
  return {service,documents,calls,profile,request,get time(){return time;},advance:ms=>time+=ms};
}
const denied=promise=>assert.rejects(promise,error=>error.code==="unauthenticated"&&error.details?.portalSessionExpired===true);
async function serverTests(){
  const f=fixture(),r=f.request();
  await denied(f.service.assertSession(r)); assert.equal(f.calls.reads,1);
  await f.service.open(r); assert.equal(f.calls.writes,1); const start=[...f.documents.values()][0].lastActivityAt;
  f.advance(INTERVAL-1); await f.service.open(r);await f.service.touch(r);assert.equal(f.calls.writes,1,"Restoration/background reads never slide expiry");
  f.advance(1);await f.service.touch(r);assert.equal(f.calls.writes,2);await f.service.touch(r);assert.equal(f.calls.writes,2,"Concurrent activity within a batch does not rewrite");
  assert.equal([...f.documents.values()][0].lastActivityAt,start+INTERVAL);
  const recorded=[...f.documents.values()][0].lastActivityAt;
  f.advance(DAY+INTERVAL-1);await f.service.assertSession(r);
  f.advance(1);await denied(f.service.assertSession(r));await denied(f.service.touch(r));await denied(f.service.open(r));
  r.data.lastActivityAt=f.time+DAY;await denied(f.service.touch(r));assert.equal([...f.documents.values()][0].lastActivityAt,recorded,"Client timestamps cannot revive an expired session");
  await denied(f.service.open({...r,data:{_portalSession:"b".repeat(32)}}));
  await f.service.open(f.request());await f.service.assertSession(f.request());
  await denied(f.service.assertSession(r));await f.service.close(r);await f.service.assertSession(f.request());
  const fresh=f.request();await f.service.close(fresh);await denied(f.service.open(fresh));
  f.advance(1000);await f.service.open(f.request());
  await denied(f.service.assertSession({...f.request(),auth:{uid:"other",token:f.request().auth.token}}));
  await denied(f.service.open({auth:null,data:{}}));
  await denied(f.service.open(f.request("user",Math.floor(f.time/1000),"../../users/user")));
  const inactive=fixture();inactive.profile.status="inactive";await denied(inactive.service.open(inactive.request()));assert.equal(inactive.calls.writes,0);
  const production=createPortalSessions({getDb:()=>{throw Error("No PROD read");},HttpsError,enabled:false});await production.assertSession({});await assert.rejects(production.open({}),e=>e.code==="failed-precondition");
  console.log("Server sessions: exact boundary/tolerance, bounded reads/writes, refresh not activity, old token/new ID, reauthentication, logout, cross-user isolation and PROD guard passed offline.");
}
async function wiringTests(){
  const source=fs.readFileSync("functions/index.js","utf8"),acorn=require("./firestore-rules/node_modules/acorn"),ast=acorn.parse(source,{ecmaVersion:"latest"});
  const names=JSON.parse(fs.readFileSync("functions/portal-session-endpoints.json","utf8"));
  const registrations=new Map(ast.body.filter(n=>n.expression?.left?.object?.name==="exports").map(n=>[n.expression.left.property.name,n.expression.right]));
  for(const name of names){const registration=registrations.get(name);assert.equal(registration.callee.name,"onCall");const handler=registration.arguments.at(-1);assert(handler.async);assert.match(source.slice(handler.body.body[0].start,handler.body.body[0].end),/^await portalSessionService\(\)\.assertSession\(request\);$/,"Guard must precede every data read/write: "+name);}
  const files=["assets/livepalmes-admin-calendar-events.js","assets/livepalmes-dtn-seasons.js","assets/livepalmes-dtn-qualifications.js","assets/livepalmes-license-administration.js","assets/livepalmes-national-documents.js","assets/livepalmes-featured-documents.js","assets/livepalmes-portal-news.js",...fs.readdirSync("assets/portal").filter(x=>x.endsWith(".js")).map(x=>"assets/portal/"+x),...fs.readdirSync("assets/portal/deferred").map(x=>"assets/portal/deferred/"+x),...fs.readdirSync("performances/public").filter(x=>/^(admin|store|import-competitions)/.test(x)&&x.endsWith(".js")).map(x=>"performances/public/"+x)];
  const exceptions=new Set(["getCurrentAccessUser","getPublicEngagementClubDirectory","submitEngagementAccessRequest"]);
  function visit(node){if(!node||typeof node!=="object")return;if(node.type==="Literal"&&registrations.has(node.value)&&!exceptions.has(node.value))assert(names.includes(node.value),"Unguarded portal endpoint, including conditional calls: "+node.value);for(const value of Object.values(node))if(value&&typeof value==="object"){if(Array.isArray(value))value.forEach(visit);else visit(value);}}
  files.forEach(file=>visit(acorn.parse(fs.readFileSync(file,"utf8"),{ecmaVersion:"latest"})));
  // Include active historical variants even when the current UI no longer calls
  // them. Public/profile, Direct and maintenance keep their separate contracts.
  const separateContracts=new Set(["getCurrentAccessUser","getPublicEngagementClubDirectory","setRolePins","verifyPin","storeCompetitionPdf","deleteCompetitionPdf","syncOfficialResultToPublicIndex","manageLivePalmesDirect","rebuildAccessDirectoryIndexNextPage","rebuildAccessDirectorySnapshotNextPage","syncEngagementMailRecipientIndex","rebuildEngagementMailRecipientIndexNextPage"]);
  const lots=require("../tools/firebase-test-backend-lots");
  for(const name of lots.ALL_SAFE_LOTS.flatMap(lots.activeLotFunctions).concat(lots.TEST_NON_MAIL_FUNCTIONS))assert(separateContracts.has(name)||names.includes(name),"Active portal variant needs session authorization: "+name);
  // Direct deliberately uses the active profile and competition grants, without
  // opening/updating a portal session. Exercise the actual callable and service.
  const directHandler=registrations.get('manageLivePalmesDirect').arguments.at(-1);
  let directProfileReads=0,directBusinessReads=0;
  const directCall=vm.runInNewContext('('+source.slice(directHandler.start,directHandler.end)+')',{
    require:name=>{if(name==='./nap-direct-service')return require('../functions/nap-direct-service');directBusinessReads++;throw Error('No business access before Direct authorization');},
    ENVIRONMENT:{name:'test'},ADMIN_UIDS:new Set(),HttpsError,
    engagementRegionsMatch:()=>false,
    db:{collection:name=>{assert.equal(name,'users');return {doc:()=>({get:async()=>{directProfileReads++;return {exists:true,data:()=>({status:'inactive',capabilities:{'admin.full':true}})};}})};}}
  });
  await assert.rejects(directCall({data:{action:'detail',competitionId:900001}}),error=>error.code==='unauthenticated');
  await assert.rejects(directCall({auth:{uid:'inactive'},data:{action:'detail',competitionId:900001}}),error=>error.code==='permission-denied');
  assert.equal(directProfileReads,1);assert.equal(directBusinessReads,0);
  for(const name of ["getEngagementCompetition","previewEngagementClubSwimmerEventTimes","saveEngagementClubSwimmerSelection"]){
  const handler=registrations.get(name).arguments.at(-1);let business=0;
  const code=source.slice(handler.start,handler.end),delegate=/return (\$\w+)\(\)\./.exec(code)[1];
  const sandbox={portalSessionService:()=>({assertSession:async()=>{throw new HttpsError("unauthenticated","expired");}}),[delegate]:()=>{business++;throw Error("No business work before session authorization");}};
  await assert.rejects(vm.runInNewContext("("+code+")",sandbox)({}),e=>e.code==="unauthenticated");assert.equal(business,0);
  }
  const profileHandler=registrations.get("getCurrentAccessUser").arguments.at(-1),operations=[];
  const session={open:async()=>operations.push("open"),touch:async()=>operations.push("touch"),close:async()=>operations.push("close"),assertSession:async()=>operations.push("assert")};
  const dispatch=vm.runInNewContext("("+source.slice(profileHandler.start,profileHandler.end)+")",{ENVIRONMENT:{name:"test"},HttpsError,portalSessionService:()=>session,$portalAccessHandlers_getCurrentAccessUser:()=>({getCurrentAccessUser:async()=>operations.push("profile")})});
  for(const action of ["open","touch","close","profile"])await dispatch({data:{_portalSessionAction:action}});
  assert.deepEqual(operations,["open","touch","close","assert","profile"]);
  await dispatch({data:{}});assert.equal(operations.at(-1),"profile","Shared legacy profile consumer remains compatible");
  await assert.rejects(dispatch({data:{_portalSessionAction:"unknown"}}),e=>e.code==="invalid-argument");
  console.log(`${names.length} actual callable guards verified; expired request rejected before business delegation.`);
}
async function directoryTests(){
  const {readPortalDirectorySnapshot}=require("../functions/portal-session-directory");let reads=0,requested;
  const context={db:{collection:name=>{assert.equal(name,"accessDirectorySnapshots");return{doc:id=>{requested=id;return{get:async()=>{reads++;return{exists:true,data:()=>({status:"ready",version:3,scopeType:"region",scopeId:"IDF",entries:{a:{uid:"a"}}})};}}}};}},HttpsError,managementContext:async()=>({regionId:"IDF"})};
  assert.deepEqual(await readPortalDirectorySnapshot(context,{data:{documentId:"national"}}),{users:[{uid:"a"}]});assert.equal(requested,"region:IDF");assert.equal(reads,1);
  context.managementContext=async()=>{throw new HttpsError("permission-denied","no access");};await assert.rejects(readPortalDirectorySnapshot(context,{}));assert.equal(reads,1);
  console.log("Session directory: server-derived scope, one snapshot read, denied access before data and no reconstruction passed offline.");
}
(async()=>{await serverTests();await wiringTests();await directoryTests();})().catch(error=>{console.error(error);process.exitCode=1;});
