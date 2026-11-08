"use strict";
const { catalog, definition } = require("./mail-template-catalog");
const { livePalmesMailHtml } = require("./livepalmes-mail-html");
const { isDeepStrictEqual } = require("node:util");
const LIMITS = Object.freeze({ subject: 220, text: 5000, documentBytes: 240000, renderedText: 5000 });
const ref = db => db.collection("engagementConfigurations").doc("mailTemplates");
const empty = () => ({ schema: 1, revision: 0, templates: {} });
function tokens(value) { return [...String(value).matchAll(/\{\{([a-z][a-z0-9_.]*)\}\}/g)].map(match => match[1]); }
function validate(id, input) {
  const item = definition(id);
  if (!item.editable) throw new TypeError("Ce contenu est géré séparément.");
  if (!input || typeof input.subject !== "string" || typeof input.text !== "string") throw new TypeError("Objet et texte requis.");
  const subject = input.subject.trim(), text = input.text.replace(/\r\n?/g, "\n").trim();
  if (!subject || subject.length > LIMITS.subject || /[\r\n\x00-\x1f\x7f]/.test(subject)) throw new TypeError("Objet requis, sur une ligne, de 220 caractères maximum.");
  if (!text || text.length > LIMITS.text || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) throw new TypeError("Texte requis, de 5 000 caractères maximum.");
  for (const value of [subject, text]) {
    if (/[{}]/.test(value.replace(/\{\{[a-z][a-z0-9_.]*\}\}/g, ""))) throw new TypeError("Variable mal formée.");
    if (tokens(value).some(token => !item.variables.includes(token))) throw new TypeError("Variable non autorisée pour ce modèle.");
  }
  if (tokens(subject).some(token => /details|liste|message|commentaire|resume/.test(token))) throw new TypeError("Les blocs de texte ne sont pas utilisables dans l’objet.");
  for (const token of item.required) {
    if (tokens(text).filter(value => value === token).length !== 1) throw new TypeError(`Conservez une seule occurrence du bloc automatique {{${token}}} dans le texte.`);
  }
  for (const token of item.blocks) {
    if (!text.split("\n").some(line => line.trim() === `{{${token}}}`)) throw new TypeError(`Conservez le bloc automatique {{${token}}} sur une ligne distincte.`);
  }
  return { subject, text };
}
function state(data) {
  if (data === undefined || data === null) return empty();
  if (data.schema !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 0 || !data.templates || typeof data.templates !== "object" || Array.isArray(data.templates)) throw new TypeError("Configuration des modèles invalide.");
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > LIMITS.documentBytes) throw new TypeError("Catalogue de modèles trop volumineux.");
  for (const [id, value] of Object.entries(data.templates)) validate(id, value);
  if (data.edits !== undefined) {
    if (!data.edits || typeof data.edits !== "object" || Array.isArray(data.edits)) throw new TypeError("Historique des modèles invalide.");
    for (const [id, edit] of Object.entries(data.edits)) {
      definition(id);
      if (!Number.isSafeInteger(edit.revision) || edit.revision < 1 || edit.revision > data.revision || typeof edit.updatedAt !== "string" || typeof edit.updatedBy !== "string") throw new TypeError("Historique des modèles invalide.");
    }
  }
  return data;
}
async function read(db) {
  // A failed read must propagate. Only an absent document selects defaults.
  const snapshot = await ref(db).get();
  return state(snapshot.exists ? snapshot.data() : undefined);
}
function sameSnapshot(first, second) {
  return isDeepStrictEqual(state(first), state(second));
}
function view(snapshot) {
  const current = state(snapshot);
  return { revision: current.revision, models: catalog.map(item => ({ ...item, ...current.edits?.[item.id], ...current.templates[item.id],
    customized: Boolean(current.templates[item.id]), revision: current.edits?.[item.id]?.revision || current.templates[item.id]?.revision || 0 })) };
}
function render(id, snapshot, variables, fallback) {
  const item = definition(id), custom = state(snapshot).templates[id];
  if (!custom) return { ...fallback, templateId: id, templateRevision: 0, catalogRevision: snapshot?.revision || 0 };
  const source = validate(id, custom);
  function replace(value) {
    return value.replace(/\{\{([a-z][a-z0-9_.]*)\}\}/g, (_, token) => {
      if (!Object.hasOwn(variables, token) || variables[token] === undefined || variables[token] === null) throw new TypeError(`Variable automatique indisponible : ${token}.`);
      return String(variables[token]);
    });
  }
  const subject = replace(source.subject), text = replace(source.text);
  if (!subject || subject.length > LIMITS.subject || /[\r\n\x00-\x1f\x7f]/.test(subject) || !text.trim() || text.length > (id === "license_control_report" ? 750000 : LIMITS.renderedText)) throw new TypeError("Le modèle produit un mail vide ou trop long.");
  return { subject, text, html: livePalmesMailHtml(text), templateId: item.id, templateRevision: custom.revision || 0, catalogRevision: snapshot.revision };
}
async function update(db, input, actor, now = new Date().toISOString()) {
  if (!actor?.national || !actor.uid) throw new TypeError("Administration nationale requise.");
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new TypeError("Révision attendue requise.");
  const item = definition(input.id);
  if (!item.editable || !["save", "reset"].includes(input.operation)) throw new TypeError("Modification de modèle invalide.");
  const value = input.operation === "save" ? validate(item.id, input) : null;
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref(db)), current = state(snapshot.exists ? snapshot.data() : undefined);
    if (current.revision !== input.expectedRevision) throw new TypeError("Les modèles ont changé. Actualisez avant d’enregistrer.");
    const next = { ...current, revision: current.revision + 1, templates: { ...current.templates }, updatedAt: now, updatedBy: actor.uid };
    const edit = { revision: next.revision, updatedAt: now, updatedBy: actor.uid, updatedByEmail: String(actor.email || "").slice(0, 180) };
    next.edits = { ...current.edits, [item.id]: edit };
    if (value) next.templates[item.id] = { ...value, ...edit };
    else delete next.templates[item.id];
    state(next);
    transaction.set(ref(db), next);
    // Audit and configuration commit together; neither operation creates a job.
    transaction.create(db.collection("auditLogs").doc(), { action: "engagementNotifications.mailTemplateChanged", actorUid: actor.uid,
      target: { templateId: item.id, operation: input.operation, revision: next.revision }, createdAt: now });
    return view(next);
  });
}
function sample(id) {
  const item = definition(id), values = Object.fromEntries(item.variables.map(token => [token, "Exemple fictif"]));
  return { ...values, "competition.nom": "Compétition fictive", "competition.details": "Compétition : Compétition fictive\nDate : samedi 7 novembre 2026\nLieu : Piscine Exemple", "competition.echeance": "jeudi 5 novembre 2026 à 23h59",
    "club.nom": "Club Exemple", "club.libelle": "123 — Club Exemple", "portail.lien": "https://example.invalid/portail.html#club-competitions",
    "frais.details": "Total indicatif des frais d'engagement : 12,00 €.\nPaiement HelloAsso : https://example.invalid/paiement\nRappel : paiement attendu avant la fin de la premiere journee de competition. Surplus forfaitaire de 50 EUR ensuite.",
    "documents.annonce": "Un document a été ajouté ou mis à jour", "documents.liste": "- Programme fictif\n  https://example.invalid/programme.pdf", "fichier.nom": "engagements-fictifs.txt", "officiels.nombre": "3",
    "licences.bilan": "Compétiteurs concernés : 3\nLicences valides : 2\nLicences expirées : 1\n\nUne erreur technique ou un contrôle non effectué ne démontre pas l’absence d’une licence dans la base fédérale.\nCe bilan correspond aux engagés et aux résultats connus à la date de la revue. Un nouveau contrôle est nécessaire en cas de modification.",
    "salutation": "Bonjour Camille,", "decision.objet": `Votre demande LivePalmes a été ${id.endsWith("rejected") ? "refusée" : "traitée"}`,
    "decision.resume": id.includes("duplicate_closure") ? "Votre signalement de doublon a été clôturé. Cette clôture ne constitue pas une fusion de fiches." : "Votre demande a été examinée par un responsable national.",
    "decision.details": "Action effectuée : exemple fictif, sans modification de données.", "decision.commentaire": "Commentaire destiné au demandeur : exemple fictif.",
    "document.titre": "Document fictif", "document.description": "Présentation fictive du document.", "document.lien": "https://example.invalid/document.pdf", "bibliotheque.lien": "https://example.invalid/bibliotheque.html" };
}
function preview(input) {
  const value = validate(input.id, input);
  return render(input.id, { schema: 1, revision: 0, templates: { [input.id]: value } }, sample(input.id), {});
}
// Persist before page/PDF generation. A crash or a retry reuses the same snapshot.
async function freezeEvent(db, eventRef, event, lease) {
  if (event.mailTemplates) return state(event.mailTemplates);
  const templates = Number(event.preparedCount || 0) > 0 || event.cursor ? empty() : await read(db);
  return db.runTransaction(async transaction => {
    const fresh = await transaction.get(eventRef), value = fresh.data();
    if (!value || value.lease !== lease) throw new Error("Préparation remplacée pendant le choix du modèle.");
    if (value.mailTemplates) return state(value.mailTemplates);
    // Legacy partially prepared events keep their original code defaults.
    const frozen = Number(value.preparedCount || 0) > 0 || value.cursor ? empty() : templates;
    transaction.update(eventRef, { mailTemplates: frozen });
    return frozen;
  });
}
function manualRef(db, key) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new TypeError("Identifiant de préparation invalide.");
  // Reuse the existing technical event store. No runAt: no scheduler consumes
  // these explicit manual batches; no transport or mail job is created here.
  return db.collection("engagementClosureQueue").doc(`mail-template-${key}`);
}
function pick(snapshot, ids) {
  return { schema: 1, revision: snapshot.revision, templates: Object.fromEntries(Object.entries(snapshot.templates).filter(([id]) => ids.includes(id))) };
}
async function legacyDefault(db, snapshot, firstJobId) {
  if (firstJobId && Object.keys(snapshot.templates).length && (await db.collection("engagementMailJobs").doc(firstJobId).get()).exists) return empty();
  return snapshot;
}
async function readManual(db, key, ids, firstJobId) {
  const snapshot = await manualRef(db, key).get();
  if (snapshot.exists) return state(snapshot.data().mailTemplates);
  const current = await read(db);
  return legacyDefault(db, ids ? pick(current, ids) : current, firstJobId);
}
async function freezeManual(db, key, snapshot) {
  return db.runTransaction(async transaction => {
    const reference = manualRef(db, key), previous = await transaction.get(reference);
    if (previous.exists) {
      if (!sameSnapshot(previous.data().mailTemplates, snapshot)) throw new TypeError("La préparation utilise une autre version. Actualisez l’aperçu.");
      return;
    }
    transaction.create(reference, { source: "nap", kind: "mailTemplateSnapshot", status: "completed", mailTemplates: state(snapshot) });
  });
}
module.exports = { LIMITS, ref, empty, tokens, validate, state, read, view, render, update, sample, preview, freezeEvent, readManual, freezeManual, pick, legacyDefault, sameSnapshot };
