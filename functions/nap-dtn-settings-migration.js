"use strict";
// One-time, explicitly authorized settings recovery. Never reads performances.
// Fixed budget: prepare <=4 source docs +12 metadata SQL +2 native reads;
// apply <=12 source docs +12 metadata SQL +6 native reads +4 inserts +2 locks.
const {createHash}=require("node:crypto");
const engine=require("./dtn-season-engine"),seed=require("./config/dtn-season-2025-2026.json");
const schema=require("./nap-approved-dtn-schema");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clone=value=>JSON.parse(JSON.stringify(value));
const validId=id=>/^\d{4}-\d{4}$/.test(id||"") && Number(id.slice(5))===Number(id.slice(0,4))+1;
async function readSource(db) {
  const collection=db.collection("dtnSeasons");
  const snapshot=await collection.doc("catalog").get();
  const catalog=snapshot.exists?snapshot.data():{revision:0,current:seed.id,previous:"",draft:""};
  if(!Number.isSafeInteger(catalog.revision) || catalog.revision<0 || !validId(catalog.current) || [catalog.previous,catalog.draft].some(id=>id && !validId(id))) throw new TypeError("Catalogue DTN invalide.");
  const ids=[catalog.current,catalog.previous,catalog.draft].filter(Boolean);
  if(new Set(ids).size!==ids.length || ids.length>3) throw new TypeError("Saisons DTN incompatibles.");
  const snapshots=await db.getAll(...ids.map(id=>collection.doc(id)));
  const seasons=snapshots.map((s,i)=>s.exists?s.data():ids[i]===seed.id?clone(seed):null);
  for(let i=0;i<seasons.length;i++) {
    const s=seasons[i];
    if(!s || s.id!==ids[i] || !Number.isSafeInteger(s.revision) || s.revision<0 || Buffer.byteLength(JSON.stringify(s))>=900000) throw new TypeError("Parametres DTN absents ou incompatibles.");
    engine.validateSeason(s,{incomplete:s.id===catalog.draft});
  }
  // Explicit fixed fields; keep each original season configuration unchanged.
  return {catalog:{revision:catalog.revision,current:catalog.current,previous:catalog.previous||"",draft:catalog.draft||""},seasons};
}
async function nativeRows(connection,ids,lock=false) {
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const suffix=lock?" FOR UPDATE":"";
  const catalog=await query(`SELECT id,revision,saison_active,saison_precedente,saison_brouillon FROM livepalmes_dtn_catalogue WHERE id=1 LIMIT 1${suffix}`);
  const seasons=await query(`SELECT id,revision,configuration FROM livepalmes_dtn_saisons WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id LIMIT 3${suffix}`,ids);
  return {catalog,seasons};
}
function matches(rows,source) {
  if(rows.catalog.length!==1 || rows.seasons.length!==source.seasons.length) return false;
  const c=rows.catalog[0],s=source.catalog;
  return Number(c.revision)===s.revision && c.saison_active===s.current && c.saison_precedente===s.previous && c.saison_brouillon===s.draft && source.seasons.every(season=>{
    const row=rows.seasons.find(r=>r.id===season.id);
    return row && Number(row.revision)===season.revision && row.configuration===JSON.stringify(season);
  });
}
async function migrateDtnSettings(pool,db,input) {
  if(input?.confirmation!=="nap-recover-dtn-settings" || !["prepare","apply"].includes(input.phase)) throw new TypeError("Confirmation de reprise invalide.");
  const source=await readSource(db),sourceHash=hash(source),ids=source.seasons.map(s=>s.id);
  const connection=await pool.getConnection();let locked=false,transaction=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    const metadata=await schema.inspect(connection);
    if(metadata.some((m,i)=>!schema.validate(schema.definitions[i],m))) throw new TypeError("Complements DTN manquants.");
    if(input.phase==="apply") {
      if(input.sourceHash!==sourceHash) throw new TypeError("Parametres modifies depuis la sauvegarde.");
      if(Number((await query("SELECT GET_LOCK('livepalmes_dtn_settings_migration',0) AS acquired"))[0]?.acquired)!==1) throw new Error("Reprise deja en cours.");
      locked=true;
      await connection.beginTransaction();transaction=true;
    }
    const before=await nativeRows(connection,ids,transaction),beforeHash=hash(before);
    const alreadyPresent=matches(before,source);
    const base={source:"nap",mode:"approved-dtn-settings-migration",sourceHash,beforeHash,before,settingsBackup:source,alreadyPresent,performanceRowsCopied:0};
    if(input.phase==="prepare") return {...base,writesExecuted:0};
    if(input.beforeHash!==beforeHash) throw new TypeError("Parametres NAP modifies depuis la sauvegarde.");
    if(!alreadyPresent && (before.catalog.length || before.seasons.length)) throw new TypeError("Reprise arretee : parametres NAP existants differents.");
    if(hash(await readSource(db))!==sourceHash) throw new TypeError("Parametres sources modifies pendant la reprise.");
    let writesExecuted=0;
    if(!alreadyPresent) {
      for(const season of source.seasons) {
        const [result]=await connection.execute({sql:"INSERT INTO livepalmes_dtn_saisons (id,revision,configuration,updated_at) VALUES (?,?,?,UTC_TIMESTAMP())",timeout:10000},[season.id,season.revision,JSON.stringify(season)]);
        if(result.affectedRows!==1) throw new Error("Reprise incomplete.");writesExecuted++;
      }
      const c=source.catalog;
      const [result]=await connection.execute({sql:"INSERT INTO livepalmes_dtn_catalogue (id,revision,saison_active,saison_precedente,saison_brouillon,updated_at) VALUES (1,?,?,?,?,UTC_TIMESTAMP())",timeout:10000},[c.revision,c.current,c.previous,c.draft]);
      if(result.affectedRows!==1) throw new Error("Reprise incomplete.");writesExecuted++;
    }
    if(!matches(await nativeRows(connection,ids,true),source)) throw new Error("Relecture des parametres differente.");
    if(hash(await readSource(db))!==sourceHash) throw new TypeError("Parametres sources modifies avant validation.");
    await connection.commit();transaction=false;
    return {...base,verified:true,writesExecuted};
  }finally {
    try {if(transaction) await connection.rollback();}
    finally {try {if(locked) await query("SELECT RELEASE_LOCK('livepalmes_dtn_settings_migration')");}finally {connection.release();}}
  }
}
module.exports={readSource,nativeRows,matches,migrateDtnSettings};
