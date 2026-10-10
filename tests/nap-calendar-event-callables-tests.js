"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
const ast=require("./firestore-rules/node_modules/acorn").parse(source,{ecmaVersion:"latest"});
function handler(name){const n=ast.body.find(n=>n.expression?.left?.object?.name==="exports"&&n.expression.left.property?.name===name).expression.right.arguments.at(-1);return source.slice(n.start,n.end);}
async function run(){
 let denied=false,modified=false,patch=null,deleted=false,reads=0;
 const event={competitionType:"training",level:"regional",regionId:"3",date:"2026-11-07"};
 const pool={};
 const context={ENVIRONMENT:{sportingDataSource:"nap"},process:{env:{}},Date,TypeError,RangeError,
  HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},
  engagementAccessContext:async()=>({uid:"admin",national:false}),cleanText:value=>String(value||""),
  assertCanModifyEngagementEvent:()=>{if(denied)throw new context.HttpsError("permission-denied","Denied");},assertCanManageEngagementCompetition:()=>{},
  engagementRegionsMatch:(a,b)=>a===b,cleanEngagementCalendarEventPayload:raw=>raw,engagementEventIsPast:()=>false,
  nativePortalCompetition:async()=>({source:"nap",competitionType:"training",id:"legacy-nap-5162"}),
  writeAuditLogOnce:async()=>{},
  db:{collection(name){assert.equal(name,"auditLogs","No former calendar collection access");return {doc:()=>({create:async()=>{},get:async()=>({exists:false})})};}},
  require:name=>{
   if(name==="./nap-portal-swimmers")return {portalPool:()=>pool};
   if(name==="./nap-calendar-event-details")return {KINDS:new Set(["training","stage","meeting"])};
   if(name==="./nap-portal-competitions")return {readNativeCompetition:async(p,id,authorize)=>{assert.equal(p,pool);await authorize(event);reads++;return {event};}};
   if(name==="./nap-qualification-edit-lock")return {ordinaryEdit:async(p,id,action)=>action()};
   if(name==="./nap-portal-competition-change")return {applyCompetitionChange:async(p,input,audit,authorize)=>{await authorize(event);patch=input.patch;assert.equal(input.expectedFingerprint,"a".repeat(64));await audit.prepare("operation",{});await audit.complete("operation",{});modified=true;return {ok:true,source:"nap"};}};
   if(name==="./nap-competition-deletion")return {competitionDeletion:async(p,input,audit,authorize)=>{await authorize(5162);assert.equal(input.previewOnly,true);deleted=true;return {ok:true,expectedFingerprint:"b".repeat(64)};}};
   throw Error(name);
  }
 };
 const update=vm.runInNewContext(`(${handler("updateEngagementCalendarEvent")})`,context);
 const data={calendarEventId:"legacy-nap-5162",expectedFingerprint:"a".repeat(64),eventType:"training",name:"Formation",date:"2026-11-07",endDate:"2026-11-07",city:"Paris",location:"Piscine",level:"regional",regionId:"3",registrationUrl:"https://example.org",entryDeadlineAt:"2026-11-06T19:00:00Z",programSessions:[{label:"Accueil"}]};
 const result=await update({data});assert.equal(modified,true);assert.equal(result.event.sourceType,"calendarEvent");assert.equal(patch.location,"Piscine");assert.equal(patch.calendarDetails.registrationUrl,data.registrationUrl);assert.equal(Object.hasOwn(patch,"level"),false,"Do not treat an unchanged regional scope as a national-only change");
 denied=true;modified=false;await assert.rejects(update({data}),e=>e.code==="permission-denied");assert.equal(modified,false);
 const remove=vm.runInNewContext(`(${handler("deleteEngagementCalendarEvent")})`,context);
 await assert.rejects(remove({data:{calendarEventId:data.calendarEventId,previewOnly:true}}),e=>e.code==="permission-denied");assert.equal(deleted,false);
 denied=false;assert.equal((await remove({data:{calendarEventId:data.calendarEventId,previewOnly:true}})).calendarEventId,data.calendarEventId);assert.equal(deleted,true);assert.ok(reads>=2);
 const ui=fs.readFileSync(require.resolve("../assets/livepalmes-admin-calendar-events.js"),"utf8");
 assert.match(ui,/expectedFingerprint:current.napFingerprint/);assert.ok(ui.indexOf("previewOnly:true")<ui.indexOf("confirmPermanent:true"));assert.match(ui,/Suppression réservée au national/);
 console.log("Native calendar callables: scoped NAP-only edit/delete, displayed witness, unchanged regional scope and explicit deletion preview passed offline.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
