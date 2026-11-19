"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const m=require('../tools/a3-production-wif-consumers');
const site={name:'projects/livepalmes/sites/livepalmes',defaultUrl:'https://livepalmes.web.app'};
const functions=Array.from({length:119},(_,i)=>({name:'projects/livepalmes/locations/europe-west1/functions/fixture'+i,state:'ACTIVE'}));
function fake(kind='hosting',change={}){
 let time=1800000000000,mono=0,c9=0,c10=0,cli=0,reads=0;
 const sdk=kind==='hosting'?site:{functions};
 return {kind,wall:()=>time,monotonic:()=>mono,sleep:async ms=>{time+=ms+(change.drift?6000:0);mono+=ms;},
  readCli:async()=>{cli++;return kind==='hosting'?site:functions.map(f=>({id:f.name.split('/').at(-1),region:'europe-west1',platform:'gcfv2'}));},
  readSdk:async()=>{reads++;return change.metadata&&reads===2?{...site,defaultUrl:'https://foreign.invalid'}:sdk;},
  credential9:{getAccessToken:async()=>({token:'fixture9-'+(change.stale?1:++c9),res:{data:{expireTime:new Date(time+600000).toISOString()}}})},
  credential10:{getAccessToken:async()=>({access_token:'fixture10-'+(++c10),expires_in:600})},counts:()=>({cli,reads})};
}
async function main(){
 const profile=m.versions();for(const key of Object.keys(m.EXPECTED).filter(k=>k!=='nodeVersion'))assert.equal(profile[key],m.EXPECTED[key]);
 for(const kind of ['hosting','backend']){
  const f=fake(kind),r=await m.qualify(f);assert.deepEqual(f.counts(),{cli:2,reads:2});assert.equal(r.sdkCredentialsRenewed,2);
  assert.equal(r.waitedMilliseconds,610000);assert.equal(r.renewedAfterRealExpiry,true);assert.equal(r.publicationInvocations,0);
  assert.equal(r.tokensExported,false);assert.equal(r.longSinglePublicationCommandQualified,false);assert.equal(r.initialCliTokenExpiryObserved,false);
 }
 for(const changes of [{stale:true},{drift:true},{metadata:true}])await assert.rejects(m.qualify(fake('hosting',changes)));
 for(const value of [{functions:functions.slice(1)},{functions,nextPageToken:'fixture'},{functions:functions.slice(1).concat(functions[1])},
  {functions:[{...functions[0],state:'FAILED'},...functions.slice(1)]}])assert.throws(()=>m.metadata(value,'backend'));
 assert.throws(()=>m.cliMetadata([], 'backend'));assert.throws(()=>m.metadata({...site,defaultUrl:'https://foreign.invalid'},'hosting'));
 assert.throws(()=>m.token9({token:'fixture',res:{data:{expireTime:new Date(1000000).toISOString()}}},0));
 assert.throws(()=>m.token10({access_token:'fixture',expires_in:3600},0));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lp-wif-consumer-fixture-'));
 try{
  const file=path.join(temp,'adc.json'),provider=m.PROVIDER;
  const value={type:'external_account',project_id:'livepalmes',client_email:m.ACCOUNTS.hosting,audience:'//iam.googleapis.com/'+provider,
   subject_token_type:'urn:ietf:params:oauth:token-type:jwt',token_url:'https://sts.googleapis.com/v1/token',
   service_account_impersonation_url:'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+m.ACCOUNTS.hosting+':generateAccessToken',
   service_account_impersonation:{token_lifetime_seconds:600},credential_source:{url:'https://pipelines.actions.githubusercontent.com/fixture?audience='+encodeURIComponent('https://iam.googleapis.com/'+provider),
    headers:{Authorization:'Bearer FIXTURE-TOKEN'},format:{type:'json',subject_token_field_name:'value'}}};
  fs.writeFileSync(file,JSON.stringify(value));const original=fs.readFileSync(file);assert.deepEqual(m.adc(file,'hosting'),original);assert.deepEqual(fs.readFileSync(file),original);
  for(const change of [{type:'service_account'},{project_id:'foreign'},{client_email:m.ACCOUNTS.backend},{private_key:'FIXTURE-NOT-KEY'},{audience:'//iam.googleapis.com/foreign'}]){
   fs.writeFileSync(file,JSON.stringify({...value,...change}));assert.throws(()=>m.adc(file,'hosting'));
  }
 }finally{const checked=path.resolve(temp);assert.equal(path.dirname(checked),path.resolve(os.tmpdir()));assert(path.basename(checked).startsWith("lp-wif-consumer-fixture-"));assert(!fs.lstatSync(checked).isSymbolicLink());fs.rmSync(checked,{recursive:true,force:true});}
 console.log('WIF consumers: pinned libraries, both metadata readers, two real-expiry SDK paths on fake clocks, stale/drift/foreign ADC refused; no cloud calls.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
