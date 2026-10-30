"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), os = require("node:os"), vm = require("node:vm");
const planner = require("../tools/user-name-correction-plan"), policy = require("../tools/user-name-correction-resume");
const { runBatch, proposedBatch } = require("../tools/user-name-correction-engine");
const cli = require("../tools/resume-production-user-name-correction"), check = require("../tools/check-production-user-name-correction");
function fixture() {
  const documents = Array.from({ length: 251 }, (_, i) => ({ name: `projects/livepalmes/databases/(default)/documents/users/fiction-${String(i).padStart(3, "0")}`,
    createTime: "2026-10-30T08:00:00.123456789Z", updateTime: "2026-10-30T09:00:00.123456789Z", fields: {
      firstName: { stringValue: `NOM-${i}` }, lastName: { stringValue: `Prénom-${i}` }, lastLoginAt: { stringValue: "2026-10-30T09:00:00Z" },
      status: { stringValue: "inactive" }, rights: { mapValue: { fields: { full: { booleanValue: false } } } }, email: { stringValue: `fiction-${i}@example.invalid` } } }));
  const plan = planner.prepare(documents, "fiction-resume-operation"), name = plan.entries[75].name;
  const completed = plan.entries.slice(0, 70).map(e => ({ name: e.name, planDigest: plan.digest, afterVersion: "2026-10-30T09:30:00.123456789Z" }));
  const context = { plan, documents, completed, conflict: { operationId: plan.operationId, planDigest: plan.digest, name,
    originalVersion: plan.entries[75].version, changedFieldNames: ["lastLoginAt"] }, ledgerHash: "a".repeat(64), lockHash: "b".repeat(64),
    preparationFile: "correction-preparation-00000000-0000-4000-8000-000000000000.enc" };
  const current = new Map(documents.slice(70).map(doc => [doc.name, structuredClone(doc)]));
  current.get(name).updateTime = "2026-10-30T10:00:00.123456789Z";
  current.get(name).fields.lastLoginAt = { stringValue: "2026-10-30T10:00:00.123456789Z" };
  const make = () => policy.make(context, current, "00000000-0000-4000-8000-000000000001", "2026-10-30T10:01:00Z", false);
  return { context, current, make, name };
}
async function prepareIsReadOnly() {
  const f = fixture(), prepFile = "correction-preparation-985e4991-70a7-43f1-962e-c5ac28169356.enc";
  const files = Array.from({ length: 7 }, (_, i) => ["intent", "receipt", "verified"].map(k => `apply-batch-${String(i+1).padStart(3,"0")}-${k}.enc`)).flat();
  const metadata = ["syncEngagementMailRecipientIndex", "syncNapClubAccountEmails"].map(name => ({ name, present:true, state:"ACTIVE", revision:"fixture",
    filters:[{attribute:"database",value:"(default)"},{attribute:"namespace",value:"(default)"},{attribute:"document",value:"users/{uid}",operator:"match-path-pattern"}] }));
  const business = doc => ({ firebase_uid:doc.name.split("/").at(-1),club_id:null,email:doc.fields.email.stringValue,status:"inactive",competition_notifications:0,source_version:"1" });
  const nap = new Map(f.context.documents.map(d => [d.name.split("/").at(-1),business(d)]));
  const prep = { triggers:metadata,projectionSpecs:[],projectionDocuments:[],napBaseline:[...nap] }, privateFiles = new Map();
  const calls = { sourceReads:0,sqlReads:0,saves:0,filesystemWrites:0 };
  const fakeFs = { readdirSync:()=>[...files], existsSync:()=>false,
    readFileSync:file=>file.endsWith("apply.lock")?Buffer.from(JSON.stringify({operationId:f.context.plan.operationId,planDigest:f.context.plan.digest,pid:999999})):Buffer.from(path.basename(file)) };
  const previous = { readPrivate(backup,file) {
    if(privateFiles.has(file))return structuredClone(privateFiles.get(file));
    if(file===prepFile)return prep;
    if(file.startsWith("infra-concurrency-detail"))return f.context.conflict;
    const match=/apply-batch-(\d{3})-(intent|receipt|verified)\.enc/.exec(file);assert(match);
    const offset=(Number(match[1])-1)*10, names=f.context.plan.entries.slice(offset,offset+10).map(e=>e.name);
    const common={planDigest:f.context.plan.digest,direction:"apply"};
    return match[2]==="intent"?{...common,names,writes:names.map(name=>planner.proposedWrite(f.context.plan,name,f.context.documents.find(d=>d.name===name)).write)}
      :{...common,saved:f.context.completed.slice(offset,offset+10)};
  },savePrivate(backup,file,value){calls.saves++;privateFiles.set(file,structuredClone(value));},durable(){calls.filesystemWrites++;throw Error("No lock during preparation");} };
  const controls = { triggerMetadataHash:value=>planner.hash(value),
    groupedRead:async names=>{assert.deepEqual(Array.from(names),f.context.plan.entries.slice(70).map(e=>e.name));calls.sourceReads+=names.length;return f.current;},
    verifyProjections:async entries=>({documentsRead:1,entriesChecked:entries.length*2}),
    napConnection:async()=>({end:async()=>{}}),
    napRows:async(connection,names)=>{assert(names.length<=10);calls.sqlReads++;return new Map(names.map(name=>{const uid=name.split("/").at(-1);return [uid,nap.get(uid)];}));} };
  const fakePolicy={...policy,contextValid:ctx=>policy.contextValid(ctx,false),make:(...args)=>policy.make(...args,false),verify:(...args)=>policy.verify(...args,false)};
  const fakeCheck={OPERATION:f.context.plan.operationId,DIGEST:f.context.plan.digest,inspectTrigger:async name=>metadata.find(t=>t.name===name)};
  const exported={exports:{}};
  const sandbox={module:exported,Buffer,structuredClone,console:{log(){},error(){}},setTimeout,process:{env:{LOCALAPPDATA:"/fiction-local"},kill(){const error=Error("dead");error.code="ESRCH";throw error;}},
    fetch(){throw Error("Remote write forbidden in preparation");},require(name){
      if(name==="node:fs")return fakeFs;if(name==="node:path")return path;if(name==="node:crypto")return require(name);
      if(name==="./user-name-correction-plan")return planner;if(name==="./user-name-correction-resume")return fakePolicy;
      if(name==="./check-production-user-name-correction")return fakeCheck;if(name==="./execute-production-user-name-correction")return previous;
      if(name==="./user-name-correction-controls")return controls;if(name==="./user-name-correction-engine")return {runBatch(){throw Error("Writing engine forbidden during preparation");}};
      throw Error("Unexpected import");} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../tools/resume-production-user-name-correction.js"),"utf8"),sandbox,{timeout:3000});
  const result=await exported.exports.prepare({directory:"/fiction-primary",plan:f.context.plan,documents:f.context.documents},"fiction-token",prepFile);
  assert.equal(result.remaining,181);assert.equal(result.protectedAlreadyCorrected,70);assert.equal(result.sourceWrites,0);
  assert.equal(calls.sourceReads,181);assert.equal(calls.sqlReads,19);assert.equal(calls.saves,1);assert.equal(calls.filesystemWrites,0);
  assert.equal(privateFiles.size,1);assert.equal(result.originalManifestUnchanged,true);
}
async function test() {
  const f = fixture(), before = JSON.stringify(f.context.plan), annex = f.make();
  assert.equal(annex.remainingNames.length, 181); assert.equal(annex.completed.length, 70);
  assert.equal(JSON.stringify(f.context.plan), before, "Original manifest must stay byte-equivalent");
  assert.throws(() => policy.verify(f.context, annex), /Original operation differs/);
  policy.verify(f.context, annex, false);
  const projectionFields = { firstName: { stringValue: "unchanged" }, lastLoginAt: { stringValue: "old" }, rights: { booleanValue: false } };
  const otherFields = structuredClone(projectionFields);
  const prep = { projectionSpecs: [[annex.override.name, [{name:"directory",map:"entries",key:"one"},{name:"mail",map:"recipients",key:"one"}]]],
    projectionDocuments: [["directory", {fields:{entries:{mapValue:{fields:{one:{mapValue:{fields:projectionFields}},other:{mapValue:{fields:otherFields}}}}}}}],
      ["mail", {fields:{recipients:{mapValue:{fields:{one:{mapValue:{fields:{firstName:{stringValue:"unchanged"}}}}}}}}}]] };
  const beforeProjection = planner.hash(prep), adjusted = cli.baselineOf(prep,annex);
  const actualProjection = adjusted.docs.get("directory").fields.entries.mapValue.fields;
  assert.deepEqual(actualProjection.one.mapValue.fields, {...projectionFields,lastLoginAt:annex.override.fields.lastLoginAt});
  assert.deepEqual(actualProjection.other.mapValue.fields,otherFields);
  assert.equal(Object.hasOwn(adjusted.docs.get("mail").fields.recipients.mapValue.fields.one.mapValue.fields,"lastLoginAt"),false);
  assert.equal(planner.hash(prep),beforeProjection,"Saved baseline must stay immutable");
  assert.equal(policy.proposedWrite(f.context, annex, f.context.plan.entries[0].name, null, null, "apply", false).status, "outside-resume-scope");
  const proposal = policy.proposedWrite(f.context, annex, f.name, f.current.get(f.name), null, "apply", false);
  assert.equal(proposal.status, "proposed-only"); assert.deepEqual(proposal.write.updateMask.fieldPaths, ["firstName", "lastName"]);
  assert.equal(proposal.write.currentDocument.updateTime, f.current.get(f.name).updateTime);
  assert.deepEqual(proposal.write.update.fields, f.context.plan.entries[75].after);
  const ordinary = f.context.plan.entries[80];
  assert.deepEqual(policy.proposedWrite(f.context, annex, ordinary.name, f.current.get(ordinary.name), null, "apply", false), planner.proposedWrite(f.context.plan, ordinary.name, f.current.get(ordinary.name)));
  for (const mutate of [x => x.current.get(x.name).fields.status = { stringValue: "active" },
    x => x.current.get(x.name).fields.firstName = { stringValue: "other" },
    x => x.current.get(x.name).fields.lastLoginAt = { stringValue: "not-a-timestamp" },
    x => x.current.get(x.context.plan.entries[80].name).updateTime = "2026-10-30T10:00:00Z",
    x => x.current.delete(x.context.plan.entries[80].name),
    x => x.context.completed.pop(), x => x.context.completed[1] = x.context.completed[0]]) {
    const value = fixture(); mutate(value); assert.throws(value.make);
  }
  for (const mutate of [x => x.remainingNames[0] = f.context.plan.entries[0].name,
    x => x.override.fields.rights = { booleanValue: true }, x => x.originalLockHash = "c".repeat(64),
    x => x.ledgerHash = "d".repeat(64), x => x.preparationFile = "correction-preparation-other.enc",
    x => x.extraApproval = true]) {
    const changed = structuredClone(annex); mutate(changed); const { digest, ...body } = changed; changed.digest = planner.hash(body);
    assert.throws(() => policy.verify(f.context, changed, false));
  }
  const later = structuredClone(f.current.get(f.name)); later.updateTime = "2026-10-30T10:02:00.123456789Z";
  assert.equal(policy.proposedWrite(f.context, annex, f.name, later, null, "apply", false).status, "concurrent-or-uncertain-conflict");
  let current = structuredClone(f.current.get(f.name)), commits = 0; const events = [];
  const entry = f.context.plan.entries.find(e => e.name === f.name), originals = policy.effectiveOriginals(f.context, annex, false);
  const proposeWrite = (plan, name, doc, receipt, direction) => policy.proposedWrite(f.context, annex, name, doc, receipt, direction, false);
  const io = { read: async () => new Map([[current.name, structuredClone(current)]]), persist: async kind => events.push(kind), observe: async () => events.push("observed"),
    commit: async writes => { assert.equal(events.at(-1), "intent"); assert.equal(writes.length, 1); assert.equal(writes[0].currentDocument.updateTime, current.updateTime);
      current.fields = { ...current.fields, ...writes[0].update.fields }; current.updateTime = `2026-10-30T1${++commits}:00:00.123456789Z`;
      return { writeResults: [{ updateTime: current.updateTime }], commitTime: current.updateTime }; } };
  const saved = await runBatch({ plan: f.context.plan, entries: [entry], originals, proposeWrite, ...io });
  assert.deepEqual(events, ["intent", "receipt", "observed", "verified"]);
  assert.equal(current.fields.lastLoginAt.stringValue, annex.override.fields.lastLoginAt.stringValue);
  assert.deepEqual(current.fields.rights, annex.override.fields.rights); assert.equal(current.fields.status.stringValue, "inactive");
  await assert.rejects(runBatch({ plan: f.context.plan, entries: [entry], originals, proposeWrite, ...io })); assert.equal(commits, 1);
  await runBatch({ plan: f.context.plan, entries: [entry], originals, proposeWrite, ...io, receipts: saved, direction: "rollback" });
  assert.deepEqual(current.fields, annex.override.fields); assert.equal(commits, 2);
  assert.equal(JSON.stringify(f.context.plan), before);
  assert.throws(() => proposedBatch(f.context.plan, [entry], f.current, "apply", [], () => ({ status: "proposed-only",
    write: { ...proposal.write, update: { ...proposal.write.update, name: f.context.plan.entries[0].name } } })), /scope/);
  assert.throws(() => proposedBatch(f.context.plan, [entry], f.current, "apply", [], () => ({ status: "proposed-only",
    write: { ...proposal.write, update: { ...proposal.write.update, fields: { ...proposal.write.update.fields, status: { stringValue: "active" } } } } })), /scope/);
  const taskTemp = fs.mkdtempSync(path.join(os.tmpdir(), "user-name-resume-tests-")), oldLocal = process.env.LOCALAPPDATA;
  try {
    process.env.LOCALAPPDATA = taskTemp;
    const backup = { directory: path.join(taskTemp, "primary") }, copy = path.join(taskTemp, "LivePalmes", "ProtectedBackupCopies", check.OPERATION);
    fs.mkdirSync(backup.directory, { recursive: true }); fs.mkdirSync(copy, { recursive: true });
    const originalLock = Buffer.from("original-lock-must-stay"); fs.writeFileSync(path.join(backup.directory, "apply.lock"), originalLock);
    const a = { digest: "a".repeat(64) }, prefix = "resume-"+"a".repeat(16);
    cli.reserveLocks(backup, prefix, "apply", a);
    assert(fs.readFileSync(path.join(backup.directory, "apply.lock")).equals(originalLock));
    assert(fs.readFileSync(path.join(backup.directory, "reviewed-resume-apply.lock")).equals(fs.readFileSync(path.join(copy, "reviewed-resume-apply.lock"))));
    assert.throws(() => cli.reserveLocks(backup, prefix, "apply", a), /already started/);
    assert.throws(() => cli.reserveLocks(backup, "resume-"+"b".repeat(16), "apply", { digest: "b".repeat(64) }), /already started/);
    backup.key = require("node:crypto").randomBytes(32);
    const previous = require("../tools/execute-production-user-name-correction");
    const remaining = f.context.plan.entries.slice(70), originalsForFinish = policy.effectiveOriginals(f.context,annex,false), freshForFinish = new Map();
    const confirmed = remaining.slice(0,10).map(entry => {
      const doc = {...structuredClone(originalsForFinish.get(entry.name)),fields:{...originalsForFinish.get(entry.name).fields,...entry.after},updateTime:"2026-10-30T13:00:00Z"};
      freshForFinish.set(entry.name,doc);return {name:entry.name,planDigest:check.DIGEST,afterVersion:doc.updateTime};
    });
    const common = {planDigest:check.DIGEST,resumeDigest:a.digest,direction:"apply"};
    previous.savePrivate(backup,`${prefix}-apply-batch-001-receipt.enc`,{...common,saved:confirmed});
    previous.savePrivate(backup,`${prefix}-apply-batch-001-intent.enc`,{...common,names:confirmed.map(row=>row.name),writes:remaining.slice(0,10).map(entry=>({update:{name:entry.name,fields:entry.after},updateMask:{fieldPaths:["firstName","lastName"]},currentDocument:{updateTime:originalsForFinish.get(entry.name).updateTime}}))});
    assert.deepEqual(cli.confirmedPrefix(backup,prefix,a,remaining,freshForFinish,originalsForFinish,()=>false),confirmed);
    assert.throws(()=>cli.confirmedPrefix(backup,prefix,a,remaining,freshForFinish,originalsForFinish,()=>true),/active/);
    freshForFinish.get(remaining[0].name).fields.status={stringValue:"changed"};
    assert.throws(()=>cli.confirmedPrefix(backup,prefix,a,remaining,freshForFinish,originalsForFinish,()=>false),/changed/);
    freshForFinish.get(remaining[0].name).fields={...originalsForFinish.get(remaining[0].name).fields,...remaining[0].after};
    previous.savePrivate(backup,`${prefix}-apply-batch-002-uncertain.enc`,{});
    assert.throws(()=>cli.confirmedPrefix(backup,prefix,a,remaining,freshForFinish,originalsForFinish,()=>false),/journal differs/);
    backup.key.fill(0);
    assert.throws(() => cli.reserveLocks(backup, prefix, "rollback", a, () => true), /active/);
    cli.reserveLocks(backup, prefix, "rollback", a, () => false);
    assert(fs.existsSync(path.join(backup.directory, "reviewed-resume-apply.lock")));
    assert(fs.readFileSync(path.join(backup.directory, "apply.lock")).equals(originalLock));
  } finally {
    if (oldLocal === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = oldLocal;
    const target = path.resolve(taskTemp), allowed = path.resolve(os.tmpdir())+path.sep;
    assert(target.startsWith(allowed) && path.basename(target).startsWith("user-name-resume-tests-"));
    fs.rmSync(target, { recursive: true, force: true });
  }
  await prepareIsReadOnly();
  console.log("Resume policy: 70 excluded, exact 181 scope, one frozen login timestamp, immutable original manifest, typed CAS, preserved rights, guarded rollback and durable shared locks passed offline.");
}
module.exports = { test };
if (require.main === module) test().catch(error => { console.error(error); process.exitCode = 1; });
