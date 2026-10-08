"use strict";
// Pure recovery plan for a confirmed MyISAM page. Never restore a disappeared
// course or overwrite a concurrent club correction. Writes remain separate.
const {isDeepStrictEqual}=require('node:util');
const {prepare}=require('./nap-qualification-preview-store');
const jobs=require('./nap-qualification-jobs');
function applicationPlan(input,saved,current){
  const job=jobs.validate(input.previous,input);
  if(job.state!=='apply'||!job.payload.applyStarted||input.confirmed!==true)throw new TypeError('Application confirmee requise.');
  // Reuse preview integrity checks, including exact kept/removed partition.
  prepare({...input,previous:{...job,state:'preview',cursor:saved.previousCursor}}, {items:saved.items,cursor:saved.nextCursor,finished:saved.finished});
  if(saved.parentId!==job.id||!Array.isArray(current)||current.length!==saved.items.length)throw new TypeError('Dossiers du controle incomplets.');
  const writes=[];let applied=0;
  for(const item of saved.items){
    const rows=current.filter(row=>row.before?.swimmerId===item.before.swimmerId);
    if(rows.length!==1)throw new TypeError('Dossier natif absent ou ambigu.');
    const actual=rows[0];
    for(const key of ['swimmerId','clubId','birthDate','sex','inscriptionId'])if(actual.before[key]!==item.before[key])throw new TypeError('Identite ou club modifie pendant le controle.');
    if(!Array.isArray(actual.before.entries)||new Set(actual.before.entries.map(row=>row.nativeId)).size!==actual.before.entries.length)throw new TypeError('Courses natives ambigues.');
    if(actual.before.entries.some(row=>!item.before.entries.some(old=>old.nativeId===row.nativeId)))throw new TypeError('Une course a ete ajoutee pendant le controle.');
    // Caller evaluates the original course list against fresh grouped history.
    // A changed sporting proof requires a fresh preview and confirmation.
    if(!isDeepStrictEqual(actual.evaluation,item.evaluation)||!isDeepStrictEqual(actual.targetTimes,item.targetTimes))return {restart:true,writes:[],applied:0};
    for(const original of item.before.entries){
      const row=actual.before.entries.find(value=>value.nativeId===original.nativeId);
      const removed=item.removed.some(value=>value.nativeId===original.nativeId);
      const target=item.targetTimes.find(value=>value.nativeId===original.nativeId);
      if(!row){if(!removed)throw new TypeError('Une course conservee a disparu pendant le controle.');applied++;continue;}
      if(row.eventCode!==original.eventCode)throw new TypeError('Une course a ete modifiee pendant le controle.');
      if(!removed&&row.nativeTime===target.tps){if(row.nativeTime!==original.nativeTime)applied++;continue;}
      if(row.nativeTime!==original.nativeTime)throw new TypeError('Un temps a ete corrige pendant le controle.');
      writes.push({kind:removed?'delete':'update',before:original,inscriptionId:item.before.inscriptionId,swimmerId:item.before.swimmerId,clubId:item.before.clubId,...(!removed?{tps:target.tps}:{})});
    }
  }
  return {restart:false,writes,applied};
}
function restartStatement(input){
  const job=jobs.validate(input.previous,input),generation=job.payload.generation??0;
  if(job.state!=='apply'||!Number.isSafeInteger(generation)||generation<0)throw new TypeError('Reprise du controle invalide.');
  const payload={...job.payload,generation:generation+1,pageIds:[],count:0,applyPage:0,applyStarted:true};
  return jobs.transitionStatement(job,{...input,state:'preview',cursor:'',payload});
}
module.exports={applicationPlan,restartStatement};
