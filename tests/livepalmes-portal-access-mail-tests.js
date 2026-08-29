const assert = require("node:assert/strict");
const {
  engagementAccessAcknowledgement,
  engagementAccessRejection,
  engagementExistingAccountNotice,
  engagementAccessAdminNotification,
  engagementAccessAdminNotificationRecipients,
  MAIL_SIGNATURE
} = require("../functions/portal-access-mail");

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
assert.doesNotMatch(personalized.text, /L’équipe LivePalmes/);
assert.match(personalized.text, new RegExp(`${MAIL_SIGNATURE}$`));
assert.doesNotMatch(personalized.text, /undefined|null/);

const generic = engagementAccessAcknowledgement();
assert.match(generic.text, /^Bonjour,/);
assert.match(generic.text, /réception de votre demande d’accès LivePalmes\./);
assert.doesNotMatch(generic.text, /pour le club/);

const rejected = engagementAccessRejection({
  firstName: "Camille",
  clubName: "Palmes Atlantique",
  resolutionReason: "Le numéro de licence ne correspond pas au demandeur."
});
assert.equal(rejected.subject, "Votre demande d’accès LivePalmes a été refusée");
assert.match(rejected.text, /^Bonjour Camille,/);
assert.match(rejected.text, /concernant le club Palmes Atlantique/);
assert.match(rejected.text, /Motif : Le numéro de licence ne correspond pas au demandeur\./);
assert.doesNotMatch(rejected.text, /undefined|null/);
assert.match(rejected.text, new RegExp(`${MAIL_SIGNATURE}$`));

const existingActive = engagementExistingAccountNotice({
  firstName: "Camille",
  status: "active",
  clubCode: "PA",
  clubName: "Palmes Atlantique"
});
assert.equal(existingActive.subject, "Votre compte LivePalmes existe déjà");
assert.match(existingActive.text, /PA - Palmes Atlantique/);
assert.match(existingActive.text, /Mot de passe oublié/);
assert.match(existingActive.text, /livepalmes@nap-ffessm\.fr/);
assert.match(existingActive.text, new RegExp(`${MAIL_SIGNATURE}$`));
assert.doesNotMatch(existingActive.text, /L’équipe LivePalmes/);

const existingInactive = engagementExistingAccountNotice({
  status: "inactive",
  clubName: "Palmes Atlantique"
});
assert.equal(existingInactive.subject, "Votre compte LivePalmes doit être réactivé");
assert.match(existingInactive.text, /actuellement désactivé/);
assert.match(existingInactive.text, /réactivation/);
assert.doesNotMatch(existingInactive.text, /Mot de passe oublié/);
assert.match(existingInactive.text, new RegExp(`${MAIL_SIGNATURE}$`));

const regionalNotification = engagementAccessAdminNotification({
  recipientFirstName: "Morgan",
  firstName: "Camille",
  lastName: "Martin",
  clubCode: "PA",
  clubName: "Palmes Atlantique",
  regionName: "Bretagne",
  clubRole: "Présidente"
});
assert.equal(regionalNotification.subject, "Nouvelle demande d’accès LivePalmes - PA - Palmes Atlantique");
assert.match(regionalNotification.text, /^Bonjour Morgan,/);
assert.match(regionalNotification.text, /Demandeur : Camille Martin/);
assert.match(regionalNotification.text, /Fonction dans le club : Présidente/);
assert.match(regionalNotification.text, /#gestion-demandes-acces/);
assert.doesNotMatch(regionalNotification.text, /validation nationale/);
assert.match(regionalNotification.text, new RegExp(`${MAIL_SIGNATURE}$`));

const nationalNotification = engagementAccessAdminNotification({
  firstName: "Camille",
  lastName: "Martin",
  newClubRequested: true,
  newClub: { clubCode: "NC", clubName: "Nouveau Club" },
  regionId: "6"
});
assert.match(nationalNotification.subject, /NC - Nouveau Club$/);
assert.match(nationalNotification.text, /nécessite une validation nationale/);
assert.match(nationalNotification.text, new RegExp(`${MAIL_SIGNATURE}$`));

const notificationRecipients = [
  { email: "bretagne@example.test", regionId: "Bretagne Pays de la Loire", capabilities: ["engagements.region.manage"] },
  { email: "bretagne@example.test", regionId: "Bretagne Pays de la Loire", capabilities: ["engagements.region.manage"] },
  { email: "normandie@example.test", regionId: "Normandie", capabilities: ["engagements.region.manage"] },
  { email: "national@example.test", regionId: "", capabilities: ["engagements.national.manage"] }
];
assert.deepEqual(
  engagementAccessAdminNotificationRecipients(notificationRecipients, { regionId: "Bretagne Pays de la Loire" })
    .map((recipient) => recipient.email),
  ["bretagne@example.test"]
);
assert.deepEqual(
  engagementAccessAdminNotificationRecipients(notificationRecipients, {
    regionId: "Bretagne Pays de la Loire",
    newClubRequested: true
  }).map((recipient) => recipient.email),
  ["bretagne@example.test", "national@example.test"]
);

console.log("Tests du mail d’accusé de réception du portail réussis.");
