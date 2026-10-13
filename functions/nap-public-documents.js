"use strict";
const {text,publicUrl}=require("./nap-direct-calendar");
const {parisDeadline}=require("./nap-paris-time");
const PAGE_SIZE=25;
const FIELDS="d.id,d.name,d.date,d.location,d.type,d.element,t.label AS type_label,e.title AS element_label";
const JOINS=" LEFT JOIN documents_types t FORCE INDEX (PRIMARY) ON t.id=d.type LEFT JOIN elements e FORCE INDEX (PRIMARY) ON e.id=d.element";
const query=async(pool,sql,values=[]) => (await pool.execute({sql,timeout:10000},values))[0];
function publicDocument(row){
 const url=publicUrl(row.location);
 if(row.id==null)return null;
 const rawDate=String(row.date||""),publication=parisDeadline(/^\d{4}-\d{2}-\d{2}$/.test(rawDate)?`${rawDate} 00:00:00`:rawDate);
 const publishedAt=publication.iso,publishedOn=publishedAt||publication.warning==="ambiguous-native-deadline"?rawDate.slice(0,10):"";
 return {id:Number(row.id),title:text(row.name)||"Document officiel",url,linkAvailable:Boolean(url),publishedAt,publishedOn,
  typeId:row.type_label?Number(row.type)||0:0,typeLabel:text(row.type_label)||"Autres documents",
  rubricId:row.element_label?Number(row.element)||0:0,rubricLabel:text(row.element_label)||"Autres documents"};
}
async function readFeatured(pool){
 // Even an original made private by another NAP writer cannot leak through the
 // editorial complement. No uploader or file-storage metadata is selected.
 const rows=await query(pool,`SELECT o.featured_rank,${FIELDS} FROM livepalmes_document_options o FORCE INDEX (livepalmes_document_featured_rank) LEFT JOIN documents d FORCE INDEX (PRIMARY) ON d.id=o.document_id AND d.public='Y' AND d.competition=0${JOINS} WHERE o.featured_rank IS NOT NULL ORDER BY o.featured_rank LIMIT 7`);
 if(rows.length>6||rows.some((row,i)=>Number(row.featured_rank)!==i+1))throw new TypeError("Sélection documentaire à vérifier.");
 return rows.filter(row=>row.id!=null).map(publicDocument).filter(Boolean);
}
function fold(value){return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");}
function catalogueRequest(input={}){
 const search=typeof input.search==="string"?input.search.trim():"";
 const after=input.after==null||input.after===""?0:Number(input.after);
 const type=input.type==="other"?-1:input.type==null||input.type===""?0:Number(input.type);
 const rubric=input.rubric==="other"?-1:input.rubric==null||input.rubric===""?0:Number(input.rubric);
 if(search.length>100||!Number.isSafeInteger(after)||after<0||after>2147483647||[type,rubric].some(value=>!Number.isSafeInteger(value)||value< -1||value>2147483647)||type===-1&&input.type!=="other"||rubric===-1&&input.rubric!=="other")throw new TypeError("Recherche documentaire invalide.");
 return {search,after,type,rubric};
}
const matchesFacet=(id,filter)=>!filter||id===(filter===-1?0:filter);
async function readCatalogue(pool,index,input={}){
 // Only facet labels come from explicit preparation. Search/list membership and
 // metadata are read live, so newly published documents are immediately visible.
 // Filtering a bounded keyset window avoids an unbounded LIKE scan. A sparse
 // window has an explicit continuation, never a hidden automatic refill.
 if(!index||!Array.isArray(index.types)||!Array.isArray(index.rubrics))throw new TypeError("Bibliothèque momentanément indisponible.");
 const request=catalogueRequest(input),tokens=fold(request.search).split(/\s+/).filter(Boolean);
 const windowSize=tokens.length||request.type||request.rubric?100:PAGE_SIZE;
 const rows=await query(pool,`SELECT ${FIELDS} FROM documents d FORCE INDEX (livepalmes_compet_public_id)${JOINS} WHERE d.competition=0 AND d.public='Y' AND d.id<? ORDER BY d.id DESC LIMIT ${windowSize+1}`,[request.after||2147483648]);
 const documents=[];let consumed=0;
 for(const row of rows.slice(0,windowSize)){
  consumed++;const item=publicDocument(row);
  if(item&&matchesFacet(item.typeId,request.type)&&matchesFacet(item.rubricId,request.rubric)&&tokens.every(token=>fold(item.title).includes(token)))documents.push(item);
  if(documents.length===PAGE_SIZE)break;
 }
 const hasMore=consumed<rows.length;
 return {documents,hasMore,nextAfterId:hasMore?Number(rows[consumed-1].id):null};
}
module.exports={PAGE_SIZE,publicDocument,readFeatured,catalogueRequest,readCatalogue};
