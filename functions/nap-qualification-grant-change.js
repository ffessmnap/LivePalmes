"use strict";
const {positiveId}=require('./nap-direct-calendar');
const {lockName}=require('./nap-qualification-control-start');
const {fingerprint}=require('./nap-portal-workspaces');
const {authorityGuard}=require('./nap-portal-competition-change');
const {nativeEqual}=require('./nap-native-compare');
const grants=require('./nap-qualification-grants');
const engine=require('./engagement-qualification');
async function grantException(pool,input,services){
  if(input.national!==true||input.confirmed!==true||typeof services?.authorize!=='function'||typeof services.eventsFor!=='function'||typeof services.competitionFor!=='function'||typeof services.categoryFor!=='function'||typeof services.assertOpen!=='function')throw new TypeError('Exception nationale confirmee requise.');
  const scope=grants.scope(input),connection=await pool.getConnection();let locked=false,safe=true;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try{
    if(Number((await query('SELECT GET_LOCK(?,0) AS acquired',[lockName(scope.competitionId)]))[0]?.acquired)!==1)throw new TypeError('Controle en cours. Reessayez.');locked=true;
    const readCompetition=services.readCompetition||require('./nap-portal-competitions').readNativeCompetition;
    const pack=await readCompetition(connection,scope.competitionId,services.authorize);
    if(!pack||![0,29].includes(Number(pack.nativeParameters?.qualif||0)))throw new TypeError('Competition ou ancienne grille NAP a verifier.');
    const competition=services.competitionFor(pack),events=services.eventsFor(pack);
    if(!competition.qualifications?.enabled)throw new TypeError('Cette competition n’applique pas de grille.');
    services.assertOpen(competition);
    if((await query("SELECT id FROM livepalmes_qualification_jobs FORCE INDEX (competition_state) WHERE competition_id=? AND state IN ('preview','ready','apply') ORDER BY state,id LIMIT 1",[scope.competitionId])).length)throw new TypeError('Un controle des qualifications est en cours.');
    const dossier=await (services.readEntry||require('./nap-portal-entries').readNativeClubEntry)(connection,{competitionId:scope.competitionId,clubId:scope.clubId},services.authorize);
    const people=dossier.swimmers.filter(person=>Number(person.id)===scope.swimmerId&&String(person.clubId)===scope.clubId),links=dossier.inscriptions.filter(row=>Number(row.nageur)===scope.swimmerId);
    if(people.length!==1||links.length!==1)throw new TypeError('Nageur absent des engagements du club selectionne.');
    const person=people[0],category=services.categoryFor(competition.date,person.birthDate),event=events.find(event=>event.code===input.eventCode&&event.type==='individual'&&event.categories.includes(category));
    if(!event||!competition.qualifications.groups.some(group=>group.categories.includes(category))||!['M','F'].includes(person.sex))throw new TypeError('Course non ouverte pour ce nageur.');
    const histories=await (services.readHistory||require('./nap-entry-performance-history').readEntryHistory)(connection,people),rows=histories.get(String(person.id));
    if(!Array.isArray(rows)||rows.length>2000)throw new RangeError('Historique du nageur incomplet.');
    const evaluation=engine.evaluate({rules:competition.qualifications,category,sex:person.sex,events,rows});
    const currentEntries=dossier.individual.filter(row=>Number(row.engagement)===Number(links[0].id));
    const reason=(evaluation.mode==='one'&&!currentEntries.some(row=>evaluation.courses[row.course]?.qualified)?'Aucune course qualifiée engagée. ':'')+evaluation.courses[input.eventCode].reason;
    const previous=await grants.readGrants(connection,scope),before=previous.find(row=>row.event_code===input.eventCode);
    const change=grants.acceptStatement({...input,...scope,reason},before);
    if(!change.unchanged){
      const latest=await readCompetition(connection,scope.competitionId,services.authorize);
      if(fingerprint(latest)!==fingerprint(pack))throw new TypeError('Regles modifiees. Rechargez avant de confirmer.');
      const guard=authorityGuard('livepalmes_qualification_grants',{competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters});
      guard.sql+=' AND EXISTS (SELECT 1 FROM compet_parametres scope_q FORCE INDEX (PRIMARY) WHERE scope_q.id=? AND scope_q.qualif <=> ?)';
      guard.values.push(pack.nativeSnapshot.parameters.id,pack.nativeParameters.qualif??null);
      guard.sql+=` AND EXISTS (SELECT 1 FROM nageursengager scope_i FORCE INDEX (PRIMARY) JOIN nageurs scope_n FORCE INDEX (PRIMARY) ON scope_n.id=scope_i.nageur WHERE scope_i.id=? AND scope_i.nageur=? AND scope_i.compet=? AND ${nativeEqual('scope_n.club')} AND ${nativeEqual('scope_n.date')} AND ${nativeEqual('scope_n.sexe')}) AND NOT EXISTS (SELECT 1 FROM livepalmes_qualification_jobs scope_j FORCE INDEX (competition_state) WHERE scope_j.competition_id=? AND scope_j.state IN ('preview','ready','apply')) AND UTC_TIMESTAMP() < ?`;
      guard.values.push(positiveId(links[0].id),scope.swimmerId,scope.competitionId,person.clubId,person.birthDate,person.sex,scope.competitionId,require('./nap-official-entry-statements').deadline(competition.entryDeadlineAt));
      if(pack.options){guard.sql+=' AND EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o FORCE INDEX (PRIMARY) WHERE scope_o.competition_id=? AND scope_o.version=?)';guard.values.push(scope.competitionId,String(pack.options.version));}
      let sql=change.sql;
      if(before)sql=sql.replace(' LIMIT 1',` AND ${guard.sql} LIMIT 1`);
      else {const match=sql.match(/^(INSERT INTO .*?) VALUES \((.*)\)$/);if(!match)throw new TypeError('Statement d’exception incompatible.');sql=`${match[1]} SELECT ${match[2]} FROM DUAL WHERE ${guard.sql}`;}
      if(Number((await query(sql,[...change.values,...guard.values])).affectedRows)!==1)throw new TypeError('Regles ou engagements modifies. Rechargez avant de confirmer.');
    }
    const approved=await grants.readGrants(connection,scope),accepted=approved.find(row=>row.event_code===input.eventCode&&row.status==='accepted');
    if(!accepted)throw new TypeError('Exception nationale a verifier.');
    const result=engine.evaluate({rules:competition.qualifications,category,sex:person.sex,events,rows,approvals:approved.map(row=>({eventCode:row.event_code,status:row.status}))});
    return {ok:true,source:'nap',qualification:{...result.courses[input.eventCode],mode:result.mode},exception:{eventCode:accepted.event_code,status:'accepted',source:'national-exception',approvedBy:accepted.approved_by,approvedAt:accepted.approved_at,reason:accepted.reason}};
  }finally{
    try{if(locked&&Number((await query('SELECT RELEASE_LOCK(?) AS released',[lockName(scope.competitionId)]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={grantException};
