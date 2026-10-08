"use strict";
// Native impact details and explicit national confirmation. No sporting row is
// written. Details: one parent read plus one grouped read of <=5 saved pages.
const {isDeepStrictEqual}=require('node:util');
const jobs=require('./nap-qualification-jobs');
const native=require('./nap-portal-competitions');
const {fingerprint}=require('./nap-portal-workspaces');
function pageIds(job){
  const ids=job.payload.pageIds;
  if(!Array.isArray(ids)||ids.length>1000||new Set(ids).size!==ids.length||ids.some(id=>!/^[a-f0-9]{64}$/.test(id)))throw new TypeError('Pages de controle incompatibles.');
  return ids;
}
async function reviewControl(connection,input,services){
  const scope=jobs.scope(input);
  if(typeof services?.authorize!=='function'||!['details','confirm'].includes(input.action))throw new TypeError('Action nationale requise.');
  const pack=await (services.readCompetition||native.readNativeCompetition)(connection,scope.competitionId,services.authorize);
  if(!pack)throw new TypeError('Competition NAP introuvable.');
  const job=await jobs.readJob(connection,input);
  if(!job||job.state!=='ready'||fingerprint(pack)!==job.payload.expectedFingerprint)throw new TypeError('Apercu absent ou parametres modifies : reprenez le controle.');
  const ids=pageIds(job);
  if(input.action==='details'){
    const offset=input.cursor===''||input.cursor==null?0:Number(input.cursor);
    if(!Number.isSafeInteger(offset)||offset<0||offset>ids.length||offset%5!==0||input.cursor!=null&&input.cursor!==''&&String(offset)!==input.cursor)throw new TypeError('Curseur de detail invalide.');
    const selection=ids.slice(offset,offset+5);
    if(!selection.length)return {state:'ready',count:job.payload.count,removed:[],cursor:''};
    const [rows]=await connection.execute({sql:`SELECT id,competition_id,state,payload FROM livepalmes_qualification_jobs FORCE INDEX (PRIMARY) WHERE id IN (${selection.map(()=>'?').join(',')}) ORDER BY id LIMIT 6`,timeout:10000},selection);
    if(rows.length!==selection.length||new Set(rows.map(row=>row.id)).size!==selection.length)throw new TypeError('Pages de controle manquantes ou ambigues.');
    const pages=new Map(rows.map(row=>{
      const payload=typeof row.payload==='string'?JSON.parse(row.payload):row.payload;
      jobs.payload(payload);
      if(!selection.includes(row.id)||Number(row.competition_id)!==scope.competitionId||row.state!=='page'||payload.parentId!==scope.id||!Array.isArray(payload.items)||payload.items.length>(payload.kind==='relay'?20:5))throw new TypeError('Page hors du controle autorise.');
      return [row.id,payload];
    }));
    const removed=selection.flatMap(id=>pages.get(id).items.flatMap(item=>{
      if(pages.get(id).kind==='relay'){
        if(!item.before||typeof item.remove!=='boolean')throw new TypeError('Detail de relais incomplet.');
        return item.remove?[{club:item.before.clubId,relayId:item.before.relayId,eventCode:`Relais ${item.before.relayId}`,name:`Relais ${item.before.relayId}`}]:[];
      }
      if(!item.before||!Array.isArray(item.removed)||item.removed.length>300)throw new TypeError('Detail de controle incomplet.');
      return item.removed.map(row=>({...row,club:item.before.clubId,swimmerIndexId:item.before.swimmerId,name:item.before.name||`Nageur ${item.before.swimmerId}`}));
    }));
    return {state:'ready',count:job.payload.count,removed,cursor:offset+5<ids.length?String(offset+5):'',applyStarted:job.payload.applyStarted===true};
  }
  if(input.confirmed!==true)throw new TypeError('Confirmation explicite requise.');
  const payload={...job.payload,applyStarted:true,confirmedBy:input.actorUid,confirmedAt:input.now,applyPage:0};
  const statement=jobs.transitionStatement(job,{...input,state:'apply',cursor:'',payload});
  const [result]=await connection.execute({sql:statement.sql,timeout:10000},statement.values);
  if(Number(result.affectedRows)!==1)throw new TypeError('Controle modifie avant confirmation. Rechargez son avancement.');
  const verified=await jobs.readJob(connection,input);
  if(!verified||verified.state!=='apply'||!isDeepStrictEqual(verified.payload,payload))throw new Error('Confirmation a verifier. Reprenez le controle.');
  return {state:'apply',count:job.payload.count,applyStarted:true};
}
module.exports={reviewControl,pageIds};
