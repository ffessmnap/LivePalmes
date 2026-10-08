"use strict";
const assert=require('node:assert/strict');
const {effects,acknowledge}=require('../functions/nap-qualification-effects');
const input={national:true,confirmed:true,actorUid:'national',competitionId:5162,jobId:'a'.repeat(64),now:'2026-10-08 20:00:00.000000',removed:[{club:'00106',swimmerIndexId:'912',eventCode:'50BI'}]};
function fixture(){let metadata={relays:{3:{category:'S'}},other:'preserved'},version=1,grants=0,commits=0,rollbacks=0,backup;
 const connection={beginTransaction:async()=>{backup=structuredClone(metadata);},commit:async()=>commits++,rollback:async()=>{metadata=backup;rollbacks++;},execute:async(statement,values)=>{
  assert.equal((statement.sql.match(/\?/g)||[]).length,values.length);
  if(statement.sql.startsWith('UPDATE livepalmes_qualification_grants')){assert.ok(values.includes('00106'),'Grant club VARCHAR is preserved exactly');grants++;return [{affectedRows:1}];}
  if(statement.sql.startsWith('SELECT competition_id'))return [[{competition_id:5162,club_id:106,submission_metadata:JSON.stringify(metadata)}]];
  if(statement.sql.startsWith('INSERT')){assert.equal(values[1],106,'Dossier INT club is canonicalized without changing the grant');metadata=JSON.parse(values[2]);version++;return [{affectedRows:2}];}
  if(statement.sql.startsWith('SELECT submission_metadata'))return [[{submission_metadata:metadata,version}]];
  if(statement.sql.startsWith('UPDATE livepalmes_club_entry_options')){metadata=JSON.parse(values[0]);version++;return [{affectedRows:1}];}
  throw Error('Unexpected query');
 }};return {connection,metadata:()=>metadata,counts:()=>({grants,commits,rollbacks})};}
async function main(){
 const f=fixture();await effects(f.connection,input);assert.equal(f.metadata().other,'preserved');assert.deepEqual(f.metadata().relays,{3:{category:'S'}});assert.equal(f.metadata().qualificationAlert.removed.length,1);assert.equal(f.counts().grants,1);
 await effects(f.connection,{...input,removed:[{club:'106',relayId:3,eventCode:'Relais 3'}]});assert.equal(f.metadata().qualificationAlert.removed.length,2,'Later pages retain the first impact within the same job');assert.equal(f.counts().grants,1,'Relay impact never revokes a swimmer exception');
 const auth={...input,clubId:'00106',alertAt:input.now,authorize:()=>{}};await assert.rejects(acknowledge(f.connection,{...auth,alertAt:'old'}),/nouvelle alerte/);assert.equal(f.metadata().qualificationAlert.removed.length,2);
 await acknowledge(f.connection,auth);assert.equal(f.metadata().qualificationAlert,null);assert.equal(f.metadata().qualificationAlertAcknowledged.alertAt,input.now);assert.equal(f.metadata().other,'preserved');
 const denied=fixture();await assert.rejects(effects(denied.connection,{...input,national:false}));assert.equal(denied.counts().grants,0);
 console.log('NAP qualification effects: grouped grants and alerts, raw/canonical club distinctions, preserved unrelated metadata, stale acknowledgement refusal and atomic supplemental recovery; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
