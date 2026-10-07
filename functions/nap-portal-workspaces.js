"use strict";
// Presentation bridge only. Native rows are retained beside the existing UI
// shape, rather than passed through cleaners that discard unknown old entries.
const { createHash } = require("node:crypto");
const native = require("./nap-portal-competitions");
const calendar = require("./nap-direct-calendar");
const time = require("./nap-performance-normalization");
const text = value => String(value ?? "").trim();
const code = value => text(value).toUpperCase().replace(/\s+/g, "");
// These are two distinct existing relay definitions. Only remove the legacy
// display suffix, never change BI into SB or discard the native course row.
const nativeCourseCode = value => code(value).replace(/^(4X100BI|4X100SB)MIXTE$/, "$1");
function json(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { throw new TypeError("Complement NAP illisible."); }
}
function fingerprint(pack) {
  const { readAt, ...data } = pack;
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
function listItem(event) {
  return { ...event, source: "nap", napSource: true, sourceType: "competition", publicationStatus: "published",
    publicDescription: event.description || "", resultsUrl: event.results?.url || "", resultsPdfUrl: event.results?.pdfUrl || "",
    nativeReadOnly: true, clubEntryExists: null };
}
function competitionItem(pack, definitions = new Map()) {
  const options = pack.options || {}, parameters = pack.nativeParameters;
  const courses = new Map();
  for (const row of pack.courses) {
    const eventCode = nativeCourseCode(row.course) || `NAP-${row.id_course}`;
    if (!courses.has(eventCode)) {
      const definition = definitions.get(eventCode);
      const extra = pack.courseOptions.find(item => code(item.event_code) === eventCode);
      courses.set(eventCode, { ...(definition || {}), code: eventCode, label: definition?.label || text(row.course) || `Course NAP ${row.id_course}`,
        type: Number(row.relais) ? "relay" : "individual", categoryRestrictions: json(extra?.category_restrictions, []),
        relayMixedMode: extra?.relay_mixed_mode ?? "", allowMultipleRelays: extra?.multiple_relays_allowed == null ? null : Boolean(Number(extra.multiple_relays_allowed)),
        multipleRelaysAllowed: Boolean(Number(extra?.multiple_relays_allowed || 0)),
        nativeRecognized: Boolean(definition), nativeCourses: [] });
    }
    courses.get(eventCode).nativeCourses.push(row);
  }
  const events = [...courses.values()];
  const fees = pack.fees ? { enabled: Number(pack.fees.enabled) === 1, swimmerFee: Number(pack.fees.swimmer_fee || 0),
    individualEventFee: Number(pack.fees.individual_event_fee || 0), relayFee: Number(pack.fees.relay_fee || 0), helloAssoUrl: text(pack.fees.helloasso_url) } : { enabled: false };
  return { ...listItem(pack.event), napFingerprint: fingerprint(pack), nativeParameters: parameters, nativeCompetitionEditable: Boolean(pack.nativeSnapshot?.parameters?.id),
    nativeRules: { courses: pack.courses, restrictions: pack.restrictions, participations: pack.participations, committees: pack.committees },
    address: text(options.address), city: options.city == null ? pack.event.city : text(options.city), organizer: text(options.organizer_label),
    organizerEmail: text(options.organizer_email), teamLeadersWhatsAppUrl: text(options.whatsapp_url), waterBodyType: text(options.water_body_type),
    canceled: Number(options.canceled) === 1, invitedRegionIds: json(options.invited_region_ids, pack.committees.map(row => String(row.comite))),
    officialsRequired: Number(parameters.officiel) === 1, computerEmail: text(parameters.mailtxt), officialsManagerEmail: text(parameters.mailjuges),
    qualificationStartDate: calendar.date(parameters.tps_d), qualificationEndDate: calendar.date(parameters.tps_f),
    qualificationTimesMode: calendar.date(parameters.tps_d) && calendar.date(parameters.tps_f) ? "period" : "",
    missingEntryTimeMode: text(options.missing_time_mode), maxEventsPerSwimmer: options.max_events_per_swimmer ?? 0,
    qualifications: { enabled: Number(options.qualifications_enabled) === 1, groups: pack.groups, standards: pack.standards },
    fees, programSessions: json(pack.detailedProgram?.program_sessions, []), events,
    eventCount: events.length, individualEventCount: events.filter(item => item.type === "individual").length,
    relayEventCount: events.filter(item => item.type === "relay").length,
    clubDocuments: [], documents: {}, generatedFiles: [], nativeOptionsConfigured: pack.options !== null,
    nativeWarnings: [pack.event.deadlineWarning, events.some(event => !event.nativeRecognized) ? "Courses anciennes conservees." : "",
      json(pack.detailedProgram?.program_sessions, []).some(session=>session.items?.some(item=>!courses.has(item.eventCode))) ? "Le programme detaille contient une course qui n'est plus proposee dans NAP. Il reste conserve et doit etre verifie." : ""].filter(Boolean),
    updatedAt: pack.readAt };
}
function nativeTime(raw) {
  const value = time.parseCompactTime(raw);
  return { nativeTime: raw, entryTime: value ? time.formatTime(value) : text(raw), entryTimeValue: value || 0,
    entryTimeMode: "native", entryTimeWarning: !value && text(raw) ? "Temps natif conserve." : "" };
}
function entryItem(pack, context, categoryForBirthDate) {
  const identities = new Map(pack.swimmers.map(person => [String(person.id), person]));
  const swimmers = pack.inscriptions.map(inscription => {
    const person = identities.get(String(inscription.nageur));
    if (!person) throw new TypeError("Inscription NAP sans fiche nageur.");
    return { ...person, swimmerIndexId: String(person.id), licenseNumber: "", category: categoryForBirthDate(person.birthDate), nativeInscriptionId: String(inscription.id),
      individualEntries: pack.individual.filter(row => String(row.engagement) === String(inscription.id)).map(row => ({
        nativeEntryId: String(row.id), eventCode: code(row.course), status: "selected", manualEntryTime: "", ...nativeTime(row.tps) })) };
  });
  const leaders = pack.leaders.map(row => ({ nativeLeaderId: String(row.id), personId: `nap-leader-${row.id}`, mode: "person",
    firstName: text(row.prenom), lastName: text(row.nom), birthDate: calendar.date(row.date), sex: "", licenseNumber: "",
    clubId: text(row.club), representedClubId: text(row.pourclub), externalClub: String(row.club) !== pack.clubId }));
  const relays = pack.relays.map(row => {
    const relayDetail = require("./nap-relay-details").detail(row, pack.options?.submission_metadata);
    const members = pack.members.filter(member => String(member.relais) === String(row.id)).map(member => ({
      nativeMemberId: String(member.id), nativePosition: member.pos, swimmerIndexId: String(member.nageur), swimmerId: String(member.nageur),
      firstName: text(member.prenom), lastName: text(member.nom), name: [text(member.prenom), text(member.nom)].join(" "),
      birthDate: calendar.date(member.date), sex: text(member.sexe), clubId: text(member.club), licenseNumber: "" }));
    return { relayId: String(row.id), nativeCategory: row.categorie, category: relayDetail?.category || `NAP-${row.categorie}`, eventCode: nativeCourseCode(row.course_code) || `NAP-${row.course}`,
      nativeCourseId: row.course, genderMode: relayDetail?.genderMode || ({ F: "female", M: "male", X: "mixed", 0: "mixed" })[text(row.sexe)] || "",
      manualEntryTime: "", ...nativeTime(row.tps), members, memberIds: members.map(member => member.swimmerIndexId) };
  });
  return { id: `${pack.competitionId}_${pack.clubId}`, competitionId: `legacy-nap-${pack.competitionId}`, source: "nap", napSource: true,
    napFingerprint: fingerprint(pack), clubId: pack.clubId, clubCode: context.clubCode || pack.clubId, clubName: context.clubName || "", regionId: context.regionId || "",
    status: "active", swimmers, relays, officials: pack.officials.map(row => ({ personId: `nap-official-${row.officiel}`, nativeLinkId: String(row.id), nativeOfficialId: String(row.officiel),
      firstName: text(row.prenom), lastName: text(row.nom), birthDate: calendar.date(row.date), licenseNumber: "", sex: "" })),
    // Multiple leaders are kept explicitly, without selecting one arbitrarily.
    teamLeader: leaders.length === 1 ? leaders[0] : {}, nativeLeaders: leaders, teamLeaderComplete: leaders.length === 1,
    nativeOptions: pack.options, qualificationAlert: null, documents: {}, updatedAt: pack.readAt,
    nativeWarnings: [leaders.length > 1 ? "Plusieurs chefs d'equipe NAP conserves." : "", relays.length ? "Categories natives des relais conservees." : ""].filter(Boolean) };
}
async function readDocuments(connection, competitionId) {
  const rows = await native.bounded(connection,
    "SELECT d.id,d.name,d.location,d.comment,d.public,t.label AS type_label FROM documents d FORCE INDEX (livepalmes_compet_public_id) LEFT JOIN documents_types t ON t.id=d.type WHERE d.competition=? AND d.public='Y' ORDER BY d.id LIMIT 101",
    [calendar.positiveId(competitionId)], 100);
  return rows.map(row => ({ id: `nap-${row.id}`, title: text(row.name) || text(row.type_label), url: calendar.publicUrl(row.location),
    description: text(row.comment), category: /protocole|r[ée]sultat/i.test(`${row.name} ${row.type_label}`) ? "results" : "information", nativeDocument: true })).filter(row => row.url);
}
module.exports = { json, fingerprint, listItem, competitionItem, nativeTime, entryItem, readDocuments, nativeCourseCode };
