const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { SOURCES, PAGE_SIZE, exportRequest, readExportPage, inspectExportSources } = require("../functions/nap-public-export");

(async () => {
  for (const input of [{}, { table: ["perfs"], through: 2 }, { table: "perfs; DROP TABLE perfs", through: 2 },
    { table: "perfs", after: -2, through: 3 }, { table: "perfs", after: 4, through: 3 },
    { table: "perfs", through: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.throws(() => exportRequest(input), TypeError);
  }
  assert.deepEqual(exportRequest({ table: "perfs", through: "7" }), { table: "perfs", after: -1, through: 7 });
  const pool = { execute: async (query, values) => {
    assert.match(query.sql, /^SELECT /);
    assert.match(query.sql, /WHERE `id` > \? AND `id` <= \? ORDER BY `id` LIMIT 2001$/);
    assert.deepEqual(values, [-1, 5000]);
    assert.equal(query.timeout, 10000);
    return [Array.from({ length: PAGE_SIZE + 1 }, (_, id) => ({ id }))];
  } };
  const page = await readExportPage(pool, { table: "perfs", through: 5000 });
  assert.equal(page.items[0].id, 0);
  assert.equal(page.items.length, PAGE_SIZE);
  assert.equal(page.hasMore, true);
  assert.equal(page.next, PAGE_SIZE - 1);
  assert.equal(page.through, 5000);
  let queries = 0;
  const metadataPool = { execute: async (query) => {
    queries++;
    if (query.sql.includes("STATISTICS")) {
      return [Object.entries(SOURCES).map(([TABLE_NAME, spec]) => ({ TABLE_NAME, COLUMN_NAME: spec.key, SEQ_IN_INDEX: 1 }))];
    }
    if (query.sql.includes("information_schema")) {
      return [Object.entries(SOURCES).flatMap(([table, spec]) => spec.columns.map(column => ({
        TABLE_NAME: table, COLUMN_NAME: column, COLUMN_TYPE: "int(11)", COLUMN_KEY: column === spec.key ? "PRI" : ""
      })))];
    }
    assert.match(query.sql, /^SELECT MAX\(`/);
    return [[{ through: "5000" }]];
  } };
  const metadata = await inspectExportSources(metadataPool);
  assert.equal(queries, 6);
  assert.equal(metadata.bounds.perfs, 5000);
  await assert.rejects(inspectExportSources({ execute: async () => [[]] }), /incompatible/);
  await assert.rejects(inspectExportSources({ execute: async query => {
    const [rows] = await metadataPool.execute(query);
    return [query.sql.includes("STATISTICS") ? [...rows, { TABLE_NAME: "perfs", COLUMN_NAME: "nageur", SEQ_IN_INDEX: 2 }] : rows];
  } }), /pagination/);
  for (const { columns } of Object.values(SOURCES)) {
    assert.equal(columns.some(c => /password|email|telephone|licen[sc]e|adresse/i.test(c)), false);
  }
  const root = path.resolve(__dirname, "..");
  const endpoint = JSON.parse(execFileSync(process.execPath, ["-e", "console.log(JSON.stringify(require('./functions/index').exportNapPublicPage.__endpoint));"], {
    cwd: root, encoding: "utf8", env: { ...process.env, GCLOUD_PROJECT: "livepalmes-test", GOOGLE_CLOUD_PROJECT: "livepalmes-test", LIVEPALMES_ENFORCE_APP_CHECK: "false" }
  }));
  assert.deepEqual(endpoint.httpsTrigger.invoker, ["github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com"]);
  assert.deepEqual(endpoint.secretEnvironmentVariables.map(s => s.key), ["LIVEPALMES_NAP_PASSWORD"]);
  assert.equal(endpoint.maxInstances, 2);
  const production = execFileSync(process.execPath, ["-e", "console.log(typeof require('./functions/index').exportNapPublicPage);"], {
    cwd: root, encoding: "utf8", env: { ...process.env, GCLOUD_PROJECT: "livepalmes", GOOGLE_CLOUD_PROJECT: "livepalmes", LIVEPALMES_ENFORCE_APP_CHECK: "false" }
  });
  assert.equal(production.trim(), "undefined");
  console.log("Export NAP : sources fixes, champs publics, id zero, pagination bornee et structure verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
