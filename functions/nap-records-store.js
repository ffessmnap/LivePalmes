"use strict";
// One bounded snapshot, not one query per record. No sporting recalculation.
const {createHash}=require("node:crypto");
const {stableStringify,publicRecordsPayload}=require("./public-records-data");
const MAX_BYTES=2*1024*1024;
const ROW_KEYS=new Set("age bassin birthDate category categoryLabel chrono club clubId competition competitionId course courseLabel courseShortLabel date key length location manualFrozen masterRelay mixedRelay placeholderRecord points rawTime recordType recordTypeLabel region relayType seasonYear sex sourceCategory style styleLabel swimmer swimmerId time value intermediateTimes".split(" "));
const TOP_KEYS=new Set("id records franceRecords filters recordHistory sourceDate generatedAt cutoffDate updatedAt updatedBy updatedByEmail".split(" "));
const hash=value=>createHash("sha256").update(stableStringify(value)).digest("hex");
function validate(data){
  if(!data || typeof data!=="object" || Array.isArray(data) || Object.keys(data).some(k=>!TOP_KEYS.has(k)))throw new TypeError("Contenu Records/MPF invalide.");
  const serialized=JSON.stringify(data);
  if(Buffer.byteLength(serialized)>MAX_BYTES)throw new RangeError("Records/MPF trop volumineux.");
  publicRecordsPayload(data);
  if(data.id!==undefined && data.id!=="records")throw new TypeError("Reference Records/MPF invalide.");
  for(const key of ['sourceDate','generatedAt','cutoffDate','updatedAt'])if(data[key]!==undefined && (typeof data[key]!=="string"||data[key].length>40))throw new TypeError("Date Records/MPF invalide.");
  for(const rows of [data.records,data.franceRecords]){
    if(rows.length>20000)throw new RangeError("Trop de lignes Records/MPF.");
    for(const row of rows){
      if(!row || typeof row!=="object" || Array.isArray(row) || Object.entries(row).some(([key,value])=>!ROW_KEYS.has(key)||key!=="intermediateTimes"&&value!==null&&!['string','number','boolean'].includes(typeof value)))throw new TypeError("Ligne Records/MPF invalide.");
      if(row.intermediateTimes!==undefined && (!Array.isArray(row.intermediateTimes)||row.intermediateTimes.length>100||row.intermediateTimes.some(split=>!split||typeof split!=="object"||Array.isArray(split)||Object.entries(split).some(([key,value])=>!['code','time','timeValue'].includes(key)||value!==null&&!['string','number'].includes(typeof value)))))throw new TypeError("Passages Records/MPF invalides.");
    }
  }
  const filterKeys=new Set(['bassins','categories','courses','franceCourses','sexes']);
  if(Object.entries(data.filters).some(([key,values])=>!filterKeys.has(key)||!Array.isArray(values)||values.length>500||values.some(v=>typeof v!=="string")))throw new TypeError("Filtres Records/MPF invalides.");
  if(data.recordHistory!==undefined && (!Array.isArray(data.recordHistory)||data.recordHistory.length>1000))throw new TypeError("Historique Records/MPF invalide.");
  return data;
}
async function query(connection,sql,values=[]){return (await connection.execute({sql,timeout:10000},values))[0];}
function unpack(rows){
  if(rows.length!==1)throw new TypeError("Reference Records/MPF NAP absente ou incoherente.");
  const row=rows[0],revision=Number(row.revision);
  if(!Number.isSafeInteger(revision)||revision<1||typeof row.payload!=="string"||Buffer.byteLength(row.payload)>MAX_BYTES)throw new TypeError("Version Records/MPF invalide.");
  const data=validate(JSON.parse(row.payload));
  if(hash(data)!==row.payload_sha256)throw new TypeError("Empreinte Records/MPF incorrecte.");
  return {source:"nap",revision,data};
}
const READ_SQL="SELECT v.revision,v.payload,v.payload_sha256 FROM livepalmes_records_current c FORCE INDEX (PRIMARY) JOIN livepalmes_records_versions v FORCE INDEX (PRIMARY) ON v.revision=c.revision WHERE c.id=1 LIMIT 1";
async function read(pool,{administration=false}={}){
  const result=unpack(await query(pool,READ_SQL));
  return {...result,data:administration?result.data:publicRecordsPayload(result.data)};
}
async function publish(pool,input,actor){
  if(!actor?.uid || actor.uid.length>128 || !Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<1||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.operationId||""))throw new TypeError("Publication Records/MPF incomplete.");
  const proposed=JSON.parse(JSON.stringify(validate(input.data)));
  const connection=await pool.getConnection();let transaction=false;
  try{
    await connection.beginTransaction();transaction=true;
    const pointer=await query(connection,"SELECT revision FROM livepalmes_records_current WHERE id=1 LIMIT 1 FOR UPDATE");
    if(pointer.length!==1)throw new TypeError("Reference Records/MPF absente.");
    const previous=await query(connection,"SELECT revision,payload,payload_sha256,actor_uid FROM livepalmes_records_versions FORCE INDEX (operation_id) WHERE operation_id=? LIMIT 1",[input.operationId]);
    if(previous.length){
      const result=unpack(previous),saved={...result.data};delete saved.updatedBy;delete saved.updatedByEmail;delete saved.updatedAt;
      const retried={...proposed};delete retried.updatedBy;delete retried.updatedByEmail;delete retried.updatedAt;
      if(previous[0].actor_uid!==actor.uid || hash(saved)!==hash(retried)||result.revision!==input.expectedRevision+1)throw new TypeError("Operation Records/MPF incompatible.");
      await connection.commit();transaction=false;
      return {...result,replayed:true};
    }
    if(Number(pointer[0].revision)!==input.expectedRevision)throw new TypeError("Un autre gestionnaire a publie. Rechargez les Records/MPF avant de recommencer.");
    const revision=input.expectedRevision+1;
    if(!Number.isSafeInteger(revision))throw new RangeError("Version Records/MPF hors limite.");
    // Generate attribution/date once on the server; replay returns that exact saved version.
    const data=validate({...proposed,updatedAt:new Date().toISOString(),updatedBy:actor.uid,updatedByEmail:String(actor.email||"")});
    await query(connection,"INSERT INTO livepalmes_records_versions (revision,operation_id,payload,payload_sha256,created_at,actor_uid,source) VALUES (?,?,?,?,UTC_TIMESTAMP(6),?,?)",[revision,input.operationId,JSON.stringify(data),hash(data),actor.uid,"portal"]);
    const changed=await query(connection,"UPDATE livepalmes_records_current SET revision=?,updated_at=UTC_TIMESTAMP(6) WHERE id=1 AND revision=? LIMIT 1",[revision,input.expectedRevision]);
    if(changed.affectedRows!==1)throw new TypeError("La version active a change.");
    const verified=unpack(await query(connection,READ_SQL));
    if(verified.revision!==revision || hash(verified.data)!==hash(data))throw new Error("Verification Records/MPF incomplete.");
    await connection.commit();transaction=false;
    return verified;
  }finally{try{if(transaction)await connection.rollback();}finally{connection.release();}}
}
module.exports={MAX_BYTES,hash,validate,unpack,READ_SQL,read,publish};
