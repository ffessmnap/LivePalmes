"use strict";
// Explicit preparation, never called by a public request or ordinary save.
const fs=require("node:fs");
const path=require("node:path");
const {createNapPool}=require("../functions/nap-mysql");
const {text}=require("../functions/nap-direct-calendar");
async function buildDocumentIndex(pool){
 const documents=[],types=new Map(),rubrics=new Map();
 let after=0;
 while(true){
  const [rows]=await pool.execute({sql:"SELECT d.id,d.name,d.type,d.element,t.label AS type_label,e.title AS element_label FROM documents d FORCE INDEX (livepalmes_compet_public_id) LEFT JOIN documents_types t FORCE INDEX (PRIMARY) ON t.id=d.type LEFT JOIN elements e FORCE INDEX (PRIMARY) ON e.id=d.element WHERE d.competition=0 AND d.public='Y' AND d.id>? ORDER BY d.id LIMIT 101",timeout:10000},[after]);
  if(!rows.length)break;
  for(const row of rows){
   const id=Number(row.id);
   if(!Number.isSafeInteger(id)||id<=after)throw Error("Ordre documentaire invalide.");
   const typeId=row.type_label?Number(row.type):0,rubricId=row.element_label?Number(row.element):0;
   documents.push({id,title:text(row.name),typeId,rubricId});
   types.set(typeId,text(row.type_label)||"Autres documents");
   rubrics.set(rubricId,text(row.element_label)||"Autres documents");
   after=id;
  }
  if(documents.length>100000)throw Error("Volume documentaire à examiner explicitement.");
  if(rows.length<101)break;
 }
 const facets=entries=>[...entries].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label,"fr"));
 return {version:2,generatedAt:new Date().toISOString(),documentCount:documents.length,types:facets(types),rubrics:facets(rubrics)};
}
async function main(){
 if(process.argv.length!==3||process.argv[2]!=="--write")throw Error("Préparation explicite --write requise.");
 const pool=createNapPool(process.env.LIVEPALMES_NAP_PASSWORD);
 try{
  const index=await buildDocumentIndex(pool);
  const output=path.resolve(__dirname,"../functions/assets/nap-public-documents-index.json");
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const temporary=output+".tmp";
  fs.writeFileSync(temporary,JSON.stringify(index)+"\n","utf8");
  fs.renameSync(temporary,output);
  console.log(`Facettes documentaires serveur préparées depuis ${index.documentCount} références publiques générales. Aucune écriture distante.`);
 }finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error("Préparation documentaire arrêtée ; aucun détail de connexion affiché.");process.exitCode=1;});
module.exports={buildDocumentIndex};
