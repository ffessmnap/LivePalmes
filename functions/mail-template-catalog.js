"use strict";

// Stable identifiers shared with request-resolution notifications. No transport,
// recipient lookup or database access belongs in this catalogue.
const signature = "Sportivement,\nNage avec Palmes FFESSM";
const accessSignature = "Sportivement,\nCommission Nationale Nage avec Palmes - FFESSM";
const definitions = [];
function add(id, label, subject, text, variables, required = [], options = {}) {
  const blocks = required.filter(token => /\.(?:details|liste|message|resume|commentaire|reception|examen|bilan|lien)$/.test(token));
  definitions.push({ id, label, subject, text, variables, required, blocks, editable: true, ...options });
}
const competition = ["competition.nom", "competition.details", "competition.echeance", "portail.lien"];
add("opening_notification", "Ouverture des engagements", "Ouverture des engagements - {{competition.nom}}",
  `Bonjour,\n\nLes engagements sont désormais ouverts pour la compétition suivante :\n\n{{competition.details}}\n\nPour saisir et suivre les engagements de votre club, connectez-vous au portail LivePalmes :\n\n{{portail.lien}}\n\nMerci de finaliser et de vérifier les engagements de votre club au plus tard le {{competition.echeance}}.\n\n${signature}`,
  competition, ["competition.details", "competition.echeance", "portail.lien"]);
add("club_recap_pdf", "Clôture — récapitulatif du club", "Fermeture des engagements - Récapitulatif {{club.nom}} - {{competition.nom}}",
  `Bonjour,\n\nLes engagements sont désormais fermés pour la compétition suivante :\n\n{{competition.details}}\n\nVous trouverez en pièce jointe le récapitulatif des engagements de {{club.nom}}.\nMerci de vérifier les informations figurant dans ce document. Si vous constatez une anomalie, contactez l’organisateur de la compétition.\n\nVous pouvez également consulter votre dossier dans le portail LivePalmes :\n{{portail.lien}}\n\n{{frais.details}}\n\n${signature}`,
  [...competition, "club.nom", "frais.details"], ["competition.details", "club.nom", "portail.lien", "frais.details"]);
add("competition_documents", "Documents de compétition", "Documents disponibles - {{competition.nom}}",
  `Bonjour,\n\n{{documents.annonce}} pour la compétition suivante :\n\n{{competition.details}}\n\n{{documents.liste}}\n\nConsultez les documents depuis la fiche de la compétition dans le portail LivePalmes :\n\n{{portail.lien}}\n\n${signature}`,
  [...competition, "documents.annonce", "documents.liste"], ["competition.details", "documents.liste", "portail.lien"]);
add("entries_txt", "Clôture — export WinPalme", "Export WinPalme engagements - {{competition.nom}}",
  `Bonjour,\n\nVous trouverez en pièce jointe l’export WinPalme des engagements pour {{competition.nom}}.\n{{competition.details}}\nFichier : {{fichier.nom}}.\n\n${signature}`,
  [...competition, "fichier.nom"], ["competition.details", "fichier.nom"]);
add("officials_pdf", "Clôture — liste des officiels", "Liste des officiels - {{competition.nom}}",
  `Bonjour,\n\nVous trouverez en pièce jointe la liste consolidée des officiels inscrits pour {{competition.nom}}.\n{{competition.details}}\nNombre d'officiels déclarés : {{officiels.nombre}}.\nLe tableau est classé par club, puis par nom et prénom.\n\n${signature}`,
  [...competition, "officiels.nombre"], ["competition.details", "officiels.nombre"]);
add("national_library_document", "Document de la bibliothèque nationale", "LivePalmes — {{document.titre}}",
  "Un document est disponible dans la bibliothèque LivePalmes.\n\n{{document.titre}}\n{{document.description}}\n{{document.lien}}\n\n{{bibliotheque.lien}}",
  ["document.titre", "document.description", "document.lien", "bibliotheque.lien"], ["document.titre", "document.lien", "bibliotheque.lien"]);
add("access_acknowledgement", "Demande d’accès — accusé de réception", "Votre demande d’accès LivePalmes a bien été reçue",
  `{{salutation}}\n\n{{acces.reception}}\n\n{{acces.examen}}\n\nSi vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.\n\n${accessSignature}`,
  ["salutation", "acces.reception", "acces.examen"], ["acces.reception", "acces.examen"]);
add("access_existing_account", "Demande d’accès — compte existant", "{{compte.objet}}",
  "{{compte.message}}", ["compte.objet", "compte.message"], ["compte.message"], { note: "Le bloc de compte et les consignes de sécurité sont générés automatiquement." });
add("access_admin_notification", "Demande d’accès — alerte aux responsables", "Nouvelle demande d’accès LivePalmes - {{club.libelle}}",
  `{{salutation}}\n\nUne nouvelle demande d’accès au portail LivePalmes doit être examinée pour la région {{region.nom}}.\n\n{{demande.details}}\n\nVous pouvez consulter et traiter cette demande depuis le portail LivePalmes :\n{{demande.lien}}\n\n${accessSignature}`,
  ["salutation", "club.libelle", "region.nom", "demande.details", "demande.lien"], ["demande.details", "demande.lien"]);

// A resolution consumer supplies the truthful outcome, never the editor. In
// particular duplicate closure is not described as a merge or a deletion.
const requestKinds = {
  access: "Demande d’accès", swimmer_correction: "Correction d’un nageur", official_correction: "Correction d’un officiel",
  swimmer_reactivation: "Réactivation d’un nageur", official_reactivation: "Réactivation d’un officiel",
  swimmer_ns: "Retrait du statut NS d’un nageur",
  duplicate_closure: "Clôture d’un signalement de doublon", account_deletion: "Suppression d’un compte",
  swimmer_deletion: "Suppression d’un nageur", competition_deletion: "Suppression d’une compétition"
};
for (const [kind, label] of Object.entries(requestKinds)) {
  for (const decision of ["approved", "rejected"]) {
    add(`request.${kind}.${decision}`, `${label} — ${decision === "approved" ? "validation" : "refus"}`,
      "{{decision.objet}}", `{{salutation}}\n\n{{decision.resume}}\n\n{{decision.details}}\n\n{{decision.commentaire}}\n\n${accessSignature}`,
      ["salutation", "decision.objet", "decision.resume", "decision.details", "decision.commentaire"],
      ["decision.resume", "decision.details", "decision.commentaire"],
      { pendingConsumer: true, note: "La décision, ses détails et le commentaire destiné au demandeur sont insérés automatiquement. Le commentaire ne contient aucune note interne." });
  }
}
add("license_control_report", "Bilan du contrôle des licences", "LivePalmes — Contrôle des licences — {{competition.nom}}",
  "Bonjour,\n\n{{licences.bilan}}\n\nPortail LivePalmes", ["competition.nom", "licences.bilan"], ["licences.bilan"],
  { note: "Objet et accompagnement personnalisables. Le bloc du bilan conserve les compteurs, réserves et avertissements calculés." });
add("firebase_auth", "Sécurité — mot de passe et vérification d’adresse", "", "", [], [],
  { editable: false, note: "Les messages de mot de passe et de vérification d’adresse sont gérés séparément des notifications du Portail." });

const catalog = Object.freeze(definitions.map(item => Object.freeze(item)));
function definition(id) {
  const value = catalog.find(item => item.id === id);
  if (!value) throw new TypeError("Type de modèle inconnu.");
  return value;
}
module.exports = { catalog, definition };
