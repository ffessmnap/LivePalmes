"use strict";
// Read-only deployment-graph audit; generated data never selects a deployment.
const fs=require("node:fs"),path=require("node:path");
const {render}=require("./isolate-backend-native-modules"),{parse}=require("./backend-factory-model");
const BASELINE="227207b5cc385a29bbabac1cc63b11f4142b1d52";
function inventory(root,probeDirectory){
 const result=render(root,BASELINE),load=prefix=>Array.from({length:4},(_,i)=>JSON.parse(fs.readFileSync(path.join(probeDirectory,prefix+i+".json"),"utf8")).results).flat();
 const before=new Map(load("livepalmes-corrected-native-").map(r=>[r.environment+":"+r.file,r]));
 const after=load("livepalmes-final-native-"),keys=new Map(after.map(r=>[r.environment+":"+r.file,r]));
 const infrastructure={"functions/livepalmes-environment.js":"Shared deployment environment and configuration: keep all consumers.","functions/portal-access-origin.js":"Original startup URL snapshot preserved; shared environment initialization stays conservative.","functions/nap-connection.js":"Existing MySQL connection builder/options and driver; keep all real pool consumers.","functions/nap-portal-pool.js":"One existing portal pool per process; do not duplicate connection state."};
 const modules=[...new Set(after.map(r=>r.file))].sort().map(file=>{
  const source=result.outputs.get(file);if(!source)throw Error("Probe source outside final plan: "+file);
  const ast=parse(source),api=ast.body.find(n=>n.expression?.left?.object?.name==="module"&&n.expression.left.property?.name==="exports")?.expression.right;
  const exports=api?.type==="ObjectExpression"?api.properties.map(p=>p.key?.name||p.key?.value).filter(Boolean):[];
  const state=ast.body.filter(n=>n.type==="VariableDeclaration"&&n.kind!=="const").flatMap(n=>n.declarations.map(d=>d.id.name||d.id.type));
  const test=keys.get("TEST:"+file),prod=keys.get("PROD:"+file);if(!test||!prod||test.mode!=="dependency-closure"||prod.mode!=="dependency-closure")throw Error("Complete conservative selector probes required");
  const moved=result.moves.find(m=>m.target===file),sourceMoves=result.moves.filter(m=>m.source===file);
  let decision,reason;
  if(infrastructure[file]){decision="retain-shared-infrastructure";reason=infrastructure[file];}
  else if(moved){decision="isolated-component";reason="Original unique bodies/state moved from "+moved.source+"; API and lexical identities independently proven.";}
  else if(!test.allConsumers.length){decision="retain-compatibility-or-operational-source";reason="No current Firebase consumer in the computed graph; retained for existing tests/tools/compatibility, never inferred safe to delete.";}
  else{decision="retain-cohesive-domain-or-atomic-protocol";reason="Existing domain behavior, state, access/data contract or atomic operation retained; all real computed consumers stay selected.";}
  return {file,exports,mutableTopLevelBindings:state,decision,reason,...(sourceMoves.length?{canonicalComponents:sourceMoves.map(m=>m.target)}:{}),before:Object.fromEntries(["TEST","PROD"].map(environment=>{const p=before.get(environment+":"+file);return[environment,p?{all:p.allConsumers.length,ordinary:p.ordinaryConsumers.length}:null]})),after:{TEST:{all:test.allConsumers.length,ordinary:test.ordinaryConsumers.length},PROD:{all:prod.allConsumers.length,ordinary:prod.ordinaryConsumers.length}},consumers:test.allConsumers};
 });
 return {schema:1,generatedBy:"tools/backend-native-inventory.js",baseline:BASELINE,runtimeSourceSha256:require("../docs/releases/backend-isolation-progress.json").nativeReview.runtimeSourceSha256,diagnosticOnly:true,notDeploymentSelection:true,networkCalls:0,scope:"All native modules, separately from private operation factories; original factory graph and four captured APIs remain covered by their own proof",modules};
}
module.exports={inventory};
if(require.main===module){const root=path.resolve(__dirname,".."),value=inventory(root,process.argv[2]);fs.writeFileSync(path.join(root,"docs/releases/backend-native-inventory.json"),JSON.stringify(value,null,2)+"\n");console.log(JSON.stringify({modules:value.modules.length,modes:"dependency-closure",networkCalls:0}));}
