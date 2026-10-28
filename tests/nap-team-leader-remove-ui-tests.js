"use strict";
const assert = require("node:assert/strict"), fs = require("./helpers/source-files"), vm = require("node:vm");
const source = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8").replace(/\r\n/g, "\n");
function block(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const end = source.slice(start + 1).search(/\n  (?:async )?function /);
  return source.slice(start, start + 1 + end);
}
function fixture() {
  const radios = [{value:"person",checked:true}, {value:"renounced",checked:false}];
  const entry = {napFingerprint:"fingerprint", teamLeader:{mode:"person",nativeLeaderId:"99",firstName:"Chef",lastName:"Test"}, swimmers:[{id:1}], officials:[{id:2}], relays:[{id:3}]};
  let finish, club="106";
  const calls=[], renders=[];
  const c = {
    selectedEngagementCompetitionId:"fixture", selectedEngagementCompetition:{nativeReadOnly:true,nativeTeamLeaderEditable:true,entryStatus:"open"}, selectedEngagementClubEntry:entry,
    engagementClubTeamSaving:false, engagementClubTeamRenunciationSaving:false, engagementClubTeamRenunciationContext:null, engagementClubTeamEditing:false,
    canUse:()=>true, activeEngagementClubProfile:()=>({clubId:club}),
    engagementClubTeamLeaderLockReason:()=>c.selectedEngagementCompetition.entryStatus === "closed" ? "Closed" : "",
    engagementClubWriteLockReason:()=>c.engagementClubTeamLeaderLockReason(), engagementClubTeamComplete:()=>true,
    updateEngagementClubTeamFormMode:()=>{}, setEngagementClubFormControlsLocked:()=>{}, renderEngagementClubTeamPersonOptions:()=>{}, updateEngagementClubTeamLeaderActions:()=>{},
    setEngagementSaveState:state=>{c.lastState=state;},
    renderEngagementClubEntry:entry=>{renders.push(entry);c.selectedEngagementClubEntry=entry;},
    callFunction:(name,payload)=>{calls.push({name,payload});return new Promise((resolve,reject)=>{finish={resolve,reject};});},
    elements:{
      engagementsClubTeamForm:{querySelector:s=>s.includes('[value="renounced"]')?radios[1]:radios.find(r=>r.checked),querySelectorAll:()=>radios,checkValidity:()=>true,setAttribute(){},removeAttribute(){}},
      engagementsClubTeamRenunciation:{checked:false},engagementsClubTeamExternal:{checked:false},engagementsClubTeamMessage:{dataset:{}},
      engagementsClubTeamRenunciationDialog:{open:false,showModal(){this.open=true;},close(){this.open=false;}},
      engagementsClubTeamRenunciationDialogTitle:{},engagementsClubTeamRenunciationDialogSummary:{}
    }
  };
  let waived=false;
  Object.defineProperty(radios[1],"checked",{get:()=>waived,set:value=>{waived=value;if(value)radios[0].checked=false;}});
  vm.createContext(c);
  for(const name of ["restoreEngagementClubTeamLeaderChoice","openEngagementClubTeamRenunciationDialog","closeEngagementClubTeamRenunciationDialog","selectEngagementClubTeamRenunciation","saveEngagementClubTeamLeader","removeEngagementClubTeamLeader"]) vm.runInContext(block(name),c);
  return {c,entry,calls,renders,radios,resolve:()=>finish.resolve({competition:c.selectedEngagementCompetition,entry:{...entry,teamLeader:{mode:"renounced",renunciationAccepted:true}}}),reject:()=>finish.reject(Error("Server failure")),switchClub:()=>{club="999";}};
}
(async()=>{
  const f=fixture();
  assert.equal(await f.c.removeEngagementClubTeamLeader(),true);
  assert.equal(f.calls.length,0,"opening confirmation never writes, even with participants");
  assert.match(f.c.elements.engagementsClubTeamRenunciationDialogSummary.textContent,/Chef Test/);
  f.c.closeEngagementClubTeamRenunciationDialog();
  assert.equal(f.calls.length,0);assert.equal(f.c.selectedEngagementClubEntry,f.entry);assert.equal(f.radios[0].checked,true);
  await f.c.removeEngagementClubTeamLeader();const pending=f.c.selectEngagementClubTeamRenunciation();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,"saveEngagementClubTeamLeader");
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].payload)),{competitionId:"fixture",leaderId:"99",expectedFingerprint:"fingerprint",patch:{mode:"renounced",renunciationAccepted:true}});
  assert.equal(f.c.selectedEngagementClubEntry,f.entry,"persisted leader remains until server confirms");
  await f.c.selectEngagementClubTeamRenunciation();assert.equal(f.calls.length,1);
  f.resolve();await pending;
  assert.equal(f.c.selectedEngagementClubEntry.teamLeader.mode,"renounced");
  for(const key of ["swimmers","officials","relays"]) assert.equal(f.c.selectedEngagementClubEntry[key],f.entry[key],key);
  assert.equal(f.c.lastState,"saved");
  const failed=fixture();await failed.c.removeEngagementClubTeamLeader();const failure=failed.c.selectEngagementClubTeamRenunciation();failed.reject();await failure;
  assert.equal(failed.c.selectedEngagementClubEntry,failed.entry);assert.equal(failed.radios[0].checked,true);assert.equal(failed.c.lastState,"error");
  for(const flag of ["closed","denied","saving","external"]) {
    const denied=fixture();
    if(flag==="closed")denied.c.selectedEngagementCompetition.entryStatus="closed";
    if(flag==="denied")denied.c.canUse=()=>false;
    if(flag==="saving")denied.c.engagementClubTeamSaving=true;
    if(flag==="external")denied.entry.teamLeader.externalClub=true;
    assert.equal(await denied.c.removeEngagementClubTeamLeader(),false,flag);assert.equal(denied.calls.length,0);assert.equal(denied.c.elements.engagementsClubTeamRenunciationDialog.open,false);
  }
  const stale=fixture();await stale.c.removeEngagementClubTeamLeader();stale.switchClub();await stale.c.selectEngagementClubTeamRenunciation();assert.equal(stale.calls.length,0,"stale dialog cannot affect another club");
  for(const change of [f=>{f.entry.napFingerprint="changed";},f=>{f.entry.teamLeader.firstName="Autre chef";}]) {
    const changed=fixture();await changed.c.removeEngagementClubTeamLeader();change(changed);await changed.c.selectEngagementClubTeamRenunciation();
    assert.equal(changed.calls.length,0,"confirmation cannot waive a dossier or leader changed since the warning");
    assert.equal(changed.c.elements.engagementsClubTeamRenunciationDialog.open,false);
    assert.match(changed.c.elements.engagementsClubTeamMessage.textContent,/dossier a changé/);
  }
  for(const switchScope of [f=>f.switchClub(),f=>{f.c.selectedEngagementCompetitionId="other";}]) {
    const switched=fixture();await switched.c.removeEngagementClubTeamLeader();const old=switched.c.selectEngagementClubTeamRenunciation();switchScope(switched);const current={other:true};switched.c.selectedEngagementClubEntry=current;switched.resolve();await old;
    assert.equal(switched.c.selectedEngagementClubEntry,current,"late response cannot replace another dossier");assert.equal(switched.renders.length,0);
  }
  console.log("Leader withdrawal: explicit waiver, no deletion, participants preserved, cancel/error/closure/permissions/concurrency/scope changes verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
