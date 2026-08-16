const assert = require("node:assert/strict");
const {
  engagementSwimmerChangeResolutionMail,
  swimmerChangeLines
} = require("../functions/engagement-swimmer-change-mail");

const current = {
  lastName: "HOTELFICTIF",
  firstName: "Alphafictif",
  birthDate: "2012-01-01",
  sex: "F",
  licenseNumber: ""
};
const resolved = {
  ...current,
  firstName: "Anna",
  licenseNumber: "A-24-0000001"
};

assert.deepEqual(swimmerChangeLines(current, resolved), [
  "- Prénom : Anna",
  "- Numéro de licence : A-24-0000001"
]);

const approved = engagementSwimmerChangeResolutionMail({
  decision: "approved",
  requestedByFirstName: "Charliefictif",
  swimmer: current,
  current,
  resolvedProposed: resolved,
  clubName: "Union Sportive Palaiseau",
  resolutionNote: "Correction vérifiée."
});
assert.match(approved.subject, /validée$/);
assert.match(approved.text, /^Bonjour Charliefictif,/);
assert.match(approved.text, /HOTELFICTIF Alphafictif \(Union Sportive Palaiseau\)/);
assert.match(approved.text, /- Prénom : Anna/);
assert.match(approved.text, /Commentaire de l’administrateur national : Correction vérifiée\./);
assert.match(approved.text, /fiche du nageur a été mise à jour/);
assert.match(approved.text, /La Commission Nationale Nage avec Palmes – FFESSM$/);
assert.doesNotMatch(approved.text, /L’équipe LivePalmes/);

const rejected = engagementSwimmerChangeResolutionMail({
  decision: "rejected",
  swimmer: current,
  current,
  resolvedProposed: resolved
});
assert.match(rejected.subject, /refusée$/);
assert.match(rejected.text, /^Bonjour,/);
assert.match(rejected.text, /Aucune modification n’a été appliquée/);
assert.doesNotMatch(rejected.text, /Informations retenues/);
assert.doesNotMatch(rejected.text, /undefined|null/);

console.log("Tests du mail de résolution des corrections nageur réussis.");
