"use strict";
// Presentation bridge only. Native rows are retained beside the existing UI
// shape, rather than passed through cleaners that discard unknown old entries.
const { createHash } = require("node:crypto");
const native = require("./nap-portal-competitions");
const calendar = require("./nap-direct-calendar");
const time = require("./nap-performance-normalization");
const text = value => String(value ?? "").trim();
const code = value => text(value).toUpperCase().replace(/\s+/g, "");
// These are distinct existing relay definitions. Only remove the legacy
// display suffix, never change BI into SB or discard the native course row.
const nativeCourseCode = value => code(value).replace(/^(4X50SF|4X100SF|4X200SF|4X100BI|4X100SB)MIXTE$/, "$1");
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
    const waterDefinition=pack.event.eventType==="openWater" && !Number(row.relais) ? require("./nap-open-water-courses").definition(row.course) : null;
    const eventCode = waterDefinition?.code || nativeCourseCode(row.course) || `NAP-${row.id_course}`;
    if (!courses.has(eventCode)) {
      const definition = waterDefinition || definitions.get(eventCode);
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
    canceled: Number(options.canceled) === 1, invitedRegionIds: pack.committees.length ? pack.committees.filter(row=>Number(row.comite)!==19).map(row => require("./nap-competition-scope").REGIONS[row.comite] || String(row.comite)) : json(options.invited_region_ids, []).filter(value=>value!=="OPEN"),
    nativeInvitationsEditable: pack.committees.every(row=>Number(row.comite)===19 || Object.hasOwn(require("./nap-competition-scope").REGIONS,String(row.comite))),
    officialsRequired: Number(parameters.officiel) === 1, computerEmail: text(parameters.mailtxt), officialsManagerEmail: text(parameters.mailjuges),
    qualificationStartDate: calendar.date(parameters.tps_d), qualificationEndDate: calendar.date(parameters.tps_f),
    qualificationTimesMode: calendar.date(parameters.tps_d) || calendar.date(parameters.tps_f) ? "period" : "all",
    missingEntryTimeMode: parameters.saisie == null ? "" : require("./nap-entry-time-policy").policy(parameters.saisie), maxEventsPerSwimmer: options.max_events_per_swimmer ?? 0,
    qualifications: { enabled: Number(options.qualifications_enabled) === 1, groups: pack.groups, standards: pack.standards },
    fees, programSessions: json(pack.detailedProgram?.program_sessions, []), events,
    eventCount: events.length, individualEventCount: events.filter(item => item.type === "individual").length,
    relayEventCount: events.filter(item => item.type === "relay").length,
    clubDocuments: [], documents: {}, generatedFiles: [], nativeOptionsConfigured: pack.options !== null,
    nativeWarnings: [pack.event.deadlineWarning, events.some(event => !event.nativeRecognized) ? "Courses anciennes conservees." : "",
      pack.committees.some(row=>Number(row.comite)!==19 && !Object.hasOwn(require("./nap-competition-scope").REGIONS,String(row.comite))) ? "Une admission regionale ancienne reste conservee ; sa correspondance doit etre verifiee avant modification." : "",
      json(pack.detailedProgram?.program_sessions, []).some(session=>session.items?.some(item=>!courses.has(item.eventCode))) ? "Le programme detaille contient une course qui n'est plus proposee dans NAP. Il reste conserve et doit etre verifie." : ""].filter(Boolean),
    updatedAt: pack.readAt };
}
function nativeTime(raw) {
  const value = time.parseCompactTime(raw);
  return { nativeTime: raw, entryTime: value ? time.formatTime(value) : text(raw), entryTimeValue: value || 0,
    entryTimeMode: "native", entryTimeWarning: !value && text(raw) ? "Temps natif conserve." : "" };
}
// At most one bounded reference query for an entire restricted dossier.
// No extra read when there are no native course restrictions.
async function entryWithCourseRules(connection,pack,context,competition,services) {
  const entry=entryItem(pack,context,birthDate=>services.category(competition.date,birthDate),competition);
  const rules=require("./nap-entry-course-rules");
  if(rules.courseLockReason(competition)) return entry;
  const participation=require("./nap-entry-participation-rules"),presence=participation.requirements(competition).presence.size>0;
  const restricted=Boolean(competition.nativeRules?.restrictions?.length);
  const birthBounds=require("./nap-entry-birth-policy").bounds(competition);
  if(!restricted && !presence && !birthBounds.start && !birthBounds.end) return entry;
  const categories=restricted ? await rules.readCategories(connection) : null;
  const evidence=await participation.readEvidence(connection,entry.swimmers,competition);
  const native={...competition,restrictions:competition.nativeRules.restrictions};
  for(const person of entry.swimmers) {
    try {
      require("./nap-entry-birth-policy").assertEligible(competition,person);
      if(!participation.eligible(competition,person.id,evidence)) throw new TypeError("Un resultat NAP dans au moins une competition requise est necessaire.");
      if(restricted) person.nativeAllowedEventCodes=rules.allowedCourses(person,native,competition,categories,services);
    }
    catch(error) { if(!(error instanceof TypeError)) throw error;person.nativeAllowedEventCodes=[];person.nativeCourseWarning=error.message; }
  }
  return entry;
}
function entryItem(pack, context, categoryForBirthDate, competition = {}) {
  const identities = new Map(pack.swimmers.map(person => [String(person.id), person]));
  const swimmers = pack.inscriptions.map(inscription => {
    const person = identities.get(String(inscription.nageur));
    if (!person) throw new TypeError("Inscription NAP sans fiche nageur.");
    return { ...person, swimmerIndexId: String(person.id), licenseNumber: "", category: categoryForBirthDate(person.birthDate), nativeInscriptionId: String(inscription.id),
      individualEntries: pack.individual.filter(row => String(row.engagement) === String(inscription.id)).map(row => ({
        nativeEntryId: String(row.id), eventCode: require("./nap-open-water-courses").displayCode(row.course,competition.eventType || competition.competitionType), status: "selected", manualEntryTime: "", ...nativeTime(row.tps) })) };
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
async function readDocuments(connection, competitionId, options={}) {
  return require("./nap-competition-documents").readDocuments(connection, competitionId, options);
}
module.exports = { json, fingerprint, listItem, competitionItem, nativeTime, entryItem, entryWithCourseRules, readDocuments, nativeCourseCode };
