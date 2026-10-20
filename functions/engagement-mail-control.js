"use strict";
// One shared technical setting. Sporting data remains exclusively in NAP.
const COLLECTION = 'engagementConfigurations', DOCUMENT = 'notificationDelivery';
const TEST_ADDRESS = 'livepalmes@nap-ffessm.fr';
const SCOPES = Object.freeze(['all', 'idf']);
const IDF_REGION = 'Ile de France';
function scope(value) { return value === undefined ? 'all' : SCOPES.includes(value) ? value : 'invalid'; }
function ref(db) { return db.collection(COLLECTION).doc(DOCUMENT); }
function state(data = {}) {
  return { enabled: data.enabled === true, scope: scope(data.scope), revision: Number(data.revision || 0),
    enabledSince: String(data.enabledSince || ''), discardThrough: String(data.discardThrough || ''),
    updatedAt: String(data.updatedAt || '') };
}
async function read(db) { return state((await ref(db).get()).data()); }
async function update(db, input, actor, now = new Date().toISOString()) {
  if (actor?.national !== true || !actor.uid) throw new TypeError('Administration nationale requise.');
  if (typeof input?.enabled !== 'boolean' || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
    throw new TypeError('Choix et version du réglage requis.');
  if (input.scope !== undefined && !SCOPES.includes(input.scope)) throw new TypeError('Périmètre des mails invalide.');
  return db.runTransaction(async transaction => {
    const current = state((await transaction.get(ref(db))).data());
    if (current.revision !== input.expectedRevision) throw new TypeError('Le réglage a changé. Rechargez avant de modifier.');
    const nextScope = input.scope === undefined ? current.scope : input.scope;
    if (input.enabled && !SCOPES.includes(nextScope)) throw new TypeError('Choisissez un périmètre avant activation.');
    if (current.enabled === input.enabled && current.scope === nextScope) return current;
    const scopeChanged = current.scope !== nextScope;
    const next = { ...current, enabled: input.enabled, scope: nextScope, revision: current.revision + 1,
      enabledSince: input.enabled ? now : current.enabledSince,
      discardThrough: !input.enabled || scopeChanged ? now : current.discardThrough,
      updatedAt: now, updatedBy: actor.uid };
    transaction.set(ref(db), next);
    return state(next);
  });
}
// Events do not yet have recipients. Apply only the activation/time gate here.
function eventDecision(setting, item) {
  if (!setting.enabled) return { allowed: false, reason: 'automatic-mails-disabled' };
  if (!SCOPES.includes(scope(setting.scope))) return { allowed: false, reason: 'automatic-mail-scope-invalid' };
  const due = String(item.notificationDueAt || item.createdAt || '');
  if (!due || due <= setting.discardThrough || (setting.enabledSince && due < setting.enabledSince))
    return { allowed: false, reason: 'automatic-mail-discarded' };
  return { allowed: true };
}
function audienceAllowed(setting, item) {
  const selected = scope(setting.scope);
  if (selected === 'all') return true;
  if (selected !== 'idf' || item.source !== 'nap') return false;
  if (['entries_txt', 'officials_pdf'].includes(item.type)) return item.competitionRegionId === IDF_REGION;
  return ['opening_notification', 'competition_documents', 'club_recap_pdf'].includes(item.type) &&
    /^[1-9]\d{0,15}$/.test(String(item.clubId || '')) && item.recipientRegionId === IDF_REGION;
}
function clubAllowed(setting, recipient) {
  return audienceAllowed(setting, { source: 'nap', type: 'club_recap_pdf',
    clubId: recipient.clubId, recipientRegionId: recipient.napClubRegionId });
}
function decision(setting, item, projectId) {
  const gate = eventDecision(setting, item);
  if (!gate.allowed) return gate;
  if (!audienceAllowed(setting, item)) return { allowed: false, reason: 'automatic-mail-outside-pilot' };
  const to = projectId === 'livepalmes-test' ? TEST_ADDRESS : String(item.toEmail || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new TypeError('Destinataire de notification invalide.');
  return { allowed: true, to, test: projectId === 'livepalmes-test' };
}
module.exports = { COLLECTION, DOCUMENT, TEST_ADDRESS, SCOPES, IDF_REGION, ref, state, read, update, eventDecision, audienceAllowed, clubAllowed, decision };
