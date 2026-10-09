"use strict";
// TEST previews are deliberately side-effect free: no SMTP, outbox, Storage or
// sporting writes. The existing recipient selectors retain preferences/copies.
async function preview(input, services) {
  if (!input || !["opening", "documents", "club_recaps", "send"].includes(input.kind)) throw new TypeError("Notification inconnue.");
  const competition = await services.competition(input.competitionId);
  if (competition.source !== "nap" || !competition.napSource) throw new TypeError("Compétition NAP requise.");
  const base = { ok: true, source: "nap", competitionId: competition.id, disabled: true,
    previewOnly: true, mailStatus: "test-emails-disabled", jobCount: 0, sentCount: 0, errorCount: 0, jobs: [] };
  if (input.kind === "send") return { ...base, attemptedCount: 0 };
  if (input.kind === "documents" && input.documentIds !== undefined) {
    if (!Array.isArray(input.documentIds)) throw new TypeError("Liste de documents requise.");
    const ids = [...new Set(input.documentIds)];
    if (!ids.length || ids.length > 20 || ids.some(id => !competition.clubDocuments.some(doc => doc.id === id))) throw new TypeError("Documents à notifier introuvables.");
  }
  const recipients = await services.recipients();
  if (!Array.isArray(recipients) || recipients.length > 10000) throw new RangeError("Liste des destinataires trop volumineuse.");
  if (input.kind === "opening" || input.kind === "documents") {
    const selected = services.select(input.kind, recipients, competition);
    return { ...base, recipientCount: selected.length, plannedJobCount: selected.length,
      clubCount: new Set(selected.map(item => item.clubId).filter(Boolean)).size };
  }
  const dossiers = await services.entries(competition);
  // Recaps go to each engaged club, including a club from outside the regional
  // invitations. Use the existing all-club selector, not the opening scope.
  const allClubRecipients = services.clubRecipients(recipients);
  const eligible = dossiers.entries.filter(services.hasParticipants);
  const ready = eligible.filter(entry => entry.teamLeaderComplete);
  const clubIds = new Set(ready.map(entry => entry.clubId));
  const targets = allClubRecipients.filter(recipient => clubIds.has(recipient.clubId));
  return { ...base, clubEntryCount: dossiers.entries.length, engagedClubCount: eligible.length,
    skippedClubCount: dossiers.entries.length - ready.length, recipientCount: targets.length,
    plannedJobCount: targets.length, clubCount: new Set(targets.map(item => item.clubId)).size,
    pdfGeneratedCount: 0, pdfReusedCount: 0, errors: [],
    closureRecipients: { computerConfigured: Boolean(competition.computerEmail),
      officialsRequired: competition.officialsRequired === true,
      officialsManagerConfigured: Boolean(competition.officialsManagerEmail) } };
}
async function nativeClubScopes(connection, recipients) {
  const ids = [...new Set(recipients.filter(item => item.clubId && item.capabilities?.includes("engagements.club.manage")).map(item => String(item.clubId)))];
  if (ids.length > 1000) throw new RangeError("Annuaire des clubs trop volumineux.");
  if (ids.some(id => !/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))) throw new TypeError("Un compte club doit être raccordé à son identifiant NAP.");
  if (!ids.length) return recipients;
  const rows = await require("./nap-direct-calendar").execute(connection,
    `SELECT num_club,comite_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club IN (${ids.map(() => "?").join(",")}) ORDER BY num_club LIMIT 1001`, ids);
  const regions = new Map(rows.map(row => [String(row.num_club), require("./nap-competition-scope").REGIONS[row.comite_club] || String(row.comite_club)]));
  if (regions.size !== ids.length || ids.some(id => !regions.has(id))) throw new TypeError("Un compte club ne correspond pas à un club NAP existant.");
  return recipients.map(item => regions.has(String(item.clubId)) && item.capabilities?.includes("engagements.club.manage")
    ? { ...item, clubId: String(item.clubId), regionId: regions.get(String(item.clubId)) } : item);
}
module.exports = { preview, nativeClubScopes };
