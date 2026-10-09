"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { person, searchPortalSwimmers, listPortalClubSwimmers, correctPortalIdentity } = require("../functions/nap-portal-swimmers");
const { fingerprint } = require("../functions/nap-portal-swimmer-change");
const original = { id: 42, nom: "EXEMPLE", prenom: "Test", date: "2000-01-01", sexe: "F", club: "106", actif: 0, wc: null, edf: 0, creation: "2001-01-01 00:00:00", number: "private" };
function fixture(options = {}) {
  let row = { ...original }, saved, completed, writes = 0, dependentCalls = 0;
  const connection = { execute: async (query, values) => {
    if (query.sql.includes("FORCE INDEX")) return [options.duplicate ? [{ id: 43 }] : []];
    if (query.sql.startsWith("SELECT")) return [[{ ...row }]];
    assert.ok(saved);
    assert.ok(query.sql.startsWith("UPDATE nageurs SET `nom`=? WHERE "));
    assert.equal(values[0], "CORRIGE");
    assert.ok(!query.sql.includes("SET `club`"));
    writes++;
    if (options.race) return [{ affectedRows: 0 }];
    row.nom = values[0]; return [{ affectedRows: 1 }];
  } };
  const audit = { read: async () => saved, prepare: async (operation, target) => { if (options.backupFailure) throw new Error("backup unavailable"); saved = structuredClone(target); }, complete: async (operation, target) => { completed = target; } };
  const linked = { prepare: async () => { if (options.linkedFailure) throw new RangeError("too many entries"); return []; }, apply: async () => { dependentCalls++; if (options.applyFailure && dependentCalls === 1) throw new Error("dependent update failed"); return { entryUpdateCount: 0 }; } };
  const input = { id: 42, expectedFingerprint: fingerprint(original), actorUid: "national-test", reason: "Correction autorisee par le formulaire", proposed: { lastName: "CORRIGE" } };
  return { run: extra => correctPortalIdentity(connection, { ...input, ...extra }, audit, linked), writes: () => writes, row: () => row, completed: () => completed };
}
(async () => {
  assert.equal(person(original).napFingerprint, fingerprint(original));
  assert.ok(!("number" in person(original)));
  for (const [number, expected] of [["A-11-526612", "A-11-526612"], ["001234", "001234"], [null, ""], [undefined, ""], ["", ""], ["   ", ""]]) assert.equal(person({...original, number}).licenseNumber, expected);
  assert.ok(!("wc" in person(original)));
  const f = fixture(); await f.run(); assert.equal(f.writes(), 1); assert.deepEqual(f.row(), { ...original, nom: "CORRIGE" }); assert.equal(f.completed().verified, true);
  assert.equal((await f.run()).alreadyApplied, true); assert.equal(f.writes(), 1);
  for (const options of [{ duplicate: true }, { backupFailure: true }, { linkedFailure: true }]) {
    const refused = fixture(options); await assert.rejects(refused.run()); assert.equal(refused.writes(), 0);
  }
  for (const input of [{ expectedFingerprint: "wrong" }, { proposed: { club: "123" } }, { proposed: { licenseNumber: "A-00-123" } }, { reason: "" }, { actorUid: "" }]) {
    const refused = fixture(); await assert.rejects(refused.run(input)); assert.equal(refused.writes(), 0);
  }
  const stale = fixture(); stale.row().prenom = "Autre"; await assert.rejects(stale.run(), /change/); assert.equal(stale.writes(), 0);
  const race = fixture({ race: true }); await assert.rejects(race.run(), /change/);
  const retry = fixture({ applyFailure: true }); await assert.rejects(retry.run()); assert.equal(retry.writes(), 1); await retry.run(); assert.equal(retry.writes(), 1);
  const calls = [];
  const found = await searchPortalSwimmers({ execute: async (query, parameters) => { calls.push({ query, parameters }); assert.ok(query.sql.startsWith("SELECT ")); return [[original]]; } }, "42");
  assert.equal(calls.length, 2); assert.equal(found.swimmers[0].id, "42"); assert.ok(calls[1].query.sql.includes("LIMIT 20")); assert.deepEqual(calls[1].parameters, [42]);
  const source = fs.readFileSync("functions/index.js", "utf8");
  const update = source.slice(source.indexOf("exports.updateEngagementNationalSwimmerIdentity ="), source.indexOf("exports.setEngagementNationalClubSwimmerStatus ="));
  assert.ok(update.indexOf('if (!context.national)') < update.indexOf("nap.correctPortalIdentity"));
  assert.ok(!update.includes('collection("engagementClubEntries")'));
  assert.ok(!update.includes("db.runTransaction"));
  assert.ok(update.includes("oldLivepalmesLinksIgnored: true"));
  let nativeCalls=0,auditWrites=0;
  class NativeError extends Error {constructor(code,message){super(message);this.code=code;}}
  const nativeSandbox={exports:{},onCall:(_,callback)=>callback,ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS:{},ENVIRONMENT:{projectId:"livepalmes-test"},defineSecret:value=>value,TypeError,RangeError,HttpsError:NativeError,process:{env:{}},cleanText:value=>String(value || ""),
    engagementAccessContext:async()=>({national:true,uid:"trusted-national"}),
    db:{collection:name=>{assert.equal(name,"auditLogs","old sports database must never be read or written");return {doc:()=>({get:async()=>({exists:false}),create:async()=>auditWrites++})};}},
    writeAuditLogOnce:async(_,uid)=>{assert.equal(uid,"trusted-national");auditWrites++;},
    require:name=>{assert.equal(name,"./nap-portal-swimmers");return {portalPool:()=>"native-pool",correctPortalIdentity:async(pool,input,audit,linked)=>{
      nativeCalls++;assert.equal(pool,"native-pool");assert.equal(input.actorUid,"trusted-national");
      assert.deepEqual(Array.from(await linked.prepare({clubId:"106"},{})),[]);
      const result=await linked.apply([{id:"obsolete-entry",beforeSwimmers:[{id:"old"}]}]);assert.equal(result.oldLivepalmesLinksIgnored,true);assert.equal(result.entryUpdateCount,0);
      await audit.prepare("operation",{});await audit.complete("operation",{});return {ok:true,source:"nap"};
    }};}};
  vm.runInNewContext(update,nativeSandbox);
  await assert.rejects(nativeSandbox.exports.updateEngagementNationalSwimmerIdentity({data:{source:"engagement",proposed:{}}}),error=>error.code==="failed-precondition");assert.equal(nativeCalls,0);
  await nativeSandbox.exports.updateEngagementNationalSwimmerIdentity({data:{napSource:true,swimmerId:"42",actorUid:"spoof",proposed:{lastName:"CORRIGE"},reason:"Correction"}});assert.equal(nativeCalls,1);assert.equal(auditWrites,2);
  assert.ok(update.includes('ENVIRONMENT.projectId === "livepalmes-test"'));
  const browser = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8");
  assert.ok(browser.includes("global.LivePalmesEnvironment.isTest ? Promise.resolve([]) : searchEngagementAdminPublicSwimmers"));
  assert.ok(browser.includes('expectedFingerprint: elements.engagementsSwimmerCorrectionForm?.dataset.expectedFingerprint'));
  assert.ok(source.includes("licenseNumber: next.licenseNumber ?? item.licenseNumber"));
  const accessCode = source.slice(source.indexOf("async function engagementAccessContext("), source.indexOf("async function accessManagementContext("));
  const searchCode = source.slice(source.indexOf("exports.searchEngagementNationalSwimmers ="), source.indexOf("function engagementLicenseControlSeason("));
  class AccessError extends Error { constructor(code, message) { super(message); this.code = code; } }
  for (const scenario of [
    { auth: undefined, expected: "unauthenticated" },
    { auth: { uid: "regional" }, status: "active", capabilities: { "engagements.region.manage": true }, expected: "permission-denied" },
    { auth: { uid: "disabled" }, status: "inactive", capabilities: { "engagements.national.manage": true }, expected: "permission-denied" }
  ]) {
    let napCalls = 0;
    const sandbox = { exports: {}, onCall: (options, callback) => callback, CALLABLE_OPTIONS: {}, ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS: {}, ENVIRONMENT: { projectId: "livepalmes-test" }, defineSecret: value => value,
      ADMIN_UIDS: new Set(), FUNCTIONS_EMULATOR_ACTIVE: false, HttpsError: AccessError, cleanText: value => String(value || ""), normalizedAccessScope: () => ({}), competitionEmailNotificationsEnabled: () => true,
      db: { collection: name => { assert.equal(name, "users"); return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ status: scenario.status, capabilities: scenario.capabilities }) }) }) }; } },
      require: () => { napCalls++; throw new Error("NAP must not be accessed"); } };
    vm.runInNewContext(accessCode + searchCode + update, sandbox);
    for (const handler of [sandbox.exports.searchEngagementNationalSwimmers, sandbox.exports.updateEngagementNationalSwimmerIdentity]) {
      await assert.rejects(handler({ auth: scenario.auth, data: { query: "42", napSource: true } }), error => error.code === scenario.expected);
    }
    assert.equal(napCalls, 0);
  }
  let clubQueries = 0;
  const clubConnection = { execute: async (query, values) => {
    clubQueries++;
    assert.ok(query.sql.includes("FORCE INDEX (livepalmes_club_id)"));
    assert.ok(query.sql.includes("WHERE n.club=? ORDER BY n.id LIMIT 801"));
    assert.deepEqual(values, ["106"]);
    return [[original]];
  } };
  const clubPeople = await listPortalClubSwimmers(clubConnection, "106");
  assert.equal(clubQueries, 1);
  assert.equal(clubPeople[0].id, "42");
  assert.equal(clubPeople[0].napSource, true);
  await assert.rejects(listPortalClubSwimmers(clubConnection, "invalid"), TypeError);
  assert.equal(clubQueries, 1);
  await assert.rejects(listPortalClubSwimmers({ execute: async () => [Array(801).fill(original)] }, "106"), RangeError);
  assert.ok(!update.includes("Un engagement ancien doit"));
  console.log("Portail NAP : lecture bornee, correction unique, sauvegarde, doublons, concurrence, reprise et droits verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
