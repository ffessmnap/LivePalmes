"use strict";
// Protected read-only probe only. No publication identity or Google role change.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"..");
const PLAN=".github/releases/evidence/20261117-wif-readonly-plan.json";
const PROVIDER="projects/718081132564/locations/global/workloadIdentityPools/livepalmes-github/providers/github-a3-production";
const SERVICE_ACCOUNT="github-actions-livepalmes@livepalmes.iam.gserviceaccount.com";
const WORKFLOW="ffessmnap/LivePalmes/.github/workflows/a3-wif-readonly.yml@refs/heads/main";
const REF="refs/heads/main",REPO="ffessmnap/LivePalmes";
const fail=()=>{throw Error("Controle WIF refuse");};
function need(value){if(!value)fail();}
function exact(value,keys){need(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).sort().join("|")===[...keys].sort().join("|"));}
function guard(env){
 need(env.GITHUB_REPOSITORY===REPO&&env.GITHUB_REPOSITORY_ID==="1240638222"&&env.GITHUB_REPOSITORY_OWNER_ID==="284726282"&&env.GITHUB_REF===REF&&env.GITHUB_EVENT_NAME==="workflow_dispatch"&&env.GITHUB_RUN_ATTEMPT==="1"&&env.GITHUB_WORKFLOW_REF===WORKFLOW&&env.VERIFIED_MAIN_CI==="true"&&/^[0-9a-f]{40}$/.test(env.GITHUB_SHA||"")&&env.EXPECTED_COMMIT===env.GITHUB_SHA&&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||"")&&Number.isSafeInteger(Number(env.GITHUB_RUN_ID)));
 return {repository:REPO,project:"livepalmes",candidate:env.GITHUB_SHA,run:Number(env.GITHUB_RUN_ID),workflow:WORKFLOW};
}
function validateExternal(record,env){
 guard(env); // Must precede OIDC endpoint/token access, including in tests.
 exact(record,["type","audience","subject_token_type","token_url","credential_source","service_account_impersonation_url"]);
 need(record.type==="external_account"&&record.audience==="//iam.googleapis.com/"+PROVIDER&&record.subject_token_type==="urn:ietf:params:oauth:token-type:jwt"&&record.token_url==="https://sts.googleapis.com/v1/token"&&record.service_account_impersonation_url==="https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"+SERVICE_ACCOUNT+":generateAccessToken");
 exact(record.credential_source,["url","headers","format"]);
 exact(record.credential_source.headers,["Authorization"]);
 exact(record.credential_source.format,["type","subject_token_field_name"]);
 need(record.credential_source.format.type==="json"&&record.credential_source.format.subject_token_field_name==="value");
 const expected=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
 need(expected.protocol==="https:"&&!expected.username&&!expected.password&&expected.hostname.endsWith(".actions.githubusercontent.com")&&typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN==="string"&&env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length>0);
 expected.searchParams.set("audience","https://iam.googleapis.com/"+PROVIDER);
 need(record.credential_source.url===expected.href&&record.credential_source.headers.Authorization==="Bearer "+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);
 return {...record,service_account_impersonation:{token_lifetime_seconds:600}};
}
function prepareExternalFile(env){
 guard(env);
 const workspace=path.resolve(env.GITHUB_WORKSPACE||""),file=path.resolve(env.GOOGLE_APPLICATION_CREDENTIALS||"");
 need(path.dirname(file)===workspace&&/^gha-creds-[A-Za-z0-9_-]{8,80}\.json$/.test(path.basename(file)));
 const stat=fs.lstatSync(file);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=65536);
 const prepared=validateExternal(JSON.parse(fs.readFileSync(file,"utf8")),env);
 // Only the probe's ephemeral ADC file is amended through a supported public
 // GoogleAuth option. No SDK cache or token is modified; file never exported.
 fs.writeFileSync(file,JSON.stringify(prepared),{mode:0o600});
 fs.chmodSync(file,0o600);return file;
}
function lifetime(token,now){
 need(token&&typeof token.access_token==="string"&&token.access_token.length>0&&Number.isSafeInteger(token.expires_in)&&token.expires_in>=540&&token.expires_in<=660);
 return now+token.expires_in*1000;
}
async function exercise({credential,readProject,now,wait,progress}){
 need(credential&&typeof credential.getAccessToken==="function"&&typeof readProject==="function");
 const started=now(),first=await credential.getAccessToken(),expires=lifetime(first,now());
 const before=await readProject();need(before&&typeof before==="object");
 while(now()<expires+5000){const delay=Math.min(30000,expires+5000-now());need(delay>0&&now()-started<=700000);await wait(delay);progress();}
 const renewedAt=now(),second=await credential.getAccessToken(),secondExpires=lifetime(second,now());
 need(renewedAt>expires&&secondExpires>expires&&second.access_token!==first.access_token);
 const after=await readProject();need(after&&typeof after==="object");
 return {sameCredentialInstance:true,projectReads:2,firstObservedExpiryUtc:new Date(expires).toISOString(),renewalCheckedAtUtc:new Date(renewedAt).toISOString(),secondObservedExpiryUtc:new Date(secondExpires).toISOString(),renewedAfterRealExpiry:true,tokenChanged:true,waitedMilliseconds:renewedAt-started};
}
async function main(argv,env=process.env){
 const context=guard(env);
 need(argv.length===1&&argv[0]);
 const destination=path.resolve(argv[0]);need(!fs.existsSync(destination));
 const planBytes=fs.readFileSync(path.join(ROOT,PLAN)),plan=JSON.parse(planBytes);
 need(plan.schema===1&&plan.project==="livepalmes"&&plan.serviceAccount===SERVICE_ACCOUNT&&plan.bindingRole==="roles/iam.workloadIdentityUser"&&plan.existingGoogleRolesUnchanged===true&&plan.publicationIdentityChanged===false);
 const fromFunctions=require("node:module").createRequire(path.join(ROOT,"functions/package.json"));
 const fromAdmin=require("node:module").createRequire(fromFunctions.resolve("firebase-admin/app"));
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,"functions/node_modules/firebase-admin/package.json"))).version;
 const googleAuthVersion=JSON.parse(fs.readFileSync(fromAdmin.resolve("google-auth-library/package.json"))).version;
 need(process.version===plan.nodeVersion&&version===plan.firebaseAdminVersion&&googleAuthVersion===plan.googleAuthVersion);
 prepareExternalFile(env);
 const {initializeApp,applicationDefault,deleteApp}=fromFunctions("firebase-admin/app");
 const {getAuth}=fromFunctions("firebase-admin/auth");
 const credential=applicationDefault(),app=initializeApp({projectId:"livepalmes",credential},"a3-readonly-wif-probe");
 try{
  const report=await exercise({credential,readProject:()=>getAuth(app).projectConfigManager().getProjectConfig(),now:Date.now,wait:ms=>new Promise(resolve=>setTimeout(resolve,ms)),progress:()=>console.log("Controle en lecture seule : attente de l'expiration du jeton court.")});
  fs.mkdirSync(destination,{mode:0o700});
  const receipt={schema:1,context,provider:PROVIDER,serviceAccount:SERVICE_ACCOUNT,planSha256:crypto.createHash("sha256").update(planBytes).digest("hex"),nodeVersion:process.version,firebaseAdminVersion:version,googleAuthVersion,...report,accountsRead:0,businessInvocations:0,configurationWrites:0,iamBindingsWritten:0,serviceAccountKeysCreated:0,existingKeysRead:0,credentialsExported:false,tokensExported:false,publicationIdentityChanged:false};
  fs.writeFileSync(path.join(destination,"wif-readonly-proof.json"),JSON.stringify(receipt,null,2)+"\n",{mode:0o600,flag:"wx"});
  console.log("Controle WIF termine : configuration projet lue deux fois, meme instance SDK apres expiration reelle, aucun jeton exporte.");
 }finally{await deleteApp(app);}
}
module.exports={guard,validateExternal,prepareExternalFile,exercise,main,PROVIDER,SERVICE_ACCOUNT,WORKFLOW};
if(require.main===module)main(process.argv.slice(2)).catch(()=>{console.error("Controle WIF refuse ; aucun contenu de credential ou reponse cloud affiche.");process.exitCode=1;});
