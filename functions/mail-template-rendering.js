"use strict";
const templates = require("./mail-templates");
const format = require("./engagement-competition-mail-format");
function competitionMail(id, snapshot, competition, details, original, origin) {
  const documents = details.documents || [], entry = details.entry || {};
  return templates.render(id, snapshot, {
    "competition.nom": competition.name || "Compétition LivePalmes",
    "competition.details": format.competitionMailLines(competition).join("\n"),
    "competition.echeance": format.competitionMailDateTime(competition.entryDeadlineAt),
    "portail.lien": `${origin}/portail.html#club-competitions`,
    "club.nom": entry.clubName || entry.clubId || "votre club",
    // Preserve the existing financial policy verbatim, including its conditional
    // no-fees case. It is the penultimate paragraph of the established builder.
    "frais.details": id === "club_recap_pdf" ? original.text.split("\n\n").at(-2) : "",
    "documents.annonce": documents.length > 1 ? "Des documents ont été ajoutés ou mis à jour" : "Un document a été ajouté ou mis à jour",
    "documents.liste": documents.flatMap(document => [`- ${document.title || document.fileName || "Document"}`, `  ${document.url || ""}`]).join("\n"),
    "fichier.nom": details.document?.fileName || details.fileName || "export-engagements-livepalmes.txt",
    "officiels.nombre": String(Math.max(0, Math.trunc(Number(details.officialCount) || 0)))
  }, original);
}
function accessMail(id, snapshot, original) {
  const blocks = original.text.split("\n\n"), body = blocks[2] || "";
  const clubLabel = original.subject.replace(/^Nouvelle demande d’accès LivePalmes - /, "");
  const adminDetailsStart = blocks.findIndex(block => block.startsWith("Demandeur :"));
  const adminLink = blocks.find(block => block.includes("#gestion-demandes-acces")) || "";
  return templates.render(id, snapshot, {
    "salutation": blocks[0], "acces.reception": blocks[1], "acces.examen": body,
    "compte.objet": original.subject, "compte.message": original.text,
    "club.libelle": clubLabel,
    "region.nom": (blocks[1] || "").replace(/^.*pour la région /, "").replace(/\.$/, ""),
    "demande.details": blocks.slice(adminDetailsStart, blocks.indexOf(adminLink)).join("\n\n"),
    "demande.lien": adminLink.split("\n").at(-1)
  }, original);
}
// Stable lot-5 API. `summary`, `details` and `comment` are public decision
// content only; internal notes and arbitrary payload properties are never read.
function requestMail(snapshot, input, original) {
  if (!["approved", "rejected"].includes(input.decision)) throw new TypeError("Décision invalide.");
  // Existing builders remain compatible with their old payloads. Lot 5 must
  // validate the refusal comment in the decision handler even without email.
  if (!original && input.decision === "rejected" && !String(input.comment || "").trim()) throw new TypeError("Le commentaire du refus est obligatoire.");
  const id = `request.${input.kind}.${input.decision}`;
  if (!String(input.summary || "").trim() || !String(input.subject || original?.subject || "").trim()) throw new TypeError("Résumé et objet de décision requis.");
  const variables = { "salutation": input.greeting || "Bonjour,", "decision.objet": input.subject || original.subject,
    "decision.resume": input.summary, "decision.details": String(input.details || ""),
    "decision.commentaire": input.comment ? `Commentaire : ${String(input.comment).trim()}` : "" };
  // Defaults for consumers already present must remain strictly unchanged.
  const fallback = original || { subject: variables["decision.objet"], text: [variables.salutation, input.summary, input.details,
    variables["decision.commentaire"], "Sportivement,\nCommission Nationale Nage avec Palmes - FFESSM"].filter(Boolean).join("\n\n") };
  return templates.render(id, snapshot, variables, fallback);
}
module.exports = { competitionMail, accessMail, requestMail };
