"use strict";
// Existing singleton, values or query bodies; no business change.
const { cleanText: __nativeMember0, swimmerIdentityKey: __nativeMember1 } = require("./nap-performance-identity");
const rules = { cleanText: __nativeMember0, swimmerIdentityKey: __nativeMember1 };
const licenseState = require("./nap-license-state");
const { fingerprint } = require("./nap-swimmer-identity-values");
function person(row) {
  const firstName = rules.cleanText(row.prenom), lastName = rules.cleanText(row.nom), id = String(row.id);
  return { id, swimmerId: id, swimmerIndexId: id, source: "reference", napSource: true, napFingerprint: fingerprint(row),
    ...require("./nap-swimmer-ns-state").state(row), napNsFingerprint: require("./nap-swimmer-ns-state").fingerprint(row),
    ...(row.actif !== undefined ? {active: require("./nap-swimmer-activity-state").status(row) === "active", clubActivityStatus: require("./nap-swimmer-activity-state").status(row), napActivityFingerprint: require("./nap-swimmer-activity-state").fingerprint(row)} : {}),
    ...licenseState.state(row), ...(row.merged_into_id ? {active:false,status:"merged",mergedIntoId:String(row.merged_into_id),mergedIntoSource:"reference"} : {}), firstName, lastName, name: [firstName, lastName].join(" "), birthDate: row.date, sex: row.sexe,
    clubId: String(row.club || ""), club: rules.cleanText(row.abre_club || row.nom_club), clubName: rules.cleanText(row.nom_club),
    identityKey: rules.swimmerIdentityKey(firstName, lastName, row.date), sourceIds: [id] };
}

module.exports = { person };
