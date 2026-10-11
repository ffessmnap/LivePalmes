"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),refresh=require("../tools/refresh-test-access-requests");
const env={TARGET_FIREBASE_PROJECT:"livepalmes-test",GCLOUD_PROJECT:"livepalmes-test",GOOGLE_CLOUD_PROJECT:"livepalmes-test",ACCESS_REQUESTS_ONLY:"true",NOTIFICATION_FINAL_CHECK:"false",NAP_NOTIFICATION_SCHEDULER_ONLY:"false",GITHUB_REF:"refs/heads/main",CANDIDATE_SHA:"a".repeat(40)};
refresh.guard(env);for(const key of Object.keys(env))assert.throws(()=>refresh.guard({...env,[key]:"invalid"}));
assert.deepEqual(refresh.NAMES,["submitEngagementAccessRequest","resolveEngagementAccessRequest"]);
const wrapper='environment.projectId !== "livepalmes-test"; environment.name !== "test"; const names = ["all"];';
assert.ok(!refresh.narrow(wrapper).includes('"all"'));assert.throws(()=>refresh.narrow(wrapper+'const names = [];'));assert.throws(()=>refresh.narrow('const names = [];'));
const runtime={state:"ACTIVE",labels:{"livepalmes-commit":env.CANDIDATE_SHA},serviceConfig:{secretEnvironmentVariables:refresh.SECRETS.map(key=>({key,secret:key,projectId:"206080168534",version:"1"}))}};
refresh.verifyRuntime(runtime,env.CANDIDATE_SHA);
for(const bad of [{...runtime,state:"FAILED"},{...runtime,labels:{}},{...runtime,serviceConfig:{secretEnvironmentVariables:runtime.serviceConfig.secretEnvironmentVariables.slice(1)}},{...runtime,serviceConfig:{secretEnvironmentVariables:runtime.serviceConfig.secretEnvironmentVariables.map(s=>({...s,projectId:"livepalmes"}))}}])assert.throws(()=>refresh.verifyRuntime(bad,env.CANDIDATE_SHA));
const workflow=fs.readFileSync(path.join(__dirname,"../.github/workflows/livepalmes-test-backend.yml"),"utf8");
assert.equal((workflow.match(/      access_requests_only:/g)||[]).length,2);
assert.ok(workflow.indexOf("refresh-test-access-requests.js prepare")<workflow.indexOf("- name: Déployer uniquement"));assert.ok(workflow.indexOf("refresh-test-access-requests.js verify")>workflow.indexOf("- name: Déployer uniquement"));
(async()=>{
 const db=enabled=>({collection:()=>({doc:()=>({get:async()=>({data:()=>({enabled})})})}),runTransaction:()=>{throw Error("No settings writes permitted");}});
 await refresh.verifyDisabled(db(false));await assert.rejects(refresh.verifyDisabled(db(true)),/Mails TEST actifs/);
 console.log("Two-function TEST access-request circuit: strict scope, preserved mail settings, runtime/secret checks and no settings writes OK");
})().catch(error=>{console.error(error);process.exitCode=1;});
