"use strict";
const { createHash, randomUUID } = require("node:crypto");
const hash = value => createHash("sha256").update(value).digest("hex");
function options(input = {}, limit = 500) {
  const comment = String(input.resolutionNote ?? input.resolutionReason ?? "").trim();
  if (comment.length > limit) throw new TypeError(`Commentaire limité à ${limit} caractères.`);
  if (input.decision === "rejected" && !comment) throw new TypeError("Le commentaire du refus est obligatoire.");
  if (input.notifyRequester !== undefined && typeof input.notifyRequester !== "boolean") throw new TypeError("Choix de notification invalide.");
  return { comment, notifyRequester: input.notifyRequester !== false };
}
function kind(data) {
  return data.reportType === "duplicate" ? "duplicate_closure" : data.requestType === "person-change" ? "official_correction"
    : data.requestType === "swimmer-ns" ? "swimmer_ns" : "swimmer_correction";
}
function intent(data, id, type, decision, choice) {
  return { key: hash(JSON.stringify([type, id, data.requestedAt, decision])), kind: type,
    status: choice.notifyRequester ? "pending" : "opted_out", notifyRequester: choice.notifyRequester,
    occurrence: data.requestedAt || "", decision, comment: choice.comment };
}
function publicState(value = {}) {
  value ||= {};
  return Object.fromEntries(["key", "status", "kind", "notifyRequester", "attemptedAt", "sentAt", "reason", "templateId", "templateRevision", "catalogRevision"]
    .filter(key => value[key] !== undefined).map(key => [key, value[key]]));
}
async function commit(db, ref, expected, values) {
  return db.runTransaction(async tx => {
    const latest = await tx.get(ref), data = latest.data() || {};
    if (!latest.exists || data.requestedAt !== expected.requestedAt) throw new TypeError("La demande a changé. Rechargez-la.");
    if (data.status !== "pending") {
      if (data.status === values.status && data.resolutionNotification?.key === values.resolutionNotification?.key) return;
      throw new TypeError("Demande déjà traitée.");
    }
    tx.set(ref, values, { merge: true });
  }, { maxAttempts: 3 });
}
function content(data, state) {
  const approved = state.decision === "approved", decisionLabel = approved ? "validée" : "refusée";
  const name = [data.current?.lastName, data.current?.firstName].filter(Boolean).join(" ");
  const labels = { access: "d’accès", swimmer_correction: "de correction du nageur", official_correction: "de correction de l’officiel",
    swimmer_ns: "de retrait du statut NS", duplicate_closure: "de traitement du signalement de doublon", account_deletion: "de suppression du compte" };
  const target = state.kind === "account_deletion" ? data.targetEmail : name;
  let summary = `Votre demande ${labels[state.kind]}${target ? ` concernant ${target}` : ""} a été ${decisionLabel}.`;
  let details = approved ? "La décision a été enregistrée dans LivePalmes." : "La modification demandée n’a pas été appliquée.";
  if (state.kind === "duplicate_closure") {
    summary = `Votre signalement de doublon${name ? ` concernant ${name}` : ""} a été ${approved ? "clos" : "refusé"}.`;
    details = "Le traitement de ce signalement ne réalise aucune fusion ni correction de fiche.";
  } else if (state.kind === "swimmer_ns") details = approved ? "Le statut NS a été retiré du nageur." : "Le statut NS du nageur est conservé.";
  else if (state.kind === "account_deletion") details = approved ? "Le compte concerné a été supprimé." : "Le compte concerné a été conservé.";
  else if (state.kind === "access") details = approved ? "Votre accès au portail est actif. Le message de définition du mot de passe est indépendant de cette notification." : "Aucun accès n’a été créé par cette décision.";
  else if (approved) {
    const fields = [["lastName", "Nom"], ["firstName", "Prénom"], ["birthDate", "Date de naissance"], ["sex", "Sexe"], ["licenseNumber", "Numéro de licence"]];
    details = fields.filter(([key]) => String(data.current?.[key] || "") !== String(data.resolvedProposed?.[key] || ""))
      .map(([key, label]) => `${label} : ${data.resolvedProposed?.[key] || "non renseigné"}`).join("\n");
  }
  let original;
  if (state.kind === "access" && !approved) original = require("./portal-access-mail").engagementAccessRejection({ ...data, resolutionReason: state.comment });
  if (state.kind === "swimmer_correction") original = require("./engagement-swimmer-change-mail").engagementSwimmerChangeResolutionMail({
    ...data, swimmer: data.current, decision: state.decision, resolutionNote: state.comment });
  return { input: { kind: state.kind, decision: state.decision, subject: `Votre demande LivePalmes a été ${decisionLabel}`,
    greeting: "Bonjour,", summary, details, comment: state.comment }, original };
}
// Each transaction is bounded. No job, scheduler, account lookup or NAP access.
async function deliver(db, ref, services, retryKey = "", retry = true) {
  const templates = require("./mail-templates"), { requestMail } = require("./mail-template-rendering");
  const { livePalmesMailHtml } = require("./livepalmes-mail-html"), { failure } = require("./nap-mail-delivery");
  const token = randomUUID(), now = new Date().toISOString();
  const claim = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref), data = snapshot.data() || {}, state = data.resolutionNotification;
    if (!state?.key) throw new TypeError("Aucune notification préparée pour cette décision.");
    if (retryKey && retryKey !== state.key) throw new TypeError("La demande a changé. Rechargez-la.");
    if (state.occurrence !== (data.requestedAt || "") || state.decision !== data.status) throw new TypeError("La décision a changé.");
    const explicit = !!retryKey && retry;
    const expired = Date.parse(state.leaseUntil || "") <= Date.parse(now);
    if (state.status === "sending" && explicit && expired) {
      const uncertain = { ...state, status: "uncertain", reason: "Traitement interrompu ; livraison à vérifier sans renvoi automatique." };
      tx.set(ref, { resolutionNotification: uncertain }, { merge: true });
      return { skip: true, state: uncertain };
    }
    const recoverPreparation = state.status === "preparing" && explicit && expired;
    if (!recoverPreparation && (!["pending", "failed"].includes(state.status) || state.status === "failed" && !explicit)) return { skip: true, state };
    const next = { ...state, status: state.prepared ? "sending" : "preparing", token, attemptedAt: now,
      leaseUntil: new Date(Date.parse(now) + 5 * 60 * 1000).toISOString(), reason: "" };
    tx.set(ref, { resolutionNotification: next }, { merge: true });
    return { data, state: next };
  }, { maxAttempts: 3 });
  if (claim.skip) return publicState(claim.state);
  let state = claim.state, smtpStarted = false, smtpAccepted = false;
  async function save(next) {
    return db.runTransaction(async tx => {
      const data = (await tx.get(ref)).data() || {}, current = data.resolutionNotification;
      if (current?.key !== state.key || current.token !== token || data.requestedAt !== claim.data.requestedAt
        || data.status !== state.decision || current.decision !== data.status || !["preparing", "sending"].includes(current.status)) return false;
      tx.set(ref, { resolutionNotification: next }, { merge: true });
      return true;
    }, { maxAttempts: 3 });
  }
  try {
    if (!state.prepared) {
      const snapshot = templates.pick(await (services.readTemplates || templates.read)(db), [`request.${state.kind}.${state.decision}`]);
      const { input, original } = content(claim.data, state), mail = requestMail(snapshot, input, original);
      const to = String(state.kind === "access" ? claim.data.email : claim.data.requestedByEmail || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new TypeError("Adresse du demandeur absente ou invalide.");
      state = { ...state, templateId: mail.templateId, templateRevision: mail.templateRevision, catalogRevision: mail.catalogRevision,
        prepared: { snapshot, to, subject: mail.subject, text: mail.text }, status: "sending" };
      if (!await save(state)) return { status: "superseded" };
    }
    // Fail closed: TEST never invokes a transporter; PROD requires existing bindings.
    if (services.projectId !== "livepalmes") state = { ...state, status: "blocked_test", reason: "test-emails-disabled" };
    else {
      const config = services.smtpConfig();
      if (!config.ready) throw new TypeError("Configuration SMTP indisponible.");
      smtpStarted = true;
      await services.send({ from: `LivePalmes <${config.fromEmail}>`, to: state.prepared.to,
        subject: state.prepared.subject, text: state.prepared.text, html: livePalmesMailHtml(state.prepared.text) }, config);
      smtpAccepted = true;
      state = { ...state, status: "sent", sentAt: new Date().toISOString(), reason: "" };
    }
    if (!await save(state)) return { status: "superseded" };
  } catch (error) {
    const outcome = failure(error, { smtpStarted, smtpAccepted });
    state = { ...state, status: outcome.status, reason: smtpAccepted ? "Envoi accepté ; confirmation à vérifier." : smtpStarted ? "Envoi SMTP à vérifier." : "Préparation du mail indisponible." };
    await save(state).catch(() => {});
  }
  return publicState(state);
}
module.exports = { options, kind, intent, publicState, content, commit,
  deliver: async (...args) => {
    try { return await deliver(...args); }
    catch (error) {
      if (error instanceof TypeError) throw error;
      return { status: "failed", key: args[3] || "", reason: "Notification indisponible ; décision conservée." };
    }
  } };
