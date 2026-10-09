"use strict";
// Page records reuse the approved native jobs table with state='page'. They
// never count as active controls. One transaction persists the immutable page
// and advances its parent together; no engagement or grid is written here.
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {matches}=require('./nap-qualification-source-hash');
const jobs=require('./nap-qualification-jobs');
const {cursor}=require('./nap-qualification-preview-page');
function prepare(input,page){
  jobs.scope(input);
  const relay=page.kind==='relay',parseCursor=relay?require('./nap-qualification-relay-preview').cursor:cursor;
  parseCursor(input.previous.cursor);
  const previous=jobs.validate(input.previous,input);
  if(previous.state!=='preview'||!Array.isArray(page.items)||page.items.length>(relay?20:5)||typeof page.finished!=='boolean'||typeof page.cursor!=='string'||(page.finished&&page.cursor!==''))throw new TypeError('Page de controle invalide.');
  if(!page.finished){const next=parseCursor(page.cursor),before=parseCursor(previous.cursor);if(relay?(page.cursor===previous.cursor||!page.cursor):next.swimmerId<=before.swimmerId)throw new TypeError('Le controle ne progresse pas.');}
  const seen=new Set();let removed=0;
  for(const item of page.items){
    if(relay){
      const before=item?.before;
      if(!before||!Number.isSafeInteger(before.relayId)||before.relayId<=0||seen.has(before.relayId)||typeof item.remove!=='boolean'||!Array.isArray(before.members)||before.members.length>6||Number(before.entry?.id)!==before.relayId||Number(before.entry?.compet)!==Number(input.competitionId)||String(before.entry?.club)!==before.clubId||before.members.some(member=>Number(member.relais)!==before.relayId)||!matches(before,item.sourceHash,true))throw new TypeError('Relais sauvegarde incompatible.');
      seen.add(before.relayId);removed+=item.remove?1:0;continue;
    }
    if(!item?.before||!/^[a-f0-9]{64}$/.test(item.sourceHash)||!Array.isArray(item.entries)||!Array.isArray(item.removed)||seen.has(item.before.swimmerId))throw new TypeError('Resultat de controle incomplet.');
    if(!matches(item.before,item.sourceHash))throw new TypeError('Empreinte du dossier incompatible.');
    const original=item.before.entries,partition=[...item.entries,...item.removed];
    if(!Array.isArray(original)||original.length>300||partition.length!==original.length||new Set(partition.map(row=>row.nativeId)).size!==partition.length||!isDeepStrictEqual([...original].sort((a,b)=>a.nativeId-b.nativeId),partition.sort((a,b)=>a.nativeId-b.nativeId)))throw new TypeError('Courses conservees ou retirees incompatibles avec le dossier.');
    if(!Array.isArray(item.targetTimes)||item.targetTimes.length!==item.entries.length||new Set(item.targetTimes.map(row=>row.nativeId)).size!==item.entries.length||item.targetTimes.some(row=>!item.entries.some(entry=>entry.nativeId===row.nativeId)||typeof row.tps!=='string'||!/^\d{1,6}$/.test(row.tps)||row.tps!=='599999'&&Number(row.tps.slice(-4,-2)||0)>59))throw new TypeError('Temps automatiques du controle incomplets ou incompatibles.');
    seen.add(item.before.swimmerId);removed+=item.removed.length;
  }
  const generation=previous.payload.generation??0;
  if(!Number.isSafeInteger(generation)||generation<0)throw new TypeError('Generation du controle invalide.');
  const id=createHash('sha256').update(JSON.stringify([input.jobId,generation,relay?'relay':'individual',previous.cursor])).digest('hex');
  const value=JSON.parse(jobs.payload({parentId:input.jobId,kind:relay?'relay':'individual',previousCursor:previous.cursor,nextCursor:page.cursor,finished:page.finished,items:page.items}));
  const pageIds=previous.payload.pageIds||[];
  if(!Array.isArray(pageIds)||pageIds.length>=1000||pageIds.some(id=>!/^[a-f0-9]{64}$/.test(id))||new Set(pageIds).size!==pageIds.length)throw new RangeError('Controle trop volumineux ou pages ambigues.');
  const count=previous.payload.count;
  if(!Number.isSafeInteger(count)||count<0)throw new TypeError('Compteur de controle invalide.');
  const nextPayload={...previous.payload,pageIds:[...pageIds,id],count:count+removed};
  if(input.includeRelays&&!relay){
    nextPayload.phase=page.finished?'relay':'individual';
  }
  jobs.payload(nextPayload);
  const nextState=page.finished&&(!input.includeRelays||relay)?'ready':'preview';
  return {id,value,nextPayload,previous,nextState};
}
async function savePage(connection,input,page){
  const target=prepare(input,page);let started=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try{
    await connection.beginTransaction();started=true;
    const rows=await query('SELECT id,competition_id,actor_uid,state,payload,`cursor`,version,created_at,updated_at FROM livepalmes_qualification_jobs WHERE id=? LIMIT 1 FOR UPDATE',[input.jobId]);
    if(rows.length!==1)throw new TypeError('Controle NAP introuvable.');
    const current=jobs.validate(rows[0],input);
    const saved=await query("SELECT id,competition_id,state,payload FROM livepalmes_qualification_jobs WHERE id=? LIMIT 1",[target.id]);
    if(saved.length){
      const value=typeof saved[0].payload==='string'?JSON.parse(saved[0].payload):saved[0].payload;
      if(Number(saved[0].competition_id)!==Number(current.competition_id)||saved[0].state!=='page'||!isDeepStrictEqual(value,target.value)||!current.payload.pageIds?.includes(target.id))throw new TypeError('Page sauvegardee incompatible.');
      await connection.commit();started=false;return {state:current.state,count:current.payload.count,cursor:current.cursor,resumed:true};
    }
    if(String(current.version)!==String(target.previous.version)||current.cursor!==target.previous.cursor||current.state!=='preview'||!isDeepStrictEqual(current.payload,target.previous.payload))throw new TypeError('Le controle a change. Rechargez son avancement.');
    const inserted=await query("INSERT INTO livepalmes_qualification_jobs (id,competition_id,actor_uid,state,payload,`cursor`,version,created_at,updated_at) VALUES (?,?,?,'page',?,'',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[target.id,Number(current.competition_id),input.actorUid,jobs.payload(target.value)]);
    if(Number(inserted.affectedRows)!==1)throw new Error('Sauvegarde de page incomplete.');
    const next=jobs.transitionStatement(current,{...input,state:target.nextState,cursor:page.cursor,payload:target.nextPayload});
    if(Number((await query(next.sql,next.values)).affectedRows)!==1)throw new TypeError('Avancement concurrent du controle.');
    await connection.commit();started=false;
    return {state:target.nextState,count:target.nextPayload.count,cursor:page.cursor,resumed:false};
  }finally{if(started)await connection.rollback();}
}
module.exports={prepare,savePage};
