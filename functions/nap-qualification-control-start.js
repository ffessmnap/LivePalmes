"use strict";
// Start the existing impact preview in NAP. No qualification grid or entry is
// applied here. Budget: existing bounded competition pack + one active-job
// lookup + one job insert + one verification, independently of entry count.
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const native=require('./nap-portal-competitions');
const {plan}=require('./nap-qualification-plan');
const jobs=require('./nap-qualification-jobs');
const {positiveId}=require('./nap-direct-calendar');
const {authorityGuard}=require('./nap-portal-competition-change');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const lockName=id=>`lp-qualification-${positiveId(id)}`;
async function beginControl(pool,input,services){
  if(input.national!==true||typeof input.actorUid!=='string'||!input.actorUid.trim()||input.actorUid.length>128||typeof services?.authorize!=='function')throw new TypeError('Controle national requis.');
  const competitionId=positiveId(input.competitionId),connection=await pool.getConnection();let locked=false,safe=true;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try{
    if(Number((await query('SELECT GET_LOCK(?,0) AS acquired',[lockName(competitionId)]))[0]?.acquired)!==1)throw new TypeError('Un controle est deja en cours de preparation.');
    locked=true;
    const pack=await (services.readCompetition||native.readNativeCompetition)(connection,competitionId,services.authorize);
    if(!pack)throw new TypeError('Competition NAP introuvable.');
    const target=plan(pack,input),jobId=digest([competitionId,input.actorUid,input.expectedFingerprint,target.rules]);
    const scope={competitionId,actorUid:input.actorUid,national:true,jobId};
    const existing=await jobs.readJob(connection,scope);
    if(existing){
      if(existing.actor_uid!==input.actorUid||!isDeepStrictEqual(existing.payload.rules,target.rules)||existing.payload.expectedFingerprint!==input.expectedFingerprint)throw new TypeError('Controle existant incompatible.');
      return {qualificationJobId:jobId,state:existing.state,resumed:true};
    }
    if(!target.changed)return {ok:true,unchanged:true};
    const active=await query("SELECT id FROM livepalmes_qualification_jobs FORCE INDEX (competition_state) WHERE competition_id=? AND state IN ('preview','ready','apply') ORDER BY state,id LIMIT 2",[competitionId]);
    if(active.length)throw new TypeError('Un controle des qualifications est deja en cours. Reprenez-le avant de modifier la grille.');
    const value={expectedFingerprint:input.expectedFingerprint,nativeSnapshot:pack.nativeSnapshot,rules:target.rules,before:target.before,after:target.after,count:0,generation:0,applyStarted:false};
    const payload=jobs.payload(value);
    const authority={competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters};
    const guard=authorityGuard('livepalmes_qualification_jobs',authority);
    // The options version also protects the supplemental grid snapshot. Never
    // overwrite a saved job or start against a concurrently changed native scope.
    const optionsGuard=pack.options ? 'EXISTS (SELECT 1 FROM livepalmes_competition_options WHERE competition_id=? AND version=?)' : 'NOT EXISTS (SELECT 1 FROM livepalmes_competition_options WHERE competition_id=?)';
    const optionsValues=pack.options?[competitionId,String(pack.options.version)]:[competitionId];
    const result=await query(`INSERT INTO livepalmes_qualification_jobs (id,competition_id,actor_uid,state,payload,cursor,version,created_at,updated_at) SELECT ?,?,?,'preview',?,'',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6) FROM DUAL WHERE ${guard.sql} AND ${optionsGuard} AND EXISTS (SELECT 1 FROM compet_parametres WHERE id=? AND qualif <=> ?)`,[jobId,competitionId,input.actorUid,payload,...guard.values,...optionsValues,pack.nativeParameters.parameter_id,pack.nativeParameters.qualif]);
    if(Number(result.affectedRows)!==1)throw new TypeError('La competition a change. Rechargez sa fiche.');
    const verified=await jobs.readJob(connection,scope);
    if(!verified||verified.state!=='preview'||verified.actor_uid!==input.actorUid||!isDeepStrictEqual(verified.payload,value))throw new Error('Verification du controle incomplete : reprenez la meme demande.');
    return {qualificationJobId:jobId,state:'preview',resumed:false};
  }finally{
    try{if(locked&&Number((await query('SELECT RELEASE_LOCK(?) AS released',[lockName(competitionId)]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={beginControl,lockName};
