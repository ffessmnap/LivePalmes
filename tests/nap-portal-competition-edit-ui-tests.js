"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const fields={name:{value:"Ancien nom"},date:{value:"2026-10-11"},endDate:{value:"2026-10-11"},location:{value:"Antibes"},deadline:{value:"2026-10-07T21:59:17"},poolLaneCount:{value:"8"},poolLength:{value:"50"},timingType:{value:"manual"},entryStatus:{value:"open"},officialsRequired:{value:"true"},maxEvents:{value:"0"}};
let fee={enabled:false,swimmerFee:0,individualEventFee:0,relayFee:0,helloAssoUrl:""},approved=true,program=[];
const calls=[];
const sandbox={nativeCompetitionEditBaseline:null,selectedEngagementCompetition:{id:"legacy-nap-5140",napFingerprint:"abc",napSource:true},elements:{engagementsSaveButton:{disabled:false},engagementsDetailStatus:{dataset:{}}},
  editCompetitionFields:()=>fields,selectedEngagementFeesFromForm:()=>({...fee}),selectedEngagementProgramSessionsFromForm:()=>structuredClone(program),global:{confirm:()=>approved},
  callFunction:async(name,input)=>{calls.push({name,input});return {competition:{id:input.competitionId,napSource:true}};},invalidateEngagementCalendarCaches:()=>{},loadEngagementCompetitions:async()=>{},upsertEngagementCalendarItemFromServer:()=>{},renderEngagementCompetitionDetail:()=>{},clearEngagementDetailTabDirty:()=>{},setEngagementEditMode:()=>{}};
vm.createContext(sandbox);
const start=source.indexOf("  function nativeCompetitionFormValues("),end=source.indexOf("\n  function ",source.indexOf("  async function saveNativeCompetitionDetail(",start)+10);
vm.runInContext(source.slice(start,end),sandbox);
const genderSandbox={selectedEngagementCompetition:{napSource:true,events:[{code:"50BI",type:"individual",nativeCourses:[{sexe:"F"}]}]},engagementEventDefinition:()=>({}),ENGAGEMENT_PROGRAM_GENDER_MODES:[["female","Femmes"],["male","Hommes"],["mixed","Ensemble"]],engagementProgramGenderModeDisplayLabel:mode=>mode};
vm.createContext(genderSandbox);
const genderStart=source.indexOf("  function engagementProgramGenderModesForEvent("),genderEnd=source.indexOf("  function engagementProgramGenderModeShortLabel(",genderStart);
vm.runInContext(source.slice(genderStart,genderEnd),genderSandbox);
assert.deepEqual(Array.from(genderSandbox.engagementProgramGenderModesForEvent("50BI"),row=>row[0]),["female"]);
genderSandbox.selectedEngagementCompetition.events[0].nativeCourses.push({sexe:"M"});
assert.deepEqual(Array.from(genderSandbox.engagementProgramGenderModesForEvent("50BI"),row=>row[0]),["female","male","mixed"]);
genderSandbox.selectedEngagementCompetition.events=[{code:"4X100BI",type:"relay",nativeCourses:[{sexe:"0"}]}];
assert.deepEqual(Array.from(genderSandbox.engagementProgramGenderModesForEvent("4X100BI"),row=>row[0]),["mixed"]);
genderSandbox.selectedEngagementCompetition.napSource=false;
assert.equal(genderSandbox.engagementProgramGenderModesForEvent("50BI").length,3);
(async()=>{
  sandbox.selectedEngagementCompetition.nativeParameters={saisie:1,qualif:0};
  fields.missingEntryTimeMode={value:""};
  sandbox.nativeCompetitionEditBaseline=sandbox.nativeCompetitionFormValues();
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.nativeCompetitionPatchFromForm())),{},"An unconfigured native choice must not silently become manual");
  fields.missingEntryTimeMode.value="manual";
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.nativeCompetitionPatchFromForm())),{missingEntryTimeMode:"manual"},"The explicit manual choice must persist even when it was the old UI default");
  sandbox.nativeCompetitionEditBaseline=sandbox.nativeCompetitionFormValues();
  assert.equal(sandbox.nativeCompetitionEditBaseline.entryDeadlineLocal,"2026-10-07 21:59:17");
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.nativeCompetitionPatchFromForm())),{});
  fields.name.value="Nom corrige";
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.nativeCompetitionPatchFromForm())),{name:"Nom corrige"});
  // A name change must never submit defaults for missing NAP options or a rounded deadline.
  await sandbox.saveNativeCompetitionDetail();assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].input.patch)),{name:"Nom corrige"});
  assert.equal(calls[0].input.expectedFingerprint,"abc");assert.equal(calls[0].name,"updateEngagementCompetition");
  sandbox.selectedEngagementCompetition={id:"legacy-nap-5140",napFingerprint:"next"}; sandbox.nativeCompetitionEditBaseline=sandbox.nativeCompetitionFormValues();
  fields.entryStatus.value="closed";approved=false;await sandbox.saveNativeCompetitionDetail();assert.equal(calls.length,1);
  approved=true;await sandbox.saveNativeCompetitionDetail();assert.deepEqual(JSON.parse(JSON.stringify(calls[1].input.patch)),{entryStatus:"closed"});
  sandbox.nativeCompetitionEditBaseline=sandbox.nativeCompetitionFormValues();fee={...fee,enabled:true,swimmerFee:1.25};
  assert.deepEqual(Object.keys(sandbox.nativeCompetitionPatchFromForm()),["fees"]);
  sandbox.nativeCompetitionEditBaseline=sandbox.nativeCompetitionFormValues();program=[{id:"session-1",date:"2026-10-11",startTime:"09:00",items:[]}];
  assert.deepEqual(Object.keys(sandbox.nativeCompetitionPatchFromForm()),["programSessions"]);
  assert.equal(sandbox.elements.engagementsSaveButton.disabled,false);
  assert.ok(!source.slice(start,end).includes("updateCompetitionWithQualifications"));
  console.log("Formulaire NAP : champs touches seuls, delai exact, fermeture confirmee et aucun ancien controle destructif verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
