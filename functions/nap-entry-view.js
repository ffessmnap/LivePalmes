"use strict";
// Existing singleton, values or query bodies; no business change.
const { text, nativeCourseCode, json } = require("./nap-competition-view-values");
const { fingerprint } = require("./nap-competition-fingerprint");
const { date: __nativeMember0 } = require("./nap-calendar-values");
const calendar = { date: __nativeMember0 };
const { parseCompactTime: __nativeMember1, formatTime: __nativeMember2 } = require("./nap-performance-time");
const time = { parseCompactTime: __nativeMember1, formatTime: __nativeMember2 };
function nativeTime(raw) {
  const value = time.parseCompactTime(raw);
  return { nativeTime: raw, entryTime: value ? time.formatTime(value) : text(raw), entryTimeValue: value || 0,
    entryTimeMode: "native", entryTimeWarning: !value && text(raw) ? "Temps natif conserve." : "" };
}

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
  const individualByInscription = new Map(), membersByRelay = new Map();
  for (const row of pack.individual) {
    const key = String(row.engagement);
    if (!individualByInscription.has(key)) individualByInscription.set(key, []);
    individualByInscription.get(key).push(row);
  }
  for (const member of pack.members) {
    const key = String(member.relais);
    if (!membersByRelay.has(key)) membersByRelay.set(key, []);
    membersByRelay.get(key).push(member);
  }
  const swimmers = pack.inscriptions.map(inscription => {
    const person = identities.get(String(inscription.nageur));
    if (!person) throw new TypeError("Inscription NAP sans fiche nageur.");
    return { ...person, swimmerIndexId: String(person.id), licenseNumber: String(person.licenseNumber ?? "").trim(), category: categoryForBirthDate(person.birthDate), nativeInscriptionId: String(inscription.id),
      individualEntries: (individualByInscription.get(String(inscription.id)) || []).map(row => ({
        nativeEntryId: String(row.id), eventCode: require("./nap-open-water-courses").displayCode(row.course,competition.eventType || competition.competitionType), status: "selected", manualEntryTime: "", ...nativeTime(row.tps) })) };
  });
  const leaders = pack.leaders.map(row => ({ nativeLeaderId: String(row.id), personId: `nap-leader-${row.id}`, mode: require("./nap-team-leader-state").isWaiver(row) ? "renounced" : "person", renunciationAccepted: require("./nap-team-leader-state").isWaiver(row),
    firstName: require("./nap-team-leader-state").isWaiver(row) ? "" : text(row.prenom), lastName: require("./nap-team-leader-state").isWaiver(row) ? "" : text(row.nom), birthDate: calendar.date(row.date), sex: "", licenseNumber: "",
    clubId: text(row.club), representedClubId: text(row.pourclub), externalClub: String(row.club) !== pack.clubId }));
  const relays = pack.relays.map(row => {
    const relayDetail = require("./nap-relay-details").detail(row, pack.options?.submission_metadata);
    const members = (membersByRelay.get(String(row.id)) || []).map(member => ({
      nativeMemberId: String(member.id), nativePosition: member.pos, swimmerIndexId: String(member.nageur), swimmerId: String(member.nageur),
      firstName: text(member.prenom), lastName: text(member.nom), name: [text(member.prenom), text(member.nom)].join(" "),
      birthDate: calendar.date(member.date), sex: text(member.sexe), clubId: text(member.club), ...require("./nap-license-state").state(member) }));
    return { relayId: String(row.id), nativeCategory: row.categorie, category: relayDetail?.category || `NAP-${row.categorie}`, eventCode: nativeCourseCode(row.course_code) || `NAP-${row.course}`,
      nativeCourseId: row.course, genderMode: relayDetail?.genderMode || ({ F: "female", M: "male", X: "mixed", 0: "mixed" })[text(row.sexe)] || "",
      manualEntryTime: "", ...nativeTime(row.tps), members, memberIds: members.map(member => member.swimmerIndexId) };
  });
  return { id: `${pack.competitionId}_${pack.clubId}`, competitionId: `legacy-nap-${pack.competitionId}`, source: "nap", napSource: true,
    napFingerprint: fingerprint(pack), clubId: pack.clubId, clubCode: context.clubCode || pack.clubId, clubName: context.clubName || "", regionId: context.regionId || "",
    status: "active", swimmers, relays, officials: pack.officials.map(row => ({ personId: `nap-official-${row.officiel}`, nativeLinkId: String(row.id), nativeOfficialId: String(row.officiel),
      firstName: text(row.prenom), lastName: text(row.nom), birthDate: calendar.date(row.date), licenseNumber: "", sex: "" })),
    // Multiple leaders are kept explicitly, without selecting one arbitrarily.
    teamLeader: leaders.length === 1 ? leaders[0] : {}, nativeLeaders: leaders, teamLeaderComplete: require("./nap-team-leader-state").declarationComplete(pack.leaders),
    nativeOptions: pack.options, qualificationAlert: json(pack.options?.submission_metadata,{}).qualificationAlert||null, documents: {}, updatedAt: pack.readAt,
    nativeWarnings: [leaders.length > 1 ? "Plusieurs chefs d'equipe NAP conserves." : "", relays.length ? "Categories natives des relais conservees." : ""].filter(Boolean) };
}

module.exports = { nativeTime, entryItem, entryWithCourseRules };
