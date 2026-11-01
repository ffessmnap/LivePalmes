"use strict";
// Independent lexical identities for the native source move proof. No module executes.
const { parse, walk } = require("./backend-factory-model");
const { resolve } = require("./isolate-backend-native-modules");
const path = require("node:path");
function symbols(ast) {
  const scopes=new WeakMap(),declared=new WeakSet(),rootScope={parent:null,fn:true,names:new Map()};
  function scope(parent,fn=false){return {parent,fn,names:new Map()};}
  function bind(node,target,definition,path=[]){if(!node)return;if(node.type==="Identifier"){target.names.set(node.name,{definition,name:node.name,path,module:target===rootScope});declared.add(node);}else if(node.type==="ObjectPattern")node.properties.forEach(p=>bind(p.value||p.argument,target,definition,path.concat(p.key?.name||p.key?.value)));else if(node.type==="ArrayPattern")node.elements.forEach((n,i)=>bind(n,target,definition,path.concat(i)));else if(node.type==="AssignmentPattern")bind(node.left,target,definition,path);else if(node.type==="RestElement")bind(node.argument,target,definition,path);}
  function visit(n,parent){if(!n?.type)return;let current=parent;
    if(/Function(?:Declaration|Expression)$/.test(n.type)||n.type==="ArrowFunctionExpression"){
      let definition={node:n,kind:"function",module:parent===rootScope};if(n.type==="FunctionDeclaration"&&parent)bind(n.id,parent,definition);
      current=scope(parent,true);bind(n.id,current,definition);n.params.forEach(p=>bind(p,current,{node:p,kind:"parameter"}));
    }else if(["BlockStatement","CatchClause","ForStatement","ForInStatement","ForOfStatement","SwitchStatement"].includes(n.type))current=scope(parent);
    scopes.set(n,current);
    if(n.type==="VariableDeclaration")for(const d of n.declarations){let target=current;if(n.kind==="var")while(target&&!target.fn)target=target.parent;bind(d.id,target||current,{node:d,kind:n.kind,module:(target||current)===rootScope});}
    if(n.type==="CatchClause")bind(n.param,current,{node:n.param,kind:"parameter"});if(n.type==="ClassDeclaration")bind(n.id,current,{node:n,kind:"class",module:current===rootScope});
    for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(c=>visit(c,current));else if(v&&typeof v==="object")visit(v,current);}
  }
  visit(ast,rootScope);
  function lookup(node){let s=scopes.get(node);while(s){if(s.names.has(node.name))return s.names.get(node.name);s=s.parent;}return null;}
  const refs=new Map();
  function scan(n,parent,key){if(!n?.type)return;if(n.type==="Identifier"&&!declared.has(n)){const skip=parent&&((parent.type==="MemberExpression"&&key==="property"&&!parent.computed)||(["Property","MethodDefinition","PropertyDefinition"].includes(parent.type)&&key==="key"&&!parent.computed)||(["BreakStatement","ContinueStatement","LabeledStatement"].includes(parent.type)&&key==="label"));if(!skip)refs.set(n,lookup(n));}for(const[k,v]of Object.entries(n)){if(Array.isArray(v))v.forEach(c=>scan(c,n,k));else if(v&&typeof v==="object")scan(v,n,k);}}
  scan(ast);return {refs,lookup,rootScope,declared};
}
function project(files,moves=[],rootCache=null) {
  const contexts=new Map(),origins=new Map();
  for(const move of moves)for(const name of move.bound)origins.set(move.target+"#"+name,move.source+"#"+name);
  const logical=(file,name)=>origins.get(file+"#"+name)||file+"#"+name;
  for(const[file,original]of files){const source=original.replace(/\r\n/g,"\n"),ast=parse(source),lexical=symbols(ast);contexts.set(file,{file,source,ast,...lexical});}
  const moduleId=(file,request)=>request.startsWith(".")?(resolve(file,request,files)||path.posix.normalize(path.posix.join(path.posix.dirname(file),request))):"@external:"+request;
  const ref=(id)=>({type:"BackendSymbol",id}),namespace=(id)=>({type:"BackendNamespace",id});
  function imported(context,binding){const d=binding?.definition;if(d?.kind!=="const")return null;const call=d.node.init;if(call?.type!=="CallExpression"||call.callee.name!=="require"||context.lookup(call.callee)||call.arguments.length!==1||call.arguments[0].type!=="Literal"||typeof call.arguments[0].value!=="string")return null;const request=call.arguments[0].value;return {module:moduleId(context.file,request),path:binding.path};}
  const resolving=new Set(),exportCache=new Map();
  function exported(file,name){const key=file+"#"+name;if(exportCache.has(key))return exportCache.get(key);if(file.startsWith("@external:"))return ref(key);if(resolving.has(key))throw Error("Circular exported binding: "+key);resolving.add(key);const context=contexts.get(file);if(!context){resolving.delete(key);return ref(key);}let found;
    for(const node of context.ast.body){const e=node.expression;if(e?.type==="AssignmentExpression"&&e.left.object?.name==="module"&&e.left.property?.name==="exports"&&e.right.type==="ObjectExpression"){const p=e.right.properties.find(p=>p.type==="Property"&&!p.computed&&(p.key.name||p.key.value)===name);if(p)found=value(context,p.value);}}
    resolving.delete(key);const result=found||ref(logical(file,name));exportCache.set(key,result);return result;
  }
  function facade(context,binding){
    if(binding?.definition.kind!=="const")return null;const init=binding.definition.node.init;
    if(init?.type!=="ObjectExpression"||!init.properties.length)return null;const members={};
    for(const p of init.properties){
      if(p.type!=="Property"||p.computed||p.kind!=="init")return null;
      const direct=p.value.type==="MemberExpression"&&p.value.object.type==="CallExpression"&&p.value.object.callee.name==="require"&&!context.lookup(p.value.object.callee);
      const captured=p.value.type==="Identifier"&&imported(context,context.lookup(p.value))?.path.length===1;
      if(!direct&&!captured)return null;
      const resolved=value(context,p.value);if(!resolved||!["BackendSymbol","BackendNamespace"].includes(resolved.type))return null;members[p.key.name||p.key.value]=resolved;
    }return members;
  }
  function value(context,node){
    if(node?.type==="Identifier"&&context.refs.has(node)){const b=context.refs.get(node),imp=imported(context,b);if(imp?.module)return imp.path.length===1?exported(imp.module,imp.path[0]):namespace(imp.module);const members=facade(context,b);if(members)return {type:"BackendFacade",members};if(b&&(b.definition.module||b.module))return ref(logical(context.file,b.name));}
    if(node?.type==="CallExpression"&&node.callee.name==="require"&&!context.lookup(node.callee)&&node.arguments.length===1&&node.arguments[0].type==="Literal"){const request=node.arguments[0].value;if(typeof request==="string")return namespace(moduleId(context.file,request));}
    if(node?.type==="CallExpression"&&rootCache&&context.file==="functions/index.js"&&node.callee.name===rootCache.getter&&node.arguments.length===0&&context.lookup(node.callee)?.definition.kind==="function"&&context.lookup(node.callee)?.definition.module)return ref("functions/index.js#syncNapClubAccountEmail");
    if(node?.type==="MemberExpression"){const object=value(context,node.object),property=node.computed?node.property.value:node.property.name;if(object?.type==="BackendNamespace"&&typeof property==="string")return exported(object.id,property);if(object?.type==="BackendFacade"&&typeof property==="string")return object.members[property]||null;}
    return null;
  }
  function canonical(context,node){if(!node||typeof node!=="object")return node;if(Array.isArray(node))return node.map(n=>canonical(context,n)).filter(n=>n!==null);const symbolic=value(context,node);if(symbolic)return symbolic;
    if(node.type==="VariableDeclaration"){const declarations=node.declarations.filter(d=>{const list=[];walk(d.id,n=>{if(n.type==="Identifier"&&context.declared.has(n))list.push(n)});return !list.length||!list.every(n=>imported(context,context.lookup(n))||facade(context,context.lookup(n)));});if(!declarations.length)return null;return {type:node.type,kind:node.kind,declarations:declarations.map(d=>canonical(context,d))};}
    const result={};for(const[k,v]of Object.entries(node))if(!["start","end","loc"].includes(k)&&!(k==="raw"&&node.type==="Literal"))result[k]=canonical(context,v);
    if(node.type==="Property"&&node.kind==="init"&&!node.computed&&["BackendSymbol","BackendNamespace"].includes(result.value?.type))result.shorthand=false;
    return result;
  }
  function catalog(){const declarations=new Map(),effects=new Map(),apis=new Map(),directives=new Map();
    for(const[file,c]of contexts){const other=[];directives.set(file,c.ast.body.filter(n=>n.directive).map(n=>n.directive));
      for(const node of c.ast.body){if(node.directive)continue;
        if(node.type==="FunctionDeclaration"){if(rootCache&&file==="functions/index.js"&&node.id.name===rootCache.getter)continue;declarations.set(logical(file,node.id.name),canonical(c,node));continue;}
        if(node.type==="VariableDeclaration"){for(const d of node.declarations){const normalized=canonical(c,{...node,declarations:[d]});if(normalized)declarations.set(logical(file,d.id.name||JSON.stringify(canonical(c,d.id))),normalized);}continue;}
        const e=node.expression;if(e?.type==="AssignmentExpression"&&e.left.object?.name==="module"&&e.left.property?.name==="exports"){apis.set(file,canonical(c,e.right));continue;}other.push(canonical(c,node));
      }effects.set(file,other);
    }return {declarations,effects,apis,directives};
  }
  return {contexts,canonical,value,exported,catalog,logical};
}
module.exports={symbols,project};
