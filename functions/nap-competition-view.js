"use strict";
// Existing singleton, values or query bodies; no business change.
const { text, code, nativeCourseCode, json } = require("./nap-competition-view-values");
const { listItem } = require("./nap-competition-list-item");
const { fingerprint } = require("./nap-competition-fingerprint");
const { date: __nativeMember0 } = require("./nap-calendar-values");
const calendar = { date: __nativeMember0 };
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
    canceled: Number(options.canceled) === 1, invitedRegionIds: pack.committees.length ? pack.committees.filter(row=>Number(row.comite)!==19).map(row => require("./nap-competition-regions").REGIONS[row.comite] || String(row.comite)) : json(options.invited_region_ids, []).filter(value=>value!=="OPEN"),
    nativeInvitationsEditable: pack.committees.every(row=>Number(row.comite)===19 || Object.hasOwn(require("./nap-competition-regions").REGIONS,String(row.comite))),
    officialsRequired: Number(parameters.officiel) === 1, computerEmail: text(parameters.mailtxt), officialsManagerEmail: text(parameters.mailjuges),
    qualificationStartDate: calendar.date(parameters.tps_d), qualificationEndDate: calendar.date(parameters.tps_f),
    qualificationTimesMode: calendar.date(parameters.tps_d) || calendar.date(parameters.tps_f) ? "period" : "all",
    missingEntryTimeMode: parameters.saisie == null ? "" : require("./nap-entry-time-policy").policy(parameters.saisie), maxEventsPerSwimmer: options.max_events_per_swimmer ?? 0,
    qualifications: require("./nap-qualification-rules").fromPack(pack,events),
    fees, programSessions: json(pack.detailedProgram?.program_sessions, []), events,
    ...(require("./nap-calendar-event-details").KINDS.has(pack.event.competitionType) ? require("./nap-calendar-event-details").fromRow(pack.calendarDetails) : {}),
    eventCount: events.length, individualEventCount: events.filter(item => item.type === "individual").length,
    relayEventCount: events.filter(item => item.type === "relay").length,
    clubDocuments: [], documents: {}, generatedFiles: [], nativeOptionsConfigured: pack.options !== null,
    nativeWarnings: [pack.event.deadlineWarning, events.some(event => !event.nativeRecognized) ? "Courses anciennes conservees." : "",
      pack.committees.some(row=>Number(row.comite)!==19 && !Object.hasOwn(require("./nap-competition-regions").REGIONS,String(row.comite))) ? "Une admission regionale ancienne reste conservee ; sa correspondance doit etre verifiee avant modification." : "",
      json(pack.detailedProgram?.program_sessions, []).some(session=>session.items?.some(item=>!courses.has(item.eventCode))) ? "Le programme detaille contient une course qui n'est plus proposee dans NAP. Il reste conserve et doit etre verifie." : ""].filter(Boolean),
    updatedAt: pack.readAt };
}

module.exports = { competitionItem };
