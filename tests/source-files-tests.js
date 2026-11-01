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
