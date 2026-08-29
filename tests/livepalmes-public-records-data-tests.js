const assert = require("node:assert/strict");
const {
  publicRecordsDataPath,
  publicRecordsManifest,
  publicRecordsPayload,
  publicRecordsVersion,
  shouldPublishRecordsManifest
} = require("../functions/public-records-data");

const source = {
  records: [{ key: "mpf-1", time: "42.00" }],
  franceRecords: [{ key: "rf-1", time: "18.00" }],
  filters: { courses: ["50SF"] },
  recordHistory: [{ private: "inutile côté public" }],
  sourceDate: "2026-08-04",
  updatedAt: "2026-08-04T10:00:00.000Z"
};
const payload = publicRecordsPayload(source);
assert.equal(Object.hasOwn(payload, "recordHistory"), false);
assert.equal(payload.records.length, 1);
assert.match(publicRecordsVersion(payload), /^[a-f0-9]{20}$/);

const manifest = publicRecordsManifest(payload, "2026-08-04T10:00:01.000Z");
assert.equal(manifest.dataPath, publicRecordsDataPath(manifest.version));
assert.equal(manifest.recordCount, 1);
assert.equal(manifest.franceRecordCount, 1);
assert.equal(shouldPublishRecordsManifest({}, manifest), true);
assert.equal(shouldPublishRecordsManifest({ eventTime: "2026-08-04T10:00:02.000Z" }, manifest), false);
assert.throws(() => publicRecordsPayload({ records: [], filters: {} }), /listes manquantes/);

console.log("LivePalmes public records data tests OK");
