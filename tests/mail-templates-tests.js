"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const templates = require("../functions/mail-templates"), { catalog } = require("../functions/mail-template-catalog");
const rendering = require("../functions/mail-template-rendering"), automation = require("../functions/nap-notification-automation");
const { createCompetitionHandlers_getEngagementAutomaticMailControl: getFactory } = require("../functions/backend/portal-competition-handlers/get-engagement-automatic-mail-control");
const { createCompetitionHandlers_updateEngagementAutomaticMailControl: updateFactory } = require("../functions/backend/portal-competition-handlers/update-engagement-automatic-mail-control");
const deleted = Symbol("deleted");
function memoryDb() {
  const rows = new Map(); let counter = 0, reads = 0;
  const snapshot = reference => ({ exists: rows.has(reference.path), data: () => structuredClone(rows.get(reference.path)) });
  const reference = (name, id = `audit-${++counter}`) => ({ id, path: `${name}/${id}`, get: async function () { reads++; return snapshot(this); } });
  return { rows, get reads() { return reads; }, collection: name => ({ doc: id => reference(name, id) }), runTransaction: async fn => {
    const writes = [];
    const tx = { get: async ref => { reads++; return snapshot(ref); }, getAll: async (...refs) => { reads += refs.length; return refs.map(snapshot); },
      set: (ref, value) => writes.push(() => rows.set(ref.path, structuredClone(value))),
      create: (ref, value) => writes.push(() => { assert.ok(!rows.has(ref.path)); rows.set(ref.path, structuredClone(value)); }),
      update: (ref, value) => writes.push(() => { const next = { ...rows.get(ref.path) }; for (const [key, item] of Object.entries(value)) { if (item === deleted) delete next[key]; else next[key] = structuredClone(item); } rows.set(ref.path, next); }) };
    const result = await fn(tx); writes.forEach(write => write()); return result;
  } };
}
const actor = { national: true, uid: "national", email: "national@example.invalid" };
const model = catalog.find(item => item.id === "club_recap_pdf");
const saveInput = revision => ({ id: model.id, operation: "save", subject: "Club {{club.nom}} — {{competition.nom}}", text: "Nouveau texte\n" + model.required.map(token => `{{${token}}}`).join("\n"), expectedRevision: revision });
async function run() {
  assert.ok(catalog.length <= 32); assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
  for (const item of catalog.filter(item => item.editable)) {
    const preview = templates.preview(item); assert.ok(preview.subject); assert.ok(preview.text); assert.doesNotMatch(preview.text, /\{\{/);
  }
  for (const input of [{ ...model, text: "bonjour" }, { ...model, subject: "bad\r\nBcc: all" },
    { ...model, text: model.text + "{{secret}}" }, { ...model, text: model.text + " {{club.nom}}" },
    { ...model, subject: "{{frais.details}}" }, { ...model, text: model.text + "{{broken" },
    { ...model, subject: "a".repeat(221) }, { ...model, text: model.text + "a".repeat(5000) }]) assert.throws(() => templates.validate(model.id, input));
  assert.throws(()=>templates.validate(model.id,{...model,text:model.text.replace('{{frais.details}}','https://example.invalid/?hidden={{frais.details}}')}),/ligne distincte/);
  const db = memoryDb(), before = db.reads;
  assert.throws(()=>templates.state({schema:1,revision:0,templates:{},extra:'x'.repeat(templates.LIMITS.documentBytes)}),/volumineux/);
  assert.throws(()=>templates.state({schema:1,revision:0,templates:{unknown:{subject:'Objet',text:'Texte'}}}),/inconnu/);
  assert.deepEqual(await templates.read(db), templates.empty()); assert.equal(db.reads - before, 1);
  await assert.rejects(() => templates.read({ collection: () => ({ doc: () => ({ get: async () => { throw Error("offline"); } }) }) }), /offline/);
  const original = { subject: "Objet historique", text: "Texte historique\n<contenu>" };
  const defaultMail = templates.render(model.id, templates.empty(), {}, original);
  assert.equal(defaultMail.subject, original.subject); assert.equal(defaultMail.text, original.text);
  await templates.update(db, saveInput(0), actor, "2026-11-08T10:00:00.000Z");
  assert.equal(db.rows.size, 2); assert.ok([...db.rows.keys()].every(key => /^(engagementConfigurations|auditLogs)\//.test(key)), "Save must not create an event or mail job");
  const current = await templates.read(db), initialRows = JSON.stringify([...db.rows]);
  await assert.rejects(() => templates.update(db, saveInput(0), actor), /changé/); assert.equal(JSON.stringify([...db.rows]), initialRows);
  await assert.rejects(() => templates.update(db, saveInput(1), { uid: "regional", national: false }), /nationale/);
  const variables = { ...templates.sample(model.id), "club.nom": "<script>alert(1)</script>", "competition.nom": "Compétition" };
  const rendered = templates.render(model.id, current, variables, original);
  assert.match(rendered.html, /&lt;script&gt;/); assert.doesNotMatch(rendered.html, /<script>/);
  assert.throws(() => templates.render(model.id, current, {}, original), /indisponible/);
  assert.throws(() => templates.render(model.id, current, { ...variables, "competition.nom": "x".repeat(220) }, original), /trop long/);
  // Exact compatibility with the five existing builders, including both fee cases.
  const format = require("../functions/engagement-competition-mail-format"), context = { ...format, ENVIRONMENT: { hostingOrigin: "https://example.invalid" }, engagementPdfMoney: x => `${x} €`, engagementPdfFeeTotal: () => 12 };
  const builders = { ...require("../functions/backend/server-mail-service/engagement-opening-mail-subject").createMailService_engagementOpeningMailSubject(context),
    ...require("../functions/backend/server-mail-service/engagement-club-recap-mail-subject").createMailService_engagementClubRecapMailSubject(context),
    ...require("../functions/backend/server-mail-service/engagement-competition-document-mail-subject").createMailService_engagementCompetitionDocumentMailSubject(context) };
  const competition = { name: "Compétition", date: "2026-11-07", location: "Piscine", entryDeadlineAt: "2026-11-05T22:59:00Z", fees: { enabled: true, helloAssoUrl: "https://example.invalid/payer" } };
  for (const enabled of [true, false]) {
    competition.fees.enabled = enabled;
    for (const [id, builder, details] of [["opening_notification", "engagementOpening", {}], ["club_recap_pdf", "engagementClubRecap", { clubName: "Club" }],
      ["competition_documents", "engagementCompetitionDocument", [{ title: "Programme", url: "https://example.invalid/prog" }]], ["entries_txt", "engagementTxt", { fileName: "export.txt" }], ["officials_pdf", "engagementOfficials", { officialCount: 3 }]]) {
      const old = { subject: builders[`${builder}MailSubject`](competition, details), text: builders[`${builder}MailText`](competition, details) };
      const value = rendering.competitionMail(id, templates.empty(), competition, { entry: details, documents: Array.isArray(details) ? details : [], ...details }, old, context.ENVIRONMENT.hostingOrigin);
      assert.equal(value.text, old.text); assert.equal(value.subject, old.subject);
      const item = catalog.find(item => item.id === id), configured = { schema: 1, revision: 1, templates: { [id]: { subject: item.subject, text: item.text, revision: 1 } } };
      const converted = rendering.competitionMail(id, configured, competition, { entry: details, documents: Array.isArray(details) ? details : [], ...details }, old, context.ENVIRONMENT.hostingOrigin);
      assert.equal(converted.text, old.text); assert.equal(converted.subject, old.subject);
    }
  }
  // Real event processor, multiple pages, interruption and configuration changed between calls.
  const operation = "a".repeat(64), now = "2026-11-08T10:00:00.000Z";
  await automation.arm(db, { competitionId: "5162", operation, action: "open", deadline: "2026-11-09T10:00:00.000Z", openingRequested: true }, now);
  const reference = automation.eventRef(db, "5162", operation, "opening"); let pages = 0, fail = true;
  const services = { simulation: true, deleteField: () => deleted, competition: async () => ({ id: "5162", source: "nap", napSource: true, entryStatus: "open" }),
    freezeMailTemplates: (ref, event, lease) => templates.freezeEvent(db, ref, event, lease),
    page: async event => { if (fail) throw Error("interruption"); pages++; return { jobs: [{ id: `mail-${pages}`, textBody: event.mailTemplates.templates[model.id].text }], done: pages === 2, nextCursor: "1" }; },
    job: (_event, _competition, job) => job };
  await assert.rejects(() => automation.processEvent(db, reference, services, now), /interruption/);
  const frozen = db.rows.get(reference.path).mailTemplates; assert.equal(frozen.revision, 1);
  await templates.update(db, { ...saveInput(1), text: saveInput(1).text.replace("Nouveau texte", "Texte suivant") }, actor);
  fail = false;
  await automation.processEvent(db, reference, services, "2026-11-08T10:06:00.000Z");
  await automation.processEvent(db, reference, services, "2026-11-08T10:07:00.000Z");
  assert.equal(db.rows.get("engagementMailJobs/mail-1").textBody, frozen.templates[model.id].text);
  assert.equal(db.rows.get("engagementMailJobs/mail-2").textBody, frozen.templates[model.id].text);
  const legacyRef=db.collection("engagementClosureQueue").doc("legacy"),legacyJobId="c".repeat(64);
  db.rows.set(legacyRef.path,{lease:"legacy-lease",cursor:"5",preparedCount:1});
  const readsBeforeLegacy=db.reads;
  assert.deepEqual(await templates.freezeEvent(db,legacyRef,db.rows.get(legacyRef.path),"legacy-lease"),templates.empty());
  assert.equal(db.reads-readsBeforeLegacy,1,"A legacy partial event reads only its event, not a new catalogue");
  db.rows.set(`engagementMailJobs/${legacyJobId}`,{subject:"Ancien objet",textBody:"Ancien texte",status:"sent"});
  const previousLegacy=JSON.stringify(db.rows.get(`engagementMailJobs/${legacyJobId}`));
  assert.deepEqual(await templates.readManual(db,"d".repeat(64),[model.id],legacyJobId),templates.empty());
  assert.equal(JSON.stringify(db.rows.get(`engagementMailJobs/${legacyJobId}`)),previousLegacy);
  await automation.processEvent(db, reference, services, "2026-11-08T10:08:00.000Z"); assert.equal(pages, 2);
  const key = "b".repeat(64), manual = await templates.readManual(db, key);
  await templates.freezeManual(db, key, manual); await templates.update(db, { ...saveInput(2), operation: "reset" }, actor);
  assert.deepEqual(await templates.readManual(db, key), manual); assert.equal((await templates.read(db)).templates[model.id], undefined);
  const resetView=templates.view(await templates.read(db)).models.find(item=>item.id===model.id);
  assert.equal(resetView.customized,false);assert.equal(resetView.revision,3);assert.equal(resetView.updatedBy,actor.uid);
  const extra=catalog.find(item=>item.id==='opening_notification');
  const unordered={schema:1,revision:4,templates:{[model.id]:{subject:model.subject,text:model.text,revision:2},[extra.id]:{subject:extra.subject,text:extra.text,revision:4}}};
  const reordered={templates:{[extra.id]:{revision:4,text:extra.text,subject:extra.subject},[model.id]:{revision:2,text:model.text,subject:model.subject}},revision:4,schema:1};
  assert.ok(templates.sameSnapshot(unordered,reordered));assert.equal(templates.sameSnapshot(unordered,{...reordered,revision:5}),false);
  assert.equal(rendering.requestMail(templates.empty(),{kind:'swimmer_correction',decision:'rejected',summary:'Refus',subject:original.subject},original).text,original.text,'Legacy default payloads stay unchanged before the decision-handler changes');
  // National check precedes all template storage and preview operations.
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  let national = false;
  const apiContext = { HttpsError, db, ENVIRONMENT: { projectId: "livepalmes-test" }, engagementAccessContext: async () => ({ ...actor, national }) };
  const get = getFactory(apiContext).getEngagementAutomaticMailControl, set = updateFactory(apiContext).updateEngagementAutomaticMailControl;
  const count = db.reads;
  for (const [fn, data] of [[get, { action: "mailTemplates" }], [get, { action: "previewMailTemplate", ...model }], [set, { action: "mailTemplate", ...saveInput(3) }]]) await assert.rejects(() => fn({ data }), error => error.code === "permission-denied");
  assert.equal(db.reads, count); national = true;
  assert.ok((await get({ data: { action: "mailTemplates" } })).models.length);
  const rowCount = db.rows.size; await get({ data: { action: "previewMailTemplate", ...model } }); assert.equal(db.rows.size, rowCount);
  for (const kind of ["access", "swimmer_correction", "official_correction", "swimmer_reactivation", "official_reactivation", "duplicate_closure", "account_deletion", "swimmer_deletion", "competition_deletion"]) {
    for (const decision of ["approved", "rejected"]) {
      const input = { kind, decision, subject: "Décision", summary: kind === "duplicate_closure" ? "Signalement clôturé, sans fusion." : "Action effectuée.", comment: decision === "rejected" ? "Motif public" : "" };
      assert.ok(rendering.requestMail(templates.empty(), input).text.includes(input.summary));
      if (decision === "rejected") assert.throws(() => rendering.requestMail(templates.empty(), { ...input, comment: "" }), /obligatoire/);
    }
  }
  // Real direct-account consumers, a fake transport only, one catalogue read
  // for all administrative recipients and validation before any delivery.
  const portal=require('../functions/portal-access-mail'),directDb=memoryDb(),delivered=[];
  const directContext={...portal,db:directDb,cleanText:value=>String(value||'').trim(),
    livePalmesMailHtml:require('../functions/livepalmes-mail-html').livePalmesMailHtml,
    engagementMailSmtpConfig:()=>({ready:true,transport:{},fromEmail:'fixture@example.invalid'}),
    nodemailer:{createTransport:()=>({sendMail:async mail=>{delivered.push(mail);}})},
    engagementActiveMailRecipients:async()=>Array.from({length:11},(_,index)=>({uid:`admin-${index}`,email:`admin-${index}@example.invalid`,firstName:'Camille',regionId:'Test',capabilities:['engagements.region.manage']})),
    engagementClubCode:(_id,code)=>code||'123',engagementClubName:(_id,name)=>name,CLUB_REFERENCE_REGION_LABELS:{}};
  const direct=require('../functions/backend/server-directory-service/consume-public-access-request-rate-limit').createDirectoryService_consumePublicAccessRequestRateLimit(directContext);
  const profile={firstName:'Camille',lastName:'EXEMPLE',email:'camille@example.invalid',clubId:'12',clubName:'Club Exemple',regionId:'Test'};
  assert.equal((await direct.sendEngagementAccessAcknowledgement(profile)).status,'sent');
  assert.equal(delivered[0].text,portal.engagementAccessAcknowledgement(profile).text);
  const directReads=directDb.reads;
  assert.equal((await direct.sendEngagementAccessAdminNotifications(profile)).sentCount,11);assert.equal(directDb.reads-directReads,1);
  const adminModel=catalog.find(item=>item.id==='access_admin_notification');
  directDb.rows.set('engagementConfigurations/mailTemplates',{schema:1,revision:1,templates:{access_admin_notification:{subject:'x'.repeat(190)+'{{club.libelle}}',text:adminModel.text,revision:1}}});
  assert.equal((await direct.sendEngagementAccessAdminNotifications({...profile,clubName:'L'.repeat(130)})).status,'failed');
  assert.equal(delivered.length,12,'Invalid expanded content must not partially send');
  const currentRows=JSON.stringify([...db.rows]);
  const brokenAudit={...db,collection:name=>name==='auditLogs'?{doc:()=>{throw Error('audit unavailable');}}:db.collection(name)};
  await assert.rejects(()=>templates.update(brokenAudit,saveInput(3),actor),/audit unavailable/);
  assert.equal(JSON.stringify([...db.rows]),currentRows,'An audit failure must roll back the configuration write');
  console.log("Mail templates: defaults, protected variables, escaping, limits, national API, atomic CAS/audit, no send, frozen pages/retries and decision contract passed offline.");
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { memoryDb, run };
