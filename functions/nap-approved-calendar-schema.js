"use strict";
// Fixed, specifically approved operation. Never invoked by a deployment/callable.
const {createHash}=require("node:crypto");
const specs=[
 {table:"livepalmes_open_water_course_library",key:"id",columns:[["id","tinyint unsigned","NO"],["courses","json","NO"],["version","bigint unsigned","NO","1"],["updated_at","datetime(6)","NO"],["updated_by","varchar(128)","NO"]]},
 {table:"livepalmes_calendar_event_details",key:"competition_id",columns:[["competition_id","int","NO"],["registration_url","varchar(500)","NO"],["registration_deadline_at","datetime(6)","YES"],["program_sessions","json","NO"],["version","bigint unsigned","NO","1"],["updated_at","datetime(6)","NO"],["updated_by","varchar(128)","NO"]]}
];
const sql=specs.map(s=>`CREATE TABLE \`${s.table}\` (${s.columns.map(([name,type,nullable,def])=>`\`${name}\` ${type} ${nullable==="YES"?"NULL":"NOT NULL"}${def?` DEFAULT ${def}`:""}`).join(",")},PRIMARY KEY (\`${s.key}\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize=value=>String(value).toLowerCase().replace(/\b(tinyint|int|bigint)\(\d+\)/g,"$1");
function validate(meta) {
 return specs.map((s,i)=>{
  const m=meta[i];
  if(!m||m.tables.length>1||!m.tables.length&&(m.columns.length||m.keys.length)) throw new TypeError("Complement calendrier incoherent.");
  if(!m.tables.length)return false;
  if(m.tables[0].ENGINE!=="InnoDB"||m.tables[0].TABLE_COLLATION!=="utf8mb4_unicode_ci"||m.columns.length!==s.columns.length||m.columns.some((c,j)=>c.COLUMN_NAME!==s.columns[j][0]||normalize(c.COLUMN_TYPE)!==s.columns[j][1]||c.IS_NULLABLE!==s.columns[j][2]||(c.COLUMN_DEFAULT==null?null:String(c.COLUMN_DEFAULT))!==(s.columns[j][3]??null)||c.EXTRA))throw new TypeError("Structure calendrier incompatible.");
  if(m.keys.length!==1||m.keys[0].INDEX_NAME!=="PRIMARY"||m.keys[0].COLUMN_NAME!==s.key||Number(m.keys[0].NON_UNIQUE)!==0||Number(m.keys[0].SEQ_IN_INDEX)!==1||m.keys[0].SUB_PART!==null)throw new TypeError("Cle calendrier incompatible.");
  return true;
 });
}
async function inspect(connection) {
 const q=async(sql,values)=>(await connection.execute({sql,timeout:10000},values))[0],meta=[];
 for(const s of specs) meta.push({tables:await q("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",[s.table]),columns:await q("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 8",[s.table]),keys:await q("SELECT INDEX_NAME,COLUMN_NAME,NON_UNIQUE,SEQ_IN_INDEX,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 2",[s.table])});
 validate(meta);return meta;
}
async function applyApproved(pool,input,backup) {
 if(input?.confirmation!=="approved-calendar-library-and-event-details"||typeof backup!=="function")throw new TypeError("Accord et sauvegarde requis.");
 const c=await pool.getConnection();let locked=false,safe=true;
 const q=async(sql,values=[])=>(await c.execute({sql,timeout:10000},values))[0];
 const idle=async()=>{if((await q("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 1")).length)throw new TypeError("Ecriture active : operation differee.");};
 try {
  if(Number((await q("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1)throw new TypeError("Structure occupee.");locked=true;
  const before=await inspect(c),present=validate(before);
  if(present.every(Boolean))return {verified:true,alreadyPresent:true,dataRowsWritten:false};
  await idle();const saved={kind:input.confirmation,before,sql,hash:hash(before)};
  if(await backup(saved)!==saved.hash)throw new TypeError("Sauvegarde non verifiee.");
  if(hash(await inspect(c))!==saved.hash)throw new TypeError("Structure modifiee depuis sauvegarde.");
  for(let i=0;i<specs.length;i++)if(!present[i]){await idle();await c.query({sql:sql[i],timeout:30000});}
  if(!validate(await inspect(c)).every(Boolean))throw new TypeError("Verification incomplete.");
  return {verified:true,alreadyPresent:false,dataRowsWritten:false};
 }finally {
  try{if(locked&&Number((await q("SELECT RELEASE_LOCK('livepalmes_portal_schema') AS released"))[0]?.released)!==1)safe=false;}catch{safe=false;}
  if(safe)c.release();else c.destroy();
 }
}
module.exports={specs,sql,hash,validate,inspect,applyApproved};
