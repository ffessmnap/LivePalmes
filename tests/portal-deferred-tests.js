"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {portalModule,deferred}=require("./helpers/portal-module-runtime");
const {requirements}=require("./helpers/portal-startup-dependencies");
function runtime(fetcher){
  const scripts=[],listeners={},nodes=[];
  const node=()=>({events:{},hidden:false,setAttribute(){},addEventListener(name,fn){this.events[name]=fn;},remove(){this.removed=true;}});
  const document={createElement:node,body:{setAttribute(){},removeAttribute(){},appendChild:n=>nodes.push(n)},head:{appendChild:n=>scripts.push(n)},addEventListener:(event,fn)=>listeners[event]=fn};
  const window={location:{hash:"#fixture"},addEventListener(){}};
  vm.runInNewContext(fs.readFileSync("assets/livepalmes-portal-deferred.js","utf8"),{window,document,fetch:fetcher});
  return{api:window.LivePalmesPortalDeferred,window,document,scripts,listeners,nodes};
}
async function loader(){
  const source=fs.readFileSync("assets/livepalmes-portal-deferred.js","utf8");
  const declared=JSON.parse(/const syncDependencies = (\{[^\n]+\});/.exec(source)[1]);
  for(const [name,keys]of Object.entries(requirements()))for(const key of keys)assert.ok(declared[name]?.includes(key),name+" must prepare synchronous chunk "+key);
  const f=runtime(),state={activeAuthUid:"u",activeEngagementClubId:"c"},context={state};let calls=0,prevented=0;
  const a=f.api.invoke(context,"fixture","run",[{preventDefault(){prevented++;}}],{}),b=f.api.invoke(context,"fixture","run",[],{});
  assert.equal(f.scripts.length,1);assert.equal(prevented,1);assert.equal(calls,0);
  f.api.register("fixture",()=>({run:async()=>++calls}));f.scripts[0].events.load();assert.deepEqual(await Promise.all([a,b]),[1,2]);
  await f.api.invoke(context,"fixture","run",[],{});assert.equal(f.scripts.length,1);
  const failed=f.api.load("retry");f.scripts.at(-1).events.error();await assert.rejects(failed,/Chargement/);assert.equal(f.scripts.at(-1).removed,true);
  const retry=f.api.load("retry");assert.equal(f.scripts.length,3);f.api.register("retry",()=>({}));f.scripts.at(-1).events.load();await retry;
  const stale=f.api.invoke(context,"stale","run",[],{});state.activeAuthUid="other";f.api.register("stale",()=>({run:()=>{throw Error("Obsolete context must never execute");}}));f.scripts.at(-1).events.load();await assert.rejects(stale,/contexte a changé/);
  const route=f.api.invoke(context,"route","run",[],{});f.window.location.hash="#other";f.api.register("route",()=>({run:()=>{throw Error("Obsolete route");}}));f.scripts.at(-1).events.load();await assert.rejects(route,/contexte a changé/);
  const before=f.scripts.length;f.listeners.pointerover({target:{closest:()=>({getAttribute:()=>"#club-competitions"})}});assert.equal(f.scripts.length,before+3,"Intent warms code only; no factory or RPC executes");
  let sessionRevision=1;f.window.LivePalmesPortalSession={revision:()=>sessionRevision};
  const expired=f.api.invoke(context,"expired","save",[],{});sessionRevision++;
  f.api.register("expired",()=>({save:()=>{throw Error("Expired action must not replay after reauthentication");}}));f.scripts.at(-1).events.load();await assert.rejects(expired,/contexte a changé/);
  let chunks=0;
  for(const file of fs.readdirSync("assets/portal/deferred")){
    let factory;
    vm.runInNewContext(fs.readFileSync("assets/portal/deferred/"+file,"utf8"),{window:{LivePalmesPortalDeferred:{register:(key,create)=>{assert.equal(key,file.replace(".js",""));factory=create;}}}});
    const forbidden=new Proxy({},{get(){throw Error("Eager data/state access");}}),methods=factory({state:forbidden,actions:forbidden,config:forbidden},forbidden);
    for(const [name,value]of Object.entries(methods)){
      assert.equal(typeof value,"function");
      if(file==="workspace-events.js")assert.equal(name,"bindWorkspaceEvents");
      else assert(fs.readFileSync("assets/portal/"+file,"utf8").includes('"'+name+'", args, moduleActions'));
    }chunks++;
  }
  let syncCalls=0;f.api.register("sync",()=>({value:()=>++syncCalls}));
  assert.equal(f.api.sync(context,"sync","value",[],{}),1,"A ready synchronous helper preserves its return value");
  assert.throws(()=>f.api.sync(context,"missing","value",[],{}),/pas encore prêts/,"Missing synchronous helpers cannot silently return a promise");
  const quiet=runtime();let speculative=0;
  const quietRead=quiet.api.invoke(context,"competition-actions","loadEngagementClubSwimmers",[{silent:true,background:true}],{});
  assert.equal(quiet.nodes.length,0,"Preparing background dependencies never shows a foreground status");
  quiet.window.location.hash="#another-view";
  for(const script of quiet.scripts){const key=/deferred\/([^/?]+)\.js/.exec(script.src)[1];quiet.api.register(key,()=>({loadEngagementClubSwimmers:()=>++speculative}));script.events.load();}
  await assert.rejects(quietRead,/contexte a changé/);assert.equal(speculative,0);assert.equal(quiet.nodes.length,0,"An abandoned speculative read stays silent");
  console.log(`Deferred loader: ${chunks} real chunks, inert factories, shared loading, retry, warmed execution, identity/route guards and intent without data passed offline.`);
}
async function resources(){
  let response=deferred(),fetches=0,bindings=0,resumes=0;
  const f=runtime(()=>{fetches++;return response.promise;});
  const style={dataset:{portalStyleSrc:"fixture.css"},events:{},addEventListener(n,fn){this.events[n]=fn;},removeEventListener(n){delete this.events[n];},removeAttribute(){delete this.href;}};
  const form={dataset:{portalFragment:"records",portalFragmentSrc:"fixture.html"},innerHTML:""};
  f.document.querySelectorAll=selector=>selector.includes("style")?[style]:[form];
  for(const file of fs.readdirSync("assets/portal/deferred"))f.api.register(file.replace(".js",""),()=>({bindWorkspaceEvents(){bindings++;}}));
  const context={state:{}};
  assert.equal(f.api.prepareView(context,"clubHome",()=>resumes++),true);assert.equal(fetches,0);
  assert.equal(f.api.prepareView(context,"records",()=>resumes++),false);
  f.api.prepareView(context,"records",()=>resumes++);assert.equal(fetches,1,"Concurrent routes share static resources");
  style.sheet={};style.events.load();for(let i=0;i<10;i++)await Promise.resolve();assert.equal(resumes,0,"CSS alone cannot expose an unhydrated form");
  response.resolve({ok:true,text:async()=>'<input value="draft">'});for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(resumes,1);assert.equal(f.api.prepareView(context,"records",()=>resumes++),true);assert.equal(bindings,1);assert.match(form.innerHTML,/draft/);
  form.innerHTML="edited";assert.equal(f.api.prepareView(context,"records",()=>resumes++),true);assert.equal(bindings,1);assert.equal(fetches,1);assert.equal(form.innerHTML,"edited","Returning preserves form state and does not rebind listeners");
  form.dataset.portalFragmentSrc="retry.html";delete form.dataset.portalFragmentLoaded;response=deferred();
  assert.equal(f.api.prepareView(context,"records",()=>resumes++),false);response.resolve({ok:false});for(let i=0;i<30;i++)await Promise.resolve();assert.equal(fetches,2,"No automatic retry follows a static resource failure");
  response=deferred();assert.equal(f.api.prepareView(context,"records",()=>resumes++),false);assert.equal(fetches,3);response.resolve({ok:true,text:async()=>"recovered"});for(let i=0;i<30;i++)await Promise.resolve();assert.equal(form.innerHTML,"recovered");
  style.dataset.portalStyleSrc="retry.css";delete style.sheet;const previousResumes=resumes;
  assert.equal(f.api.prepareView(context,"records",()=>resumes++),false);style.events.error();for(let i=0;i<30;i++)await Promise.resolve();assert.equal(resumes,previousResumes,"A stylesheet failure keeps the tool closed");assert.equal(style.href,undefined);
  assert.equal(f.api.prepareView(context,"records",()=>resumes++),false);style.sheet={};style.events.load();for(let i=0;i<30;i++)await Promise.resolve();assert.equal(resumes,previousResumes+1,"A deliberate reopening retries the stylesheet");
  console.log("Startup resources: home remains minimal, styles/forms gate tool exposure, shared requests, one-time binding, retained edits and deliberate failure recovery passed offline.");
}
async function reads(){
  let calls=0,response=deferred();const state={activeAuthUid:"u"};
  const api=portalModule("navigation.js","LivePalmesPortalNavigation",{state,actions:{},config:{portalCallSamples:new Map(),PORTAL_FRENCH_ERROR_REPLACEMENTS:[]},elements:{}},{window:{LivePalmesAppConfig:{firebaseConfig:{}},firebase:{apps:[{}],initializeApp(){throw Error("Already initialized");},functions:{},app:()=>({functions:()=>({httpsCallable:()=>()=>{calls++;return response.promise;}})})}}});
  const first=api.callFunction("listEngagementCompetitions",{limit:250}),second=api.callFunction("listEngagementCompetitions",{limit:250});assert.equal(calls,1);response.resolve({data:{competitions:[]}});assert.deepEqual(await first,await second);
  response=deferred();const stale=api.callFunction("listEngagementCompetitions",{limit:250});assert.equal(calls,2);state.activeAuthUid="other";response.resolve({data:{competitions:[{private:true}]}});await assert.rejects(stale,/compte ou le club actif a changé/);
  response=deferred();const a=api.callFunction("saveEngagementClubPerson",{}),b=api.callFunction("saveEngagementClubPerson",{});assert.equal(calls,4,"Writes are never deduplicated/replayed as reads");response.resolve({data:{ok:true}});await Promise.all([a,b]);
  state.currentAccessProfile={regionId:"IDF",capabilities:["engagements.region.manage"]};response=deferred();
  const regionRead=api.callFunction("listAccessUsers",{});state.currentAccessProfile={...state.currentAccessProfile,regionId:"HDF"};response.resolve({data:{users:[{private:true}]}});await assert.rejects(regionRead,/compte ou le club actif a changé/);
  console.log("RPC sharing: identical simultaneous reads only, no freshness cache, fresh next consultation, stale identity rejected and writes separate passed offline.");
}
(async()=>{await loader();await reads();await resources();})().catch(error=>{console.error(error);process.exitCode=1;});
