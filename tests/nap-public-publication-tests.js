"use strict";
const assert = require("node:assert/strict");
const { publish } = require("../tools/publish-nap-public-test");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
async function main() {
  const parent = path.resolve("outputs");
  fs.mkdirSync(parent, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(parent, "nap-publication-test-"));
  try {
    const file = path.join(scratch, "file.json"); fs.writeFileSync(file, "{}");
    const plan = { prefix: "performance-public-nap/versions/20261006-v1", manifest: { rowCount: 1 },
      files: [{ full: file, name: "ids/12.json" }, { full: file, name: "manifest.json" }] };
    const order = [];
    const bucket = { getFiles: async () => [[]], upload: async (full, options) => {
      assert.equal(options.preconditionOpts.ifGenerationMatch, 0);
      assert.ok(options.destination.startsWith(plan.prefix + "/"));
      order.push(options.destination);
      return [{ metadata: { md5Hash: crypto.createHash("md5").update(fs.readFileSync(full)).digest("base64") } }];
    } };
    await publish(plan, bucket);
    assert.equal(order.at(-1), plan.prefix + "/manifest.json");
    await assert.rejects(publish(plan, { ...bucket, getFiles: async () => [[{}]] }), /ecrasement refuse/);
    await assert.rejects(publish(plan, { ...bucket, upload: async () => [{ metadata: { md5Hash: "wrong" } }] }), /Empreinte/);
  } finally {
    const relative = path.relative(parent, scratch);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  console.log("Publication NAP : version immuable, empreintes et manifeste final verifies.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
