"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/livepalmes-admin-portal.js'),'utf8');
const code=source.slice(source.indexOf('  function renderQualificationAlert('),source.indexOf('  function updateEngagementManualEntryTimeField('));
const element=()=>({children:[],dataset:{},append(...children){this.children.push(...children);},prepend(child){this.children.unshift(child);},setAttribute(){},remove(){this.removed=true;}});
async function main(){
 let currentScope='meet:club',fail=false;const calls=[],mount=element();
 const context={selectedEngagementClubEntry:{napSource:true,napFingerprint:'old',qualificationAlert:{at:'date',reason:'test',removed:[]}},selectedEngagementCompetitionId:'meet',engagementClubEntryMutationQueue:Promise.resolve(),document:{createElement:element},qualificationExceptionContext:()=>currentScope,flushEngagementClubIndividualEntriesAutosave:async()=>{},renderEngagementClubEntries:()=>{throw new Error('Do not render stale data');},callFunction:async(name)=>{calls.push(name);if(fail)throw new Error('read failed');return{entry:{napSource:true,napFingerprint:'new',qualificationAlert:null}};}};
 context.queueEngagementClubEntryMutation=async options=>{assert.equal(options.renderScope,'entries');try{const result=await options.execute();context.selectedEngagementClubEntry=result.entry;return true;}catch{return false;}};
 vm.createContext(context);vm.runInContext(code,context);
 context.renderQualificationAlert(mount);await mount.children[0].children[1].onclick();
 assert.deepEqual(calls,['acknowledgeEngagementQualificationAlert','getEngagementClubEntry']);
 assert.equal(context.selectedEngagementClubEntry.napFingerprint,'new');assert.equal(mount.children[0].removed,true);
 context.selectedEngagementClubEntry.qualificationAlert={at:'next',removed:[]};context.renderQualificationAlert(mount);fail=true;
 await mount.children[0].children[1].onclick();assert.notEqual(mount.children[0].removed,true,'A failed refresh keeps the alert available for retry');
 fail=false;context.renderQualificationAlert(mount);currentScope='other';const before=calls.length;
 await mount.children[0].children[1].onclick();assert.equal(calls.length,before,'A changed dossier cannot acknowledge another club alert');
 console.log('NAP qualification alert UI: serialized acknowledgement, fresh fingerprint, failed refresh and changed scope checked');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
