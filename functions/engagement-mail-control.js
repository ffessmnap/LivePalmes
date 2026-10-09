"use strict";
// One shared technical setting. Sporting data remains exclusively in NAP.
const COLLECTION = 'engagementConfigurations', DOCUMENT = 'notificationDelivery';
const TEST_ADDRESS = 'livepalmes@nap-ffessm.fr';
function ref(db) { return db.collection(COLLECTION).doc(DOCUMENT); }
function state(data = {}) {
  return { enabled: data.enabled === true, revision: Number(data.revision || 0),
    enabledSince: String(data.enabledSince || ''), discardThrough: String(data.discardThrough || ''),
    updatedAt: String(data.updatedAt || '') };
}
async function read(db) { return state((await ref(db).get()).data()); }
async function update(db, input, actor, now = new Date().toISOString()) {
  if (actor?.national !== true || !actor.uid) throw new TypeError('Administration nationale requise.');
  if (typeof input?.enabled !== 'boolean' || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
    throw new TypeError('Choix et version du réglage requis.');
  return db.runTransaction(async transaction => {
    const current = state((await transaction.get(ref(db))).data());
    if (current.revision !== input.expectedRevision) throw new TypeError('Le réglage a changé. Rechargez avant de modifier.');
    if (current.enabled === input.enabled) return current;
    const next = { ...current, enabled: input.enabled, revision: current.revision + 1,
      enabledSince: input.enabled ? now : current.enabledSince,
      discardThrough: input.enabled ? current.discardThrough : now,
      updatedAt: now, updatedBy: actor.uid };
    transaction.set(ref(db), next);
    return state(next);
  });
}
function decision(setting, item, projectId) {
  if (!setting.enabled) return { allowed: false, reason: 'automatic-mails-disabled' };
  const due = String(item.notificationDueAt || item.createdAt || '');
  if (!due || due <= setting.discardThrough || (setting.enabledSince && due < setting.enabledSince))
    return { allowed: false, reason: 'automatic-mail-discarded' };
  const to = projectId === 'livepalmes-test' ? TEST_ADDRESS : String(item.toEmail || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new TypeError('Destinataire de notification invalide.');
  return { allowed: true, to, test: projectId === 'livepalmes-test' };
}
module.exports = { COLLECTION, DOCUMENT, TEST_ADDRESS, ref, state, read, update, decision };
