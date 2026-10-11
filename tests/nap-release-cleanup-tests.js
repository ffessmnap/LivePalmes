"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const acorn = require("./firestore-rules/node_modules/acorn");
const { NAP_RETIRED_FUNCTIONS, activeLotFunctions, LOTS, ALL_SAFE_LOTS } = require("../tools/firebase-test-backend-lots");
const source = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
const ast = acorn.parse(source, {ecmaVersion:"latest"});
const handlers = new Map(ast.body.filter(n => n.type === "ExpressionStatement" && n.expression.type === "AssignmentExpression" && n.expression.left.object?.name === "exports").map(n => [n.expression.left.property.name, n.expression.right.arguments.at(-1)]));
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
(async () => {
  assert.equal(NAP_RETIRED_FUNCTIONS.length, 41);
  assert.equal(new Set(NAP_RETIRED_FUNCTIONS).size, 41);
  const retired = new Set(NAP_RETIRED_FUNCTIONS);
  for (const lot of Object.keys(LOTS)) {
    assert.deepEqual(activeLotFunctions(lot), LOTS[lot].filter(n => !retired.has(n)));
  }
  assert.throws(() => activeLotFunctions("unknown"));
  const active = ALL_SAFE_LOTS.flatMap(activeLotFunctions);
  for (const name of ["getCurrentAccessUser","syncPublicRecordsData","syncOfficialResultToPublicIndex","storeCompetitionPdf","savePerformanceCorrection","createCompetitionImport","getDtnSeasonOverview"]) assert.ok(active.includes(name), name);
  for (const name of NAP_RETIRED_FUNCTIONS) {
    assert.ok(Object.values(LOTS).flat().includes(name), "Compatibility registration retained: " + name);
    const node = handlers.get(name);
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
  console.log("NAP release cleanup: 41 retired handlers inert, active services retained, lazy compatibility service and native UI zero-call path verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
