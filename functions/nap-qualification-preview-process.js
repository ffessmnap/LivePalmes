"use strict";
// Native preview orchestration. It does not confirm or apply an entry removal.
const {lockName}=require('./nap-qualification-control-start');
const jobs=require('./nap-qualification-jobs');
const native=require('./nap-portal-competitions');
const {fingerprint}=require('./nap-portal-workspaces');
const {previewPage}=require('./nap-qualification-preview-page');
const {savePage}=require('./nap-qualification-preview-store');
async function processPreview(pool,input,services){
  const scope=jobs.scope(input);
  if(typeof services?.authorize!=='function'||typeof services.eventsFor!=='function'||typeof services.categoryFor!=='function')throw new TypeError('Services de controle national requis.');
  const connection=await pool.getConnection();let locked=false,safe=true;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try{
    if(Number((await query('SELECT GET_LOCK(?,0) AS acquired',[lockName(scope.competitionId)]))[0]?.acquired)!==1)throw new TypeError('Controle en cours. Reessayez.');locked=true;
    const pack=await (services.readCompetition||native.readNativeCompetition)(connection,scope.competitionId,services.authorize);
    if(!pack)throw new TypeError('Competition NAP introuvable.');
    const job=await jobs.readJob(connection,input);
    if(!job||!job.payload.rules||!job.payload.expectedFingerprint)throw new TypeError('Controle NAP introuvable ou incompatible.');
    if(input.action==='cancel'){
      const statement=jobs.transitionStatement(job,{...input,state:'cancelled',cursor:job.cursor,payload:job.payload});
      if(Number((await query(statement.sql,statement.values)).affectedRows)!==1)throw new TypeError('Controle modifie : rechargez son avancement.');
      return {state:'cancelled',count:job.payload.count};
    }
    if(input.action&&input.action!=='preview')throw new TypeError('Cette action doit passer par le circuit de confirmation et application.');
    if(job.state!=='preview')return {state:job.state,count:job.payload.count,applyStarted:job.payload.applyStarted===true};
    if(fingerprint(pack)!==job.payload.expectedFingerprint)throw new TypeError('Les parametres de la competition ont change. Annulez cet apercu puis relancez le controle.');
    if(job.payload.rules.enabled&&(typeof services.automatic!=='function'||typeof services.competitionFor!=='function'))throw new TypeError('Calcul automatique et periode des temps requis pour cette grille.');
    const competition=services.competitionFor?services.competitionFor(pack,job.payload.rules):undefined;
    const page=await (services.previewPage||previewPage)(connection,{competitionId:scope.competitionId,national:true,cursor:job.cursor,rules:job.payload.rules,date:pack.event.date,events:services.eventsFor(pack),competition},services);
    const saved=await (services.savePage||savePage)(connection,{...input,previous:job},page);
    return {...saved,removed:page.items.flatMap(item=>item.removed.map(row=>({...row,club:item.before.clubId,swimmerIndexId:item.before.swimmerId}))),applyStarted:job.payload.applyStarted===true};
  }finally{
    try{if(locked&&Number((await query('SELECT RELEASE_LOCK(?) AS released',[lockName(scope.competitionId)]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={processPreview};
