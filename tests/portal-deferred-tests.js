"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {portalModule,deferred}=require("./helpers/portal-module-runtime");
function runtime(){
  const scripts=[],listeners={},nodes=[];
  const node=()=>({events:{},hidden:false,setAttribute(){},addEventListener(name,fn){this.events[name]=fn;},remove(){this.removed=true;}});
  const document={createElement:node,body:{setAttribute(){},removeAttribute(){},appendChild:n=>nodes.push(n)},head:{appendChild:n=>scripts.push(n)},addEventListener:(event,fn)=>listeners[event]=fn};
  const window={location:{hash:"#fixture"},addEventListener(){}};
  vm.runInNewContext(fs.readFileSync("assets/livepalmes-portal-deferred.js","utf8"),{window,document});
  return{api:window.LivePalmesPortalDeferred,window,scripts,listeners,nodes};
}
async function loader(){
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
  let chunks=0;
  for(const file of fs.readdirSync("assets/portal/deferred")){
    let factory;
    vm.runInNewContext(fs.readFileSync("assets/portal/deferred/"+file,"utf8"),{window:{LivePalmesPortalDeferred:{register:(key,create)=>{assert.equal(key,file.replace(".js",""));factory=create;}}}});
    const forbidden=new Proxy({},{get(){throw Error("Eager data/state access");}}),methods=factory({state:forbidden,actions:forbidden,config:forbidden},forbidden);
    for(const [name,value]of Object.entries(methods)){assert.equal(value.constructor.name,"AsyncFunction");assert(fs.readFileSync("assets/portal/"+file,"utf8").includes('"'+name+'", args, moduleActions'));}chunks++;
  }
  console.log(`Deferred loader: ${chunks} real chunks, inert factories, shared loading, retry, warmed execution, identity/route guards and intent without data passed offline.`);
}
async function reads(){
  let calls=0,response=deferred();const state={activeAuthUid:"u"};
  const api=portalModule("navigation.js","LivePalmesPortalNavigation",{state,actions:{},config:{portalCallSamples:new Map(),PORTAL_FRENCH_ERROR_REPLACEMENTS:[]},elements:{}},{window:{LivePalmesAppConfig:{firebaseConfig:{}},firebase:{apps:[{}],initializeApp(){throw Error("Already initialized");},functions:{},app:()=>({functions:()=>({httpsCallable:()=>()=>{calls++;return response.promise;}})})}}});
  const first=api.callFunction("listEngagementCompetitions",{limit:250}),second=api.callFunction("listEngagementCompetitions",{limit:250});assert.equal(calls,1);response.resolve({data:{competitions:[]}});assert.deepEqual(await first,await second);
  response=deferred();const stale=api.callFunction("listEngagementCompetitions",{limit:250});assert.equal(calls,2);state.activeAuthUid="other";response.resolve({data:{competitions:[{private:true}]}});await assert.rejects(stale,/compte ou le club actif a changé/);
  response=deferred();const a=api.callFunction("saveEngagementClubPerson",{}),b=api.callFunction("saveEngagementClubPerson",{});assert.equal(calls,4,"Writes are never deduplicated/replayed as reads");response.resolve({data:{ok:true}});await Promise.all([a,b]);
  console.log("RPC sharing: identical simultaneous reads only, no freshness cache, fresh next consultation, stale identity rejected and writes separate passed offline.");
}
(async()=>{await loader();await reads();})().catch(error=>{console.error(error);process.exitCode=1;});
