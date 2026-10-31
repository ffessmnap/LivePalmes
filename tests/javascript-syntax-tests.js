"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkFiles, listJsFiles } = require("../tools/check-javascript-syntax");

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-syntax-"));
  try {
    const write = (name, source) => {
      const file = path.join(directory, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, source);
      return file;
    };
    const valid = write("valid with spaces.js", "const a = 1;");
    const invalid = write("nested/invalid.js", "const = ;");
    write("node_modules/ignored.js", "const = ;");
    write("archives/ignored.js", "const = ;");
    write("other.txt", "const = ;");
    assert.deepEqual(listJsFiles(directory).sort(), [valid, invalid].sort());
    for (const concurrency of [1, 4]) {
      assert.equal(await checkFiles([valid], concurrency), 1);
      await assert.rejects(checkFiles([valid, invalid, path.join(directory, "missing.js")], concurrency), error =>
        error.message.includes(invalid) && error.message.includes("missing.js"));
    }
    assert.equal(await checkFiles([]), 0);
    await assert.rejects(checkFiles([valid], 0), /Parallelisme invalide/);
    console.log("Verification syntaxe : couverture, erreurs et parallelisme OK.");
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
