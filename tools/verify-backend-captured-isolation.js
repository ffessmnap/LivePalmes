"use strict";
// Independent capture, immutable-root and runtime wiring proof. Never executes services.
const assert=require("node:assert/strict"),crypto=require("node:crypto");
const {parse,walk}=require("./backend-factory-model"),{symbols}=require("./backend-native-symbols");
function writes(node,visit){if(!node)return;if(node.type==="Identifier")visit(node);else if(node.type==="ObjectPattern")node.properties.forEach(p=>writes(p.value||p.argument,visit));else if(node.type==="ArrayPattern")node.elements.forEach(n=>writes(n,visit));else if(node.type==="AssignmentPattern")writes(node.left,visit);else if(node.type==="RestElement")writes(node.argument,visit);}
function assertStableRoot(result){const ast=result.m.ast,lex=symbols(ast),stable=new Set(),parents=new Map();walk(ast,(n,p)=>{if(p)parents.set(n,p);});
 const owners=new Set(result.captures.map(c=>result.m.factories.get(c.owner).node));
 walk(ast,n=>{if(n.type!=="CallExpression"||n.callee.type!=="Identifier"||!owners.has(lex.lookup(n.callee)?.definition.node))return;let ancestor=parents.get(n),inside=false;while(ancestor){if(/Function/.test(ancestor.type)||ancestor.type==="ArrowFunctionExpression")inside=true;ancestor=parents.get(ancestor);}assert(inside,"Captured factory invoked before root initialization completes");});
 for(const c of result.captures){const f=result.m.factories.get(c.owner);for(const [alias,key]of c.keys){const value=f.context.get(key);assert.equal(f.contextKinds.get(key),"value","Captured root must read a plain value");assert.equal(value.type,"Identifier");const b=lex.lookup(value);assert(b?.definition.module,"Captured root must be a module binding: "+key);assert(["function","const"].includes(b.definition.kind),"Mutable captured root binding: "+key);stable.add(b.definition);}}
 walk(ast,n=>{if(n.type==="AssignmentExpression"||n.type==="UpdateExpression"||["ForInStatement","ForOfStatement"].includes(n.type))writes(n.left||n.argument,id=>assert(!stable.has(lex.lookup(id)?.definition),"Captured root reassigned: "+id.name));if(n.type==="CallExpression"&&n.callee.type==="Identifier"&&["eval","Function"].includes(n.callee.name)&&!lex.lookup(n.callee))assert.fail("Dynamic root binding mutation needs review");});
 return stable.size;
}
function captureCatalog(source,c,converted){const ast=parse(source),lex=symbols(ast),factory=ast.body.find(n=>n.type==="FunctionDeclaration"&&n.id.name===c.factory);assert(factory);assert.equal(factory.params.length,1);const param=factory.params[0],keys=new Map(c.keys),allowed=new Set(keys.values());
 if(converted){assert.equal(param.type,"Identifier");assert.equal(param.name,"backendContext");}else{assert.equal(param.type,"ObjectPattern");assert.equal(JSON.stringify(param,(k,v)=>["start","end"].includes(k)?undefined:v),JSON.stringify(parse("function f("+c.parameter+"){}").body[0].params[0],(k,v)=>["start","end"].includes(k)?undefined:v));}
 walk(factory.body,n=>assert.notEqual(n.type,"ThisExpression","Receiver-sensitive captured API needs separate review"));
 const parameterRef=n=>n?.type==="Identifier"&&lex.refs.get(n)?.definition.kind==="parameter"&&lex.refs.get(n).definition.node===param;
 walk(ast,n=>{if(n.type==="AssignmentExpression"||n.type==="UpdateExpression"||["ForInStatement","ForOfStatement"].includes(n.type))writes(n.left||n.argument,id=>assert(!parameterRef(id),"Captured parameter reassigned"));});
 function canonical(n,parent,key){if(!n||typeof n!=="object")return n;if(Array.isArray(n))return n.map(v=>canonical(v,parent,key));
  if(!converted&&parameterRef(n)){assert(keys.has(n.name));return {type:"CapturedSlot",name:keys.get(n.name)};}
  if(converted&&n.type==="MemberExpression"&&parameterRef(n.object)){assert.equal(n.computed,false);assert(allowed.has(n.property.name),"Unknown captured context slot");assert(!(parent?.type==="CallExpression"&&parent.callee===n),"Captured function receiver changed");return {type:"CapturedSlot",name:n.property.name};}
  if(converted&&n.type==="SequenceExpression"&&n.expressions.length===2&&n.expressions[0].type==="Literal"&&n.expressions[0].value===0){const last=canonical(n.expressions[1],n,"expressions");if(last.type==="CapturedSlot")return last;}
  if(converted&&parameterRef(n)&&!(parent?.type==="MemberExpression"&&parent.object===n))assert.fail("Captured context escapes static member access");
  const out={};for(const[k,v]of Object.entries(n)){if(["start","end"].includes(k)||k==="raw"&&n.type==="Literal"||k==="shorthand"&&n.type==="Property")continue;if(n===factory&&k==="params"){out.params=[{type:"CapturedParameterContract"}];continue;}out[k]=canonical(v,n,k);}return out;
 }
 return canonical(ast);
}
function verify(result,outputs=result.outputs){
 assert.deepEqual([...outputs.keys()].sort(),[...result.outputs.keys()].sort());
 assert.equal(result.prepared.source,result.input.source,"Captured preparation cannot alter root code");
 const stableBindings=assertStableRoot(result),normalized=new Map(outputs);
 for(const c of result.captures){assert.equal(c.original,result.input.files[c.file].source,"Original captured source must come from pinned snapshot");assert.deepEqual(c.keys,[...result.m.factories.get(c.owner).snapshotBindings],"Original captured binding order");assert.deepEqual(captureCatalog(c.original,c,false),captureCatalog(result.prepared.files[c.file].source,c,true),"Captured bodies and module effects changed: "+c.owner);
  const text=outputs.get(c.file),ast=parse(text),f=ast.body.find(n=>n.type==="FunctionDeclaration"&&n.id.name===c.factory);assert(f);assert.equal(f.params.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(f.params[0],(k,v)=>["start","end"].includes(k)?undefined:v)),JSON.parse(JSON.stringify(parse("function f("+c.parameter+"){}").body[0].params[0],(k,v)=>["start","end"].includes(k)?undefined:v)),"Compatibility must snapshot original properties in original order");
  const first=f.body.body[0];assert.equal(first?.type,"VariableDeclaration");assert.equal(first.kind,"const");assert.equal(first.declarations.length,1);assert.equal(first.declarations[0].id.name,"backendContext");const value=first.declarations[0].init;assert.equal(value.type,"ObjectExpression");assert.deepEqual(value.properties.map(p=>{assert.equal(p.type,"Property");assert.equal(p.computed,false);assert.equal(p.kind,"init");assert.equal(p.value.type,"Identifier");return [p.value.name,p.key.name];}),c.keys,"Capture compatibility must copy actual captured references once");
  normalized.set(c.file,text.slice(0,f.params[0].start)+"backendContext"+text.slice(f.params[0].end,first.start)+text.slice(first.end));
 }
 const proof=require("./verify-backend-factory-isolation").verify(result.rendered,normalized);
 const digest=crypto.createHash("sha256");for(const[f,s]of [...outputs].sort(([a],[b])=>a.localeCompare(b)))digest.update(f+"\0"+s.replace(/\r\n/g,"\n")+"\0");
 return {schema:1,result:"success",baseline:result.baseline,factories:result.captures.length,stableBindings,bodies:proof.bodies,groups:proof.groups,exports:proof.exports,networkCalls:0,runtimeSourceSha256:digest.digest("hex")};
}
module.exports={verify,captureCatalog,assertStableRoot};
