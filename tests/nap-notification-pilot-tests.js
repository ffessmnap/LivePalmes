'use strict';
const assert = require('node:assert/strict');
const fs = require("./helpers/source-files");
const vm = require('node:vm');
const control = require('../functions/engagement-mail-control');
const { page } = require('../functions/nap-notification-pages');
const { nativeClubScopes, preview } = require('../functions/nap-notification-preview');
const source = fs.readFileSync(require.resolve('../functions/index.js'), 'utf8');
async function main() {
  const setting = { enabled: true, scope: 'idf', enabledSince: '2026-10-20T10:00:00.000Z' };
  const job = { source: 'nap', type: 'opening_notification', clubId: '12', recipientRegionId: control.IDF_REGION,
    competitionRegionId: 'Normandie', createdAt: '2026-10-20T10:01:00.000Z', toEmail: 'idf@example.org' };
  assert.equal(control.eventDecision(setting, job).allowed, true, 'An event has no email before recipient selection');
  for (const project of ['livepalmes', 'livepalmes-test']) {
    assert.equal(control.decision(setting, job, project).allowed, true);
    for (const patch of [{ recipientRegionId: 'Normandie', competitionRegionId: control.IDF_REGION },
      { recipientRegionId: '' }, { source: 'legacy' }, { type: 'other' }, { clubId: '' }])
      assert.equal(control.decision(setting, { ...job, ...patch }, project).allowed, false);
    for (const type of ['entries_txt', 'officials_pdf']) {
      assert.equal(control.decision(setting, { ...job, type }, project).allowed, false);
      assert.equal(control.decision(setting, { ...job, type, clubId: 'jury', recipientRegionId: '', competitionRegionId: control.IDF_REGION }, project).allowed, true);
    }
    assert.equal(control.decision({ ...setting, scope: 'invalid' }, job, project).allowed, false);
  }
  let current = { ...setting, revision: 4 }, writes = 0;
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ data: () => current }) }) }),
    runTransaction: callback => callback({ get: async () => ({ data: () => current }), set: (_ref, value) => { current = value; writes++; } }) };
  await assert.rejects(control.update(db, { enabled: true, scope: 'idf', expectedRevision: 4 }, { uid: 'regional', national: false }), /nationale/);
  await assert.rejects(control.update(db, { enabled: true, scope: 'free-text', expectedRevision: 4 }, { uid: 'national', national: true }), /invalide/);
  const updated = await control.update(db, { enabled: true, scope: 'all', expectedRevision: 4 }, { uid: 'national', national: true }, '2026-10-20T11:00:00.000Z');
  assert.equal(updated.enabledSince, '2026-10-20T11:00:00.000Z');
  assert.equal(updated.discardThrough, updated.enabledSince);
  assert.equal(control.decision(updated, job, 'livepalmes').allowed, false, 'Scope expansion does not catch up old jobs');
  await assert.rejects(control.update(db, { enabled: false, scope: 'idf', expectedRevision: 4 }, { uid: 'national', national: true }), /changé/);
  assert.equal(writes, 1);
  const caps = ['engagements.club.manage'];
  const recipients = await nativeClubScopes({ execute: async () => { throw Error('unexpected driver'); },
    query: async () => { throw Error('unexpected driver'); } }, []);
  assert.deepEqual(recipients, []);
  let queries = 0;
  const native = await nativeClubScopes({ execute: async (query, ids) => {
    queries++; assert.match(query.sql, /FORCE INDEX \(PRIMARY\)/); assert.match(query.sql, /LIMIT 1001/);
    assert.deepEqual(ids, ['12', '13']);
    return [[{ num_club: 12, comite_club: 3 }, { num_club: 13, comite_club: 15 }]];
  } }, [{ clubId: '12', regionId: 'Normandie', capabilities: caps }, { clubId: '13', regionId: control.IDF_REGION, capabilities: caps }]);
  assert.equal(queries, 1); assert.equal(native[0].napClubRegionId, control.IDF_REGION); assert.equal(native[1].napClubRegionId, 'Normandie');
  const people = [
    { clubId: '12', email: 'idf@example.org', regionId: 'Normandie', napClubRegionId: control.IDF_REGION, capabilities: caps },
    { clubId: '13', email: 'normandie@example.org', regionId: control.IDF_REGION, napClubRegionId: 'Normandie', capabilities: caps },
    { clubId: '14', email: 'unknown@example.org', regionId: control.IDF_REGION, capabilities: caps },
    { email: 'national@example.org', regionId: control.IDF_REGION, capabilities: ['engagements.national.manage'] }
  ];
  let pdf = 0, txt = 0, officials = 0;
  const competition = { id: '5220', source: 'nap', napSource: true, napFingerprint: 'stable', regionId: control.IDF_REGION,
    competitionType: 'pool', computerEmail: 'computer@example.org', officialsRequired: true, officialsManagerEmail: 'jury@example.org', clubDocuments: [{ id: 'doc' }] };
  const entries = ['12', '13', '14'].map(clubId => ({ clubId, teamLeaderComplete: true, swimmers: [{}] }));
  const file = () => ({ buffer: Buffer.from('synthetic'), fileName: 'synthetic.pdf' });
  const services = { simulation: true, mailSetting: async () => setting, recipients: async () => people, select: (_kind, list) => list,
    clubRecipients: list => list, entries: async () => ({ source: 'nap', entries, clubsById: new Map() }), hasParticipants: () => true,
    clubPdf: async () => { pdf++; return file(); }, txt: async () => { txt++; return file(); }, officialsPdf: async () => { officials++; return file(); },
    mail: (kind, _competition, recipient, details) => ({ kind, email: recipient.email, ...details }) };
  for (const kind of ['opening', 'documents']) {
    const result = await page({ kind, cursor: '', documentIds: ['doc'] }, competition, services);
    assert.deepEqual(result.jobs.map(item => item.email), ['idf@example.org']);
  }
  const recap = await page({ kind: 'closure', phase: 'clubs', cursor: '' }, competition, services);
  assert.equal(recap.jobs.length, 1); assert.equal(pdf, 1, 'No PDF built for non-pilot clubs');
  const exports = await page({ kind: 'closure', phase: 'exports', cursor: '' }, competition, services);
  assert.equal(exports.jobs.length, 2); assert.equal(txt, 1); assert.equal(officials, 1);
  const outside = await page({ kind: 'closure', phase: 'exports', cursor: '' }, { ...competition, regionId: 'Normandie' }, services);
  assert.equal(outside.jobs.length, 0); assert.equal(txt, 1); assert.equal(officials, 1);
  const simulation = await preview({ kind: 'opening', competitionId: '5220' }, { ...services, competition: async () => competition });
  assert.equal(simulation.recipientCount, 1); assert.equal(simulation.sentCount, 0);
  // Real adapter wiring: event gate must work in PROD without an email, and
  // authoritative native regions must survive until the final SMTP gate.
  let reads = 0;
  const sandbox = { ENVIRONMENT: { sportingDataSource: 'nap', projectId: 'livepalmes' }, process: { env: {} },
    FieldValue: { delete: () => null }, db: { collection: () => ({ doc: () => ({ get: async () => { reads++; return { data: () => setting }; } }) }) },
    engagementClubEntryHasParticipants: () => true, buildEngagementClubRecapPdf: () => {},
    normalizeEmail: value => value, engagementOpeningMailSubject: () => 'Opening', engagementOpeningMailText: () => 'Text',
    require: name => name === './engagement-mail-control' ? control : name === './nap-portal-swimmers' ? { portalPool: () => ({}) } : require('../functions/' + name.slice(2)) };
  const start = source.indexOf('function nativeNotificationAutomationServices('), end = source.indexOf('function nativeNotificationTaskServices(', start);
  vm.runInNewContext(source.slice(start, end), sandbox);
  const wired = sandbox.nativeNotificationAutomationServices(false);
  assert.equal(await wired.allowEvent({ createdAt: job.createdAt, automatic: false }), true);
  await wired.mailSetting(); assert.equal(reads, 1, 'One shared setting read per processing page');
  const payload = wired.mail('opening', competition, people[0], {});
  assert.equal(payload.recipientRegionId, control.IDF_REGION); assert.equal(payload.competitionRegionId, control.IDF_REGION);
  assert.equal(control.decision(setting, { ...payload, source: 'nap', createdAt: job.createdAt }, 'livepalmes').allowed, true);
  // Exercise the actual UI handlers without a browser, backend or real writes.
  const portal = fs.readFileSync(require.resolve('../assets/livepalmes-admin-portal.js'), 'utf8');
  const uiStart = portal.indexOf('  let nationalAutomaticMailControl ='), uiEnd = portal.indexOf('  function updateEngagementDetailEditState()', uiStart);
  const nodes = Object.fromEntries(['', 'Status', 'Toggle'].map(suffix => ['adminNationalMailControl' + suffix, {
    disabled: true, value: 'idf', setAttribute: () => {} }]));
  let national = true, uiSetting = { enabled: false, scope: 'all', revision: 1 }, changes = [];
  let confirmation = false;
  const ui = { Date, global: {confirm: () => confirmation}, document: { getElementById: id => nodes[id] }, canDeleteEngagementCompetitionDirectly: () => national,
    callFunction: async (name, input) => {
      if (name === 'updateEngagementAutomaticMailControl') { changes.push(input); uiSetting = { ...input, revision: uiSetting.revision + 1 }; }
      return uiSetting;
    } };
  vm.runInNewContext(portal.slice(uiStart, uiEnd), ui);
  await ui.loadNationalAutomaticMailControl(true);
  assert.equal(nodes.adminNationalMailControlToggle.disabled, false);
  await nodes.adminNationalMailControlToggle.onclick();
  assert.equal(changes.length, 0, 'Cancelling confirmation never changes delivery');
  confirmation = true;
  await nodes.adminNationalMailControlToggle.onclick();
  assert.equal(changes.length, 1);
  assert.equal(changes[0].scope, 'all', 'Toggling preserves the server scope');
  assert.equal(changes[0].expectedRevision, 1);
  uiSetting = { enabled: false, scope: 'idf', revision: 3 };
  await ui.loadNationalAutomaticMailControl(true);
  assert.equal(nodes.adminNationalMailControlToggle.disabled, true, 'A legacy pilot must not be silently broadened or activated');
  uiSetting = { enabled: true, scope: 'invalid', revision: 3 };
  await ui.loadNationalAutomaticMailControl(true);
  assert.equal(nodes.adminNationalMailControlToggle.disabled, false, 'Emergency off remains available');
  uiSetting = { enabled: false, revision: 4 };
  await ui.loadNationalAutomaticMailControl(true);
  assert.equal(nodes.adminNationalMailControlToggle.disabled, true, 'Old backend without scope cannot activate from new UI');
  console.log('Pilote IDF : clubs/organisateurs distincts, regions natives, refus par defaut, apercus, PDFs bornes, activation et absence de rattrapage verifies hors reseau.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
