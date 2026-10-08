"use strict";
// Indexed list: one SELECT, <=100 rows and two primary-key joins. A mutation
// uses <=12 SQL calls, including two indexed competition authorizations.
// Firestore is used only for the durable technical before/after journal.
const {createHash,randomUUID}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const calendar=require("./nap-direct-calendar");
const helpers=require("./engagement-competition-documents");
const {nativeEqual}=require("./nap-native-compare");
const FIELDS=["id","name","type","location","date","user","competition","sent","comment","public","element"];
const OPTION_SCHEMA=[["document_id","int"],["category","varchar(16)"],["file_name","varchar(180)"],["storage_path","varchar(160)"],["content_type","varchar(100)"],["size","int unsigned"],["version","bigint unsigned"],["created_at","datetime(6)"],["updated_at","datetime(6)"],["created_by","varchar(128)"],["updated_by","varchar(128)"]];
const OPTIONS=OPTION_SCHEMA.map(([key])=>key);
const CATEGORY=new Set(["poster","circular","rules","information","access","results","other"]);
const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const stamp=()=>new Date().toISOString().replace("T"," ").replace("Z","000");
const inferred=row=>{const text=`${row.name} ${row.type_label} ${row.comment}`;return /protocole|r[ée]sultat/i.test(text)?"results":/affiche/i.test(text)?"poster":/r[èe]glement/i.test(text)?"rules":/circulaire|invitation/i.test(text)?"circular":"information";};
function option(row){return row.document_id==null?null:Object.fromEntries(OPTIONS.map(k=>[k,["document_id","size","version"].includes(k)?Number(row[k]):row[k]]));}
function item(row,{includeUploader=false}={}){
 const url=calendar.publicUrl(row.location),extra=option(row);
 let fileName=extra?.file_name||"";
 if(!fileName&&url){try{fileName=decodeURIComponent(new URL(url).pathname.split("/").pop()||"");}catch{fileName="";}}
 return {id:`nap-${row.id}`,title:calendar.text(row.name)||calendar.text(row.type_label)||"Document officiel",url,
  description:calendar.text(row.comment),category:CATEGORY.has(extra?.category)?extra.category:inferred(row),
  fileName,contentType:extra?.content_type||helpers.canonicalDocumentContentType(fileName),
  storagePath:extra?.storage_path||"",size:Number(extra?.size||0),source:extra?.storage_path?"":"legacy",nativeDocument:true,
  updatedAt:extra?.updated_at||row.date||"",uploadedAt:extra?.created_at||row.date||"",
  napFingerprint:digest([Object.fromEntries(FIELDS.map(k=>[k,row[k]])),extra]),
  ...(includeUploader===true?{uploadedBy:{uid:extra?.created_by||"",name:"",email:""}}:{})};
}
async function rows(connection,id){
 const [result]=await connection.execute({sql:`SELECT ${FIELDS.map(k=>`d.\`${k}\``).join(",")},${OPTIONS.map(k=>`o.\`${k}\``).join(",")},t.label AS type_label FROM documents d FORCE INDEX (livepalmes_compet_public_id) LEFT JOIN documents_types t FORCE INDEX (PRIMARY) ON t.id=d.type LEFT JOIN livepalmes_document_options o FORCE INDEX (PRIMARY) ON o.document_id=d.id WHERE d.competition=? AND d.public='Y' ORDER BY d.id LIMIT 101`,timeout:10000},[id]);
 if(result.length>100)throw new RangeError("Documents trop volumineux.");return result;
}
async function readDocuments(connection,id,options={}){return(await rows(connection,calendar.positiveId(id))).map(row=>item(row,options)).filter(x=>x.url);}
function nativeRow(row){return Object.fromEntries(FIELDS.map(k=>[k,row[k]]));}
function writePlan(action,before,after,authority){
 const scope=authority?` AND EXISTS (SELECT 1 FROM competitions c FORCE INDEX (PRIMARY) JOIN compet_parametres cp FORCE INDEX (PRIMARY) ON cp.id=? WHERE c.id=? AND ${["date","enddate","comite"].map(k=>nativeEqual(`c.${k}`)).join(" AND ")} AND cp.compet=c.id AND ${nativeEqual("cp.niveau")})`:"";
 const scopeValues=authority?[authority.parameter_id,authority.id,authority.date,authority.enddate,authority.comite,authority.niveau]:[];
 if(action==="create")return {sql:`INSERT INTO documents (${FIELDS.slice(1).map(k=>`\`${k}\``).join(",")}) SELECT ${FIELDS.slice(1).map(()=>"?").join(",")} FROM competitions event_scope FORCE INDEX (PRIMARY) WHERE event_scope.id=?${scope}`,values:[...FIELDS.slice(1).map(k=>after[k]),after.competition,...scopeValues]};
 const guard=FIELDS.map(k=>nativeEqual(`\`${k}\``)).join(" AND "),values=FIELDS.map(k=>before[k]);
 return action==="delete"?{sql:`DELETE FROM documents WHERE id=? AND ${guard}${scope} LIMIT 1`,values:[before.id,...values,...scopeValues]}:
  {sql:`UPDATE documents SET name=?,type=?,location=?,comment=?,date=? WHERE id=? AND ${guard}${scope} LIMIT 1`,values:[after.name,after.type,after.location,after.comment,after.date,before.id,...values,...scopeValues]};
}
async function mutate(pool,input,services){
 const id=calendar.positiveId(input.competitionId),action=input.action;
 if(!["upload","update","delete"].includes(action)||typeof input.actorUid!=="string"||!input.actorUid||input.actorUid.length>128)throw new TypeError("Action de document invalide.");
 const requested=input.documentId?Number(/^nap-([1-9]\d*)$/.exec(input.documentId)?.[1]):null;
 if(input.documentId&&(!Number.isSafeInteger(requested)||requested>2147483647))throw new TypeError("Document NAP requis.");
 if(action!=="upload"&&!requested)throw new TypeError("Document requis.");
 const connection=await pool.getConnection();let locked=false;
 const q=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
 try{
  const lock=`lp-documents-${id}`;
  if(Number((await q("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1)throw new TypeError("Documents en cours de modification. Réessayez.");locked=lock;
  const authority=await services.authorize(connection,id,action);
  if(!authority?.parameter_id)throw new TypeError("Paramètres de compétition NAP requis.");
  const tables=await q("SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('documents','livepalmes_document_options') LIMIT 3");
  if(tables.length!==2||tables.find(t=>t.TABLE_NAME==='documents')?.ENGINE!=='MyISAM'||!tables.some(t=>t.TABLE_NAME==='livepalmes_document_options'&&t.ENGINE==='InnoDB'&&t.TABLE_COLLATION==='utf8mb4_unicode_ci'))throw new TypeError("Structure des documents à vérifier.");
  const columns=await q("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY ORDINAL_POSITION LIMIT 12");
  if(columns.length!==OPTION_SCHEMA.length||columns.some((c,i)=>c.COLUMN_NAME!==OPTION_SCHEMA[i][0]||String(c.COLUMN_TYPE).replace(/\b(bigint|int)\(\d+\)/g,'$1')!==OPTION_SCHEMA[i][1]||c.IS_NULLABLE!=='NO'||c.COLUMN_DEFAULT!==null||c.EXTRA))throw new TypeError("Complément de documents incompatible.");
  const indexes=await q("SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 2");
  if(indexes.length!==1||indexes[0].INDEX_NAME!=='PRIMARY'||indexes[0].COLUMN_NAME!=='document_id'||Number(indexes[0].SEQ_IN_INDEX)!==1||Number(indexes[0].NON_UNIQUE)!==0||indexes[0].SUB_PART!==null)throw new TypeError("Index des documents incompatible.");
  const current=await rows(connection,id),existing=current.find(row=>Number(row.id)===requested);
  if(requested&&!existing)throw new TypeError("Document introuvable dans cette compétition.");
  if(existing&&input.expectedFingerprint!==item(existing).napFingerprint)throw new TypeError("Le document a changé. Rechargez avant d'enregistrer.");
  if(!existing&&current.length>=helpers.MAX_COMPETITION_DOCUMENTS)throw new RangeError("La compétition contient déjà 20 documents.");
  const triggers=await q("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('documents','livepalmes_document_options') LIMIT 1");
  if(triggers.length)throw new TypeError("Déclencheur de document à vérifier.");
  let decoded,clean;
  if(action!=="delete"){
   const fileName=action==="upload"?input.fileName:item(existing).fileName;
   try{clean=helpers.cleanCompetitionDocumentInput({...input,fileName:action==="update"&&!helpers.canonicalDocumentContentType(fileName)?"document.pdf":fileName});if(action==="update")clean.fileName=fileName;if(action==="upload")decoded=helpers.decodeCompetitionDocumentDataUrl(input.fileDataUrl,clean.fileName);}catch(error){throw new TypeError(error.message);}
  }
  const operation=digest([id,input.actorUid,requested,action,input.expectedFingerprint||"",clean||null,decoded?createHash("sha256").update(decoded.buffer).digest("hex"):null]);
  // A previous incomplete operation must be reconciled explicitly, never replayed
  // against MyISAM using a new generated identifier or an assumed rollback.
  if(await services.audit.read(operation))throw new TypeError("Cette opération dispose déjà d'une sauvegarde. Rechargez ; vérifiez son état avant de la reprendre.");
  const now=stamp(),before=existing?nativeRow(existing):null,previous=existing?option(existing):null;
  if(previous&&(!Number.isSafeInteger(previous.version)||previous.version<1||previous.version>=Number.MAX_SAFE_INTEGER))throw new TypeError("Version de document à vérifier.");
  let upload=null,after=null,extra=null;
  if(action!=="delete"){
   upload=decoded?{path:`competition-documents/nap/${randomUUID()}.${clean.fileName.split('.').pop().toLowerCase()}`,token:randomUUID()}:null;
   const url=upload?services.downloadUrl(upload.path,upload.token):before.location;
   if(url.length>255)throw new TypeError("Lien de document trop long pour NAP.");
   after={...(before||{id:null,user:null,competition:id,sent:0,public:"Y",element:34}),name:clean.title,type:clean.category==="results"?11:clean.category==="circular"?1:7,location:url,date:now.slice(0,19),comment:clean.description};
   extra={document_id:requested,category:clean.category,file_name:clean.fileName,storage_path:upload?.path||previous?.storage_path||"",content_type:decoded?.contentType||item(existing).contentType,size:decoded?.buffer.length||Number(previous?.size||0),version:Number(previous?.version||0)+1,created_at:previous?.created_at||now,updated_at:now,created_by:previous?.created_by||input.actorUid,updated_by:input.actorUid};
  }
  await services.audit.prepare(operation,{kind:"nap-document",competitionId:id,action,actorUid:input.actorUid,before,previous,after,extra,upload});
  // Storage is saved only after the journal. Each replacement uses a new path;
  // the existing file stays available until the native write is verified.
  if(upload)await services.saveFile(upload,decoded);
  if(!isDeepStrictEqual(await services.authorize(connection,id,action),authority))throw new TypeError("La compétition a changé. Rechargez avant d'enregistrer.");
  const statement=writePlan(!before?"create":action==="delete"?"delete":"update",before,after,authority);
  const result=await q(statement.sql,statement.values);
  if(result.affectedRows!==1)throw new Error("Document NAP à vérifier : sauvegarde conservée.");
  const documentId=before?.id||Number(result.insertId);
  if(!Number.isSafeInteger(documentId)||documentId<=0)throw new Error("Identifiant de document à vérifier.");
  if(action==="delete")await q("DELETE FROM livepalmes_document_options WHERE document_id=? LIMIT 1",[documentId]);
  else{
   extra.document_id=documentId;after.id=documentId;
   await q(`INSERT INTO livepalmes_document_options (${OPTIONS.map(k=>`\`${k}\``).join(",")}) VALUES (${OPTIONS.map(()=>"?").join(",")}) ON DUPLICATE KEY UPDATE ${OPTIONS.slice(1).map(k=>`\`${k}\`=VALUES(\`${k}\`)`).join(",")}`,OPTIONS.map(k=>extra[k]));
  }
  const verified=await rows(connection,id),found=verified.find(row=>Number(row.id)===documentId);
  if(action==="delete"?Boolean(found):!found||!isDeepStrictEqual(nativeRow(found),after)||!isDeepStrictEqual(option(found),extra))throw new Error("Document enregistré à vérifier : sauvegarde conservée.");
  await services.audit.complete(operation,{competitionId:id,documentId,action,verified:true});
  // Only an obsolete managed file is removed, after verified native writes and
  // the journal. Failure before this point preserves both versions. Legacy NAP
  // hosting is never deleted by LivePalmes.
  let storageDeleted=true;
  if(previous?.storage_path&&previous.storage_path!==extra?.storage_path){
    if(!/^competition-documents\/nap\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(previous.storage_path))storageDeleted=false;
    else try{await services.deleteFile(previous.storage_path);}catch{storageDeleted=false;}
  }
  return {ok:true,source:"nap",competitionId:input.competitionId,calendarEventId:input.calendarEventId||"",documentId:`nap-${documentId}`,storageDeleted,documents:verified.map(row=>item(row,{includeUploader:true})).filter(x=>x.url)};
 }finally{try{if(locked)await q("SELECT RELEASE_LOCK(?)",[locked]);}finally{connection.release();}}
}
module.exports={FIELDS,OPTIONS,OPTION_SCHEMA,item,rows,readDocuments,writePlan,mutate};
