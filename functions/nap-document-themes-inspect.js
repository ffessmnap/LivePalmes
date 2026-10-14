"use strict";
// Private TEST diagnostic: reference labels and associations only, no document
// bodies, identities or storage paths. Fixed bounded queries, no SQL input.
const QUERIES = {
 targets: ["SELECT id,label,pos FROM cibles FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 101",100],
 elements: ["SELECT id,title,element,parent,pos,name,visible FROM elements FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 201",200],
 elementTargets: ["SELECT id,cible,element,pos FROM elements_cibles FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 1001",1000],
};
async function inspect(pool) {
 const result={source:"nap",mode:"document-themes-readonly",napWrites:0,generatedAt:new Date().toISOString(),checks:[],complete:true};
 for(const [name,[sql,limit]] of Object.entries(QUERIES)) {
  try {
  const [plan]=await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000});
  if(!plan.length||plan.some(row=>!row.key||row.type==="ALL")){result.complete=false;result.checks.push({name,error:"non-indexed",plan:plan.map(({table,type,key,rows,Extra})=>({table,type,key,rows,Extra}))});continue;}
  const start=Date.now(),[rows]=await pool.execute({sql,timeout:10000});
  result[name]=rows.slice(0,limit);
  if(rows.length>limit)result.complete=false;
  result.checks.push({name,rows:rows.length,hasMore:rows.length>limit,durationMs:Date.now()-start,plan:plan.map(({table,type,key,rows,Extra})=>({table,type,key,rows,Extra}))});
  }catch(error){result.complete=false;result.checks.push({name,error:["ER_BAD_FIELD_ERROR","ER_NO_SUCH_TABLE"].includes(error.code)?error.code:"unavailable"});}
 }
 const [indexes]=await pool.execute({sql:"SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('documents','documents_cibles','elements','elements_cibles','cibles') ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX LIMIT 101",timeout:10000});
 if(indexes.length>100)throw Error("Structure documentaire au-delà de la borne.");
 result.indexes=indexes;
 if(indexes.some(row=>row.TABLE_NAME==="documents_cibles"&&row.INDEX_NAME==="livepalmes_document_cible")){
  const {readCatalogue}=require("./nap-public-documents"),facets=require("./assets/nap-public-documents-index.json");
  const themes=await require("./nap-document-themes").themesFor(pool);
  result.themes=themes;result.measurements=[];
  for(const theme of themes){
   let plan=[],durationMs=0;
   const measured={execute:async(spec,values)=>{
    const [rows]=await pool.execute({sql:`EXPLAIN ${spec.sql}`,timeout:10000},values);
    if(rows.some(row=>row.table&&!row.key&&!(String(row.table).startsWith("<derived")&&Number(row.rows)<=501)))throw Error("Plan documentaire non indexé.");
    plan=rows.map(({table,type,key,rows,Extra})=>({table,type,key,rows,Extra}));
    const start=Date.now(),value=await pool.execute(spec,values);durationMs=Date.now()-start;return value;
   }};
   const page=await readCatalogue(measured,facets,{theme:theme.id});
   result.measurements.push({theme:theme.id,documents:page.documents.length,hasMore:page.hasMore,durationMs,plan});
  }
 }else result.measurementsSkipped="document-theme-index-required";
 return result;
}
module.exports={QUERIES,inspect};
