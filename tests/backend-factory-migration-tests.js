"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { model, parse, walk } = require("../tools/backend-factory-model");
const { render, apply } = require("../tools/isolate-backend-factories");
const { verify, canonical } = require("../tools/verify-backend-factory-isolation");
const { expandedSource } = require("./helpers/source-files");

const baseline = "ac677ad530aab6b121b3a038accc0fb4860fa5e6";
const originalIndex = fs.readFileSync("functions/index.js", "utf8");
const result = render(process.cwd(), baseline);
const proof = verify(result);
assert.equal(proof.exports, 157);
assert.equal(proof.bodies, 635);
assert.equal(proof.groups, 419);
assert.equal(proof.networkCalls, 0);
const progress = JSON.parse(fs.readFileSync("docs/releases/backend-isolation-progress.json", "utf8"));
const applied = render(process.cwd(), baseline, progress.appliedFactories);
const actual = new Map([...applied.outputs.keys()].map(file => [file, fs.readFileSync(file, "utf8")]));
const actualProof = verify(applied, actual);
assert.equal(actualProof.exports, 157, "Verify actual committed runtime, not only a virtual preview");
assert.equal(actualProof.result, "success");
for (const f of result.m.factories.values()) if (f.snapshotBindings.size) {
  assert(!result.outputs.has(f.file), "Preserve captured factory interface and initialization");
  assert.equal(fs.readFileSync(f.file, "utf8").replace(/\r\n/g, "\n"), f.text.replace(/\r\n/g, "\n"));
}
const relative = file => path.relative(process.cwd(), file).replaceAll("\\", "/");
const loadBefore = file => result.snapshot.files[relative(file)]?.source;
const loadAfter = file => result.outputs.get(relative(file)) ?? loadBefore(file);
const logicalFile = path.join(process.cwd(), "functions/index.js");
const logicalBefore = parse(expandedSource(logicalFile, result.snapshot.source, loadBefore));
const logicalAfter = parse(expandedSource(logicalFile, result.outputs.get("functions/index.js"), loadAfter));
const removedAccessors = new Set(result.groups.map(group => group.owner));
const providers = new Map(result.groups.map(group => [group.accessor, group]));
const oldStatements = logicalBefore.body.filter(n => !(n.type === "FunctionDeclaration" && removedAccessors.has(n.id.name)));
const newStatements = logicalAfter.body.filter(n => !(n.type === "FunctionDeclaration" && providers.has(n.id.name)));
assert.deepEqual(canonical(newStatements, { providers }), canonical(oldStatements), "All existing logical source contracts remain identical");

function changed(file, mutate) {
  const before = result.outputs.get(file), after = mutate(before);
  assert.notEqual(after, before, "Negative fixture must actually change source");
  const outputs = new Map(result.outputs); outputs.set(file, after);
  assert.throws(() => verify(result, outputs), undefined, "Unsafe migration must be refused: " + file);
}
const group = result.groups.find(g => g.owner === "serverAccessService" && g.locals.size && g.fields.size);
changed(group.file, source => {
  const factory = parse(source).body.find(n => n.type === "FunctionDeclaration");
  const method = factory.body.body.find(n => n.type === "FunctionDeclaration");
  return source.slice(0, method.body.start + 1) + '\nthrow new Error("changed business behavior");\n' + source.slice(method.body.start + 1);
});
changed(group.file, source => source + '\nrequire("node:fs").writeFileSync("unsafe", "never executed");\n');
changed("functions/index.js", source => source.replace('defineSecret("LIVEPALMES_NAP_PASSWORD")', 'defineSecret("OTHER_SECRET")'));
changed("functions/index.js", source => source + '\nexports.unapproved = onCall({}, () => null);\n');
changed("functions/index.js", source => source.replace("get cleanText() { return cleanText; }", "get cleanText() { return db; }"));
const local = [...group.locals][0], target = result.groups.find(g => g.owner === group.owner && g.names.includes(local));
changed("functions/index.js", source => source.replace(
  "get local$" + local + "() { return " + target.accessor + "()." + local + "; }",
  "get local$" + local + "() { return " + local + "; }"));
changed("functions/index.js", source => source.replace("!" + group.accessor + ".instance", "!" + group.accessor + ".wrongCache"));
changed("functions/index.js", source => source.replace(group.file + "#" + group.names[0], "functions/wrong-service.js#" + group.names[0]));
changed("functions/index.js", source => source.replace("set legacyQualificationService(value) { legacyQualificationService = value; }",
  "set legacyQualificationService(value) { legacyQualificationService = null; }"));
const imported = result.groups.find(g => /require\("\.\.\/\.\.\//.test(result.outputs.get(g.file)));
changed(imported.file, source => source.replace('require("../../', 'require("../../missing/'));
changed(group.f.file, source => source.replace("return backendContext.cleanText;", "return backendContext.db;"));
changed(group.f.file, source => '"use strict";\n' + source);
changed(group.f.file, source => source.replace("function " + group.f.factory.id.name, "async function " + group.f.factory.id.name));
changed(group.f.file, source => {
  const method = group.f.returnNames[0], target = result.groups.find(g => g.owner === group.owner && g.names.includes(method));
  const value = target.adapterAccessor + "()." + method;
  return source.replace(method + ": " + value, method + ": (...args) => " + value + "(...args)");
});

function mini(module, context = "get safe() { return rootSafe; }, get unused() { return rootUnused; }") {
  return model(process.cwd(), {
    source: `function rootSafe(){} function rootUnused(){} let cache;
      function service(){if(!service.instance)service.instance=require("./mini-service").createMiniService({${context}});return service.instance;}
      exports.first=onCall({},()=>service().first()); exports.second=onCall({},()=>service().second());`,
    files: { "functions/mini-service.js": { source: module } }
  });
}
const fixture = `function createMiniService(backendContext){
  function first(){ function nested(backendContext){ return backendContext.unused(); } return backendContext.safe(); }
  function second(){ return first; }
  return {first,second};
} module.exports={createMiniService};`;
const m = mini(fixture);
assert(m.nodes.get("service:first").edges.includes("index:rootSafe"));
assert(!m.nodes.get("service:first").edges.includes("index:rootUnused"), "Shadowed context is not an outer dependency");
assert.deepEqual(m.consumers.get("service:first"), ["first", "second"]);
assert.deepEqual(m.identityPairs, [["service:second", "service:first"]]);
assert.equal(m.opaque.length, 0);
const captured = mini('function createMiniService({safe: capturedSafe,unused}){function first(){return capturedSafe();}function second(){return unused();}return {first,second};}module.exports={createMiniService};');
assert.equal(captured.factories.get("service").snapshotBindings.get("capturedSafe"), "safe");
assert.deepEqual(captured.nodes.get("service:first").edges, ["index:rootSafe"]);
assert.throws(() => mini('function createMiniService({safe=123}){function first(){return safe;}return {first};}module.exports={createMiniService};'), /Unknown captured factory binding/);
assert(mini(fixture.replace("function first()", "let state=0; function first()")).warnings.length > 0, "Unknown factory state requires review");
assert.throws(() => mini(fixture, "safe: () => rootSafe()"), /Unknown context binding/);
const writable = mini(fixture, "get safe(){return rootSafe;},get state(){return cache;},set state(value){cache=value;}");
assert.equal(writable.factories.get("service").contextSetters.size, 1);
assert.throws(() => mini(fixture, "get safe(){return rootSafe;},get state(){return cache;},set state(value){rootSafe=value;}"), /Unknown writable context/);
assert.equal(fs.readFileSync("functions/index.js", "utf8"), originalIndex, "Preview never changes deployed sources");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-factory-migration-"));
try {
  const index = `function rootSafe(){return "safe";} function rootUnused(){return "unused";}
    function service(){if(!service.instance)service.instance=require("./mini-service").createMiniService({get safe(){return rootSafe;},get unused(){return rootUnused;}});return service.instance;}
    exports.first=onCall({},()=>service().first());exports.second=onCall({},()=>service().second());`;
  const module = `function createMiniService(backendContext){function first(){return backendContext.safe();}function second(){return backendContext.unused();}return {first,second};}module.exports={createMiniService};`;
  fs.mkdirSync(path.join(directory, "functions"));
  const indexFile = path.join(directory, "functions/index.js"), moduleFile = path.join(directory, "functions/mini-service.js");
  fs.writeFileSync(indexFile, index); fs.writeFileSync(moduleFile, module);
  const git = args => execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q"]); git(["add", "."]);
  git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture"]);
  const sha = git(["rev-parse", "HEAD"]).trim(), plan = render(directory, sha);
  fs.appendFileSync(indexFile, "\n// concurrent edit\n");
  assert.throws(() => apply(directory, plan), /modified outside planned migration/);
  assert.equal(fs.readFileSync(moduleFile, "utf8"), module, "No writes before all source guards pass");
  fs.writeFileSync(indexFile, index);
  const unexpected = path.join(directory, "functions/unexpected.js");
  fs.writeFileSync(unexpected, "module.exports={};");
  assert.throws(() => apply(directory, plan), /Unexpected backend source divergence/);
  fs.unlinkSync(unexpected);
  const escaped = { ...plan, outputs: new Map([...plan.outputs, ["../escape.js", "never write"]]) };
  assert.throws(() => apply(directory, escaped), /Unexpected or missing runtime output/);
  assert.equal(apply(directory, plan).result, "success");
  assert.equal(apply(directory, plan).result, "success", "Same plan resumes idempotently");
  assert.throws(() => render(directory, sha, ["unknown"]), /Unknown factory selection/);
  assert.throws(() => apply(directory, render(directory, sha, [])), /No new isolation/);
} finally {
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  fs.rmSync(directory, { recursive: true, force: true });
}
console.log("Backend factory migration: complete body/graph/interface proof and unsafe-change refusals passed offline.");
