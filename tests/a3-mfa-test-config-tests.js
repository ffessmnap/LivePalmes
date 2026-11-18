'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const p=require('../tools/a3-mfa-test-config'),yaml=require('./firestore-rules/node_modules/js-yaml');
const env={GITHUB_REPOSITORY:'ffessmnap/LivePalmes',GITHUB_REPOSITORY_ID:'1240638222',GITHUB_REPOSITORY_OWNER_ID:'284726282',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_WORKFLOW_REF:p.WORKFLOW,VERIFIED_MAIN_CI:'true',GITHUB_SHA:'a'.repeat(40),EXPECTED_COMMIT:'a'.repeat(40),GITHUB_RUN_ID:'123',EXPECTED_MFA_SHA256:''};
assert.equal(p.context(env,'inspect').project,'livepalmes-test');
for(const name of Object.keys(env)){let reads=0;const bad={...env,[name]:'invalid'};Object.defineProperty(bad,'GOOGLE_APPLICATION_CREDENTIALS',{get(){reads++;throw Error('credential read');}});assert.throws(()=>p.credentialRecord(bad,'inspect'));assert.equal(reads,0,name);}
const baseline=p.mfa({}),config=mfa=>({name:'projects/livepalmes-test/config',subtype:'IDENTITY_PLATFORM',mfa});
for(const value of [{...config({}),subtype:'FIREBASE_AUTH'},{...config({}),name:'projects/livepalmes/config'},{...config({}),users:[]}])assert.throws(()=>p.configuration(value));
for(const value of [{enabledProviders:['UNKNOWN']},{providerConfigs:[{state:'ENABLED',totpProviderConfig:{adjacentIntervals:11}}]},{unknown:1}])assert.throws(()=>p.mfa(value));
assert.throws(()=>p.next({...baseline,state:'ENABLED'}));assert.throws(()=>p.next({...baseline,enabledProviders:['PHONE_SMS']}));
assert(p.allowed(p.GET,'GET'));assert(p.allowed(p.IAM,'POST',{permissions:p.PERMISSIONS}));assert(p.allowed(p.PATCH,'PATCH',{mfa:{providerConfigs:[p.DESIRED]}}));
for(const [url,method,body] of [[p.GET.replace('livepalmes-test','livepalmes'),'GET'],[p.GET,'POST'],[p.PATCH,'PATCH',{mfa:{state:'ENABLED',providerConfigs:[p.DESIRED]}}],[p.PATCH.replace('mfa.providerConfigs','mfa'),'PATCH',{mfa:{providerConfigs:[p.DESIRED]}}],['https://identitytoolkit.googleapis.com/v1/accounts:lookup','POST',{}]])assert(!p.allowed(url,method,body));
async function simulation({operation='inspect',permissions=p.PERMISSIONS,expectedHash=p.hash(baseline),initial=baseline,drift=false,throwPatch=false}={}){
 let current=structuredClone(initial);const events=[];
 const result=await p.exercise({operation,expectedHash,backup:async()=>events.push('backup'),read:async(url,method='GET',body)=>{assert(p.allowed(url,method,body));events.push(method);if(url===p.IAM)return {permissions};if(url===p.GET)return config(drift&&events.includes('PATCH')?baseline:current);if(throwPatch)throw Error('ambiguous patch');current=p.next(current);return config(current);}});
 return {result,events};
}
async function main(){
 const inspect=await simulation();assert.equal(inspect.result.configurationWrites,0);assert.deepEqual(inspect.events,['POST','GET']);assert(inspect.result.canEnable);
 const blocked=await simulation({permissions:[]});assert.equal(blocked.result.state,'blocked');assert.deepEqual(blocked.events,['POST']);
 assert.equal((await simulation({permissions:[p.PERMISSIONS[0]]})).result.canEnable,false);
 const applied=await simulation({operation:'enable-totp'});assert.deepEqual(applied.events,['POST','GET','backup','PATCH','GET']);assert.equal(applied.result.configurationWrites,1);assert.deepEqual(applied.result.after,p.next(baseline));
 const ready=p.next(baseline),idempotent=await simulation({operation:'enable-totp',initial:ready,expectedHash:p.hash(ready)});assert.equal(idempotent.result.configurationWrites,0);assert(!idempotent.events.includes('PATCH'));
 for(const change of [{expectedHash:'0'.repeat(64)},{permissions:[p.PERMISSIONS[0]]},{drift:true},{throwPatch:true}])await assert.rejects(simulation({operation:'enable-totp',...change}));
 const root=path.resolve(__dirname,'..'),name='a3-mfa-test-config.yml',source=fs.readFileSync(path.join(root,'.github/workflows',name),'utf8'),workflow=yaml.load(source),job=workflow.jobs.configure;
 assert.equal(job.environment,'firebase-test');assert.equal(workflow.permissions['id-token'],undefined);assert.deepEqual(Object.keys(workflow.on),['workflow_dispatch']);assert.equal(workflow.concurrency['cancel-in-progress'],false);
 assert.deepEqual(require('../tools/github-credential-scope').inspect(name,source).problems,[]);
 const authIndex=job.steps.findIndex(step=>step.uses?.startsWith('google-github-actions/auth@'));assert(authIndex>2);assert(job.steps[authIndex-2].run.includes('.context('));
 for(const step of job.steps.filter(step=>step.uses))assert.match(step.uses,/@[a-f0-9]{40}$/);
 assert.equal(job.steps[authIndex].with.credentials_json,'${{ secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST }}');
 console.log('TOTP TEST configuration: exact context before credentials, missing permissions, narrow mask, backup-before-write, drift refusal and idempotence.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
