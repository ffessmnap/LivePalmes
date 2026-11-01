"use strict";
// One-time captured-parameter migration; no selection or backend service invocation.
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {model,parse,walk}=require("./backend-factory-model"),{symbols}=require("./backend-native-symbols");
const snapshots=require("./release-test-function-fingerprints"),live=require("./isolate-backend-factories");
const OWNERS=["engagementPdfRenderer","legacyPerformancePublication"];
function patch(source,changes){for(const x of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,x.start)+x.text+source.slice(x.end);return source;}
function prepare(root,baseline,input=snapshots.snapshot(root,baseline,{production:true})){
 const m=model(root,input),files={...input.files},captures=[];
 for(const owner of OWNERS){
  const f=m.factories.get(owner);if(!f||!f.snapshotBindings.size||f.other.length)throw Error("Expected plain captured factory: "+owner);
  const parameter=f.factory.params[0],lex=symbols(parse(f.text)),changes=[{start:parameter.start,end:parameter.end,text:"backendContext"}];
  walk(lex.rootScope&&parse(f.text),n=>{if(n.type==="Identifier"&&n.name==="backendContext")throw Error("Captured context name collision");});
  for(const [n,b]of lex.refs)if(b?.definition.kind==="parameter"&&b.definition.node.start===parameter.start&&b.definition.node.end===parameter.end){
   const key=f.snapshotBindings.get(n.name);if(!key)throw Error("Unknown captured binding");
   let parent;walk(f.factory,(x,p)=>{if(x.start===n.start&&x.end===n.end&&x.type===n.type)parent=p;});
   const value="backendContext."+key,direct=parent?.type==="CallExpression"&&parent.callee.start===n.start;
   const text=parent?.type==="Property"&&parent.shorthand?key+": "+value:direct?"(0, "+value+")":value;
   changes.push({start:n.start,end:n.end,text});
  }
  const converted=patch(f.text,changes);files[f.file]={...files[f.file],source:converted};
  captures.push({owner,file:f.file,factory:f.factory.id.name,parameter:f.text.slice(parameter.start,parameter.end),keys:[...f.snapshotBindings],original:f.text,converted});
 }
 return {baseline,input,m,captures,prepared:{...input,files}};
}
function prefix(c){return "const backendContext = { "+c.keys.map(([alias,key])=>key+": "+alias).join(", ")+" };";}
function restoreAdapter(text,c){const needle="function "+c.factory+"(backendContext) {";if(!text.includes(needle))throw Error("Unknown live adapter");return text.replace(needle,"function "+c.factory+"("+c.parameter+") {\n  "+prefix(c));}
function render(root,baseline){const result=prepare(root,baseline),rendered=live.render(root,baseline,OWNERS,result.prepared),outputs=new Map(rendered.outputs);for(const c of result.captures)outputs.set(c.file,restoreAdapter(outputs.get(c.file),c));return {...result,rendered,outputs};}
function apply(root,result){
 require("./verify-backend-captured-isolation").verify(result);
 const normal=s=>s.replace(/\r\n/g,"\n"),original=f=>f==="functions/index.js"?result.input.source:result.input.files[f]?.source;
 const git=args=>cp.execFileSync("git",["-c","core.safecrlf=false",...args],{cwd:root,encoding:"utf8"});
 const changed=git(["diff","--name-only",result.baseline,"--","functions"]).split(/\r?\n/).filter(Boolean),untracked=git(["ls-files","--others","--exclude-standard","--","functions"]).split(/\r?\n/).filter(Boolean);
 if([...changed,...untracked].some(f=>!result.outputs.has(f)))throw Error("Unplanned captured source divergence");
 const base=path.resolve(root),observed=new Map();
 for(const[f,desired]of result.outputs){const target=path.resolve(root,f);if(!target.startsWith(base+path.sep))throw Error("Captured path escapes workspace");let parent=target;while(parent!==base){if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw Error("Linked captured path");parent=path.dirname(parent);}const current=fs.existsSync(target)?fs.readFileSync(target,"utf8"):null,before=original(f);if(current===null&&before!==undefined)throw Error("Missing captured source");if(current!==null&&normal(current)!==normal(desired)&&(before===undefined||normal(current)!==normal(before)))throw Error("Changed captured source: "+f);observed.set(f,current);}
 for(const[f,desired]of result.outputs){const target=path.resolve(root,f),before=observed.get(f),current=fs.existsSync(target)?fs.readFileSync(target,"utf8"):null;if(current!==before)throw Error("Concurrent captured source change");if(current!==null&&normal(current)===normal(desired))continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,desired,{flag:before===null?"wx":"w"});}
 return require("./verify-backend-captured-isolation").verify(result,new Map([...result.outputs.keys()].map(f=>[f,fs.readFileSync(path.resolve(root,f),"utf8")])));
}
module.exports={OWNERS,prepare,render,apply,prefix};
if(require.main===module){const result=render(path.resolve(__dirname,".."),process.argv[2]);console.log(JSON.stringify(process.argv.includes("--apply")?apply(path.resolve(__dirname,".."),result):require("./verify-backend-captured-isolation").verify(result)));}
