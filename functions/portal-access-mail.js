function cleanMailText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const MAIL_SIGNATURE = "Commission Nationale Nage avec Palmes - FFESSM";
const { livePalmesEnvironment } = require("./livepalmes-environment");
const PORTAL_ORIGIN = livePalmesEnvironment().hostingOrigin;

function mailSignatureLines() {
  return ["Sportivement,", MAIL_SIGNATURE];
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
      ...mailSignatureLines()
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
      ...mailSignatureLines()
    ].join("\n")
  };
}

function engagementExistingAccountNotice(profile = {}) {
  const firstName = cleanMailText(profile.firstName);
  const status = cleanMailText(profile.status) === "inactive" ? "inactive" : "active";
  const clubCode = cleanMailText(profile.clubCode);
  const clubName = cleanMailText(profile.clubName);
  const clubLabel = clubCode && clubName && clubCode !== clubName
    ? `${clubCode} - ${clubName}`
    : clubName || clubCode;
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const accountLine = status === "inactive"
    ? "Cette adresse correspond déjà à un compte LivePalmes actuellement désactivé."
    : "Cette adresse correspond déjà à un compte LivePalmes actif.";
  const actionLines = status === "inactive"
    ? [
      "Pour demander la réactivation de votre compte ou signaler un changement de club, écrivez à livepalmes@nap-ffessm.fr en précisant vos nom, prénom, numéro de licence et club actuel."
    ]
    : [
      "Si vous avez oublié votre mot de passe, utilisez le lien « Mot de passe oublié » depuis la page de connexion :",
      `${PORTAL_ORIGIN}/portail.html`,
      "",
      "Si vous avez changé de club ou si ces informations sont incorrectes, écrivez à livepalmes@nap-ffessm.fr en précisant vos nom, prénom, numéro de licence et nouveau club."
    ];

  return {
    subject: status === "inactive"
      ? "Votre compte LivePalmes doit être réactivé"
      : "Votre compte LivePalmes existe déjà",
    text: [
      greeting,
      "",
      "Une demande de création de compte LivePalmes vient d’être effectuée avec cette adresse e-mail.",
      "",
      accountLine,
      ...(clubLabel ? ["", "Club actuellement associé :", clubLabel] : []),
      "",
      "Aucune nouvelle demande de compte n’a été créée.",
      "",
      ...actionLines,
      "",
      "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.",
      "",
      ...mailSignatureLines()
    ].join("\n")
  };
}

function engagementAccessAdminNotification(payload = {}) {
  const recipientFirstName = cleanMailText(payload.recipientFirstName);
  const requesterName = [cleanMailText(payload.firstName), cleanMailText(payload.lastName)]
    .filter(Boolean)
    .join(" ") || "Non renseigné";
  const clubCode = cleanMailText(payload.newClub?.clubCode || payload.clubCode);
  const clubName = cleanMailText(payload.newClub?.clubName || payload.clubName);
  const clubLabel = clubCode && clubName && clubCode !== clubName
    ? `${clubCode} - ${clubName}`
    : clubName || clubCode || "Club non renseigné";
  const regionLabel = cleanMailText(payload.regionName || payload.regionId) || "Région non renseignée";
  const clubRole = cleanMailText(payload.clubRole) || "Non renseignée";
  const newClubRequested = payload.newClubRequested === true;
  return {
    subject: `Nouvelle demande d’accès LivePalmes - ${clubLabel}`,
    text: [
      recipientFirstName ? `Bonjour ${recipientFirstName},` : "Bonjour,",
      "",
      `Une nouvelle demande d’accès au portail LivePalmes doit être examinée pour la région ${regionLabel}.`,
      "",
      `Demandeur : ${requesterName}`,
      `Club : ${clubLabel}`,
      `Fonction dans le club : ${clubRole}`,
      ...(newClubRequested ? [
        "",
        "Cette demande comporte la création d’un nouveau club et nécessite une validation nationale."
      ] : []),
      "",
      "Vous pouvez consulter et traiter cette demande depuis le portail LivePalmes :",
      `${PORTAL_ORIGIN}/portail.html#gestion-demandes-acces`,
      "",
      ...mailSignatureLines()
    ].join("\n")
  };
}

function normalizedMailRegionKey(value) {
  return cleanMailText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLocaleLowerCase("fr");
}

function engagementAccessAdminNotificationRecipients(recipients = [], payload = {}, limit = 100) {
  const requestedRegionKey = normalizedMailRegionKey(payload.regionId);
  const recipientsByEmail = new Map();
  recipients.forEach((recipient) => {
    const capabilities = Array.isArray(recipient?.capabilities) ? recipient.capabilities : [];
    const nationalRecipient = payload.newClubRequested === true && capabilities.includes("engagements.national.manage");
    const regionalRecipient = capabilities.includes("engagements.region.manage") &&
      requestedRegionKey &&
      normalizedMailRegionKey(recipient.regionId) === requestedRegionKey;
    const email = cleanMailText(recipient?.email).toLocaleLowerCase("fr");
    if ((!nationalRecipient && !regionalRecipient) || !email || recipientsByEmail.has(email)) return;
    recipientsByEmail.set(email, { ...recipient, email });
  });
  return [...recipientsByEmail.values()].slice(0, Math.max(1, Number(limit) || 100));
}

module.exports = {
  engagementAccessAcknowledgement,
  engagementAccessRejection,
  engagementExistingAccountNotice,
  engagementAccessAdminNotification,
  engagementAccessAdminNotificationRecipients,
  MAIL_SIGNATURE
};
