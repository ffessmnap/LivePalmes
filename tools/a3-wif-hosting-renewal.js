"use strict";
// Public Firebase CLI module only. No credential cache edits or token export.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const ROOT = path.resolve(__dirname, "..");
const PROFILE = Object.freeze({node:"v22.23.5", firebaseCli:"15.24.0", googleAuth:"9.15.1"});
const ACCOUNT = "github-actions-livepalmes@livepalmes.iam.gserviceaccount.com";
const PROVIDER = "projects/718081132564/locations/global/workloadIdentityPools/livepalmes-github/providers/github-a3-production";
const TOKEN_MS = 600_000;

function tokenResponse(value, now) {
  assert(value && typeof value.token === "string" && value.token.length > 0 && value.token.length <= 16384 && !/\s/.test(value.token));
  const expiresAt = Date.parse(value.res?.data?.expireTime);
  assert(Number.isFinite(expiresAt) && expiresAt - now >= 500_000 && expiresAt - now <= 605_000);
  return {token:value.token, expiresAt};
}
function site(value) {
  assert(value && ["projects/livepalmes/sites/livepalmes", "projects/718081132564/sites/livepalmes"].includes(value.name));
  assert.equal(value.defaultUrl, "https://livepalmes.web.app");
}

async function qualify({readSite, credential, wall=Date.now, monotonic=()=>performance.now(), sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)), progress=()=>{}, phase=()=>{}}) {
  const started=wall(), startedMono=monotonic();
  phase("cli-first");
  site(await readSite());
  const firstCliCompleted=wall();
  phase("reference-first");
  const first=tokenResponse(await credential.getAccessToken(), wall());
  // The public CLI does not expose its token expiry. A later reference token's
  // observed expiry plus the pinned 600-second ADC upper bound cover both.
  const deadline=Math.max(first.expiresAt+5_000, firstCliCompleted+TOKEN_MS+10_000);
  phase("wait-expiry");
  while(wall()<deadline) {
    assert(Math.abs((wall()-started)-(monotonic()-startedMono))<=5_000, "Clock drift");
    assert(monotonic()-startedMono<750_000, "Wait budget exceeded");
    await sleep(Math.min(30_000,deadline-wall()));
    progress();
  }
  assert(monotonic()-startedMono>=TOKEN_MS+10_000);
  assert(Math.abs((wall()-started)-(monotonic()-startedMono))<=5_000, "Clock drift");
  const secondCliStarted=wall();
  phase("cli-second");
  site(await readSite());
  phase("reference-second");
  const second=tokenResponse(await credential.getAccessToken(), wall());
  assert.notEqual(second.token,first.token,"Reference credential did not renew");
  assert(second.expiresAt>first.expiresAt && secondCliStarted>first.expiresAt);
  phase("done");
  return {sameCliModuleProcess:true, cliSiteReads:2, site:"livepalmes", requestedTokenLifetimeSeconds:600,
    referenceCredentialTokenCalls:2, referenceTokenChanged:true,
    referenceFirstExpiresAt:new Date(first.expiresAt).toISOString(),
    referenceSecondExpiresAt:new Date(second.expiresAt).toISOString(),
    secondCliStartedAt:new Date(secondCliStarted).toISOString(),
    waitedAfterFirstCliMs:secondCliStarted-firstCliCompleted,
    initialCliTokenExpiryObserved:false,
    cliInitialTokenLifetimeInferredFromPinnedAdc:true,
    longSinglePublicationCommandQualified:false,
    tokensExported:false, configurationWrites:0, publicationInvocations:0, accountsRead:0};
}

function copiedAdc(file) {
  const info=fs.lstatSync(file);
  assert(info.isFile() && !info.isSymbolicLink() && info.size<=65536);
  const record=JSON.parse(fs.readFileSync(file,"utf8"));
  assert.deepEqual(Object.keys(record).sort(),["type","audience","subject_token_type","token_url","credential_source","service_account_impersonation_url","service_account_impersonation"].sort());
  assert.equal(record.type,"external_account");
  assert.equal(record.audience,"//iam.googleapis.com/"+PROVIDER);
  assert.equal(record.subject_token_type,"urn:ietf:params:oauth:token-type:jwt");
  assert.equal(record.token_url,"https://sts.googleapis.com/v1/token");
  assert.equal(record.service_account_impersonation_url,"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"+ACCOUNT+":generateAccessToken");
  assert.deepEqual(record.service_account_impersonation,{token_lifetime_seconds:600});
  const source=record.credential_source;
  assert.deepEqual(Object.keys(source).sort(),["url","headers","format"].sort());
  assert.deepEqual(Object.keys(source.headers),["Authorization"]);
  assert(/^Bearer [^\s]+$/.test(source.headers.Authorization));
  assert.deepEqual(source.format,{type:"json",subject_token_field_name:"value"});
  const url=new URL(source.url);
  assert(url.protocol==="https:"&&url.hostname.endsWith(".actions.githubusercontent.com")&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==="443"));
  assert.equal(url.searchParams.get("audience"),"https://iam.googleapis.com/"+PROVIDER);
  return fs.readFileSync(file);
}

async function main() {
  assert.equal(process.version,PROFILE.node);
  assert.equal(process.env.WIF_QUALIFICATION,"hosting-renewal");
  assert.equal(process.env.LIVEPALMES_WIF_CONSUMER_GUARD,"validated-original-adc-and-versions");
  assert.equal(process.argv.length,3);
  const destination=path.resolve(process.argv[2]);
  const adc=path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS||"");
  assert.equal(path.dirname(destination),path.dirname(adc));
  assert(!fs.existsSync(destination));
  const modules=path.join(ROOT,"tests/firestore-rules/node_modules");
  for(const [file,expected] of [["firebase-tools/package.json",PROFILE.firebaseCli],["google-auth-library/package.json",PROFILE.googleAuth]])
    assert.equal(JSON.parse(fs.readFileSync(path.join(modules,file),"utf8")).version,expected);
  const original=copiedAdc(adc);
  const cli=require(path.join(modules,"firebase-tools"));
  const {GoogleAuth}=require(path.join(modules,"google-auth-library"));
  const auth=new GoogleAuth({keyFilename:adc,scopes:["https://www.googleapis.com/auth/cloud-platform"]});
  const credential=await auth.getClient();
  const readSite=()=>cli.hosting.sites.get("livepalmes",{project:"livepalmes",nonInteractive:true,json:true});
  const phase=name=>fs.writeFileSync(path.join(path.dirname(destination),"consumer-stage.json"),JSON.stringify({stage:name}),{mode:0o600});
  const report=await qualify({readSite,credential,phase,progress:()=>process.stdout.write("Controle WIF en attente bornee du renouvellement.\n")});
  assert.deepEqual(fs.readFileSync(adc),original);
  fs.writeFileSync(destination,JSON.stringify({profile:PROFILE,...report},null,2)+"\n",{flag:"wx",mode:0o600});
}

module.exports={qualify,tokenResponse,site};
if(require.main===module)main().catch(()=>{process.stderr.write("Controle de renouvellement Hosting WIF refuse ; aucun detail de credential affiche.\n");process.exitCode=1;});
