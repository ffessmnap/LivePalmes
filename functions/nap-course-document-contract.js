"use strict";
// Fixed private reference diagnostic: never read identities, contacts, paths or
// document bodies. Five queries maximum, 392 source/metadata rows maximum.
const QUERIES={
  catalog:"SELECT id,course,sexe,final,relais,categorie,ld,mixte,style,type_,longueur,nbnageur,actif FROM course_dispo FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 301",
  documents:"SELECT id,competition,type,element,public FROM documents FORCE INDEX (PRIMARY) ORDER BY id DESC LIMIT 40"
};
async function inspectCourseDocumentContract(pool) {
  const samples={},plans={},errors=[];
  const [columns]=await pool.execute({sql:"SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('elements','elements_cibles') ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 51",timeout:10000});
  if(columns.length>50) throw new RangeError("Referentiel documentaire trop volumineux.");
  for(const [name,sql] of Object.entries(QUERIES)) {
    try {
      const [rows]=await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000});
      if(!rows.length || rows.length>20) throw new RangeError("Plan de referentiel invalide.");
      plans[name]=rows.map(({table,type,key,rows,Extra})=>({table,type,key,rows,Extra}));
      if(rows.some(row=>row.table && (!row.key || row.type==="ALL"))) {errors.push({query:name,reason:"non-indexed"});continue;}
      const [data]=await pool.execute({sql,timeout:10000});
      if(data.length>(name==="catalog" ? 301 : 40)) throw new RangeError("Echantillon de referentiel trop volumineux.");
      samples[name]=name==="catalog" ? data.slice(0,300) : data.filter(row=>Number(row.competition)>0);
      if(name==="catalog" && data.length>300) {samples.catalogHasMore=true;samples.catalogNextId=data[299].id;} else if(name==="catalog") samples.catalogHasMore=false;
    } catch(error) {
      errors.push({query:name,reason:({ER_BAD_FIELD_ERROR:"column",ER_PARSE_ERROR:"syntax",ER_NO_SUCH_TABLE:"table"})[error.code] || (error instanceof RangeError ? "volume" : "unavailable")});
    }
  }
  return {source:"nap",mode:"portal-course-document-contract-readonly",columns,samples,plans,errors,complete:errors.length===0,writesExecuted:false,businessMappingsConfirmed:false};
}
module.exports={QUERIES,inspectCourseDocumentContract};
