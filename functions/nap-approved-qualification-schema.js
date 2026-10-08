"use strict";
// Fixed additive proposal. No callable or ordinary deployment invokes this.
const {createHash}=require("node:crypto");
const specs=[
  {name:"livepalmes_qualification_grants",columns:[["competition_id","int"],["swimmer_id","int"],["event_code","varchar(32)"],["club_id","varchar(25)"],["status","varchar(16)"],["reason","varchar(1000)"],["approved_by","varchar(128)"],["approved_at","datetime(6)"],["revoked_by","varchar(128)",true],["revoked_at","datetime(6)",true],["version","bigint unsigned"]],keys:{PRIMARY:["competition_id","swimmer_id","event_code"],competition_club:["competition_id","club_id","swimmer_id","event_code"]}},
  {name:"livepalmes_qualification_jobs",columns:[["id","varchar(64)"],["competition_id","int"],["actor_uid","varchar(128)"],["state","varchar(16)"],["payload","json"],["cursor","varchar(128)"],["version","bigint unsigned"],["created_at","datetime(6)"],["updated_at","datetime(6)"]],keys:{PRIMARY:["id"],competition_state:["competition_id","state","id"]}}
];
const sql=specs.map(spec=>`CREATE TABLE \`${spec.name}\` (${spec.columns.map(([name,type,nullable])=>`\`${name}\` ${type} ${nullable?"NULL":"NOT NULL"}`).join(",")},${Object.entries(spec.keys).map(([key,columns])=>`${key==="PRIMARY"?"PRIMARY KEY":`KEY \`${key}\``} (${columns.map(name=>`\`${name}\``).join(",")})`).join(",")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash=digest(sql);
const normalize=value=>String(value).toLowerCase().replace(/\b(bigint|int|tinyint)\(\d+\)/g,"$1");
function validate(metadata) {
  if(metadata.tables.length>2||metadata.columns.length>20||metadata.indexes.length>11) throw new TypeError("Structure de qualification trop volumineuse.");
  for(const spec of specs) {
    const tables=metadata.tables.filter(t=>t.TABLE_NAME===spec.name),columns=metadata.columns.filter(c=>c.TABLE_NAME===spec.name),indexes=metadata.indexes.filter(i=>i.TABLE_NAME===spec.name);
    if(!tables.length) {if(columns.length||indexes.length) throw new TypeError("Structure orpheline.");continue;}
    if(tables.length!==1||tables[0].ENGINE!=="InnoDB"||tables[0].TABLE_COLLATION!=="utf8mb4_unicode_ci") throw new TypeError("Table de qualification incompatible.");
    if(columns.length!==spec.columns.length||columns.some((c,i)=>c.COLUMN_NAME!==spec.columns[i][0]||normalize(c.COLUMN_TYPE)!==spec.columns[i][1]||c.IS_NULLABLE!==(spec.columns[i][2]?"YES":"NO")||c.COLUMN_DEFAULT!==null||c.EXTRA)) throw new TypeError("Colonnes de qualification incompatibles.");
    if(indexes.length!==Object.values(spec.keys).reduce((n,list)=>n+list.length,0)||Object.entries(spec.keys).some(([name,names])=>{
      const actual=indexes.filter(i=>i.INDEX_NAME===name).sort((a,b)=>a.SEQ_IN_INDEX-b.SEQ_IN_INDEX);
      return actual.length!==names.length||actual.some((i,p)=>i.COLUMN_NAME!==names[p]||Number(i.SEQ_IN_INDEX)!==p+1||Number(i.NON_UNIQUE)!==(name==="PRIMARY"?0:1)||i.SUB_PART!==null);
    })) throw new TypeError("Index de qualification incompatibles.");
  }
  if(metadata.tables.some(t=>!specs.some(spec=>spec.name===t.TABLE_NAME))) throw new TypeError("Table hors proposition.");
}
async function inspect(connection) {
  const names=specs.map(s=>s.name),query=async sql=>(await connection.execute({sql,timeout:10000},names))[0];
  const metadata={
    tables:await query("SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?) ORDER BY TABLE_NAME LIMIT 3"),
    columns:await query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?) ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 21"),
    indexes:await query("SELECT TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?) ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX LIMIT 12")
  };validate(metadata);return metadata;
}
async function approvedQualificationSchema(pool,input) {
  if(input?.confirmation!=="nap-create-qualification-complements"||!["prepare","apply"].includes(input.phase)) throw new TypeError("Confirmation invalide.");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    if(input.phase==="apply") {
      if(input.planHash!==planHash) throw new TypeError("Plan non confirme.");
      if(Number((await query("SELECT GET_LOCK('livepalmes_qualification_schema',0) AS acquired"))[0]?.acquired)!==1) throw new Error("Operation de structure deja en cours.");
      locked=true;
    }
    const before=await inspect(connection),schemaHash=digest(before),base={planHash,schemaHash,before,sql,dataRowsWritten:false};
    if(input.phase==="prepare") return base;
    if(input.schemaHash!==schemaHash) throw new TypeError("Structure modifiee depuis la sauvegarde.");
    if((await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101")).length) throw new Error("Ecriture en cours : operation differee.");
    const created=[];
    for(let i=0;i<specs.length;i++) if(!before.tables.some(t=>t.TABLE_NAME===specs[i].name)) {await connection.query({sql:sql[i],timeout:30000});created.push(specs[i].name);}
    const after=await inspect(connection);
    if(after.tables.length!==2) throw new Error("Verification de structure incomplete.");
    return {...base,created,after,verified:true};
  } finally {try {if(locked) await query("SELECT RELEASE_LOCK('livepalmes_qualification_schema')");} finally {connection.release();}}
}
module.exports={specs,sql,planHash,validate,inspect,approvedQualificationSchema};
