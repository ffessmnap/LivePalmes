"use strict";
const assert=require('node:assert/strict');
const effects=require('../functions/nap-qualification-entry-effects');
const plan={competitionId:5162,clubId:'00106',plans:[{swimmerId:912,removals:[{course:'50BI'}]}]};
async function main(){
 let version=1,status='accepted',queries=0;const grant={competition_id:5162,swimmer_id:912,event_code:'50BI',club_id:'00106',status:'accepted',version:'1'};
 const connection={execute:async({sql},values)=>{
  queries++;if(sql.startsWith('SELECT')){assert.match(sql,/FORCE INDEX \(PRIMARY\).*LIMIT 65$/);assert.deepEqual(values,[5162,912]);return [[grant,{...grant,event_code:'100BI'}]];}
  assert.match(sql,/status='accepted'.*swimmer_id=\?.*event_code=\?.*version=\?/);assert.equal((sql.match(/\?/g)||[]).length,values.length);assert.deepEqual(values,['club',5162,912,'50BI','00106','1']);
  const affectedRows=status==='accepted'&&String(version)===values.at(-1)?1:0;if(affectedRows){status='revoked';version++;}return [{affectedRows}];
 }};
 const snapshot=await effects.prepare(connection,{plan});assert.equal(snapshot.grants.length,1,'Only removed courses, not other exceptions');
 const target={competitionId:5162,clubId:'00106',actorUid:'club',effects:snapshot};await effects.apply(connection,target);assert.equal(status,'revoked');await effects.apply(connection,target);assert.equal(version,2,'Retry does not repeat the effect');
 status='accepted';version=3;await effects.apply(connection,target);assert.equal(status,'accepted','A newer national decision survives replay of an old removal');
 const selected=await effects.prepare(connection,{plan:{competitionId:5162,clubId:'00106',removals:[{swimmer:{id:912},entries:[{course:'50BI'}]}]}});assert.deepEqual(selected,snapshot);
 const count=queries;assert.deepEqual(await effects.prepare(connection,{plan:{...plan,plans:[]}}),{grants:[]});assert.equal(queries,count);
 await assert.rejects(effects.apply(connection,{...target,clubId:'106'}),/hors du journal/);
 console.log('Removed native entry exceptions: grouped immutable witnesses, exact raw club scope, idempotent revocation and newer national decision preserved; offline.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
