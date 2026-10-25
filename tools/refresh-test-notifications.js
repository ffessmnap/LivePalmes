"use strict";
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const control = require('../functions/engagement-mail-control');
const NAMES = Object.freeze(['closeDueEngagementCompetitions', 'disableCompetitionEmailNotifications',
  'processNapCompetitionNotifications', 'updateCurrentEmailNotificationPreferences']);
const PILOT_NAMES = Object.freeze(['getEngagementAutomaticMailControl', 'updateEngagementAutomaticMailControl',
  'notifyEngagementCompetitionDocuments', 'listEngagementCompetitionMailJobs',
  'prepareEngagementOpeningNotificationEmails', 'prepareEngagementClubRecapEmails',
  'sendEngagementPreparedEmails', 'processNapCompetitionNotifications', 'closeDueEngagementCompetitions']);
const BCC_NAMES = Object.freeze(['notifyEngagementCompetitionDocuments','listEngagementCompetitionMailJobs',
  'processNapCompetitionNotifications','closeDueEngagementCompetitions','processNapNotificationTask',
  'updateEngagementCalendarEvent','updateEngagementCompetition']);
function selected(env) {
  if (!['true', 'false', undefined].includes(env.NOTIFICATION_PILOT_IDF)) throw new Error('Périmètre pilote TEST invalide.');
  if (!['true', 'false', undefined].includes(env.NOTIFICATION_BCC_TASKS)) throw new Error('Périmètre CCI TEST invalide.');
  if(env.NOTIFICATION_BCC_TASKS==='true'){
    if(env.NOTIFICATION_PILOT_IDF==='true')throw new Error('Sélections TEST incompatibles.');
    return BCC_NAMES;
  }
  return env.NOTIFICATION_PILOT_IDF === 'true' ? PILOT_NAMES : NAMES;
}
function guard(env) {
  for (const key of ['TARGET_FIREBASE_PROJECT', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'])
    if (env[key] !== 'livepalmes-test') throw new Error('Cible TEST obligatoire.');
  if (env.NOTIFICATION_FINAL_CHECK !== 'true' || env.GITHUB_REF !== 'refs/heads/main'
      || !/^[a-f0-9]{40}$/.test(env.CANDIDATE_SHA || '')) throw new Error('Périmètre TEST non confirmé.');
  selected(env);
}
function narrow(source, env = {}) {
  if (!source.includes('environment.projectId !== "livepalmes-test"')
      || !source.includes('environment.name !== "test"')) throw new Error('Protection TEST absente.');
  const pattern = /const names = \[[\s\S]*?\];/g;
  if ((source.match(pattern) || []).length !== 1) throw new Error('Sélection inattendue.');
  return source.replace(pattern, 'const names = ' + JSON.stringify(selected(env)) + ';');
}
async function disable(db, actor) {
  const before = await control.read(db);
  const after = await control.update(db, { enabled: false, expectedRevision: before.revision },
    { national: true, uid: actor });
  if (after.enabled) throw new Error('Mails TEST encore actifs.');
  return { project: 'livepalmes-test', before, after, mailsSent: 0 };
}
async function requireDisabled(db) {
  const before = await control.read(db);
  if (before.enabled) throw new Error('Pilote TEST : mails déjà coupés requis, aucun réglage modifié automatiquement.');
  return { project: 'livepalmes-test', before, after: before, mailsSent: 0 };
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
    const wrapper = narrow(fs.readFileSync(file, 'utf8'), process.env);
    if (!selector || !receipt) throw new Error('Sorties requises.');
    let result;
    if (process.env.NOTIFICATION_PILOT_IDF === 'true' || process.env.NOTIFICATION_BCC_TASKS === 'true') {
      result = await requireDisabled(db);
    } else result = await disable(db, credentials.client_email);
    fs.writeFileSync(receipt, JSON.stringify({ ...result, candidate: process.env.CANDIDATE_SHA }, null, 2));
    fs.writeFileSync(file, wrapper);
    fs.writeFileSync(selector, selected(process.env).join(',') + '\n');
  } else {
    const current = await control.read(db);
    if (current.enabled) throw new Error('Mails TEST réactivés pendant le contrôle.');
    if (process.env.NOTIFICATION_PILOT_IDF === 'true' || process.env.NOTIFICATION_BCC_TASKS === 'true') {
      if (!selector || JSON.stringify(current) !== JSON.stringify(JSON.parse(fs.readFileSync(selector, 'utf8')).after))
        throw new Error('Le réglage TEST a changé pendant la publication du pilote.');
    }
  }
  console.log(`Mails TEST désactivés ; sélection limitée à ${selected(process.env).length} traitements autorisés.`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { NAMES, PILOT_NAMES, BCC_NAMES, selected, guard, narrow, disable, requireDisabled };
