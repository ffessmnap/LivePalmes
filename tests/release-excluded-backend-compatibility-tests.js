"use strict";
// Pinned compatibility proof for retained packages. Only extracted handlers and
// pure modules run with explicit fixtures; application bootstrap, Firebase/SMTP/SQL
// clients, filesystem adapters and network imports remain blocked.
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const BASE = "b0020e51ebd6e686054efd3451882dd2c1d60d94";
const CANDIDATE = "ef96caca97f70554ee1f2c2b950cebeb5130e85e";
const base = process.argv[3] || BASE, candidate = process.argv[4] || CANDIDATE;
const c0 = base === CANDIDATE && candidate === "ac78b50759ca209cddaa15d374eb5e01dd926268";
const home = base === "ac78b50759ca209cddaa15d374eb5e01dd926268" && candidate === "25ac21b69c8fd09c44399f1f65b3bd4e6a0e58bd";
const homeReview = home ? require("./release-home-retained-compatibility") : null;
const names = ["closeDueEngagementCompetitions", "notifyEngagementCompetitionDocuments",
  "prepareEngagementClubRecapEmails", "listEngagementCompetitionMailJobs",
  "prepareEngagementOpeningNotificationEmails", "sendEngagementPreparedEmails", "processNapCompetitionNotifications", ...(c0 ? ["readNapPublicSwimmer"] : []), ...(home ? Object.keys(homeReview.ORIGINS).filter(name => !["closeDueEngagementCompetitions", "notifyEngagementCompetitionDocuments", "prepareEngagementClubRecapEmails", "listEngagementCompetitionMailJobs", "prepareEngagementOpeningNotificationEmails", "sendEngagementPreparedEmails", "processNapCompetitionNotifications"].includes(name)) : [])].sort();
const rows = process.argv[5] ? JSON.parse(process.argv[5]) : names.map(name => ({ name, commit: "1df545a62de67a24ff32ca4d1046cce4be6d499f" }));
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const git = (...args) => cp.execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const sources = new Map();
function source(commit, filename) {
  assert.ok(sha(commit));
  const key = commit + ":" + filename;
  if (!sources.has(key)) sources.set(key, git("show", key));
  return sources.get(key);
}
const clean = value => JSON.parse(JSON.stringify(value));
const acorn = require("./firestore-rules/node_modules/acorn");
function definitions(commit) {
  const code = source(commit, "functions/index.js"), result = new Map();
  for (const node of acorn.parse(code, { ecmaVersion: "latest" }).body) {
    if (node.type === "FunctionDeclaration") result.set(node.id.name, code.slice(node.start, node.end));
    if (node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression") {
      const left = node.expression.left;
      if (left.object?.name === "exports") result.set(left.property.name, code.slice(node.start, node.end));
    }
  }
  if (c0 || (base === "0619f1dce9439afd5dd4719ee035ff0fc3b99b83" && candidate === "c93c5016682bf67ddee589b8fb0d4008e68b3196")) {
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" &&
          node.expression.left.object?.name === "exports" && node.expression.left.property?.name === "readNapPublicSwimmer")
        result.set("readNapPublicSwimmer", code.slice(node.start, node.end));
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === "object") visit(value);
    }
    visit(acorn.parse(code, { ecmaVersion: "latest" }));
  }
  return result;
}
function loader(commit, readSource = source) {
  const cache = new Map();
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ["2026-10-12T12:00:00.000Z"])); } }
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    assert.ok(filename.startsWith("functions/") && !filename.includes("..") && /\.(js|json)$/.test(filename));
    const module = { exports: {} }; cache.set(filename, module);
    if (filename.endsWith(".json")) { module.exports = JSON.parse(readSource(commit, filename)); return module.exports; }
    const sandbox = { module, exports: module.exports, Buffer, URL, Date: FixedDate,
      require: request => {
        if (request === "node:crypto" || request === "crypto") return crypto;
        if (request === "node:util") return require("node:util");
        assert.ok(request.startsWith("."), "External import blocked: " + request);
        let target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), request));
        if (!/\.(js|json)$/.test(target)) target += ".js";
        return load(target);
      } };
    vm.runInNewContext(readSource(commit, filename), sandbox, { timeout: 3000, filename });
    return module.exports;
  }
  return load;
}
function pool(row) {
  let authorized = false, reads = 0;
  return {
    authorize() { authorized = true; },
    get reads() { return reads; },
    execute: async ({ sql, timeout }, values) => {
      assert.ok(sql.startsWith("SELECT ") && /LIMIT \d+$/.test(sql), "Only bounded fixture SELECTs");
      assert.equal(timeout, 10000); reads++;
      if (sql.includes("FROM competitions c")) { assert.deepEqual([...values], [5140]); return [[row]]; }
      assert.ok(authorized, "Authorization precedes dependent reads");
      return [[]];
    }
  };
}
function withoutPresentation(pack) {
  const value = clean(pack);
  delete value.event.description; delete value.event.legacyDescription;
  delete value.nativeSnapshot.competition.comments;
  return value;
}
function memoryDb() {
  const rows = new Map(), deleted = Symbol("deleted");
  const ref = (collection, id) => ({ id, path: `${collection}/${id}` });
  const snapshot = r => ({ exists: rows.has(r.path), data: () => rows.get(r.path) });
  return { rows, deleted, collection: name => ({ doc: id => ref(name, id) }), runTransaction: async callback => {
    const writes = [];
    const tx = { get: async r => snapshot(r), getAll: async (...refs) => refs.map(snapshot),
      create: (r, v) => writes.push(() => { assert.ok(!rows.has(r.path)); rows.set(r.path, v); }),
      set: (r, v) => writes.push(() => rows.set(r.path, v)),
      update: (r, v) => writes.push(() => { const next = { ...rows.get(r.path) }; for (const [k, x] of Object.entries(v)) { if (x === deleted) delete next[k]; else next[k] = x; } rows.set(r.path, next); }) };
    const value = await callback(tx); writes.forEach(write => write()); return value;
  } };
}
async function prove() {
  if (home) {
    assert.ok(Array.isArray(rows) && rows.every(row => row && typeof row === "object" && Object.keys(row).sort().join(",") === "commit,name" && sha(row.commit)), "Invalid retained row");
    assert.deepEqual(rows.map(row => row.name).sort(), Object.keys(homeReview.ORIGINS).sort(), "Exact home retained scope required");
    for (const row of rows) assert.equal(row.commit, homeReview.ORIGINS[row.name], "Unreviewed retained origin");
  } else if (!c0) {
    assert.equal(base, BASE, "Suite limited to the reviewed production baseline");
    assert.equal(candidate, CANDIDATE, "A new application candidate requires a new review");
  } else {
    assert.deepEqual(rows.map(row => row.name).sort(), names, "Exact C0 retained scope required");
    for (const row of rows) assert.equal(row.commit, row.name === "readNapPublicSwimmer" ? CANDIDATE : "1df545a62de67a24ff32ca4d1046cce4be6d499f", "Unreviewed retained origin");
  }
  assert.ok(Array.isArray(rows) && rows.every(row => names.includes(row.name) && sha(row.commit)));
  assert.equal(new Set(rows.map(row => row.name)).size, rows.length);
  const before = definitions(base), after = definitions(candidate);
  // Entry points and all index.js notification adapters remain byte-for-byte
  // unchanged. They keep running from their old packaged sources.
  const adapters = ["nativePortalCompetition", "nativeNotificationPreview", "nativeNotificationAutomationServices",
    "armNativeCompetitionNotification", "queueNativeDocumentNotification", "deliverNativeNotificationJobs"];
  for (const name of [...names, ...adapters]) {
    assert.ok(before.has(name), "Missing reviewed declaration " + name);
    assert.equal(after.get(name), before.get(name), "Notification contract changed: " + name);
  }
  for (const file of ["nap-notification-automation.js", "nap-notification-pages.js", "nap-notification-preview.js",
    "engagement-mail-control.js", "nap-portal-workspaces.js"])
    if (!(home && file === "nap-portal-workspaces.js"))
      assert.equal(source(candidate, "functions/" + file), source(base, "functions/" + file), "Unreviewed notification module change");
  await consumerFixtures({ base, candidate, rows, source, loader, definitions });
  if (home) await homeReview.prove({ root, base, candidate, rows, source, loader, definitions });
  if (c0) await require("./release-c0-document-compatibility.js").prove({ root, base, candidate, source, loader });
  return { schema: 1, suite: "retained-calendar-consumers-v1", productionCommit: base, candidate,
    ...(home ? { homeProofSha256: crypto.createHash("sha256").update(require("node:fs").readFileSync(path.join(__dirname, "release-home-retained-compatibility.js"))).digest("hex") } : {}),
    ...(c0 ? { c0ProofSha256: crypto.createHash("sha256").update(require("node:fs").readFileSync(path.join(__dirname, "release-c0-document-compatibility.js"))).digest("hex") } : {}),
    result: "success", networkCalls: 0, passedFunctions: rows.map(row => row.name).sort(),
    checks: ["pinned-application-pair", "unchanged-notification-adapters", "bounded-reader-projection", "authorization-before-reads",
      "mail-content", "retained-job-replay", "retained-closure-resume", "fixture-attachment-manifests", "document-selection",
      "stale-source-refused", "missing-document-refused", ...(c0 ? ["c0-exact-backend-diff", "public-reader-unchanged", "original-featured-document-projection", "partial-schema-refused"] : []), ...(home ? ["home-exact-pair-and-12-origins", "unchanged-retained-handlers", "preference-and-access-guards", "native-identity-replay", "additive-index-specs", "unchanged-competition-projection"] : [])] };
}

async function consumerFixtures({ base, candidate, rows, source, loader, definitions, same = assert.equal, mailSetup = () => {} }) {
  const before = definitions(base);
  // Project actual old/new readers with different and empty native comments.
  // Only presentation and the explicit concurrency snapshot may differ.
  const currentLoad = loader(candidate);
  const row = { id: 5140, comments: "INTRANAP comment", description: "Legacy presentation", libelle: "Fixture pool event",
    date: "2026-10-11", enddate: "2026-10-11", niveau: 1, parameter_id: 123, actif: 1, saisie: 1, relais: 1,
    ld: 0, type_label: "Piscine", level_label: "Régionale", bassin: 50, chrono: "E" };
  const origins = [...new Set([base, ...rows.map(row => row.commit)])];
  const captures = [];
  for (const commit of origins) {
    const oldLoad = loader(commit);
    for (const comments of ["INTRANAP comment", "", "Changed native comment"]) {
      const data = { ...row, comments };
      const oldPool = pool(data), newPool = pool(data);
      const oldPack = await oldLoad("functions/nap-portal-competitions.js").readNativeCompetition(oldPool, 5140, () => oldPool.authorize());
      const newPack = await currentLoad("functions/nap-portal-competitions.js").readNativeCompetition(newPool, 5140, () => newPool.authorize());
      assert.deepEqual(withoutPresentation(newPack), withoutPresentation(oldPack));
      assert.equal(oldPool.reads, newPool.reads); assert.equal(newPool.reads, 12);
      assert.equal(newPack.event.description, comments); assert.equal(newPack.nativeSnapshot.competition.comments, comments);
      await assert.rejects(currentLoad("functions/nap-portal-competitions.js").readNativeCompetition(pool(data), 5140, () => { throw Error("denied"); }), /denied/);
      captures.push({ commit, oldLoad, oldPack, newPack });
    }
  }
  // The retained consumer owns its own pack fingerprint. No fingerprint from
  // the new UI is supplied to notification handlers. Test real mail builders.
  const builders = ["engagementOpeningMailSubject", "engagementOpeningMailText", "engagementCompetitionDocumentMailSubject",
    "engagementCompetitionDocumentMailText", "engagementClubRecapMailSubject", "engagementClubRecapMailText",
    "engagementTxtMailSubject", "engagementTxtMailText", "engagementOfficialsMailSubject", "engagementOfficialsMailText"];
  function mailFunctions(commit) {
    const defs = definitions(commit), sandbox = { ENVIRONMENT: { hostingOrigin: "https://fixture.invalid" },
      engagementPdfFormatDate: x => x, engagementPdfFormatDateTime: x => x, engagementPdfMoney: x => String(x),
      engagementPdfFeeTotal: () => 0, cleanText: x => String(x || "") };
    mailSetup({ defs, sandbox, commit, builders });
    for (const name of builders) { same(defs.get(name), before.get(name), name); vm.runInNewContext(defs.get(name), sandbox); }
    return sandbox;
  }
  for (const capture of captures) {
    const oldView = capture.oldLoad("functions/nap-portal-workspaces.js");
    const newView = currentLoad("functions/nap-portal-workspaces.js");
    const oldCompetition = clean(oldView.competitionItem(capture.oldPack));
    const newCompetition = clean(newView.competitionItem(capture.newPack));
    const oldMail = mailFunctions(capture.commit), newMail = mailFunctions(candidate);
    for (const name of builders) {
      const details = name.includes("Document") ? [{ id: "doc-1", title: "Fixture document", url: "https://fixture.invalid/doc" }] : { clubId: "1", clubName: "Fixture club" };
      assert.equal(oldMail[name](oldCompetition, details), newMail[name](newCompetition, details), name);
    }
    const automation = capture.oldLoad("functions/nap-notification-automation.js");
    const pages = capture.oldLoad("functions/nap-notification-pages.js");
    const db = memoryDb(), operation = "a".repeat(64), now = "2026-10-12T12:00:00.000Z";
    const competition = { ...oldCompetition, id: "5140", entryStatus: "open", entryDeadlineAt: now };
    let pageCount = 0;
    const services = { simulation: true, deleteField: () => db.deleted, competition: async () => competition,
      page: async () => { pageCount++; return { jobs: [{ id: "fixture-mail" }], done: true, sourceHash: competition.napFingerprint }; },
      job: (_event, _competition, job) => ({ ...job, status: "disabled" }) };
    await automation.arm(db, { competitionId: "5140", operation, action: "open", deadline: now, openingRequested: true }, now);
    const opening = automation.eventRef(db, "5140", operation, "opening");
    const first = await automation.processEvent(db, opening, services, now);
    assert.equal(first.sentCount, 0); assert.equal(first.disabled, true);
    await automation.processEvent(db, opening, services, now); assert.equal(pageCount, 1, "Replay does not reset a retained job");
    assert.equal(db.rows.get("engagementMailJobs/fixture-mail").status, "disabled");
    const pageServices = { simulation: true, recipients: async () => [], select: () => [],
      entries: async () => ({ source: "nap", entries: [], clubsById: new Map() }), hasParticipants: () => true,
      clubRecipients: () => [], mail: () => { throw Error("No fixture recipient"); } };
    const closure = { kind: "closure", phase: "clubs", cursor: "" };
    const prepared = await pages.page(closure, competition, pageServices);
    const resumed = await pages.page({ ...closure, sourceHash: prepared.sourceHash }, competition, pageServices);
    assert.equal(resumed.sourceHash, prepared.sourceHash, "Retained code resumes its own fingerprint");
    await assert.rejects(pages.page({ ...closure, sourceHash: "obsolete" }, competition, pageServices), /change/);
    await assert.rejects(pages.page({ kind: "documents", cursor: "", documentIds: ["missing"] }, competition, pageServices), /supprime/);
    const recipient = { clubId: "1", email: "fixture@example.invalid" };
    const populatedServices = { ...pageServices, recipients: async () => [recipient], select: (_kind, recipients) => recipients,
      clubRecipients: recipients => recipients,
      entries: async () => ({ source: "nap", entries: [{ clubId: "1", teamLeaderComplete: true }], clubsById: new Map([["1", { name: "Fixture club" }]]) }),
      clubPdf: async () => ({ fileName: "fixture.pdf", buffer: Buffer.from("fixture-pdf-bytes") }),
      txt: async () => ({ fileName: "fixture.txt", buffer: Buffer.from("fixture-txt-bytes") }),
      officialsPdf: async () => ({ fileName: "officials.pdf", buffer: Buffer.from("fixture-officials-bytes"), officialCount: 1 }),
      mail: (kind, _competition, to, details) => ({ kind, to, details }) };
    const positive = await pages.page(closure, competition, populatedServices);
    assert.equal(positive.jobs.length, 1); assert.equal(positive.attachmentCount, 1);
    assert.match(positive.jobs[0].details.attachments[0].sha256, /^[a-f0-9]{64}$/);
    const exportsPage = await pages.page({ ...closure, phase: "exports", sourceHash: positive.sourceHash },
      { ...competition, competitionType: "pool", computerEmail: recipient.email, officialsRequired: true, officialsManagerEmail: recipient.email }, populatedServices);
    assert.equal(exportsPage.attachmentCount, 2); assert.equal(exportsPage.jobs.length, 2);
    assert.equal(exportsPage.done, true);
    const documentPage = await pages.page({ kind: "documents", cursor: "", documentIds: ["doc-1"] },
      { ...competition, clubDocuments: [{ id: "doc-1", title: "Fixture", url: "https://fixture.invalid/doc" }] }, populatedServices);
    assert.equal(documentPage.jobs.length, 1); assert.equal(documentPage.jobs[0].details.documents[0].id, "doc-1");
  }
}
const groupedPair = base === "fbd3c2868fcb3690e1fa5a7ddeca9f45e6fb4511" && candidate === "0619f1dce9439afd5dd4719ee035ff0fc3b99b83";
const bccPair = base === "0619f1dce9439afd5dd4719ee035ff0fc3b99b83" && candidate === "c93c5016682bf67ddee589b8fb0d4008e68b3196";
const allContract = require('../.github/releases/evidence/20261025-all-validated-contract.json');
const allPair = base === allContract.productionCommit && candidate === allContract.candidate;
const architecture = require('./release-architecture-retained-compatibility');
const architecturePair = architecture.matches(base, candidate);
const accountReview = require("./release-nap-account-compatibility");
const portalNsReview = require("./release-portal-access-ns-compatibility");
if (require.main === module) (portalNsReview.matches(base,candidate) ? portalNsReview.prove({root,base,candidate,rows,source,loader,consumerFixtures}) : accountReview.matches(base,candidate) ? accountReview.prove({root,base,candidate,rows}) : architecturePair ? architecture.prove({ root, base, candidate, rows, source, loader, consumerFixtures }) : allPair ? require('./release-bcc-retained-compatibility').prove({root,base,candidate,rows,source,definitions,loader,contract:allContract}) : bccPair ? require("./release-bcc-retained-compatibility").prove({root,base,candidate,rows,source,definitions,loader}) : groupedPair ? require('./release-grouped-retained-compatibility').prove({root,base,candidate,rows,source,definitions,loader}) : prove())
  .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = { loader,source,definitions,consumerFixtures };
