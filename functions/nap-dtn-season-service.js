"use strict";
// Direct native service, activated only on TEST after private checks.
// Budgets: catalog 2 SELECTs/3 settings max; overview 2 settings +1 views
// +1 job +2 metadata reads; explicit recalculation <=402 performance SQL,
// 3 views saved atomically. No automatic rebuild on an ordinary opening.
const {randomUUID}=require("node:crypto");
const engine=require("./dtn-season-engine"),repo=require("./nap-dtn-season-repository");
const {sourceStamp}=require("./nap-dtn-source-stamp"),{calculateSeason}=require("./nap-dtn-calculation");
const {sourceAliases}=require("./nap-dtn-source-associations");
function createNativeDtnSeasonService({getPool,authorize,canManage,fail,calculate=calculateSeason,stamp=sourceStamp,audit=async()=>{}}) {
  function checkConfig(value,incomplete=false) {
    try {return engine.validateSeason(value,{incomplete});}
    catch(error) {fail(error.message,"invalid-argument");}
  }
  async function context(request,id=null,manage=false,executor=null) {
    await authorize(request);
    if(manage && !canManage(request)) fail("Droit de gestion DTN requis.","permission-denied");
    if(id) repo.checkId(id);
    const pool=executor||getPool(),catalog=await repo.readCatalog(pool);
    const visible=[catalog.previous,catalog.current,...(canManage(request)?[catalog.draft]:[])].filter(Boolean);
    if(id && !visible.includes(id)) fail("Saison non accessible.","permission-denied");
    return {pool,catalog,seasons:await repo.readSeasons(pool,visible)};
  }
  async function list(request) {
    const {catalog,seasons}=await context(request);
    return {source:"nap",catalog,seasons,canManage:canManage(request)};
  }
  async function update(request) {
    await authorize(request);
    if(!canManage(request)) fail("Droit de gestion DTN requis.","permission-denied");
    const id=repo.checkId(request.data?.id),action=request.data?.action;
    if(!["create","save","activate"].includes(action)) fail("Action inconnue.","invalid-argument");
    const pool=getPool(),connection=await pool.getConnection();let transaction=false;
    try {
      const sourceVersion=action==="activate"?(await stamp(pool,{settled:true})).fingerprint:null;
      await connection.beginTransaction();transaction=true;
      const catalog=await repo.readCatalog(connection,{lock:true});
      if(request.data.catalogRevision!==catalog.revision) fail("Les saisons ont change. Rechargez avant de continuer.","aborted");
      const ids=[catalog.current,catalog.previous,catalog.draft].filter(Boolean),seasons=await repo.readSeasons(connection,ids,{lock:true});
      const current=seasons.find(s=>s.id===id);
      let season,nextCatalog={...catalog,revision:catalog.revision+1};
      if(action==="create") {
        if(catalog.draft) fail("Une saison suivante est deja en preparation.","failed-precondition");
        season=repo.nextDraft(seasons.find(s=>s.id===catalog.current),request.data.duplicate!==false);
        if(id!==season.id || current) fail("La prochaine saison existe deja ou est invalide.","invalid-argument");
        nextCatalog.draft=id;
        const result=await repo.query(connection,"INSERT INTO livepalmes_dtn_saisons (id,revision,configuration,updated_at) VALUES (?,?,?,UTC_TIMESTAMP())",[id,season.revision,JSON.stringify(season)]);
        if(result.affectedRows!==1) throw new Error("Creation DTN incomplete.");
      }else {
        if(!current || ![catalog.current,catalog.draft].includes(id)) fail("La saison precedente est en consultation seule.","permission-denied");
        if(request.data.revision!==current.revision) fail("La configuration a change. Rechargez avant d'enregistrer.","aborted");
        if(action==="save") {
          season=checkConfig({...request.data.season,id,year:current.year,revision:current.revision+1},id===catalog.draft);
          if(Buffer.byteLength(JSON.stringify(season))>=repo.MAX_CONFIG_BYTES) fail("Configuration DTN trop volumineuse.","invalid-argument");
          const result=await repo.query(connection,"UPDATE livepalmes_dtn_saisons SET revision=?,configuration=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND revision=? LIMIT 1",[season.revision,JSON.stringify(season),id,current.revision]);
          if(result.affectedRows!==1) fail("Configuration modifiee pendant l'enregistrement.","aborted");
        }else {
          if(id!==catalog.draft || request.data.confirmed!==true) fail("Confirmez l'activation de la saison brouillon.","failed-precondition");
          season=checkConfig(current);
          const active=seasons.find(s=>s.id===catalog.current),views=await repo.readViews(connection,[id,catalog.current],{lock:true});
          for(const s of [season,active]) for(const device of engine.DEVICES) {
            if(views.find(v=>v.id===s.id && v.device===device)?.value.fingerprint!==repo.fingerprint(s,sourceVersion)) fail("Recalculez et verifiez les trois dispositifs du brouillon et de la saison active avant la bascule.","failed-precondition");
          }
          if((await stamp(pool)).fingerprint!==sourceVersion) fail("NAP a change pendant la bascule. Recalculez avant d'activer.","aborted");
          nextCatalog={...nextCatalog,previous:catalog.current,current:id,draft:""};
        }
      }
      const result=await repo.query(connection,"UPDATE livepalmes_dtn_catalogue SET revision=?,saison_active=?,saison_precedente=?,saison_brouillon=?,updated_at=UTC_TIMESTAMP() WHERE id=1 AND revision=? LIMIT 1",[nextCatalog.revision,nextCatalog.current,nextCatalog.previous,nextCatalog.draft,catalog.revision]);
      if(result.affectedRows!==1) fail("Catalogue modifie pendant l'enregistrement.","aborted");
      await connection.commit();transaction=false;
      await audit(`dtn.season.${action}`,request,{seasonId:id,revision:season.revision,source:"nap"});
      return {source:"nap",catalog:nextCatalog,season};
    }finally {try {if(transaction) await connection.rollback();}finally {connection.release();}}
  }
  async function overview(request) {
    const id=repo.checkId(request.data?.id),device=request.data?.device;
    if(!engine.DEVICES.includes(device)) fail("Dispositif invalide.","invalid-argument");
    const {pool,catalog,seasons}=await context(request,id),season=seasons.find(s=>s.id===id);
    const views=await repo.readViews(pool,[id]),view=views.find(v=>v.device===device)?.value;
    if(id===catalog.previous) {
      if(request.data.rebuild===true) fail("La saison precedente reste en consultation seule.","permission-denied");
      return view && view.fingerprint===repo.fingerprint(season,view.sourceVersion)?{...view,hit:true,frozen:true}:{source:"nap",hit:false,pending:false,error:"Resultats historiques NAP non prepares.",revision:season.revision,profiles:[]};
    }
    if(request.data.rebuild===true) return rebuild(request,{pool,catalog,season,device});
    const sourceVersion=(await stamp(pool)).fingerprint;
    if(view?.fingerprint===repo.fingerprint(season,sourceVersion)) return {...view,hit:true};
    const [job]=await repo.query(pool,"SELECT statut,erreur,TIMESTAMPDIFF(SECOND,started_at,UTC_TIMESTAMP()) AS age_seconds FROM livepalmes_dtn_calculs WHERE saison=? LIMIT 1",[id]);
    const pending=job?.statut==="running" && Number(job.age_seconds)>=0 && Number(job.age_seconds)<600;
    return {source:"nap",hit:false,pending:Boolean(pending),error:job?.statut==="failed"?job.erreur:"",revision:season.revision,generatedAt:view?.generatedAt||"",profiles:[]};
  }
  async function rebuild(request,{pool,catalog,season,device}) {
    // Access remains dtn.view, exactly as the existing explicit rebuild action.
    checkConfig(season);
    const connection=await pool.getConnection();let locked=false,transaction=false,operation=null;
    try {
      const [lock]=await repo.query(connection,"SELECT GET_LOCK(?,0) AS acquired",[`livepalmes_dtn_calc_${season.id}`]);
      if(Number(lock?.acquired)!==1) return {source:"nap",hit:false,pending:true,revision:season.revision,profiles:[]};
      locked=true;
      const sourceVersion=(await stamp(pool,{settled:true})).fingerprint;
      operation=randomUUID();
      await repo.query(connection,"INSERT INTO livepalmes_dtn_calculs (saison,operation_id,revision,statut,configuration,erreur,started_at,completed_at) VALUES (?,?,?,'running',?,'',UTC_TIMESTAMP(),NULL) ON DUPLICATE KEY UPDATE operation_id=VALUES(operation_id),revision=VALUES(revision),statut='running',configuration=VALUES(configuration),erreur='',started_at=UTC_TIMESTAMP(),completed_at=NULL",[season.id,operation,season.revision,JSON.stringify(season)]);
      const result=await calculate(pool,season,{authorize:async()=>{await authorize(request);}});
      if((await stamp(pool)).fingerprint!==sourceVersion) fail("NAP a change pendant le calcul. Relancez le recalcul.","aborted");
      await connection.beginTransaction();transaction=true;
      const latestCatalog=await repo.readCatalog(connection,{lock:true});
      if(![latestCatalog.current,latestCatalog.draft].includes(season.id) || latestCatalog.revision!==catalog.revision) fail("Les saisons ont change pendant le calcul. Relancez le recalcul.","aborted");
      const [latest]=await repo.readSeasons(connection,[season.id],{lock:true});
      if(repo.fingerprint(latest,sourceVersion)!==repo.fingerprint(season,sourceVersion)) fail("La configuration a change pendant le calcul. Relancez le recalcul.","aborted");
      const values={};
      for(const d of engine.DEVICES) {
        const value={...result.views[d],sourceVersion,generatedAt:result.generatedAt,fingerprint:repo.fingerprint(season,sourceVersion),excludedRows:result.excludedRows};
        const payload=JSON.stringify(value);
        if(Buffer.byteLength(payload)>=900000) throw new RangeError("Resultats DTN trop volumineux.");
        await repo.query(connection,"INSERT INTO livepalmes_dtn_resultats (saison,dispositif,revision,empreinte,contenu,generated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE revision=VALUES(revision),empreinte=VALUES(empreinte),contenu=VALUES(contenu),generated_at=UTC_TIMESTAMP()",[season.id,d,season.revision,value.fingerprint,payload]);
        values[d]=value;
      }
      if((await stamp(pool)).fingerprint!==sourceVersion) fail("NAP a change avant publication. Relancez le recalcul.","aborted");
      const completed=await repo.query(connection,"UPDATE livepalmes_dtn_calculs SET statut='completed',completed_at=UTC_TIMESTAMP() WHERE saison=? AND operation_id=? AND statut='running' LIMIT 1",[season.id,operation]);
      if(completed.affectedRows!==1) throw new Error("Calcul DTN concurrent.");
      await connection.commit();transaction=false;
      return {...values[device],hit:true,pending:false};
    }catch(error) {
      if(transaction) {await connection.rollback();transaction=false;}
      if(operation) await repo.query(connection,"UPDATE livepalmes_dtn_calculs SET statut='failed',erreur=?,completed_at=UTC_TIMESTAMP() WHERE saison=? AND operation_id=? AND statut='running' LIMIT 1",[error instanceof TypeError || error instanceof RangeError || error.code==="aborted"?String(error.message).slice(0,300):"Calcul NAP interrompu. Relancez le recalcul.",season.id,operation]);
      throw error;
    }finally {
      try {if(transaction) await connection.rollback();}
      finally {try {if(locked) await repo.query(connection,"SELECT RELEASE_LOCK(?)",[`livepalmes_dtn_calc_${season.id}`]);}finally {connection.release();}}
    }
  }
  async function sources(request) {
    const id=repo.checkId(request.data?.id),{pool}=await context(request,id,true),year=Number(id.slice(5));
    let cursor={date:`${year-1}-09-01`,id:0};
    if(request.data?.cursor) {
      try {cursor=JSON.parse(request.data.cursor);}catch {fail("Pagination invalide.","invalid-argument");}
      if(!cursor || Object.keys(cursor).some(k=>!["date","id"].includes(k)) || !/^\d{4}-\d{2}-\d{2}$/.test(cursor.date||"") || cursor.date<`${year-1}-09-01` || cursor.date>`${year}-08-31` || !Number.isSafeInteger(cursor.id) || cursor.id<0) fail("Pagination invalide.","invalid-argument");
    }
    const rows=await repo.query(pool,"SELECT id,libelle,date FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date>=? AND date<=? AND (date>? OR (date=? AND id>?)) AND (ld IS NULL OR ld<>1) ORDER BY date,id LIMIT 51",[`${year-1}-09-01`,`${year}-08-31`,cursor.date,cursor.date,cursor.id]);
    const page=rows.slice(0,50),last=page.at(-1);
    return {source:"nap",sources:page.map(r=>{
      const aliases=sourceAliases(r.id);
      return {id:String(r.id),name:r.libelle,date:r.date,...(aliases.length?{aliases}:{})};
    }),cursor:rows.length>50?JSON.stringify({date:last.date,id:Number(last.id)}):""};
  }
  return {list,update,overview,sources};
}
module.exports={createNativeDtnSeasonService};
