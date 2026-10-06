"use strict";
const assert = require("node:assert/strict");
const { parisDeadline, entryState } = require("../functions/nap-paris-time");
assert.equal(parisDeadline("2026-10-07 21:59:00").iso, "2026-10-07T19:59:00.000Z");
assert.equal(parisDeadline("2026-12-07 21:59:00").iso, "2026-12-07T20:59:00.000Z");
assert.equal(parisDeadline("2026-03-29 02:30:00").warning, "invalid-native-deadline");
assert.equal(parisDeadline("2026-10-25 02:30:00").warning, "ambiguous-native-deadline");
assert.equal(parisDeadline("2026-02-30 12:00:00").iso, "");
assert.equal(parisDeadline(null).iso, "");
assert.equal(entryState({actif:0,date_limit:"2026-10-07 21:59:00"},Date.parse("2026-10-07T19:58:00Z")).entryStatus,"upcoming");
assert.equal(entryState({actif:1,date_limit:"2026-10-07 21:59:00"},Date.parse("2026-10-07T19:58:00Z")).entryStatus,"open");
assert.equal(entryState({actif:1,date_limit:"2026-10-07 21:59:00"},Date.parse("2026-10-07T19:59:00Z")).entryStatus,"closed");
assert.equal(entryState({actif:0,entry_closed:1,date_limit:"2026-10-07 21:59:00"},Date.parse("2026-10-07T19:58:00Z")).entryStatus,"closed");
// A native reopening overrides an old LivePalmes closure marker.
assert.equal(entryState({actif:1,entry_closed:1,date_limit:"2026-10-07 21:59:00"},Date.parse("2026-10-07T19:58:00Z")).entryStatus,"open");
console.log("Delais NAP : heure civile de Paris, ete/hiver, limites et horloges ambigues verifies.");
