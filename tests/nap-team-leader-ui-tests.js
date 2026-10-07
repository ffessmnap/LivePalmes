"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const field=value=>({value,required:true,disabled:true,label:{hidden:false},closest(){return this.label;}});
const elements={engagementsClubTeamForm:{querySelectorAll:()=>[],checkValidity:()=>true},engagementsClubTeamPersonFields:{dataset:{}},engagementsClubTeamFirstName:field("Chef"),engagementsClubTeamLastName:field("CORRIGE"),engagementsClubTeamBirthDate:field("1980-01-02"),engagementsClubTeamLicense:field("OLD-LICENCE"),engagementsClubTeamSex:field(""),engagementsClubTeamExternal:field(""),engagementsClubTeamSaveButton:field(""),engagementsClubTeamMessage:{dataset:{}}};
const calls=[];
elements.engagementsClubTeamModifyButton=field("");
elements.engagementsClubTeamNativePersonCreate=field("");
elements.engagementsClubTeamRemoveButton=field("");
elements.engagementsClubTeamExternal.closest=()=>null;
const hiddenRadio={closest:()=>null,hidden:true};
elements.engagementsClubTeamChoices={querySelectorAll:()=>[hiddenRadio]};
const sandbox={elements,global:{LivePalmesEnvironment:{isTest:true}},engagementClubPersonSaving:false,selectedEngagementCompetitionId:"legacy-nap-5140",selectedEngagementCompetition:{nativeReadOnly:true,nativeTeamLeaderEditable:true,entryStatus:"open"},selectedEngagementClubEntry:{napFingerprint:"native-fingerprint",teamLeader:{nativeLeaderId:"51"}},canUse:()=>true,
  engagementClubWriteLockReason:competition=>competition.nativeReadOnly?"Native blocked":competition.entryStatus==="open"?"":"Closed",
  engagementClubTeamComplete:()=>true,engagementClubTeamEditing:false,engagementClubEntryHasParticipants:()=>true,
  setEngagementClubFormControlsLocked:()=>{[elements.engagementsClubTeamNativePersonCreate,elements.engagementsClubTeamModifyButton,elements.engagementsClubTeamRemoveButton,elements.engagementsClubTeamSaveButton].forEach(control=>{control.disabled=true;});},setEngagementClubTeamManualFieldsVisible:()=>{},setEngagementSaveState:()=>{},
  callFunction:async(name,input)=>{calls.push({name,input});return {competition:sandbox.selectedEngagementCompetition,entry:{teamLeader:{nativeLeaderId:"51"}}};},renderEngagementClubEntry:()=>{}};
vm.createContext(sandbox);
function load(name,async=false){const start=source.indexOf(`  ${async?"async ":""}function ${name}(`);assert.ok(start>=0);const tail=source.slice(start+10);const next=tail.search(/\n  (?:async )?function /);vm.runInContext(source.slice(start,start+10+next),sandbox);}
load("updateNativeCompetitionPersonCreationButton");load("updateEngagementClubTeamFormMode");load("updateEngagementClubTeamLeaderActions");load("saveEngagementClubTeamLeader",true);
sandbox.updateEngagementClubTeamLeaderActions();
assert.equal(elements.engagementsClubTeamNativePersonCreate.disabled,false,"creation stays enabled after locking native declaration fields");
assert.equal(elements.engagementsClubTeamModifyButton.disabled,false,"summary modify stays enabled after locking the other form controls");
assert.equal(elements.engagementsClubTeamRemoveButton.disabled,true);
sandbox.updateEngagementClubTeamFormMode();
assert.equal(hiddenRadio.hidden,true);
assert.equal(elements.engagementsClubTeamLicense.value,"");assert.equal(elements.engagementsClubTeamLicense.required,false);assert.equal(elements.engagementsClubTeamSex.required,false);
assert.equal(elements.engagementsClubTeamFirstName.disabled,false);assert.equal(elements.engagementsClubTeamBirthDate.required,false);assert.equal(elements.engagementsClubTeamSaveButton.disabled,false);
(async()=>{
  await sandbox.saveEngagementClubTeamLeader();assert.equal(calls.length,1);assert.equal(calls[0].name,"saveEngagementClubTeamLeader");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].input)),{competitionId:"legacy-nap-5140",leaderId:"51",expectedFingerprint:"native-fingerprint",patch:{firstName:"Chef",lastName:"CORRIGE",birthDate:"1980-01-02"}});
  sandbox.selectedEngagementCompetition.entryStatus="closed";sandbox.updateEngagementClubTeamLeaderActions();assert.equal(elements.engagementsClubTeamModifyButton.disabled,true);assert.equal(elements.engagementsClubTeamSaveButton.disabled,true);await sandbox.saveEngagementClubTeamLeader();assert.equal(calls.length,1);
  console.log("NAP leader UI: licence blank, native fields only, no old people call and closed form locked");
})().catch(error=>{console.error(error);process.exitCode=1;});
