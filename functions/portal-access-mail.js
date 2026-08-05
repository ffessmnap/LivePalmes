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

module.exports = {
  engagementAccessAcknowledgement
};
