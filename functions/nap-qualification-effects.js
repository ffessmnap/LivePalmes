"use strict";
// Supplemental effects join the parent's progress transaction. Preserve all
// unrelated dossier metadata and contacts; one grouped read and upsert, no
// query per swimmer/course. Existing LivePalmes alert shape is retained.
const {positiveId}=require('./nap-direct-calendar');
const {json}=require('./nap-portal-workspaces');
const {nativeEqual}=require('./nap-native-compare');
const clubKey=value=>{if(!/^\d{1,16}$/.test(String(value)))throw new TypeError('Club NAP invalide.');return positiveId(Number(value));};
async function effects(connection,input){
  if(input.national!==true||input.confirmed!==true||!Array.isArray(input.removed)||input.removed.length>1500)throw new TypeError('Effets du controle national incompatibles.');
  const id=positiveId(input.competitionId),query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const people=input.removed.filter(row=>row.swimmerIndexId);
  if(people.length){
    const values=[],where=people.map(row=>{values.push(positiveId(row.swimmerIndexId),row.eventCode,String(row.club));return `(swimmer_id=? AND event_code=? AND ${nativeEqual('club_id')})`;});
    const changed=await query(`UPDATE livepalmes_qualification_grants SET status='revoked',revoked_by=?,revoked_at=?,version=version+1 WHERE competition_id=? AND status='accepted' AND (${where.join(' OR ')})`,[input.actorUid,input.now,id,...values]);
    if(Number(changed.affectedRows)>people.length)throw new TypeError('Revocation des exceptions ambigue.');
  }
  const clubs=[...new Set(input.removed.map(row=>clubKey(row.club)))];
  if(!clubs.length)return;
  if(clubs.length>5)throw new RangeError('Trop de clubs dans le lot de controle.');
  const raw=await query(`SELECT competition_id,club_id,submission_metadata FROM livepalmes_club_entry_options FORCE INDEX (PRIMARY) WHERE competition_id=? AND club_id IN (${clubs.map(()=>'?').join(',')}) ORDER BY club_id LIMIT 6 FOR UPDATE`,[id,...clubs]);
  if(raw.length>5||raw.some(row=>Number(row.competition_id)!==id||!clubs.includes(Number(row.club_id)))||new Set(raw.map(row=>Number(row.club_id))).size!==raw.length)throw new TypeError('Metadonnees des dossiers ambigues.');
  const values=clubs.flatMap(club=>{
    const previous=json(raw.find(row=>Number(row.club_id)===club)?.submission_metadata,{});
    if(!previous||Array.isArray(previous)||typeof previous!=='object')throw new TypeError('Metadonnees de dossier incompatibles.');
    const existing=previous.qualificationAlert?.jobId===input.jobId?previous.qualificationAlert.removed:[];
    if(!Array.isArray(existing)||existing.length>5000)throw new RangeError('Alerte de qualification trop volumineuse.');
    const removed=[...existing,...input.removed.filter(row=>clubKey(row.club)===club)];
    if(removed.length>5000)throw new RangeError('Alerte de qualification trop volumineuse.');
    const next={...previous,qualificationAlert:{jobId:input.jobId,at:input.now,reason:'Modification des règles de qualification',removed},documents:{...(previous.documents||{}),clubRecapPdf:{}}};
    const text=JSON.stringify(next);if(Buffer.byteLength(text)>500000)throw new RangeError('Dossier de qualification trop volumineux.');
    return [id,club,text,input.now,input.now,input.actorUid,input.actorUid];
  });
  const result=await query(`INSERT INTO livepalmes_club_entry_options (competition_id,club_id,submission_metadata,version,created_at,updated_at,created_by,updated_by) VALUES ${clubs.map(()=>'(?,?,CAST(? AS JSON),1,?,?,?,?)').join(',')} ON DUPLICATE KEY UPDATE submission_metadata=VALUES(submission_metadata),version=version+1,updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)`,values);
  if(Number(result.affectedRows)<clubs.length||Number(result.affectedRows)>clubs.length*2)throw new TypeError('Alertes de qualification a verifier.');
}
async function acknowledge(connection,input){
  const id=positiveId(input.competitionId),club=clubKey(input.clubId);
  if(typeof input.alertAt!=='string'||input.alertAt.length>32||typeof input.authorize!=='function')throw new TypeError('Alerte et club autorises requis.');
  await input.authorize({competitionId:id,clubId:String(input.clubId)});
  let started=false;
  try{
    await connection.beginTransaction();started=true;
    const [rows]=await connection.execute({sql:'SELECT submission_metadata,version FROM livepalmes_club_entry_options WHERE competition_id=? AND club_id=? LIMIT 1 FOR UPDATE',timeout:10000},[id,club]);
    const metadata=json(rows[0]?.submission_metadata,{}),alert=metadata.qualificationAlert;
    if(alert){
      if(alert.at!==input.alertAt)throw new TypeError('Une nouvelle alerte est disponible. Rechargez le dossier.');
      const next={...metadata,qualificationAlert:null,qualificationAlertAcknowledged:{at:input.now,by:input.actorUid,alertAt:input.alertAt}};
      const [result]=await connection.execute({sql:'UPDATE livepalmes_club_entry_options SET submission_metadata=CAST(? AS JSON),version=version+1,updated_at=?,updated_by=? WHERE competition_id=? AND club_id=? AND version=? LIMIT 1',timeout:10000},[JSON.stringify(next),input.now,input.actorUid,id,club,String(rows[0].version)]);
      if(Number(result.affectedRows)!==1)throw new TypeError('Alerte modifiee. Rechargez le dossier.');
    }
    await connection.commit();started=false;return {ok:true};
  }finally{if(started)await connection.rollback();}
}
module.exports={effects,acknowledge};
