"use strict";
// Explicit offline test double. Never imported by publication tooling.
// Retired JSON contributes its original blob identity, never its contents.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const cp = require("node:child_process"), realGit = cp.execFileSync;
const ROOT = path.resolve(__dirname, "../.."), FILE = path.join(__dirname, "history-fixtures.json");
const SEAL = "1258f38e1b2c2147f37a9554d818deb7819dd3eb35f7b858c469ab0cb47eb312";
const INPUTS = ["functions", "tools/prepare-firebase-test-functions.js", "tools/firebase-test-backend-lots.js",
  "tools/prepare-production-functions.js", "firestore.rules"];
const SHA = /^[a-f0-9]{40}$/;
const RETIRED = new Set(["functions/assets/intranap-swimmers-index.json", "functions/intranap-swimmers-reference.json"]);
const JSON_SOURCE = new Set(["functions/config/performance-import-timing.json", "functions/config/calendar-result-associations.json",
  "functions/config/dtn-season-2025-2026.json", "functions/nap-competition-create-schema.json",
  "functions/assets/public-home-template.json", "functions/assets/nap-public-documents-index.json"]);
const SYMBOL = Symbol.for("livepalmes.historicalTestFixture");
let catalogue;
const views = new Map(), contents = new Map();
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
function requireProof(value) { if (!value) throw Error("Historical test input refused"); }
function safe(name) { return typeof name === "string" && !name.startsWith("/") && !name.includes("\\") && name.split("/").every(p => p && p !== "." && p !== ".."); }
function decode(row) {
  const m = /^(100644|100755) blob ([a-f0-9]{40})\t([^\t\r\n]+)$/.exec(row);
  requireProof(m && safe(m[3])); return { mode: m[1], blob: m[2], name: m[3], row };
}
function validate(raw, seal = SEAL) {
  requireProof(raw.length < 4 * 1024 ** 2 && digest(raw) === seal);
  const data = JSON.parse(raw);
  requireProof(Object.keys(data).sort().join() === "commits,kind,schema,scope"
    && data.schema === 1 && data.kind === "historical-test-inputs-only" && JSON.stringify(data.scope) === JSON.stringify(INPUTS)
    && Object.keys(data.commits).length > 0 && Object.keys(data.commits).length <= 100);
  for (const [old, item] of Object.entries(data.commits)) {
    requireProof(Object.keys(item).sort().join() === "cleanRowsSha256,metadataOnly,rewritten,rows"
      && SHA.test(old) && SHA.test(item.rewritten) && old !== item.rewritten
      && /^[a-f0-9]{64}$/.test(item.cleanRowsSha256) && Array.isArray(item.rows) && item.rows.length <= 1200
      && Array.isArray(item.metadataOnly) && new Set(item.metadataOnly).size === item.metadataOnly.length
      && item.metadataOnly.every(p => RETIRED.has(p)));
    const entries = item.rows.map(decode);
    requireProof(new Set(entries.map(e => e.name)).size === entries.length
      && entries.every(e => data.scope.some(p => e.name === p || e.name.startsWith(p + "/"))));
  }
  return data;
}
function load() { return catalogue ||= validate(fs.readFileSync(FILE).toString("utf8").replace(/\r\n/g, "\n")); }
function rawGit(args, options = {}) { return realGit("git", args, { cwd: ROOT, maxBuffer: 64 * 1024 ** 2, ...options }); }
function checkRows(item, observed, original) {
  if (original) requireProof(observed === item.rows.join("\n") + "\n");
  else {
    requireProof(digest(observed) === item.cleanRowsSha256);
    const rows = observed.trimEnd().split("\n").filter(Boolean);
    requireProof(rows.length === item.rows.length - item.metadataOnly.length
      && rows.every(row => item.rows.includes(row))
      && item.rows.filter(row => !rows.includes(row)).every(row => item.metadataOnly.includes(decode(row).name)));
  }
}
function view(commit) {
  if (views.has(commit)) return views.get(commit);
  const data = load(), item = data.commits[commit]; requireProof(item);
  const type = rawGit(["cat-file", "--batch-check=%(objecttype)"], { encoding: "utf8", input: commit + "\n" }).trim();
  requireProof(type === "commit" || type === commit + " missing");
  const original = type === "commit";
  const source = original ? commit : item.rewritten;
  const observed = rawGit(["ls-tree", "-r", source, "--", ...data.scope], { encoding: "utf8" });
  checkRows(item, observed, original);
  const result = { source, entries: item.rows.map(decode) }; views.set(commit, result); return result;
}
function bytes(commit, name, metadataBatch = false) {
  requireProof(safe(name));
  const v = view(commit), entry = v.entries.find(e => e.name === name); requireProof(entry);
  // The snapshot parsers only use the identity of non-package JSON inputs.
  if (!name.endsWith(".js") && name !== "firestore.rules" && !JSON_SOURCE.has(name)) {
    requireProof(metadataBatch); return { entry, data: Buffer.alloc(0) };
  }
  const key = v.source + ":" + name;
  if (!contents.has(key)) {
    const data = rawGit(["show", key]);
    const oid = crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest("hex");
    requireProof(oid === entry.blob); contents.set(key, data);
  }
  return { entry, data: contents.get(key) };
}
function output(data, options) { return options?.encoding && options.encoding !== "buffer" ? data.toString(options.encoding) : data; }
function fixtureGit(command, args, options = {}) {
  if (command !== "git" || path.resolve(options.cwd || process.cwd()) !== ROOT) return realGit(command, args, options);
  const known = load().commits;
  if (args[0] === "cat-file" && args[1] === "--batch" && options.input) {
    const names = options.input.toString().trimEnd().split("\n");
    if (!names.some(n => known[n.slice(0, 40)])) return realGit(command, args, options);
    requireProof(names.length <= 1200 && names.every(n => known[n.slice(0, 40)] && n[40] === ":"));
    const chunks = names.map(n => { const { entry, data } = bytes(n.slice(0, 40), n.slice(41), true);
      return Buffer.concat([Buffer.from(`${entry.blob} blob ${data.length}\n`), data, Buffer.from("\n")]); });
    return output(Buffer.concat(chunks), options);
  }
  if (!args.some(a => typeof a === "string" && known[a.slice(0, 40)])) return realGit(command, args, options);
  if (args[0] === "show" && args.length === 2 && args[1][40] === ":")
    return output(bytes(args[1].slice(0, 40), args[1].slice(41)).data, options);
  if (args[0] === "ls-tree") {
    const commit = args.find(a => SHA.test(a) && known[a]); requireProof(commit);
    const split = args.indexOf("--"), filters = split < 0 ? [] : args.slice(split + 1);
    requireProof(filters.every(p => safe(p) && load().scope.some(s => p === s || p.startsWith(s + "/"))));
    const entries = view(commit).entries.filter(e => !filters.length || filters.some(p => e.name === p || e.name.startsWith(p + "/")));
    return output(Buffer.from(entries.map(e => args.includes("--name-only") ? e.name : e.row).join("\n") + (entries.length ? "\n" : "")), options);
  }
  if (args[0] === "diff" && args.includes("--name-only")) {
    const ids = args.filter(a => SHA.test(a));
    requireProof(ids.length === 2 && ids.every(c => known[c]));
    const split = args.indexOf("--"), filters = split < 0 ? [] : args.slice(split + 1);
    requireProof(filters.length && filters.every(p => load().scope.includes(p)));
    const maps = ids.map(c => new Map(view(c).entries.filter(e => filters.some(p => e.name === p || e.name.startsWith(p + "/"))).map(e => [e.name, e.row])));
    const changed = [...new Set([...maps[0].keys(), ...maps[1].keys()])].filter(p => maps[0].get(p) !== maps[1].get(p)).sort();
    return output(Buffer.from(changed.join("\n") + (changed.length ? "\n" : "")), options);
  }
  throw Error("Historical test Git command outside fixture scope");
}
function install() {
  const entry = path.relative(ROOT, path.resolve(process.argv[1] || "")).replaceAll("\\", "/");
  requireProof(/^tests\/[a-z0-9-]+-tests\.js$/.test(entry));
  if (entry === "tests/release-excluded-backend-compatibility-tests.js")
    requireProof(process.argv.length === 2 || process.argv[6] === "--history-fixture");
  if (!globalThis[SYMBOL]) { cp.execFileSync = fixtureGit; globalThis[SYMBOL] = true; }
}
module.exports = { install, validate, checkRows, fixtureGit, bytes, ROOT, SYMBOL };
if (require.main === module) {
  try { requireProof(process.argv[2] === "read" && process.argv[4] === "firestore.rules");
    process.stdout.write(bytes(process.argv[3], process.argv[4]).data); }
  catch { console.error("Historical test source refused"); process.exitCode = 1; }
}
