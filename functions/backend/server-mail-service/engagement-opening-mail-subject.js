// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementOpeningMailSubject(backendContext) {
  function engagementOpeningMailSubject(competition = {}) {
    return `Ouverture des engagements - ${competition.name || "Compétition LivePalmes"}`;
  }

  function engagementOpeningMailText(competition = {}) {
    return [
      "Bonjour,",
      "",
      "Les engagements sont désormais ouverts pour la compétition suivante :",
      "",
      ...backendContext.competitionMailLines(competition),
      "",
      "Pour saisir et suivre les engagements de votre club, connectez-vous au portail LivePalmes :",
      "",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions`,
      "",
      `Merci de finaliser et de vérifier les engagements de votre club au plus tard le ${backendContext.competitionMailDateTime(competition.entryDeadlineAt)}.`,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  return { engagementOpeningMailSubject, engagementOpeningMailText };
}

module.exports = { createMailService_engagementOpeningMailSubject };
