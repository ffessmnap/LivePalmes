"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const refresh = require('../tools/refresh-test-notifications');
const env = { TARGET_FIREBASE_PROJECT: 'livepalmes-test', GCLOUD_PROJECT: 'livepalmes-test',
  GOOGLE_CLOUD_PROJECT: 'livepalmes-test', NOTIFICATION_FINAL_CHECK: 'true',
  GITHUB_REF: 'refs/heads/main', CANDIDATE_SHA: 'a'.repeat(40) };
refresh.guard(env);
for (const key of Object.keys(env)) assert.throws(() => refresh.guard({ ...env, [key]: 'invalid' }));
assert.equal(refresh.NAMES.length, 4);
assert.throws(() => refresh.narrow('const names = [];'));
const wrapper = 'environment.projectId !== "livepalmes-test"; environment.name !== "test"; const names = ["all"];';
const narrowed = refresh.narrow(wrapper);
assert.ok(!narrowed.includes('"all"'));
assert.ok(narrowed.includes('closeDueEngagementCompetitions'));
assert.throws(() => refresh.narrow(wrapper + 'const names = [];'));
const workflow = fs.readFileSync(require('node:path').join(__dirname, '../.github/workflows/livepalmes-test-backend.yml'), 'utf8');
assert.ok(workflow.indexOf('refresh-test-notifications.js prepare') < workflow.indexOf('- name: Déployer uniquement'));
assert.ok(workflow.indexOf('refresh-test-notifications.js verify') > workflow.indexOf('- name: Déployer uniquement'));
(async () => {
  let value = { enabled: true, revision: 3, enabledSince: '2026-10-01' }, writes = 0;
  const ref = { get: async () => ({ data: () => value }) };
  const db = { collection: () => ({ doc: () => ref }), runTransaction: async callback => callback({
    get: ref.get, set: (_ref, next) => { value = next; writes++; }
  }) };
  const result = await refresh.disable(db, 'test-deployer');
  assert.equal(result.before.enabled, true);
  assert.equal(result.after.enabled, false);
  assert.equal(result.after.revision, 4);
  assert.ok(result.after.discardThrough);
  await refresh.disable(db, 'test-deployer');
  assert.equal(writes, 1);
  console.log('TEST notification refresh guards, exact selection and no-catch-up disable: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
