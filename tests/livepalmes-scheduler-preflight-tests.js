'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.join(__dirname,'..'),functionsRequire=createRequire(path.join(root,'functions/package.json'));
for(const name of ['firebase-admin/app','firebase-admin/firestore'])assert.ok(functionsRequire.resolve(name));
const workflow=fs.readFileSync(path.join(root,'.github/workflows/livepalmes-test-backend.yml'),'utf8');
const section=workflow.slice(workflow.indexOf('- name: Vérifier que les files des schedulers TEST sont vides'));
const code=section.match(/node - <<'NODE'\r?\n([\s\S]*?)\r?\n\s+NODE/)[1].replace(/^          /gm,'');
async function check(nativeOnly,closureEmpty,publicationEmpty){
  const calls=[];
  const db={collection:name=>{calls.push(name);return {limit:n=>{assert.equal(n,1);return {get:async()=>({empty:name==='engagementClosureQueue'?closureEmpty:publicationEmpty})};},where:(field,operator,statuses)=>{assert.equal(field,'status');assert.equal(operator,'in');assert.deepEqual(Array.from(statuses),['pending','processing']);return {limit:n=>{assert.equal(n,1);return {get:async()=>({empty:publicationEmpty})};}};}};}};
  const context={require:name=>name==='node:path'?path:name==='node:module'?{createRequire:file=>{assert.equal(file,path.resolve('functions/package.json'));return moduleName=>moduleName==='firebase-admin/app'?{initializeApp:options=>assert.equal(options.projectId,'livepalmes-test')}:moduleName==='firebase-admin/firestore'?{getFirestore:()=>db}:assert.fail('Unexpected module');}}:assert.fail('Unexpected require'),process:{env:{NAP_NOTIFICATION_SCHEDULER_ONLY:String(nativeOnly)}},console:{log:()=>{}},Promise};
  await vm.runInNewContext('(async()=>{'+code.replace('Promise.all([','await Promise.all([')+'})()',context);
  return calls;
}
(async()=>{
  assert.deepEqual(await check(true,true,false),['engagementClosureQueue']);
  await assert.rejects(check(true,false,true),/Files TEST non vides/);
  assert.deepEqual(await check(false,true,true),['engagementClosureQueue','performancePublicationJobs']);
  await assert.rejects(check(false,true,false),/Files TEST non vides/);
  console.log('Scheduler preflight: package exports resolve, TEST scope, bounded empty queues and native-only isolation verified without network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
