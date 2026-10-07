"use strict";
// Fixed additive scope authorized on 7 October 2026. No automatic migration.
const {createHash}=require("node:crypto");
const definitions=[
  {name:"livepalmes_dtn_catalogue",columns:[["id","tinyint unsigned"],["revision","int unsigned"],["saison_active","char(9)"],["saison_precedente","char(9)",""],["saison_brouillon","char(9)",""] ,["updated_at","datetime"]],indexes:{PRIMARY:["id"]}},
  {name:"livepalmes_dtn_saisons",columns:[["id","char(9)"],["revision","int unsigned"],["configuration","longtext"],["updated_at","datetime"]],indexes:{PRIMARY:["id"]}},
  {name:"livepalmes_dtn_resultats",columns:[["saison","char(9)"],["dispositif","varchar(16)"],["revision","int unsigned"],["empreinte","char(64)"],["contenu","longtext"],["generated_at","datetime"]],indexes:{PRIMARY:["saison","dispositif"]}},
  {name:"livepalmes_dtn_calculs",columns:[["saison","char(9)"],["operation_id","char(36)"],["revision","int unsigned"],["statut","varchar(16)"],["configuration","longtext"],["erreur","varchar(300)",""],["started_at","datetime"],["completed_at","datetime",null]],indexes:{PRIMARY:["saison"],operation_id:["operation_id"]}}
];
const statements=definitions.map(d=>`CREATE TABLE \`${d.name}\` (${d.columns.map(([name,type,defaultValue])=>`\`${name}\` ${type}${defaultValue===null?" NULL":" NOT NULL"}${defaultValue===""?" DEFAULT ''":""}`).join(",")},${Object.entries(d.indexes).map(([name,fields])=>`${name==="PRIMARY"?"PRIMARY KEY":`UNIQUE KEY \`${name}\``} (${fields.map(f=>`\`${f}\``).join(",")})`).join(",")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash=hash(statements);
const type=value=>String(value).toLowerCase().replace(/\b(bigint|int|tinyint)\(\d+\)/g,"$1");
function validate(definition,metadata) {
  if(!metadata.tables.length) {
    if(metadata.columns.length || metadata.indexes.length) throw new TypeError("Structure DTN orpheline.");
    return false;
  }
  if(metadata.tables.length!==1 || metadata.tables[0].ENGINE!=="InnoDB" || !/^utf8mb4_/.test(metadata.tables[0].TABLE_COLLATION||"")) throw new TypeError("Table DTN incompatible.");
  if(metadata.columns.length!==definition.columns.length || metadata.columns.some((c,i)=>{
    const [name,columnType,defaultValue]=definition.columns[i];
    return c.COLUMN_NAME!==name || type(c.COLUMN_TYPE)!==columnType || c.IS_NULLABLE!==(defaultValue===null?"YES":"NO") || c.COLUMN_DEFAULT!==(defaultValue===""?"":null) || Boolean(c.EXTRA);
  })) throw new TypeError("Colonnes DTN incompatibles.");
  if(metadata.indexes.length!==Object.values(definition.indexes).flat().length || Object.entries(definition.indexes).some(([name,fields])=>{
    const actual=metadata.indexes.filter(i=>i.INDEX_NAME===name).sort((a,b)=>a.SEQ_IN_INDEX-b.SEQ_IN_INDEX);
    return actual.length!==fields.length || actual.some((item,i)=>item.COLUMN_NAME!==fields[i] || Number(item.SEQ_IN_INDEX)!==i+1 || Number(item.NON_UNIQUE)!==0 || item.SUB_PART!==null);
  })) throw new TypeError("Index DTN incompatibles.");
  return true;
}
async function inspect(connection) {
  const query=async(sql,values)=>(await connection.execute({sql,timeout:10000},values))[0];
  const metadata=[];
  for(const d of definitions) {
    const m={name:d.name,
      tables:await query("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",[d.name]),
      columns:await query("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 9",[d.name]),
      indexes:await query("SELECT INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 4",[d.name])};
    validate(d,m);metadata.push(m);
  }
  return metadata;
}
async function approvedDtnSchema(pool,input) {
  if(input?.confirmation!=="nap-create-dtn-complements" || !["prepare","apply"].includes(input.phase)) throw new TypeError("Confirmation DTN invalide.");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql)=>(await connection.execute({sql,timeout:10000}))[0];
  try {
    if(input.phase==="apply") {
      if(input.planHash!==planHash) throw new TypeError("Plan DTN non confirme.");
      if(Number((await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1) throw new Error("Operation deja en cours.");
      locked=true;
    }
    const before=await inspect(connection),schemaHash=hash(before);
    const base={source:"nap",mode:"approved-dtn-schema",tables:definitions.map(d=>d.name),statements,planHash,schemaHash,before,dataRowsWritten:false};
    if(input.phase==="prepare") return base;
    if(input.schemaHash!==schemaHash) throw new TypeError("Structure modifiee depuis la sauvegarde.");
    const absent=before.map((m,i)=>validate(definitions[i],m)?null:i).filter(i=>i!==null);
    if(absent.length && (await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101")).length) throw new Error("Ecriture en cours : operation differee.");
    for(const i of absent) await connection.query({sql:statements[i],timeout:30000});
    const after=await inspect(connection);
    if(after.some((m,i)=>!validate(definitions[i],m))) throw new Error("Verification DTN incomplete.");
    return {...base,after,verified:true};
  }finally {
    try {if(locked) await query("SELECT RELEASE_LOCK('livepalmes_portal_schema')");}
    finally {connection.release();}
  }
}
module.exports={definitions,statements,planHash,validate,inspect,approvedDtnSchema};
