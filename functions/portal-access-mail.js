function cleanMailText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function engagementAccessAcknowledgement(profile = {}) {
  const firstName = cleanMailText(profile.firstName);
  const clubName = cleanMailText(profile.clubName);
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const clubLine = clubName
    ? `Nous confirmons la réception de votre demande d’accès LivePalmes pour le club ${clubName}.`
    : "Nous confirmons la réception de votre demande d’accès LivePalmes.";

  return {
    subject: "Votre demande d’accès LivePalmes a bien été reçue",
    text: [
      greeting,
      "",
      clubLine,
      "",
      "Elle sera prochainement examinée par un responsable régional ou national. Vous recevrez un nouvel e-mail lorsque votre accès aura été validé.",
      "",
      "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.",
      "",
      "Sportivement,",
      "L’équipe LivePalmes",
      "Commission Nationale Nage avec Palmes – FFESSM"
    ].join("\n")
  };
}

function engagementAccessRejection(profile = {}) {
  const firstName = cleanMailText(profile.firstName);
  const clubName = cleanMailText(profile.clubName || profile.newClub?.clubName);
  const reason = cleanMailText(profile.resolutionReason);
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const clubLine = clubName ? ` concernant le club ${clubName}` : "";

  return {
    subject: "Votre demande d’accès LivePalmes a été refusée",
    text: [
      greeting,
      "",
      `Votre demande d’accès LivePalmes${clubLine} a été refusée.`,
      "",
      `Motif : ${reason || "Aucun motif communiqué."}`,
      "",
      "Vous pouvez transmettre une nouvelle demande après avoir corrigé les informations concernées.",
      "",
      "Sportivement,",
      "L’équipe LivePalmes",
      "Commission Nationale Nage avec Palmes – FFESSM"
    ].join("\n")
  };
}

module.exports = {
  engagementAccessAcknowledgement,
  engagementAccessRejection
};
