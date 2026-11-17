"use strict";
require('./helpers/offline-network');
const assert=require('node:assert/strict'),fs=require('node:fs'),yaml=require('./firestore-rules/node_modules/js-yaml');
const pinned=new Set(['actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1','actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1','google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093','google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db','actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02']);
for(const file of ['a3-cloud-metadata.yml','nap-capacity-readonly.yml']){
 const workflow=yaml.load(fs.readFileSync('.github/workflows/'+file,'utf8'));
 assert.deepEqual(Object.keys(workflow.on),['workflow_dispatch']);assert.deepEqual(Object.keys(workflow.on.workflow_dispatch.inputs),['expected_commit']);
 assert.deepEqual(workflow.permissions,{contents:'read',actions:'read'});assert.equal(workflow.concurrency['cancel-in-progress'],false);
 const job=workflow.jobs.observe;assert(job.if.includes("github.ref == 'refs/heads/main'"));assert(job.if.includes('github.run_attempt == 1'));assert(job.if.includes('inputs.expected_commit == github.sha'));assert.equal(job['timeout-minutes'],10);
 const steps=job.steps,verify=steps.findIndex(x=>x.run?.includes(' verify-ci ')),auth=steps.findIndex(x=>x.uses?.startsWith('google-github-actions/auth@'));
 assert(verify>=0&&auth>verify,'CI must precede credentials');assert(steps.filter(x=>x.uses).every(x=>pinned.has(x.uses)));
 const checkout=steps.find(x=>x.uses?.startsWith('actions/checkout@'));assert.equal(checkout.with['fetch-depth'],0);assert.equal(checkout.with['persist-credentials'],false);
 assert.equal(steps.find(x=>x.uses?.startsWith('actions/setup-node@')).with['node-version'],'22.23.5');
 const runs=steps.map(x=>x.run||'').join('\n');assert(!/firebase deploy|set-iam-policy|add-iam-policy-binding|--backup|--trial|tools\/nap-backup\.js/.test(runs));
 const artifact=steps.find(x=>x.uses?.startsWith('actions/upload-artifact@'));assert.equal(artifact.if,'always()');assert.equal(artifact.with['retention-days'],14);
 if(file==='a3-cloud-metadata.yml'){
  assert.deepEqual(job.strategy.matrix.include,[{project:'livepalmes-test',environment:'firebase-test',credential:'FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST_BACKEND'},{project:'livepalmes',environment:'production',credential:'FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_BACKEND'}]);
  assert.equal(job.environment,'${{ matrix.environment }}');assert.equal(steps[auth].with.credentials_json,'${{ secrets[matrix.credential] }}');
 }else{
  assert.equal(job.environment,'nap-backup');assert.equal(workflow.concurrency.group,'nap-database-backup');assert.equal(steps[auth].with.credentials_json,'${{ secrets.NAP_BACKUP_SERVICE_ACCOUNT_JSON }}');assert(!/ENCRYPTION_KEY|DRIVE_FOLDER/.test(JSON.stringify(workflow)));
 }
}
console.log('Metadata workflows: manual exact main/first attempt, immutable targets and readers, CI before credentials, pinned actions, read-only commands and shared SQL serialization passed.');
