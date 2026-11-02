"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {portalModule,deferred}=require("./helpers/portal-module-runtime");
function fixture({frames=true,idle=true}={}){
  const queue=new Map(),listeners={},calls=[],code=[];let id=0,now=10000,gate;
  const state={activeAuthUid:"u",currentAccessProfile:{clubId:"106",capabilities:["engagements.club.manage"]}};
  const add=(type,fn,delay=0)=>{queue.set(++id,{type,fn,delay});return id;},remove=id=>queue.delete(id);
  const document={body:{dataset:{adminAuth:"unlocked"}},visibilityState:"visible",querySelector:()=>null,addEventListener:(name,fn)=>listeners[name]=fn};
  const actions={engagementClubScope:()=>state.currentAccessProfile?.clubId,canUse:()=>state.currentAccessProfile?.capabilities?.includes("engagements.club.manage")};
  for(const name of ["loadEngagementCompetitions","loadEngagementClubSwimmers","loadEngagementClubPeople"])actions[name]=async input=>{calls.push({name,input,at:now});await gate;};
  const window={location:{hash:"#espace-club"},navigator:{onLine:true,connection:{}},LivePalmesEnvironment:{sportingDataSource:"nap"},LivePalmesPortalSession:{revision:()=>1},LivePalmesPortalDeferred:{load:async name=>{code.push(name);}},addEventListener:(name,fn)=>listeners[name]=fn,setTimeout:(fn,ms)=>add("timer",fn,ms),clearTimeout:remove,cancelAnimationFrame:remove,cancelIdleCallback:remove};
  if(frames)window.requestAnimationFrame=fn=>add("frame",fn);
  if(idle)window.requestIdleCallback=fn=>add("idle",fn);
  class Clock extends Date{static now(){return now;}}
  vm.runInNewContext(fs.readFileSync("assets/livepalmes-portal-preload.js","utf8"),{window,document,Date:Clock});
  const api=window.LivePalmesPortalPreload;assert.equal(Object.keys(listeners).length,0);
  api.attach({state,actions});
  async function step(){const item=queue.entries().next().value;if(!item)return;queue.delete(item[0]);now+=item[1].type==="frame"?16:item[1].delay;item[1].fn();for(let i=0;i<15;i++)await Promise.resolve();return item[1].type;}
  async function drain(){for(let i=0;i<25&&queue.size;i++)await step();}
  return{api,state,window,document,calls,code,listeners,queue,step,drain,pause:promise=>{gate=promise;}};
}
async function scheduler(){
  const f=fixture();f.api.schedule();f.api.schedule();assert.equal(f.queue.size,1);assert.equal(f.calls.length,0);
  assert.equal(await f.step(),"frame");assert.equal(await f.step(),"frame");assert.equal(f.calls.length,0);
  assert.equal(await f.step(),"timer");assert.equal(f.calls.length,0,"Reads wait for paint, a separate task and idle time");
  const gate=deferred();f.pause(gate.promise);await f.step();assert.equal(f.calls[0].name,"loadEngagementCompetitions");
  assert.equal(f.calls[0].input.activate,false);assert.equal(f.calls[0].input.mode,"club");f.api.schedule();await f.drain();assert.equal(f.calls.length,1,"Only one background call at a time");
  gate.resolve();for(let i=0;i<20;i++)await Promise.resolve();await f.drain();assert.deepEqual(f.calls.map(c=>c.name),["loadEngagementCompetitions","loadEngagementClubSwimmers","loadEngagementClubPeople"]);
  assert.equal(f.calls[1].input.background,true);assert.equal(f.calls[2].input.background,true);f.api.schedule();await f.drain();assert.equal(f.calls.length,3,"One pass per identity/scope/session, not per profile render");
  for(const mutate of [f=>{f.state.activeAuthUid="";},f=>{f.state.currentAccessProfile=null;},f=>{f.state.currentAccessProfile.capabilities=[];},f=>{f.document.visibilityState="hidden";},f=>{f.document.body.dataset.portalSession="locked";},f=>{f.window.location.hash="#mon-compte";},f=>{f.window.navigator.connection.saveData=true;},f=>{f.window.navigator.connection.effectiveType="2g";},f=>{f.window.navigator.onLine=false;},f=>{f.document.querySelector=()=>({open:true});}]){
    const stale=fixture();stale.api.schedule();mutate(stale);await stale.drain();assert.equal(stale.calls.length,0,"No speculative reads outside the authorised visible idle home");
  }
  const nav=fixture(),pending=deferred();nav.pause(pending.promise);nav.api.schedule();for(let i=0;i<4;i++)await nav.step();
  nav.window.location.hash="#club-officiels";nav.listeners.pointerdown({isTrusted:true});nav.listeners.hashchange();pending.resolve();for(let i=0;i<20;i++)await Promise.resolve();await nav.drain();assert.equal(nav.calls.length,1,"A click suspends the remaining queue; it does not cancel a sent RPC");
  nav.window.location.hash="#espace-club";nav.listeners.hashchange();await nav.drain();assert.equal(nav.calls.length,3);
  const changed=fixture();changed.api.schedule();changed.state.currentAccessProfile={...changed.state.currentAccessProfile,clubId:"107"};await changed.drain();assert.equal(changed.calls.length,0);changed.api.schedule();await changed.drain();assert.equal(changed.calls.length,3);
  const input=fixture();input.api.schedule();input.listeners.input({isTrusted:true});await input.step();await input.step();assert.ok([...input.queue.values()][0].delay>=1400,"Real input gives foreground work a quiet interval");await input.drain();assert.equal(input.calls.length,3);
  const locked=fixture();locked.api.schedule();locked.document.body.dataset.portalSession="locked";locked.listeners["livepalmes:portal-session-locked"]();assert.equal(locked.queue.size,0);locked.document.body.dataset.portalSession="active";locked.listeners["livepalmes:portal-session-resumed"]();await locked.drain();assert.equal(locked.calls.length,3);
  const failure=fixture();failure.window.LivePalmesPortalDeferred.load=async()=>{throw Error("offline");};failure.api.schedule();await failure.drain();assert.equal(failure.calls.length,0);assert.equal(failure.queue.size,0,"No automatic retry loop");
  const fallback=fixture({frames:false,idle:false});fallback.api.schedule();assert.equal(fallback.calls.length,0);await fallback.drain();assert.equal(fallback.calls.length,3);
}
async function loaders(){
  let reads=0;
  let clock=Date.now();class Clock extends Date{static now(){return clock;}}
  const state={currentAccessProfile:{clubId:"106"},engagementClubPeopleRequestVersion:0,engagementClubSwimmers:[]};
  const actions={canUse:()=>true,engagementClubScope:()=>"106",callFunction:async()=>{reads++;return {source:"nap",people:[{id:"p"}],hasMore:true,nextCursor:{officials:100}};},callFunctionWithTimeout:async()=>{reads++;return {source:"nap",clubId:"106",swimmers:[{id:"s"}]};},writeEngagementClubSwimmersCache:()=>{state.engagementClubSwimmersCachedAt=Date.now();}};
  const elements=new Proxy({engagementsView:{hidden:true}},{get:(target,key)=>{if(key in target)return target[key];throw Error("Background read must not touch hidden forms: "+key);}});
  const context={state,actions,config:{ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS:300000},elements};
  const people=portalModule("club-and-competition.js","LivePalmesPortalClubAndCompetition",context);
  const swimmers=portalModule("competition-actions.js","LivePalmesPortalCompetitionActions",context,{Date:Clock});
  await people.loadEngagementClubPeople({silent:true,background:true});await swimmers.loadEngagementClubSwimmers({silent:true,background:true});
  assert.equal(reads,2);assert.equal(state.engagementClubPeople[0].id,"p");assert.equal(state.engagementClubPeopleHasMore,true);assert.equal(state.engagementClubSwimmers[0].id,"s");
  clock+=6*60*60*1000;
  await people.loadEngagementClubPeople({silent:true,background:true});await swimmers.loadEngagementClubSwimmers({silent:true,background:true});assert.equal(reads,2,"The real loaders reuse the page cache beyond five minutes, without paging through all officials");
  await swimmers.loadEngagementClubSwimmers({silent:true,background:true,force:true});assert.equal(reads,3,"Explicit refresh bypasses the page cache");
}
(async()=>{await scheduler();await loaders();console.log("Progressive preload: paint/idle first, sequential bounded tasks, cache reuse, foreground priority, context/session/visibility/network guards, hidden forms untouched and no retry loop passed offline.");})().catch(error=>{console.error(error);process.exitCode=1;});
