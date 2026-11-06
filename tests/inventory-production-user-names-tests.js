"use strict";
const assert = require("node:assert/strict");
const { collect, details, ENDPOINT } = require("../tools/inventory-production-user-names");
const { prepare } = require("../tools/user-name-correction-plan");
const document = i => ({ name: `projects/livepalmes/databases/(default)/documents/users/fiction-${i}`, updateTime: "2026-10-30T00:00:00.123456789Z",
  fields: { firstName: { stringValue: "NOM" }, lastName: { stringValue: "Prénom fictif" }, status: { stringValue: "active" } } });
function response(data) { return { ok: true, body: [Buffer.from(JSON.stringify(data))] }; }
(async () => {
  let calls = 0;
  const result = await collect({ token: "fictional", fetcher: async (url, options) => {
    assert.equal(options.method, "GET"); assert.equal(options.redirect, "error");
    assert.equal(url.origin + url.pathname, ENDPOINT);
    assert.equal(url.searchParams.get("pageSize"), "100");
    assert.equal(url.searchParams.get("orderBy"), "__name__");
    calls++;
    return calls === 1 ? response({ documents: [document(1)], nextPageToken: "fiction-next" }) : response({ documents: [document(2)] });
  } });
  assert.equal(result.documents.length, 2); assert.equal(result.requests, 2);
  assert.equal(prepare(result.documents, "fiction-inventory-only").entries.length, 2);
  assert.equal(details(result.documents).active, 2);
  await assert.rejects(collect({ token: "fictional", fetcher: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
  await assert.rejects(collect({ token: "fictional", fetcher: async () => response({ documents: [document(1)], nextPageToken: "repeat" }) }), /Stuck pagination/);
  await assert.rejects(collect({ token: "fictional", fetcher: async () => response({ documents: Array.from({ length: 101 }, (_, i) => document(i)) }) }), /Oversized page/);
  let page = 0;
  await assert.rejects(collect({ token: "fictional", fetcher: async url => {
    const size = Number(url.searchParams.get("pageSize"));
    if (page === 10) assert.equal(size, 1);
    const offset = page++ * 100;
    return response({ documents: Array.from({ length: size }, (_, i) => document(offset + i)), nextPageToken: `page-${page}` });
  } }), /Profile budget exceeded/);
  assert.equal(page, 11);
  const missing = document(4); delete missing.fields.firstName; missing.fields.lastName = { nullValue: null };
  const anomalies = details([missing]);
  assert.equal(anomalies.missingFirstName, 1); assert.equal(anomalies.nullLastName, 1);
  console.log("Inventaire utilisateurs : GET seul, cible PROD fixe, pagination, plafond/sentinelle, refus 403 et comptages verifies avec services fictifs.");
})().catch(() => { console.error("Echec des simulations fictives d'inventaire."); process.exitCode = 1; });
