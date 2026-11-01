"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const {render,remapImports}=require("../tools/isolate-backend-native-modules"),{verify}=require("../tools/verify-backend-native-isolation"),{project}=require("../tools/backend-native-symbols"),{parse}=require("../tools/backend-factory-model");
const baseline="227207b5cc385a29bbabac1cc63b11f4142b1d52",root=process.cwd(),r=render(root,baseline),proof=verify(r);
const progress=JSON.parse(fs.readFileSync("docs/releases/backend-isolation-progress.json","utf8"));
assert.equal(progress.nativeReview.actualRuntimeApplied,true);
const historical=progress.nativeIsolationCommit?require("../tools/release-test-function-fingerprints").snapshot(root,progress.nativeIsolationCommit,{production:true}):null;
const actual=new Map([...r.outputs.keys()].map(file=>[file,historical?(file==="functions/index.js"?historical.source:historical.files[file]?.source):fs.readFileSync(file,"utf8")]));
assert.equal(verify(r,actual).runtimeSourceSha256,progress.nativeReview.runtimeSourceSha256,"Verify actual delivered native runtime");
assert.deepEqual(require("./helpers/backend-native-paths.json").paths,Object.fromEntries(require("../tools/isolate-backend-native-modules").plans.map(p=>[p.target,p.source])),"Logical aliases are generated from proven native moves");
assert.equal(proof.declarations,2902);assert.equal(proof.networkCalls,0);assert.equal(proof.moves,34);
function tamper(file,from,to){const outputs=new Map(r.outputs),source=outputs.get(file);assert(source.includes(from));outputs.set(file,source.replace(from,to));assert.throws(()=>verify({...r,outputs}),undefined,"Independent proof must reject renderer corruption: "+file);}
tamper("functions/nap-portal-pool.js","if (!pool)","if (false)");
tamper("functions/nap-swimmer-profile.js",'require("./nap-swimmer-identity-values")','require("./nap-swimmer-profile")');
tamper("functions/nap-connection.js","connectionLimit: 2","connectionLimit: 3");
tamper("functions/index.js","!nativeAccountEmailSynchronizer.instance","!nativeAccountEmailSynchronizer.wrongCache");
// Tagged templates preserve raw text even when their cooked strings coincide.
const one=new Map([["functions/sample.js","const value=tag`\\n`; module.exports={value};"]]),two=new Map([["functions/sample.js","const value=tag`\n`; module.exports={value};"]]);
assert.equal(parse([...one.values()][0]).body[0].declarations[0].init.quasi.quasis[0].value.cooked,parse([...two.values()][0]).body[0].declarations[0].init.quasi.quasis[0].value.cooked);
assert.notDeepEqual(project(one).catalog().declarations,project(two).catalog().declarations);
const shadowed=new Map([["functions/index.js","function run(nativeAccountEmailSynchronizer){return nativeAccountEmailSynchronizer();}"]]);
assert.deepEqual(project(shadowed).catalog(),project(shadowed,[],{getter:r.lazyRoot.getter}).catalog());
const files=new Map([["functions/old.js",""],["functions/leaf.js",""]]),destinations=new Map([["functions/old.js",new Map([["first","functions/leaf.js"]])]]);
assert.throws(()=>remapImports("functions/fixture.js",'const ns=require("./old");ns.first=()=>99;',files,destinations),/Mutable module API/);
for(const source of [
 'const ns=require("./old"); exports.run=()=>ns.first();',
 'function run(){const ns=require("./old"),value=ns.first();return value;} module.exports={run};',
 'const ns=require("./old");function run(ns){return ns.first();}exports.outer=()=>ns.first();exports.run=run;',
 'const {first: chosen,second}=require("./old");exports.run=()=>[chosen(),second()];',
 'const ns=require("./old");exports.run=key=>ns[key]();'
]){
 const result=remapImports("functions/fixture.js",source,files,destinations);parse(result);
 const first=()=>11,second=()=>22,modules={"./old":{first,second},"./leaf":{first}},load=code=>{const module={exports:{}},sandbox={module,exports:module.exports,require:name=>modules[name]};vm.runInNewContext(code,sandbox);return module.exports;};
 const a=load(source),b=load(result);assert.equal(String(a.outer?.()),String(b.outer?.()));
 const input=source.includes('run(ns)')?{first:()=>99}:"first";assert.deepEqual(JSON.parse(JSON.stringify(a.run(input))),JSON.parse(JSON.stringify(b.run(input))));
}
// Property keys in an aliased import are not newly bound variables.
{
  const original=new Map([["functions/old.js","function first(){return 11;}module.exports={first};"],["functions/check.js",'const {first:chosen}=require("./old");function run(){return chosen();}module.exports={run};']]);
  const next=new Map(original);next.set("functions/old.js",'const {first}=require("./leaf");module.exports={first};');next.set("functions/leaf.js",original.get("functions/old.js"));next.set("functions/check.js",remapImports("functions/check.js",original.get("functions/check.js"),new Map([...files,...next]),destinations));
  const before=project(original).catalog(),after=project(next,[{source:"functions/old.js",target:"functions/leaf.js",bound:["first"]}]).catalog();
  assert.equal(before.declarations.size,2);assert.deepEqual(before.declarations,after.declarations);assert.deepEqual(before.apis.get("functions/old.js"),after.apis.get("functions/old.js"));
}
// Repeated row processing must not perform fresh require calls per helper use.
{
  const code=remapImports("functions/fixture.js",'const ns=require("./old");exports.row=()=>ns.first()+ns.first();',files,destinations);
  let loads=0;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:()=>{loads++;return {first:()=>11};}});
  const initial=loads;for(let i=0;i<100;i++)assert.equal(module.exports.row(),22);assert.equal(loads,initial);
}
// Environment-derived URLs retain their original startup snapshot.
{
  let origin="https://first.invalid";const environment={livePalmesEnvironment:()=>({hostingOrigin:origin})};
  const load=(code,require)=>{const module={exports:{}};vm.runInNewContext(code,{module,require});return module.exports;};
  const before=load(r.original.get("functions/portal-access-mail.js"),name=>{assert.equal(name,"./livepalmes-environment");return environment;});
  const startup=load(r.outputs.get("functions/portal-access-origin.js"),name=>{assert.equal(name,"./livepalmes-environment");return environment;});
  origin="https://later.invalid";
  const after=load(r.outputs.get("functions/portal-access-mail.js"),name=>{assert.equal(name,"./portal-access-origin");return startup;});
  const input={firstName:"Fixture",clubName:"Fixture"};
  assert.deepEqual(JSON.parse(JSON.stringify(after.engagementExistingAccountNotice(input))),JSON.parse(JSON.stringify(before.engagementExistingAccountNotice(input))));
}
async function synchronizer(lazy,projectId){
 const context=project(lazy?r.outputs:r.original).contexts.get("functions/index.js"),node=lazy?context.ast.body.find(n=>n.id?.name===r.lazyRoot.getter):context.ast.body.find(n=>n.declarations?.[0]?.id.name==="syncNapClubAccountEmail"),source=context.source.slice(node.start,node.end);
 let constructors=0,pools=0;const trace=[],sql=[];
 const connection={beginTransaction:async()=>trace.push("begin"),execute:async({sql:query},values)=>{sql.push([query,values]);return [[]];},commit:async()=>trace.push("commit"),rollback:async()=>trace.push("rollback"),release:()=>trace.push("release")};
 const db={collection:name=>{assert.equal(name,"users");return {doc:id=>({id})};},getAll:async(...args)=>args.slice(0,-1).map(({id})=>({id,exists:false,readTime:{seconds:100,nanoseconds:0}}))};
 const actual=require("../functions/nap-club-account-emails");const sandbox={ENVIRONMENT:{projectId},db,defineSecret:name=>{assert.equal(name,"LIVEPALMES_NAP_PASSWORD");return {value:()=>"fixture"};},createNapPool:password=>{assert.equal(password,"fixture");pools++;return {getConnection:async()=>connection};},require:name=>{assert.equal(name,"./nap-club-account-emails");return {createSynchronizer:options=>{constructors++;return actual.createSynchronizer(options);}};}};
 vm.runInNewContext(source+'\nthis.obtain=()=>'+(lazy?r.lazyRoot.getter+'()':'syncNapClubAccountEmail')+';',sandbox);
 assert.equal(pools,0);assert.equal(trace.length,0);assert.equal(constructors,lazy?0:1);
 const fn=sandbox.obtain();assert.equal(sandbox.obtain(),fn);const results=[];for(const id of ["a","b","a"])results.push(await fn(id));assert.equal(constructors,1);assert.equal(pools,projectId==="livepalmes"?1:0);return {results,trace,sql,pools};
}
(async()=>{for(const environment of ["livepalmes-test","livepalmes"])assert.deepEqual(await synchronizer(false,environment),await synchronizer(true,environment));console.log("Native isolation: all declarations/APIs/cache, unsafe changes, shadowed/aliased imports and singleton TEST/PROD fixtures passed offline.");})().catch(error=>{console.error(error);process.exitCode=1;});
