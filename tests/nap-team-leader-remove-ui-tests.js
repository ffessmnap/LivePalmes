"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("assets/livepalmes-admin-portal.js","utf8");
const code=source.slice(source.indexOf("  async function removeEngagementClubTeamLeader()"),source.indexOf("  async function saveEngagementClubOfficials("));
function fixture() {
  let reply,club="106",calls=0,participants=false,closed=false;
  const entry={napFingerprint:"fingerprint",teamLeader:{mode:"person",nativeLeaderId:"99",firstName:"Chef",lastName:"Test"}};
  const context={global:{confirm:()=>true},selectedEngagementCompetitionId:"legacy-nap-5162",selectedEngagementCompetition:{nativeReadOnly:true,nativeTeamLeaderEditable:true},selectedEngagementClubEntry:entry,canUse:()=>true,activeEngagementClubProfile:()=>({clubId:club}),engagementClubTeamLeaderLockReason:()=>closed?"closed":"",showEngagementClubWriteLock:()=>false,engagementClubTeamComplete:()=>true,engagementClubEntryHasParticipants:()=>participants,elements:{engagementsClubTeamMessage:{dataset:{}},engagementsClubTeamRemoveButton:{disabled:false,hidden:false}},setEngagementSaveState:()=>{},setSelectedEngagementCompetitionClubEntryExists:()=>{},renderEngagementClubEntry:()=>{},callFunction:async(name,args)=>{assert.equal(name,"removeEngagementClubTeamLeader");assert.equal(args.leaderId,"99");assert.equal(args.expectedFingerprint,"fingerprint");calls++;return new Promise(resolve=>reply=resolve);}};
  vm.createContext(context);vm.runInContext(code,context);
  return {context,run:()=>context.removeEngagementClubTeamLeader(),reply:()=>reply({entry:{source:"nap"},competition:{nativeTeamLeaderRequired:true}}),switchClub:()=>{club="999";},participants:()=>{participants=true;},close:()=>{closed=true;},calls:()=>calls,entry};
}
(async()=>{
  const normal=fixture(),pending=normal.run();normal.reply();assert.equal(await pending,true);assert.equal(normal.context.selectedEngagementClubEntry.source,"nap");
  const switched=fixture(),old=switched.run();switched.switchClub();switched.reply();await old;assert.equal(switched.context.selectedEngagementClubEntry,switched.entry,"Late response must not replace another club's dossier");
  for(const flag of ["participants","close"]) {const f=fixture();f[flag]();assert.equal(await f.run(),false);assert.equal(f.calls(),0);}
  console.log("Native leader withdrawal UI: native fingerprint, participants/closure lock and late club-switch response verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
