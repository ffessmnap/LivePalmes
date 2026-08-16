const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  findReferenceSwimmerCorrectionTarget,
  referenceSwimmerIds,
  swimmerMergeIds,
  recoveredPerformanceRowsAreComplete
} = require(path.join(root, "functions", "engagement-swimmer-corrections.js"));

const reference = [
  {
    id: "20325",
    sourceIds: ["20325"],
    identityKey: "VILLEGA|ANAIS|2012-03-26",
    firstName: "Anaïs",
    lastName: "VILLEGA"
  },
  {
    id: "canonical-2",
    sourceIds: ["legacy-2"],
    aliases: ["old-2"],
    identityKey: "DUPONT|LINA|2009-07-24"
  }
];

assert.deepEqual(referenceSwimmerIds(reference[1]), ["canonical-2", "legacy-2", "old-2"]);
assert.deepEqual(swimmerMergeIds(reference[1], "public-row-2"), ["public-row-2", "canonical-2", "legacy-2", "old-2"]);
assert.equal(recoveredPerformanceRowsAreComplete([
  { id: "official-1" },
  { id: "intermediate-1", isIntermediate: true },
  { id: "intermediate-2", isIntermediate: true }
], 3), true);
assert.equal(recoveredPerformanceRowsAreComplete([{ id: "official-1" }], 2), false);

const missingFirestoreIndex = findReferenceSwimmerCorrectionTarget(reference, {
  swimmerId: "20325",
  identityKey: "VILLEGA|ANAIS|2012-03-26"
});
assert.equal(missingFirestoreIndex.swimmer?.id, "20325");
assert.equal(missingFirestoreIndex.matchedBy, "id");

const historicalAlias = findReferenceSwimmerCorrectionTarget(reference, {
  swimmerId: "old-2",
  identityKey: "DUPONT|LINA|2009-07-24"
});
assert.equal(historicalAlias.swimmer?.id, "canonical-2");

const staleIdentity = findReferenceSwimmerCorrectionTarget(reference, {
  swimmerId: "20325",
  identityKey: "VILLEGA|ANNA|2012-03-26"
});
assert.equal(staleIdentity.swimmer, null);
assert.equal(staleIdentity.stale, true);

const ambiguousReference = findReferenceSwimmerCorrectionTarget([
  { id: "one", sourceIds: ["shared"], identityKey: "ONE" },
  { id: "two", sourceIds: ["shared"], identityKey: "TWO" }
], { swimmerId: "shared" });
assert.equal(ambiguousReference.swimmer, null);
assert.equal(ambiguousReference.ambiguous, true);

assert.equal(findReferenceSwimmerCorrectionTarget(reference, { swimmerId: "unknown" }).swimmer, null);

console.log("Engagement swimmer correction tests: OK");
