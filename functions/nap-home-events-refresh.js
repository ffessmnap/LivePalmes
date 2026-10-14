"use strict";
const {createHash}=require("node:crypto");
const {civilAt}=require("./nap-paris-time");
const {readPage,OBJECT_PATH,MAX_BYTES,validateSnapshot}=require("./nap-home-events");
const BUCKET="livepalmes-test-public-data-206080168534";
async function gatherPages(fetchPage,now=Date.now()){
 const today=civilAt(now).slice(0,10),events=[];let after=0,calls=0;
 while(true){
  if(++calls>100)throw Error("Bornes de préparation dépassées.");
  const page=await fetchPage({after,today});
  if(page.source!=="nap"||page.today!==today||!Array.isArray(page.events)||page.events.length>100||typeof page.hasMore!=="boolean")throw Error("Page calendrier invalide.");
  events.push(...page.events);
  if(events.length>10000)throw Error("Calendrier trop volumineux.");
  if(!page.hasMore)break;
  if(!Number.isSafeInteger(page.nextAfterId)||page.nextAfterId<=after)throw Error("Curseur calendrier invalide.");
  after=page.nextAfterId;
 }
 if(new Set(events.map(event=>event.id)).size!==events.length)throw Error("Calendrier ambigu.");
 const snapshot={schemaVersion:1,source:"nap",generatedAt:new Date(now).toISOString(),events};
 const canonical={schemaVersion:1,...validateSnapshot(snapshot,now)};
 if(Buffer.byteLength(JSON.stringify(canonical))>MAX_BYTES)throw Error("Calendrier trop volumineux.");
 return {snapshot:canonical,calls};
}
async function publishSnapshot(file,input,now=Date.now()){
 const value={schemaVersion:1,...validateSnapshot(input,now)},bytes=Buffer.from(JSON.stringify(value)+"\n");
 if(bytes.length>MAX_BYTES)throw Error("Fichier trop volumineux.");
 let generation=0;
 try{
  const [metadata]=await file.getMetadata();generation=Number(metadata.generation);
  if(!Number.isSafeInteger(generation)||generation<1)throw Error("Génération invalide.");
  // A delayed overlapping execution must never replace a newer snapshot.
  if(Date.parse(metadata.metadata?.generatedAt||"")>=Date.parse(value.generatedAt))return {published:false,unchanged:true,reason:"newer-snapshot-present"};
 }catch(error){if(Number(error.code)!==404)throw error;}
 await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:generation},metadata:{contentType:"application/json; charset=utf-8",cacheControl:"public, max-age=60, must-revalidate",metadata:{kind:"livepalmes-test-home-events",generatedAt:value.generatedAt}}});
 const [verified]=await file.download();const hash=buffer=>createHash("sha256").update(buffer).digest("hex");
 if(hash(verified)!==hash(bytes))throw Error("Publication à vérifier.");
 return {published:true,events:value.events.length,generatedAt:value.generatedAt,sha256:hash(bytes),verified:true};
}
async function refreshTestHomeEvents(pool,file,{projectId,confirmation,now=Date.now()}={}){
 if(projectId!=="livepalmes-test"||confirmation!=="publish-livepalmes-test-home-events"||file?.name!==OBJECT_PATH||file?.bucket?.name!==BUCKET)throw Error("Actualisation réservée au fichier TEST autorisé.");
 const result=await gatherPages(input=>readPage(pool,input),now);
 return {...await publishSnapshot(file,result.snapshot,now),sqlPages:result.calls,napWrites:0};
}
module.exports={BUCKET,gatherPages,publishSnapshot,refreshTestHomeEvents};
