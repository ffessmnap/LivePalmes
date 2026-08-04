const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;
global.LIVEPALMES_RECORDS = {
  records: [{ key: "fallback-mpf" }],
  franceRecords: [{ key: "fallback-rf", birthDate: "2000-01-01" }],
  filters: { courses: ["50SF"] },
  updatedAt: "old"
};
global.LivePalmesRecordPlaceholders = { completeData: (data) => data };
const requests = [];
global.fetch = async (url, options) => {
  requests.push({ url, cache: options?.cache });
  if (url.endsWith("/records/manifest.json")) {
    return { ok: true, json: async () => ({ dataPath: "records/versions/0123456789abcdefabcd.json" }) };
  }
  return {
    ok: true,
    json: async () => ({
      records: [{ key: "current-mpf" }],
      franceRecords: [{ key: "fallback-rf" }],
      filters: { courses: ["100SF"] },
      updatedAt: "2026-08-04T12:00:00.000Z"
    })
  };
};

require(path.join(__dirname, "..", "performances", "public", "store.js"));

(async () => {
  const data = await global.LivePalmesPerformanceStore.loadData();
  assert.equal(data.records[0].key, "current-mpf");
  assert.equal(data.franceRecords[0].birthDate, "2000-01-01");
  assert.equal(data.updatedAt, "2026-08-04T12:00:00.000Z");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].cache, "no-store");
  assert.equal(requests[1].cache, "force-cache");
  assert.match(requests[1].url, /performance-public-firestore\/records\/versions\/0123456789abcdefabcd\.json$/);
  console.log("LivePalmes public records store tests OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
