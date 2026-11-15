"use strict";
// Explicit offline test double. Never imported by publication tooling.
// Retired JSON contributes its original blob identity, never its contents.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const cp = require("node:child_process"), realGit = cp.execFileSync;
const ROOT = path.resolve(__dirname, "../.."), FILE = path.join(__dirname, "history-fixtures.json");
const SEAL = "820ae19cfb7ce06f7696f3404363c236480b3479723b3c1a4d68f9f89c1c34d7";
const INPUTS = ["functions", "tools/prepare-firebase-test-functions.js", "tools/firebase-test-backend-lots.js",
  "tools/prepare-production-functions.js", "firestore.rules", "tests/helpers/source-files.js", "firebase.json"];
const METADATA_PATHS = ["functions/assets/club-reference.json", "performances/public/data/club-reference.js"];
const SHA = /^[a-f0-9]{40}$/;
const RETIRED = new Set(["functions/assets/intranap-swimmers-index.json", "functions/intranap-swimmers-reference.json"]);
const JSON_SOURCE = new Set(["functions/config/performance-import-timing.json", "functions/config/calendar-result-associations.json",
  "functions/config/dtn-season-2025-2026.json", "functions/nap-competition-create-schema.json",
  "functions/assets/public-home-template.json", "functions/assets/nap-public-documents-index.json", "firebase.json"]);
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
  requireProof(raw.length < 8 * 1024 ** 2 && digest(raw) === seal);
  const data = JSON.parse(raw);
  requireProof(Object.keys(data).sort().join() === "commits,diffs,kind,metadataPaths,schema,scope"
    && data.schema === 1 && data.kind === "historical-test-inputs-only" && JSON.stringify(data.scope) === JSON.stringify(INPUTS)
    && JSON.stringify(data.metadataPaths) === JSON.stringify(METADATA_PATHS)
    && Object.keys(data.commits).length > 0 && Object.keys(data.commits).length <= 100);
  for (const [old, item] of Object.entries(data.commits)) {
    requireProof(Object.keys(item).sort().join() === "cleanRowsSha256,cleanTree,metadataOnly,metadataRows,rewritten,rows,sourceTree"
      && SHA.test(old) && SHA.test(item.rewritten) && old !== item.rewritten
      && SHA.test(item.sourceTree) && SHA.test(item.cleanTree)
      && /^[a-f0-9]{64}$/.test(item.cleanRowsSha256) && Array.isArray(item.rows) && item.rows.length <= 1200
      && Array.isArray(item.metadataOnly) && new Set(item.metadataOnly).size === item.metadataOnly.length
      && item.metadataOnly.every(p => RETIRED.has(p)));
    const entries = item.rows.map(decode);
    requireProof(new Set(entries.map(e => e.name)).size === entries.length
      && entries.every(e => data.scope.some(p => e.name === p || e.name.startsWith(p + "/"))));
    requireProof(Array.isArray(item.metadataRows) && item.metadataRows.length <= 2
      && item.metadataRows.map(decode).every(e => METADATA_PATHS.includes(e.name)));
  }
  requireProof(Object.keys(data.diffs).length === 2);
  for (const [pair, paths] of Object.entries(data.diffs))
    requireProof(pair.split(":").length === 2 && pair.split(":").every(c => data.commits[c])
      && Array.isArray(paths) && paths.length <= 500 && paths.every(safe));
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
  requireProof(rawGit(["rev-parse", source + "^{tree}"], { encoding: "utf8" }).trim() === (original ? item.sourceTree : item.cleanTree));
  requireProof(rawGit(["ls-tree", "-r", source, "--", ...METADATA_PATHS], { encoding: "utf8" }) ===
    item.metadataRows.join("\n") + (item.metadataRows.length ? "\n" : ""));
  const result = { source, entries: item.rows.map(decode), metadata: item.metadataRows.map(decode) }; views.set(commit, result); return result;
}
function payload(name) { return name.endsWith(".js") || name === "firestore.rules" || JSON_SOURCE.has(name); }
function checkedContent(entry, data) {
  const oid=crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${data.length}\0`),data])).digest("hex");
  requireProof(oid===entry.blob);contents.set(entry.blob,data);
}
function prime(entries) {
  const missing=[...new Map(entries.filter(e=>payload(e.name)&&!contents.has(e.blob)).map(e=>[e.blob,e])).values()];
  if(!missing.length)return;
  requireProof(missing.length<=1200);
  const raw=rawGit(["cat-file","--batch"],{input:missing.map(e=>e.blob).join("\n")+"\n"});
  let offset=0;
  for(const entry of missing) {
    const end=raw.indexOf(10,offset), match=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(raw.subarray(offset,end).toString("utf8"));
    requireProof(end>=offset && match && match[1]===entry.blob);
    const size=Number(match[2]),start=end+1;
    requireProof(Number.isSafeInteger(size)&&size>=0&&size<=32*1024**2&&start+size<raw.length&&raw[start+size]===10);
    checkedContent(entry,Buffer.from(raw.subarray(start,start+size)));offset=start+size+1;
  }
  requireProof(offset===raw.length);
}
function bytes(commit, name, metadataBatch = false) {
  requireProof(safe(name));
  const v = view(commit), entry = v.entries.find(e => e.name === name); requireProof(entry);
  // The snapshot parsers only use the identity of non-package JSON inputs.
  if (!payload(name)) {
    requireProof(metadataBatch); return { entry, data: Buffer.alloc(0) };
  }
  if (!contents.has(entry.blob)) checkedContent(entry,rawGit(["show",v.source+":"+name]));
  return { entry, data: contents.get(entry.blob) };
}
function output(data, options) { return options?.encoding && options.encoding !== "buffer" ? data.toString(options.encoding) : data; }
function fixtureGit(command, args, options = {}) {
  if (command !== "git" || path.resolve(options.cwd || process.cwd()) !== ROOT) return realGit(command, args, options);
  const known = load().commits;
  if (args[0] === "cat-file" && args[1] === "--batch" && options.input) {
    const names = options.input.toString().trimEnd().split("\n");
    if (!names.some(n => known[n.slice(0, 40)])) return realGit(command, args, options);
    requireProof(names.length <= 1200 && names.every(n => known[n.slice(0, 40)] && n[40] === ":"));
    prime(names.map(n=>{const e=view(n.slice(0,40)).entries.find(e=>e.name===n.slice(41));requireProof(e);return e;}));
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
    requireProof(filters.every(p => safe(p) && (METADATA_PATHS.includes(p) || load().scope.some(s => p === s || p.startsWith(s + "/")))));
    const v = view(commit), all = [...new Map([...v.entries, ...v.metadata].map(e => [e.name, e])).values()];
    const entries = all.filter(e => !filters.length || filters.some(p => e.name === p || e.name.startsWith(p + "/")));
    // Keep the existing source readers batched, including legacy show-per-file callers.
    prime(entries.filter(e=>v.entries.some(source=>source.name===e.name)));
    return output(Buffer.from(entries.map(e => args.includes("--name-only") ? e.name : e.row).join("\n") + (entries.length ? "\n" : "")), options);
  }
  if (args[0] === "diff" && (args.includes("--name-only") || args.includes("--name-status"))) {
    const ids = args.filter(a => SHA.test(a));
    requireProof(ids.length === 2 && ids.every(c => known[c]));
    const split = args.indexOf("--"), filters = split < 0 ? [] : args.slice(split + 1);
    if (!filters.length) {
      const paths = load().diffs[ids.join(":")]; requireProof(paths && args.includes("--name-only")); ids.forEach(view);
      return output(Buffer.from(paths.join("\n") + "\n"), options);
    }
    requireProof(filters.every(p => load().scope.includes(p.replace(/\/$/,""))));
    const maps = ids.map(c => new Map(view(c).entries.filter(e => filters.some(p => e.name === p.replace(/\/$/,"") || e.name.startsWith(p.replace(/\/$/,"") + "/"))).map(e => [e.name, e.row])));
    const changed = [...new Set([...maps[0].keys(), ...maps[1].keys()])].filter(p => maps[0].get(p) !== maps[1].get(p)).sort();
    const lines = args.includes("--name-status") ? changed.map(p =>
      (maps[0].has(p) ? maps[1].has(p) ? "M" : "D" : "A") + "\t" + p) : changed;
    return output(Buffer.from(lines.join("\n") + (lines.length ? "\n" : "")), options);
  }
  if (args[0] === "grep" && args[1] === "-l" && args.length === 6 && args[4] === "--") {
    const pattern=args[2], commit=args[3];
    requireProof(["nap-direct-calendar","nap-direct-competition-results"].includes(pattern)
      && known[commit] && args[5].replace(/\/$/,"") === "functions");
    const v=view(commit), sources=v.entries.filter(e=>e.name.startsWith("functions/") && e.name.endsWith(".js"));
    prime(sources);
    const found=sources.filter(e=>contents.get(e.blob).includes(pattern)).map(e=>commit+":"+e.name);
    const lines=[...new Set(found)].sort();
    return output(Buffer.from(lines.join("\n")+(lines.length?"\n":"")),options);
  }
  if (args[0] === "rev-parse" && args.length === 2 && args[1][40] === ":") {
    const v=view(args[1].slice(0,40)), name=args[1].slice(41);requireProof(safe(name));
    const entry=[...v.entries,...v.metadata].find(e=>e.name===name);requireProof(entry);
    return output(Buffer.from(entry.blob+"\n"),options);
  }
  if (args[0] === "merge-base" && args[1] === "--is-ancestor" && args.length === 4 && known[args[2]]) {
    requireProof(args[3] === "HEAD" || SHA.test(args[3]));
    return rawGit(["merge-base","--is-ancestor",view(args[2]).source,args[3]],options);
  }
  throw Error("Historical test Git command outside fixture scope");
}
function install(pythonOwner = null) {
  const entry = pythonOwner || path.relative(ROOT, path.resolve(process.argv[1] || "")).replaceAll("\\", "/");
  requireProof(pythonOwner ? !require.main && /^tests\/[a-z0-9-]+-tests\.py$/.test(entry) && fs.statSync(path.join(ROOT,entry)).isFile()
    : /^tests\/[a-z0-9-]+-tests\.js$/.test(entry));
  if (entry === "tests/release-excluded-backend-compatibility-tests.js")
    requireProof(process.argv.length === 2 || process.argv[6] === "--history-fixture");
  if (!globalThis[SYMBOL]) { cp.execFileSync = fixtureGit; globalThis[SYMBOL] = true; }
}
module.exports = { install, validate, checkRows, fixtureGit, bytes, ROOT, SYMBOL };
if (require.main === module) {
  try {
    if (process.argv[2] === "read") {
      requireProof(["firestore.rules","firebase.json"].includes(process.argv[4]));
      process.stdout.write(bytes(process.argv[3], process.argv[4]).data);
    } else {
      requireProof(process.argv[2] === "git" && ["show","ls-tree","diff","rev-parse","merge-base"].includes(process.argv[3]));
      process.stdout.write(fixtureGit("git",process.argv.slice(3),{cwd:ROOT}));
    }
  }
  catch { console.error("Historical test source refused"); process.exitCode = 1; }
}
