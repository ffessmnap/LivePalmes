"use strict";
// Existing singleton, values or query bodies; no business change.
const { parseCompactTime: __nativeMember0, formatTime: __nativeMember12 } = require("./nap-performance-time");
const { CURRENT_POOL_COURSES: __nativeMember1, MIN_TIME_BY_COURSE: __nativeMember2, coursePayload: __nativeMember4 } = require("./nap-performance-courses");
const { normalizePerformanceCategory: __nativeMember3, categoryCode: __nativeMember10, CATEGORY_LABELS: __nativeMember11 } = require("./nap-performance-categories");
const { committeeId: __nativeMember5, committeeLabel: __nativeMember8 } = require("./nap-performance-committees");
const { cleanText: __nativeMember6 } = require("./nap-performance-identity");
const { competitionSeasonYear: __nativeMember7 } = require("./nap-performance-dates");
const { isIntermediateRow: __nativeMember9 } = require("./nap-performance-intermediates");
const rules = { parseCompactTime: __nativeMember0, CURRENT_POOL_COURSES: __nativeMember1, MIN_TIME_BY_COURSE: __nativeMember2, normalizePerformanceCategory: __nativeMember3, coursePayload: __nativeMember4, committeeId: __nativeMember5, cleanText: __nativeMember6, competitionSeasonYear: __nativeMember7, committeeLabel: __nativeMember8, isIntermediateRow: __nativeMember9, categoryCode: __nativeMember10, CATEGORY_LABELS: __nativeMember11, formatTime: __nativeMember12 };
function performanceRow(row, person, entryHistory = false) {
  const course = String(row.course || "");
  const timeValue = rules.parseCompactTime(row.tps);
  const entryOnlyCourse = entryHistory === true && ["25SF", "25AP"].includes(course);
  if ((!rules.CURRENT_POOL_COURSES.includes(course) && !entryOnlyCourse) || Number(row.relais || 0) !== 0 || Number(row.ld || 0) === 1 ||
      !row.competition_id || !timeValue || timeValue < (entryOnlyCourse ? 0 : rules.MIN_TIME_BY_COURSE[course])) return null;
  const category = rules.normalizePerformanceCategory(row.cat, person, { date: row.date });
  if (!category) return null;
  const details = entryOnlyCourse ? {label: `25 m ${course === "25SF" ? "Surface" : "Apnee"}`, shortLabel: `25 ${course.slice(2)}`, style: course.slice(2), length: 25} : rules.coursePayload(course);
  const regionId = rules.committeeId(row.comite_club);
  return {
    id: String(row.id), source: "nap", swimmerId: person.id, originalSwimmerId: person.id,
    swimmerIdentityKey: person.identityKey, swimmer: person.name, firstName: person.firstName, lastName: person.lastName,
    birthDate: person.birthDate, sex: person.sex, competitionId: String(row.competition_id), competition: rules.cleanText(row.libelle),
    date: row.date, seasonYear: rules.competitionSeasonYear(row.date), location: rules.cleanText(row.lieu),
    pool: Number(row.bassin) > 0 ? String(row.bassin) : "", chrono: rules.cleanText(row.chrono),
    clubId: String(row.selected_club || ""), club: rules.cleanText(row.abre_club || row.nom_club), clubName: rules.cleanText(row.nom_club),
    regionId, regionLabel: rules.committeeLabel(regionId), course, courseLabel: details.label, courseShortLabel: details.shortLabel,
    style: details.style, length: details.length, isIntermediate: rules.isIntermediateRow(row), originCourse: "", originPerformanceId: "",
    category, categoryCode: rules.categoryCode(category, person.sex), categoryLabel: rules.CATEGORY_LABELS[person.sex]?.[category] || category,
    timeValue, time: rules.formatTime(timeValue), passage: String(row.passage || "0")
  };
}

module.exports = { performanceRow };
