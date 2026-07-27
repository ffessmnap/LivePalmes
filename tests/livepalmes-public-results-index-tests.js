const assert = require("node:assert/strict");
const {
  nextPublicResultsIndex,
  publicResultPayload
} = require("../functions/public-results-index.js");

const officialResult = {
  id: "result-1",
  eventLabel: "50 m surface",
  updatedAt: "2026-07-27T10:00:00.000Z",
  status: "published",
  ranking: [{ rank: 1, firstName: "Alice", pdfDataUrl: "private" }],
  finalists: {
    a: [{ rank: 1, firstName: "Alice", repechaged: true, repechageAnnouncedAt: "2026-07-27T10:00:00.000Z" }],
    b: []
  },
  pdfDataUrl: "data:application/pdf;base64,AA=="
};

{
  const payload = publicResultPayload("result-1", officialResult);
  assert.equal(payload.id, "result-1");
  assert.equal(payload.ranking[0].firstName, "Alice");
  assert.equal(Object.hasOwn(payload, "pdfDataUrl"), false);
  assert.equal(Object.hasOwn(payload.ranking[0], "pdfDataUrl"), false);
}

{
  const currentIndex = {
    results: [
      { id: "result-1", ranking: [{ firstName: "Mallory" }] },
      { id: "result-2", eventLabel: "100 m surface" }
    ],
    updatedAt: "old",
    sourceLabel: "Résultats officiels"
  };
  const update = nextPublicResultsIndex(currentIndex, "result-1", officialResult);
  assert.equal(update.results.length, 2);
  assert.equal(update.results[0].ranking[0].firstName, "Alice");
  assert.deepEqual(update.results[1], currentIndex.results[1]);
  assert.equal(update.updatedAt, officialResult.updatedAt);
  assert.equal(Object.hasOwn(update, "sourceLabel"), false);
}

{
  const currentIndex = { results: [{ id: "result-2" }] };
  const update = nextPublicResultsIndex(currentIndex, "result-1", officialResult);
  assert.deepEqual(update.results.map((result) => result.id), ["result-1", "result-2"]);
}

{
  const offlineIndex = { publicAccess: { online: false }, results: [] };
  assert.equal(nextPublicResultsIndex(offlineIndex, "result-1", officialResult), null);
}

console.log("LivePalmes public results index tests OK");
