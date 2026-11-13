"use strict";
const assert=require("node:assert/strict"),fs=require("./helpers/source-files"),vm=require("node:vm"),{createHash}=require("node:crypto");
const helpers=require("../functions/nap-person-change-requests"),editor=require("../functions/nap-club-person-edit"),{person}=require("../functions/nap-club-people");
const source=fs.readFileSync("functions/index.js","utf8");
const requestCode=source.slice(source.indexOf("exports.requestEngagementClubSwimmerChange ="),source.indexOf("exports.listEngagementSwimmerChangeRequests ="));
const resolveCode=source.slice(source.indexOf("exports.resolveEngagementSwimmerChangeRequest ="),source.indexOf("exports.updateEngagementNationalSwimmerIdentity ="));
class CallableError extends Error{constructor(code,message){super(message);this.code=code;}}
function fixture(){
 const state={row:{id:7,nom:"EXEMPLE",prenom:"Fictif",date:"1980-01-02",club:"106",sexe:null,number:null},options:null,queries:[],writes:0,records:new Map(),audits:new Map(),locks:new Set(),national:true,failComplete:false};
 const ref=(map,id)=>({id,get:async()=>({id,exists:map.has(id),data:()=>structuredClone(map.get(id))}),create:async value=>{if(map.has(id))throw Error("exists");map.set(id,structuredClone(value));},set:async(value,config)=>{
  if(map===state.records&&value.status==="approved"&&state.failComplete){state.failComplete=false;throw Error("completion lost");}
  map.set(id,structuredClone(config?.merge?{...map.get(id),...value}:value));
 }});
 const connection={execute:async({sql},values=[])=>{
  state.queries.push(sql);
  if(sql.includes("GET_LOCK")){const name=values[0];if(state.locks.has(name))return [[{acquired:0}]];state.locks.add(name);return [[{acquired:1}]];}
  if(sql.includes("RELEASE_LOCK")){state.locks.delete(values[0]);return [[{released:1}]];}
  if(sql.includes("TRIGGERS")||sql.includes("FORCE INDEX"))return [[]];
  if(sql.includes("FROM livepalmes_club_people_options"))return [state.options?[{...state.options}]:[]];
  if(sql.startsWith("SELECT")&&sql.includes("FROM officiels"))return [[{...state.row}]];
  assert.ok(sql.startsWith("UPDATE officiels SET"),"no old sporting collection or engagement write");
  const backup=[...state.audits.values()].find(a=>a.target?.kind==="native-person-identity").target;
  assert.deepEqual({sql,values},editor.statement(backup.before,backup.after));
  assert.deepEqual(state.row,backup.before);state.row={...backup.after};state.writes++;return [{affectedRows:1}];
 },release:()=>{},destroy:()=>{}};
 const pool={execute:connection.execute,getConnection:async()=>connection};
 const sandbox={exports:{},onCall:(_,callback)=>callback,ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS:{},ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS:{},ENVIRONMENT:{sportingDataSource:"nap"},defineSecret:v=>v,process:{env:{}},TypeError,RangeError,HttpsError:CallableError,
  ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION:"requests",cleanText:v=>String(v||""),cleanFirestoreValue:v=>v,stableHash:v=>createHash("sha256").update(v).digest("hex"),
  engagementClubAccessContext:async()=>({uid:"club",clubId:"106",email:"club@example.test"}),engagementAccessContext:async()=>({uid:"national",national:state.national}),writeAuditLogOnce:async()=>{},engagementSwimmerChangeRequestItem:doc=>({id:doc.id,...doc.data()}),
  requestDecisionMailServices:()=>({projectId:"livepalmes-test",readTemplates:async()=>({schema:1,revision:0,templates:{}})}),
  db:{collection:name=>{assert.ok(["requests","auditLogs"].includes(name));return {doc:id=>ref(name==="requests"?state.records:state.audits,id)};},runTransaction:async callback=>{const writes=[];const result=await callback({get:ref=>ref.get(),set:(ref,value,config)=>writes.push(ref.set(value,config))});await Promise.all(writes);return result;}},
  require:name=>{if(name==="./request-decision-mail")return require("../functions/request-decision-mail");if(name==="./nap-person-change-requests")return helpers;if(name==="./nap-club-person-edit")return editor;if(name==="./nap-portal-swimmers")return {portalPool:()=>pool};throw Error("Unexpected module "+name);}
 };
 vm.runInNewContext(requestCode+resolveCode,sandbox);
 state.submit=()=>sandbox.exports.requestEngagementClubSwimmerChange({data:{personId:"nap-official-7",expectedFingerprint:person(state.row,"officials").napFingerprint,proposed:{lastName:"CORRIGE"},reason:"Erreur de saisie"}});
 state.resolve=(requestId,decision="approved",extra={})=>sandbox.exports.resolveEngagementSwimmerChangeRequest({data:{requestId,decision,...(decision==="rejected"?{resolutionNote:"Refus motivé"}:{}),...extra}});
 state.review=requestId=>sandbox.exports.resolveEngagementSwimmerChangeRequest({data:{requestId,action:"reviewOfficial"}});
 return state;
}
(async()=>{
 let s=fixture(),reply=await s.submit();assert.equal(reply.request.requestType,"person-change");assert.equal(s.writes,0);
 await assert.rejects(s.submit(),e=>e.code==="already-exists");
 s.national=false;await assert.rejects(s.resolve(reply.request.id),e=>e.code==="permission-denied");assert.equal(s.writes,0);s.national=true;
 await s.resolve(reply.request.id);assert.equal(s.writes,1);assert.equal(s.row.nom,"CORRIGE");assert.equal(s.locks.size,0);await s.resolve(reply.request.id);assert.equal(s.writes,1);
 s=fixture();reply=await s.submit();await s.resolve(reply.request.id,"rejected");assert.equal(s.writes,0);
 s=fixture();reply=await s.submit();s.failComplete=true;await assert.rejects(s.resolve(reply.request.id));assert.equal(s.writes,1);await s.resolve(reply.request.id);assert.equal(s.writes,1);assert.equal(s.locks.size,0);
 // Re-examination is read-only, bounded, and preserves fields completed after submission.
 s=fixture();reply=await s.submit();const initial=structuredClone(s.records.get(reply.request.id));
 s.row.number="A-12-34567";s.row.date="1981-02-03";
 s.options={source:"officiels",person_id:7,club_id:"106",role_team_leader:0,role_official:1,active:1,version:2,created_at:"2026-11-12 12:00:00.000000",updated_at:"2026-11-13 12:00:00.000000",created_by:"fixture",updated_by:"fixture"};
 s.queries=[];let review=await s.review(reply.request.id);
 assert.equal(s.queries.length,2);assert.equal(s.writes,0);assert.equal(s.audits.size,0);assert.deepEqual(s.records.get(reply.request.id),initial);
 assert.equal(review.changed,true);assert.equal(review.current.lastName,"EXEMPLE");assert.equal(review.proposed.lastName,"CORRIGE");assert.equal(review.proposed.birthDate,s.row.date);assert.equal(review.proposed.licenseNumber,s.row.number);assert.equal(review.proposed.roles.teamLeader,false);
 assert.deepEqual(review.statusChanges,[{label:"Rôle chef d’équipe",before:"Oui",after:"Non"}]);
 await assert.rejects(s.resolve(reply.request.id),/fiche NAP a change/);assert.equal(s.writes,0);
 const proposed=Object.fromEntries(["firstName","lastName","birthDate","sex"].map(k=>[k,review.proposed[k]]));
 await assert.rejects(s.resolve(reply.request.id,"approved",{review:{...review.review,requestedAt:"wrong"},proposed}),/Réexamen incompatible/);
 await assert.rejects(s.resolve(reply.request.id,"approved",{review:{...review.review,nativeBefore:{...review.review.nativeBefore,id:8}},proposed}),/Réexamen incompatible/);
 const beforeOptions=structuredClone(s.options);s.failComplete=true;
 await assert.rejects(s.resolve(reply.request.id,"approved",{review:review.review,proposed}));assert.equal(s.writes,1);
 const held=await s.review(reply.request.id);assert.equal(held.resuming,true);assert.deepEqual(held.review,review.review);
 await s.resolve(reply.request.id,"approved",{review:held.review,proposed:held.proposed});assert.equal(s.writes,1);assert.deepEqual(s.options,beforeOptions);assert.equal(s.row.number,"A-12-34567");assert.equal(s.row.date,"1981-02-03");
 await assert.rejects(s.review(reply.request.id),/déjà traitée/);
 // A second change after review still refuses before SQL mutation and permits a fresh review.
 s=fixture();reply=await s.submit();review=await s.review(reply.request.id);s.row.prenom="Autre";
 await assert.rejects(s.resolve(reply.request.id,"approved",{review:review.review,proposed:{lastName:"CORRIGE"}}),/fiche NAP a change/);assert.equal(s.writes,0);
 review=await s.review(reply.request.id);assert.equal(review.current.firstName,"Autre");
 s.row.club="107";await assert.rejects(s.review(reply.request.id),/hors du club/);
 s.national=false;s.queries=[];await assert.rejects(s.review(reply.request.id),e=>e.code==="permission-denied");assert.equal(s.queries.length,0);
 s=fixture();reply=await s.submit();s.row.nom="CORRIGE";review=await s.review(reply.request.id);
 const unchanged=await s.resolve(reply.request.id,"approved",{review:review.review,proposed:{lastName:"CORRIGE"}});assert.equal(unchanged.result.unchanged,true);assert.equal(s.writes,0);
 s=fixture();reply=await s.submit();s.row.date="1982-03-04";review=await s.review(reply.request.id);
 await s.resolve(reply.request.id,"approved",{review:review.review});assert.equal(s.row.date,"1982-03-04","default approval of a reviewed version also preserves unrequested fields");assert.equal(s.row.nom,"CORRIGE");
 console.log("Official correction callables: club request only, duplicate pending refusal, national authority, rejection, durable replay after SQL and exact claims passed offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});
