"use strict";
// Execute the real CLI runner with synthetic files and injected network/command services.
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const runner=require("../tools/migrate-nap-license-reports"),{hash}=require("../functions/nap-license-reports");
const originalCwd=process.cwd(),directory=fs.mkdtempSync(path.join(os.tmpdir(),"lp-runner-test-"));
const keys=["NAP_LICENSE_PHASE","NAP_LICENSE_CONFIRMATION","GOOGLE_APPLICATION_CREDENTIALS"];
const environment=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function credentials(project){fs.writeFileSync("credentials.json",JSON.stringify({project_id:project,private_key:"synthetic-test-key"}));process.env.GOOGLE_APPLICATION_CREDENTIALS=path.join(directory,"credentials.json");}
const db={collection:()=>({orderBy:()=>({startAt:()=>({endBefore:()=>({limit:()=>({get:async()=>({size:0,docs:[]})})})})})})};
const calls=[];
const services={officialDatabase:()=>db,execFileSync:(command,args)=>{
 assert.equal(command,"gcloud");calls.push(args[0]);
 return args[0]==="functions"?"https://synthetic-service.run.app":"SYNTHETIC_TOKEN";
},fetch:async(url,options)=>{
 assert.equal(url.searchParams.get("action"),"approved-license-reports");
 assert.equal(options.method,"POST");assert.equal(options.headers.Authorization,"Bearer SYNTHETIC_TOKEN");
 const body=JSON.parse(options.body);calls.push(body.phase);
 assert.equal(body.confirmation,"nap-license-reports-history");
 if(body.phase==="apply")assert.equal(body.backup.sourceHash,hash([]));
 return {ok:true,json:async()=>body.phase==="prepare"?{sourceProject:"livepalmes",sourceHash:hash([]),reports:[]}:{verified:true,imported:0}};
}};
(async()=>{
 try{
  process.chdir(directory);process.env.NAP_LICENSE_CONFIRMATION="nap-license-reports-history";
  let loadCalls=0;assert.equal(runner.runtimeCheck(name=>{loadCalls++;return name==="firebase-admin/app"?{cert(){throw Error("must not initialize");},initializeApp(){throw Error("must not initialize");}}:{getFirestore(){throw Error("must not connect");}};}),true);assert.equal(loadCalls,2);
  assert.throws(()=>runner.runtimeCheck(()=>({})),/incompatible/);
  process.env.NAP_LICENSE_PHASE="export";credentials("livepalmes");await runner.main(services);
  assert(fs.existsSync("outputs/nap-license-reports/source.enc"));assert.equal(calls.length,0);
  process.env.NAP_LICENSE_PHASE="prepare";credentials("livepalmes-test");await runner.main(services);
  assert(fs.existsSync("outputs/nap-license-reports/before.enc"));assert(!calls.includes("apply"));
  process.env.NAP_LICENSE_PHASE="apply";await runner.main(services);
  assert.equal(JSON.parse(fs.readFileSync("outputs/nap-license-reports/result.json")).verified,true);
  assert.deepEqual(calls,["functions","auth","prepare","functions","auth","apply"]);
  process.env.NAP_LICENSE_PHASE="prepare";
  await assert.rejects(runner.main({...services,execFileSync:()=>"http://untrusted.example"}),e=>e.code==="ENDPOINT");
  await assert.rejects(runner.main({...services,fetch:async()=>({ok:false,status:403})}),e=>e.code==="HTTP_REFUSED");
  await assert.rejects(runner.main({...services,fetch:async()=>({ok:true,json:async()=>({reports:[],sourceProject:"livepalmes",sourceHash:"altered"})})}),e=>e.code==="RESULT");
  process.env.NAP_LICENSE_PHASE="apply";
  await assert.rejects(runner.main({...services,fetch:async()=>({ok:true,json:async()=>({verified:false})})}),e=>e.code==="RESULT");
  fs.writeFileSync("outputs/nap-license-reports/source.json",JSON.stringify({sourceProject:"livepalmes",reports:[],hash:"altered"}));
  await assert.rejects(runner.main({execFileSync(){throw Error("must not request token");}}),e=>e.code==="SOURCE_BACKUP");
  process.env.NAP_LICENSE_CONFIRMATION="wrong";
  await assert.rejects(runner.main(services),e=>e.code==="CONFIRMATION");
  for(const phase of ["export","prepare","apply","unknown"]){
   const secret={name:"PRIVATE_PERSON",code:"SUPER_SECRET",message:"PRIVATE_SOURCE_DATA",stack:"SYNTHETIC_TOKEN"};
   const diagnostic=JSON.stringify(runner.failureDiagnostic(secret,phase));
   for(const value of Object.values(secret))assert(!diagnostic.includes(value));
   if(phase==="apply")assert(diagnostic.includes("écritures peuvent avoir eu lieu"));
  }
  assert(runner.failureDiagnostic({code:"HTTP_REFUSED"},"prepare").message.includes("accès et version"));
  console.log("Migration runner: export/prepare/apply, encrypted backups, runtime, refusal, tampering and secret-safe diagnostics tested offline.");
 }finally{
  process.chdir(originalCwd);for(const key of keys){if(environment[key]===undefined)delete process.env[key];else process.env[key]=environment[key];}
  if(path.dirname(directory)===path.resolve(os.tmpdir())&&path.basename(directory).startsWith("lp-runner-test-"))fs.rmSync(directory,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
