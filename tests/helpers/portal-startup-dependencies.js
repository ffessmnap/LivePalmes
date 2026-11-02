"use strict";
const fs=require("node:fs"),acorn=require("../firestore-rules/node_modules/acorn");
const {references}=require("./lexical-references");
function walk(node,visit){if(!node||typeof node!=="object")return;visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value&&typeof value==="object")walk(value,visit);}
function requirements(){
  const methods=new Map(),secondary=new Map();
  for(const directory of ["assets/portal","assets/portal/deferred"]){
    for(const file of fs.readdirSync(directory).filter(file=>file.endsWith(".js"))){
      // Standalone optional module: its methods are called through invoke,
      // never through the synchronous facade graph reconstructed here.
      if(file==='team-entries.js')continue;
      const source=fs.readFileSync(directory+"/"+file,"utf8"),ast=acorn.parse(source,{ecmaVersion:"latest"});let factory;
      walk(ast,node=>{if(node.type==="FunctionDeclaration"&&node.id.name==="create"||node.type==="FunctionExpression"&&node.id?.name==="create")factory=node;});
      for(const node of factory.body.body.filter(node=>node.type==="FunctionDeclaration")){
        methods.set(node.id.name,{node,source});
        if(directory.endsWith("deferred")&&!node.async)secondary.set(node.id.name,file.replace(".js",""));
      }
    }
  }
  function needed(name,visited=new Set(),keys=new Set()){
    if(visited.has(name))return keys;visited.add(name);
    if(secondary.has(name))keys.add(secondary.get(name));
    const method=methods.get(name);if(!method)return keys;
    const text="("+method.source.slice(method.node.start,method.node.end)+")",ast=acorn.parse(text,{ecmaVersion:"latest"});
    const names=new Set(references(ast).map(reference=>reference.node.name));
    walk(ast,node=>{if(node.type==="MemberExpression"&&["moduleActions","portalActions"].includes(node.object?.name))names.add(node.property?.name);});
    for(const ref of names)if(secondary.has(ref))needed(ref,visited,keys);
    return keys;
  }
  return Object.fromEntries([...methods].filter(([,method])=>method.node.async).map(([name])=>[name,[...needed(name)].sort()]));
}
module.exports={requirements};
