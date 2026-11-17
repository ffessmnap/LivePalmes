"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {spawnSync}=require("node:child_process"),yaml=require("./firestore-rules/node_modules/js-yaml");
const probe=require("../tools/a3-wif-readonly");
const root=path.resolve(__dirname,".."),sha="a".repeat(40);
const env={GITHUB_REPOSITORY:"ffessmnap/LivePalmes",GITHUB_REPOSITORY_ID:"1240638222",GITHUB_REPOSITORY_OWNER_ID:"284726282",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_WORKFLOW_REF:probe.WORKFLOW,VERIFIED_MAIN_CI:"true",GITHUB_SHA:sha,EXPECTED_COMMIT:sha,GITHUB_RUN_ID:"101",ACTIONS_ID_TOKEN_REQUEST_URL:"https://run-fixture.actions.githubusercontent.com/idtoken?api-version=2.0",ACTIONS_ID_TOKEN_REQUEST_TOKEN:"PUBLIC-SYNTHETIC-NOT-A-CREDENTIAL"};
function external(){const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set("audience","https://iam.googleapis.com/"+probe.PROVIDER);return {type:"external_account",audience:"//iam.googleapis.com/"+probe.PROVIDER,subject_token_type:"urn:ietf:params:oauth:token-type:jwt",token_url:"https://sts.googleapis.com/v1/token",service_account_impersonation_url:"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"+probe.SERVICE_ACCOUNT+":generateAccessToken",credential_source:{url:url.href,headers:{Authorization:"Bearer "+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},format:{type:"json",subject_token_field_name:"value"}}};}
assert.equal(probe.guard(env).candidate,sha);
for(const name of Object.keys(env).filter(x=>!x.startsWith("ACTIONS_"))){
 let reads=0;const bad={...env,[name]:"wrong"};
 for(const property of ["GOOGLE_APPLICATION_CREDENTIALS","ACTIONS_ID_TOKEN_REQUEST_URL","ACTIONS_ID_TOKEN_REQUEST_TOKEN"])Object.defineProperty(bad,property,{get(){reads++;throw Error("Credential must not be read");}});
 assert.throws(()=>probe.prepareExternalFile(bad));assert.equal(reads,0,name);
}
assert.throws(()=>probe.guard({...env,GITHUB_RUN_ID:"9007199254740993"}));
const original=external(),prepared=probe.validateExternal(original,env);
assert.deepEqual(prepared.service_account_impersonation,{token_lifetime_seconds:600});assert(!original.service_account_impersonation);
for(const mutate of [
 r=>r.type="service_account",r=>r.audience+="-other",r=>r.token_url="https://example.invalid/token",
 r=>r.service_account_impersonation_url=r.service_account_impersonation_url.replace(probe.SERVICE_ACCOUNT,"other@example.invalid"),
 r=>r.extra="unexpected",r=>r.private_key="FORBIDDEN",r=>r.credential_source.file="/tmp/secret",
 r=>r.credential_source.url="https://example.invalid/",r=>r.credential_source.url+="&other=1",
 r=>r.credential_source.headers.Authorization="Bearer other",r=>r.credential_source.headers.extra="other",
 r=>r.credential_source.format.type="text",r=>r.credential_source.format.subject_token_field_name="other",
 r=>r.service_account_impersonation={token_lifetime_seconds:3600}
]){const bad=structuredClone(original);mutate(bad);assert.throws(()=>probe.validateExternal(bad,env));}
assert.throws(()=>probe.validateExternal(external(),{...env,ACTIONS_ID_TOKEN_REQUEST_URL:"http://run-fixture.actions.githubusercontent.com/idtoken"}));
const parent=path.resolve(os.tmpdir()),directory=fs.mkdtempSync(path.join(parent,"lp-wif-probe-tests-"));
try{
 const file=path.join(directory,"gha-creds-abcdefgh.json");fs.writeFileSync(file,JSON.stringify(external()));
 probe.prepareExternalFile({...env,GITHUB_WORKSPACE:directory,GOOGLE_APPLICATION_CREDENTIALS:file});
 assert.equal(JSON.parse(fs.readFileSync(file)).service_account_impersonation.token_lifetime_seconds,600);
 assert.throws(()=>probe.prepareExternalFile({...env,GITHUB_WORKSPACE:directory,GOOGLE_APPLICATION_CREDENTIALS:file}),"Only initial action shape may be amended");
 assert.throws(()=>probe.prepareExternalFile({...env,GITHUB_WORKSPACE:path.join(directory,"other"),GOOGLE_APPLICATION_CREDENTIALS:file}));
 const child=spawnSync(process.execPath,[path.join(root,"tools/a3-wif-readonly.js"),path.join(directory,"proof")],{env:{...process.env,...env,EXPECTED_COMMIT:"invalid"},encoding:"utf8"});
 assert.equal(child.status,1);assert(!child.stderr.includes(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN));assert.match(child.stderr,/aucun contenu/);assert(!fs.existsSync(path.join(directory,"proof")));
}finally{const resolved=path.resolve(directory);assert.equal(path.dirname(resolved),parent);assert(path.basename(resolved).startsWith("lp-wif-probe-tests-"));fs.rmSync(resolved,{recursive:true,force:true});}
const workflow=yaml.load(fs.readFileSync(path.join(root,".github/workflows/a3-wif-readonly.yml"),"utf8")),job=workflow.jobs.probe;
assert.deepEqual(Object.keys(workflow.on),["workflow_dispatch"]);assert.equal(job.environment,"production");
assert.equal(job.if,"github.ref == 'refs/heads/main' && github.run_attempt == 1 && inputs.expected_commit == github.sha");
assert.deepEqual(job.permissions,{contents:"read",actions:"read","id-token":"write"});assert.equal(workflow.permissions["id-token"],undefined);
assert.equal(workflow.concurrency["cancel-in-progress"],false);
const ci=job.steps.findIndex(s=>s.id==="ci"),check=job.steps.findIndex(s=>s.env?.VERIFIED),auth=job.steps.findIndex(s=>s.with?.workload_identity_provider);
assert(ci<check&&check<auth);assert.equal(job.steps[check].run,'test "$VERIFIED" = true');
assert.equal(job.steps[auth].with.workload_identity_provider,probe.PROVIDER);assert.equal(job.steps[auth].with.service_account,probe.SERVICE_ACCOUNT);
assert.equal(job.steps[auth].with.audience,"https://iam.googleapis.com/"+probe.PROVIDER);
assert(!job.steps[auth].with.credentials_json&&!job.steps[auth].with.token_format);
assert(job.steps.every(s=>!JSON.stringify(s).includes("secrets.")));assert(job.steps.filter(s=>s.uses).every(s=>/@[0-9a-f]{40}$/.test(s.uses)));
assert.equal(job.steps.at(-1).with.path,"${{ runner.temp }}/a3-wif-proof/wif-readonly-proof.json");
assert(!job.steps.at(-1).with.path.includes("gha-creds"));assert(fs.readFileSync(path.join(root,".gitignore"),"utf8").split(/\r?\n/).includes("gha-creds-*.json"));
const plan=JSON.parse(fs.readFileSync(path.join(root,".github/releases/evidence/20261117-wif-readonly-plan.json")));
assert.equal(plan.state,"plan-only-not-an-authorization");assert.equal(plan.serviceAccount,probe.SERVICE_ACCOUNT);assert.equal(plan.bindingRole,"roles/iam.workloadIdentityUser");
assert.equal(plan.nodeVersion,"v22.23.5");assert.equal(plan.firebaseAdminVersion,"14.2.0");assert.equal(plan.googleAuthVersion,"10.9.1");assert.equal(job.steps.find(s=>s.with?.["node-version"]).with["node-version"],plan.nodeVersion.slice(1));
assert.equal(plan.principalMember,"principal://iam.googleapis.com/projects/718081132564/locations/global/workloadIdentityPools/livepalmes-github/subject/repo:ffessmnap/LivePalmes:environment:production");
assert.equal(plan.attributeCondition,["assertion.repository_id == '1240638222'","assertion.repository_owner_id == '284726282'","assertion.ref == 'refs/heads/main'","assertion.sub == 'repo:ffessmnap/LivePalmes:environment:production'","assertion.workflow_ref == '"+probe.WORKFLOW+"'","assertion.event_name == 'workflow_dispatch'"].join(" && "));
assert.equal(plan.issuer,"https://token.actions.githubusercontent.com");assert.equal(plan.attributeMapping["google.subject"],"assertion.sub");
assert(plan.existingGoogleRolesUnchanged&&plan.keysAndArchivesRetained&&!plan.publicationIdentityChanged);
async function exercise(options={}){
 let time=Date.parse("2026-11-17T20:00:00Z"),tokens=0,reads=0,waits=0;const start=time;
 const credential={async getAccessToken(){tokens++;if(tokens===2)assert(time>=start+604000);return {access_token:options.sameToken?"same":"public-mock-"+tokens,expires_in:options.lifetime??599};}};
 const report=await probe.exercise({credential,readProject:async()=>{reads++;return options.empty?null:{};},now:()=>time,wait:async ms=>{assert(ms>0&&ms<=30000);time+=ms;waits++;},progress:()=>{}});
 assert.equal(tokens,2);assert.equal(reads,2);assert(waits>=20);assert(report.sameCredentialInstance&&report.renewedAfterRealExpiry&&report.tokenChanged);assert.equal(report.waitedMilliseconds,604000);assert(!JSON.stringify(report).includes("public-mock"));return report;
}
(async()=>{
 await exercise();
 for(const options of [{sameToken:true},{lifetime:300},{lifetime:3600},{lifetime:599.5},{empty:true}])await assert.rejects(()=>exercise(options));
 console.log("WIF preparation : contexte avant credential, endpoints/compte/audience fermes, ADC probe seul, vrai seuil expiration sur horloge fictive, meme instance/jeton renouvele, workflow CI/main/protege et aucun secret/credential exporte. Aucun appel cloud ni lien IAM cree.");
})().catch(error=>{console.error(error);process.exitCode=1;});
