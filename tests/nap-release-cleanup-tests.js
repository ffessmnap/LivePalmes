"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const path = require("node:path");
const vm = require("node:vm");
const acorn = require("./firestore-rules/node_modules/acorn");
const registry = require("../tools/firebase-test-backend-lots");
const { NAP_RETIRED_FUNCTIONS, NAP_UNUSED_FUNCTIONS, activeLotFunctions, LOTS, ALL_SAFE_LOTS, PUBLICATION_EFFECT_FUNCTIONS } = registry;
const source = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
const ast = acorn.parse(source, {ecmaVersion:"latest"});
const handlers = new Map(ast.body.filter(n => n.type === "ExpressionStatement" && n.expression.type === "AssignmentExpression" && n.expression.left.object?.name === "exports").map(n => [n.expression.left.property.name, n.expression.right.arguments.at(-1)]));
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
(async () => {
  assert.equal(NAP_RETIRED_FUNCTIONS.length, 41);
  assert.equal(new Set(NAP_RETIRED_FUNCTIONS).size, 41);
  const retired = new Set([...NAP_RETIRED_FUNCTIONS, ...NAP_UNUSED_FUNCTIONS]);
  assert.deepEqual([...NAP_UNUSED_FUNCTIONS].sort(), ["getEngagementNationalAdministrationOverview", "listEngagementCompetitionDeletionRequests", "listEngagementNationalClubSwimmers", "syncPublicRecordsData"]);
  for (const lot of Object.keys(LOTS)) {
    assert.deepEqual(activeLotFunctions(lot), LOTS[lot].filter(n => !retired.has(n)));
  }
  assert.throws(() => activeLotFunctions("unknown"));
  const active = ALL_SAFE_LOTS.flatMap(activeLotFunctions);
  for (const name of ["getCurrentAccessUser","syncOfficialResultToPublicIndex","storeCompetitionPdf","savePerformanceCorrection","createCompetitionImport","getDtnSeasonOverview"]) assert.ok(active.includes(name), name);
  assert.ok(!active.includes("syncPublicRecordsData"));
  assert.ok(!handlers.has("syncPublicRecordsData"), "Le déclencheur Records historique doit rester absent");
  assert.ok(LOTS.publications.includes("syncPublicRecordsData"));
  assert.ok(PUBLICATION_EFFECT_FUNCTIONS.includes("syncPublicRecordsData"));
  const removedRecordsBindings = new Set(["syncPublicRecordsData", "publishPublicRecordsSnapshot",
    "publishPublicRecordsManifest", "publicRecordsPayload", "publicRecordsManifest", "shouldPublishRecordsManifest"]);
  function checkRecordsRemoval(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Identifier") assert.ok(!removedRecordsBindings.has(node.name), "Records binding retained: " + node.name);
    if (node.type === "CallExpression" && node.callee.name === "require")
      assert.notEqual(node.arguments[0]?.value, "./public-records-data", "Import Records inutilisé conservé dans index.js");
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(checkRecordsRemoval);
      else if (value && typeof value === "object") checkRecordsRemoval(value);
    }
  }
  checkRecordsRemoval(ast);
  // The shared projection/hash module is still needed by the native NAP store.
  const recordsData = require("../functions/public-records-data");
  for (const name of ["publicRecordsPayload", "stableStringify"]) assert.equal(typeof recordsData[name], "function");
  const recordsStore = fs.readFileSync(path.join(__dirname, "../functions/nap-records-store.js"), "utf8");
  assert.match(recordsStore, /require\(["']\.\/public-records-data["']\)/);

  // Run the real classifier against in-memory fixtures, never the backend.
  const checker = fs.readFileSync(path.join(__dirname, "../tools/check-firebase-test-backend-lots.js"), "utf8");
  function checkLots(backend = source, changes = {}) {
    const fixture = {...registry, LOTS: Object.fromEntries(Object.entries(LOTS).map(([lot, names]) => [lot, [...names]])), ...changes};
    const fixtureRequire = name => {
      if (name === "node:assert/strict") return assert;
      if (name === "node:path") return path;
      if (name === "node:fs") return {readFileSync: filename => {
        assert.equal(filename, path.join(__dirname, "../functions/index.js"));
        return backend;
      }};
      if (name === "./firebase-test-backend-lots") return fixture;
      throw new Error("Unexpected checker import: " + name);
    };
    new Function("require", "__dirname", "console", checker)(fixtureRequire, path.join(__dirname, "../tools"), {log: () => {}});
  }
  checkLots();
  assert.ok(source.includes("exports.getCurrentAccessUser ="));
  assert.ok(source.includes("exports.getEngagementNationalAdministrationOverview ="));
  assert.throws(() => checkLots(source.replace("exports.getCurrentAccessUser =", "missing.getCurrentAccessUser =")), /Chaque export/);
  assert.throws(() => checkLots(source + "\nexports.unclassified=onCall({},()=>{});"), /Chaque export/);
  assert.throws(() => checkLots(source + "\nexports.getCurrentAccessUser=onCall({},()=>{});"), /déclaré plusieurs fois/);
  assert.throws(() => checkLots(source, {NAP_UNUSED_FUNCTIONS: NAP_UNUSED_FUNCTIONS.filter(name => name !== "syncPublicRecordsData")}), /Chaque export/);
  assert.throws(() => checkLots(source.replace("exports.getEngagementNationalAdministrationOverview =", "missing.getEngagementNationalAdministrationOverview =")), /Chaque export/);
  const removedCalendar = new Set(["rebuildEngagementCompetitionCalendars", "syncEngagementCompetitionToCalendar", "syncEngagementCalendarEventToCalendar"]);
  for (const name of NAP_RETIRED_FUNCTIONS) {
    assert.ok(Object.values(LOTS).flat().includes(name), "Compatibility registration retained: " + name);
    const node = handlers.get(name);
    if (removedCalendar.has(name)) {
      assert.equal(node, undefined, "Calendar declaration must remain absent: " + name);
      assert.ok(!active.includes(name));
      continue;
    }
    assert.ok(node, name);
    const sandbox = { ENVIRONMENT:{sportingDataSource:"nap"}, HttpsError, Date,
      assertCapability:()=>{}, engagementAccessContext:async()=>({national:true}),
      engagementClubAccessContext:async()=>({national:true,clubId:"1"}),
      retiredQualificationRequest:()=>{throw new HttpsError("failed-precondition","retired");} };
    const handler = vm.runInNewContext("(" + source.slice(node.start,node.end) + ")", sandbox);
    if (name === "preloadEngagementClubWorkspaces") {
      const result=await handler({data:{}});
      assert.equal(result.source,"nap");assert.equal(result.workspaces.length,0);
    } else if (/^sync|^revalidate|^buildDtn|^publishPerformanceCorrection|^resumePerformancePublication/.test(name)) {
      assert.ok(await handler({data:{}}) == null, name);
    } else {
      await assert.rejects(async () => handler({data:{}}), e => e.code === "failed-precondition", name);
    }
  }
  // Native operation must never construct the old sporting Firestore service.
  const factory = ast.body.find(n => n.type === "FunctionDeclaration" && n.id.name === "qualificationService");
  assert.ok(factory);
  let creations=0;
  const marker={evaluate:()=>17};
  const sandbox={createQualificationService:options=>{creations++;assert.equal(options.clubAccess,"clubAccess");return marker;}};
  for(const name of ["db","HttpsError","ageCategoryFromDates","qualificationEvents","getEngagementQualificationRows","engagementEntryTimeCacheId","automaticEngagementIndividualEntry","engagementAccessContext","engagementClubAccessContext","engagementClubEntryId","assertEngagementClubWriteOpen","writeAuditLog"]) sandbox[name]=name==="engagementClubAccessContext"?"clubAccess":name;
  vm.runInNewContext("let legacyQualificationService;\n"+source.slice(factory.start,factory.end)+"\nthis.service=qualificationService;",sandbox);
  assert.equal(creations,0);
  assert.equal(sandbox.service(),marker);assert.equal(sandbox.service(),marker);assert.equal(creations,1);
  // The obsolete request screen must not call a refused endpoint on NAP.
  const portal=fs.readFileSync(path.join(__dirname,"../assets/livepalmes-admin-portal.js"),"utf8");
  const portalAst=acorn.parse(portal,{ecmaVersion:"latest"});
  let loader;
  function walk(node){if(!node || typeof node!=="object")return;if(node.type==="FunctionDeclaration"&&node.id.name==="loadEngagementDeletionRequests")loader=node;for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==="object")walk(value);}}
  walk(portalAst);assert.ok(loader);
  let calls=0,renders=0,badge;
  const ui={global:{LivePalmesEnvironment:{sportingDataSource:"nap"}},callFunction:()=>{calls++;throw Error("Legacy endpoint called");},updateEngagementDeletionRequestBadge:n=>{badge=n;},renderEngagementDeletionRequests:()=>{renders++;}};
  vm.runInNewContext("let engagementDeletionRequests,engagementDeletionRequestsLoaded;\n"+portal.slice(loader.start,loader.end)+"\nthis.load=loadEngagementDeletionRequests;",ui);
  await ui.load({force:true});assert.equal(calls,0);assert.equal(renders,1);assert.equal(badge,0);
  console.log("NAP release cleanup: calendar and Records declarations absent, shared NAP module retained, classifier guards, 38 inert handlers and native UI verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
