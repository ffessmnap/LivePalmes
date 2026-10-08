"use strict";
// Atomic replacement of the approved InnoDB qualification supplements only.
// Native competition/parameters, performances and engagements are never changed
// here. The caller must finish the confirmed entry-control job before this step.
const {isDeepStrictEqual}=require('node:util');
const {positiveId}=require('./nap-direct-calendar');
const {fromPack}=require('./nap-qualification-rules');
const {authorityGuard,SPECS}=require('./nap-portal-competition-change');
const schema=require('./nap-approved-portal-schema');
const engine=require('./engagement-qualification');
const canonical=value=>JSON.parse(JSON.stringify(value));
async function applyGrid(connection,input,pack,services){
  const id=positiveId(input.competitionId);
  if(input.national!==true||input.confirmed!==true||typeof input.actorUid!=='string'||!input.actorUid.trim()||input.actorUid.length>128||!/^[0-9T:.Z -]{19,32}$/.test(input.now||'')||!input.rules||typeof services?.readCompetition!=='function'||typeof services.authorize!=='function')throw new TypeError('Application nationale confirmee requise.');
  if(positiveId(pack.event.id)!==id||![0,29].includes(Number(pack.nativeParameters.qualif||0)))throw new TypeError('Grille native non raccordee.');
  await services.authorize(pack.event);
  const rules=engine.validateRules(input.rules,input.events,true);
  if(isDeepStrictEqual(fromPack(pack,input.events),rules))return {verified:true,unchanged:true};
  const prepared=require('./nap-qualification-plan').plan(pack,{...input,expectedFingerprint:require('./nap-portal-workspaces').fingerprint(pack)});
  if(!isDeepStrictEqual(canonical(prepared.before),canonical(input.before)))throw new TypeError('Ancienne grille modifiee avant application.');
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const tracking=[input.now,input.now,input.actorUid,input.actorUid];let started=false;
  const insert=async(table,columns,rows)=>{
    if(!rows.length)return;
    const result=await query(`INSERT INTO \`${table}\` (${columns.map(c=>`\`${c}\``).join(',')}) VALUES ${rows.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')}`,rows.flat());
    if(Number(result.affectedRows)!==rows.length)throw new Error('Grille NAP incomplete.');
  };
  try{
    await connection.beginTransaction();started=true;
    const options=await query('SELECT * FROM livepalmes_competition_options WHERE competition_id=? LIMIT 1 FOR UPDATE',[id]);
    const old=options[0]||null;
    if(!isDeepStrictEqual(canonical(old),canonical(pack.options)))throw new TypeError('Options de la competition modifiees.');
    const guard=authorityGuard('livepalmes_competition_options',{competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters});
    guard.sql+=' AND EXISTS (SELECT 1 FROM compet_parametres scope_q FORCE INDEX (PRIMARY) WHERE scope_q.id=? AND scope_q.qualif <=> ?)';
    guard.values.push(positiveId(pack.nativeSnapshot.parameters.id),pack.nativeParameters.qualif??null);
    if(old){
      const result=await query(`UPDATE livepalmes_competition_options SET qualifications_enabled=?,version=version+1,updated_at=?,updated_by=? WHERE competition_id=? AND version=? AND ${guard.sql} LIMIT 1`,[rules.enabled?1:0,input.now,input.actorUid,id,String(old.version),...guard.values]);
      if(Number(result.affectedRows)!==1)throw new TypeError('Perimetre de competition modifie.');
    }else{
      const columns=SPECS.livepalmes_competition_options.columns;
      const values=columns.map(name=>name==='competition_id'?id:name==='version'?'1':name==='qualifications_enabled'?(rules.enabled?1:0):name==='created_at'||name==='updated_at'?input.now:name==='created_by'||name==='updated_by'?input.actorUid:null);
      const result=await query(`INSERT INTO livepalmes_competition_options (${columns.map(c=>`\`${c}\``).join(',')}) SELECT ${columns.map(()=>'?').join(',')} FROM DUAL WHERE ${guard.sql}`, [...values,...guard.values]);
      if(Number(result.affectedRows)!==1)throw new TypeError('Perimetre de competition modifie.');
    }
    // This option lock is the common serialization point for every grid writer.
    const oldGroups=await query('SELECT id FROM livepalmes_qualification_groups WHERE competition_id=? ORDER BY position LIMIT 13',[id]);
    if(oldGroups.length>12)throw new RangeError('Trop de groupes natifs.');
    if(oldGroups.length)await query(`DELETE FROM livepalmes_qualification_competitions WHERE group_id IN (${oldGroups.map(()=>'?').join(',')})`,oldGroups.map(row=>row.id));
    await query('DELETE FROM livepalmes_qualification_standards WHERE competition_id=?',[id]);
    await query('DELETE FROM livepalmes_qualification_groups WHERE competition_id=?',[id]);
    const groupColumns=schema.tables[3].columns.map(c=>c.name).filter(c=>c!=='id');
    const groupRows=prepared.after.groups.map(group=>{
      const row={competition_id:id,...group,categories:JSON.stringify(group.categories),pools:JSON.stringify(group.pools),version:'1',created_at:input.now,updated_at:input.now,created_by:input.actorUid,updated_by:input.actorUid};
      return groupColumns.map(key=>row[key]);
    });
    await insert('livepalmes_qualification_groups',groupColumns,groupRows);
    const groups=await query('SELECT id,position FROM livepalmes_qualification_groups WHERE competition_id=? ORDER BY position LIMIT 13',[id]);
    if(groups.length!==prepared.after.groups.length||groups.some((row,i)=>Number(row.position)!==i+1))throw new Error('Groupes de qualification incomplets.');
    await insert('livepalmes_qualification_competitions',['group_id','qualifying_competition_id','version','created_at','updated_at','created_by','updated_by'],prepared.after.groups.flatMap((group,i)=>group.qualifyingCompetitionIds.map(target=>[positiveId(groups[i].id),target,'1',...tracking])));
    await insert('livepalmes_qualification_standards',['competition_id','category','sex','event_code','minimum_centiseconds','version','created_at','updated_at','created_by','updated_by'],prepared.after.standards.map(row=>[id,row.category,row.sex,row.event_code,row.minimum_centiseconds,'1',...tracking]));
    const verified=await services.readCompetition(connection,id,services.authorize);
    if(!verified||!isDeepStrictEqual(canonical(verified.nativeSnapshot),canonical(pack.nativeSnapshot))||!isDeepStrictEqual(fromPack(verified,input.events),rules))throw new Error('Verification de la grille ou du perimetre incomplete.');
    await connection.commit();started=false;return {verified:true,unchanged:false};
  }finally{if(started)await connection.rollback();}
}
module.exports={applyGrid};
