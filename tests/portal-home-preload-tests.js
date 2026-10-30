"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),{portalModule}=require("./helpers/portal-module-runtime");
function fixture(withFrame=true){
  const frames=[],tasks=[],calls=[],state={activeAuthUid:"fixture-user",currentAccessProfile:{clubId:"106",capabilities:["engagements.club.manage"]}};
  const actions=new Proxy({
    engagementClubScope:user=>user?.clubId||"",activeEngagementClubProfile:user=>user,
    canUse:capability=>state.currentAccessProfile?.capabilities?.includes(capability),
    applyPortalHomeForProfile:()=>calls.push("home"),loadEngagementCompetitions:input=>{assert.equal(input.activate,false);calls.push("calendar");},
    loadEngagementClubSwimmers:input=>{assert.equal(input.silent,true);calls.push("swimmers");}
  },{get:(target,key)=>target[key]||(()=>{})});
  const module=portalModule("competition-settings.js","LivePalmesPortalCompetitionSettings",{state,actions,config:{},elements:{}},{
    document:{querySelector:()=>null},window:{requestAnimationFrame:withFrame?callback=>frames.push(callback):undefined,setTimeout:callback=>tasks.push(callback)}
  });
  return {state,calls,frames,tasks,render:()=>module.renderCurrentUser(state.currentAccessProfile),frame:()=>{while(frames.length)frames.shift()();},run:()=>{while(tasks.length)tasks.shift()();}};
}
const f=fixture();f.render();assert.deepEqual(f.calls,["home"]);assert.equal(f.frames.length,1);assert.equal(f.tasks.length,0);
f.frame();assert.deepEqual(f.calls,["home"],"No data preloads inside the frame preceding the home paint");f.run();assert.deepEqual(f.calls,["home","calendar","swimmers"]);
const repeated=fixture();repeated.render();repeated.render();repeated.frame();repeated.run();assert.deepEqual(repeated.calls,["home","home","calendar","swimmers"],"Repeated profile renders share the last scheduled preload");
for(const change of [f=>{f.state.activeAuthUid="other-user";},f=>{f.state.currentAccessProfile={clubId:"107",capabilities:["engagements.club.manage"]};},f=>{f.state.currentAccessProfile.capabilities=[];},f=>{f.state.activeAuthUid="";f.state.currentAccessProfile=null;}]){
  const stale=fixture();stale.render();change(stale);stale.frame();stale.run();assert.deepEqual(stale.calls,["home"],"No preloading for an obsolete identity/scope or lost permission");
}
const fallback=fixture(false);fallback.render();assert.deepEqual(fallback.calls,["home"]);fallback.run();assert.deepEqual(fallback.calls,["home","calendar","swimmers"]);
console.log("Home preloads: actual profile renderer, frame/task ordering, shared scheduling, identity/club/rights/logout guards and fallback passed offline.");
