"use strict";
// Presentation bridge only. Native rows are retained beside the existing UI
// shape, rather than passed through cleaners that discard unknown old entries.
const { createHash } = require("node:crypto");



const { text, code, nativeCourseCode, json } = require("./nap-competition-view-values");

// These are distinct existing relay definitions. Only remove the legacy
// display suffix, never change BI into SB or discard the native course row.


const { fingerprint } = require("./nap-competition-fingerprint");
const { listItem } = require("./nap-competition-list-item");
const { competitionItem } = require("./nap-competition-view");
const { nativeTime, entryItem, entryWithCourseRules } = require("./nap-entry-view");
// At most one bounded reference query for an entire restricted dossier.
// No extra read when there are no native course restrictions.


const { readDocuments } = require("./nap-workspace-documents");
module.exports = { json, fingerprint, listItem, competitionItem, nativeTime, entryItem, entryWithCourseRules, readDocuments, nativeCourseCode };
