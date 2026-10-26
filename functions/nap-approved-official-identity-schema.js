"use strict";
const {createHash}=require("node:crypto");
const table="officiels";
const additions={sexe:"char(1)",number:"varchar(100)"};
const sql="ALTER TABLE `officiels` ADD COLUMN `sexe` char(1) NULL DEFAULT NULL, ADD COLUMN `number` varchar(100) NULL DEFAULT NULL";
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash=digest(sql);
function validate(metadata) {
  if(metadata.tables.length!==1||!['MyISAM','InnoDB'].includes(metadata.tables[0].ENGINE)||metadata.columns.length>20||metadata.columns.length<5||metadata.indexes.length>30) throw new TypeError("Structure officiels incompatible.");
  for(const name of ["id","nom","prenom","date","club"]) if(!metadata.columns.some(c=>c.COLUMN_NAME===name))throw new TypeError("Colonne native absente.");
  for(const [name,type] of Object.entries(additions)) {
    const column=metadata.columns.find(c=>c.COLUMN_NAME===name);
    if(column&&(column.COLUMN_TYPE.toLowerCase()!==type||column.IS_NULLABLE!=="YES"||column.COLUMN_DEFAULT!==null||column.EXTRA))throw new TypeError("Colonne d’identité existante incompatible.");
  }
  return Object.keys(additions).filter(name=>!metadata.columns.some(c=>c.COLUMN_NAME===name));
}
async function approvedOfficialIdentitySchema(pool,input) {
  if(input?.confirmation!=="nap-add-official-identity-fields"||!["prepare","apply"].includes(input.phase))throw new TypeError("Confirmation de structure invalide.");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[])=>(await connection.execute({sql,timeout:10000},values))[0];
  const inspect=async()=>({tables:await query("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='officiels' LIMIT 2"),columns:await query("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='officiels' ORDER BY ORDINAL_POSITION LIMIT 21"),indexes:await query("SELECT INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='officiels' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 31")});
  try {
    if(input.phase==="apply") {
      if(input.planHash!==planHash)throw new TypeError("Plan non confirmé.");
      if(Number((await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1)throw new TypeError("Opération de structure en cours.");
      locked=true;
    }
    const before=await inspect(),missing=validate(before),schemaHash=digest(before);
    const base={source:"nap",mode:"approved-people-schema",table,sql,planHash,schemaHash,before,dataRowsWritten:false};
    if(input.phase==="prepare")return base;
    if(schemaHash!==input.schemaHash)throw new TypeError("Structure modifiée depuis la sauvegarde.");
    if(missing.length) {
      if((await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101")).length)throw new TypeError("Écriture en cours : opération différée.");
      await connection.query({sql:`ALTER TABLE \`officiels\` ${missing.map(name=>`ADD COLUMN \`${name}\` ${additions[name]} NULL DEFAULT NULL`).join(", ")}`,timeout:120000});
    }
    const after=await inspect();
    if(validate(after).length||digest(before.indexes)!==digest(after.indexes)||before.tables[0].ENGINE!==after.tables[0].ENGINE||before.tables[0].TABLE_COLLATION!==after.tables[0].TABLE_COLLATION||before.columns.some(c=>digest(c)!==digest(after.columns.find(a=>a.COLUMN_NAME===c.COLUMN_NAME))))throw new Error("Vérification de structure incomplète.");
    return {...base,after,verified:true};
  } finally {try{if(locked)await query("SELECT RELEASE_LOCK('livepalmes_portal_schema')");}finally{connection.release();}}
}
module.exports={table,sql,planHash,validate,approvedOfficialIdentitySchema};
