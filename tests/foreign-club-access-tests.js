"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const { createDirectoryService } = require("../functions/server-directory-service");
const { engagementAccessAdminNotificationRecipients, engagementAccessAcknowledgement } = require("../functions/portal-access-mail");
const { isForeignClubRegion } = require("../functions/club-access-policy");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }

async function main() {
  let reads = 0;
  const clubs = new Map([
    ["10", { clubId: "10", clubName: "Club français", regionId: "3" }],
    ["20", { clubId: "20", clubName: "Club étranger", regionId: "5" }]
  ]);
  const context = {
    HttpsError, ENVIRONMENT: { sportingDataSource: "legacy" }, ENGAGEMENT_CLUBS_COLLECTION: "clubs",
    CLUB_REFERENCE_BY_ID: clubs, cleanText: value => String(value ?? "").trim(),
    normalizeEmail: value => String(value).trim().toLowerCase(), assertEmail: value => assert.match(value, /@/),
    cleanClubPayload: club => club,
    engagementClubRegionId: club => ({ 3: "Ile de France", 5: "CMAS" }[club.regionId] || club.regionId),
    db: { collection: name => { assert.equal(name, "clubs"); return { doc: id => {
      assert.ok(clubs.has(id) || id === "999");
      return { get: async () => { reads++; return { exists: false }; } };
    } }; } }
  };
  const service = createDirectoryService(context);
  const input = { firstName: "Alice", lastName: "Exemple", email: "alice@example.test", clubId: "20", regionId: "CMAS", licenseNumber: "" };
  for (const regionId of ["CMAS", "5", "Clubs étrangers (CMAS)", "Autre / code 5"]) {
    assert.equal(isForeignClubRegion(regionId), true);
    const clean = service.cleanEngagementAccessRequestPayload({ ...input, regionId });
    assert.equal(clean.regionId, "CMAS");
    assert.equal(clean.licenseNumber, "");
    const before = reads;
    const resolved = await service.resolveExistingClubForAccessRequest(clean);
    assert.equal(reads - before, 1);
    assert.equal(resolved.clubName, "Club étranger");
    assert.equal(resolved.regionId, "CMAS");
    assert.throws(() => service.assertEngagementAccessRequestScope({ region: true, regionId }, resolved), /niveau national/);
    assert.doesNotThrow(() => service.assertEngagementAccessRequestScope({ national: true }, resolved));
  }
  assert.throws(() => service.cleanEngagementAccessRequestPayload({ ...input, regionId: "Ile de France", clubId: "10" }), /obligatoires/);
  // A forged CMAS label cannot waive the licence of a French club.
  await assert.rejects(service.resolveExistingClubForAccessRequest({ ...input, clubId: "10" }), /licence FFESSM/);
  await assert.rejects(service.resolveExistingClubForAccessRequest({ ...input, clubId: "999" }), /introuvable/);
  const domestic = await service.resolveExistingClubForAccessRequest({ ...input, clubId: "10", licenseNumber: "A-12-34567" });
  assert.equal(domestic.regionId, "Ile de France");
  const concealed = await service.resolveExistingClubForAccessRequest({ ...input, regionId: "Ile de France", licenseNumber: "EXTERNAL-123" });
  assert.equal(concealed.regionId, "CMAS");
  assert.equal(concealed.licenseNumber, "EXTERNAL-123");
  assert.throws(() => service.assertEngagementAccessRequestScope({ region: true, regionId: "Ile de France" }, concealed), /niveau national/);
  assert.doesNotThrow(() => service.assertEngagementAccessRequestScope({ region: true, regionId: "Ile de France" }, domestic));
  const recipients = [
    { email: "national@example.test", capabilities: ["engagements.national.manage"] },
    { email: "regional@example.test", regionId: "CMAS", capabilities: ["engagements.region.manage"] },
    { email: "idf@example.test", regionId: "Ile de France", capabilities: ["engagements.region.manage"] }
  ];
  assert.deepEqual(engagementAccessAdminNotificationRecipients(recipients, input).map(r => r.email), ["national@example.test"]);
  assert.match(engagementAccessAcknowledgement(input).text, /responsable national/);
  assert.doesNotMatch(engagementAccessAcknowledgement(input).text, /responsable régional/);
  assert.deepEqual(engagementAccessAdminNotificationRecipients(recipients, domestic).map(r => r.email), ["idf@example.test"]);

  // Exercise the actual NAP lookup and its primary-key LIMIT 1, without a network.
  const poolPath = require.resolve("../functions/nap-portal-pool");
  const originalPool = require.cache[poolPath];
  let queries = 0;
  require.cache[poolPath] = { exports: { portalPool: () => ({ execute: async query => {
    queries++;
    assert.match(query.sql, /FORCE INDEX \(PRIMARY\) WHERE num_club = \? LIMIT 1/);
    assert.deepEqual(query.values, [20]);
    return [[{ num_club: 20, nom_club: "Club étranger", comite_club: 5, actif_club: 1 }]];
  } }) } };
  try {
    context.ENVIRONMENT.sportingDataSource = "nap";
    assert.equal((await service.resolveExistingClubForAccessRequest(input)).regionId, "CMAS");
    assert.equal(queries, 1);
  } finally { if (originalPool) require.cache[poolPath] = originalPool; else delete require.cache[poolPath]; }
  console.log("Foreign club accounts: optional licence, trusted club region, bounded lookup, national decisions and recipients OK.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
