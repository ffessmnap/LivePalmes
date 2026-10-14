"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{createHash}=require("node:crypto");
const {publishSnapshot,refreshTestHomeEvents,BUCKET}=require("../functions/nap-home-events-refresh");
const {OBJECT_PATH,MAX_AGE_MS}=require("../functions/nap-home-events");
const {jobArgs,assertJob,ACCOUNT,JOB,SCHEDULE,DESCRIPTION}=require("../tools/configure-home-events-test");
const now=Date.parse("2026-10-14T05:00:00Z"),snapshot={schemaVersion:1,source:"nap",generatedAt:new Date(now).toISOString(),events:[]};
(async()=>{
 let stored,saves=0;const file={name:OBJECT_PATH,bucket:{name:BUCKET},getMetadata:async()=>[{generation:"123",metadata:{generatedAt:new Date(now-1000).toISOString()}}],save:async(bytes,options)=>{assert.equal(options.preconditionOpts.ifGenerationMatch,123);stored=bytes;saves++;},download:async()=>[stored]};
 const result=await publishSnapshot(file,{...snapshot,privateExtra:"never-publish"},now);assert.equal(result.verified,true);assert.equal(stored.includes("never-publish"),false);assert.equal(result.sha256,createHash("sha256").update(stored).digest("hex"));
 file.getMetadata=async()=>[{generation:"124",metadata:{generatedAt:snapshot.generatedAt}}];assert.equal((await publishSnapshot(file,snapshot,now)).unchanged,true);assert.equal(saves,1);
 file.getMetadata=async()=>[{generation:"125",metadata:{generatedAt:new Date(now+1000).toISOString()}}];assert.equal((await publishSnapshot(file,snapshot,now)).unchanged,true);
 file.getMetadata=async()=>{throw Object.assign(Error("absent"),{code:404});};file.save=async(bytes,options)=>{assert.equal(options.preconditionOpts.ifGenerationMatch,0);stored=bytes;};await publishSnapshot(file,snapshot,now);
 file.save=async()=>{throw Object.assign(Error("race"),{code:412});};await assert.rejects(publishSnapshot(file,snapshot,now),/race/);
 await assert.rejects(publishSnapshot(file,{...snapshot,generatedAt:new Date(now-MAX_AGE_MS-1).toISOString()},now),/indisponibles/);
 let reads=0;const pool={execute:async()=>{reads++;return [[]];}};
 await assert.rejects(refreshTestHomeEvents(pool,file,{projectId:"livepalmes",confirmation:"publish-livepalmes-test-home-events",now}),/réservée/);assert.equal(reads,0);
 await assert.rejects(refreshTestHomeEvents(pool,{...file,name:"different"},{projectId:"livepalmes-test",confirmation:"publish-livepalmes-test-home-events",now}),/réservée/);assert.equal(reads,0);
 file.save=async(bytes)=>{stored=bytes;};const refreshed=await refreshTestHomeEvents(pool,file,{projectId:"livepalmes-test",confirmation:"publish-livepalmes-test-home-events",now});assert.equal(reads,1);assert.equal(refreshed.napWrites,0);assert.equal(refreshed.sqlPages,1);
 const uri="https://export-test-example-ew.a.run.app",job={name:`projects/livepalmes-test/locations/europe-west1/jobs/${JOB}`,state:"ENABLED",schedule:SCHEDULE,timeZone:"Europe/Paris",description:DESCRIPTION,httpTarget:{uri:`${uri}?action=home-events-refresh`,httpMethod:"POST",oidcToken:{serviceAccountEmail:ACCOUNT,audience:uri}},attemptDeadline:"180s",retryConfig:{retryCount:3}};
 job.httpTarget.body=Buffer.from('{"confirmation":"publish-livepalmes-test-home-events"}').toString("base64");Object.assign(job.retryConfig,{minBackoffDuration:"30s",maxBackoffDuration:"300s",maxDoublings:3});
 assertJob(job,uri);for(const changed of [{schedule:"* * * * *"},{state:"PAUSED"},{httpTarget:{...job.httpTarget,oidcToken:{serviceAccountEmail:"other",audience:uri}}}])assert.throws(()=>assertJob({...job,...changed},uri),/non conforme/);
 assertJob({...job,httpTarget:{...job.httpTarget,uri:`${uri}/?action=home-events-refresh`}},uri);
 assertJob({...job,httpTarget:{...job.httpTarget,body:'{ "confirmation": "publish-livepalmes-test-home-events" }'}},uri);
 assert.throws(()=>assertJob({...job,httpTarget:{...job.httpTarget,body:'{"confirmation":"wrong"}'}},uri),/non conforme/);
 assert.throws(()=>assertJob({...job,httpTarget:{...job.httpTarget,uri:`${uri}/other?action=home-events-refresh`}},uri),/non conforme/);
 assert(jobArgs(uri).includes("--max-retry-attempts=3"));assert(jobArgs(uri).includes("--project=livepalmes-test"));assert.throws(()=>jobArgs("https://example.com"),/invalide/);
 assert(jobArgs(uri).includes("--headers=Content-Type=application/json"));assert(jobArgs(uri,SCHEDULE,true).includes("--update-headers=Content-Type=application/json"));assert(!jobArgs(uri,SCHEDULE,true).some(arg=>arg.startsWith("--headers=")));
 const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8"),publicSource=source.slice(source.indexOf("exports.readNapPublicSwimmer"),source.indexOf("exports.exportNapPublicPage"));assert.equal(publicSource.includes("home-events-refresh"),false);assert.match(source,/invoker: "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com"/);
 // Execute the real registered handler with modular Storage, as in the runtime.
 // This covers the wiring that module-only publication tests cannot exercise.
 const handlerEnd=source.indexOf("\nconst ENGAGEMENT_MAIL_CALLABLE_OPTIONS"),registration=source.slice(source.indexOf("exports.exportNapPublicPage"),source.lastIndexOf("\n}",handlerEnd));
 const context={exports:{},REGION:"europe-west1",napPassword:{},napPool:pool,ENVIRONMENT:{projectId:"livepalmes-test",publicBucket:BUCKET},storage:{bucket:name=>{assert.equal(name,BUCKET);return {file:path=>{assert.equal(path,OBJECT_PATH);return file;}};}},onRequest:(options,handler)=>handler,require:name=>require("../functions/"+name.slice(2))};
 require("node:vm").runInNewContext(registration,context);
 let status=200,data;const response={set(){},status(value){status=value;return this;},json(value){data=value;}};
 await context.exports.exportNapPublicPage({method:"POST",query:{action:"home-events-refresh"},body:{confirmation:"publish-livepalmes-test-home-events"}},response);assert.equal(status,200);assert.equal(data.verified,true);assert.equal(data.napWrites,0);
 await context.exports.exportNapPublicPage({method:"GET",query:{action:"home-events-refresh"}},response);assert.equal(status,405);
 let measuredReads=0,released=false;
 const connection={query:async()=>[[]],execute:async({sql})=>{
  if(sql.includes("information_schema"))return [[]];
  if(sql.startsWith("EXPLAIN"))return [[{table:"competitions",type:sql.includes("date<?")?"ALL":"range",key:"livepalmes_date_id",rows:71}]];
  assert(!sql.includes("date<?"),"A rejected history scan must never execute");measuredReads++;return [[{id:1}]];
 },release:()=>{released=true;}};
 const measurement=await require("../functions/nap-home-measure").measure({getConnection:async()=>connection});
 assert.equal(measuredReads,3);assert.equal(released,true);assert.equal(measurement.checks[1].fullScan,true);assert.equal(measurement.checks[1].samples.length,0);assert.equal(measurement.napWrites,0);assert(!JSON.stringify(measurement).includes('"id":1'));
 console.log("Home refresh: TEST-only object, bounded preparation, generation conflicts, monotonic freshness, OIDC scheduler and retries passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
