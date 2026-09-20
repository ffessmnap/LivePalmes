"use strict";
const assert = require("node:assert/strict");
const { functionMetadata, releaseMetadata, listPages } = require("../tools/audit-firebase-release");

async function main() {
  const sanitized = functionMetadata({ name: "function", environmentVariables: { PASSWORD: "secret-value" },
    serviceConfig: { environmentVariables: { PASSWORD: "secret-value" }, revision: "revision" },
    buildConfig: { runtime: "nodejs22", source: { storageSource: { bucket: "bucket", object: "code.zip", generation: "42" } } },
    sourceUploadUrl: "secret-value", labels: { private: "secret-value", "firebase-functions-hash": "hash" } });
  assert(!JSON.stringify(sanitized).includes("secret-value"));
  assert.equal(sanitized.revision, "revision");
  assert.equal(sanitized.source.generation, "42");
  assert(!JSON.stringify(releaseMetadata({ version: { name: "version", config: { secret: "secret-value" } }, releaseUser: { email: "secret-value" } })).includes("secret-value"));
  let calls = 0;
  const rows = await listPages("https://example.test/list", "functions", "token", async (url, options) => {
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, "Bearer token");
    calls++;
    if (calls === 1) return { ok: true, json: async () => ({ functions: [1], nextPageToken: "second" }) };
    assert.equal(url.searchParams.get("pageToken"), "second");
    return { ok: true, json: async () => ({ functions: [2] }) };
  });
  assert.deepEqual(rows, [1, 2]);
  await assert.rejects(listPages("https://example.test/list", "functions", "token", async () => ({ ok: false, status: 403 })), /HTTP 403/);
  await assert.rejects(listPages("https://example.test/list", "functions", "token", async () => ({ ok: true, json: async () => ({ unreachable: ["region"] }) })), /inaccessibles/);
  await assert.rejects(listPages("https://example.test/list", "functions", "token", async () => ({ ok: true, json: async () => ({ nextPageToken: "same" }) })), /Pagination repetee/);
  console.log("Audit Firebase: pagination, refus d'acces, regions inaccessibles et exclusion des secrets valides.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
