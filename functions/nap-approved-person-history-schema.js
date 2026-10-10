"use strict";
// Explicitly approved fixed schema operation; never exposed as a callable.
const {createHash}=require("node:crypto");
const table="livepalmes_deleted_people_history",index="livepalmes_officiel_id";
const columns=[["engagement_id","int"],["person_id","int"],["competition_id","int"],["entry_club","varchar(25)"],["nom","varchar(100)"],["prenom","varchar(100)"],["date","varchar(10)"],["club","varchar(25)"],["deleted_at","datetime(6)"],["deleted_by","varchar(128)"]];
const sql=`CREATE TABLE \`${table}\` (${columns.map(([n,t])=>`\`${n}\` ${t} NOT NULL`).join(",")},PRIMARY KEY (\`engagement_id\`),KEY \`person_engagement\` (\`person_id\`,\`engagement_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const indexSql=`ALTER TABLE officielsengager ADD INDEX ${index} (officiel,id)`;
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize=value=>String(value).toLowerCase().replace(/\b(int)\(\d+\)/g,"$1");
function validate(meta) {
  const history=meta.tables.length===1;
  if(meta.tables.length>1 || !history && (meta.columns.length || meta.historyIndexes.length)) throw new TypeError("Historique incoherent.");
  if(history) {
    if(meta.tables[0].ENGINE!=="InnoDB" || meta.tables[0].TABLE_COLLATION!=="utf8mb4_unicode_ci" || meta.columns.length!==columns.length || meta.columns.some((c,i)=>c.COLUMN_NAME!==columns[i][0] || normalize(c.COLUMN_TYPE)!==columns[i][1] || c.IS_NULLABLE!=="NO" || c.COLUMN_DEFAULT!==null || c.EXTRA)) throw new TypeError("Structure historique incompatible.");
    const expected={PRIMARY:["engagement_id"],person_engagement:["person_id","engagement_id"]};
    const optional={livepalmes_entry_club_id:["entry_club","engagement_id"],livepalmes_club_id:["club","engagement_id"],livepalmes_delete_competition_id:["competition_id"]};
    for(const [name,names] of Object.entries(optional)) if(meta.historyIndexes.some(r=>r.INDEX_NAME===name)) expected[name]=names;
    if(meta.historyIndexes.length!==Object.values(expected).reduce((total,names)=>total+names.length,0) || Object.entries(expected).some(([name,names])=>{const rows=meta.historyIndexes.filter(r=>r.INDEX_NAME===name).sort((a,b)=>Number(a.SEQ_IN_INDEX)-Number(b.SEQ_IN_INDEX));return rows.length!==names.length || rows.some((r,i)=>r.COLUMN_NAME!==names[i] || Number(r.SEQ_IN_INDEX)!==i+1 || Number(r.NON_UNIQUE)!==(name==="PRIMARY"?0:1) || r.SUB_PART!==null);})) throw new TypeError("Index historique incompatible.");
  }
  if(meta.entryIndexes.length && (meta.entryIndexes.length!==2 || meta.entryIndexes.some((r,i)=>r.COLUMN_NAME!==["officiel","id"][i] || Number(r.SEQ_IN_INDEX)!==i+1 || Number(r.NON_UNIQUE)!==1 || r.SUB_PART!==null))) throw new TypeError("Index des liens incompatible.");
  return {history,index:meta.entryIndexes.length===2};
}
async function inspect(connection) {
  const query=async(sql,values)=>(await connection.execute({sql,timeout:10000},values))[0];
  const projection="INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART";
  const meta={tables:await query("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",[table]),columns:await query("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 11",[table]),historyIndexes:await query(`SELECT ${projection} FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 9`,[table]),entryIndexes:await query(`SELECT ${projection} FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='officielsengager' AND INDEX_NAME=? ORDER BY SEQ_IN_INDEX LIMIT 3`,[index])};
  validate(meta);return meta;
}
async function applyApproved(pool,input,backup) {
  if(input?.confirmation!=="approved-person-history-and-link-index" || typeof backup!=="function") throw new TypeError("Accord specifique et sauvegarde requis.");
  const connection=await pool.getConnection();let locked=false,safe=true;
  const query=async(sql,values=[])=>(await connection.execute({sql,timeout:10000},values))[0];
  const idle=async()=>{if((await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 1")).length) throw new TypeError("Ecriture active : ajout differe.");};
  try {
    if(Number((await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1) throw new TypeError("Structure en cours de modification.");locked=true;
    const before=await inspect(connection),state=validate(before);
    if(state.history && state.index) return {alreadyPresent:true,verified:true,dataRowsWritten:false};
    await idle();
    const [nativeStructure]=await query("SHOW CREATE TABLE officielsengager");
    const saved={kind:input.confirmation,before,nativeStructure,sql,indexSql,hash:hash(before)};
    if(await backup(saved)!==saved.hash) throw new TypeError("Sauvegarde non verifiee.");
    if(hash(await inspect(connection))!==saved.hash) throw new TypeError("Structure modifiee depuis sauvegarde.");
    await idle();
    if(!state.history) await connection.query({sql,timeout:30000});
    if(!state.index) {await idle();await connection.query({sql:indexSql,timeout:30000});}
    const after=validate(await inspect(connection));
    if(!after.history || !after.index) throw new Error("Verification de structure incomplete.");
    return {verified:true,alreadyPresent:false,dataRowsWritten:false};
  } finally {
    try {if(locked && Number((await query("SELECT RELEASE_LOCK('livepalmes_portal_schema') AS released"))[0]?.released)!==1) safe=false;}catch{safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
module.exports={table,index,columns,sql,indexSql,hash,validate,inspect,applyApproved};
