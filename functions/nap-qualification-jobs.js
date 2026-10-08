"use strict";
// Native persistence primitives for the existing preview/confirm/apply workflow.
// No entry is changed here; callers supply separately verified sporting plans.
const {positiveId}=require('./nap-direct-calendar');
const states=new Set(['preview','ready','apply','done','cancelled']);
function scope(input){
  if(input.national!==true||typeof input.actorUid!=='string'||!input.actorUid.trim()||input.actorUid.length>128||!/^[a-f0-9]{64}$/.test(input.jobId))throw new TypeError('Controle national requis.');
  return {id:input.jobId,competitionId:positiveId(input.competitionId)};
}
function payload(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Plan de controle invalide.');
  const text=JSON.stringify(value);
  if(Buffer.byteLength(text)>500000)throw new RangeError('Plan de controle trop volumineux : traitement pagine requis.');
  return text;
}
function validate(row,input){
  const expected=scope(input);
  if(row.id!==expected.id||Number(row.competition_id)!==expected.competitionId||!states.has(row.state)||typeof row.cursor!=='string'||row.cursor.length>128||!/^[1-9][0-9]*$/.test(String(row.version)))throw new TypeError('Controle NAP incompatible.');
  const value=typeof row.payload==='string'?JSON.parse(row.payload):row.payload;payload(value);
  if(row.state==='apply'&&!value.applyStarted)throw new TypeError('Confirmation du controle absente.');
  return {...row,payload:value};
}
async function readJob(connection,input){
  const expected=scope(input);
  const [rows]=await connection.execute({sql:'SELECT id,competition_id,actor_uid,state,payload,cursor,version,created_at,updated_at FROM livepalmes_qualification_jobs WHERE id=? LIMIT 1',timeout:10000},[expected.id]);
  return rows.length?validate(rows[0],input):null;
}
function transitionStatement(row,input){
  const before=validate(row,input);
  if(!states.has(input.state)||typeof input.cursor!=='string'||input.cursor.length>128||!/^[0-9T:.Z -]{19,32}$/.test(input.now||''))throw new TypeError('Avancement de controle invalide.');
  const next=input.payload;
  const allowed={preview:['preview','ready','cancelled'],ready:['apply','cancelled'],apply:['apply','preview','done'],done:[],cancelled:[]};
  if(!allowed[before.state].includes(input.state))throw new TypeError('Transition de controle interdite.');
  if(input.state==='cancelled'&&before.payload.applyStarted)throw new TypeError('Application commencee : reprenez le controle.');
  if(before.state==='ready'&&input.state==='apply'&&(input.confirmed!==true||next?.applyStarted!==true||next.confirmedBy!==input.actorUid||input.cursor!==''))throw new TypeError('Confirmation nationale requise avant application.');
  if(before.payload.applyStarted&&next?.applyStarted!==true)throw new TypeError('Historique de confirmation perdu.');
  return {sql:'UPDATE livepalmes_qualification_jobs SET state=?,payload=?,cursor=?,version=version+1,updated_at=? WHERE id=? AND competition_id=? AND state=? AND version=? AND BINARY cursor=BINARY ? LIMIT 1',values:[input.state,payload(next),input.cursor,input.now,before.id,Number(before.competition_id),before.state,String(before.version),before.cursor]};
}
module.exports={scope,payload,validate,readJob,transitionStatement};
