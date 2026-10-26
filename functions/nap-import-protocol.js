"use strict";
// One PDF only. Its before/after images live in the existing import journal;
// the ZIP and PDF bytes never enter SQL. Called under both native locks.
const {createHash,randomUUID}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const documents=require("./nap-competition-documents");
const {documentOptionsContract}=require("./nap-document-options-contract");
const {decodeCompetitionDocumentDataUrl,competitionDocumentTokenFromUrl,MAX_COMPETITION_DOCUMENTS}=require("./engagement-competition-documents");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const digest=buffer=>createHash("sha256").update(buffer).digest("hex");
const fields=row=>row?Object.fromEntries(documents.FIELDS.map(key=>[key,row[key]])):null;
const options=row=>row?.document_id==null?null:Object.fromEntries(documents.OPTIONS.map(key=>[key,["document_id","size","version"].includes(key)?Number(row[key]):row[key]]));
const equal=isDeepStrictEqual;
function manifest(value){
  if(!value||typeof value.fileName!=="string"||value.fileName.length>180||!/^([^/\\\x00-\x1f]+)\.pdf$/i.test(value.fileName)||!Number.isSafeInteger(value.size)||value.size<5||value.size>10*1024*1024||!/^[a-f0-9]{64}$/.test(value.hash))throw new TypeError("Protocole PDF et empreinte valides requis.");
  return {fileName:value.fileName,size:value.size,hash:value.hash};
}
function decode(input){
  const expected=manifest(input.protocolManifest);
  if(typeof input.protocolDataUrl!=="string"||input.protocolDataUrl.length>14*1024*1024)throw new TypeError("Protocole PDF manquant ou trop volumineux.");
  let decoded;try{decoded=decodeCompetitionDocumentDataUrl(input.protocolDataUrl,expected.fileName,{national:true});}catch(error){throw new TypeError(error.message);}
  if(decoded.buffer.length!==expected.size||digest(decoded.buffer)!==expected.hash)throw new TypeError("Le PDF ne correspond plus à l’aperçu.");
  return decoded;
}
async function current(pool,competitionId,{withText=false}={}){
  const [rows]=await pool.execute({sql:"SELECT metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",timeout:10000},[hash(["nap-results-current",competitionId])]);
  const pointer=typeof rows[0]?.metadata==="string"?JSON.parse(rows[0].metadata):rows[0]?.metadata;
  if(pointer?.activeImportId)throw new TypeError("Import de résultats en cours : réessayez après sa fin.");
  return withText?{protocol:pointer?.protocol||null,text:pointer?.textManifest||null}:pointer?.protocol||null;
}
async function prepare(connection,{competitionId,nextId,previous,manifest:source,uid,downloadUrl}){
  source=manifest(source);
  const q=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const columns=await q("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY ORDINAL_POSITION LIMIT 13");
  const indexes=await q("SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 3");
  documentOptionsContract(columns,indexes);
  const current=await documents.rows(connection,competitionId),before=previous?current.find(r=>Number(r.id)===previous.documentId):null;
  if(previous&&(!before||hash([fields(before),options(before)])!==previous.documentFingerprint))throw new TypeError("Le protocole précédent a changé. Vérification nationale requise avant remplacement.");
  if(!before&&current.length>=MAX_COMPETITION_DOCUMENTS)throw new TypeError("La compétition contient déjà 20 documents. Libérez une place avant l’import.");
  if(!before&&current.some(r=>Number(r.id)>=nextId))throw new TypeError("Allocation de document incohérente.");
  const old=options(before),now=new Date().toISOString().replace("T"," ").replace("Z","000");
  if(before&&previous.hash===source.hash&&old?.storage_path)return {manifest:source,upload:{path:old.storage_path,token:competitionDocumentTokenFromUrl(before.location)},before:fields(before),previous:old,after:fields(before),extra:old};
  const upload={path:`competition-documents/nap/${randomUUID()}.pdf`,token:randomUUID()};
  const location=downloadUrl(upload.path,upload.token);
  if(typeof location!=="string"||location.length>255)throw new TypeError("Lien PDF trop long pour NAP.");
  const after={...(fields(before)||{id:nextId,user:null,competition:competitionId,sent:0,public:"Y",element:34}),name:"Protocole complet — résultats",type:11,location,date:now.slice(0,19),comment:"Protocole complet de l’import WinPalme validé nationalement."};
  const extra={document_id:after.id,category:"results",file_name:source.fileName,storage_path:upload.path,content_type:"application/pdf",size:source.size,version:Number(old?.version||0)+1,created_at:old?.created_at||now,updated_at:now,created_by:old?.created_by||uid,updated_by:uid};
  if(!Number.isSafeInteger(extra.version)||extra.version<1)throw new TypeError("Version PDF invalide.");
  return {manifest:source,upload,before:fields(before),previous:old,after,extra};
}
// Accept only the before image or a verified partial/complete after image.
// An INSERT whose response was lost is found by its preallocated primary key.
async function verify(connection,plan){
  const current=(await documents.rows(connection,plan.after.competition)).find(r=>Number(r.id)===plan.after.id);
  const native=fields(current),extra=options(current);
  if(!equal(native,plan.before)&&!equal(native,plan.after))throw new TypeError("Document modifié pendant l’import. Reprise nationale requise.");
  if(!equal(extra,plan.previous)&&!equal(extra,plan.extra))throw new TypeError("Métadonnées PDF modifiées pendant l’import.");
  return {native,extra};
}
async function publish(connection,plan){
  const {native,extra}=await verify(connection,plan);
  if(!equal(native,plan.after)){
    const statement=plan.before?documents.writePlan("update",plan.before,plan.after):{sql:`INSERT INTO documents (${documents.FIELDS.map(k=>`\`${k}\``).join(",")}) VALUES (${documents.FIELDS.map(()=>"?").join(",")})`,values:documents.FIELDS.map(k=>plan.after[k])};
    const [result]=await connection.execute({sql:statement.sql,timeout:10000},statement.values);
    if(result.affectedRows!==1)throw new Error("Enregistrement PDF interrompu ; sauvegarde conservée.");
  }
  if(!equal(extra,plan.extra))await connection.execute({sql:`INSERT INTO livepalmes_document_options (${documents.OPTIONS.map(k=>`\`${k}\``).join(",")}) VALUES (${documents.OPTIONS.map(()=>"?").join(",")}) ON DUPLICATE KEY UPDATE ${documents.OPTIONS.slice(1).map(k=>`\`${k}\`=VALUES(\`${k}\`)`).join(",")}`,timeout:10000},documents.OPTIONS.map(k=>plan.extra[k]));
  const verified=(await documents.rows(connection,plan.after.competition)).find(r=>Number(r.id)===plan.after.id);
  if(!equal(fields(verified),plan.after)||!equal(options(verified),plan.extra))throw new Error("PDF enregistré à vérifier ; sauvegarde conservée.");
  // Old Storage objects stay in the durable before image for recovery. Only
  // the current document link changes; unrelated competition documents stay.
  return {...plan.manifest,documentId:plan.after.id,documentFingerprint:hash([fields(plan.after),options(plan.extra)])};
}
module.exports={manifest,decode,current,prepare,verify,publish,digest};
