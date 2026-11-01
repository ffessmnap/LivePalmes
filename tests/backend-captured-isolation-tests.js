"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const migration=require("../tools/isolate-backend-captured-factories"),checks=require("../tools/verify-backend-captured-isolation");
const root=process.cwd(),baseline="468fe9163db117ebf27ba2665dfed7b0641b6623",r=migration.render(root,baseline),proof=checks.verify(r);
assert.throws(()=>migration.render(root,"0".repeat(40)));
assert.equal(proof.bodies,70);assert.equal(proof.groups,14);assert.equal(proof.factories,2);assert.equal(proof.exports,157);assert.equal(proof.stableBindings,27);
const progress=JSON.parse(fs.readFileSync("docs/releases/backend-isolation-progress.json","utf8"));
const delivered=progress.capturedIsolationCommit?require("../tools/release-test-function-fingerprints").snapshot(root,progress.capturedIsolationCommit,{production:true}):null;
const actual=new Map([...r.outputs.keys()].map(f=>[f,delivered?(f==="functions/index.js"?delivered.source:delivered.files[f]?.source):fs.readFileSync(f,"utf8")]));
assert.equal(checks.verify(r,actual).runtimeSourceSha256,proof.runtimeSourceSha256);
const deliveredInput={...r.input,source:actual.get("functions/index.js"),files:{...r.input.files,...Object.fromEntries([...actual].filter(([f])=>f!=="functions/index.js").map(([f,source])=>[f,{source}]))}};
const complete=require("../tools/backend-factory-model").model(root,deliveredInput);assert.equal(complete.factories.size,438);assert.equal(complete.exports.size,157);assert.equal(complete.warnings.length,0);
for(const f of complete.factories.values())assert.equal(new Set([...f.methods.keys()].map(n=>complete.consumers.get(f.accessor+":"+n).join("|"))).size,1,"No remaining artificial multi-consumer factory: "+f.accessor);
for(const c of r.captures){
 const outputs=new Map(r.outputs),text=outputs.get(c.file);outputs.set(c.file,text.replace('const backendContext = {','let backendContext = {'));assert.throws(()=>checks.verify({...r,outputs}));
 const output=new Map(r.outputs),group=r.rendered.groups.find(g=>g.owner===c.owner),s=output.get(group.file);output.set(group.file,s.replace(/return /,'throw new Error("changed"); return '));assert.throws(()=>checks.verify({...r,outputs:output}));
 const source=r.prepared.files[c.file].source,broken={...r,prepared:{...r.prepared,files:{...r.prepared.files,[c.file]:{source:source.replace('(0, backendContext.cleanText)(', 'backendContext.cleanText(')}}}};assert.throws(()=>checks.verify(broken));
}
const alias={factory:"create",parameter:"{cleanText:alias}",keys:[["alias","cleanText"]]};
assert.deepEqual(checks.captureCatalog('function create({cleanText:alias}){function out(){return {alias};}return {out};} module.exports={create};',alias,false),checks.captureCatalog('function create(backendContext){function out(){return {alias:backendContext.cleanText};}return {out};} module.exports={create};',alias,true));
assert.throws(()=>checks.captureCatalog('function create(backendContext){function out(){return this.value;}return {out};} module.exports={create};',alias,true));
const unsafeInput={...r.input,source:r.input.source+'\ncleanText = () => "changed";\n'};
assert.throws(()=>checks.verify({...migration.prepare(root,baseline,unsafeInput),outputs:r.outputs,rendered:r.rendered}));
// Actual compatibility APIs must read accessor properties once, at creation,
// retaining the captured object/function after the caller changes its object.
const historicalCache=new Map();
function historical(file){if(historicalCache.has(file))return historicalCache.get(file).exports;assert(file.startsWith("functions/")&&!file.includes(".."));const text=delivered.files[file]?.source;assert.equal(typeof text,"string");const module={exports:{}};historicalCache.set(file,module);vm.runInNewContext(text,{module,exports:module.exports,require(name){assert(name.startsWith("."),"Historical compatibility fixture forbids services");let target=require("node:path").posix.normalize(require("node:path").posix.join(require("node:path").posix.dirname(file),name));if(!target.endsWith(".js"))target+=".js";return historical(target);}});return module.exports;}
function old(c){const module={exports:{}};vm.runInNewContext(c.original,{module,exports:module.exports});return module.exports[c.factory];}
for(const c of r.captures){
 const create=(delivered?historical(c.file):require('../'+c.file))[c.factory],before=old(c),traces=[];
 for(const factory of [before,create]){
  let reads=0,changed=false;const input={};for(const[alias,key]of c.keys)Object.defineProperty(input,key,{get(){reads++;if(key==='cleanIsoDate')return changed?()=>"1999-01-01":()=>"2026-11-01";if(key==='cleanText')return value=>String(value||"");if(key==='PUBLIC_PERFORMANCE_FILES_PATH')return changed?'wrong':'public-fixture';if(key==='publicPerformanceFilesBucket')return ()=>({file:relative=>({relative})});return ()=>undefined;}});
  const api=factory(input);assert.equal(reads,c.keys.length);changed=true;
  const result=c.owner==='engagementPdfRenderer'?[api.engagementPdfFormatDate('input'),api.engagementPdfFormatDate('input')]:[api.publicPerformanceFilePath('x'),api.publicPerformanceFile('y').relative];
  assert.equal(reads,c.keys.length,"No captured getter is read during method calls");assert.equal(typeof api[Object.keys(api)[0]],'function');traces.push(JSON.parse(JSON.stringify(result)));
 }
 assert.deepEqual(traces[0],traces[1]);
}
console.log("Captured isolation: 70 unchanged bodies, 14 groups, 27 stable bindings, original ordered getter snapshots and unsafe-change refusals passed offline.");
