"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const functionsSource = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");
const portalSource = fs.readFileSync(path.join(root, "portail.html"), "utf8");
const portalScriptSource = fs.readFileSync(path.join(root, "assets", "livepalmes-admin-portal.js"), "utf8");

assert.match(functionsSource, /function cleanEngagementEntryOfficial[\s\S]*birthDate: cleanIsoDate\(raw\.birthDate\)/);
assert.match(functionsSource, /exports\.saveEngagementClubOfficials[\s\S]*birthDate: person\.birthDate/);
assert.match(functionsSource, /function engagementOfficialsPdfRows[\s\S]*left\.club\.localeCompare[\s\S]*left\.lastName\.localeCompare[\s\S]*left\.firstName\.localeCompare/);
assert.match(functionsSource, /function buildEngagementOfficialsPdf[\s\S]*label: "Club"[\s\S]*label: "Nom"[\s\S]*label: "Prénom"[\s\S]*label: "Date de naissance"[\s\S]*label: "Licence"/);
assert.match(functionsSource, /async function prepareEngagementOfficialsEmailJob[\s\S]*type: "officials_pdf"[\s\S]*toEmail: officialsManagerEmail/);
assert.match(functionsSource, /async function prepareEngagementOfficialsEmailJob[\s\S]*competition\.officialsRequired !== true[\s\S]*skippedReason: "officials_not_required"/);
assert.match(functionsSource, /processEngagementCompetitionAutomaticClosure[\s\S]*prepareEngagementOfficialsEmailJob[\s\S]*type: "officials_pdf"/);
assert.match(functionsSource, /where\("competitionId", "==", competitionId\)[\s\S]*limit\(500\)/);
assert.match(functionsSource, /missingPersonIds\.length > 5000/);

assert.match(portalSource, /id="adminEngagementsEditOfficialsManagerEmail"/);
assert.match(portalScriptSource, /engagementsEditOfficialsManagerEmail: document\.querySelector\("#adminEngagementsEditOfficialsManagerEmail"\)/);
assert.match(portalScriptSource, /officialsManagerEmail: elements\.engagementsEditOfficialsManagerEmail/);

console.log("LivePalmes officials PDF tests: OK");
