// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementClubRecapMailSubject(backendContext) {
  function engagementClubRecapMailSubject(competition = {}, entry = {}) {
    return `Fermeture des engagements - Récapitulatif ${entry.clubName || entry.clubId || "Club"} - ${competition.name || "LivePalmes"}`;
  }

  function engagementClubRecapMailText(competition = {}, entry = {}) {
    const fees = competition.fees || {};
    const feeLines = fees.enabled === false
      ? ["Aucun frais d'engagement n'est demandé pour cette compétition."]
      : [
        `Total indicatif des frais d'engagement : ${backendContext.engagementPdfMoney(backendContext.engagementPdfFeeTotal(entry, competition))}.`,
        fees.helloAssoUrl
          ? `Paiement HelloAsso : ${fees.helloAssoUrl}`
          : "Lien HelloAsso en attente de publication.",
        "Rappel : paiement attendu avant la fin de la premiere journee de competition. Surplus forfaitaire de 50 EUR ensuite."
      ];
    return [
      `Bonjour,`,
      "",
      "Les engagements sont désormais fermés pour la compétition suivante :",
      "",
      ...backendContext.competitionMailLines(competition),
      "",
      `Vous trouverez en pièce jointe le récapitulatif des engagements de ${entry.clubName || entry.clubId || "votre club"}.`,
      "Merci de vérifier les informations figurant dans ce document. Si vous constatez une anomalie, contactez l’organisateur de la compétition.",
      "",
      "Vous pouvez également consulter votre dossier dans le portail LivePalmes :",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions`,
      "",
      ...feeLines,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  return { engagementClubRecapMailSubject, engagementClubRecapMailText };
}

module.exports = { createMailService_engagementClubRecapMailSubject };
