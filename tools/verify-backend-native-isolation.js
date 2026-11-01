"use strict";
const assert=require("node:assert/strict"),crypto=require("node:crypto");
const {project}=require("./backend-native-symbols"),{parse,walk}=require("./backend-factory-model");
const json=value=>JSON.stringify(value,(key,value)=>typeof value==="bigint"?{bigint:String(value)}:value);
function verify(result,outputs=result.outputs){
  assert.deepEqual([...outputs.keys()].sort(),[...result.outputs.keys()].sort(),"Exact native runtime paths required");
  // Reject all unplanned statements/imports as well as semantic corruption.
  // The independent catalog below additionally checks the renderer's moves.
  for(const[file,source]of outputs)assert.equal(source.replace(/\r\n/g,"\n"),result.outputs.get(file).replace(/\r\n/g,"\n"),"Unexpected native source: "+file);
  const before=project(result.original),after=project(outputs,result.moves,result.lazyRoot),a=before.catalog(),b=after.catalog();
  for(const file of result.destinations.keys()){
    const c=before.contexts.get(file),apis=c.ast.body.filter(n=>n.expression?.type==="AssignmentExpression"&&n.expression.left.object?.name==="module"&&n.expression.left.property?.name==="exports");
    assert.equal(apis.length,1,"One plain API required: "+file);const assignment=apis[0].expression;
    assert.equal(assignment.right.type,"ObjectExpression");
    for(const p of assignment.right.properties){assert.equal(p.type,"Property");assert.equal(p.kind,"init");assert.equal(p.computed,false);assert.equal(p.value.type,"Identifier","No computed exported getter: "+file);}
    for(const[n,binding]of c.refs)if(!binding&&["module","exports"].includes(n.name))assert.equal(n,assignment.left.object,"No mutable own API access: "+file);
    walk(c.ast,n=>assert.notEqual(n.type,"ThisExpression","Receiver-sensitive native API: "+file));
  }
  // Captures are safe only for plain APIs with no write or escaping namespace.
  for(const[file,c]of before.contexts){
    const parents=new Map();walk(c.ast,(n,p)=>{if(p)parents.set(n,p)});
    const check=n=>{const v=before.value(c,n);if(v?.type!=="BackendNamespace"||!result.destinations.has(v.id))return;const p=parents.get(n);
      if(p?.type==="MemberExpression"&&p.object===n){const op=parents.get(p);assert(!(op?.type==="AssignmentExpression"&&op.left===p||op?.type==="UpdateExpression"||op?.type==="UnaryExpression"&&op.operator==="delete"),"Mutable native API: "+file);return;}
      if(p?.type==="VariableDeclarator"&&p.init===n){assert.equal(parents.get(p)?.kind,"const","Mutable native module binding: "+file);return;}
      assert.fail("Native namespace escapes static member access: "+file);
    };
    for(const n of c.refs.keys())check(n);walk(c.ast,n=>{if(n.type==="CallExpression"&&n.callee.name==="require")check(n)});
  }
  const index=after.contexts.get("functions/index.js"),oldIndex=before.contexts.get("functions/index.js"),getter=result.lazyRoot.getter;
  const cached=index.ast.body.find(n=>n.type==="FunctionDeclaration"&&n.id.name===getter);
  assert(cached);assert.equal(cached.params.length,0);assert.equal(cached.async,false);assert.equal(cached.generator,false);assert.equal(cached.body.body.length,2);
  const [guard,returned]=cached.body.body;assert.equal(guard.type,"IfStatement");assert.equal(guard.alternate,null);assert.equal(guard.test.type,"UnaryExpression");assert.equal(guard.test.operator,"!");
  const member=node=>{assert.equal(node.type,"MemberExpression");assert.equal(node.computed,false);assert.equal(node.object.name,getter);assert.equal(node.property.name,"instance");};
  member(guard.test.argument);assert.equal(returned.type,"ReturnStatement");member(returned.argument);
  const stored=guard.consequent.expression;assert.equal(stored?.type,"AssignmentExpression");assert.equal(stored.operator,"=");member(stored.left);
  const original=oldIndex.ast.body.find(n=>n.type==="VariableDeclaration"&&n.declarations.length===1&&n.declarations[0].id.name==="syncNapClubAccountEmail");
  assert(original);assert.deepEqual(after.canonical(index,stored.right),before.canonical(oldIndex,original.declarations[0].init),"Same synchronizer dependencies, factory, project, secret and DB");
  const virtual={type:"VariableDeclaration",kind:"const",declarations:[{type:"VariableDeclarator",id:{type:"Identifier",name:"syncNapClubAccountEmail"},init:stored.right}]};
  b.declarations.set("functions/index.js#syncNapClubAccountEmail",after.canonical(index,virtual));
  assert.deepEqual(result.lazyRoot.startupLoads,["./portal-access-origin"],"Only the original origin snapshot stays eager");
  const eager=index.ast.body.filter(n=>n.type==="ExpressionStatement"&&n.expression?.callee?.name==="require"&&n.expression.arguments.length===1&&n.expression.arguments[0].value==="./portal-access-origin");
  assert.equal(eager.length,1);
  const extraEffect=after.canonical(index,eager[0]);
  const effects=b.effects.get("functions/index.js");const position=effects.findIndex(n=>json(n)===json(extraEffect));assert(position>=0);effects.splice(position,1);
  assert.deepEqual([...b.declarations.keys()].sort(),[...a.declarations.keys()].sort(),"Exact business declaration inventory");
  for(const[key,value]of a.declarations)assert(json(b.declarations.get(key))===json(value),"Body/signature/value/identity changed: "+key);
  for(const[file,effects]of a.effects)assert.deepEqual(b.effects.get(file),effects,"Module effects/Firebase declarations changed: "+file);
  for(const[file,api]of a.apis)assert.deepEqual(b.apis.get(file),api,"Existing API or actual function identity changed: "+file);
  for(const[file,directives]of a.directives)assert.deepEqual(b.directives.get(file),directives,"Execution mode changed: "+file);
  for(const [file,context]of before.contexts){
    const allowed=new Set([...context.rootScope.names.keys(),...(result.capturedImports||[]).filter(i=>i.file===file&&i.moduleScope).map(i=>i.alias)]);
    for(const name of after.contexts.get(file).rootScope.names.keys())assert(allowed.has(name)||file==="functions/index.js"&&name===getter,"Unexpected module binding: "+file+"#"+name);
  }
  for(const move of result.moves){
    assert.deepEqual(b.directives.get(move.target),a.directives.get(move.source),"Moved execution mode");
    assert.deepEqual(b.effects.get(move.target),[],"No new module effect");
    const ast=parse(outputs.get(move.target)),api=ast.body.find(n=>n.expression?.left?.object?.name==="module")?.expression?.right;
    const captures=(result.capturedImports||[]).filter(i=>i.file===move.target&&i.moduleScope),groups=new Set(captures.map(i=>i.group));
    const header=parse(move.header||""),directives=ast.body.filter(n=>n.directive).length;
    assert.equal(ast.body.length,directives+header.body.length+groups.size+move.selected.length+1,"Only original declarations and checked imports: "+move.target);
    const expectedNames=captures.map(i=>i.alias).concat(header.body.flatMap(n=>n.declarations.flatMap(d=>require("./isolate-backend-native-modules").names(d.id))));
    const actualNames=ast.body.slice(directives,directives+header.body.length+groups.size).flatMap(n=>n.declarations.flatMap(d=>require("./isolate-backend-native-modules").names(d.id)));
    assert.deepEqual(actualNames.sort(),expectedNames.sort(),"Checked header bindings");
    assert.equal(api?.type,"ObjectExpression");assert.deepEqual(api.properties.map(p=>p.key.name),move.exports,"Only original moved API members");
    for(const name of move.exports)assert.deepEqual(after.exported(move.target,name),before.exported(move.source,name),"Moved identity: "+name);
    for(const node of move.selected)walk(node,n=>{assert.notEqual(n.type,"ThisExpression","Receiver-dependent helper needs separate proof");if(n.type==="Identifier")assert(!["eval","Function","__dirname","__filename"].includes(n.name),"Module-scope-dependent helper needs separate proof");});
  }
  const digest=crypto.createHash("sha256");for(const[file,source]of [...outputs].sort(([a],[b])=>a.localeCompare(b)))digest.update(file+"\0"+source.replace(/\r\n/g,"\n")+"\0");
  return {schema:1,result:"success",baseline:result.baseline,declarations:a.declarations.size,moves:result.moves.length,apis:a.apis.size,networkCalls:0,runtimeSourceSha256:digest.digest("hex")};
}
module.exports={verify,json};
if(require.main===module){const path=require("node:path"),root=path.resolve(__dirname,".."),r=require("./isolate-backend-native-modules").render(root,process.argv[2]);console.log(json(verify(r)));}
