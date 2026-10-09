const assert = require("node:assert/strict");
const { napPoolOptions, performanceRequest, readSwimmerPerformances } = require("../functions/nap-mysql");

async function main() {
  assert.throws(() => napPoolOptions(""));
  const options = napPoolOptions("dummy");
  assert.deepEqual(options.ssl, { rejectUnauthorized: false });
  assert.equal(options.password, "dummy");
  assert.equal(options.multipleStatements, false);
  for (const input of [{}, { swimmerId: "1 OR 1=1" }, { swimmerId: -1 }, { swimmerId: 1, afterId: -1 }, { swimmerId: 1, afterId: "0" }]) {
    assert.throws(() => performanceRequest(input));
  }
  let calls = 0;
  const pool = { execute: async (query, values) => {
    calls++;
    assert.match(query.sql, /AND nageur = \? AND id > \? ORDER BY id LIMIT 51$/);
    assert.match(query.sql, /lpv\.performance_id=perfs\.id AND lpv\.hidden=1/);
    assert.match(query.sql, /FORCE INDEX \(PRIMARY\)/);
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
  const firstPage = await readSwimmerPerformances({ execute: async (query, values) => {
    assert.deepEqual(values, [12, -1]);
    return [[{ id: 0, tps: "004686" }]];
  } }, { swimmerId: 12, afterId: null });
  assert.equal(firstPage.items[0].id, 0, "La performance NAP d'identifiant zero doit etre conservee.");
  await readSwimmerPerformances({ execute: async (query, values) => {
    assert.deepEqual(values, [12, 0]);
    return [[]];
  } }, { swimmerId: 12, afterId: 0 });
  console.log("NAP : validation, chiffrement obligatoire, lecture bornee et pagination verifies sans connexion reseau.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
