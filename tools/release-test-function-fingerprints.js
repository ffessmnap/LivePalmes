"use strict";
// Static TEST-only equivalence. Never require code from a historical checkout.
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const { fingerprints, retirementRegistrySignature, numericConstant } = require("./release-function-fingerprints");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const canonical = value => JSON.stringify(value, (key, item) => ["start", "end", "raw"].includes(key) ? undefined : item);
const parse = source => acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
// Existing TEST wrapper implementation. A changed/unknown builder keeps the
// whole backend until its behavior is reviewed, including future comparisons.
const PREPARER = "f26331b307706c31ec5c205491a54e8afad57378";
const ACTIVE = canonical(parse(`function activeLotFunctions(lot) {
  if (!Object.prototype.hasOwnProperty.call(LOTS, lot)) throw new Error("Lot Firebase inconnu: " + lot);
  return LOTS[lot].filter(name => !retiredNapNames.has(name));
}`).body[0]);

function literal(node) {
  if (node?.type === "Literal" && (node.value === null || ["string", "boolean"].includes(typeof node.value)
      || typeof node.value === "number" && Number.isFinite(node.value))) return node.value;
  if (node?.type === "ArrayExpression") return node.elements.map(literal);
  if (node?.type === "ObjectExpression") {
    const result = Object.create(null);
    for (const p of node.properties) {
      const key = p.key?.name || p.key?.value;
      if (p.type !== "Property" || p.computed || p.method || p.kind !== "init" || typeof key !== "string"
          || ["__proto__", "constructor", "prototype"].includes(key) || Object.hasOwn(result, key)) throw new Error("Donnee non litterale");
      result[key] = literal(p.value);
    }
    return result;
  }
  throw new Error("Donnee non litterale");
}
function frozen(node) {
  if (node?.type !== "CallExpression" || node.callee.type !== "MemberExpression" || node.callee.computed
      || node.callee.object.name !== "Object" || node.callee.property.name !== "freeze" || node.arguments.length !== 1) throw new Error("Freeze non reconnu");
  return literal(node.arguments[0]);
}
function strings(value) {
  if (!Array.isArray(value) || !value.every(v => typeof v === "string") || new Set(value).size !== value.length) throw new Error("Liste non statique ou dupliquee");
  return value;
}

function walk(node, visit, parent = null) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
    else if (value && typeof value === "object") walk(value, visit, node);
  }
}

function plainEnvironment(ast, files) {
  // Recognize the existing plain-data factory, not an arbitrary getter/Proxy.
  // Config values remain in the common module hash; any factory code change
  // disables this optimization until reviewed. No historical module is run.
  const file = files["functions/livepalmes-environment.js"];
  if (!file) return false;
  const factory = parse(file.source), declaration = factory.body[0]?.declarations?.[0];
  if (declaration?.id.name !== "PROJECTS") return false;
  let projects;
  try { projects = literal(declaration.init); } catch { return false; }
  if (!projects || typeof projects !== "object" || Array.isArray(projects)
      || !Object.values(projects).every(p => p && typeof p.sportingDataSource === "string")) return false;
  declaration.init = { type: "Literal", value: "PROJECTS-DATA" };
  if (hash(canonical(factory)) !== "f15e13e88c66d45176783eddcf538a5e91b1f7a4474743eaa0a52af253eadc21") return false;
  const bindings = ast.body.flatMap(n => n.type === "VariableDeclaration" && n.kind === "const" ? n.declarations : []);
  const environment = bindings.find(d => d.id.name === "ENVIRONMENT");
  if (environment?.init?.type !== "CallExpression" || environment.init.callee?.name !== "livePalmesEnvironment" || environment.init.arguments.length !== 0) return false;
  const imported = bindings.some(d => d.id.type === "ObjectPattern" && d.init?.callee?.name === "require"
    && d.init.arguments[0]?.value === "./livepalmes-environment"
    && d.id.properties.some(p => p.shorthand && p.key.name === "livePalmesEnvironment"));
  if (!imported) return false;
  let safe = true;
  walk(ast, (node, parent) => {
    if (node.type === "Identifier" && node.name === "ENVIRONMENT" && node !== environment.id
        && !(parent?.type === "MemberExpression" && parent.object === node && !parent.computed)) safe = false;
    const target = node.type === "AssignmentExpression" ? node.left
      : node.type === "UpdateExpression" || node.type === "UnaryExpression" && node.operator === "delete" ? node.argument : null;
    let object = target;
    while (object?.type === "MemberExpression") object = object.object;
    if (object?.name === "ENVIRONMENT") safe = false;
  });
  return safe;
}

function configuration(source, files) {
  const ast = parse(source), factories = new Set(), uses = new Map(), registrations = new Map();
  for (const n of ast.body) for (const d of n.declarations || []) {
    if (d.id.type === "ObjectPattern" && d.init?.callee?.name === "require"
        && /^firebase-functions\/v2\/(https|firestore|scheduler|tasks)$/.test(d.init.arguments[0]?.value || "")) {
      for (const p of d.id.properties) if (p.type === "Property" && !p.computed && p.value.type === "Identifier"
          && /^on(Call|Request|Schedule|TaskDispatched|DocumentCreated|DocumentWritten|DocumentUpdated|DocumentDeleted)$/.test(p.key.name)) factories.add(p.value.name);
    }
  }
  walk(ast, node => {
    if (node.type === "Identifier") uses.set(node.name, (uses.get(node.name) || 0) + 1);
    if (node.type !== "AssignmentExpression" || node.operator !== "=" || node.left.object?.name !== "exports" || node.left.computed
        || !factories.has(node.right.callee?.name) || node.right.arguments?.[0]?.type !== "Identifier") return;
    const id = node.right.arguments[0];
    registrations.set(id.name, { id, name: node.left.property.name, start: node.start });
  });
  const environment = plainEnvironment(ast, files);
  const primitive = node => node?.type === "Literal" && (node.value === null || ["string", "boolean"].includes(typeof node.value)) || numericConstant(node);
  const safeField = node => primitive(node) || environment && node?.type === "ConditionalExpression"
    && node.test.type === "BinaryExpression" && node.test.operator === "==="
    && node.test.left.type === "MemberExpression" && !node.test.left.computed
    && node.test.left.object.name === "ENVIRONMENT" && node.test.left.property.name === "sportingDataSource"
    && node.test.right.type === "Literal" && node.test.right.value === "nap"
    && primitive(node.consequent) && primitive(node.alternate);
  const edits = [], contexts = {};
  for (const statement of ast.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const" || statement.declarations.length !== 1) continue;
    const d = statement.declarations[0], registration = registrations.get(d.id.name);
    if (!registration || d.init?.type !== "ObjectExpression" || uses.get(d.id.name) !== 2 || d.end >= registration.start) continue;
    const keys = new Set(), retained = [], fields = [];
    let safe = true;
    for (const property of d.init.properties) {
      const key = property.key?.name || property.key?.value;
      if (property.type !== "Property" || property.computed || property.method || property.kind !== "init"
          || typeof key !== "string" || keys.has(key) || ["__proto__", "constructor", "prototype"].includes(key)) { safe = false; break; }
      keys.add(key);
      if (safeField(property.value)) fields.push([key, property.value]);
      else retained.push(source.slice(property.start, property.end));
    }
    if (!safe) continue;
    contexts[registration.name] = fields;
    edits.push({ start: d.init.start, end: d.init.end, text: "{" + retained.join(",") + "}" });
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return { source, contexts };
}

function registry(source, preparer = PREPARER) {
  try {
    if (preparer !== PREPARER) throw new Error("Preparateur TEST non reconnu");
    const normalized = retirementRegistrySignature(source);
    if (normalized === source) throw new Error("Registres de retrait non reconnus");
    const ast = parse(source), data = Object.create(null), declarations = new Set();
    const allowed = new Set(["PROJECT_ID", "LOTS", "NAP_RETIRED_FUNCTIONS", "NAP_UNUSED_FUNCTIONS", "retiredNapNames",
      "METADATA", "ALL_SAFE_LOTS", "TEST_NON_MAIL_FUNCTIONS", "PUBLICATION_EFFECT_FUNCTIONS"]);
    let active = 0, exported = 0;
    for (const statement of ast.body) {
      if (statement.type === "ExpressionStatement" && statement.directive === "use strict") continue;
      if (statement.type === "FunctionDeclaration" && canonical(statement) === ACTIVE) { active++; continue; }
      if (statement.type === "VariableDeclaration" && statement.kind === "const" && statement.declarations.length === 1) {
        const d = statement.declarations[0], name = d.id.name;
        if (!allowed.has(name) || declarations.has(name)) throw new Error("Declaration inconnue");
        declarations.add(name);
        if (name === "retiredNapNames") continue; // Independently checked by retirementRegistrySignature.
        data[name] = name === "PROJECT_ID" ? literal(d.init) : frozen(d.init);
        continue;
      }
      const a = statement.type === "ExpressionStatement" && statement.expression;
      if (a?.type === "AssignmentExpression" && a.operator === "=" && a.left.type === "MemberExpression" && !a.left.computed
          && a.left.object.name === "module" && a.left.property.name === "exports" && a.right.type === "ObjectExpression"
          && a.right.properties.every(p => p.type === "Property" && p.shorthand && !p.computed
            && (allowed.has(p.key.name) || p.key.name === "activeLotFunctions"))) { exported++; continue; }
      throw new Error("Effet ou utilisation inconnue du registre");
    }
    if (active !== 1 || exported !== 1 || data.PROJECT_ID !== "livepalmes-test" || !data.LOTS || !data.METADATA) throw new Error("Structure inconnue");
    for (const names of Object.values(data.LOTS)) strings(names);
    const lots = strings(data.ALL_SAFE_LOTS), extra = strings(data.TEST_NON_MAIL_FUNCTIONS || []);
    const retired = new Set([...strings(data.NAP_RETIRED_FUNCTIONS), ...strings(data.NAP_UNUSED_FUNCTIONS || [])]);
    const names = lots.flatMap(lot => {
      if (!data.LOTS[lot]) throw new Error("Lot absent");
      return data.LOTS[lot].filter(name => !retired.has(name));
    }).concat(extra);
    if (new Set(names).size !== names.length) throw new Error("Export TEST duplique");
    const secrets = [...new Set(lots.flatMap(lot => strings(data.METADATA[lot]?.secrets)).concat("LIVEPALMES_NAP_PASSWORD"))].sort();
    // Only membership/order is isolated. All other metadata, classification
    // code, effects, identities and preparation code stay in the common hash.
    const shared = JSON.parse(normalized);
    for (const statement of shared.body) for (const d of statement.declarations || []) {
      if (["LOTS", "ALL_SAFE_LOTS", "TEST_NON_MAIL_FUNCTIONS"].includes(d.id.name)) d.init.arguments[0] = { type: "ArrayExpression", elements: [] };
    }
    return { known: true, signature: canonical(shared), names: [...names].sort(), secrets };
  } catch {
    return { known: false, signature: source, names: [], secrets: [] };
  }
}

function snapshot(root, sha, { production = false } = {}) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("SHA complet requis");
  const git = (args, options = {}) => execFileSync("git", args, { cwd: root, maxBuffer: 64 * 1024 * 1024, ...options });
  const rows = git(["ls-tree", "-r", sha, "--", "functions", "tools/prepare-firebase-test-functions.js", "tools/firebase-test-backend-lots.js", ...(production ? ["tools/prepare-production-functions.js"] : [])], { encoding: "utf8" })
    .split("\n").filter(row => row && !row.endsWith("/AGENTS.md")).sort();
  if (rows.some(row => !/^(100644|100755) blob [a-f0-9]{40}\t/.test(row))) throw new Error("Type de source Git non reconnu");
  const paths = rows.map(row => row.split("\t")[1]);
  // One bounded object batch replaces a git process for every module.
  const bytes = git(["cat-file", "--batch"], { input: paths.map(name => sha + ":" + name).join("\n") + "\n" });
  const contents = {}, metadata = {};
  let offset = 0;
  for (let i = 0; i < paths.length; i++) {
    const end = bytes.indexOf(10, offset), header = bytes.subarray(offset, end).toString("utf8");
    const match = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
    if (!match) throw new Error("Objet Git non resolu");
    const size = Number(match[2]), start = end + 1;
    if (!Number.isSafeInteger(size) || size < 0 || start + size >= bytes.length || bytes[start + size] !== 10) throw new Error("Objet Git tronque");
    contents[paths[i]] = bytes.subarray(start, start + size).toString("utf8");
    metadata[paths[i]] = match[1]; offset = start + size + 1;
  }
  if (offset !== bytes.length || !contents["functions/index.js"]) throw new Error("Snapshot incomplet");
  const files = {}, common = [];
  for (const row of rows) {
    const name = row.split("\t")[1];
    if (name === "functions/index.js" || name === "tools/firebase-test-backend-lots.js") continue;
    if (name.startsWith("functions/") && /\.(js|json)$/.test(name) && !/\/package(?:-lock)?\.json$/.test(name)) {
      files[name] = { sha: metadata[name], source: name.endsWith(".js") ? contents[name] : "" };
    } else common.push(row);
  }
  const value = registry(contents["tools/firebase-test-backend-lots.js"] || "", metadata["tools/prepare-firebase-test-functions.js"] || "");
  return { source: contents["functions/index.js"], files, common: common.sort(), registry: value,
    registrySource: contents["tools/firebase-test-backend-lots.js"] || "",
    productionPreparer: metadata["tools/prepare-production-functions.js"] || "" };
}

function analyse(input) {
  const common = input.common.concat("tools/firebase-test-backend-lots.js:" + hash(input.registry.signature),
    "test-bindings:" + canonical(input.registry.secrets)).sort();
  const options = configuration(input.source, input.files);
  const analysis = { testNumericConstants: true, testConservative: !input.registry.known };
  let value = fingerprints(options.source, common, input.files, analysis);
  if (value.mode === "whole-backend") {
    value = fingerprints(input.source, common, input.files, analysis);
    options.contexts = {};
  }
  const names = new Set(input.registry.names);
  for (const name of Object.keys(value.functions)) value.functions[name] = hash(canonical([value.functions[name], names.has(name), options.contexts[name] || []]));
  return { schema: "test-selection-v1", ...value, registryKnown: input.registry.known, eligibleNames: input.registry.names };
}

function fromGit(root, sha) { return analyse(snapshot(root, sha)); }

module.exports = { fromGit, registry, snapshot, configuration, analyse, literal };
if (require.main === module) console.log(JSON.stringify(fromGit(process.argv[2], process.argv[3])));
