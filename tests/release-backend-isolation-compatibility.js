"use strict";
// Closed, one-time equivalence proof. Does not select or deploy any function.
const assert=require("node:assert/strict"),crypto=require("node:crypto"),path=require("node:path"),vm=require("node:vm");
const acorn=require("./firestore-rules/node_modules/acorn");
const snapshots=require("../tools/release-test-function-fingerprints");
const contract=require("../.github/releases/evidence/20261101-backend-isolation-contract.json");
const matches=(base,candidate)=>base===contract.productionCommit&&candidate===contract.candidate;
function validateScope(base,candidate,rows){
 assert(matches(base,candidate),"Exact reviewed isolation pair required");
 assert(Array.isArray(rows));
 assert.deepEqual(rows.map(r=>r.name).sort(),contract.retained.map(r=>r.name).sort(),"Exact retained scope required");
 for(const row of rows){assert.deepEqual(Object.keys(row).sort(),["commit","name"]);assert.equal(row.commit,contract.retained.find(r=>r.name===row.name).commit,"Unreviewed installed origin");}
}
const normal=ast=>JSON.stringify(ast,function(k,v){return ["start","end","loc"].includes(k)||k==="raw"&&this.type==="Literal"?undefined:v;});
function logicalIndex(root,commit,source){
 const module={exports:{}};
 vm.runInNewContext(source(commit,"tests/helpers/source-files.js"),{module,exports:module.exports,__dirname:path.join(root,"tests/helpers"),require(name){
  if(name==="node:fs")return {readFileSync(file){const relative=path.relative(root,file).replaceAll("\\","/");assert(relative.startsWith("functions/")&&!relative.includes(".."));return source(commit,relative);}};
  if(name==="node:path")return path;
  assert.equal(name,"../firestore-rules/node_modules/acorn");return acorn;
 }},{timeout:3000});
 return acorn.parse(module.exports.expandedSource(path.join(root,"functions/index.js"),source(commit,"functions/index.js")),{ecmaVersion:"latest"});
}
function runtime(snapshot){return new Map([["functions/index.js",snapshot.source],...Object.entries(snapshot.files).filter(([f])=>f.endsWith(".js")).map(([f,v])=>[f,v.source])]);}
function equalOutside(before,after,allowed){
 assert.deepEqual(before.common,after.common,"Package/preparation metadata changed");
 assert.equal(before.registrySource,after.registrySource,"Registry or exclusions changed");
 assert.equal(before.productionPreparer,after.productionPreparer);
 const a=runtime(before),b=runtime(after),keys=new Set([...a.keys(),...b.keys()]);
 for(const f of keys)if(!allowed.has(f))assert.equal(a.get(f),b.get(f),"Unreviewed source outside migration: "+f);
 const json=s=>Object.fromEntries(Object.entries(s.files).filter(([f])=>!f.endsWith(".js")).map(([f,v])=>[f,v.sha]));
 assert.deepEqual(json(before),json(after),"Non-JavaScript backend changed");
}
async function prove({root,base,candidate,rows,source,loader}){
 validateScope(base,candidate,rows);
 const first=contract.firstIsolationCommit,factory=contract.factoryIsolationCommit;
 const before=snapshots.snapshot(root,base,{production:true}),initial=snapshots.snapshot(root,first,{production:true});
 const initialPaths=new Set(["functions/index.js","functions/portal-access-handlers.js","functions/portal-account-handlers.js","functions/server-access-service.js","functions/server-account-write-service.js","functions/server-directory-service.js","functions/server-directory-sync-service.js"]);
 equalOutside(before,initial,initialPaths);
 const omitted=new Set(["portalAccessHandlers","serverAccessService","serverDirectoryService","portalAccountHandlers","serverAccountWriteService","serverDirectorySyncService"]);
 const logical=[];for(const commit of [base,first]){const ast=logicalIndex(root,commit,source);ast.body=ast.body.filter(n=>!omitted.has(n.id?.name));logical.push(normal(ast));}
 assert(logical[0]===logical[1],"Initial logical declarations/options/registrations changed");
 const wiring=require("./release-architecture-retained-compatibility").verifyWiring({candidate:first,source,loader});
 assert.equal(wiring.delegates,726);assert.equal(wiring.factories,27);
 const f=require("../tools/isolate-backend-factories").render(root,first);
 const factorySnapshot=snapshots.snapshot(root,factory,{production:true}),factoryRuntime=runtime(factorySnapshot);
 equalOutside(initial,factorySnapshot,new Set(f.outputs.keys()));
 const factoryProof=require("../tools/verify-backend-factory-isolation").verify(f,new Map([...f.outputs.keys()].map(p=>[p,factoryRuntime.get(p)])));
 assert.equal(factoryProof.bodies,635);assert.equal(factoryProof.groups,419);assert.equal(factoryProof.exports,157);
 const n=require("../tools/isolate-backend-native-modules").render(root,factory),native=snapshots.snapshot(root,contract.nativeIsolationCommit,{production:true});
 equalOutside(factorySnapshot,native,new Set(n.outputs.keys()));
 const nativeProof=require("../tools/verify-backend-native-isolation").verify(n,runtime(native));
 assert.equal(nativeProof.runtimeSourceSha256,contract.runtimeSourceSha256);assert.equal(nativeProof.declarations,2902);assert.equal(nativeProof.apis,704);assert.equal(nativeProof.moves,34);
 const captured=require("../tools/isolate-backend-captured-factories").render(root,contract.nativeIsolationCommit),final=snapshots.snapshot(root,candidate,{production:true});
 equalOutside(native,final,new Set(captured.outputs.keys()));
 const finalRuntime=runtime(final),capturedProof=require("../tools/verify-backend-captured-isolation").verify(captured,new Map([...captured.outputs.keys()].map(p=>[p,finalRuntime.get(p)])));
 assert.equal(capturedProof.runtimeSourceSha256,contract.capturedSourceSha256);assert.equal(capturedProof.bodies,70);assert.equal(capturedProof.groups,14);
 return {suite:"retained-calendar-consumers-v1",productionCommit:base,candidate,result:"success",networkCalls:0,
 passedFunctions:rows.map(r=>r.name).sort(),backendIsolationProofSha256:crypto.createHash("sha256").update(require("node:fs").readFileSync(__filename)).digest("hex"),contractSha256:crypto.createHash("sha256").update(JSON.stringify(contract)).digest("hex"),
 checks:["exact-application-pair-and-installed-origins","initial-logical-index-and-actual-wiring","all-factory-bodies-and-contexts","all-native-declarations-apis-effects-caches","captured-parameters-ordered-once-and-stable-root-bindings","unchanged-packages-builders-registry-and-exclusions","transitive-equivalence-to-existing-production-protocols"],factoryProof,nativeProof,capturedProof};
}
module.exports={matches,validateScope,prove,contract};
