const assert = require("node:assert/strict");
const {
  engagementSwimmerChangeResolutionMail,
  swimmerChangeLines
} = require("../functions/engagement-swimmer-change-mail");

const current = {
  lastName: "VILLEGA",
  firstName: "Anais",
  birthDate: "2012-03-26",
  sex: "F",
  licenseNumber: ""
};
const resolved = {
  ...current,
  firstName: "Anna",
  licenseNumber: "A-24-1050358"
};

assert.deepEqual(swimmerChangeLines(current, resolved), [
  "- Prénom : Anna",
  "- Numéro de licence : A-24-1050358"
]);

const approved = engagementSwimmerChangeResolutionMail({
  decision: "approved",
  requestedByFirstName: "Camille",
  swimmer: current,
  current,
  resolvedProposed: resolved,
  clubName: "Union Sportive Palaiseau",
  resolutionNote: "Correction vérifiée."
});
assert.match(approved.subject, /validée$/);
assert.match(approved.text, /^Bonjour Camille,/);
assert.match(approved.text, /VILLEGA Anais \(Union Sportive Palaiseau\)/);
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
