"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const consumers = require("./a3-production-wif-consumers");

async function main() {
  const raw = fs.readFileSync(path.resolve(__dirname, "../.github/releases/evidence/20261119-a4-publication-dependencies.json"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(crypto.createHash("sha256").update(raw).digest("hex"), "01f762c1f7dd21511f2626e2bfe24f41e886aaeb7b378e10d9cc46cd3cf73167");
  const plan = JSON.parse(raw);
  const directory = fs.realpathSync(process.env.A4_PUBLICATION_DEPENDENCIES);
  assert.equal(path.basename(directory), "a4-publication-dependencies");
  for (const [name, expected] of Object.entries(plan.files)) {
    const file = path.join(directory, name);
    assert.equal(fs.realpathSync(file), file);
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), expected);
  }
  await consumers.main(directory, plan.profile);
}

main().catch(() => {
  process.stderr.write("Qualification des consommateurs A4 refusée.\n");
  process.exitCode = 1;
});
