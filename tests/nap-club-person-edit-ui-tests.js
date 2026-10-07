"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const field=(value="")=>({value,required:true,matches:()=>false,focus:()=>{}});
const item={id:"nap-official-7",napSource:true,nativeIdentityEditable:true,napFingerprint:"before",firstName:"Arnaud",lastName:"Ancien",birthDate:"1980-01-03",licenseNumber:"must-not-copy",roles:{teamLeader:true,official:true}};
let calls=[],reply;
const elements={engagementsClubPersonForm:{dataset:{},hidden:true,checkValidity:()=>true,querySelector:()=>({})},engagementsClubPersonMessage:{dataset:{}}};
for(const name of ["Id","FirstName","LastName","BirthDate","Sex","License","SwimmerId","SwimmerSource","RoleTeamLeader","RoleOfficial","SwimmerSearch","SwimmerResults"]) elements[`engagementsClubPerson${name}`]=field();
elements.engagementsClubPersonSex.matches=()=>true;
const sandbox={global:{LivePalmesEnvironment:{isTest:true},crypto:{randomUUID:()=>"11111111-1111-4111-8111-111111111111"}},elements,engagementClubPeople:[{...item}],engagementClubPeopleRequestVersion:0,engagementClubSwimmersLoaded:false,activeEngagementsDetailTab:"team",
  engagementClubPersonSaving:false,engagementClubPersonFormHome:null,closeEngagementClubPersonDialog:()=>{},canUse:()=>true,resetEngagementClubPersonForm:()=>{},loadEngagementClubSwimmers:()=>{throw Error("No unnecessary swimmer reads");},renderEngagementClubPersonSwimmerOptions:()=>{},renderEngagementClubPeople:()=>{},renderEngagementClubTeamPersonOptions:()=>{},renderEngagementClubOfficials:()=>{},loadEngagementClubPeople:()=>{throw Error("No directory reload after native reply");},
  callFunction:async(name,input)=>{calls.push({name,input:JSON.parse(JSON.stringify(input))});return typeof reply==="function"?reply():reply;}};
vm.createContext(sandbox);
vm.runInContext("let engagementClubPersonFormHome=null;"+source.slice(source.indexOf("  function closeEngagementClubPersonDialog()"),source.indexOf("  function resetEngagementClubPersonForm()")),sandbox);
for(const [startName,endName] of [["  function openEngagementClubPersonForm(","\n  function selectedEngagementClubPersonFromForm("],["  async function saveEngagementClubPerson(","\n  async function setEngagementClubPersonStatus("]]) {
  const start=source.indexOf(startName);vm.runInContext(source.slice(start,source.indexOf(endName,start)),sandbox);
}
(async()=>{
  sandbox.openEngagementClubPersonForm(null);assert.equal(elements.engagementsClubPersonForm.hidden,false);assert.equal(elements.engagementsClubPersonForm.dataset.napCreationId,"11111111-1111-4111-8111-111111111111");assert.equal(elements.engagementsClubPersonRoleOfficial.disabled,false);
  sandbox.openEngagementClubPersonForm(item);assert.equal(elements.engagementsClubPersonForm.hidden,false);assert.equal(elements.engagementsClubPersonForm.dataset.napFingerprint,"before");
  assert.equal(elements.engagementsClubPersonLicense.value,"");assert.equal(elements.engagementsClubPersonLicense.readOnly,true);assert.equal(elements.engagementsClubPersonLicense.required,false);assert.equal(elements.engagementsClubPersonSex.disabled,true);assert.equal(elements.engagementsClubPersonRoleOfficial.disabled,true);assert.equal(elements.engagementsClubPersonSwimmerSearch.disabled,true);
  elements.engagementsClubPersonLastName.value="Correct";
  reply={source:"nap",person:{...item,lastName:"Correct",napFingerprint:"after",licenseNumber:""}};await sandbox.saveEngagementClubPerson();
  assert.deepEqual(calls[0],{name:"saveEngagementClubPerson",input:{personId:item.id,expectedFingerprint:"before",patch:{firstName:item.firstName,lastName:"Correct",birthDate:item.birthDate}}});assert.equal(sandbox.engagementClubPeople[0].napFingerprint,"after");assert.equal(elements.engagementsClubPersonForm.hidden,true);
  sandbox.openEngagementClubPersonForm(sandbox.engagementClubPeople[0]);let finish;reply=()=>new Promise(resolve=>{finish=resolve;});const pending=sandbox.saveEngagementClubPerson();await Promise.resolve();sandbox.engagementClubPeopleRequestVersion++;sandbox.engagementClubPersonSaving=false;elements.engagementsClubPersonForm.inert=false;sandbox.engagementClubPeople=[];finish({source:"nap",person:item});await pending;assert.equal(sandbox.engagementClubPeople.length,0);
  sandbox.openEngagementClubPersonForm(null);elements.engagementsClubPersonId.value="";
  elements.engagementsClubPersonFirstName.value="Nouveau";elements.engagementsClubPersonLastName.value="Chef";elements.engagementsClubPersonBirthDate.value="1980-01-03";
  elements.engagementsClubPersonRoleTeamLeader.checked=true;elements.engagementsClubPersonRoleOfficial.checked=false;
  const creationId=elements.engagementsClubPersonForm.dataset.napCreationId;
  reply=()=>{throw Error("Interruption");};await sandbox.saveEngagementClubPerson();assert.equal(elements.engagementsClubPersonForm.dataset.napCreationId,creationId);
  reply={source:"nap",person:{...item,id:"nap-official-99",roles:{teamLeader:true,official:false},licenseNumber:""}};await sandbox.saveEngagementClubPerson();
  assert.deepEqual(calls.at(-1).input,{creationId,person:{firstName:"Nouveau",lastName:"Chef",birthDate:"1980-01-03",roles:{teamLeader:true,official:false}}});assert.equal(sandbox.engagementClubPeople[0].id,"nap-official-99");
  assert.equal(elements.engagementsClubPersonForm.hidden,true);
  sandbox.openEngagementClubPersonForm(null);elements.engagementsClubPersonId.value="";
  let reject;reply=()=>new Promise((resolve,fail)=>{reject=fail;});const oldCreation=sandbox.saveEngagementClubPerson();await Promise.resolve();sandbox.engagementClubPeopleRequestVersion++;sandbox.engagementClubPersonSaving=false;elements.engagementsClubPersonForm.inert=false;
  elements.engagementsClubPersonMessage.textContent="Nouveau club";reject(Error("Ancien club"));await oldCreation;assert.equal(elements.engagementsClubPersonMessage.textContent,"Nouveau club");
  sandbox.openEngagementClubPersonForm(null);elements.engagementsClubPersonId.value="";
  let saved;reply=()=>new Promise(resolve=>{saved=resolve;});const beforeCalls=calls.length;
  const inFlight=sandbox.saveEngagementClubPerson();await Promise.resolve();assert.equal(sandbox.engagementClubPersonSaving,true);assert.equal(elements.engagementsClubPersonForm.inert,true);
  sandbox.openEngagementClubPersonForm(item);assert.equal(elements.engagementsClubPersonId.value,"");await sandbox.saveEngagementClubPerson();assert.equal(calls.length,beforeCalls+1);
  saved({source:"nap",person:{...item,id:"nap-official-100",licenseNumber:""}});await inFlight;assert.equal(sandbox.engagementClubPersonSaving,false);assert.equal(elements.engagementsClubPersonForm.inert,false);
  let restored=false,shown=false,closed=false;
  const home={insertBefore:(form,next)=>{assert.equal(form,elements.engagementsClubPersonForm);assert.equal(next,"next");restored=true;}};
  elements.engagementsClubPersonForm.parentNode=home;elements.engagementsClubPersonForm.nextSibling="next";
  elements.engagementsClubPersonDialog={append:form=>assert.equal(form,elements.engagementsClubPersonForm),showModal:()=>{shown=true;},close:()=>{closed=true;}};
  sandbox.openNativeCompetitionPersonCreation();assert.equal(shown,true);assert.equal(elements.engagementsClubPersonRoleTeamLeader.checked,true);assert.equal(elements.engagementsClubPersonRoleOfficial.checked,false);
  sandbox.closeEngagementClubPersonDialog();assert.equal(closed,true);assert.equal(restored,true);assert.equal(elements.engagementsClubPersonForm.hidden,true);
  console.log("Correction officiel UI : formulaire natif, licence vide, roles conserves, empreinte et aucune relecture/donnee tardive du precedent club.");
})().catch(error=>{console.error(error);process.exitCode=1;});
