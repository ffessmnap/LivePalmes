"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

async function main() {
  const nodes = new Map(), requests = [];
  const document = {
    querySelector: selector => nodes.get(selector.slice(1)),
    createElement: () => {
      const handlers = new Map();
      const node = {
        dataset: {},
        addEventListener: (name, fn) => handlers.set(name, fn),
        emit: name => handlers.get(name)?.(),
        remove: () => nodes.delete(node.id)
      };
      return node;
    },
    body: { appendChild: node => { nodes.set(node.id, node); requests.push(node); } }
  };
  const window = {}, sandbox = { window, document, Promise, Error };
  vm.runInNewContext(fs.readFileSync("assets/portal/modules-and-clubs.js", "utf8"), sandbox);
  const forbidden = new Proxy({}, {
    get() { throw Error("Module creation must not read data or portal state"); }
  });
  const module = window.LivePalmesPortalModulesAndClubs.create({ state: forbidden, config: forbidden, actions: forbidden });
  const first = module.loadScriptOnce("module.js", "module");
  const simultaneous = module.loadScriptOnce("module.js", "module");
  assert.equal(first, simultaneous, "Concurrent openings share one request");
  requests[0].emit("error");
  await assert.rejects(first, /Chargement impossible/);
  assert.equal(nodes.size, 0);
  const retry = module.loadScriptOnce("module.js", "module");
  assert.notEqual(retry, first);
  assert.equal(requests.length, 2, "A real fresh request follows a failure");
  requests[1].emit("load");
  await retry;
  await module.loadScriptOnce("module.js", "module");
  assert.equal(requests.length, 2, "Successful modules remain shared");
  console.log("Portal module loader: real factory, concurrent requests, failed request retry and successful reuse passed offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
