const assert = require("node:assert/strict");
const { napPoolOptions, performanceRequest, readSwimmerPerformances } = require("../functions/nap-mysql");

async function main() {
  assert.throws(() => napPoolOptions("password", ""));
  const options = napPoolOptions("dummy", "-----BEGIN CERTIFICATE-----\ndummy\n-----END CERTIFICATE-----");
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.multipleStatements, false);
  for (const input of [{}, { swimmerId: "1 OR 1=1" }, { swimmerId: -1 }, { swimmerId: 1, afterId: -1 }, { swimmerId: 1, afterId: "0" }]) {
    assert.throws(() => performanceRequest(input));
  }
  let calls = 0;
  const pool = { execute: async (query, values) => {
    calls++;
    assert.match(query.sql, /WHERE nageur = \? AND id > \? ORDER BY id LIMIT 51$/);
    assert.doesNotMatch(query.sql, /INSERT|UPDATE|DELETE/);
    assert.deepEqual(values, [12, 100]);
    return [Array.from({ length: 51 }, (_, i) => ({ id: 101 + i, tps: "001234" }))];
  } };
  const result = await readSwimmerPerformances(pool, { swimmerId: 12, afterId: 100 });
  assert.equal(calls, 1);
  assert.equal(result.items.length, 50);
  assert.equal(result.nextAfterId, 150);
  assert.equal(result.hasMore, true);
  assert.equal(result.items[0].tps, "001234");
  const empty = await readSwimmerPerformances({ execute: async () => [[]] }, { swimmerId: 12 });
  assert.equal(empty.nextAfterId, null);
  assert.equal(empty.hasMore, false);
  console.log("NAP : validation, chiffrement obligatoire, lecture bornee et pagination verifies sans connexion reseau.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
