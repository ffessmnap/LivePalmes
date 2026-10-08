"use strict";
// Existing LP course settings, in the approved NAP supplement. Budget: one
// grouped locked read, two grouped writes and one verification (<=300 rows).
const {isDeepStrictEqual}=require('node:util');
const columns=require('./nap-approved-portal-schema').tables[1].columns.map(row=>row.name);
const normalize=rows=>rows.map(row=>Object.fromEntries(columns.map(key=>[key,key==='category_restrictions'&&typeof row[key]==='string'?JSON.parse(row[key]):row[key]]))).sort((a,b)=>a.event_code.localeCompare(b.event_code));
function plan(pack,raw,input,now){
  if(!Array.isArray(raw)||raw.length>80||typeof input.normalizeEvents!=='function')throw new TypeError('Reglages de courses LivePalmes requis.');
  const events=require('./nap-portal-workspaces').competitionItem(pack,input.eventDefinitions).events;
  const known=new Map(events.filter(event=>event.nativeRecognized).map(event=>[event.code,event]));
  const seen=new Set();
  if(raw.some(row=>!known.has(row?.code)||seen.has(row.code)||!seen.add(row.code)))throw new TypeError('Course absente ou dupliquee.');
  const cleaned=input.normalizeEvents(raw,{competitionType:pack.event.competitionType,strict:true});
  if(cleaned.length!==raw.length)throw new TypeError('Reglages de courses incomplets.');
  const before=normalize(pack.courseOptions),after=structuredClone(before);
  for(const event of cleaned){
    const previous=before.find(row=>row.event_code===event.code);
    const settings={category_restrictions:event.categoryRestrictions,relay_mixed_mode:event.relayMixedMode||null,multiple_relays_allowed:event.type==='relay'?(event.multipleRelaysAllowed?1:0):null};
    if(previous&&Object.keys(settings).every(key=>isDeepStrictEqual(previous[key],settings[key])))continue;
    const row=Object.fromEntries(columns.map(key=>[key,previous?.[key]??null]));
    Object.assign(row,settings,{competition_id:pack.nativeSnapshot.competition.id,event_code:event.code,version:String(BigInt(previous?.version||'0')+1n),updated_at:now,updated_by:input.actorUid});
    if(!previous){row.created_at=now;row.created_by=input.actorUid;}
    const index=after.findIndex(item=>item.event_code===event.code);if(index<0)after.push(row);else after[index]=row;
  }
  return {table:'livepalmes_course_options',key:'competition_id',before,after:normalize(after)};
}
async function apply(connection,item,id,authority){
  if(!Array.isArray(item.before)||!Array.isArray(item.after)||item.before.length>300||item.after.length>300||item.key!=='competition_id')throw new TypeError('Sauvegarde des courses invalide.');
  for(const rows of [item.before,item.after])if(rows.some(row=>Number(row.competition_id)!==id||columns.some(key=>!Object.hasOwn(row,key)))||new Set(rows.map(row=>row.event_code)).size!==rows.length)throw new TypeError('Perimetre des courses invalide.');
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const read=async(lock=false)=>normalize(await query(`SELECT * FROM livepalmes_course_options WHERE competition_id=? ORDER BY event_code LIMIT 301${lock?' FOR UPDATE':''}`,[id]));
  let started=false;
  try{
    await connection.beginTransaction();started=true;
    const current=await read(true);
    if(isDeepStrictEqual(current,normalize(item.after))){await connection.commit();started=false;return {resumed:true};}
    if(!isDeepStrictEqual(current,normalize(item.before)))throw new TypeError('Les reglages de courses ont change. Rechargez la fiche.');
    const guard=require('./nap-portal-competition-change').authorityGuard(item.table,authority);
    const result=await query(`DELETE FROM livepalmes_course_options WHERE competition_id=? AND ${guard.sql} LIMIT 300`,[id,...guard.values]);
    if(Number(result.affectedRows)!==current.length)throw new TypeError('Perimetre de competition modifie.');
    if(item.after.length){
      const values=item.after.flatMap(row=>columns.map(key=>key==='category_restrictions'&&row[key]!=null?JSON.stringify(row[key]):row[key]));
      const selects=item.after.map((_,index)=>`SELECT ${columns.map(key=>`?${index===0?' AS `'+key+'`':''}`).join(',')}`).join(' UNION ALL ');
      const inserted=await query(`INSERT INTO livepalmes_course_options (${columns.map(key=>'`'+key+'`').join(',')}) SELECT candidate.* FROM (${selects}) candidate WHERE ${guard.sql}`,[...values,...guard.values]);
      if(Number(inserted.affectedRows)!==item.after.length)throw new TypeError('Perimetre de competition modifie.');
    }
    if(!isDeepStrictEqual(await read(),normalize(item.after)))throw new Error('Verification des reglages incomplete.');
    await connection.commit();started=false;return {resumed:false};
  }finally{if(started)await connection.rollback();}
}
module.exports={plan,apply,normalize};
