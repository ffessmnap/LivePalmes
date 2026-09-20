"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const backend = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
const portal = fs.readFileSync(path.join(__dirname, "../assets/livepalmes-admin-portal.js"), "utf8");
function section(source, start, end) { const offset = source.indexOf(start); assert.ok(offset >= 0); return source.slice(offset, source.indexOf(end, offset)); }
async function main() {
  let reads = 0;
  const rows = [{ course: "100SF", timeValue: 6000, publicKey: "proof", date: "2026-01-01" }];
  const context = { cleanText: (value) => String(value || "").trim(), HttpsError: Error,
    getEngagementQualificationRows: async () => { reads++; return rows; }, getEngagementEntryTimeRowsForSwimmer: async () => rows,
    qualificationService: { evaluate: async () => ({ enabled: true, courses: { "100SF": { qualified: true }, "50SF": { allowed: true } } }) },
    qualificationEngine: { reconcile: () => ({ removed: [] }) },
    bestEngagementKnownTime: (history, code) => history.find((row) => row.course === code),
    cleanEngagementEntryIndividualEntries: (entries) => entries,
    parseEngagementEntryTime: (raw) => raw ? { display: "00:45.00", value: 4500 } : null,
    formatTimeValue: () => "01:00.00",
    normalizeCourseCode: (code) => code, engagementRelayAllowedCategories: () => ["C"],
    cleanEngagementRelayGenderMode: () => "F", cleanEngagementCompetitionType: (value) => value || "pool",
    assertEngagementRelayMembers: () => [], cleanFirestoreValue: (value) => value
  };
  vm.createContext(context);
  vm.runInContext(section(backend, "async function resolveEngagementIndividualEntriesForSwimmer(", "function engagementSwimmerIdentityKey("), context);
  const entry = { eventCode: "100SF", entryTimeMode: "manual", manualEntryTime: "00:45.00", entryTime: "00:45.00" };
  const competition = { qualifications: { enabled: true }, missingEntryTimeMode: "manual" };
  let result = await context.resolveEngagementIndividualEntriesForSwimmer({}, [entry, { ...entry, eventCode: "50SF" }], competition);
  assert.equal(result[0].entryTimeMode, "known", "Une ancienne configuration manuelle ne contourne pas la grille.");
  assert.equal(result[0].entryTimeValue, 6000);
  assert.equal(result[0].manualEntryTime, undefined);
  assert.equal(result[1].entryTimeMode, "default595999", "Sans performance, aucun temps libre n'est retenu.");
  assert.equal(reads, 1, "Un seul historique pour toutes les courses et leurs temps.");
  result = await context.resolveEngagementIndividualEntriesForSwimmer({}, [entry], { missingEntryTimeMode: "manual" });
  assert.equal(result[0].entryTimeMode, "manual", "Sans grille, la saisie autorisée reste disponible.");
  vm.runInContext(section(backend, "function cleanEngagementEntryRelays(", "function qualificationRelays"), context);
  const relay = context.cleanEngagementEntryRelays([{ relayId: "relay", eventCode: "4X100SF", category: "C", manualEntryTime: "00:45.00" }], { ...competition, events: [{ code: "4X100SF", type: "relay" }] }, []);
  assert.equal(relay[0].entryTimeValue, 4500, "La grille ne bloque pas le temps manuel des relais.");
  const field = {}, hint = {}, checkbox = { checked: true };
  const ui = { selectedEngagementCompetition: competition, elements: { engagementsEditMissingEntryTimeMode: field }, canEditEngagementCompetition: () => true,
    document: { querySelector: (selector) => selector.includes("data-q-enabled") ? checkbox : hint } };
  vm.createContext(ui);
  vm.runInContext(section(portal, "  function engagementManualIndividualTimesAllowed(", "  function renderQualificationJobActions("), ui);
  assert.equal(ui.engagementManualIndividualTimesAllowed(), false);
  ui.updateEngagementManualEntryTimeField(); assert.equal(field.disabled, true); assert.equal(field.value, "default595999"); assert.equal(hint.hidden, false);
  checkbox.checked = false; ui.updateEngagementManualEntryTimeField(); assert.equal(field.disabled, false); assert.equal(hint.hidden, true);
  console.log("Temps individuels automatiques : ancien mode manuel, appel direct, lectures et exception relais OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
