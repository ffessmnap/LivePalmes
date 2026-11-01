"use strict";
// Existing presentation rules shared by the historical builder and direct NAP reader.
const { CURRENT_POOL_COURSES, SUPPORTED_POOLS, SUPPORTED_CHRONOS, COURSE_META, MIN_TIME_BY_COURSE, coursePayload } = require("./nap-performance-courses");








const { CATEGORY_ORDER, CATEGORY_LABELS, categoryFromAge, fallbackCategoryFromSource, normalizePerformanceCategory, categoryCode, categorySortValue } = require("./nap-performance-categories");

const { COMMITTEE_LABELS, committeeId, committeeLabel } = require("./nap-performance-committees");



const { cleanText, normalizeIdentityText, swimmerIdentityKey, canonicalSwimmerId } = require("./nap-performance-identity");







const { parseCompactTime, formatTime } = require("./nap-performance-time");



const { competitionYear, competitionSeasonYear, birthYear, seasonAge } = require("./nap-performance-dates");

















const { isIntermediateRow, intermediateGroupKey, annotateIntermediateOrigins } = require("./nap-performance-intermediates");











module.exports = { CURRENT_POOL_COURSES, SUPPORTED_POOLS, SUPPORTED_CHRONOS, COURSE_META, MIN_TIME_BY_COURSE, CATEGORY_ORDER, COMMITTEE_LABELS, CATEGORY_LABELS, normalizeIdentityText, swimmerIdentityKey, canonicalSwimmerId, parseCompactTime, formatTime, competitionYear, competitionSeasonYear, birthYear, seasonAge, categoryFromAge, fallbackCategoryFromSource, normalizePerformanceCategory, categoryCode, coursePayload, isIntermediateRow, intermediateGroupKey, annotateIntermediateOrigins, categorySortValue, committeeId, committeeLabel, cleanText };
