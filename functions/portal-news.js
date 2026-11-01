"use strict";

const INITIAL_ENTRY = {
  id: "release-20261030-1939",
  publishedAt: "2026-10-30T19:39:00+01:00",
  lines: [
    "Les administrateurs régionaux peuvent créer les accès des clubs de leur région.",
    "Le statut NS (« non sélectionnable — nageur étranger ») est accessible dans l’identité du nageur. Son retrait reste soumis à une décision nationale.",
    "En eau libre, les courses se sélectionnent par distance et spécialité. Les passages peuvent être ajoutés ou retirés du programme."
  ]
};
const MAX_ENTRIES = 200;
const MAX_BYTES = 512 * 1024;

// One existing configuration document, no client access and no writes on reads.
// The shipped entry is a seed only while this document does not exist.
async function managePortalNews({ db, HttpsError, ADMIN_UIDS }, request) {
  const fail = (code, message) => { throw new HttpsError(code, message); };
  const uid = request.auth?.uid;
  if (!uid) fail("unauthenticated", "Connexion requise.");
  let national = ADMIN_UIDS.has(uid), regional = false;
  if (!national) {
    const profile = await db.collection("users").doc(uid).get();
    const data = profile.exists ? profile.data() : {};
    if (data.status !== "active") fail("permission-denied", "Accès LivePalmes désactivé.");
    national = data.capabilities?.["engagements.national.manage"] === true || data.capabilities?.["admin.full"] === true;
    regional = data.capabilities?.["engagements.region.manage"] === true;
  }
  const input = request.data || {};
  if (!national && !regional) fail("permission-denied", "Consultation réservée aux administrateurs nationaux et régionaux.");
  if (!["list", "save", "delete"].includes(input.action)) fail("invalid-argument", "Action inconnue.");
  if (input.action !== "list" && !national) fail("permission-denied", "Modification réservée à l’administration nationale.");
  const ref = db.collection("engagementConfigurations").doc("portalNews");
  const read = snapshot => snapshot.exists ? snapshot.data() : { revision: 0, entries: [INITIAL_ENTRY] };
  const result = data => ({ revision: data.revision, entries: [...data.entries].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || (b.createdRevision || 0) - (a.createdRevision || 0) || a.id.localeCompare(b.id)) });
  if (input.action === "list") return result(read(await ref.get()));
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) fail("invalid-argument", "Rechargez les nouveautés avant de les modifier.");
  const id = input.id || require("node:crypto").randomUUID();
  if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) fail("invalid-argument", "Nouveauté invalide.");
  let entry;
  if (input.action === "save") {
    if (typeof input.text !== "string" || input.text.length > 8000) fail("invalid-argument", "Le texte doit contenir au plus 8 000 caractères.");
    const lines = input.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length || lines.length > 80) fail("invalid-argument", "Saisissez entre 1 et 80 lignes de modifications.");
    if (typeof input.publishedAt !== "string" || !Number.isFinite(Date.parse(input.publishedAt))) fail("invalid-argument", "Date et heure invalides.");
    entry = { id, lines, publishedAt: new Date(input.publishedAt).toISOString() };
  } else if (!input.id) fail("invalid-argument", "Nouveauté à supprimer manquante.");
  return db.runTransaction(async transaction => {
    const before = read(await transaction.get(ref));
    if (before.revision !== input.expectedRevision) fail("aborted", "Les nouveautés ont changé. Actualisez la page avant de recommencer ; votre texte est conservé.");
    if (input.id && !before.entries.some(item => item.id === id)) fail("not-found", "Cette nouveauté n’existe plus. Actualisez la page.");
    const existing = before.entries.find(item => item.id === id);
    const entries = before.entries.filter(item => item.id !== id);
    if (entry) entries.push({ ...entry, createdRevision: existing ? existing.createdRevision || 0 : before.revision + 1, updatedAt: new Date().toISOString(), updatedBy: uid });
    if (entries.length > MAX_ENTRIES) fail("resource-exhausted", "La page contient déjà 200 nouveautés. Supprimez une ancienne publication avant d’en ajouter une.");
    const data = { revision: before.revision + 1, entries, updatedBy: uid, updatedAt: new Date().toISOString() };
    if (Buffer.byteLength(JSON.stringify(data), "utf8") > MAX_BYTES) fail("resource-exhausted", "La page est pleine. Réduisez les textes ou supprimez une ancienne publication.");
    transaction.set(ref, data);
    return result(data);
  }, { maxAttempts: 5 });
}

module.exports = { managePortalNews, INITIAL_ENTRY, MAX_ENTRIES, MAX_BYTES };
