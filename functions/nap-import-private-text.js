"use strict";
// Private archive in the existing NAP journal, never in public documents or
// Storage. Only the current completed import can be downloaded; no delete API.
const {createHash}=require("node:crypto"),{gzipSync,gunzipSync}=require("node:zlib");
const MAX_BYTES=5*1024*1024;
const digest=buffer=>createHash("sha256").update(buffer).digest("hex");
function manifest(value){
  if(!value||typeof value.fileName!=="string"||value.fileName.length>255||!/^[^/\\\x00-\x1f]+\.txt$/i.test(value.fileName)||!["utf-8","windows-1252"].includes(value.encoding)||!Number.isSafeInteger(value.size)||value.size<1||value.size>MAX_BYTES||!/^[a-f0-9]{64}$/.test(value.hash))throw new TypeError("Référence du TXT source invalide.");
  return {fileName:value.fileName,encoding:value.encoding,size:value.size,hash:value.hash};
}
function create(input){
  let bytes,encoding="utf-8",fileName=/\.txt$/i.test(input.fileName||"")?input.fileName:"resultats.txt";
  if(input.textArchive){
    const source=input.textArchive;
    if(typeof source.dataBase64!=="string"||source.dataBase64.length>Math.ceil(MAX_BYTES/3)*4||source.dataBase64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(source.dataBase64))throw new TypeError("Contenu TXT source invalide.");
    bytes=Buffer.from(source.dataBase64,"base64");fileName=source.fileName;encoding=source.encoding;
    if(bytes.toString("base64")!==source.dataBase64)throw new TypeError("Contenu TXT source invalide.");
  }else bytes=Buffer.from(input.rawText||"","utf8");
  const source=manifest({fileName,encoding,size:bytes.length,hash:digest(bytes)});
  let decoded;try{decoded=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{throw new TypeError("Encodage du TXT source invalide.");}
  if(input.textArchive&&decoded!==input.rawText)throw new TypeError("Le TXT archivé diffère du fichier analysé.");
  if(input.textManifest&&JSON.stringify(manifest(input.textManifest))!==JSON.stringify(source))throw new TypeError("Le TXT source ne correspond plus à l’aperçu.");
  return {...source,compression:"gzip",dataBase64:gzipSync(bytes).toString("base64")};
}
function restore(archive){
  const source=manifest(archive);
  if(archive.compression!=="gzip"||typeof archive.dataBase64!=="string"||archive.dataBase64.length>7*1024*1024)throw new TypeError("Archive TXT invalide.");
  let bytes;try{bytes=gunzipSync(Buffer.from(archive.dataBase64,"base64"),{maxOutputLength:MAX_BYTES});}catch{throw new TypeError("Archive TXT illisible.");}
  if(bytes.length!==source.size||digest(bytes)!==source.hash)throw new TypeError("Archive TXT différente de son empreinte.");
  return {...source,dataBase64:bytes.toString("base64")};
}
async function readCurrent(pool,input,authorize){
  const calendar=require("./nap-direct-calendar"),native=require("./nap-portal-competitions"),id=calendar.positiveId(input);
  const rows=await native.bounded(pool,"SELECT c.id,c.comite,cp.niveau FROM competitions c LEFT JOIN compet_parametres cp ON cp.compet=c.id WHERE c.id=? LIMIT 2",[id],1);
  if(!rows.length)throw new TypeError("Compétition NAP introuvable.");
  await authorize(native.portalEventFromRow(rows[0]));
  const pointerId=digest(Buffer.from(JSON.stringify(["nap-results-current",id])));
  const [pointers]=await pool.execute({sql:"SELECT metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",timeout:10000},[pointerId]);
  const pointer=typeof pointers[0]?.metadata==="string"?JSON.parse(pointers[0].metadata):pointers[0]?.metadata;
  if(pointer?.activeImportId)throw new TypeError("Import en cours : attendez sa fin avant de télécharger le TXT.");
  if(!pointer?.currentImportId)return {ok:true,file:null};
  if(!/^[a-f0-9]{64}$/.test(pointer.currentImportId))throw new TypeError("Référence d’import invalide.");
  const [imports]=await pool.execute({sql:"SELECT status,JSON_EXTRACT(metadata,'$.sourceText') AS source_text FROM livepalmes_performance_imports WHERE id=? AND competition_id=? LIMIT 1",timeout:10000},[pointer.currentImportId,id]);
  const row=imports[0];if(!row||row.status!=="completed")throw new TypeError("Import courant à vérifier.");
  const archive=typeof row.source_text==="string"?JSON.parse(row.source_text):row.source_text;
  return {ok:true,file:archive?restore(archive):null};
}
module.exports={manifest,create,restore,readCurrent,MAX_BYTES};
