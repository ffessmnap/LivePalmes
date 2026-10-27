"use strict";
const assert=require("node:assert/strict");
const native=require("../functions/nap-license-reports"),reports=require("../functions/engagement-license-reports"),migration=require("../tools/migrate-nap-license-reports");
function fixture(){
 let latest=null,rows=[],backup;const calls=[];
 const c={calls,get rows(){return rows;},get latest(){return latest;},async getConnection(){return this;},release(){},async beginTransaction(){backup=structuredClone({latest,rows});},async commit(){},async rollback(){({latest,rows}=backup);},async execute({sql},args){
  calls.push({sql,args});let result=[];
  if(sql.startsWith("SELECT GET_LOCK"))result=[{acquired:1}];
  else if(sql.startsWith("SELECT RELEASE_LOCK"))result=[{}];
  else if(sql.startsWith("SELECT version,revision"))result=latest?[latest]:[];
  else if(sql.startsWith("INSERT INTO livepalmes_license_control_history")){rows.push({version:args[2],revision:args[3],report:args[4],summary:args[5],mail:args[6]});result={affectedRows:1};}
  else if(sql.startsWith("INSERT INTO livepalmes_license_control_current")){latest={version:args[2],revision:args[3],summary:args[4]};result={affectedRows:1};}
  else if(sql.startsWith("SELECT h.report"))result=latest?rows.filter(r=>r.version===latest.version):[];
  else if(sql.startsWith("SELECT competition_id,summary"))result=latest?[{competition_id:1,summary:latest.summary}]:[];
  else if(sql.startsWith("SELECT version,summary"))result=rows.filter(r=>args.length===2||r.version<args[2]).slice().reverse().slice(0,21);
  else if(sql.startsWith("SELECT report,mail"))result=rows.filter(r=>r.version===args[2]);
  else if(sql.startsWith("UPDATE livepalmes_license_control_history")){const r=rows.find(r=>r.version===args[4]);r.mail=args[0];r.summary=args[1];result={affectedRows:1};}
  else if(sql.startsWith("UPDATE livepalmes_license_control_current")){latest.summary=args[0];result={affectedRows:1};}
  else throw Error("Unexpected SQL "+sql);
  return [structuredClone(result)];
 }};return c;
}
const report={version:1,competitionId:"1",competitionName:"Coupe fictive",season:"2026-2027",status:"issues",completedAt:"2026-10-27T10:00:00Z",completedBy:"national",fingerprint:"f".repeat(64),revision:"a".repeat(64),counts:{total:1,valid:0,expired:0,notFound:0,unconfirmed:1},people:[{id:"10",firstName:"Camille",lastName:"EXEMPLE",clubName:"Club fictif",licenseNumber:"EXEMPLE",status:"erreur",validity:""}],mail:null};
(async()=>{
 const pool=fixture(),store=native.store(pool);assert.equal(await store.read(report.season,"1"),null);
 assert.equal((await store.save(report)).version,1);assert.deepEqual(await store.read(report.season,"1"),report);
 await assert.rejects(store.save({...report,revision:"b".repeat(64)},"stale"),/modifié/);assert.equal(pool.rows.length,1);
 await store.markMail(report,{sentAt:"2026-10-27T11:00:00Z",recipientCount:2});assert.equal((await store.read(report.season,"1")).mail.recipientCount,2);
 const initialPayload=pool.rows[0].report;
 let previous=report.revision;
 for(let n=2;n<=23;n++){const revision=native.hash(n);await store.save({...report,revision},previous);previous=revision;}
 assert.equal(pool.rows[0].report,initialPayload,"Older business snapshots stay immutable");
 const first=await store.history(report.season,"1");assert.equal(first.reports.length,20);assert.equal(first.nextBefore,4);
 const second=await store.history(report.season,"1",first.nextBefore);assert.deepEqual(second.reports.map(r=>r.version),[3,2,1]);assert.equal(second.nextBefore,null);
 assert.equal((await store.readVersion(report.season,"1",1)).mail.recipientCount,2);
 assert.equal((await store.summaries(report.season)).reports["1"].revision,previous);
 await assert.rejects(store.markMail(report,{sentAt:"later",recipientCount:3}),/changé/);
 await assert.rejects(store.readVersion(report.season,"1",0),/invalide/);
 await assert.rejects(store.history(report.season,"1",-1),/invalide/);
 await assert.rejects(store.readMany(report.season,Array(6).fill(1)),/invalide/);
 assert(pool.calls.filter(c=>/SELECT .*FROM livepalmes_/.test(c.sql)).every(c=>/LIMIT/.test(c.sql)),"All interactive SQL reads are bounded");
 assert(pool.calls.every(c=>!/(nageurs|engagementMailJobs|SMTP)/.test(c.sql)));
 assert(pool.calls.find(c=>c.sql.startsWith("SELECT version,summary")).sql.includes("LIMIT 21"));
 assert.equal(migration.validate(report),report);assert.throws(()=>migration.validate({...report,revision:"bad"}));
 assert.throws(()=>migration.validate({...report,people:Array(801).fill({})}));
 // Official source inventory never reads TEST or scans the whole configuration collection.
 let chain=[];const sourceDb={collection:n=>{chain.push(n);return {orderBy:n=>{chain.push(n);return {startAt:n=>{chain.push(n);return {endBefore:n=>{chain.push(n);return {limit:n=>{chain.push(n);return {get:async()=>({size:1,docs:[{id:"license-control-2026-2027-1",data:()=>report}]})};}};}};}};}};}};
 assert.deepEqual(await migration.source(sourceDb),[report]);assert.deepEqual(chain,["engagementConfigurations","__name__","license-control-","license-control.",1001]);
 // Exercise the actual metadata checks, additive DDL, backup CAS and reread path.
 const target=fixture();let present=false;const originalExecute=target.execute.bind(target);
 target.query=async({sql})=>{assert(native.ddl.includes(sql));present=true;return [[]];};
 target.execute=async(options,args)=>{
   const sql=options.sql;
   if(sql.startsWith("SELECT id FROM competitions"))return [[{id:1}]];
   if(sql.startsWith("EXPLAIN"))return [[{table:"fixture",key:"PRIMARY",rows:1,type:"ref"}]];
   if(!sql.includes("information_schema"))return originalExecute(options,args);
   const table=args[0],i=native.tables.indexOf(table);
   if(sql.includes("TRIGGERS"))return [[]];
   if(!present)return [[]];
   if(sql.includes("information_schema.TABLES"))return [[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
   if(sql.includes("information_schema.COLUMNS"))return [migration.columns[i].map(([COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT:null,EXTRA:""}))];
   const indexes=i?{PRIMARY:["season","competition_id","version"],competition_history:["competition_id"],report_revision:["season","competition_id","revision"]}:{PRIMARY:["season","competition_id"]};
   return [Object.entries(indexes).flatMap(([INDEX_NAME,fields])=>fields.map((COLUMN_NAME,j)=>({INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:j+1,NON_UNIQUE:INDEX_NAME==="competition_history"?1:0,SUB_PART:null})))];
 };
 const prepared=await migration.migrate(target,sourceDb,"prepare");assert.equal(present,false);assert.equal(target.rows.length,0);
 await assert.rejects(migration.migrate(target,sourceDb,"apply",{...prepared,sourceHash:"changed"}),/changé/);assert.equal(present,false);
 const migrated=await migration.migrate(target,sourceDb,"apply",prepared);assert.equal(migrated.verified,true);assert.equal(migrated.imported,1);assert.deepEqual(await native.store(target).read(report.season,"1"),report);
 const resumed=await migration.migrate(target,sourceDb,"prepare");assert.equal((await migration.migrate(target,sourceDb,"apply",resumed)).alreadyPresent,1);
 await native.store(target).save({...report,revision:"b".repeat(64)},report.revision);
 const conflict=await migration.migrate(target,sourceDb,"prepare");await assert.rejects(migration.migrate(target,sourceDb,"apply",conflict),/différent/);assert.equal(target.rows.length,2);
 // TEST has no mail side effects even when reports come from NAP.
 let sends=0,writes=0;
 const batch={season:require("../functions/nap-license-state").seasonInfo(report.season),competitions:[{id:"1"}],people:[]};
 const current={...report,fingerprint:reports.fingerprint(batch,"1")};
 const services={projectId:"livepalmes-test",competition:async()=>({regionId:"r",computerEmail:"fake@example.test"}),directory:async()=>[],setting:async()=>({enabled:true}),send:async()=>{sends++;}};
 const db={collection:()=>{writes++;throw Error("No mail write expected");}},nativeStore={read:async()=>current,markMail:async()=>{writes++;}};
 const preview=await reports.notify(db,batch,{action:"previewReport",competitionId:"1"},services,nativeStore);
 const sent=await reports.notify(db,batch,{action:"sendReport",competitionId:"1",expectedFingerprint:preview.fingerprint},services,nativeStore);
 assert.equal(sent.reason,"test-emails-disabled");assert.equal(sends,0);assert.equal(writes,0);
 console.log("Bilans NAP : historique immuable, concurrence, pagination, lectures bornées, source PROD ciblée et zéro mail TEST : OK");
})().catch(error=>{console.error(error);process.exitCode=1;});
