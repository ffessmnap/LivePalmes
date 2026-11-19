"use strict";

const { randomUUID } = require("node:crypto");
const automation = require("./nap-notification-automation");
const control = require("./engagement-mail-control");
const fees = require("./organizer-fee-report");
const TYPE = "organizer_fees_pdf";

async function jobs(event, competition, entries, setting, attachment, PDFDocument) {
  if (!competition.organizerEmail || !control.audienceAllowed(setting, { type: TYPE, source: "nap", competitionRegionId: competition.regionId })) return [];
  const { report, recipients, digest } = fees.summary(competition, entries);
  if (!recipients.length || (event.kind === TYPE && digest !== event.reportDigest)) return [];
  const file = await attachment(await fees.pdf(PDFDocument, report, event.createdAt), "application/pdf");
  return [{
    type: TYPE, competitionId: competition.id, competitionName: competition.name, competitionRegionId: competition.regionId || "",
    deliveryMode: "bcc-v1", clubId: "", recipientUid: "", toEmail: "", reportDigest: digest,
    recipients: recipients.map(email => ({ uid: "", email, clubId: "", recipientRegionId: "" })),
    subject: "Frais d’engagement par club — " + String(competition.name || "Compétition").replace(/[\r\n]/g, " "),
    textBody: ["Bonjour,", "Vous trouverez en pièce jointe le récapitulatif des frais d’engagement de " + report.name + ".",
      "Total général : " + fees.money(report.total) + ".", "Nage avec Palmes FFESSM"].join("\n\n"),
    attachments: [file]
  }];
}

async function manual(input, actor, services) {
  const id = String(require("./nap-calendar-values").positiveId(input.competitionId));
  const { competition, entries } = await services.entries(actor, id);
  const { recipients, report, digest } = fees.summary(competition, entries);
  if (input.action === "preview-organizer-fees") {
    const file = await fees.pdf(services.PDFDocument, report);
    return { fileName: file.fileName, pdfBase64: file.buffer.toString("base64"), recipients, total: fees.money(report.total), digest, requestId: randomUUID() };
  }
  services.authorizeSend(actor, competition);
  if (!recipients.length) throw new TypeError("Renseignez le contact organisateur avant l’envoi.");
  if (digest !== input.digest || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.requestId || "")) {
    throw new TypeError("Le récapitulatif ou le destinataire a changé. Préparez un nouvel aperçu.");
  }
  if (services.projectId === "livepalmes-test") return { simulated: true };
  if (services.projectId !== "livepalmes") throw new TypeError("Projet de notification inconnu.");
  const now = new Date().toISOString();
  const setting = await control.read(services.db);
  if (!control.eventDecision(setting, { createdAt: now }).allowed || !control.audienceAllowed(setting, { source: "nap", type: TYPE, competitionRegionId: competition.regionId })) {
    throw new TypeError("Le réglage national des courriels ne permet pas cet envoi.");
  }
  const operation = automation.hash([TYPE, id, actor.uid, input.requestId, digest]);
  const ref = automation.eventRef(services.db, id, operation, TYPE);
  await services.db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, { source: "nap", competitionId: id, operation, kind: TYPE, phase: TYPE, reportDigest: digest,
      actorUid: actor.uid, deliveryMode: "bcc-v1", cycleKey: "", automatic: false, jobIds: [], status: "pending",
      cursor: "", runAt: now, createdAt: now, updatedAt: now });
  });
  await services.enqueue(ref.id);
  return { queued: true };
}
module.exports = { TYPE, jobs, manual };
