"use strict";
// Two administrative metadata queries only; no sporting table, write or lock.
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const QUERIES=Object.freeze([
 "SELECT VERSION() AS serverVersion, @@GLOBAL.max_connections AS maxConnections, @@SESSION.max_user_connections AS accountMaxConnections, @@GLOBAL.max_user_connections AS defaultMaxUserConnections",
 "SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Max_used_connections','Uptime','Connection_errors_max_connections','Aborted_connects')"
]);
const STATUS=Object.freeze(["Threads_connected","Threads_running","Max_used_connections","Uptime","Connection_errors_max_connections","Aborted_connects"]);
function fail(code){throw Object.assign(new Error(code),{safeCode:code});}
function integer(value){if(!/^(0|[1-9][0-9]*)$/.test(String(value)))fail("INVALID_NUMERIC_METADATA");const n=Number(value);if(!Number.isSafeInteger(n))fail("INVALID_NUMERIC_METADATA");return n;}
function context(env){if(env.GITHUB_REPOSITORY!=="ffessmnap/LivePalmes"||env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||env.GITHUB_WORKFLOW_REF!=="ffessmnap/LivePalmes/.github/workflows/nap-capacity-readonly.yml@refs/heads/main"||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||"")||env.EXPECTED_COMMIT!==env.GITHUB_SHA||!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||""))fail("READONLY_WORKFLOW_CONTEXT_REQUIRED");}
async function collect(connection){
 const query=async sql=>(await connection.query({sql,timeout:5000}))[0];
 const limits=await query(QUERIES[0]);
 if(!Array.isArray(limits)||limits.length!==1||!/^5\.7\.[0-9]+(?:[-.].*)?$/.test(limits[0].serverVersion||""))fail("NAP_RUNTIME_DRIFT");
 const row=limits[0],maxConnections=integer(row.maxConnections);
 if(maxConnections===0)fail("INVALID_SERVER_LIMIT");
 const status=await query(QUERIES[1]);
 if(!Array.isArray(status)||status.length!==STATUS.length)fail("INCOMPLETE_STATUS_METADATA");
 const values={};for(const item of status){if(!STATUS.includes(item.Variable_name)||Object.hasOwn(values,item.Variable_name))fail("UNEXPECTED_STATUS_METADATA");values[item.Variable_name]=integer(item.Value);}
 return {schema:1,readOnly:true,queryCount:2,maxConnectionsCreated:1,businessTablesRead:0,writes:0,locks:0,
  server:{family:"MySQL 5.7",maxConnections,accountMaxConnections:integer(row.accountMaxConnections),defaultMaxUserConnections:integer(row.defaultMaxUserConnections)},
  observations:values,observationIncludesCollectorConnection:true,sqlSharedByTestAndProduction:true,
  limits:{pointInTimeOnly:true,otherConsumersInventoryComplete:false,administrativeReserveKnown:false,rolloutOverlapKnown:false,functionSqlAccountMatchingVerified:false,accountLimitScope:"current collector session only",globalBudgetApproved:false}};
}
async function readPassword(request,token){
 const response=await request("https://secretmanager.googleapis.com/v1/projects/livepalmes-test/secrets/LIVEPALMES_NAP_PASSWORD/versions/latest:access",{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(30000)});
 if(!response.ok)fail("SECRET_ACCESS_HTTP_"+response.status);
 const body=await response.json(),password=Buffer.from(body.payload?.data||"","base64").toString("utf8");
 if(!password||Buffer.byteLength(password)>4096)fail("NAP_PASSWORD_MISSING");return password;
}
async function main(root,output,env=process.env){
 context(env);
 const run=(args)=>execFileSync("gcloud",args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000}).trim();
 if(run(["auth","list","--filter=status:ACTIVE","--format=value(account)"])!=="nap-backup-drive@livepalmes-test.iam.gserviceaccount.com")fail("DEDICATED_ACCOUNT_REQUIRED");
 const token=run(["auth","print-access-token"]),password=await readPassword(fetch,token);
 const {napPoolOptions}=require(path.join(root,"functions/nap-connection"));
 const {connectionLimit,waitForConnections,queueLimit,...options}=napPoolOptions(password);
 if(options.host!=="57.128.101.89"||options.port!==3372||options.user!=="nage-palmes"||options.database!=="nage-palmes"||options.multipleStatements!==false)fail("NAP_TARGET_DRIFT");
 const mysql=require(path.join(root,"functions/node_modules/mysql2/promise"));
 const connection=await mysql.createConnection(options);
 let report;try{report=await collect(connection);await connection.end();}catch(error){connection.destroy();throw error;}
 report.checkedAtUtc=new Date().toISOString();report.candidate=env.GITHUB_SHA;report.runId=env.GITHUB_RUN_ID;
 fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
 console.log("Capacite NAP observee : deux requetes administratives, aucune table metier, aucun changement. Rapport numerique uniquement.");
}
module.exports={collect,context,readPassword,QUERIES,STATUS};
if(require.main===module){main(path.resolve(__dirname,".."),process.argv[2]).catch(error=>{console.error("Collecte refusee : "+(/^[A-Z0-9_]+$/.test(error.safeCode||"")?error.safeCode:"READONLY_COLLECTION_FAILED"));process.exitCode=1;});}
