"use strict";
const {text,publicUrl}=require("./nap-direct-calendar");
const {parisDeadline}=require("./nap-paris-time");
const PAGE_SIZE=25;
const FIELDS="d.id,d.name,d.date,d.location,d.type,d.element,t.label AS type_label,e.title AS element_label";
const JOINS=" LEFT JOIN documents_types t FORCE INDEX (PRIMARY) ON t.id=d.type LEFT JOIN elements e FORCE INDEX (PRIMARY) ON e.id=d.element";
const query=async(pool,sql,values=[]) => (await pool.execute({sql,timeout:10000},values))[0];
function publicDocument(row){
 const url=publicUrl(row.location);
 if(!url)return null;
 const publishedAt=parisDeadline(row.date).iso;
 return {id:Number(row.id),title:text(row.name)||"Document officiel",url,publishedAt,
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
 // The index is prepared explicitly outside interactive requests. It remains
 // server-side, and is never an authority for current public metadata/rights.
 if(!index||!Array.isArray(index.documents))throw new TypeError("Bibliothèque momentanément indisponible.");
 const request=catalogueRequest(input),tokens=fold(request.search).split(/\s+/).filter(Boolean);
 const candidates=index.documents.filter(row=>row.id< (request.after||2147483648) && matchesFacet(row.typeId,request.type) && matchesFacet(row.rubricId,request.rubric) && tokens.every(token=>fold(row.title).includes(token)))
  .sort((a,b)=>b.id-a.id).slice(0,PAGE_SIZE+1);
 const hasMore=candidates.length>PAGE_SIZE,page=candidates.slice(0,PAGE_SIZE);
 if(!page.length)return {documents:[],hasMore:false,nextAfterId:null};
 const ids=page.map(row=>row.id);
 if(ids.some(id=>!Number.isSafeInteger(id)||id<=0))throw new TypeError("Index documentaire à vérifier.");
 const rows=await query(pool,`SELECT ${FIELDS} FROM documents d FORCE INDEX (PRIMARY)${JOINS} WHERE d.id IN (${ids.map(()=>"?").join(",")}) AND d.public='Y' AND d.competition=0 ORDER BY d.id DESC LIMIT 25`,ids);
 // Do not refill a shortened page: public withdrawal must not start a scan.
 return {documents:rows.map(publicDocument).filter(Boolean).filter(row=>matchesFacet(row.typeId,request.type)&&matchesFacet(row.rubricId,request.rubric)&&tokens.every(token=>fold(row.title).includes(token))),hasMore,nextAfterId:hasMore?page.at(-1).id:null};
}
module.exports={PAGE_SIZE,publicDocument,readFeatured,catalogueRequest,readCatalogue};
