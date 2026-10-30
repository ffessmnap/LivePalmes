"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict");
const {portalModule,deferred}=require("./helpers/portal-module-runtime");
const {createNationalHandlers}=require("../functions/portal-national-handlers");
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function frontend() {
  const reference=deferred(),reply=deferred(),calls=[];
  const state={accessClubReference:[],engagementNationalAuditLogs:[],engagementNationalAuditLogsLoaded:false,engagementNationalAuditLogsLoading:false};
  const renders=[];
  const elements={engagementsNationalAuditList:{set innerHTML(value){renders.push(value);}},engagementsNationalAuditPeriod:{value:"7"},engagementsNationalAuditActor:{value:"actor-first"},engagementsNationalAuditClub:{value:"club-first"},engagementsNationalAuditStatus:{dataset:{}}};
  const config=Object.fromEntries(["Actors","Clubs","Competitions","People"].map(key=>['engagementNationalAudit'+key,new Map()]));
  const actions={canViewActivityLog:()=>true,normalizedEngagementClubSearch:v=>String(v).toLowerCase(),loadAccessClubReference:()=>reference.promise,clubDisplayLabel:()=>"Club fictif",escapeHtml:v=>String(v),callFunction:(name,input)=>{calls.push({name,input});return reply.promise;}};
  const module=portalModule("activity-journal.js","LivePalmesPortalActivityJournal",{state,elements,config,actions},{window:{LivePalmesActivityJournal:require("../assets/livepalmes-activity-journal")}});
  return {reference,reply,calls,state,elements,config,actions,module,renders};
}
function backend({hold=false,denied=false,authFails=false}={}) {
  const calls=[],gates=new Map(),query=[];
  const docs=Array.from({length:51},(_,i)=>{
    const operation=i.toString(16).padStart(64,"0"),id=`nap-swimmer-activity-${operation}-before`;
    return {id,data:()=>({action:"nap.swimmerActivity.prepare",actorUid:`actor${i}`,createdAt:`2026-10-30T10:${String(i).padStart(2,"0")}:00Z`,target:{operation,competitionId:`competition${i}`,personId:`person${i}`,clubId:"106",before:{id:i+1,nom:"FICTIF",prenom:"Exemple",actif:1},after:{id:i+1,nom:"FICTIF",prenom:"Exemple",actif:0}}})};
  });
  const snapshot=(ref,data={})=>({id:ref.id,exists:true,data:()=>data});
  const db={collection:collection=>{
    if(collection!=="auditLogs")return {doc:id=>({collection,id})};
    const chain={doc:id=>({collection,id}),where:(...args)=>{query.push(['where',...args]);return chain;},orderBy:(...args)=>{query.push(['orderBy',...args]);return chain;},startAfter:(...args)=>{query.push(['startAfter',...args]);return chain;},limit:n=>{query.push(['limit',n]);return chain;},get:async()=>{calls.push({collection:"page",count:docs.length});return {docs};}};return chain;
  },getAll:async(...refs)=>{
    const collection=refs[0].collection;calls.push({collection,count:refs.length,refs});
    if(collection==="auditLogs")return [];
    if(hold){const gate=deferred();gates.set(collection,gate);await gate.promise;}
    return refs.map(ref=>snapshot(ref,collection==="users"?{}:{name:"Référence fictive"}));
  }};
  const context={db,FieldPath:{documentId:()=>"__name__"},AUDIT_PAGE_LIMIT:50,AUDIT_ACTOR_RESOLUTION_LIMIT:25,AUDIT_COMPETITION_RESOLUTION_LIMIT:25,AUDIT_PERSON_RESOLUTION_LIMIT:25,AUDIT_LEGACY_VISIBLE_SINCE:"2020-01-01T00:00:00Z",cleanText:v=>String(v??"").trim(),cleanFirestoreValue:v=>v,displayNameFromProfile:v=>v.name||"",auditManagementContext:async()=>{if(denied)throw Error("permission-denied");return {profileReadCount:1};},auth:{getUsers:async refs=>{calls.push({collection:"Auth",count:refs.length});if(authFails)throw Error("Unavailable");return {users:refs.map(ref=>({...ref,displayName:"Auteur fictif"}))};}}};
  return {calls,gates,query,handler:createNationalHandlers(context).listEngagementNationalAuditLogs};
}
(async()=>{
  const f=frontend(),load=f.module.loadEngagementNationalAuditLogs();
  assert.equal(f.calls.length,1,"journal starts while club reference is still pending");
  f.elements.engagementsNationalAuditActor.value="actor-later";f.elements.engagementsNationalAuditClub.value="club-later";
  f.reply.resolve({logs:[],hasMore:true,nextCursor:{id:"next",createdAt:"now"}});await load;
  assert.equal(f.state.engagementNationalAuditLogsLoaded,true,"club reference cannot delay loaded page");
  assert.equal(f.calls[0].input.actorUid,"actor-first");assert.equal(f.calls[0].input.clubId,"club-first");assert.equal(f.state.engagementNationalAuditAppliedActorUid,"actor-first");
  await f.module.loadEngagementNationalAuditLogs();assert.equal(f.calls.length,1,"return uses loaded page");
  await f.module.loadEngagementNationalAuditLogs({append:true});assert.equal(f.calls.length,2);assert.equal(f.calls[1].input.cursor.id,"next");
  const beforeLabels=f.renders.length;
  f.state.accessClubReference=[{clubId:"club-first"}];f.reference.resolve(f.state.accessClubReference);await settle();
  assert.ok(f.renders.length>beforeLabels,"late club labels refresh the already loaded rows, not only filter options");
  assert.equal(f.config.engagementNationalAuditClubs.get("club-first"),"Club fictif");assert.equal(f.calls.length,2,"label refresh adds no RPC");
  const missingReference=frontend();missingReference.reply.resolve({logs:[]});await missingReference.module.loadEngagementNationalAuditLogs();missingReference.reference.reject(Error("Reference unavailable"));await settle();assert.equal(missingReference.state.engagementNationalAuditLogsLoaded,true);
  const unavailable=frontend();unavailable.reference.resolve([]);unavailable.reply.reject(Error("Journal indisponible"));await unavailable.module.loadEngagementNationalAuditLogs();
  assert.match(unavailable.elements.engagementsNationalAuditStatus.textContent,/Journal indisponible/);assert.equal(unavailable.state.engagementNationalAuditLogsLoaded,false);
  const denied=frontend();denied.actions.canViewActivityLog=()=>false;await denied.module.loadEngagementNationalAuditLogs();assert.equal(denied.calls.length,0);
  const b=backend({hold:true}),reading=b.handler({data:{limit:50,days:7,actorUid:"actor-filter",clubId:"106",cursor:{id:"previous",createdAt:"2026-10-30T11:00:00Z"}}});
  await settle();assert.deepEqual([...b.gates.keys()],["users","engagementCompetitions","engagementClubPeople"],"all references start without waiting for a different family");
  for(const gate of b.gates.values())gate.resolve();const result=await reading;
  assert.equal(result.logs.length,50);assert.equal(result.hasMore,true);assert.equal(result.readBudget.maximumDocuments,177);
  assert.equal(Object.entries(result.readBudget).filter(([key])=>key!=="maximumDocuments").reduce((sum,[,n])=>sum+n,0),177);
  assert.equal(b.calls.find(c=>c.collection==="Auth").count,25);assert.equal(result.actors[0].name,"Auteur fictif");
  assert.ok(b.query.some(q=>q[0]==="limit"&&q[1]===51));assert.ok(b.query.some(q=>q[0]==="where"&&q[1]==="target.clubId"&&q[3]==="106"));assert.ok(b.query.some(q=>q[0]==="startAfter"&&q[2]==="previous"));
  const cached=backend();await cached.handler({data:{knownActorUids:Array.from({length:50},(_,i)=>`actor${i}`),knownCompetitionIds:Array.from({length:50},(_,i)=>`competition${i}`),knownPersonIds:Array.from({length:50},(_,i)=>`person${i}`)}});
  assert.deepEqual(cached.calls.map(c=>c.collection),["page","auditLogs"],"known references incur no resolution read");
  const forbidden=backend({denied:true});await assert.rejects(forbidden.handler({data:{}}),/permission-denied/);assert.equal(forbidden.calls.length,0);
  const authFailure=await backend({authFails:true}).handler({data:{}});assert.equal(authFailure.actors.length,25);assert.equal(authFailure.actors[0].name,"");
  console.log("Journal loading: independent reads, captured filters, cache/page/cursor, failures, unchanged rights and max177 documents OK");
})().catch(error=>{console.error(error);process.exitCode=1;});
