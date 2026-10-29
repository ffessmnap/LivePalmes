"use strict";
// Static proof for one immutable pair; no Firebase, SQL or SMTP clients loaded.
const assert = require("node:assert/strict"), crypto = require("node:crypto"), path = require("node:path"), vm = require("node:vm");
const acorn = require("./firestore-rules/node_modules/acorn");
const shared = require("../tools/release-test-function-fingerprints");
const legacy = require("../tools/release-function-fingerprints");
const contract = require("../.github/releases/evidence/20261029-nap-account-release-contract.json");
const matches = (base,candidate) => base === contract.productionCommit && candidate === contract.candidate;
function productionSource(source,isCandidate) {
  const ast=acorn.parse(source,{ecmaVersion:"latest"}), removed=[];
  for(const node of ast.body) {
    if(node.type==="IfStatement" && source.slice(node.test.start,node.test.end)==='ENVIRONMENT.projectId === "livepalmes-test"') {
      assert.equal(node.alternate,null); removed.push(node);
    }
    if(isCandidate && node.type==="VariableDeclaration" && node.declarations[0]?.id.name==="syncNapClubAccountEmail") removed.push(node);
    if(isCandidate && node.type==="ExpressionStatement" && node.expression.left?.object?.name==="exports"
      && node.expression.left.property.name===contract.newFunction) removed.push(node);
  }
  assert.equal(removed.length,isCandidate?3:1,"Only isolated TEST branch and new trigger may be removed");
  for(const node of removed.sort((a,b)=>b.start-a.start)) source=source.slice(0,node.start)+source.slice(node.end);
  return source;
}
async function prove({root,base,candidate,rows}) {
  assert.ok(matches(base,candidate),"Exact NAP account pair required");
  assert.deepEqual(rows.map(r=>r.name).sort(),contract.retained.map(r=>r.name).sort());
  for(const row of rows) assert.equal(row.commit,contract.productionCommit);
  const snapshots=[base,candidate].map(sha=>shared.snapshot(root,sha,{production:true}));
  const production=require("../tools/release-production-function-fingerprints");
  const selected=snapshots.map(s=>production.analyse(s));
  assert.deepEqual(selected[1].eligibleNames.filter(name=>selected[0].functions[name]!==selected[1].functions[name]).sort(),
    contract.existingSelected,"Production selection must remain calculated, never manually reduced");
  const registry="tools/firebase-test-backend-lots.js:"+crypto.createHash("sha256")
    .update(legacy.retirementRegistrySignature(snapshots[0].registrySource)).digest("hex");
  const values=snapshots.map((s,i)=>legacy.fingerprints(productionSource(s.source,i===1),s.common.concat(registry).sort(),s.files));
  assert.equal(values[0].mode,"dependency-closure"); assert.equal(values[1].mode,"dependency-closure");
  for(const row of rows) assert.equal(values[0].functions[row.name],values[1].functions[row.name],"Retained dependency changed: "+row.name);
  let accesses=0;
  const sandbox={module:{exports:{}},require(){throw Error("External client forbidden");}};
  vm.runInNewContext(snapshots[1].files["functions/nap-club-account-emails.js"].source,sandbox,{timeout:3000});
  const sync=sandbox.module.exports.createSynchronizer({projectId:"livepalmes-test",
    createPool(){accesses++;throw Error("SQL forbidden");},db:{getAll(){accesses++;throw Error("Firestore forbidden");}}});
  assert.equal(accesses,0);
  assert.deepEqual(JSON.parse(JSON.stringify(await sync("fixture"))),{disabled:true,synchronized:0}); assert.equal(accesses,0);
  return {suite:"retained-calendar-consumers-v1",candidate,productionCommit:base,result:"success",networkCalls:0,
    passedFunctions:rows.map(r=>r.name).sort(),checks:["unchanged-production-consumer-closures","isolated-new-trigger","test-zero-access"]};
}
module.exports={matches,prove,productionSource};
if(require.main===module) prove({root:path.resolve(__dirname,".."),base:contract.productionCommit,candidate:contract.candidate,
  rows:contract.retained.map(r=>({name:r.name,commit:r.commit}))}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
