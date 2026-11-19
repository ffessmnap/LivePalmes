"use strict";
const assert = require("node:assert/strict");
const { summary } = require("../functions/organizer-fee-report");
const { jobs, manual, TYPE } = require("../functions/organizer-fee-notification");
const { page } = require("../functions/nap-notification-pages");
const control = require("../functions/engagement-mail-control");
const automation = require("../functions/nap-notification-automation");
const competition = { source:"nap", napSource:true, competitionType:"pool", id:"42", name:"Meeting fictif", date:"2026-12-01",
  organizerEmail:"org@example.invalid;ORG@example.invalid", computerEmail:"it@example.invalid", regionId:"Bretagne",
  fees:{enabled:true,swimmerFee:2.15,individualEventFee:0.1,relayFee:3} };
const entries = [{clubId:"2",clubName:"B",swimmers:[{firstName:"NOM_PRIVE",individualEntries:[{},{}]},{}],relays:[{}],teamLeaderComplete:false},
  {clubId:"1",clubName:"A",officials:[{name:"NOM_PRIVE"}]}, {clubId:"3",teamLeader:{name:"NOM_PRIVE"}}];
(async () => {
  const result = summary(competition, entries);
  assert.equal(result.report.total,750);
  assert.deepEqual(result.report.rows.map(row=>row.id),["1","2"]);
  assert.equal(result.report.rows[1].incomplete,true);
  assert.ok(!JSON.stringify(result).includes("NOM_PRIVE"));
  assert.equal(summary({...competition,fees:{enabled:false}},entries).report.total,0);
  const updated={...competition,fees:{...competition.fees,swimmerFee:3.15}};
  assert.equal(summary(updated,entries).report.total,950);
  assert.notEqual(summary(updated,entries).digest,result.digest);
  const attachment=async file=>{assert.equal(file.buffer.subarray(0,4).toString(),"%PDF");return {fileName:file.fileName,sha256:"fixture"};};
  const closed=await jobs({kind:"closure"},competition,entries,{scope:"all"},attachment);
  assert.equal(closed.length,1); assert.deepEqual(closed[0].recipients.map(r=>r.email),["org@example.invalid"]);
  assert.equal(closed[0].reportDigest,result.digest);
  assert.deepEqual(await jobs({kind:TYPE,reportDigest:"outdated"},competition,entries,{scope:"all"},attachment),[]);
  assert.deepEqual(await jobs({kind:"closure"},{...competition,organizerEmail:""},entries,{scope:"all"},attachment),[]);
  assert.equal(control.audienceAllowed({scope:"idf"},{...closed[0],source:"nap"}),false);
  const event={kind:TYPE,reportDigest:result.digest,competitionId:"42",deliveryMode:"bcc-v1",cycleKey:""};
  for(const entryStatus of ["open","closed"]) assert.ok(automation.eligible(event,{...competition,entryStatus},new Date().toISOString()));
  assert.ok(automation.currentEvent(event,{}));
  const manualPage=await page(event,competition,{simulation:true,entries:async()=>({entries}), mailSetting:async()=>({scope:"all"}),
    recipients:()=>assert.fail("Pas d’annuaire club pour un envoi organisateur")});
  assert.equal(manualPage.jobs.length,1);assert.equal(manualPage.attachmentCount,1);
  const services={entries:async()=>({competition,entries}),authorizeSend:()=>{},projectId:"livepalmes-test"};
  const input={competitionId:"42",action:"preview-organizer-fees"};
  const preview=await manual(input,{uid:"fixture"},services);
  assert.equal(preview.digest,result.digest);
  const send={...input,action:"send-organizer-fees",requestId:preview.requestId,digest:preview.digest};
  assert.deepEqual(await manual(send,{uid:"fixture"},services),{simulated:true});
  await assert.rejects(manual({...send,digest:"obsolete"},{uid:"fixture"},services),/changé/);
  await assert.rejects(manual(send,{uid:"fixture"},{...services,authorizeSend:()=>{throw Error("hors périmètre");}}),/hors périmètre/);
  console.log("Frais organisateur : montants, confidentialité, PDF, contacts, aperçu périmé et simulation TEST vérifiés.");
})().catch(error=>{console.error(error);process.exitCode=1;});
