function cleanMailText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function swimmerDisplayName(swimmer = {}) {
  return [cleanMailText(swimmer.lastName), cleanMailText(swimmer.firstName)]
    .filter(Boolean)
    .join(" ") || "le nageur concerné";
}

function swimmerChangeLines(current = {}, resolved = {}) {
  const fields = [
    ["lastName", "Nom"],
    ["firstName", "Prénom"],
    ["birthDate", "Date de naissance"],
    ["sex", "Sexe"],
    ["licenseNumber", "Numéro de licence"]
  ];
  return fields
    .filter(([field]) => cleanMailText(current[field]) !== cleanMailText(resolved[field]))
    .map(([field, label]) => `- ${label} : ${cleanMailText(resolved[field]) || "non renseigné"}`);
}

function engagementSwimmerChangeResolutionMail(payload = {}) {
  const approved = cleanMailText(payload.decision) === "approved";
  const requesterFirstName = cleanMailText(payload.requestedByFirstName);
  const greeting = requesterFirstName ? `Bonjour ${requesterFirstName},` : "Bonjour,";
  const swimmerName = swimmerDisplayName(payload.swimmer || payload.current);
  const clubName = cleanMailText(payload.clubName);
  const resolutionNote = cleanMailText(payload.resolutionNote);
  const changes = approved
    ? swimmerChangeLines(payload.current, payload.resolvedProposed)
    : [];
  const decisionLabel = approved ? "validée" : "refusée";
  const lines = [
    greeting,
    "",
    `Votre demande de correction concernant ${swimmerName}${clubName ? ` (${clubName})` : ""} a été ${decisionLabel} par un administrateur national.`
  ];
  if (changes.length) {
    lines.push("", "Informations retenues :", ...changes);
  }
  if (resolutionNote) {
    lines.push("", `Commentaire de l’administrateur national : ${resolutionNote}`);
  }
  lines.push(
    "",
    approved
      ? "La fiche du nageur a été mise à jour dans LivePalmes."
      : "Aucune modification n’a été appliquée à la fiche du nageur.",
    "",
    "Sportivement,",
    "La Commission Nationale Nage avec Palmes – FFESSM"
  );
  return {
    subject: `Votre demande de correction LivePalmes a été ${decisionLabel}`,
    text: lines.join("\n")
  };
}

module.exports = {
  engagementSwimmerChangeResolutionMail,
  swimmerChangeLines
};
