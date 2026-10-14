"use strict";
const fs=require("node:fs"),{execFileSync}=require("node:child_process");
const {createNapPool}=require("../functions/nap-mysql"),{civilAt}=require("../functions/nap-paris-time");
async function main(){
 if(process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test")throw Error("TEST required");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
 if(credentials.project_id!=="livepalmes-test"||credentials.client_email!=="github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com")throw Error("TEST account required");
 const password=execFileSync("gcloud",["secrets","versions","access","latest","--secret=LIVEPALMES_NAP_PASSWORD","--project=livepalmes-test"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 const pool=createNapPool(password),connection=await pool.getConnection(),today=civilAt(Date.now()).slice(0,10);
 try{
  const [indexes]=await connection.execute({sql:"SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='competitions' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 50",timeout:10000});
  const queries={future:{sql:"SELECT id,date,enddate,libelle,lieu,type,typecnc,ld FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date>=? ORDER BY date,id LIMIT 101",values:[today]},ongoing:{sql:"SELECT id,date,enddate FROM competitions WHERE date<? AND enddate>=? ORDER BY enddate,id LIMIT 101",values:[today,today]}};
  const checks=[];
  for(const [name,query]of Object.entries(queries)){
   const [plan]=await connection.execute({sql:`EXPLAIN ${query.sql}`,timeout:10000},query.values);
   const fullScan=plan.some(row=>row.type==="ALL"||row.type==="index");
   const samples=[];
   // Never execute a history scan: EXPLAIN alone suffices to reject that plan.
   if(!fullScan)for(let i=0;i<3;i++){
    const counters=async()=>Object.fromEntries((await connection.query("SHOW SESSION STATUS WHERE Variable_name LIKE 'Handler_read_%'"))[0].map(row=>[row.Variable_name,Number(row.Value)]));
    const before=await counters(),started=performance.now(),[rows]=await connection.execute({sql:query.sql,timeout:10000},query.values),durationMs=performance.now()-started,after=await counters();
    samples.push({returned:rows.length,durationMs:Math.round(durationMs*100)/100,handlers:Object.fromEntries(Object.keys(after).map(key=>[key,after[key]-before[key]]))});
   }
   checks.push({name,fullScan,plan:plan.map(row=>({table:row.table,type:row.type,key:row.key,estimatedRows:row.rows,extra:row.Extra})),samples});
  }
  const proof={measuredAt:new Date().toISOString(),today,napWrites:0,source:"nap",indexes,checks};fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync("outputs/home-nap-measurement.json",JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify(proof));
 }finally{connection.release();await pool.end();}
}
main().catch(error=>{console.error(`Read-only measurement stopped (${String(error.code||error.name).replace(/[^A-Za-z0-9_]/g,"")}); no credentials or rows displayed.`);process.exitCode=1;});
