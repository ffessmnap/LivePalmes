"use strict";
const assert = require("node:assert/strict");
const PDFDocument = require("../functions/node_modules/pdfkit");
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
  const closed=await jobs({kind:"closure"},competition,entries,{scope:"all"},attachment,PDFDocument);
  assert.equal(closed.length,1); assert.deepEqual(closed[0].recipients.map(r=>r.email),["org@example.invalid"]);
  assert.equal(closed[0].reportDigest,result.digest);
  assert.deepEqual(await jobs({kind:TYPE,reportDigest:"outdated"},competition,entries,{scope:"all"},attachment),[]);
  assert.deepEqual(await jobs({kind:"closure"},{...competition,organizerEmail:""},entries,{scope:"all"},attachment),[]);
  assert.equal(control.audienceAllowed({scope:"idf"},{...closed[0],source:"nap"}),false);
  const event={kind:TYPE,reportDigest:result.digest,competitionId:"42",deliveryMode:"bcc-v1",cycleKey:""};
  for(const entryStatus of ["open","closed"]) assert.ok(automation.eligible(event,{...competition,entryStatus},new Date().toISOString()));
  assert.ok(automation.currentEvent(event,{}));
  const manualPage=await page(event,competition,{simulation:true,PDFDocument,entries:async()=>({entries}), mailSetting:async()=>({scope:"all"}),
    recipients:()=>assert.fail("Pas d’annuaire club pour un envoi organisateur")});
  assert.equal(manualPage.jobs.length,1);assert.equal(manualPage.attachmentCount,1);
  const closurePage = await page({kind:'closure',phase:'exports',deliveryMode:'bcc-v1'}, {...competition,computerEmail:''}, {
    simulation:true, PDFDocument, entries:async()=>({source:'nap', entries, clubsById:new Map()}), recipients:async()=>[],
    hasParticipants:()=>true, mailSetting:async()=>({scope:'all'})
  });
  assert.deepEqual(closurePage.jobs.map(job=>job.type), [TYPE]);
  assert.equal(closurePage.jobs[0].reportDigest,result.digest);
  // Exercise the real delivery adapter with an in-memory NAP source and SMTP transport.
  const poolModule = require("../functions/nap-portal-pool");
  const entriesModule = require("../functions/nap-admin-entries");
  const delivery = require("../functions/nap-bcc-delivery");
  const previous = { pool:poolModule.portalPool, read:entriesModule.readAdminEntries, drain:delivery.drain };
  const fakePool = {};
  let currentCompetition = competition, reads = 0, closedTransport = false;
  try {
    poolModule.portalPool = () => fakePool;
    entriesModule.readAdminEntries = async (pool, input) => {
      assert.equal(pool, fakePool);
      assert.equal(input.competitionId, "42");
      reads++;
      return { entries };
    };
    delivery.drain = async (db, ref, callbacks) => {
      assert.equal(await callbacks.beforeSend(closed[0]), true);
      currentCompetition = updated;
      assert.equal(await callbacks.beforeSend(closed[0]), false);
      currentCompetition = { ...competition, organizerEmail:"changed@example.invalid" };
      assert.equal(await callbacks.beforeSend(closed[0]), false);
      currentCompetition = { ...competition, canceled:true };
      assert.equal(await callbacks.beforeSend(closed[0]), false);
      return {done:true};
    };
    const {createCompetitionService_nativeNotificationAutomationServices:create} = require("../functions/backend/server-competition-service/native-notification-automation-services");
    const worker = create({ ENVIRONMENT:{projectId:"livepalmes",sportingDataSource:"nap"}, PDFDocument,
      local$nativePortalCompetition:async()=>currentCompetition, engagementMailSmtpConfig:()=>({ready:true,transport:{}}),
      nodemailer:{createTransport:()=>({sendMail:()=>assert.fail("Transport fictif"),close:()=>{closedTransport=true;}})}
    }).nativeNotificationTaskServices();
    assert.deepEqual(await worker.deliver({get:async()=>({data:()=>({competitionId:"42"})})}),{done:true});
    assert.equal(reads,3);
    assert.ok(closedTransport);
  } finally {
    poolModule.portalPool=previous.pool; entriesModule.readAdminEntries=previous.read; delivery.drain=previous.drain;
  }
  const services={PDFDocument,entries:async()=>({competition,entries}),authorizeSend:()=>{},projectId:"livepalmes-test"};
  const input={competitionId:"42",action:"preview-organizer-fees"};
  const preview=await manual(input,{uid:"fixture"},services);
  assert.equal(preview.digest,result.digest);
  const send={...input,action:"send-organizer-fees",requestId:preview.requestId,digest:preview.digest};
  assert.deepEqual(await manual(send,{uid:"fixture"},services),{simulated:true});
  await assert.rejects(manual({...send,digest:"obsolete"},{uid:"fixture"},services),/changé/);
  await assert.rejects(manual(send,{uid:"fixture"},{...services,authorizeSend:()=>{throw Error("hors périmètre");}}),/hors périmètre/);
  console.log("Frais organisateur : montants, confidentialité, PDF, contacts, aperçu périmé et simulation TEST vérifiés.");
})().catch(error=>{console.error(error);process.exitCode=1;});
