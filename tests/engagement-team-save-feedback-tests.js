"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const s=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8"),start=s.indexOf("  async function saveEngagementClubTeamLeader(");
const code=s.slice(start,s.indexOf("  async function removeEngagementClubTeamLeader(",start));
(async()=>{
for(const fail of [false,true]){
let finish;const pending=new Promise((resolve,reject)=>{finish=()=>fail?reject(Error("Server failure")):resolve({competition:{nativeReadOnly:true,nativeTeamLeaderEditable:true},entry:{confirmed:true}});});
const attrs=new Map(),states=[],renders=[],message={textContent:"",dataset:{}};
const c={engagementClubTeamSaving:false,selectedEngagementCompetitionId:"fixture",selectedEngagementCompetition:{nativeReadOnly:true,nativeTeamLeaderEditable:true},selectedEngagementClubEntry:{teamLeader:{nativeLeaderId:1},napFingerprint:"fixture"},canUse:()=>true,activeEngagementClubProfile:()=>({clubId:"106"}),engagementClubWriteLockReason:()=>"",updateEngagementClubTeamFormMode:()=>{},elements:{engagementsClubTeamForm:{checkValidity:()=>true,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),querySelector:()=>({value:"person"})},engagementsClubTeamMessage:message,engagementsClubTeamFirstName:{value:"Test"},engagementsClubTeamLastName:{value:"Chef"},engagementsClubTeamBirthDate:{value:"1980-01-01"}},setEngagementClubFormControlsLocked:()=>{},setEngagementSaveState:x=>states.push(x),callFunction:()=>pending,renderEngagementClubEntry:e=>renders.push(e),renderEngagementClubTeamPersonOptions:()=>{},updateEngagementClubTeamLeaderActions:()=>{}};
vm.createContext(c);vm.runInContext(code,c);const result=c.saveEngagementClubTeamLeader();assert.equal(attrs.get("aria-busy"),"true");assert.match(message.textContent,/Test Chef/);assert.equal(renders.length,0);assert.equal(await c.saveEngagementClubTeamLeader(),false);finish();assert.equal(await result,!fail);assert.equal(attrs.has("aria-busy"),false);assert.equal(renders.length,fail?0:1);assert.equal(states.at(-1),fail?"error":"saved");
}
console.log("Team leader feedback: pending server, duplicate prevention, confirmed rendering and error verified without network");
})().catch(e=>{console.error(e);process.exitCode=1;});
