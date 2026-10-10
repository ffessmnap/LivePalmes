"use strict";
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const control = require('../functions/engagement-mail-control');
const NAMES = Object.freeze(['closeDueEngagementCompetitions', 'disableCompetitionEmailNotifications',
  'processNapCompetitionNotifications', 'updateCurrentEmailNotificationPreferences']);
function guard(env) {
  for (const key of ['TARGET_FIREBASE_PROJECT', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'])
    if (env[key] !== 'livepalmes-test') throw new Error('Cible TEST obligatoire.');
  if (env.NOTIFICATION_FINAL_CHECK !== 'true' || env.GITHUB_REF !== 'refs/heads/main'
      || !/^[a-f0-9]{40}$/.test(env.CANDIDATE_SHA || '')) throw new Error('Périmètre TEST non confirmé.');
}
function narrow(source) {
  if (!source.includes('environment.projectId !== "livepalmes-test"')
      || !source.includes('environment.name !== "test"')) throw new Error('Protection TEST absente.');
  const pattern = /const names = \[[\s\S]*?\];/g;
  if ((source.match(pattern) || []).length !== 1) throw new Error('Sélection inattendue.');
  return source.replace(pattern, 'const names = ' + JSON.stringify(NAMES) + ';');
}
async function disable(db, actor) {
  const before = await control.read(db);
  const after = await control.update(db, { enabled: false, expectedRevision: before.revision },
    { national: true, uid: actor });
  if (after.enabled) throw new Error('Mails TEST encore actifs.');
  return { project: 'livepalmes-test', before, after, mailsSent: 0 };
}
async function main() {
  guard(process.env);
  const [mode, selector, receipt] = process.argv.slice(2);
  if (!['prepare', 'verify'].includes(mode)) throw new Error('Mode interdit.');
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  if (credentials.project_id !== 'livepalmes-test') throw new Error('Compte TEST requis.');
  const functionsRequire = createRequire(path.resolve('functions/package.json'));
  functionsRequire('firebase-admin/app').initializeApp({ projectId: 'livepalmes-test' });
  const db = functionsRequire('firebase-admin/firestore').getFirestore();
  if (mode === 'prepare') {
    const file = '.firebase-test-functions/functions/index.js';
    const wrapper = narrow(fs.readFileSync(file, 'utf8'));
    if (!selector || !receipt) throw new Error('Sorties requises.');
    const result = await disable(db, credentials.client_email);
    fs.writeFileSync(receipt, JSON.stringify({ ...result, candidate: process.env.CANDIDATE_SHA }, null, 2));
    fs.writeFileSync(file, wrapper);
    fs.writeFileSync(selector, NAMES.join(',') + '\n');
  } else if ((await control.read(db)).enabled) throw new Error('Mails TEST réactivés pendant le contrôle.');
  console.log('Mails TEST désactivés ; sélection limitée aux quatre traitements autorisés.');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { NAMES, guard, narrow, disable };
