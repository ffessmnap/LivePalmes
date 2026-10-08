"use strict";
// Snapshot only exceptions attached to explicitly removed native courses.
// Persist this witness in the existing entry journal before any MyISAM write.
// A retry must never revoke a newer national decision made after that snapshot.
const {positiveId}=require('./nap-direct-calendar');
const {nativeEqual}=require('./nap-native-compare');
async function prepare(connection,{plan}){
  const competitionId=positiveId(plan.competitionId),clubId=String(plan.clubId);
  const removed=(plan.plans||plan.removals||[]).flatMap(item=>(item.removals||item.entries||[]).filter(row=>/^[A-Z0-9]{1,32}$/.test(row.course)).map(row=>({swimmerId:positiveId(item.swimmerId||item.swimmer.id),eventCode:row.course})));
  const ids=[...new Set(removed.map(row=>row.swimmerId))];
  if(!ids.length)return {grants:[]};
  if(ids.length>100||!/^\d{1,16}$/.test(clubId))throw new TypeError('Retraits de qualification hors dossier.');
  const [rows]=await connection.execute({sql:`SELECT competition_id,swimmer_id,event_code,club_id,status,version FROM livepalmes_qualification_grants FORCE INDEX (PRIMARY) WHERE competition_id=? AND swimmer_id IN (${ids.map(()=>'?').join(',')}) ORDER BY swimmer_id,event_code LIMIT ${ids.length*64+1}`,timeout:10000},[competitionId,...ids]);
  if(rows.length>ids.length*64||rows.some(row=>Number(row.competition_id)!==competitionId||!ids.includes(Number(row.swimmer_id))||String(row.club_id)!==clubId||!['accepted','revoked'].includes(row.status)))throw new TypeError('Exception hors du dossier retire.');
  const grants=rows.filter(row=>row.status==='accepted'&&removed.some(item=>item.swimmerId===Number(row.swimmer_id)&&item.eventCode===row.event_code));
  if(grants.some(row=>!/^[1-9][0-9]*$/.test(String(row.version))))throw new TypeError('Version d’exception invalide.');
  return {grants};
}
async function apply(connection,target){
  const rows=target.effects?.grants||[];if(!rows.length)return;
  if(rows.length>6400||typeof target.actorUid!=='string'||!target.actorUid||!/^\d{1,16}$/.test(target.clubId))throw new TypeError('Journal d’exception incompatible.');
  const id=positiveId(target.competitionId),values=[],where=rows.map(row=>{
    if(Number(row.competition_id)!==id||String(row.club_id)!==target.clubId||row.status!=='accepted'||!/^[A-Z0-9]{1,32}$/.test(row.event_code)||!/^[1-9][0-9]*$/.test(String(row.version)))throw new TypeError('Exception hors du journal autorise.');
    values.push(positiveId(row.swimmer_id),row.event_code,target.clubId,String(row.version));
    return `(swimmer_id=? AND event_code=? AND ${nativeEqual('club_id')} AND version=?)`;
  });
  const [result]=await connection.execute({sql:`UPDATE livepalmes_qualification_grants SET status='revoked',revoked_by=?,revoked_at=UTC_TIMESTAMP(6),version=version+1 WHERE competition_id=? AND status='accepted' AND (${where.join(' OR ')})`,timeout:10000},[target.actorUid,id,...values]);
  if(Number(result.affectedRows)>rows.length)throw new TypeError('Retrait d’exception ambigu.');
}
module.exports={prepare,apply};
