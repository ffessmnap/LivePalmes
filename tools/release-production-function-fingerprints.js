"use strict";
// Selection only. Historical authorization/exclusion contracts still use the
// legacy hashes. Never execute source code from the candidate or old revisions.
const crypto = require("node:crypto");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const shared = require("./release-test-function-fingerprints");
const PREPARER = "1f06e059d7b9379915d12f9a84f8f3d418232a35";

function analyse(input) {
  let registry = { ...input.registry }, contexts = {};
  try {
    if (!registry.known || input.productionPreparer !== PREPARER) throw new Error("Unknown production preparation");
    const ast = acorn.parse(input.registrySource, { ecmaVersion: "latest", sourceType: "script" });
    const data = {};
    for (const statement of ast.body) for (const d of statement.declarations || []) {
      if (["LOTS", "ALL_SAFE_LOTS", "NAP_RETIRED_FUNCTIONS", "NAP_UNUSED_FUNCTIONS"].includes(d.id.name))
        data[d.id.name] = shared.literal(d.init.arguments[0]);
    }
    const retired = new Set([...data.NAP_RETIRED_FUNCTIONS, ...(data.NAP_UNUSED_FUNCTIONS || [])]);
    const names = data.ALL_SAFE_LOTS.flatMap(lot => data.LOTS[lot]).filter(name => !retired.has(name));
    if (new Set(names).size !== names.length || names.some(name => [...data.LOTS.email, ...data.LOTS.schedulers].includes(name)))
      throw new Error("Invalid ordinary production exports");
    // Moving a function to/from a sensitive lot must change that function's
    // selection hash even when TEST still exports it as an explicit exception.
    for (const [lot, members] of Object.entries(data.LOTS)) for (const name of members)
      (contexts[name] ||= []).push(lot);
    for (const list of Object.values(contexts)) list.sort();
    registry = { ...registry, names: names.sort() };
  } catch {
    registry = { ...registry, known: false, signature: input.registrySource, names: [] };
    contexts = {};
  }
  const result = shared.analyse({ ...input, registry });
  for (const name of Object.keys(result.functions)) result.functions[name] = crypto.createHash("sha256")
    .update(JSON.stringify([result.functions[name], contexts[name] || []])).digest("hex");
  return { ...result, schema: "production-selection-v1" };
}

function fromGit(root, sha) { return analyse(shared.snapshot(root, sha, { production: true })); }
module.exports = { fromGit, analyse };
if (require.main === module) console.log(JSON.stringify(fromGit(process.argv[2], process.argv[3])));
