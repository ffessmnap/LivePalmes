const assert = require("node:assert/strict");
const { engagementAccessAcknowledgement } = require("../functions/portal-access-mail");

const personalized = engagementAccessAcknowledgement({
  firstName: "  Camille  ",
  clubName: "  Palmes Atlantique  "
});

assert.equal(personalized.subject, "Votre demande d’accès LivePalmes a bien été reçue");
assert.match(personalized.text, /^Bonjour Camille,/);
assert.match(
  personalized.text,
  /réception de votre demande d’accès LivePalmes pour le club Palmes Atlantique\./
);
assert.match(personalized.text, /responsable régional ou national/);
assert.match(personalized.text, /L’équipe LivePalmes/);
assert.match(personalized.text, /Commission Nationale Nage avec Palmes – FFESSM$/);
assert.doesNotMatch(personalized.text, /undefined|null/);

const generic = engagementAccessAcknowledgement();
assert.match(generic.text, /^Bonjour,/);
assert.match(generic.text, /réception de votre demande d’accès LivePalmes\./);
assert.doesNotMatch(generic.text, /pour le club/);

console.log("Tests du mail d’accusé de réception du portail réussis.");
