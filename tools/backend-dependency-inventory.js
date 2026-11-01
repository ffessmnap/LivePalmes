"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { model } = require("./backend-factory-model");

function inventory(root) {
  const m = model(root);
  const exportIds = new Map([...m.roots.keys()].sort().map((name, index) => [name, index]));
  return {
    schema: 1,
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    scope: "All static Firebase exports and private factory methods; analysis only, never a deployment selection",
    exports: [...m.roots].map(([name, direct]) => ({ id: exportIds.get(name), name, direct, closureCount: m.closure(direct).length })),
    factories: [...m.factories.values()].map(f => ({ accessor: f.accessor, file: f.file, factory: f.factory.id.name,
      initializedStatements: f.other.length,
      methods: [...f.methods.keys()].map(name => ({ name, dependencies: m.nodes.get(f.accessor + ":" + name).edges,
        consumers: m.consumers.get(f.accessor + ":" + name).map(name => exportIds.get(name)) })) })),
    identityPairs: m.identityPairs, opaque: m.opaque, warnings: m.warnings
  };
}
module.exports = { inventory };
if (require.main === module) {
  const root = path.resolve(__dirname, ".."), value = inventory(root);
  const destination = process.argv[2];
  if (destination) fs.writeFileSync(path.resolve(root, destination), JSON.stringify(value, null, 2) + "\n");
  console.log(JSON.stringify({ exports: value.exports.length, factories: value.factories.length,
    methods: value.factories.reduce((sum, f) => sum + f.methods.length, 0), opaque: value.opaque,
    warnings: value.warnings }));
}
