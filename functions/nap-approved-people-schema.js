"use strict";
// Fixed proposal: no client endpoint and no automatic deployment migration.
const {createHash}=require("node:crypto");
const table="livepalmes_club_people_options";
const columns=[
  ["source","varchar(16)"],["person_id","int"],["club_id","varchar(25)"],
  ["role_team_leader","tinyint"],["role_official","tinyint"],["active","tinyint"],
  ["version","bigint unsigned"],["created_at","datetime(6)"],["updated_at","datetime(6)"],
  ["created_by","varchar(128)"],["updated_by","varchar(128)"]
];
const sql=`CREATE TABLE \`${table}\` (${columns.map(([name,type])=>`\`${name}\` ${type} NOT NULL`).join(",")},PRIMARY KEY (\`source\`,\`person_id\`),KEY \`club_person\` (\`club_id\`,\`source\`,\`person_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash=digest(sql);
const normalize=value=>String(value).toLowerCase().replace(/\b(bigint|int|tinyint)\(\d+\)/g,"$1");
function validate(metadata) {
  if(!metadata.tables.length) {
    if(metadata.columns.length || metadata.indexes.length) throw new TypeError("Structure orpheline.");
    return false;
  }
  if(metadata.tables.length!==1 || metadata.tables[0].ENGINE!=="InnoDB" || metadata.tables[0].TABLE_COLLATION!=="utf8mb4_unicode_ci") throw new TypeError("Table incompatible.");
  if(metadata.columns.length!==columns.length || metadata.columns.some((c,i)=>c.COLUMN_NAME!==columns[i][0] || normalize(c.COLUMN_TYPE)!==columns[i][1] || c.IS_NULLABLE!=="NO" || c.COLUMN_DEFAULT!==null || c.EXTRA)) throw new TypeError("Colonnes incompatibles.");
  const expected={PRIMARY:["source","person_id"],club_person:["club_id","source","person_id"]};
  if(metadata.indexes.length!==5 || Object.entries(expected).some(([name,names])=>{
    const actual=metadata.indexes.filter(k=>k.INDEX_NAME===name).sort((a,b)=>a.SEQ_IN_INDEX-b.SEQ_IN_INDEX);
    return actual.length!==names.length || actual.some((k,i)=>k.COLUMN_NAME!==names[i] || Number(k.SEQ_IN_INDEX)!==i+1 || Number(k.NON_UNIQUE)!==(name==="PRIMARY"?0:1) || k.SUB_PART!==null);
  })) throw new TypeError("Index incompatibles.");
  return true;
}
async function inspectPeopleSchema(connection) {
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const metadata={
    tables:await query("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",[table]),
    columns:await query("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 12",[table]),
    indexes:await query("SELECT INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 6",[table])
  };
  validate(metadata);return metadata;
}
async function approvedPeopleSchema(pool,input) {
  if(input?.confirmation!=="nap-create-club-people-options" || !["prepare","apply"].includes(input.phase)) throw new TypeError("Confirmation invalide.");
  const connection=await pool.getConnection(); let locked=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const inspect=()=>inspectPeopleSchema(connection);
  try {
    if(input.phase==="apply") {
      if(input.planHash!==planHash) throw new TypeError("Plan non confirme.");
      if(Number((await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1) throw new Error("Operation deja en cours.");
      locked=true;
    }
    const before=await inspect(),alreadyPresent=validate(before),schemaHash=digest(before);
    const base={source:"nap",mode:"approved-people-schema",table,sql,planHash,schemaHash,before,alreadyPresent,dataRowsWritten:false};
    if(input.phase==="prepare") return base;
    if(input.schemaHash!==schemaHash) throw new TypeError("Structure modifiee depuis la sauvegarde.");
    if(!alreadyPresent) {
      if((await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101")).length) throw new Error("Ecriture en cours : operation differee.");
      await connection.query({sql,timeout:30000});
    }
    const after=await inspect(); if(!validate(after)) throw new Error("Verification incomplete.");
    return {...base,after,verified:true};
  } finally {
    try {if(locked) await query("SELECT RELEASE_LOCK('livepalmes_portal_schema')");}
    finally {connection.release();}
  }
}
module.exports={table,columns,sql,planHash,validate,inspectPeopleSchema,approvedPeopleSchema};
