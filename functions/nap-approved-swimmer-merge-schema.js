"use strict";
// Fixed, explicitly approved offline operation. Never called by a portal action.
const {createHash}=require("node:crypto");
const table="livepalmes_swimmer_merges";
const columns=[["swimmer_id","int"],["target_id","int"],["merged_at","datetime(6)"],["merged_by","varchar(128)"]];
const indexes=[
  ...["cnc_edf","cnc_medailles","cnc_nageurs","documents_controles","engagements_relayeurs","nageurs_derogations","nageurs_enf","nageurs_verifications","txt_nageurs"].map(table=>({table,name:"livepalmes_nageur_id",columns:["nageur","id"]})),
  {table:"livepalmes_qualification_grants",name:"livepalmes_swimmer_compet_event",columns:["swimmer_id","competition_id","event_code"]},
  ...[1,2,3,4].map(n=>({table:"perfs_relais",name:`livepalmes_nageur${n}_id`,columns:[`nageur${n}`,"id"]}))
];
const nativeTables=[...new Set(indexes.map(item=>item.table))];
const createSql=`CREATE TABLE \`${table}\` (${columns.map(([n,t])=>`\`${n}\` ${t} NOT NULL`).join(",")},PRIMARY KEY (\`swimmer_id\`),KEY \`target_swimmer\` (\`target_id\`,\`swimmer_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize=value=>String(value).toLowerCase().replace(/\bint\(\d+\)/g,"int");
function validateIndex(rows,definition,unique=false){
  return rows.length===definition.length && rows.every((row,i)=>row.COLUMN_NAME===definition[i] && Number(row.SEQ_IN_INDEX)===i+1 && Number(row.NON_UNIQUE)===(unique?0:1) && row.SUB_PART===null);
}
function validate(meta){
  const own=meta.tables.filter(row=>row.TABLE_NAME===table);
  if(own.length>1)throw new TypeError("Structure de fusion incoherente.");
  if(nativeTables.some(name=>meta.tables.filter(row=>row.TABLE_NAME===name).length!==1))throw new TypeError("Table native manquante.");
  const ownColumns=meta.columns.filter(row=>row.TABLE_NAME===table),ownIndexes=meta.indexes.filter(row=>row.TABLE_NAME===table);
  if(own.length){
    if(own[0].ENGINE!=="InnoDB" || own[0].TABLE_COLLATION!=="utf8mb4_unicode_ci" || ownColumns.length!==4 || ownColumns.some((row,i)=>row.COLUMN_NAME!==columns[i][0] || normalize(row.COLUMN_TYPE)!==columns[i][1] || row.IS_NULLABLE!=="NO" || row.COLUMN_DEFAULT!==null || row.EXTRA))throw new TypeError("Table de fusion incompatible.");
    if(ownIndexes.length!==3 || !validateIndex(ownIndexes.filter(row=>row.INDEX_NAME==="PRIMARY"),["swimmer_id"],true) || !validateIndex(ownIndexes.filter(row=>row.INDEX_NAME==="target_swimmer"),["target_id","swimmer_id"]))throw new TypeError("Index de fusion incompatible.");
  }else if(ownColumns.length || ownIndexes.length)throw new TypeError("Structure de fusion incomplete.");
  const present=indexes.map(def=>{
    if(def.columns.some(column=>!meta.columns.some(row=>row.TABLE_NAME===def.table && row.COLUMN_NAME===column)))throw new TypeError("Colonne native manquante.");
    const found=meta.indexes.filter(row=>row.TABLE_NAME===def.table && row.INDEX_NAME===def.name);
    if(found.length && !validateIndex(found,def.columns))throw new TypeError("Index natif incompatible.");
    return found.length>0;
  });
  return {table:own.length===1,indexes:present};
}
async function inspect(connection){
  const names=[table,...nativeTables],marks=names.map(()=>"?").join(",");
  const read=async(sql)=>(await connection.execute({sql,timeout:10000},names))[0];
  const meta={
    tables:await read(`SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${marks}) ORDER BY TABLE_NAME LIMIT 13`),
    columns:await read(`SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${marks}) ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 501`),
    indexes:await read(`SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${marks}) ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX LIMIT 301`)
  };
  if(meta.tables.length>12 || meta.columns.length>500 || meta.indexes.length>300)throw new RangeError("Structure trop volumineuse.");
  validate(meta);return meta;
}
function statements(state){
  const result=state.table?[]:[createSql];
  for(const name of nativeTables){
    const missing=indexes.filter((def,i)=>def.table===name && !state.indexes[i]);
    if(missing.length)result.push(`ALTER TABLE \`${name}\` ${missing.map(def=>`ADD INDEX \`${def.name}\` (${def.columns.map(column=>`\`${column}\``).join(",")})`).join(",")}`);
  }
  return result;
}
async function applyApproved(pool,input,backup){
  if(input?.confirmation!=="approved-swimmer-merge-table-and-14-indexes" || typeof backup!=="function")throw new TypeError("Accord specifique et sauvegarde requis.");
  const connection=await pool.getConnection();let locked=false,safe=true;
  const read=async(sql)=>(await connection.execute({sql,timeout:10000}))[0];
  const idle=async()=>{if((await read("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 1")).length)throw new TypeError("Ecriture active : ajout differe.");};
  try{
    if(Number((await read("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1)throw new TypeError("Structure en cours de modification.");locked=true;
    let current=await inspect(connection);const pending=statements(validate(current));
    if(!pending.length)return {verified:true,alreadyPresent:true,dataRowsWritten:false};
    await idle();
    const nativeStructure=[];
    for(const name of nativeTables)nativeStructure.push((await read(`SHOW CREATE TABLE \`${name}\``))[0]);
    const saved={kind:input.confirmation,before:current,nativeStructure,statements:pending,hash:hash(current)};
    if(await backup(saved)!==saved.hash)throw new TypeError("Sauvegarde non verifiee.");
    for(const sql of pending){
      if(hash(await inspect(connection))!==hash(current))throw new TypeError("Structure modifiee depuis sauvegarde.");
      await idle();
      await connection.query({sql,timeout:120000});
      current=await inspect(connection);
    }
    const after=validate(current);
    if(!after.table || after.indexes.some(value=>!value))throw new Error("Verification de structure incomplete.");
    return {verified:true,alreadyPresent:false,dataRowsWritten:false,tablePresent:true,indexCount:after.indexes.length};
  }finally{
    try{if(locked && Number((await read("SELECT RELEASE_LOCK('livepalmes_portal_schema') AS released"))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={table,columns,indexes,nativeTables,createSql,hash,validate,inspect,statements,applyApproved};
