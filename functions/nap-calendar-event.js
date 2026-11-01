"use strict";
// Existing singleton, values or query bodies; no business change.
const { date, text, publicUrl } = require("./nap-calendar-values");
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");
const { committeeId: __nativeMember0, committeeLabel: __nativeMember1 } = require("./nap-performance-committees");
const rules = { committeeId: __nativeMember0, committeeLabel: __nativeMember1 };
const MAX_EVENTS = 500;

const nativeLevel = value => ({0:"departemental",1:"regional",2:"national",3:"national",4:"national",5:"national",6:"regional",7:"national",8:"international"})[value == null ? "" : String(value)] || "";

function eventFromRow(row) {
  const name = text(row.libelle), kind = text(row.type_label);
  // Preserve the existing calendar classification for legacy default pool codes.
  const titleType = /formation|initiateur|juge|chronom|recyclage|[ée]valuateur|sauv.?nage/i.test(name) ? "training"
    : /stage|d[ée]tection/i.test(name) ? "stage"
    : /r[ée]union|assembl[ée]e|colloque|s[ée]minair|date limite/i.test(name) ? "meeting" : "";
  const explicitType = ["pool","openWater","training","stage","meeting","other"].includes(row.event_type) ? row.event_type : "";
  const eventType = explicitType || (Number(row.ld) === 1 ? "openWater" : ({ "Eau libre": "openWater", Formation: "training", Stage: "stage", "Réunion": "meeting" }[kind] || titleType || (kind === "Piscine" ? "pool" : "other")));
  const level = nativeLevel(row.native_level_code) || ({ "Départementale": "departemental", "Départemental": "departemental", "Régionale": "regional", "Régional": "regional", "Championnat de Zones": "regional", "Critériums Nationaux": "national", Nationale: "national", National: "national", International: "international", Internationale: "international" }[text(row.level_label)] || ({ MONDE: "international", EUROPE: "international", FRANCE: "national", ZONE: "regional", REGIONAUX: "regional" })[text(row.scope_label)] || "");
  const regionId = ["national", "international"].includes(level) ? "" : rules.committeeId(row.comite);
  const id = `legacy-nap-${row.id}`;
  const pdfUrl = publicUrl(row.filepdf);
  const entry = ["pool","openWater"].includes(eventType) ? require("./nap-paris-time").entryState(row) : {};
  return { id, legacyCompetitionId: String(row.id), name, date: date(row.date), endDate: date(row.enddate) || date(row.date),
    ...entry, engagementCompetitionId:["pool","openWater"].includes(eventType) ? id : "",
    teamLeadersWhatsAppUrl:["national","international"].includes(level) ? text(row.portal_whatsapp) : "",
    city: row.portal_city == null ? text(row.lieu) : text(row.portal_city), location: text(row.lieu), address:text(row.portal_address),
    organizer:text(row.portal_organizer), waterBodyType:text(row.portal_water_body_type), canceled:Number(row.portal_canceled)===1,
    description: text(row.comments), legacyDescription: text(row.description) !== text(row.comments) ? text(row.description) : "", eventType, level,
    regionId, regionLabel: rules.committeeLabel(regionId), poolLength: Number(row.bassin) > 0 ? String(row.bassin) : "",
    poolLaneCount: Number(row.nb_lignes) > 0 ? Number(row.nb_lignes) : 0,
    timingType: ({ E: "electronic", M: "manual" })[text(row.chrono)] || "",
    resultsPublishedAt: Number(row.has_results) ? date(row.date) : "",
    results: { pdfUrl, url: Number(row.has_results) ? `competition.html?id=${id}#competitionResultsTitle` : "", dataPath: Number(row.has_results) ? `results/${id}.json` : "" }, documents: [], program: [] };
}

const SELECT_EVENT = `SELECT STRAIGHT_JOIN c.id,c.type AS native_type,c.libelle,c.lieu,c.date,c.enddate,c.comite,c.description,c.comments,c.filepdf,c.affiche,c.bassin,c.chrono,c.ld,t.label AS type_label,l.label AS level_label,s.label AS scope_label,cp.nb_lignes,cp.niveau AS native_level_code,cp.actif,cp.date_limit,co.*,co.entry_closed,co.whatsapp_url AS portal_whatsapp,co.city AS portal_city,co.address AS portal_address,co.organizer_label AS portal_organizer,co.water_body_type AS portal_water_body_type,co.canceled AS portal_canceled,(EXISTS(SELECT 1 FROM perfs p FORCE INDEX (livepalmes_compet_id) WHERE ${visiblePerformanceSql()} AND p.compet=c.id LIMIT 1) OR EXISTS(SELECT 1 FROM perfs_relais r FORCE INDEX (livepalmes_compet_id) WHERE r.compet=c.id LIMIT 1) OR EXISTS(SELECT 1 FROM livepalmes_performance_imports ri FORCE INDEX (PRIMARY) WHERE ri.id=SHA2(CONCAT('["nap-results-current",',c.id,']'),256) AND ri.status='current' LIMIT 1)) AS has_results FROM competitions c`;

const EVENT_JOINS = " LEFT JOIN compet_parametres cp ON cp.compet=c.id LEFT JOIN compet_level l ON l.id=cp.niveau LEFT JOIN compet_types t ON t.id=c.type LEFT JOIN compet_type s ON s.id=c.typecnc LEFT JOIN livepalmes_competition_options co ON co.competition_id=c.id";

module.exports = { MAX_EVENTS, nativeLevel, eventFromRow, SELECT_EVENT, EVENT_JOINS };
