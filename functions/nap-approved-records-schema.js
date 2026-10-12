"use strict";
// Two additive tables, authorised by Antoine on 12 October 2026.
const {createHash}=require("node:crypto");
const definitions=[
  {name:"livepalmes_records_versions",columns:[["revision","bigint unsigned"],["operation_id","char(36)",false,"ascii_bin"],["payload","longtext"],["payload_sha256","char(64)",false,"ascii_bin"],["created_at","datetime(6)"],["actor_uid","varchar(128)",true],["source","varchar(32)"]],keys:{PRIMARY:["revision"],operation_id:["operation_id"]}},
  {name:"livepalmes_records_current",columns:[["id","tinyint unsigned"],["revision","bigint unsigned"],["updated_at","datetime(6)"]],keys:{PRIMARY:["id"]}}
];
const statements=definitions.map(d=>`CREATE TABLE \`nage-palmes\`.\`${d.name}\` (${d.columns.map(([name,type,nullable,collation])=>`\`${name}\` ${type}${collation?" CHARACTER SET ascii COLLATE ascii_bin":""}${nullable?" NULL":" NOT NULL"}`).join(",")},${Object.entries(d.keys).map(([name,fields])=>`${name==="PRIMARY"?"PRIMARY KEY":`UNIQUE KEY \`${name}\``} (${fields.map(f=>`\`${f}\``).join(",")})`).join(",")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const type=value=>String(value).toLowerCase().replace(/\b(bigint|tinyint)\(\d+\)/g,"$1");
function validate(d,m){
  if(!m.tables.length){if(m.columns.length||m.keys.length)throw new TypeError("Structure Records orpheline.");return false;}
  if(m.tables.length!==1||m.tables[0].ENGINE!=="InnoDB"||!/^utf8mb4_/.test(m.tables[0].TABLE_COLLATION||""))throw new TypeError("Table Records incompatible.");
  if(m.columns.length!==d.columns.length||m.columns.some((c,i)=>{const [name,t,nullable,collation]=d.columns[i];return c.COLUMN_NAME!==name||type(c.COLUMN_TYPE)!==t||c.IS_NULLABLE!==(nullable?"YES":"NO")||c.COLUMN_DEFAULT!==null||Boolean(c.EXTRA)||collation&&c.COLLATION_NAME!==collation;}))throw new TypeError("Colonnes Records incompatibles.");
  if(m.keys.length!==Object.values(d.keys).flat().length||Object.entries(d.keys).some(([name,fields])=>{const a=m.keys.filter(k=>k.INDEX_NAME===name).sort((a,b)=>a.SEQ_IN_INDEX-b.SEQ_IN_INDEX);return a.length!==fields.length||a.some((k,i)=>k.COLUMN_NAME!==fields[i]||Number(k.NON_UNIQUE)!==0||Number(k.SEQ_IN_INDEX)!==i+1||k.SUB_PART!==null);}))throw new TypeError("Index Records incompatibles.");
  return true;
}
async function inspect(connection){
  const q=async(sql,name)=>(await connection.execute({sql,timeout:10000},[name]))[0];
  const out=[];
  for(const d of definitions){const m={name:d.name,tables:await q("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",d.name),columns:await q("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 9",d.name),keys:await q("SELECT INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 4",d.name)};validate(d,m);out.push(m);}
  return out;
}
async function apply(connection,backup,saveBackup){
  const q=async(sql)=>(await connection.execute({sql,timeout:10000}))[0];let locked=false;
  try{
    if(Number((await q("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1)throw new Error("Structure occupee.");locked=true;
    const before=await inspect(connection);
    if(before.some(m=>m.tables.length))throw new TypeError("Une table Records existe deja : examiner avant reprise.");
    if((await q("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101")).length)throw new Error("Ecriture en cours : operation differee.");
    const plan={before,statements,planHash:hash(statements),schemaHash:hash(before),sourceHash:backup.sourceHash};
    if(await saveBackup(plan)!==hash(plan))throw new Error("Sauvegarde non verifiee.");
    if(hash(await inspect(connection))!==plan.schemaHash)throw new Error("Structure modifiee depuis sauvegarde.");
    for(const sql of statements)await connection.query({sql,timeout:30000});
    const after=await inspect(connection);
    if(after.some((m,i)=>!validate(definitions[i],m)))throw new Error("Verification structure incomplete.");
    return {...plan,after,verified:true};
  }finally{if(locked)await q("SELECT RELEASE_LOCK('livepalmes_portal_schema')");}
}
module.exports={definitions,statements,hash,validate,inspect,apply};
