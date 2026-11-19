"use strict";
// Only public pinned consumers and two fixed metadata endpoints. No publication.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {createRequire}=require("node:module"),{performance}=require("node:perf_hooks");
const ROOT=path.resolve(__dirname,".."),PROVIDER="projects/718081132564/locations/global/workloadIdentityPools/livepalmes-github/providers/github-production-delivery";
const ACCOUNTS={hosting:"github-actions-livepalmes@livepalmes.iam.gserviceaccount.com",backend:"github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com"};
const EXPECTED={nodeVersion:"v22.23.5",firebaseCliVersion:"15.24.0",cliGoogleAuthVersion:"9.15.1",adminVersion:"14.2.0",adminGoogleAuthVersion:"10.9.1"};
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
function versions(root=ROOT){
 const fromCli=createRequire(path.join(root,"tests/firestore-rules/package.json")),fromFunctions=createRequire(path.join(root,"functions/package.json"));
 const fromAdmin=createRequire(fromFunctions.resolve("firebase-admin/app"));
 return {nodeVersion:process.version,firebaseCliVersion:fromCli("firebase-tools/package.json").version,
  cliGoogleAuthVersion:fromCli("google-auth-library/package.json").version,adminVersion:JSON.parse(fs.readFileSync(path.join(root,"functions/node_modules/firebase-admin/package.json"))).version,
  adminGoogleAuthVersion:fromAdmin("google-auth-library/package.json").version};
}
function adc(file,kind){
 assert(Object.hasOwn(ACCOUNTS,kind));const info=fs.lstatSync(file);assert(info.isFile()&&!info.isSymbolicLink()&&info.size<=65536);
 const raw=fs.readFileSync(file),value=JSON.parse(raw);
 assert.deepEqual(Object.keys(value).sort(),["type","audience","subject_token_type","token_url","credential_source","service_account_impersonation_url","project_id","client_email","service_account_impersonation"].sort());
 assert.equal(value.type,"external_account");assert.equal(value.project_id,"livepalmes");assert.equal(value.client_email,ACCOUNTS[kind]);
 assert.equal(value.audience,"//iam.googleapis.com/"+PROVIDER);assert.equal(value.token_url,"https://sts.googleapis.com/v1/token");
 assert.equal(value.subject_token_type,"urn:ietf:params:oauth:token-type:jwt");assert.deepEqual(value.service_account_impersonation,{token_lifetime_seconds:600});
 assert.equal(value.service_account_impersonation_url,"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"+ACCOUNTS[kind]+":generateAccessToken");
 const source=value.credential_source;assert.deepEqual(Object.keys(source).sort(),["url","headers","format"].sort());
 assert.deepEqual(Object.keys(source.headers),["Authorization"]);assert(/^Bearer [^\s]+$/.test(source.headers.Authorization));
 assert.deepEqual(source.format,{type:"json",subject_token_field_name:"value"});const url=new URL(source.url);
 assert(url.protocol==="https:"&&url.hostname.endsWith(".actions.githubusercontent.com")&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==="443"));
 assert.equal(url.searchParams.get("audience"),"https://iam.googleapis.com/"+PROVIDER);return raw;
}
function metadata(value,kind){
 if(kind==="hosting"){
  assert(["projects/livepalmes/sites/livepalmes","projects/718081132564/sites/livepalmes"].includes(value.name));
  assert.equal(value.defaultUrl,"https://livepalmes.web.app");return {site:"livepalmes",defaultUrl:value.defaultUrl};
 }
 assert.equal(kind,"backend");assert(!value.nextPageToken&&!value.unreachable?.length);assert.equal(value.functions.length,119);
 assert.equal(new Set(value.functions.map(f=>f.name)).size,119);
 for(const f of value.functions){assert.deepEqual(Object.keys(f).sort(),["name","state"]);assert(f.name.startsWith("projects/livepalmes/locations/europe-west1/functions/"));assert.equal(f.state,"ACTIVE");}
 return {functionsActive:119,identitiesSha256:sha(JSON.stringify([...value.functions].sort((a,b)=>a.name.localeCompare(b.name))))};
}
function cliMetadata(value,kind){
 if(kind==="hosting")return metadata(value,kind);
 assert(Array.isArray(value)&&value.length===119);const rows=value.map(f=>{assert(typeof f.id==="string"&&f.region==="europe-west1");return {id:f.id,region:f.region,platform:f.platform};});
 assert.equal(new Set(rows.map(f=>f.id)).size,119);return {functions:119,metadataSha256:sha(JSON.stringify(rows.sort((a,b)=>a.id.localeCompare(b.id))))};
}
function token9(value,now){
 assert(typeof value?.token==="string"&&value.token.length>0&&value.token.length<=16384&&!/\s/.test(value.token));
 const expiry=Date.parse(value.res?.data?.expireTime);assert(Number.isFinite(expiry)&&expiry-now>=500000&&expiry-now<=605000);return {token:value.token,expiry};
}
function token10(value,now){
 assert(typeof value?.access_token==="string"&&value.access_token.length>0&&value.access_token.length<=16384&&!/\s/.test(value.access_token));
 assert(Number.isSafeInteger(value.expires_in)&&value.expires_in>=500&&value.expires_in<=605);return {token:value.access_token,expiry:now+value.expires_in*1000};
}
async function qualify({kind,readCli,readSdk,credential9,credential10,wall=Date.now,monotonic=()=>performance.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const started=wall(),mono=monotonic();const firstCli=cliMetadata(await readCli(),kind),afterFirstCli=wall();
 const first9=token9(await credential9.getAccessToken(),wall()),first10=token10(await credential10.getAccessToken(),wall());
 const firstRead=metadata(await readSdk(),kind),deadline=Math.max(first9.expiry+5000,first10.expiry+5000,afterFirstCli+610000);
 while(wall()<deadline){assert(Math.abs((wall()-started)-(monotonic()-mono))<=5000);assert(monotonic()-mono<750000);await sleep(Math.min(30000,deadline-wall()));}
 const secondStarted=wall();assert(secondStarted>first9.expiry&&secondStarted>first10.expiry&&secondStarted-afterFirstCli>=610000);
 assert.deepEqual(cliMetadata(await readCli(),kind),firstCli);
 const second9=token9(await credential9.getAccessToken(),wall()),second10=token10(await credential10.getAccessToken(),wall());
 assert.notEqual(second9.token,first9.token);assert.notEqual(second10.token,first10.token);assert(second9.expiry>first9.expiry&&second10.expiry>first10.expiry);
 assert.deepEqual(metadata(await readSdk(),kind),firstRead);assert(Math.abs((wall()-started)-(monotonic()-mono))<=5000);
 return {kind,sameCliModuleProcess:true,cliReads:2,technicalSdkReads:2,sdkCredentialsRenewed:2,renewedAfterRealExpiry:true,
  requestedTokenLifetimeSeconds:600,waitedMilliseconds:secondStarted-afterFirstCli,
  sdk9FirstExpiresAt:new Date(first9.expiry).toISOString(),sdk10FirstExpiresAt:new Date(first10.expiry).toISOString(),secondReadsStartedAt:new Date(secondStarted).toISOString(),
  initialCliTokenExpiryObserved:false,cliExpiryInferredFromPinned600SecondAdc:true,longSinglePublicationCommandQualified:false,
  accountRecordsRead:0,publicationInvocations:0,configurationWrites:0,tokensExported:false};
}
async function main(root=ROOT, expected=EXPECTED){
 const profile=versions(root);assert.deepEqual(profile,expected);
 if(process.argv.length===3&&process.argv[2]==="--profile"){process.stdout.write(JSON.stringify(profile));return;}
 assert.equal(process.argv.length,2);assert.equal(process.env.WIF_CONSUMER_GUARD,"validated-exact-original-adc");
 const kind=process.env.WIF_READER_KIND;assert.equal(process.env.WIF_PROVIDER,PROVIDER);assert.equal(process.env.WIF_ACCOUNT,ACCOUNTS[kind]);
 const file=path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS||""),destination=path.resolve(process.env.WIF_CONSUMER_OUTPUT||"");
 assert.equal(path.dirname(file),path.dirname(destination));assert(!fs.existsSync(destination));const original=adc(file,kind);
 const fromCli=createRequire(path.join(root,"tests/firestore-rules/package.json")),fromFunctions=createRequire(path.join(root,"functions/package.json"));
 const cli=fromCli("firebase-tools"),{GoogleAuth}=fromCli("google-auth-library"),{applicationDefault}=fromFunctions("firebase-admin/app");
 const credential9=await new GoogleAuth({keyFilename:file,scopes:["https://www.googleapis.com/auth/cloud-platform"]}).getClient(),credential10=applicationDefault();
 const options={project:"livepalmes",nonInteractive:true,json:true};
 const readCli=kind==="hosting"?()=>cli.hosting.sites.get("livepalmes",options):()=>cli.functions.list(options);
 const url=kind==="hosting"?"https://firebasehosting.googleapis.com/v1beta1/projects/livepalmes/sites/livepalmes":"https://cloudfunctions.googleapis.com/v2/projects/livepalmes/locations/-/functions?pageSize=500&fields=functions(name,state),nextPageToken,unreachable";
 const readSdk=async()=>{const result=await credential9.request({url,method:"GET",timeout:30000,maxRedirects:0,maxContentLength:1000000});return result.data;};
 const result=await qualify({kind,readCli,readSdk,credential9,credential10});assert.deepEqual(fs.readFileSync(file),original);
 fs.writeFileSync(destination,JSON.stringify({...profile,...result},null,2)+"\n",{mode:0o600,flag:"wx"});
}
module.exports={adc,metadata,cliMetadata,token9,token10,qualify,versions,main,EXPECTED,ACCOUNTS,PROVIDER};
if(require.main===module)main().catch(()=>{process.stderr.write("Qualification des consommateurs refusee.\n");process.exitCode=1;});
