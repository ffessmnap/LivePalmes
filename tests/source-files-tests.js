"use strict";
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { unindentCode } = require("./helpers/source-files");
const original = 'function generated() {\n    return `Entête\n  ligne avec deux espaces\n\n    ligne avec quatre espaces\n`;\n  }';
const text = vm.runInNewContext("(" + unindentCode(original, 2) + ")")();
assert.equal(text, "Entête\n  ligne avec deux espaces\n\n    ligne avec quatre espaces\n");
const escaped = 'function generated() {\n    return "TXT\\\n  suite";\n  }';
assert.equal(vm.runInNewContext("(" + unindentCode(escaped, 2) + ")")(), "TXT  suite");
console.log("Logical source contracts preserve exact multiline HTML/mail/TXT contents while adjusting code indentation.");

{
  const { restoreNativeImportPaths } = require("./helpers/source-files");
  const source = 'function run(){function shadow(require){return require("./nap-portal-pool");}const text="./nap-portal-pool";return require("./nap-portal-pool").portalPool();}';
  const restored = restoreNativeImportPaths(source, require("node:path").resolve("functions/index.js"));
  assert(restored.includes('return require("./nap-portal-swimmers").portalPool()'));
  assert(restored.includes('shadow(require){return require("./nap-portal-pool");}'));
  assert(restored.includes('const text="./nap-portal-pool"'));
}

{
  const helper = require("./helpers/source-files"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
  const dependency = Buffer.from("fixture source"), entry = { text: "expanded fixture", dependencies: { "functions/fixture.js": helper.digest(dependency) } };
  assert(helper.cacheMatches(entry, () => dependency));
  assert.equal(helper.cacheMatches(entry, () => Buffer.from("changed")), false);
  assert.equal(helper.cacheMatches(entry, () => { throw Error("missing"); }), false);
  assert.equal(helper.cacheMatches({ ...entry, dependencies: { "../outside": helper.digest(dependency) } }, () => dependency), false);
  const originalFile = process.env.LP_SOURCE_CACHE_FILE, originalHash = process.env.LP_SOURCE_CACHE_SHA256;
  const parent = fs.realpathSync(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent, "lp-source-cache-contract-"));
  try {
    // Recompute the actual contract once and compare every byte, not a snapshot
    // of a few assertions; exported expandedSource always remains uncached.
    const cache = helper.buildSourceCache(), bytes = Buffer.from(JSON.stringify(cache));
    const file = path.join(directory, "sources.json"); fs.writeFileSync(file, bytes);
    process.env.LP_SOURCE_CACHE_FILE = file; process.env.LP_SOURCE_CACHE_SHA256 = helper.digest(bytes);
    for (const name of Object.keys(cache.entries)) {
      assert(helper.cacheMatches(cache.entries[name]));
      assert.equal(helper.readFileSync(path.resolve(name), "utf8"), cache.entries[name].text);
    }
    process.env.LP_SOURCE_CACHE_SHA256 = "0".repeat(64);
    assert.throws(() => helper.readFileSync(path.resolve("functions/index.js"), "utf8"), /Cache.*altere/);
    process.env.LP_SOURCE_CACHE_SHA256 = helper.digest(bytes);
    const expected = cache.entries["functions/index.js"].text;
    cache.entries["functions/index.js"].text = "STALE VIEW MUST NOT BE USED";
    cache.entries["functions/index.js"].dependencies["functions/index.js"] = "0".repeat(64);
    const stale = Buffer.from(JSON.stringify(cache)); fs.writeFileSync(file, stale);
    process.env.LP_SOURCE_CACHE_SHA256 = helper.digest(stale);
    assert.equal(helper.readFileSync(path.resolve("functions/index.js"), "utf8"), expected);
    // A cache never supplies the raw source used for runtime/selection tests.
    assert.deepEqual(helper.readFileSync(path.resolve("functions/index.js")), fs.readFileSync(path.resolve("functions/index.js")));
  } finally {
    if (originalFile === undefined) delete process.env.LP_SOURCE_CACHE_FILE; else process.env.LP_SOURCE_CACHE_FILE = originalFile;
    if (originalHash === undefined) delete process.env.LP_SOURCE_CACHE_SHA256; else process.env.LP_SOURCE_CACHE_SHA256 = originalHash;
    assert.equal(path.dirname(path.resolve(directory)), parent); fs.rmSync(directory, { recursive: true, force: true });
  }
  console.log("Cache des contrats : sortie exacte, toutes les dependances attestees, source modifiee/absente invalidee, sources brutes preservees.");
}
