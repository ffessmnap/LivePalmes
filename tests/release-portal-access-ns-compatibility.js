"use strict";
// Exact immutable pair; only fixture SELECTs and in-memory mail/job adapters.
const assert=require("node:assert/strict"),path=require("node:path"),vm=require("node:vm");
const acorn=require("./firestore-rules/node_modules/acorn");
const {references}=require("./helpers/lexical-references");
const c=require("../.github/releases/evidence/20261030-portal-access-ns-contract.json");
const parse=text=>acorn.parse(text,{ecmaVersion:"latest"});
const normal=node=>JSON.stringify(node,function(key,value){return ["start","end","loc"].includes(key)||(key==="raw"&&this.type==="Literal")?undefined:value;});
const same=(a,b,label)=>assert.equal(normal(parse(a)),normal(parse(b)),label);
const matches=(base,candidate)=>base===c.productionCommit&&candidate===c.candidate;
function expandedDefinitions(root,source,commit){
  const module={exports:{}};
  vm.runInNewContext(source(commit,"tests/helpers/source-files.js"),{module,exports:module.exports,__dirname:path.join(root,"tests/helpers"),require(name){
    if(name==="node:fs")return {readFileSync(file){const relative=path.relative(root,file).replaceAll("\\","/");assert.ok(relative.startsWith("functions/")&&!relative.includes(".."));return source(commit,relative);}};
    if(name==="node:path")return path;
    assert.equal(name,"../firestore-rules/node_modules/acorn");return acorn;
  }},{timeout:3000});
  const code=module.exports.expandedSource(path.join(root,"functions/index.js"),source(commit,"functions/index.js")),defs=new Map();
  function visit(node){
    if(!node||typeof node!=="object")return;
    if(node.type==="FunctionDeclaration")defs.set(node.id.name,code.slice(node.start,node.end));
    if(node.type==="AssignmentExpression"&&node.left.object?.name==="exports")defs.set(node.left.property.name,code.slice(node.start,node.end)+";");
    for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==="object")visit(value);
  }
  visit(parse(code));return defs;
}
async function prove({root,base,candidate,rows,source,loader,consumerFixtures}){
  assert.ok(matches(base,candidate),"Exact portal NS/access pair required");
  assert.deepEqual(rows.map(r=>r.name).sort(),c.retained.map(r=>r.name).sort());
  for(const row of rows){assert.deepEqual(Object.keys(row).sort(),["commit","name"]);assert.equal(row.commit,c.retained.find(r=>r.name===row.name).commit);}
  const cache=new Map(),definitions=commit=>{if(!cache.has(commit))cache.set(commit,expandedDefinitions(root,source,commit));return cache.get(commit);};
  for(const row of rows)same(definitions(row.commit).get(row.name),definitions(candidate).get(row.name),"Retained registration or handler changed: "+row.name);
  for(const origin of new Set(rows.map(r=>r.commit)))for(const file of [
    "server-mail-service.js","nap-mysql.js","nap-notification-automation.js",
    "nap-notification-pages.js","nap-notification-preview.js","engagement-mail-control.js",
    "engagement-competition-mail-format.js","nap-club-access-request.js","nap-swimmer-change-requests.js",
    "nap-notification-task.js"]){
    assert.equal(source(origin,"functions/"+file),source(candidate,"functions/"+file),"Retained mail/projection protocol changed: "+file);
  }
  assert.equal(source(c.retained.find(row=>row.name==="syncNapClubAccountEmails").commit,"functions/nap-club-account-emails.js"),source(candidate,"functions/nap-club-account-emails.js"),"NAP account projection changed");
  const mailSetup=({defs,sandbox,builders,commit})=>{
    Object.assign(sandbox,loader(commit)("functions/engagement-competition-mail-format.js"));
    const installed=new Set();
    function install(name){
      if(installed.has(name)||Object.hasOwn(sandbox,name)||!defs.has(name))return;
      installed.add(name);const declaration=defs.get(name);
      assert.equal(parse(declaration).body[0].type,"FunctionDeclaration");
      same(declaration,definitions(base).get(name),"Mail builder dependency changed: "+name);
      for(const reference of references(parse(declaration)))install(reference.node.name);
      vm.runInNewContext(declaration,sandbox,{timeout:3000});
    }
    builders.forEach(install);
  };
  await consumerFixtures({base,candidate,rows,source,loader,definitions,same,mailSetup});
  const {guardFixtures}=require("./release-home-retained-compatibility");
  for(const kind of ["preferences","access"]){const results=[];
    for(const commit of new Set([base,candidate,...rows.map(r=>r.commit)]))results.push(await guardFixtures({commit,definitions,loader,source,kind}));
    for(const result of results)assert.deepEqual(result,results[0]);
  }
  return {suite:"retained-calendar-consumers-v1",candidate,productionCommit:base,result:"success",networkCalls:0,
    passedFunctions:rows.map(r=>r.name).sort(),checks:["exact-15-origins","unchanged-retained-handlers","unchanged-mail-task-preference-protocols","bounded-reader-equivalence","mail-content-and-attachments","no-job-replay","access-and-preference-denials"]};
}
module.exports={matches,prove,expandedDefinitions};
