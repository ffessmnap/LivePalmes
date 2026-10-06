"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const start=source.indexOf("  async function setEngagementClubPersonStatus(");
const end=source.indexOf("\n  async function loadEngagementCompetitions(",start);
let calls=[],reply,confirm=true;
const initial={id:"nap-official-7",firstName:"Nom",lastName:"Ancien",active:true,napSource:true,napFingerprint:"before"};
const sandbox={global:{confirm:()=>confirm},engagementClubPeople:[{...initial}],engagementClubPeopleRequestVersion:0,activeEngagementsDetailTab:"team",elements:{engagementsClubPeopleStatus:{dataset:{}}},
  renderEngagementClubPeople:()=>{},renderEngagementClubTeamPersonOptions:()=>{},renderEngagementClubOfficials:()=>{},
  loadEngagementClubPeople:()=>{throw Error("No unnecessary directory reload after native reply");},
  callFunction:async(name,input)=>{calls.push({name,input:JSON.parse(JSON.stringify(input))});return typeof reply==="function"?reply():reply;}};
vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
(async()=>{
  confirm=false;await sandbox.setEngagementClubPersonStatus(initial.id,false);assert.equal(calls.length,0);confirm=true;
  reply={source:"nap",person:{...initial,active:false,napFingerprint:"after"}};
  await sandbox.setEngagementClubPersonStatus(initial.id,false);assert.deepEqual(calls[0],{name:"setEngagementClubPersonStatus",input:{personId:initial.id,active:false,expectedFingerprint:"before"}});assert.equal(sandbox.engagementClubPeople[0].active,false);
  let finish;reply=()=>new Promise(resolve=>{finish=resolve;});const pending=sandbox.setEngagementClubPersonStatus(initial.id,true);await Promise.resolve();await sandbox.setEngagementClubPersonStatus(initial.id,true);assert.equal(calls.length,2,"second click does not duplicate a pending write");
  sandbox.engagementClubPeopleRequestVersion++;sandbox.engagementClubPeople=[];finish({source:"nap",person:initial});await pending;assert.equal(sandbox.engagementClubPeople.length,0,"previous club response cannot restore a person");
  sandbox.engagementClubPeople=[{...initial}];reply=()=>{throw Error("Stale native identity");};await sandbox.setEngagementClubPersonStatus(initial.id,false);assert.equal(sandbox.engagementClubPeople[0].active,true);assert.equal(sandbox.engagementClubPeople[0].statusSaving,undefined);assert.match(sandbox.elements.engagementsClubPeopleStatus.textContent,/Stale native identity/);
  console.log("Statut personnes UI : confirmation, empreinte native, mise a jour sans relecture, double clic et reponse tardive apres changement de club verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
