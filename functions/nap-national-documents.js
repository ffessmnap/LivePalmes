"use strict";
const {createHash,randomUUID}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const native=require("./nap-competition-documents");
const {nativeEqual}=require("./nap-native-compare");
const files=require("./engagement-competition-documents");
const editorial=require("./nap-featured-documents");
const facets=require("./assets/nap-public-documents-index.json");
const {themesFor}=require("./nap-document-themes");
const LOCK=editorial.LOCK;
const q=async(c,sql,values=[])=>(await c.execute({sql,timeout:10000},values))[0];
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const id=value=>{if(!Number.isSafeInteger(value)||value<1||value>2147483647)throw new TypeError("Identifiant documentaire invalide.");return value;};
const fields=native.FIELDS.map(k=>`d.\`${k}\``).join(",");
async function record(c,documentId){
 const rows=await q(c,`SELECT ${fields},${native.OPTIONS.map(k=>`o.\`${k}\``).join(",")},o.featured_rank FROM documents d FORCE INDEX (PRIMARY) LEFT JOIN livepalmes_document_options o FORCE INDEX (PRIMARY) ON o.document_id=d.id WHERE d.id=? AND d.competition=0 AND d.public='Y' LIMIT 1`,[id(documentId)]);
 if(!rows.length)throw new TypeError("Document général public introuvable.");
 const targets=await q(c,"SELECT id,cible FROM documents_cibles FORCE INDEX (livepalmes_document_cible) WHERE document=? ORDER BY cible,id LIMIT 101",[documentId]);
 if(targets.length>100)throw new RangeError("Trop de rattachements : maintenance nécessaire.");
 const row=rows[0],document=Object.fromEntries(native.FIELDS.map(k=>[k,row[k]]));
 const option=row.document_id==null?null:Object.fromEntries([...native.OPTIONS,"featured_rank"].map(k=>[k,row[k]==null?null:['document_id','size','version','featured_rank'].includes(k)?Number(row[k]):row[k]]));
 return {document,option,targets,fingerprint:hash([document,option,targets])};
}
function view(saved){return {...native.item({...saved.document,...saved.option}),id:saved.document.id,typeId:Number(saved.document.type),rubricId:Number(saved.document.element),themeIds:[...new Set(saved.targets.map(x=>Number(x.cible)))],fingerprint:saved.fingerprint};}
async function list(pool,input={}){
 const catalogue=await require("./nap-public-documents").readLibrary(pool,facets,input);
 return {...catalogue,types:facets.types.filter(x=>x.id>0),rubrics:facets.rubrics.filter(x=>x.id>0)};
}
function cleanInput(input,themes,existing=null){
 const title=typeof input.title==='string'?input.title.trim():"",description=typeof input.description==='string'?input.description.trim():"";
 if(!title||title.length>160||description.length>500)throw new TypeError("Titre requis (160 caractères maximum) ; description limitée à 500 caractères.");
 if(!(facets.types.some(x=>x.id>0&&x.id===input.typeId)||existing&&input.typeId===Number(existing.type))||!(facets.rubrics.some(x=>x.id>0&&x.id===input.rubricId)||existing&&input.rubricId===Number(existing.element)))throw new TypeError("Type ou classement documentaire inconnu.");
 if(!Array.isArray(input.themeIds)||!input.themeIds.length||input.themeIds.length>10||new Set(input.themeIds).size!==input.themeIds.length||input.themeIds.some(x=>!themes.some(t=>t.id===x)))throw new TypeError("Choisissez au moins une rubrique documentaire valide.");
 return {title,description,typeId:input.typeId,rubricId:input.rubricId,themeIds:[...input.themeIds].sort((a,b)=>a-b)};
}
function parisStamp(){const p=Object.fromEntries(new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;}
async function mutate(pool,input,services){
 const actor=await services.authorize();
 if(actor?.national!==true||!actor.uid)throw new TypeError("Administration nationale requise.");
 if(!['upload','update','delete'].includes(input.action))throw new TypeError("Action documentaire inconnue.");
 const themes=input.action==='delete'?null:await themesFor(pool);
 let decoded;
 if(input.action==='upload'){
  if(typeof input.fileName!=='string'||!input.fileName.trim()||input.fileName.length>180)throw new TypeError("Nom de fichier invalide.");
  try{decoded=files.decodeCompetitionDocumentDataUrl(input.fileDataUrl,input.fileName);}catch(error){throw new TypeError(error.message);}
 }
 const c=await pool.getConnection();let locked=false;
 try{
  if(Number((await q(c,"SELECT GET_LOCK(?,0) AS acquired",[LOCK]))[0]?.acquired)!==1)throw new TypeError("Documents en cours de modification. Réessayez.");
  locked=true;await editorial.assertExtendedContract(c);
  const saved=input.action==='upload'?null:await record(c,input.documentId);
  if(saved&&saved.fingerprint!==input.expectedFingerprint)throw new TypeError("Le document a changé. Rechargez avant de modifier.");
  const clean=input.action==='delete'?null:cleanInput(input,themes,saved?.document);
  if((await q(c,"SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('documents','documents_cibles') LIMIT 1")).length)throw new TypeError("Déclencheur documentaire à vérifier.");
  const version=Number(saved?.option?.version||0);
  if(!Number.isSafeInteger(version)||version<0||version>=Number.MAX_SAFE_INTEGER)throw new TypeError("Version documentaire à vérifier.");
  const now=new Date().toISOString().replace('T',' ').replace('Z','000');
  const upload=decoded?{path:`national-documents/nap/${randomUUID()}.${decoded.extension}`,token:randomUUID()}:null;
  const after=input.action==='delete'?{...saved.document,public:'N'}:{...(saved?.document||{id:null,user:null,competition:0,sent:0,public:'Y'}),name:clean.title,comment:clean.description,type:clean.typeId,element:clean.rubricId,location:upload?services.downloadUrl(upload.path,upload.token):saved.document.location,date:saved?.document.date||parisStamp()};
  if(after.location?.length>255)throw new TypeError("Lien documentaire trop long pour NAP.");
  const operation=hash([actor.uid,input.action,input.documentId||null,input.expectedFingerprint||'',clean,decoded?hash(decoded.buffer.toString('base64')):null]);
  if(await services.audit.read(operation))throw new TypeError("Une sauvegarde existe pour cette opération. Rechargez et vérifiez son état avant de reprendre.");
  await services.audit.prepare(operation,{kind:'nap-national-document',actorUid:actor.uid,action:input.action,before:saved,after,themes:clean?.themeIds||null,upload});
  if(upload)await services.saveFile(upload,decoded);
  const fresh=await services.authorize();if(fresh?.national!==true||fresh.uid!==actor.uid)throw new TypeError("Administration nationale requise.");
  if(saved&&!isDeepStrictEqual(await record(c,input.documentId),saved))throw new TypeError("Le document a changé. Rechargez avant de modifier.");
  let documentId=saved?.document.id;
  if(!saved){
   const result=await q(c,`INSERT INTO documents (${native.FIELDS.slice(1).map(k=>`\`${k}\``).join(',')}) VALUES (${native.FIELDS.slice(1).map(()=>'?').join(',')})`,native.FIELDS.slice(1).map(k=>after[k]));
   if(result.affectedRows!==1)throw new Error('Insertion à vérifier.');documentId=id(Number(result.insertId));after.id=documentId;
  }else{
   const keys=native.FIELDS.filter(k=>k!=='id');
   const result=await q(c,`UPDATE documents SET ${keys.map(k=>`\`${k}\`=?`).join(',')} WHERE ${native.FIELDS.map(k=>nativeEqual(`\`${k}\``)).join(' AND ')} LIMIT 1`,[...keys.map(k=>after[k]),...native.FIELDS.map(k=>saved.document[k])]);
   if(result.affectedRows!==1)throw new Error('Modification à vérifier.');
  }
  if(clean){
   if(saved?.targets.length){const ids=saved.targets.map(x=>x.id);await q(c,`DELETE FROM documents_cibles WHERE id IN (${ids.map(()=>'?').join(',')}) AND document=? LIMIT 100`,[...ids,documentId]);}
   await q(c,`INSERT INTO documents_cibles (document,cible) VALUES ${clean.themeIds.map(()=>'(?,?)').join(',')}`,clean.themeIds.flatMap(t=>[documentId,t]));
   const extra={document_id:documentId,category:saved?.option?.category||'information',file_name:input.action==='upload'?input.fileName:saved?.option?.file_name??null,storage_path:upload?.path||saved?.option?.storage_path||null,content_type:decoded?.contentType||saved?.option?.content_type||null,size:decoded?.buffer.length??saved?.option?.size??null,version:version+1,created_at:saved?.option?.created_at||now,updated_at:now,created_by:saved?.option?.created_by||actor.uid,updated_by:actor.uid};
   await q(c,`INSERT INTO livepalmes_document_options (${native.OPTIONS.map(k=>`\`${k}\``).join(',')}) VALUES (${native.OPTIONS.map(()=>'?').join(',')}) ON DUPLICATE KEY UPDATE ${native.OPTIONS.slice(1).map(k=>`\`${k}\`=VALUES(\`${k}\`)`).join(',')}`,native.OPTIONS.map(k=>extra[k]));
   const verified=await record(c,documentId);
   if(!isDeepStrictEqual(verified.document,after)||!isDeepStrictEqual(Object.fromEntries(native.OPTIONS.map(k=>[k,verified.option?.[k]])),extra)||!isDeepStrictEqual(view(verified).themeIds.sort((a,b)=>a-b),clean.themeIds))throw new Error('Document enregistré à vérifier.');
   await services.audit.complete(operation,{documentId,action:input.action,verified:true});
   return {ok:true,document:view(verified)};
  }
  const check=await q(c,"SELECT public FROM documents FORCE INDEX (PRIMARY) WHERE id=? AND competition=0 LIMIT 1",[documentId]);
  if(check[0]?.public!=='N')throw new Error('Retrait à vérifier.');
  await services.audit.complete(operation,{documentId,action:'delete',verified:true});
  // Withdrawal preserves originals and the before journal. No historical file is deleted.
  return {ok:true,documentId,withdrawn:true};
 }finally{try{if(locked)await q(c,"SELECT RELEASE_LOCK(?)",[LOCK]);}finally{c.release();}}
}
module.exports={LOCK,id,record,view,list,cleanInput,mutate};
