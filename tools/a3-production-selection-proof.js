"use strict";
// Candidate-specific static evidence. No application module is executed.
const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path");
const legacy=require("./release-function-fingerprints");
const shared=require("./release-test-function-fingerprints");
const optimized=require("./release-production-function-fingerprints");
const hash=v=>crypto.createHash("sha256").update(v).digest("hex");
const canonical=v=>JSON.stringify(v,Object.keys(v).sort());
const requireTrue=(v,m)=>{if(!v)throw Error(m)};
function analyse(snapshot,files=snapshot.files,options={}) {
  const common=snapshot.common.concat("tools/firebase-test-backend-lots.js:"+hash(legacy.retirementRegistrySignature(snapshot.registrySource))).sort();
  return legacy.fingerprints(snapshot.source,common,files,options);
}
function qualify(candidate,baseline,origins,catalogue,productionCommit) {
  const before=analyse(baseline),raw=analyse(candidate),fast=optimized.analyse(candidate);
  requireTrue(canonical(before.functions)===canonical(catalogue.commits[productionCommit]?.legacy||{}),"Baseline does not reproduce sealed historical hashes");
  requireTrue(raw.mode==="dependency-closure"&&before.mode==="dependency-closure"&&fast.mode==="dependency-closure","Non-isolable backend");
  const name="functions/portal-access-protection.js";
  requireTrue(candidate.files[name]&&baseline.files[name],"Protection module absent");
  const strict=legacy.moduleGraph(candidate.files).inspect(name);
  const numeric=legacy.moduleGraph(candidate.files,{testNumericConstants:true}).inspect(name);
  requireTrue(!strict.pure&&numeric.pure&&JSON.stringify(numeric.files)==JSON.stringify([name])&&!numeric.externals.length,"Unqualified module initializer or dependency");
  // Counterfactual is confined to an in-memory copy. Its legacy hashes still
  // include the real source of every other module and registration.
  const restored=analyse(candidate,{...candidate.files,[name]:baseline.files[name]});
  const scoped=analyse(candidate,candidate.files,{testNumericConstants:true});
  const consumers=Object.entries(scoped.dependencies).filter(([,deps])=>deps.includes("nextPortalAccessRateLimit")).map(([n])=>n).sort();
  const names=new Set();
  function changed(algorithm,actual) {
    return origins.filter(row=>{
      const n=row.name.split("/").at(-1),old=catalogue.commits[row.commit]?.[algorithm]?.[n];
      requireTrue(old&&actual[n],"Unknown historical function provenance");
      return actual[n]!==old;
    }).map(row=>row.name.split("/").at(-1)).sort();
  }
  for(const row of origins){requireTrue(!names.has(row.name),"Duplicate origin");names.add(row.name);}
  const actual=changed("production-selection",fast.functions),counterfactual=changed("legacy",restored.functions);
  requireTrue(JSON.stringify(actual)===JSON.stringify(counterfactual),"Independent exclusion proof disagrees with optimized selection");
  requireTrue(consumers.length>0&&consumers.every(n=>actual.includes(n)),"Protection binding reaches a retained function");
  return {schema:1,kind:"a3-static-exclusion-v1",baselineReproducesSealedLegacy:true,
    inventoryCount:origins.length,rawLegacyChanged:changed("legacy",raw.functions),selected:actual,
    counterfactualSelected:counterfactual,protectionConsumers:consumers,
    rawLegacySha256:hash(canonical(raw.functions)),optimizedSha256:hash(canonical(fast.functions)),
    counterfactualSha256:hash(canonical(restored.functions)),
    protectionBlobs:[baseline.files[name].sha,candidate.files[name].sha]};
}
module.exports={qualify,analyse};
if(require.main===module){
  const [root,candidate,baseline,production]=process.argv.slice(2);
  requireTrue([candidate,baseline,production].every(s=>/^[a-f0-9]{40}$/.test(s||"")),"Exact source references required");
  const origins=JSON.parse(fs.readFileSync(0,"utf8"));
  const catalogue=JSON.parse(fs.readFileSync(path.join(root,"tools/history-source-provenance.json"),"utf8"));
  console.log(JSON.stringify(qualify(shared.snapshot(root,candidate,{production:true}),shared.snapshot(root,baseline,{production:true}),origins,catalogue,production)));
}
