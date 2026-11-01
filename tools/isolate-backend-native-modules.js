"use strict";
// Preview mechanical moves of existing singleton/value/query modules. No backend execution.
const fs = require("node:fs"), path = require("node:path");
const { snapshot } = require("./release-test-function-fingerprints");
const { parse, walk } = require("./backend-factory-model");
const { references } = require("../tests/helpers/lexical-references");
const plans = [
  {"source":"nap-club-directory","target":"nap-club-values","names":["REGIONS","CLUB_REGIONS","EXTRA_COMMITTEES","portalRegion","region","COLUMNS","fingerprint","club"],"exports":["CLUB_REGIONS","portalRegion","region","COLUMNS","fingerprint","club"]},
  {"source":"nap-club-directory","target":"nap-club-directory-page","names":["directory"],"exports":["directory"],"header":"const { COLUMNS, club } = require(\"./nap-club-values\");"},
  {"source":"nap-club-directory","target":"nap-club-read-by-id","names":["findClub"],"exports":["findClub"],"header":"const { COLUMNS, club } = require(\"./nap-club-values\");"},
  {"source":"nap-club-people","target":"nap-club-people-values","names":["createHash","date","PAGE_SIZE","OPTION_COLUMNS","SOURCES","normalizeOptions","cursors","person"],"exports":["PAGE_SIZE","OPTION_COLUMNS","SOURCES","normalizeOptions","cursors","person"]},
  {"source":"nap-club-people","target":"nap-club-people-page","names":["readClubPeople"],"exports":["readClubPeople"],"header":"const { PAGE_SIZE, OPTION_COLUMNS, SOURCES, cursors, person } = require(\"./nap-club-people-values\");"},
  {"source":"nap-club-people","target":"nap-national-people-page","names":["readNationalPeople"],"exports":["readNationalPeople"],"header":"const { PAGE_SIZE, OPTION_COLUMNS, SOURCES, cursors, person } = require(\"./nap-club-people-values\");"},
  {"source":"nap-portal-workspaces","target":"nap-competition-view-values","names":["text","code","nativeCourseCode","json"],"exports":["text","code","nativeCourseCode","json"]},
  {"source":"nap-portal-workspaces","target":"nap-competition-list-item","names":["listItem"],"exports":["listItem"]},
  {"source":"nap-portal-workspaces","target":"nap-competition-view","names":["competitionItem"],"exports":["competitionItem"],"header":"const { text, code, nativeCourseCode, json } = require(\"./nap-competition-view-values\");\nconst { listItem } = require(\"./nap-competition-list-item\");\nconst { fingerprint } = require(\"./nap-competition-fingerprint\");\nconst calendar = require(\"./nap-direct-calendar\");"},
  {"source":"nap-portal-workspaces","target":"nap-entry-view","names":["nativeTime","entryItem","entryWithCourseRules"],"exports":["nativeTime","entryItem","entryWithCourseRules"],"header":"const { text, nativeCourseCode, json } = require(\"./nap-competition-view-values\");\nconst { fingerprint } = require(\"./nap-competition-fingerprint\");\nconst calendar = require(\"./nap-direct-calendar\");\nconst time = require(\"./nap-performance-normalization\");"},
  {"source":"nap-portal-workspaces","target":"nap-workspace-documents","names":["readDocuments"],"exports":["readDocuments"]},
  {"source":"portal-access-mail","target":"portal-access-origin","names":["livePalmesEnvironment","PORTAL_ORIGIN"],"exports":["PORTAL_ORIGIN"]},
  {"source":"nap-portal-swimmers","target":"nap-portal-swimmer-readers","names":["searchPortalSwimmers","listPortalClubSwimmers","listNationalSwimmers"],"exports":["searchPortalSwimmers","listPortalClubSwimmers","listNationalSwimmers"],"header":"const { person } = require(\"./nap-swimmer-profile\");\nconst { swimmerId } = require(\"./nap-swimmer-values\");\nconst licenseState = require(\"./nap-license-state\");\nconst mergeState = require(\"./nap-swimmer-merge-state\");"},
  {"source":"nap-direct-swimmer","target":"nap-performance-row","names":["performanceRow"],"exports":["performanceRow"],"header":"const rules = require(\"./nap-performance-normalization\");"},
  {"source":"nap-portal-competitions","target":"nap-portal-calendar-reader","names":["readNativeCompetitionSeason"],"exports":["readNativeCompetitionSeason"],"header":"const calendar = require(\"./nap-calendar-event\");\nconst { bounded } = require(\"./nap-competition-query\");\nconst { portalEventFromRow } = require(\"./nap-portal-event\");"},
  {"source":"nap-performance-normalization","target":"nap-performance-identity","names":["cleanText","normalizeIdentityText","swimmerIdentityKey","canonicalSwimmerId"],"exports":["cleanText","normalizeIdentityText","swimmerIdentityKey","canonicalSwimmerId"]},
  {"source":"nap-performance-normalization","target":"nap-performance-time","names":["parseCompactTime","formatTime"],"exports":["parseCompactTime","formatTime"]},
  {"source":"nap-performance-normalization","target":"nap-performance-dates","names":["competitionYear","competitionSeasonYear","birthYear","seasonAge"],"exports":["competitionYear","competitionSeasonYear","birthYear","seasonAge"]},
  {"source":"nap-performance-normalization","target":"nap-performance-categories","names":["CATEGORY_ORDER","CATEGORY_LABELS","categoryFromAge","fallbackCategoryFromSource","normalizePerformanceCategory","categoryCode","categorySortValue"],"exports":["CATEGORY_ORDER","CATEGORY_LABELS","categoryFromAge","fallbackCategoryFromSource","normalizePerformanceCategory","categoryCode","categorySortValue"],"header":"const { seasonAge } = require(\"./nap-performance-dates\");"},
  {"source":"nap-performance-normalization","target":"nap-performance-courses","names":["CURRENT_POOL_COURSES","SUPPORTED_POOLS","SUPPORTED_CHRONOS","COURSE_META","MIN_TIME_BY_COURSE","coursePayload"],"exports":["CURRENT_POOL_COURSES","SUPPORTED_POOLS","SUPPORTED_CHRONOS","COURSE_META","MIN_TIME_BY_COURSE","coursePayload"]},
  {"source":"nap-performance-normalization","target":"nap-performance-committees","names":["COMMITTEE_LABELS","committeeId","committeeLabel"],"exports":["COMMITTEE_LABELS","committeeId","committeeLabel"]},
  {"source":"nap-performance-normalization","target":"nap-performance-intermediates","names":["isIntermediateRow","intermediateGroupKey","annotateIntermediateOrigins"],"exports":["isIntermediateRow","intermediateGroupKey","annotateIntermediateOrigins"]},
  { source: "nap-mysql", target: "nap-connection", names: ["mysql", "napPoolOptions", "createNapPool"], exports: ["napPoolOptions", "createNapPool"] },
  { source: "nap-portal-swimmer-change", target: "nap-swimmer-identity-values", names: ["fingerprint"], exports: ["fingerprint"], header: 'const { createHash } = require("node:crypto");' },
  { source: "nap-portal-swimmers", target: "nap-swimmer-profile", names: ["person"], exports: ["person"], header: 'const rules = require("./nap-performance-normalization");\nconst licenseState = require("./nap-license-state");\nconst { fingerprint } = require("./nap-swimmer-identity-values");' },
  { source: "nap-portal-swimmers", target: "nap-portal-pool", names: ["createNapPool", "pool", "portalPool"], exports: ["portalPool"] },
  { source: "nap-direct-swimmer", target: "nap-swimmer-values", names: ["swimmerId"], exports: ["swimmerId"] },
  { source: "nap-direct-calendar", target: "nap-query", names: ["execute"], exports: ["execute"] },
  { source: "nap-portal-competitions", target: "nap-competition-query", names: ["bounded"], exports: ["bounded"], header: 'const calendar = require("./nap-query");' },
  { source: "nap-direct-calendar", target: "nap-calendar-event", names: ["MAX_EVENTS", "nativeLevel", "eventFromRow", "SELECT_EVENT", "EVENT_JOINS"], exports: ["MAX_EVENTS", "nativeLevel", "eventFromRow", "SELECT_EVENT", "EVENT_JOINS"], header: 'const { date, text, publicUrl } = require("./nap-calendar-values");\nconst { visiblePerformanceSql } = require("./nap-performance-visibility-sql");\nconst rules = require("./nap-performance-normalization");' },
  { source: "nap-portal-competitions", target: "nap-portal-event", names: ["portalEventFromRow"], exports: ["portalEventFromRow"], header: 'const calendar = require("./nap-calendar-event");\nconst { entryState } = require("./nap-paris-time");' },
  { source: "nap-competition-scope", target: "nap-competition-regions", names: ["REGIONS"], exports: ["REGIONS"] },
  { source: "nap-performance-visibility", target: "nap-performance-visibility-sql", names: ["visiblePerformanceSql"], exports: ["visiblePerformanceSql"] },
  { source: "nap-portal-workspaces", target: "nap-competition-fingerprint", names: ["fingerprint"], exports: ["fingerprint"], header: 'const { createHash } = require("node:crypto");' }
].map(p => ({ ...p, source: "functions/" + p.source + ".js", target: "functions/" + p.target + ".js" }));
function names(pattern) {
  if (pattern.type === "Identifier") return [pattern.name];
  if (pattern.type === "ObjectPattern") return pattern.properties.map(p => { if (p.type !== "Property" || p.value.type !== "Identifier") throw Error("Unknown import pattern"); return p.value.name; });
  throw Error("Unknown declaration pattern");
}
function declarations(ast) {
  const map = new Map();
  for (const node of ast.body) {
    if (node.type === "FunctionDeclaration") map.set(node.id.name, node);
    if (node.type === "VariableDeclaration") for (const d of node.declarations) for (const name of names(d.id)) map.set(name, node);
  }
  return map;
}
function patch(source, changes) {
  let end = source.length;
  for (const c of changes.sort((a,b) => b.start-a.start)) {
    if (c.end > end) throw Error("Overlapping source moves");
    source=source.slice(0,c.start)+c.text+source.slice(c.end);end=c.start;
  }
  return source;
}
function local(owner, target) { const result=path.posix.relative(path.posix.dirname(owner),target).replace(/\.js$/,"");return result.startsWith(".")?result:"./"+result; }
function resolve(owner, request, files) {
  if (!request?.startsWith(".")) return null;
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(owner),request));
  return [target,target+".js",target+".json",target+"/index.js"].find(f=>files.has(f)) || null;
}
function remapImports(file, source, files, destinations, capturedImports = []) {
  const ast=parse(source), changes=[], freeRequire=new Set(references(ast).filter(r=>r.node.name==="require").map(r=>r.node));
  const scopes=[], parents=new Map();walk(ast,(n,p)=>{if(p)parents.set(n,p);if(n.type==="Program"||n.type==="BlockStatement")scopes.push(n)});
  const removed=[],prefixes=new Map(),usedNames=new Set();let captureCounter=0;walk(ast,n=>{if(n.type==="Identifier")usedNames.add(n.name)});
  function readOnly(member){const p=parents.get(member);if(p?.type==="AssignmentExpression"&&p.left===member||p?.type==="UpdateExpression"&&p.argument===member||p?.type==="UnaryExpression"&&p.operator==="delete"&&p.argument===member)throw Error("Mutable module API requires separate proof");}
  function targetFor(call, member) {
    if (call?.type!=="CallExpression" || !freeRequire.has(call.callee) || call.arguments.length!==1 || call.arguments[0].type!=="Literal")return null;
    return destinations.get(resolve(file,call.arguments[0].value,files))?.get(member);
  }
  walk(ast,node=>{
    if(node.type!=="MemberExpression")return;
    const property=node.computed?node.property.value:node.property.name,target=targetFor(node.object,property);
    if(target){readOnly(node);changes.push({start:node.object.arguments[0].start,end:node.object.arguments[0].end,text:JSON.stringify(local(file,target))});}
  });
  walk(ast,node=>{
    if(node.type!=="VariableDeclarator")return;
    const d=node, declaration=parents.get(d);
    if(declaration?.type!=="VariableDeclaration"||declaration.kind!=="const")return;
    const call=d.init;
    if(call?.type!=="CallExpression"||!freeRequire.has(call.callee)||call.arguments.length!==1)return;
    const destination=destinations.get(resolve(file,call.arguments[0].value,files));if(!destination)return;
    if(d.id.type==="ObjectPattern") {
      if(declaration.declarations.length!==1)return;
      if(d.id.properties.some(p=>p.type!=="Property"||p.computed||p.value.type!=="Identifier"))return;
      const groups=new Map();for(const p of d.id.properties){const target=destination.get(p.key.name)||resolve(file,call.arguments[0].value,files);if(!groups.has(target))groups.set(target,[]);groups.get(target).push(source.slice(p.start,p.end))}
      if(groups.size===1&&groups.has(resolve(file,call.arguments[0].value,files)))return;
      changes.push({start:declaration.start,end:declaration.end,text:[...groups].map(([target,props])=>'const { '+props.join(', ')+' } = require('+JSON.stringify(local(file,target))+');').join('\n')});return;
    }
    if(d.id.type!=="Identifier")return;
    const scope=scopes.filter(s=>s.start<=node.start&&s.end>=node.end&&s.body.includes(declaration)).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
    if(!scope)return;
    const root={type:"Program",body:scope.body.map(n=>n===declaration?{...n,declarations:n.declarations.filter(value=>value!==d)}:n).filter(n=>n.type!=="VariableDeclaration"||n.declarations.length),sourceType:"script"};
    const refs=references(root).filter(r=>r.node.name===d.id.name),members=new Map();let all=refs.length>0;
    for(const ref of refs){const use=ref.parent,property=use?.type==="MemberExpression"&&use.object===ref.node?(use.computed?use.property.value:use.property.name):null,target=destination.get(property);if(!target){all=false;continue;}readOnly(use);members.set(property,target);}
    // Keep helpers fast and imports declarative: capture named values once,
    // then retain the original namespace binding for its existing member calls.
    if(all&&!(file==="functions/index.js"&&scope.type==="Program")){
      const grouped=new Map(),fields=[];
      for(const[name,target]of members){let alias;do{alias="__nativeMember"+captureCounter++;}while(usedNames.has(alias));usedNames.add(alias);
        if(!grouped.has(target))grouped.set(target,[]);grouped.get(target).push(name+": "+alias);fields.push(name+": "+alias);
        capturedImports.push({file,alias,name,target,originalModule:resolve(file,call.arguments[0].value,files),moduleScope:scope.type==="Program",group:declaration.start+":"+target});
      }
      if(!prefixes.has(declaration))prefixes.set(declaration,[]);prefixes.get(declaration).push(...[...grouped].map(([target,props])=>"const { "+props.join(", ")+" } = require("+JSON.stringify(local(file,target))+");\n"));
      changes.push({start:call.start,end:call.end,text:"{ "+fields.join(", ")+" }"});
    }

  });
  for(const[declaration,prefix]of prefixes)changes.push({start:declaration.start,end:declaration.start,text:prefix.join("")});
  source=patch(source,changes);
  const next=parse(source), cleanup=[];
  walk(next, declaration=>{
    if(declaration.type!=="VariableDeclaration"||declaration.kind!=="const")return;
    const scope=[];walk(next,n=>{if((n.type==="Program"||n.type==="BlockStatement")&&n.body.includes(declaration))scope.push(n)});
    if(scope.length!==1)return;
    const remove=new Set();
    for(const d of declaration.declarations){
      const call=d.init;
      if(d.id.type!=="Identifier"||call?.callee?.name!=="require"||call.arguments.length!==1||!destinations.has(resolve(file,call.arguments[0].value,files)))continue;
      const root={type:"Program",sourceType:"script",body:scope[0].body.map(n=>n===declaration?{...n,declarations:n.declarations.filter(v=>v!==d)}:n).filter(n=>n.type!=="VariableDeclaration"||n.declarations.length)};
      if(!references(root).some(r=>r.node.name===d.id.name))remove.add(d);
    }
    if(remove.size)cleanup.push({start:declaration.start,end:declaration.end,text:remove.size===declaration.declarations.length?"":"const "+declaration.declarations.filter(d=>!remove.has(d)).map(d=>source.slice(d.start,d.end)).join(", ")+";"});
  });
  return patch(source,cleanup);
}
function isolateRootLoads(source) {
  const ast=parse(source), changes=[], bindings=new Map(), removed=[];
  const modules=new Set(["./engagement-qualification","./engagement-qualification-service","./portal-access-mail","./performance-import-timing"]);
  for(const node of ast.body){
    if(node.type!=="VariableDeclaration"||node.kind!=="const"||node.declarations.length!==1)continue;
    const d=node.declarations[0], call=d.init;
    if(call?.callee?.name!=="require"||call.arguments.length!==1||call.arguments[0].type!=="Literal")continue;
    const module=call.arguments[0].value;
    if(!modules.has(module)&&module!=="./nap-mysql")continue;
    const candidates=d.id.type==="Identifier"?[[d.id.name,null]]:d.id.properties.map(p=>{if(p.type!=="Property"||p.computed||p.value.type!=="Identifier")throw Error("Unknown root import");return [p.value.name,p.key.name]});
    const selected=candidates.filter(([name])=>modules.has(module)||["readSwimmerPerformances","performanceRequest"].includes(name));
    if(!selected.length)continue;if(selected.length!==candidates.length)throw Error("Split mixed root imports first");
    for(const[name,property]of selected)bindings.set(name,'require('+JSON.stringify(module)+')'+(property?'.'+property:''));
    removed.push(node);changes.push({start:node.start,end:node.end,text:module==="./portal-access-mail"?'require("./portal-access-origin");':""});
  }
  const sync=ast.body.find(n=>n.type==="VariableDeclaration"&&n.declarations.length===1&&n.declarations[0].id.name==="syncNapClubAccountEmail");
  if(!sync)throw Error("Known synchronizer initialization required");
  const getter="nativeAccountEmailSynchronizer";
  if(declarations(ast).has(getter))throw Error("Root cache collision");
  const init=sync.declarations[0].init;
  if(init.type!=="CallExpression"||init.callee.property?.name!=="createSynchronizer"||init.callee.object.arguments?.[0]?.value!=="./nap-club-account-emails")throw Error("Unknown synchronizer factory");
  changes.push({start:sync.start,end:sync.end,text:'function '+getter+'() {\n  if (!'+getter+'.instance) '+getter+'.instance = '+source.slice(init.start,init.end)+';\n  return '+getter+'.instance;\n}'});
  for(const node of ast.body){
    if(removed.includes(node)||node===sync)continue;
    for(const ref of references(node)){
      let text=bindings.get(ref.node.name);
      if(ref.node.name==="syncNapClubAccountEmail"){if(ref.parent?.type!=="CallExpression"||ref.parent.callee!==ref.node)throw Error("Unexpected synchronizer reference");text=getter+"()";}
      if(!text)continue;
      if(ref.parent?.type==="AssignmentExpression"&&ref.parent.left===ref.node||ref.parent?.type==="UpdateExpression")throw Error("Mutable imported binding");
      if(ref.parent?.type==="Property"&&ref.parent.shorthand)text=ref.node.name+": "+text;
      changes.push({start:ref.node.start,end:ref.node.end,text});
    }
  }
  return {source:patch(source,changes),bindings,removed,sync,getter,startupLoads:["./portal-access-origin"]};
}
function render(root, baseline, selectedTargets = null) {
  const activePlans=selectedTargets===null?plans:plans.filter(p=>selectedTargets.includes(p.target));
  if(selectedTargets?.some(target=>!plans.some(p=>p.target===target)))throw Error("Unknown native component selection");
  if(!activePlans.some(p=>p.target==="functions/portal-access-origin.js"))throw Error("Original origin capture is required");
  const input=snapshot(root,baseline,{production:true});const files=new Map(Object.entries(input.files).filter(([f])=>f.endsWith(".js")).map(([f,v])=>[f,v.source]));files.set("functions/index.js",input.source);
  const original=new Map(files), destinations=new Map(), bySource=new Map(), moves=[];
  for(const plan of activePlans){if(files.has(plan.target))throw Error("Existing destination: "+plan.target);if(!files.has(plan.source))throw Error("Missing source");if(!bySource.has(plan.source))bySource.set(plan.source,[]);bySource.get(plan.source).push(plan);if(!destinations.has(plan.source))destinations.set(plan.source,new Map());for(const name of plan.exports)destinations.get(plan.source).set(name,plan.target);}
  for(const [file,group]of bySource){const source=files.get(file),ast=parse(source),defs=declarations(ast),changes=[];
    for(const plan of group){const selected=[...new Set(plan.names.map(name=>{if(!defs.has(name))throw Error('Missing declaration '+file+'#'+name);return defs.get(name)}))].sort((a,b)=>a.start-b.start);
      const bound=selected.flatMap(n=>n.type==='FunctionDeclaration'?[n.id.name]:n.declarations.flatMap(d=>names(d.id)));if(bound.some(n=>!plan.names.includes(n)))throw Error('Partial declaration move');
      const outside={type:'Program',body:ast.body.filter(n=>!selected.includes(n)),sourceType:'script'};for(const ref of references(outside))if(plan.names.includes(ref.node.name)&&!plan.exports.includes(ref.node.name))throw Error('Private moved state escapes: '+ref.node.name);
      const directives=ast.body.filter(n=>n.type==="ExpressionStatement"&&n.directive).map(n=>source.slice(n.start,n.end)).join("\n");
      const text=(directives?directives+"\n":"")+'// Existing singleton, values or query bodies; no business change.\n'+(plan.header?plan.header+'\n':'')+selected.map(n=>source.slice(n.start,n.end)).join('\n\n')+'\n\nmodule.exports = { '+plan.exports.join(', ')+' };\n';
      files.set(plan.target,text);moves.push({...plan,selected,bound});selected.forEach((n,i)=>changes.push({start:n.start,end:n.end,text:i===0?'const { '+plan.exports.join(', ')+' } = require('+JSON.stringify(local(file,plan.target))+');':''}));
    }files.set(file,patch(source,changes));
  }
  // Existing value helpers already have canonical modules. Redirect known members,
  // retaining any opaque namespace access on its original conservative path.
  for(const name of ['positiveId','date','text','publicUrl'])destinations.get('functions/nap-direct-calendar.js').set(name,'functions/nap-calendar-values.js');
  const capturedImports=[];
  for(const [file,source]of files)files.set(file,remapImports(file,source,files,destinations,capturedImports));
  const lazyRoot=isolateRootLoads(files.get("functions/index.js"));
  files.set("functions/index.js",lazyRoot.source);
  return {baseline,input,original,outputs:files,moves,destinations,lazyRoot,capturedImports};
}
function apply(root,result,previousTargets=null) {
  const previous=previousTargets?render(root,result.baseline,previousTargets):null;
  if(previous?.moves.some(m=>!result.moves.some(n=>n.target===m.target)))throw Error("Native component selection cannot shrink");
  const {execFileSync}=require("node:child_process"),absolute=path.resolve(root),normal=s=>s.replace(/\r\n/g,"\n"),observed=new Map();
  const proof=require("./verify-backend-native-isolation").verify(result);
  const git=args=>execFileSync("git",["-c","core.safecrlf=false",...args],{cwd:root,encoding:"utf8"});
  const changed=git(["diff","--name-only",result.baseline,"--","functions"]).split(/\r?\n/).filter(Boolean);
  const untracked=git(["ls-files","--others","--exclude-standard","--","functions"]).split(/\r?\n/).filter(Boolean);
  if([...changed,...untracked].some(f=>!result.outputs.has(f)))throw Error("Unexpected native backend source divergence");
  for(const[file,desired]of result.outputs){
    const target=path.resolve(root,file);if(!target.startsWith(absolute+path.sep))throw Error("Native output escapes workspace");
    let parent=path.dirname(target);while(parent!==absolute){if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw Error("Linked native output directory");parent=path.dirname(parent);}
    if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error("Linked native output file");
    const current=fs.existsSync(target)?fs.readFileSync(target,"utf8"):null,original=previous?.outputs.get(file)??result.original.get(file);
    if(current===null&&original!==undefined)throw Error("Expected native source removed: "+file);
    if(current!==null&&normal(current)!==normal(desired)&&(original===undefined||normal(current)!==normal(original)))throw Error("Native source modified outside planned move: "+file);
    observed.set(file,current);
  }
  for(const[file,desired]of result.outputs){const target=path.resolve(root,file),before=observed.get(file),current=fs.existsSync(target)?fs.readFileSync(target,"utf8"):null;if(current!==before)throw Error("Concurrent native source edit: "+file);if(current!==null&&normal(current)===normal(desired))continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,desired,{flag:before===null?"wx":"w"});}
  const actual=new Map([...result.outputs.keys()].map(f=>[f,fs.readFileSync(path.resolve(root,f),"utf8")]));
  return require("./verify-backend-native-isolation").verify(result,actual);
}
function writeLogicalPaths(root) { fs.writeFileSync(path.join(root,"tests/helpers/backend-native-paths.json"),JSON.stringify({generatedBy:"tools/isolate-backend-native-modules.js",scope:"Logical source-contract imports only; never runtime or deployment selection",paths:Object.fromEntries(plans.map(p=>[p.target,p.source]))},null,2)+"\n"); }
module.exports={render,plans,patch,remapImports,declarations,resolve,names,isolateRootLoads,apply,writeLogicalPaths};
if(require.main===module){const result=render(path.resolve(__dirname,'..'),process.argv[2]);if(process.argv.includes("--apply"))console.log(JSON.stringify(apply(path.resolve(__dirname,".."),result,process.argv.includes("--previous-progress")?JSON.parse(fs.readFileSync(path.resolve(__dirname,"../docs/releases/backend-isolation-progress.json"),"utf8")).nativeReview.appliedTargets:null)));console.log(JSON.stringify({baseline:result.baseline,moves:result.moves.length,changedFiles:[...result.outputs].filter(([f,s])=>s!==result.original.get(f)).length}));}
