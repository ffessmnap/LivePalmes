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
assert.equal(refresh.PILOT_NAMES.length, 9);
assert.equal(new Set(refresh.PILOT_NAMES).size, 9);
assert.deepEqual(refresh.selected({}), refresh.NAMES);
assert.deepEqual(refresh.selected({ NOTIFICATION_PILOT_IDF: 'true' }), refresh.PILOT_NAMES);
assert.throws(() => refresh.guard({ ...env, NOTIFICATION_PILOT_IDF: 'invalid' }));
assert.throws(() => refresh.narrow('const names = [];'));
const wrapper = 'environment.projectId !== "livepalmes-test"; environment.name !== "test"; const names = ["all"];';
const narrowed = refresh.narrow(wrapper);
const pilot = refresh.narrow(wrapper, { NOTIFICATION_PILOT_IDF: 'true' });
for (const name of refresh.PILOT_NAMES) assert.ok(pilot.includes('"' + name + '"'));
for (const name of ['submitEngagementAccessRequest', 'resolveEngagementAccessRequest', 'resolveEngagementSwimmerChangeRequest', 'resumePerformancePublicationJobs']) assert.ok(!pilot.includes('"' + name + '"'));
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
  const stable = await refresh.requireDisabled(db);
  assert.equal(stable.after.enabled, false);
  assert.equal(writes, 1, 'Pilot preparation does not write settings');
  value = { ...value, enabled: true };
  await assert.rejects(refresh.requireDisabled(db), /déjà coupés/);
  assert.equal(writes, 1, 'An unexpectedly active TEST is refused without changing it');
  console.log('TEST notification refresh guards, exact selection and no-catch-up disable: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
