"use strict";
const assert=require("node:assert/strict");
const fs=require("./helpers/source-files");
const vm=require("node:vm");
const backend=require("../functions/activity-journal");
const ui=require("../assets/livepalmes-activity-journal");
async function main(){
 const operation="a".repeat(64),actorUid="admin";
 const prep={id:`nap-swimmer-activity-${operation}-before`,action:"nap.swimmerActivity.prepare",actorUid,createdAt:"2026-10-24T10:00:00Z",target:{operation,clubId:"75",before:{id:12,prenom:"Camille",nom:"MARTIN",actif:1},after:{id:12,prenom:"Camille",nom:"MARTIN",actif:0}}};
 const info=backend.preparation(prep);
 const receipt={id:info.receiptId,action:"nap.swimmerActivity.complete",actorUid,createdAt:"2026-10-24T10:01:00Z",target:{id:12,status:"inactive"}};
 let requested=[];
 const read=async ids=>{requested=ids;return ids.includes(receipt.id)?[receipt]:[];};
 for(const logs of [[receipt,prep],[prep,receipt]]){
  const page=await backend.projectPage(logs,read);assert.equal(page.logs.length,1);assert.equal(page.logs[0].target.firstName,"Camille");assert.equal(page.logs[0].target.before.active,true);assert.equal(page.logs[0].target.after.active,false);assert.equal(page.logs[0].outcome,"completed");assert.equal(page.counterpartDocuments,0);
 }
 const olderPage=await backend.projectPage([prep],read);assert.deepEqual(requested,[receipt.id]);
 assert.equal(ui.merge([receipt],olderPage.logs).length,1);assert.equal(ui.merge(olderPage.logs,[receipt])[0].historyComplete,true);
 const futureReceipt={...receipt,target:{...receipt.target,auditPreparationId:prep.id}};
 const future=await backend.projectPage([futureReceipt],async ids=>{assert.deepEqual(ids,[prep.id]);return [prep];});assert.equal(future.logs[0].target.lastName,"MARTIN");
 const pending=await backend.projectPage([prep],async()=>[]);assert.equal(pending.logs[0].outcome,"unconfirmed");
 const creation={...prep,id:`nap-swimmer-create-${operation}-before`,action:"nap.swimmerCreate.prepare",target:{native:{prenom:"Alex",nom:"DURAND",date:"1990-01-01",number:"A-00-123",sexe:"F"}}};
 const created=await backend.projectPage([creation],async()=>[]);assert.equal(created.logs[0].target.firstName,"Alex");assert.equal(created.logs[0].target.licenseNumber,"A-00-123");assert.equal(created.logs[0].target.birthDate,"1990-01-01");
 const merger={...prep,id:`nap-swimmer-merge-${operation}-before`,action:"nap.swimmerMerge.prepare",target:{source:{nom:"SOURCE",prenom:"Camille"},target:{nom:"CIBLE",prenom:"Alex"},targetAfter:{nom:"CIBLE",prenom:"Alex",club:75}}};
 const merged=await backend.projectPage([merger],async()=>[]);assert.equal(merged.logs[0].target.sourcePersonName,"Camille SOURCE");assert.equal(merged.logs[0].target.targetPersonName,"Alex CIBLE");assert.ok(ui.changes(merged.logs[0].target).some(row=>row.label.includes("Fiche conservée")));
 const wrong=await backend.projectPage([prep],async()=>[{...receipt,actorUid:"other"}]);assert.equal(wrong.logs[0].outcome,"unconfirmed");
 const unrelated={...receipt,id:"unrelated",createdAt:"2026-10-24T10:00:00Z"};assert.equal(ui.merge([receipt],[unrelated]).length,2);
 const large=Array.from({length:50},(_,i)=>({...prep,id:`nap-swimmer-activity-${i.toString(16).padStart(64,"0")}-before`}));
 await backend.projectPage(large,async ids=>{assert.equal(ids.length,50);return [];});
 const dayGroups=ui.byDayAndActor([{...receipt,createdAt:"2026-10-24T22:30:00Z"},{...receipt,id:"2",createdAt:"2026-10-25T00:30:00Z"},{...receipt,id:"3",actorUid:"other"}]);assert.equal(dayGroups.length,2);assert.equal(dayGroups[0].logs.length,2);
 const changes=ui.changes({journalPeople:[{id:12,firstName:"Camille",lastName:"MARTIN"}],plan:{plans:[{swimmerId:12,before:[],additions:[{course:"50SF",tps:"003000"}],removals:[{course:"100SF",tps:"010000"}],updates:[{before:{course:"200SF",tps:"020000"},tps:"015900"}]}]}});assert.equal(changes.length,3);assert.ok(changes.every(row=>row.label.includes("Camille MARTIN")));
 // Exercise the actual portal HTML renderer, including escaping and before/after.
 const source=fs.readFileSync("assets/livepalmes-admin-portal.js","utf8");
 const sandbox={global:{LivePalmesActivityJournal:ui},Object,Set,Map,Date,JSON,Intl,engagementNationalAuditActors:new Map(),engagementNationalAuditClubs:new Map(),engagementNationalAuditCompetitions:new Map(),engagementNationalAuditPeople:new Map(),engagementCompetitions:[],currentAccessProfile:{},escapeHtml:v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),clubDisplayLabel:()=>"Club test"};
 vm.createContext(sandbox);
 const start=source.indexOf("  const AUDIT_ACTION_METADATA"),end=source.indexOf("  function updateEngagementNationalAuditFilterOptions",start);
 vm.runInContext(source.slice(start,end)+";this.render=auditEntryHtml;this.formatDate=auditDateLabel;",sandbox);
 assert.ok(sandbox.formatDate("2026-10-24T22:30:00Z").startsWith("25/10/2026"));
 const html=sandbox.render({logs:[{...olderPage.logs[0],target:{...olderPage.logs[0].target,firstName:"<script>"}}]});
 assert.ok(html.includes("Nageur désactivé"));assert.ok(html.includes("&lt;script&gt;"));assert.ok(!html.includes("<script>"));assert.ok(html.includes("Actif"));assert.ok(html.includes("Inactif"));assert.ok(!html.includes("prepare"));
 if(process.env.JOURNAL_UI_FIXTURE){
  const list={innerHTML:""};Object.assign(sandbox,{elements:{engagementsNationalAuditList:list,engagementsNationalAuditStatus:{dataset:{}}},engagementNationalAuditLogs:[...olderPage.logs,{...pending.logs[0],id:"pending",actorUid:"second"}],engagementNationalAuditLogsLoading:false,engagementNationalAuditHasMore:true,engagementNationalAuditVisibleFrom:"2026-10-17T00:00:00Z",canViewActivityLog:()=>true,updateEngagementNationalAuditFilterOptions:()=>{},normalizedEngagementClubSearch:v=>v});
  sandbox.engagementNationalAuditActors.set(actorUid,{name:"Camille MARTIN"});sandbox.engagementNationalAuditActors.set("second",{name:"Alex DURAND"});
  const a=source.indexOf("  function renderEngagementNationalAuditLogs()"),b=source.indexOf("  async function loadEngagementNationalAuditLogs",a);
  vm.runInContext(source.slice(a,b)+";renderEngagementNationalAuditLogs();",sandbox);
  fs.writeFileSync(process.env.JOURNAL_UI_FIXTURE,'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Journal — données fictives</title><style>'+fs.readFileSync("styles.css","utf8")+fs.readFileSync("assets/livepalmes-admin-portal.css","utf8")+fs.readFileSync("assets/livepalmes-portal-appearance.css","utf8")+'</style><body class="admin-portal-page"><main class="admin-portal" style="padding:16px"><h1>Journal d’activité</h1><p>'+sandbox.elements.engagementsNationalAuditStatus.textContent+'</p>'+list.innerHTML+'</main></body></html>');
 }
 console.log("Journal: exact pairing, pagination, missing receipt, bounded reads, Paris days, complete changes and escaped renderer OK");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
