"use strict";
// At most two grouped MyISAM operations for one confirmed five-person page.
// This prepares SQL only. Caller must journal, recheck proofs and reread after
// each operation; an affected-row mismatch cannot be treated as a rollback.
const jobs=require('./nap-qualification-jobs');
const {positiveId}=require('./nap-direct-calendar');
const {nativeEqual}=require('./nap-native-compare');
const {authorityGuard}=require('./nap-portal-competition-change');
function statements(input,plan,pack){
  const job=jobs.validate(input.previous,input),id=positiveId(input.competitionId);
  if(job.state!=='apply'||input.confirmed!==true||plan?.restart!==false||!Array.isArray(plan.writes)||plan.writes.length>1500)throw new TypeError('Page nationale confirmee requise.');
  if(Number(pack.nativeSnapshot?.competition?.id)!==id||Number(pack.nativeSnapshot?.parameters?.compet)!==id||![0,29].includes(Number(pack.nativeParameters?.qualif||0)))throw new TypeError('Perimetre natif du controle incompatible.');
  const authority=authorityGuard('engagements',{competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters});
  authority.sql+=' AND EXISTS (SELECT 1 FROM compet_parametres scope_q FORCE INDEX (PRIMARY) WHERE scope_q.id=? AND scope_q.qualif <=> ?)';
  authority.values.push(positiveId(pack.nativeSnapshot.parameters.id),pack.nativeParameters.qualif??null);
  authority.sql+=" AND EXISTS (SELECT 1 FROM livepalmes_qualification_jobs scope_j FORCE INDEX (PRIMARY) WHERE scope_j.id=? AND scope_j.competition_id=? AND scope_j.state='apply' AND scope_j.version=? AND BINARY scope_j.cursor=BINARY ?)";
  authority.values.push(job.id,id,String(job.version),job.cursor);
  if(pack.options){authority.sql+=' AND EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o FORCE INDEX (PRIMARY) WHERE scope_o.competition_id=? AND scope_o.version=?)';authority.values.push(id,String(pack.options.version));}
  else {authority.sql+=' AND NOT EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o FORCE INDEX (PRIMARY) WHERE scope_o.competition_id=?)';authority.values.push(id);}
  const seen=new Set();
  for(const row of plan.writes){
    if(!['update','delete'].includes(row.kind)||seen.has(positiveId(row.before?.nativeId))||typeof row.before.nativeTime!=='string'||!/^\d{1,6}$/.test(row.before.nativeTime)||typeof row.before.eventCode!=='string'||!/^[A-Z0-9]{1,32}$/.test(row.before.eventCode)||typeof row.clubId!=='string'||!/^\d{1,16}$/.test(row.clubId))throw new TypeError('Operation de controle incompatible.');
    if(row.kind==='update'&&(typeof row.tps!=='string'||!/^\d{1,6}$/.test(row.tps)||row.tps!=='599999'&&Number(row.tps.slice(-4,-2)||0)>59))throw new TypeError('Temps automatique invalide.');
    positiveId(row.inscriptionId);positiveId(row.swimmerId);seen.add(row.before.nativeId);
  }
  const result=[];
  for(const kind of ['delete','update']){
    const rows=plan.writes.filter(row=>row.kind===kind);if(!rows.length)continue;
    const values=[],cases=kind==='update'?rows.map(row=>{values.push(row.before.nativeId,row.tps);return 'WHEN ? THEN ?';}):[];
    const where=rows.map(row=>{
      values.push(row.before.nativeId,row.inscriptionId,row.before.eventCode,row.before.nativeTime,row.inscriptionId,row.swimmerId,id,row.clubId);
      return `(id=? AND engagement=? AND ${nativeEqual('course')} AND ${nativeEqual('tps')} AND EXISTS (SELECT 1 FROM nageursengager scope_i FORCE INDEX (PRIMARY) JOIN nageurs scope_n FORCE INDEX (PRIMARY) ON scope_n.id=scope_i.nageur WHERE scope_i.id=? AND scope_i.nageur=? AND scope_i.compet=? AND ${nativeEqual('scope_n.club')}))`;
    });
    values.push(...authority.values);
    result.push({kind,expectedRows:rows.length,sql:`${kind==='delete'?'DELETE FROM engagements':`UPDATE engagements SET tps=CASE id ${cases.join(' ')} ELSE tps END`} WHERE (${where.join(' OR ')}) AND ${authority.sql} LIMIT 1500`,values});
  }
  return result;
}
module.exports={statements};
