"use strict";
const assert = require("node:assert/strict");
const mail = require("../functions/request-decision-mail");
const templates = require("../functions/mail-templates");
function fixture(type = "swimmer_correction", decision = "approved", notifyRequester = true) {
  let value = { requestedAt: "2026-11-08T10:00:00Z", status: decision, email: "access@example.test", requestedByEmail: "region@example.test",
    targetEmail: "deleted@example.test", current: { lastName: "Avant", licenseNumber: "A" }, resolvedProposed: { lastName: "Après", licenseNumber: "B" } };
  value.resolutionNotification = mail.intent(value, "id", type, decision, { comment: "Message public", notifyRequester });
  let serial = Promise.resolve(), reads = 0, sends = [], catalog = templates.empty();
  const ref = { id: "id" };
  const db = { runTransaction(fn, settings) {
    assert.equal(settings.maxAttempts, 3);
    const next = serial.then(async () => {
      let write;
      const answer = await fn({ get: async () => { reads++; return { exists: true, data: () => structuredClone(value) }; },
        set: (_, patch) => { write = patch; } });
      if (write) {
        if (f.failWrite?.(write)) throw Error("fixture firestore unavailable");
        value = { ...value, ...structuredClone(write) };
      }
      return answer;
    });
    serial = next.catch(() => {}); return next;
  } };
  let catalogs = 0;
  const services = { projectId: "livepalmes", readTemplates: async () => { catalogs++; return catalog; }, smtpConfig: () => ({ ready: true, fromEmail: "from@example.test" }),
    send: async payload => { sends.push(payload); } };
  const f = { db, ref, services, get data() { return value; }, set data(next) { value = next; }, sends,
    get reads() { return reads; }, get catalogs() { return catalogs; }, set catalog(next) { catalog = next; },
    run: (retry = false) => mail.deliver(db, ref, services, value.resolutionNotification.key, retry) };
  return f;
}
(async () => {
  for (const notifyRequester of [true, false]) {
    assert.throws(() => mail.options({ decision: "rejected", notifyRequester, resolutionNote: "  " }), /obligatoire/);
  }
  assert.throws(() => mail.options({ decision: "approved", notifyRequester: "false" }), /invalide/);
  assert.equal(mail.options({ decision: "approved" }).notifyRequester, true);
  assert.equal(mail.kind({ reportType: "duplicate" }), "duplicate_closure");
  assert.equal(mail.kind({ requestType: "person-change" }), "official_correction");
  assert.equal(mail.kind({ requestType: "swimmer-ns" }), "swimmer_ns");
  for (const type of ["access", "swimmer_correction", "official_correction", "swimmer_ns", "duplicate_closure", "account_deletion"]) {
    for (const decision of ["approved", "rejected"]) {
      const f = fixture(type, decision); f.data.internalNote = "SECRET INTERNE";
      const result = await f.run();
      assert.equal(result.status, "sent"); assert.equal(f.sends.length, 1);
      assert.equal(f.sends[0].to, type === "access" ? "access@example.test" : "region@example.test");
      assert.ok(!f.sends[0].text.includes("SECRET INTERNE")); assert.ok(f.sends[0].text.includes("Message public"));
      assert.equal(result.templateId, `request.${type}.${decision}`);
      assert.ok(f.data.resolutionNotification.prepared.snapshot);
      assert.ok(!JSON.stringify(result).includes("prepared"));
      if (type === "duplicate_closure") assert.match(f.sends[0].text, /aucune fusion ni correction/);
      if (type === "swimmer_correction" && decision === "approved") assert.match(f.sends[0].text, /Numéro de licence : B/);
      await f.run(); assert.equal(f.sends.length, 1);
    }
  }
  const off = fixture("access", "rejected", false); assert.equal((await off.run()).status, "opted_out"); assert.equal(off.catalogs, 0); assert.equal(off.sends.length, 0);
  const test = fixture(); test.services.projectId = "livepalmes-test";
  test.services.smtpConfig = () => { throw Error("TEST must never read SMTP"); };
  assert.equal((await test.run()).status, "blocked_test"); assert.equal(test.sends.length, 0);
  const concurrent = fixture(); await Promise.all([concurrent.run(), concurrent.run()]); assert.equal(concurrent.sends.length, 1);
  const failing = fixture(); failing.services.send = async () => { throw Object.assign(Error("fixture SMTP rejection"), { responseCode: 550 }); };
  assert.equal((await failing.run()).status, "failed"); const prepared = structuredClone(failing.data.resolutionNotification.prepared);
  const id = "request.swimmer_correction.approved";
  failing.catalog = { schema: 1, revision: 1, templates: { [id]: { subject: "Nouveau", text: "{{decision.resume}}\n{{decision.details}}\n{{decision.commentaire}}", revision: 1 } } };
  failing.services.send = async payload => failing.sends.push(payload);
  assert.equal((await failing.run(true)).status, "sent"); assert.deepEqual(failing.data.resolutionNotification.prepared, prepared); assert.equal(failing.catalogs, 1);
  const uncertain = fixture(); uncertain.services.send = async () => { throw Error("timeout after DATA"); };
  assert.equal((await uncertain.run()).status, "uncertain"); assert.equal((await uncertain.run(true)).status, "uncertain");
  const unavailable = fixture(); unavailable.services.readTemplates = async () => { throw Error("catalog unavailable"); };
  assert.equal((await unavailable.run()).status, "failed"); assert.equal(unavailable.data.status, "approved"); assert.equal(unavailable.sends.length, 0);
  // A newer occurrence fences an old preparation and finalisation.
  const newer = fixture(); newer.services.readTemplates = async () => {
    newer.data = { ...newer.data, requestedAt: "2026-11-09T10:00:00Z" };
    newer.data.resolutionNotification = mail.intent(newer.data, "id", "swimmer_correction", "approved", { comment: "Nouveau", notifyRequester: true });
    return templates.empty();
  };
  assert.equal((await newer.run()).status, "superseded"); assert.equal(newer.sends.length, 0); assert.equal(newer.data.resolutionNotification.status, "pending");
  const changedDecision = fixture(); changedDecision.services.send = async () => { changedDecision.data = { ...changedDecision.data, status: "rejected" }; };
  assert.equal((await changedDecision.run()).status, "superseded");
  // Two Firestore failures after freeze reservation: expire only an unsent preparation.
  const interruptedPreparation = fixture(); interruptedPreparation.failWrite = patch => ["sending", "failed"].includes(patch.resolutionNotification.status);
  await interruptedPreparation.run(); assert.equal(interruptedPreparation.data.resolutionNotification.status, "preparing");
  interruptedPreparation.failWrite = null; interruptedPreparation.data.resolutionNotification.leaseUntil = "2000-01-01";
  assert.equal((await interruptedPreparation.run(true)).status, "sent"); assert.equal(interruptedPreparation.sends.length, 1);
  // Two finalisation failures: the SMTP attempt is never automatically replayed.
  const interruptedSend = fixture(); interruptedSend.failWrite = patch => ["sent", "uncertain"].includes(patch.resolutionNotification.status);
  await interruptedSend.run(); assert.equal(interruptedSend.data.resolutionNotification.status, "sending"); assert.equal(interruptedSend.sends.length, 1);
  interruptedSend.failWrite = null; interruptedSend.data.resolutionNotification.leaseUntil = "2000-01-01";
  assert.equal((await interruptedSend.run(true)).status, "uncertain"); assert.equal(interruptedSend.sends.length, 1);
  // A duplicate durable decision cannot reset a sent notification.
  const committed = fixture(); await committed.run();
  const saved = structuredClone(committed.data.resolutionNotification);
  await mail.commit(committed.db, committed.ref, committed.data, { status: "approved", resolutionNotification: { ...saved, status: "pending" } });
  assert.equal(committed.data.resolutionNotification.status, "sent");
  const again = fixture(); const oldKey = again.data.resolutionNotification.key;
  again.data.requestedAt = "2026-11-09";
  again.data.resolutionNotification = mail.intent(again.data, "id", "swimmer_correction", "approved", { comment: "Deuxième", notifyRequester: true });
  assert.notEqual(oldKey, again.data.resolutionNotification.key);
  await assert.rejects(mail.deliver(again.db, again.ref, again.services, oldKey), /changé/);
  const noHistory = fixture(); delete noHistory.data.resolutionNotification;
  await assert.rejects(mail.deliver(noHistory.db, noHistory.ref, noHistory.services, "old-key"), /Aucune notification/);
  console.log("Decision mails: six active kinds/two decisions, options, TEST barrier, frozen retries, concurrency, occurrence/decision fencing and double Firestore failures passed offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
