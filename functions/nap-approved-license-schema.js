"use strict";
const {createHash}=require("node:crypto");
const table="livepalmes_swimmer_license_seasons", index="livepalmes_license_number_id";
const columns=[["swimmer_id","int","NO"],["season","varchar(9)","NO"],["license_number","varchar(100)","NO"],["status","varchar(16)","NO"],["source","varchar(32)","NO"],["federal_validity_end_date","date","YES"],["validated_at","datetime(6)","NO"],["validated_by","varchar(128)","NO"],["version","bigint unsigned","NO"]];
const createSql=`CREATE TABLE \`${table}\` (${columns.map(([name,type,nullable])=>`\`${name}\` ${type} ${nullable==="YES"?"NULL":"NOT NULL"}`).join(",")},PRIMARY KEY (swimmer_id,season),UNIQUE KEY season_license (season,license_number)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const indexSql=`ALTER TABLE nageurs ADD INDEX \`${index}\` (number,id)`;
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash=digest([createSql,indexSql]);
const normalize=value=>String(value).toLowerCase().replace(/\b(int|bigint)\(\d+\)/g,"$1");
function validate(meta) {
  const present=meta.tables.length===1;
  if(meta.tables.length>1 || (!present&&(meta.columns.length||meta.keys.length))) throw new TypeError("Structure de licences incoherente.");
  if(present) {
    if(meta.tables[0].ENGINE!=="InnoDB" || meta.tables[0].TABLE_COLLATION!=="utf8mb4_unicode_ci" || meta.columns.length!==columns.length || meta.columns.some((c,i)=>c.COLUMN_NAME!==columns[i][0]||normalize(c.COLUMN_TYPE)!==columns[i][1]||c.IS_NULLABLE!==columns[i][2]||c.COLUMN_DEFAULT!==null||c.EXTRA)) throw new TypeError("Table de licences incompatible.");
    const expected={PRIMARY:["swimmer_id","season"],season_license:["season","license_number"]};
    if(meta.keys.length!==4 || Object.entries(expected).some(([name,names])=>{const keys=meta.keys.filter(k=>k.INDEX_NAME===name).sort((a,b)=>a.SEQ_IN_INDEX-b.SEQ_IN_INDEX);return keys.length!==names.length||keys.some((k,i)=>k.COLUMN_NAME!==names[i]||Number(k.SEQ_IN_INDEX)!==i+1||Number(k.NON_UNIQUE)!==0||k.SUB_PART!==null);})) throw new TypeError("Cles de licences incompatibles.");
  }
  if(meta.index.length && (meta.index.length!==2 || meta.index.some((k,i)=>k.COLUMN_NAME!==["number","id"][i]||Number(k.SEQ_IN_INDEX)!==i+1||Number(k.NON_UNIQUE)!==1||k.SUB_PART!==null))) throw new TypeError("Index de licences incompatible.");
  return {table:present,index:meta.index.length===2};
}
async function approvedLicenseSchema(pool,input) {
  if(input?.confirmation!=="nap-license-season-controls"||!["prepare","apply"].includes(input.phase)) throw new TypeError("Confirmation invalide.");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[])=> (await connection.execute({sql,timeout:10000},values))[0];
  const inspect=async()=>({
    tables:await query("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",[table]),
    columns:await query("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 10",[table]),
    keys:await query("SELECT INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 5",[table]),
    index:await query("SELECT INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='nageurs' AND INDEX_NAME=? ORDER BY SEQ_IN_INDEX LIMIT 3",[index])
  });
  try {
    if(input.phase==="apply") {
      if(input.planHash!==planHash) throw new TypeError("Plan non confirme.");
      if(Number((await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1) throw new Error("Operation deja en cours.");locked=true;
    }
    const before=await inspect(),present=validate(before),schemaHash=digest(before);
    const base={source:"nap",planHash,schemaHash,before,sql:[createSql,indexSql],dataRowsWritten:false};
    if(input.phase==="prepare") return base;
    if(input.schemaHash!==schemaHash) throw new TypeError("Structure modifiee depuis la sauvegarde.");
    if(!present.table||!present.index) {
      if((await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101")).length) throw new Error("Ecriture en cours : operation differee.");
      if(!present.table) await connection.query({sql:createSql,timeout:30000});
      if(!present.index) await connection.query({sql:indexSql,timeout:120000});
    }
    const after=await inspect(),verified=validate(after);
    if(!verified.table||!verified.index) throw new Error("Verification de structure incomplete.");
    return {...base,after,verified:true};
  } finally {try{if(locked)await query("SELECT RELEASE_LOCK('livepalmes_portal_schema')");}finally{connection.release();}}
}
module.exports={approvedLicenseSchema,validate,columns,createSql,indexSql,planHash};
