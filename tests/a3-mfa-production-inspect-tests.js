'use strict';
require('./helpers/offline-network');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),yaml=require('./firestore-rules/node_modules/js-yaml'),p=require('../tools/a3-mfa-production-inspect');
const env={GITHUB_REPOSITORY:'ffessmnap/LivePalmes',GITHUB_REPOSITORY_ID:'1240638222',GITHUB_REPOSITORY_OWNER_ID:'284726282',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_WORKFLOW_REF:p.WORKFLOW,VERIFIED_MAIN_CI:'true',GITHUB_SHA:'a'.repeat(40),EXPECTED_COMMIT:'a'.repeat(40),GITHUB_RUN_ID:'123'};
assert.equal(p.context(env).project,'livepalmes');
for(const key of Object.keys(env)){let reads=0;const bad={...env,[key]:'bad'};Object.defineProperty(bad,'GOOGLE_APPLICATION_CREDENTIALS',{get(){reads++;throw Error('credential read');}});assert.throws(()=>p.credentialRecord(bad));assert.equal(reads,0);}
assert(p.allowed(p.GET,'GET'));assert(p.allowed(p.IAM,'POST',{permissions:p.PERMISSIONS}));
for(const [url,method,body] of [[p.GET,'PATCH',{}],[p.GET,'POST',{}],[p.GET.replace('livepalmes','livepalmes-test'),'GET'],['https://identitytoolkit.googleapis.com/v1/accounts:lookup','POST',{}],[p.IAM,'POST',{permissions:['resourcemanager.projects.setIamPolicy']}],['https://storage.googleapis.com/','GET']])assert(!p.allowed(url,method,body));
for(const value of [{name:'projects/livepalmes-test/config',subtype:'IDENTITY_PLATFORM'},{name:'projects/livepalmes/config',subtype:'FIREBASE_AUTH'},{name:'projects/livepalmes/config',subtype:'IDENTITY_PLATFORM',users:[]}])assert.throws(()=>p.configuration(value));
async function simulation(permissions=p.PERMISSIONS,mfa={}){const calls=[];const result=await p.exercise(async(url,method,body)=>{assert(p.allowed(url,method,body));calls.push({url,method});return url===p.IAM?{permissions}:{name:'projects/livepalmes/config',subtype:'IDENTITY_PLATFORM',mfa};});return {result,calls};}
async function main(){
 const ok=await simulation();assert.equal(ok.result.state,'inspected');assert(ok.result.canEnable);assert.equal(ok.calls.length,2);assert.equal(ok.result.configurationWrites,0);assert.equal(ok.result.usersRead,0);assert.equal(ok.result.usersWritten,0);assert.equal(ok.result.emailsSent,0);assert(!ok.result.credentialsExported&&!ok.result.tokensExported);
 const blocked=await simulation([]);assert.equal(blocked.result.state,'blocked');assert.equal(blocked.calls.length,1);assert(!blocked.result.canEnable);
 assert.equal((await simulation([p.PERMISSIONS[0]])).result.canEnable,false);
 const different=await simulation(p.PERMISSIONS,{state:'ENABLED',enabledProviders:['PHONE_SMS']});assert.equal(different.result.compatibleConfiguration,false);assert.equal(different.result.canEnable,false);assert.equal(different.result.configurationWrites,0);
 let tokens=0;await assert.rejects(p.reader({getAccessToken(){tokens++;throw Error('credential used');}},p.GET,'PATCH',{}));assert.equal(tokens,0);
 const root=path.resolve(__dirname,'..'),name='a3-mfa-production-inspect.yml',source=fs.readFileSync(path.join(root,'.github/workflows',name),'utf8'),workflow=yaml.load(source),job=workflow.jobs.inspect;
 assert.deepEqual(require('../tools/github-credential-scope').inspect(name,source).problems,[]);assert.equal(job.environment,'production');assert.equal(workflow.permissions['id-token'],undefined);assert.deepEqual(Object.keys(workflow.on),['workflow_dispatch']);assert.equal(workflow.concurrency['cancel-in-progress'],false);
 assert.equal(job.if,"github.ref == 'refs/heads/main' && github.run_attempt == 1 && inputs.expected_commit == github.sha");
 const index=job.steps.findIndex(step=>step.uses?.startsWith('google-github-actions/auth@'));assert(index>2);assert(job.steps[index-2].run.includes('.context('));assert.equal(job.steps[index].with.credentials_json,'${{ secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES }}');
 for(const step of job.steps.filter(step=>step.uses))assert.match(step.uses,/@[a-f0-9]{40}$/);
 console.log('PROD MFA inspection: fixed project/identity/context, only configuration+permissions reads, no user/write endpoint, missing permissions and incompatible configuration reported.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
