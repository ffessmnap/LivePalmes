"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{createHash}=require("node:crypto");
const helpers=require("../functions/nap-person-change-requests"),editor=require("../functions/nap-club-person-edit"),{person}=require("../functions/nap-club-people");
const source=fs.readFileSync("functions/index.js","utf8");
const requestCode=source.slice(source.indexOf("exports.requestEngagementClubSwimmerChange ="),source.indexOf("exports.listEngagementSwimmerChangeRequests ="));
const resolveCode=source.slice(source.indexOf("exports.resolveEngagementSwimmerChangeRequest ="),source.indexOf("exports.updateEngagementNationalSwimmerIdentity ="));
class CallableError extends Error{constructor(code,message){super(message);this.code=code;}}
function fixture(){
 const state={row:{id:7,nom:"EXEMPLE",prenom:"Fictif",date:"1980-01-02",club:"106",sexe:null,number:null},writes:0,records:new Map(),audits:new Map(),locks:new Set(),national:true,failComplete:false};
 const ref=(map,id)=>({id,get:async()=>({id,exists:map.has(id),data:()=>structuredClone(map.get(id))}),create:async value=>{if(map.has(id))throw Error("exists");map.set(id,structuredClone(value));},set:async(value,config)=>{
  if(map===state.records&&value.status==="approved"&&state.failComplete){state.failComplete=false;throw Error("completion lost");}
  map.set(id,structuredClone(config?.merge?{...map.get(id),...value}:value));
 }});
 const connection={execute:async({sql},values=[])=>{
  if(sql.includes("GET_LOCK")){const name=values[0];if(state.locks.has(name))return [[{acquired:0}]];state.locks.add(name);return [[{acquired:1}]];}
  if(sql.includes("RELEASE_LOCK")){state.locks.delete(values[0]);return [[{released:1}]];}
  if(sql.includes("TRIGGERS")||sql.includes("FORCE INDEX"))return [[]];
  if(sql.includes("FROM livepalmes_club_people_options"))return [[]];
  if(sql.startsWith("SELECT")&&sql.includes("FROM officiels"))return [[{...state.row}]];
  assert.ok(sql.startsWith("UPDATE officiels SET"),"no old sporting collection or engagement write");
  const backup=[...state.audits.values()].find(a=>a.target?.kind==="native-person-identity").target;
  assert.deepEqual({sql,values},editor.statement(backup.before,backup.after));
  assert.deepEqual(state.row,backup.before);state.row={...backup.after};state.writes++;return [{affectedRows:1}];
 },release:()=>{},destroy:()=>{}};
 const pool={execute:connection.execute,getConnection:async()=>connection};
 const sandbox={exports:{},onCall:(_,callback)=>callback,ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS:{},ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS:{},ENVIRONMENT:{sportingDataSource:"nap"},defineSecret:v=>v,process:{env:{}},TypeError,RangeError,HttpsError:CallableError,
  ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION:"requests",cleanText:v=>String(v||""),cleanFirestoreValue:v=>v,stableHash:v=>createHash("sha256").update(v).digest("hex"),
  engagementClubAccessContext:async()=>({uid:"club",clubId:"106"}),engagementAccessContext:async()=>({uid:"national",national:state.national}),writeAuditLogOnce:async()=>{},engagementSwimmerChangeRequestItem:doc=>({id:doc.id,...doc.data()}),
  db:{collection:name=>{assert.ok(["requests","auditLogs"].includes(name));return {doc:id=>ref(name==="requests"?state.records:state.audits,id)};},runTransaction:async callback=>callback({get:ref=>ref.get(),set:(ref,value,config)=>ref.set(value,config)})},
  require:name=>{if(name==="./nap-person-change-requests")return helpers;if(name==="./nap-club-person-edit")return editor;if(name==="./nap-portal-swimmers")return {portalPool:()=>pool};throw Error("Unexpected module "+name);}
 };
 vm.runInNewContext(requestCode+resolveCode,sandbox);
 state.submit=()=>sandbox.exports.requestEngagementClubSwimmerChange({data:{personId:"nap-official-7",expectedFingerprint:person(state.row,"officials").napFingerprint,proposed:{lastName:"CORRIGE"},reason:"Erreur de saisie"}});
 state.resolve=(requestId,decision="approved")=>sandbox.exports.resolveEngagementSwimmerChangeRequest({data:{requestId,decision}});
 return state;
}
(async()=>{
 let s=fixture(),reply=await s.submit();assert.equal(reply.request.requestType,"person-change");assert.equal(s.writes,0);
 await assert.rejects(s.submit(),e=>e.code==="already-exists");
 s.national=false;await assert.rejects(s.resolve(reply.request.id),e=>e.code==="permission-denied");assert.equal(s.writes,0);s.national=true;
 await s.resolve(reply.request.id);assert.equal(s.writes,1);assert.equal(s.row.nom,"CORRIGE");assert.equal(s.locks.size,0);await s.resolve(reply.request.id);assert.equal(s.writes,1);
 s=fixture();reply=await s.submit();await s.resolve(reply.request.id,"rejected");assert.equal(s.writes,0);
 s=fixture();reply=await s.submit();s.failComplete=true;await assert.rejects(s.resolve(reply.request.id));assert.equal(s.writes,1);await s.resolve(reply.request.id);assert.equal(s.writes,1);assert.equal(s.locks.size,0);
 console.log("Official correction callables: club request only, duplicate pending refusal, national authority, rejection, durable replay after SQL and exact claims passed offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});
