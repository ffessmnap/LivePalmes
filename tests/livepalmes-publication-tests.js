const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;
require(path.join(__dirname, "..", "assets", "livepalmes-publication.js"));

const publication = global.LivePalmesPublication;

assert.equal(publication.publicIndexByteSize({ label: "é" }), Buffer.byteLength(JSON.stringify({ label: "é" }), "utf8"));

{
  const report = publication.publicIndexSizeReport({ rows: [1, 2, 3] }, { warningBytes: 1, maxBytes: 1000 });
  assert.equal(report.warning, true);
  assert.equal(report.tooLarge, false);
}

assert.throws(
  () => publication.assertPublicIndexSize("Index test", { payload: "x".repeat(100) }, { warningBytes: 10, maxBytes: 20 }),
  /Index test trop lourd/
);

console.log("LivePalmes publication size tests OK");
