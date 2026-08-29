const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { mergeSeedDelta, shouldExportRow } = require("../tools/sync-performance-firestore-delta");

async function run() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-performance-delta-"));
  const base = path.join(temp, "base.ndjson");
  const output = path.join(temp, "delta.ndjson");
  const valid = { performanceBaseId: "a", active: true, status: "active", course: "100SF", sex: "M", category: "S", timeValue: 4000 };
  const removed = { ...valid, performanceBaseId: "b", active: false, status: "hidden" };
  const added = { ...valid, performanceBaseId: "c", timeValue: 3900 };
  fs.writeFileSync(base, `${JSON.stringify(valid)}\n${JSON.stringify({ ...valid, performanceBaseId: "b" })}\n`, "utf8");

  const result = await mergeSeedDelta({
    base,
    output,
    changes: [{ ...valid, timeValue: 3950 }, removed, added]
  });
  const rows = fs.readFileSync(output, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(result.baseRows, 2);
  assert.equal(result.writtenRows, 2);
  assert.equal(result.updatedRows, 2);
  assert.equal(result.removedRows, 1);
  assert.equal(result.addedRows, 1);
  assert.deepStrictEqual(rows.map((row) => row.performanceBaseId).sort(), ["a", "c"]);
  assert.equal(rows.find((row) => row.performanceBaseId === "a").timeValue, 3950);
  assert.equal(shouldExportRow({ ...valid, course: "25SF" }), false);

  fs.rmSync(temp, { recursive: true, force: true });
  console.log("Performance Firestore delta tests: OK");
}

run().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
