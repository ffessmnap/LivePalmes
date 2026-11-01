// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementCompetitionDocumentMailSubject(backendContext) {
  function engagementCompetitionDocumentMailSubject(competition = {}, documents = []) {
    return `Documents disponibles - ${competition.name || "Compétition LivePalmes"}`;
  }

  function engagementCompetitionDocumentMailText(competition = {}, documents = []) {
    return [
      "Bonjour,",
      "",
      `${documents.length > 1 ? "Des documents ont été ajoutés ou mis à jour" : "Un document a été ajouté ou mis à jour"} pour la compétition suivante :`,
      "",
      ...backendContext.competitionMailLines(competition),
      "",
      ...documents.flatMap((document) => [
        `- ${document.title || document.fileName || "Document"}`,
        `  ${document.url || ""}`
      ]),
      "",
      "Consultez les documents depuis la fiche de la compétition dans le portail LivePalmes :",
      "",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions`,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementTxtMailSubject(competition = {}) {
    return `Export WinPalme engagements - ${competition.name || "Competition LivePalmes"}`;
  }

  function engagementTxtMailText(competition = {}, txt = {}) {
    return [
      "Bonjour,",
      "",
      `Vous trouverez en pièce jointe l’export WinPalme des engagements pour ${competition.name || "la competition"}.`,
      ...backendContext.competitionMailLines(competition),
      `Fichier : ${txt.document?.fileName || txt.fileName || "export-engagements-livepalmes.txt"}.`,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementOfficialsMailSubject(competition = {}) {
    return `Liste des officiels - ${competition.name || "Compétition LivePalmes"}`;
  }

  function engagementOfficialsMailText(competition = {}, pdf = {}) {
    return [
      "Bonjour,",
      "",
      `Vous trouverez en pièce jointe la liste consolidée des officiels inscrits pour ${competition.name || "la compétition"}.`,
      ...backendContext.competitionMailLines(competition),
      `Nombre d'officiels déclarés : ${Math.max(0, Math.trunc(Number(pdf.officialCount) || 0))}.`,
      "Le tableau est classé par club, puis par nom et prénom.",
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  return { engagementCompetitionDocumentMailSubject, engagementCompetitionDocumentMailText, engagementTxtMailSubject, engagementTxtMailText, engagementOfficialsMailSubject, engagementOfficialsMailText };
}

module.exports = { createMailService_engagementCompetitionDocumentMailSubject };
