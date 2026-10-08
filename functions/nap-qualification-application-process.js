"use strict";
// Apply one saved, confirmed page. The immutable NAP page is the recovery
// journal for MyISAM sporting rows; only supplemental effects/progress share
// an InnoDB transaction. No cross-table rollback is promised.
const {isDeepStrictEqual}=require('node:util');
const jobs=require('./nap-qualification-jobs');
const {pageIds}=require('./nap-qualification-control-review');
const {lockName}=require('./nap-qualification-control-start');
const {fingerprint}=require('./nap-portal-workspaces');
const native=require('./nap-portal-competitions');
const {authorityGuard}=require('./nap-portal-competition-change');
const {nativeEqual}=require('./nap-native-compare');
const {applicationPage}=require('./nap-qualification-application-page');
const {statements}=require('./nap-qualification-entry-statements');
const {restartStatement}=require('./nap-qualification-application-plan');
async function applyControl(pool,input,services){
  const scope=jobs.scope(input);
  if(typeof services?.authorize!=='function'||typeof services.eventsFor!=='function'||typeof services.competitionFor!=='function'||typeof services.effects!=='function')throw new TypeError('Services nationaux du controle requis.');
  const connection=await pool.getConnection();let locked=false,safe=true,transaction=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try{
    if(Number((await query('SELECT GET_LOCK(?,0) AS acquired',[lockName(scope.competitionId)]))[0]?.acquired)!==1)throw new TypeError('Controle en cours. Reessayez.');locked=true;
    const pack=await (services.readCompetition||native.readNativeCompetition)(connection,scope.competitionId,services.authorize);
    if(!pack)throw new TypeError('Competition NAP introuvable.');
    let job=await jobs.readJob(connection,input);
    if(job?.state==='done')return {state:'done',count:job.payload.count,applyStarted:true};
    if(!job||job.state!=='apply'||!job.payload.confirmedBy||!job.payload.applyStarted)throw new TypeError('Controle confirme introuvable.');
    const ids=pageIds(job),position=job.payload.applyPage??0;
    if(!Number.isSafeInteger(position)||position<0||position>ids.length)throw new TypeError('Avancement du controle incompatible.');
    const target=job.payload.nativeOperations?.length?require('./nap-qualification-target-pack').targetPack(pack,job.payload.nativeOperations):pack;
    const internal={...input,competitionId:scope.competitionId,confirmed:true,previous:job,rules:job.payload.rules,date:target.event.date,events:services.eventsFor(target),competition:services.competitionFor(target,job.payload.rules)};
    if(position===ids.length){
      const hasPatch=Object.keys(job.payload.patch||{}).length>0;
      if(hasPatch&&typeof services.applyNativePatch!=='function')throw new TypeError('Enregistrement des parametres natifs requis.');
      if(!job.payload.finalizing){
        if(!isDeepStrictEqual(pack.nativeSnapshot,job.payload.nativeSnapshot))throw new TypeError('Parametres natifs modifies avant validation de la grille.');
        await (services.applyGrid||require('./nap-qualification-grid-apply').applyGrid)(connection,{...internal,before:job.payload.before},pack,{...services,readCompetition:services.readCompetition||native.readNativeCompetition});
        if(hasPatch){
          const fresh=await (services.readCompetition||native.readNativeCompetition)(connection,scope.competitionId,services.authorize);
          const checkpoint=jobs.transitionStatement(job,{...input,state:'apply',cursor:'',payload:{...job.payload,finalizing:true,nativePatchFingerprint:fingerprint(fresh)}});
          if(Number((await query(checkpoint.sql,checkpoint.values)).affectedRows)!==1)throw new TypeError('Finalisation concurrente du controle. Reprenez-le.');
          job=await jobs.readJob(connection,input);
          if(!job?.payload.finalizing)throw new TypeError('Sauvegarde de finalisation a verifier.');
        }
      }
      if(hasPatch){
        if(typeof job.payload.nativePatchFingerprint!=='string'||!job.payload.nativePatchFingerprint)throw new TypeError('Empreinte de finalisation absente.');
        // Keep the same actor and fingerprint after a partial MyISAM update:
        // the existing native change journal then resumes the original operation.
        await services.applyNativePatch({competitionId:scope.competitionId,actorUid:job.payload.confirmedBy,expectedFingerprint:job.payload.nativePatchFingerprint,patch:job.payload.patch});
      }
      const done=jobs.transitionStatement(job,{...input,state:'done',cursor:'',payload:{...job.payload,completedAt:input.now}});
      if(Number((await query(done.sql,done.values)).affectedRows)!==1)throw new TypeError('Validation du controle a verifier. Reprenez-le.');
      return {state:'done',count:job.payload.count,applyStarted:true};
    }
    if(fingerprint(pack)!==job.payload.expectedFingerprint)throw new TypeError('La fiche a change pendant le controle. Reprise necessaire.');
    const pages=await query('SELECT id,competition_id,state,payload FROM livepalmes_qualification_jobs FORCE INDEX (PRIMARY) WHERE id=? LIMIT 1',[ids[position]]);
    const saved=pages[0]?.payload&&typeof pages[0].payload==='string'?JSON.parse(pages[0].payload):pages[0]?.payload;
    if(pages.length!==1||pages[0].state!=='page'||Number(pages[0].competition_id)!==scope.competitionId||saved?.parentId!==scope.id)throw new TypeError('Page du controle absente ou incompatible.');
    jobs.payload(saved);
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('engagements','engagements_relais','engagements_relayeurs') LIMIT 1")).length)throw new TypeError('Declencheur natif a verifier avant application.');
    const restart=async()=>{const statement=restartStatement(internal);if(Number((await query(statement.sql,statement.values)).affectedRows)!==1)throw new TypeError('Reprise concurrente du controle.');return {state:'preview',count:0,applyStarted:true,message:'Les preuves ont change : un nouvel apercu doit etre confirme.'};};
    let removed=[];
    if(saved.kind==='relay'){
      const result=await applyRelayPage(connection,internal,saved,pack,services);
      if(result.restart)return restart();removed=result.removed;
    }else{
      let plan=await (services.applicationPage||applicationPage)(connection,internal,saved,services);
      if(plan.restart)return restart();
      for(const statement of statements(internal,plan,pack)){
        if(!require('./nap-individual-entry-proof').indexed(statement,await query(`EXPLAIN ${statement.sql}`,statement.values)))throw new TypeError('Plan de recherche NAP a verifier avant application.');
        if(Number((await query(statement.sql,statement.values)).affectedRows)!==statement.expectedRows)throw new TypeError('Engagement modifie pendant l’application. Reprenez le controle ; sa sauvegarde est conservee.');
      }
      plan=await (services.applicationPage||applicationPage)(connection,internal,saved,services);
      if(plan.restart)return restart();if(plan.writes.length)throw new TypeError('Application incomplete. Reprenez le controle.');
      removed=saved.items.flatMap(item=>item.removed.map(row=>({...row,club:item.before.clubId,swimmerIndexId:item.before.swimmerId,name:item.before.name})));
    }
    // Sporting MyISAM changes are already durable. A failure below is resumed
    // from this same immutable page, not by resurrecting deleted sporting rows.
    await connection.beginTransaction();transaction=true;
    await services.effects(connection,{...internal,pageId:ids[position],removed,saved});
    const next=jobs.transitionStatement(job,{...input,state:'apply',cursor:'',payload:{...job.payload,applyPage:position+1}});
    if(Number((await query(next.sql,next.values)).affectedRows)!==1)throw new TypeError('Avancement concurrent du controle.');
    await connection.commit();transaction=false;
    return {state:'apply',count:job.payload.count,removed,applyStarted:true};
  }finally{
    if(transaction){try{await connection.rollback();}catch{safe=false;}}
    try{if(locked&&Number((await query('SELECT RELEASE_LOCK(?) AS released',[lockName(scope.competitionId)]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
async function applyRelayPage(connection,input,saved,pack,services){
  if(!Array.isArray(saved.items)||saved.items.length>2)throw new TypeError('Lot de relais invalide.');
  require('./nap-qualification-preview-store').prepare({...input,previous:{...input.previous,state:'preview',cursor:saved.previousCursor}}, {kind:'relay',items:saved.items,cursor:saved.nextCursor,finished:saved.finished});
  const ids=saved.items.map(item=>item.before.relayId),query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  if(!ids.length)return {restart:false,removed:[]};
  const marks=ids.map(()=>'?').join(','),rows=await query(`SELECT id,compet,categorie,club,course,tps FROM engagements_relais FORCE INDEX (PRIMARY) WHERE id IN (${marks}) ORDER BY id LIMIT 3`,ids);
  const members=await query(`SELECT id,relais,pos,nageur FROM engagements_relayeurs FORCE INDEX (livepalmes_relais_pos_id) WHERE relais IN (${marks}) ORDER BY relais,pos,id LIMIT 13`,ids);
  if(rows.length>2||members.length>12)throw new TypeError('Composition de relais modifiee.');
  const memberIds=[...new Set(saved.items.flatMap(item=>item.before.members.map(member=>Number(member.nageur))))];
  const anchors=input.rules.enabled?await require('./nap-qualification-relay-preview').readAnchors(connection,input,memberIds,services):[];
  const engine=require('./engagement-qualification'),removals=[];
  for(const item of saved.items){
    const before=item.before,row=rows.find(row=>Number(row.id)===before.relayId),team=members.filter(member=>Number(member.relais)===before.relayId);
    if(row&&!isDeepStrictEqual(row,before.entry)||team.some(member=>!before.members.some(old=>isDeepStrictEqual(member,old))))throw new TypeError('Un relais a ete corrige pendant le controle.');
    if(!row&&(!item.remove||team.length)||!item.remove&&!isDeepStrictEqual(team,before.members))throw new TypeError('Relais conserve ou composition modifies.');
    const qualified=anchors.filter(anchor=>BigInt(anchor.clubId)===BigInt(before.clubId)),swimmers=qualified.map(anchor=>({swimmerIndexId:anchor.swimmerId,individualEntries:[{eventCode:'anchor'}]})),evaluations=Object.fromEntries(qualified.map(anchor=>[anchor.swimmerId,{courses:{anchor:{qualified:true}}}]));
    const eligible=!input.rules.enabled||engine.relayEligible({memberIds:before.members.map(member=>String(member.nageur))},swimmers,evaluations);
    if(eligible===item.remove)return {restart:true,removed:[]};
    if(item.remove)removals.push({item,row,team});
  }
  const guard=authorityGuard('engagements_relais',{competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters});
  guard.sql+=" AND EXISTS (SELECT 1 FROM livepalmes_qualification_jobs scope_j FORCE INDEX (PRIMARY) WHERE scope_j.id=? AND scope_j.competition_id=? AND scope_j.state='apply' AND scope_j.version=?)";
  guard.values.push(input.jobId,input.competitionId,String(input.previous.version));
  guard.sql+=' AND EXISTS (SELECT 1 FROM compet_parametres scope_q FORCE INDEX (PRIMARY) WHERE scope_q.id=? AND scope_q.qualif <=> ?)';
  guard.values.push(pack.nativeSnapshot.parameters.id,pack.nativeParameters.qualif??null);
  if(pack.options){guard.sql+=' AND EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o FORCE INDEX (PRIMARY) WHERE scope_o.competition_id=? AND scope_o.version=?)';guard.values.push(input.competitionId,String(pack.options.version));}
  else{guard.sql+=' AND NOT EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o FORCE INDEX (PRIMARY) WHERE scope_o.competition_id=?)';guard.values.push(input.competitionId);}
  const witness=(row,alias,values)=>['id','compet','categorie','club','course','tps'].map(key=>{values.push(row[key]);return key==='id'?`${alias}id=?`:nativeEqual(`${alias}${key}`);}).join(' AND ');
  const execute=async(sql,values,expectedRows)=>{if(!require('./nap-individual-entry-proof').indexed({kind:'delete'},await query(`EXPLAIN ${sql}`,values)))throw new TypeError('Plan de recherche NAP des relais a verifier.');if(Number((await query(sql,values)).affectedRows)!==expectedRows)throw new TypeError('Relais modifie pendant le retrait. Reprenez le controle.');};
  const team=removals.flatMap(removal=>removal.row?removal.team.map(member=>({member,row:removal.row})):[]);
  if(team.length){
    const values=[],where=team.map(({member,row})=>{values.push(member.id,member.relais,member.pos,member.nageur);return `(id=? AND relais=? AND ${nativeEqual('pos')} AND nageur=? AND EXISTS (SELECT 1 FROM engagements_relais scope_r FORCE INDEX (PRIMARY) WHERE ${witness(row,'scope_r.',values)}))`;});values.push(...guard.values);
    await execute(`DELETE FROM engagements_relayeurs WHERE (${where.join(' OR ')}) AND ${guard.sql} LIMIT 12`,values,team.length);
  }
  const headers=removals.filter(removal=>removal.row);
  if(headers.length){const values=[],where=headers.map(({row})=>`(${witness(row,'',values)})`);values.push(...guard.values);
    await execute(`DELETE FROM engagements_relais WHERE (${where.join(' OR ')}) AND NOT EXISTS (SELECT 1 FROM engagements_relayeurs scope_m FORCE INDEX (livepalmes_relais_pos_id) WHERE scope_m.relais=engagements_relais.id) AND ${guard.sql} LIMIT 2`,values,headers.length);
  }
  const remaining=await query(`SELECT id FROM engagements_relais FORCE INDEX (PRIMARY) WHERE id IN (${marks}) ORDER BY id LIMIT 3`,ids);
  if(removals.some(removal=>remaining.some(row=>Number(row.id)===removal.item.before.relayId)))throw new TypeError('Retrait du relais incomplet.');
  return {restart:false,removed:removals.map(({item})=>({club:item.before.clubId,relayId:item.before.relayId,eventCode:`Relais ${item.before.relayId}`,name:`Relais ${item.before.relayId}`}))};
}
module.exports={applyControl,applyRelayPage};
