"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const vm = require("node:vm");
const portal = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8");
const records = fs.readFileSync("performances/public/admin-records.js", "utf8");
async function loader(name, end) {
  const loaded = [];
  const context = { global: { LivePalmesEnvironment: { sportingDataSource: "nap" }, firebase: { firestore: {} } },
    elements: {}, recordModuleLoadPromise: null, importModuleLoadPromise: null,
    loadScriptOnce: async src => { assert.ok(fs.existsSync(src.split("?")[0]), src); loaded.push(src); },
    watchRecordWorkbench() {}, watchImportWorkbench() {} };
  vm.runInNewContext(portal.slice(portal.indexOf(`  function ${name}(`), portal.indexOf(`  function ${end}(`)), context);
  assert.notEqual(await context[name](), null, "module loading must succeed");
  assert.ok(loaded.length);
  assert.ok(!loaded.some(src => /intranap-summary|performance-public/.test(src)), "NAP must not require removed exports");
}
(async () => {
  await loader("loadRecordModule", "watchImportWorkbench");
  await loader("loadImportModule", "capabilityLabel");
  const options = { innerHTML: "" }, help = {}, calls = [];
  let complete;
  const context = { URL, Map, Set, window: { LivePalmesEnvironment: { sportingDataSource: "nap", napReaderUrl: "https://example.test/reader" } },
    document: { querySelector: () => options }, elements: { fieldName: {}, fieldBirthDateHelp: help },
    referenceSwimmers: [], swimmerSearchRequestId: 0, swimmerSearchPending: new Map(), swimmerSearchShards: new Map(),
    allowedSwimmerSexes: row => row.mixed ? ["F", "M"] : [row.sex], escapeHtml: value => value,
    updateBirthDateField() {}, fetch: async (url, init) => {
      calls.push(url); assert.equal(init.cache, "no-store"); assert.equal(new URL(url).searchParams.get("action"), "search");
      await new Promise(resolve => { complete = resolve; });
      return { ok: true, json: async () => ({ source: "nap", swimmers: [
        { id: "1", name: "Alice Martin", sex: "F", birthDate: "2000-01-02", clubId: "10" },
        { id: "2", name: "Alain Martin", sex: "M", birthDate: "2001-01-02", clubId: "20" }
      ] }) };
    } };
  vm.createContext(context);
  vm.runInContext(records.slice(records.indexOf("function recordSwimmerSearchShard"), records.indexOf("function isUsableBirthDate")), context);
  await context.updateSwimmerOptions({ swimmer: "A", sex: "F" }); assert.equal(calls.length, 0);
  const first = context.updateSwimmerOptions({ swimmer: "Martin", sex: "F" });
  const same = context.updateSwimmerOptions({ swimmer: "Martin", sex: "F" });
  assert.equal(calls.length, 1, "identical pending requests shared"); complete(); await Promise.all([first, same]);
  assert.equal(context.referenceSwimmers.length, 1); assert.equal(context.referenceSwimmers[0][0], "1");
  assert.equal(context.referenceSwimmers[0][3], "2000-01-02"); assert.equal(context.referenceSwimmers[0][4], "10");
  const stale = context.updateSwimmerOptions({ swimmer: "Martin", mixed: true });
  await context.updateSwimmerOptions({ swimmer: "", sex: "F" }); complete(); await stale;
  assert.equal(options.innerHTML, "", "clearing input invalidates in-flight result");
  const mixed = context.updateSwimmerOptions({ swimmer: "Martin", mixed: true }); complete(); await mixed;
  assert.equal(context.referenceSwimmers.length, 2);
  context.fetch = async () => { throw new Error("offline"); };
  await context.updateSwimmerOptions({ swimmer: "Martin", sex: "F" });
  assert.equal(context.referenceSwimmers.length, 0); assert.match(help.textContent, /indisponibles/);
  assert.equal(context.swimmerSearchPending.size, 0, "failure remains retryable");
  console.log("NAP portal: lazy loaders require existing assets; swimmer suggestions bounded, sex/identity preserved, stale responses and errors handled without writes.");
})().catch(error => { console.error(error); process.exitCode = 1; });
