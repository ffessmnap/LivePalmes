"use strict";

// Existing source-contract tests inspect the logical declaration at its old
// location. Expand only explicitly marked extractions; runtime/module tests
// continue to read and execute the actual files, without this adapter.
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("../firestore-rules/node_modules/acorn");
const { references: lexicalReferences } = require("./lexical-references");
const root = path.resolve(__dirname, "../..");

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}

function unindentCode(text, spaces) {
  const literals = [];
  walk(acorn.parse(text, { ecmaVersion: "latest" }), node => {
    if (node.type === "TemplateElement" || node.type === "Literal" && typeof node.value === "string") {
      literals.push({ start: node.start, end: node.end });
    }
  });
  // Formatting the surrounding function must never rewrite generated HTML,
  // mail, TXT or other multiline literal contents used by the tests.
  return text.replace(new RegExp("\\n {" + spaces + "}", "g"), (match, offset) =>
    literals.some(literal => offset + 1 >= literal.start && offset + 1 < literal.end) ? match : "\n");
}

function restoreBackendOperation(text, file) {
  if (!file.startsWith("functions/backend/")) return text;
  const ast = acorn.parse(text, { ecmaVersion: "latest" });
  const free = lexicalReferences(ast), context = new Set(free.filter(r => r.node.name === "backendContext").map(r => r.node));
  const requireRefs = new Set(free.filter(r => r.node.name === "require").map(r => r.node)), changes = [];
  const local = node => node?.type === "MemberExpression" && !node.computed && context.has(node.object)
    && node.property.name.startsWith("local$") ? node.property.name.slice(6) : null;
  walk(ast, node => {
    const callee = node.type === "CallExpression" && node.callee;
    if (callee?.type === "SequenceExpression" && callee.expressions.length === 2
        && callee.expressions[0].type === "Literal" && callee.expressions[0].value === 0 && local(callee.expressions[1])) {
      if (text[node.start] !== "(" || text[callee.end] !== ")") throw Error("Unknown generated unbound call");
      changes.push({ start: node.start, end: callee.end + 1, text: local(callee.expressions[1]) });
    }
  });
  walk(ast, node => {
    if (local(node) && !changes.some(change => node.start >= change.start && node.end <= change.end))
      changes.push({ start: node.start, end: node.end, text: local(node) });
    if (node.type !== "CallExpression" || !(requireRefs.has(node.callee)
        || node.callee.type === "MemberExpression" && requireRefs.has(node.callee.object) && node.callee.property.name === "resolve")) return;
    const argument = node.arguments[0];
    if (node.arguments.length !== 1 || argument.type !== "Literal" || typeof argument.value !== "string" || !argument.value.startsWith(".")) return;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), argument.value));
    let relative = path.posix.relative("functions", target);
    if (!relative.startsWith(".")) relative = "./" + relative;
    changes.push({ start: argument.start, end: argument.end, text: JSON.stringify(relative) });
  });
  for (const change of changes.sort((a, b) => b.start - a.start)) text = text.slice(0, change.start) + change.text + text.slice(change.end);
  return text;
}

function expandedSource(file, source, loadModule = name => fs.readFileSync(name, "utf8")) {
  if (file.endsWith(".css")) {
    return source.replace(/@import url\("([^"?#]+)\?[^"\n]*"\);/g, (_, name) =>
      expandedSource(path.resolve(path.dirname(file), name), loadModule(path.resolve(path.dirname(file), name)), loadModule));
  }
  source = source.replace(/\s*\/\* portal-wiring-start \*\/[\s\S]*?\/\* portal-wiring-end \*\//, "");
  if (!source.includes("/* extracted-function: ") && !source.includes("/* extracted-handler: ")) return source;
  // Callable registrations are still tested as real original bodies. Separate
  // module-boundary tests verify the deployed delegation and live services.
  const handlers = [];
  walk(acorn.parse(source, { ecmaVersion: "latest" }), node => {
    if (["ArrowFunctionExpression", "FunctionExpression"].includes(node.type)) handlers.push(node);
  });
  const handlerReplacements = [];
  const handlerModules = new Map();
  for (const match of source.matchAll(/\/\* extracted-handler: ([\w/.-]+)#(\w+)#(arrow|function|expression) \*\//g)) {
    const wrapper = handlers.find(node => node.start >= match.index + match[0].length);
    if (!wrapper) throw new Error("Handler extrait sans délégation");
    if (!handlerModules.has(match[1])) {
      const text = loadModule(path.resolve(root, match[1])), declarations = new Map();
      walk(acorn.parse(text, { ecmaVersion: "latest" }), node => {
        if (node.type === "FunctionDeclaration") declarations.set(node.id.name, node);
      });
      handlerModules.set(match[1], { text, declarations });
    }
    const { text, declarations } = handlerModules.get(match[1]);
    const declaration = declarations.get(match[2]);
    if (!declaration) throw new Error("Handler extrait absent : " + match[2]);
    let restored = restoreBackendOperation(unindentCode(text.slice(declaration.start, declaration.end), 2), match[1])
      .replace(/(\w+): \/\* backend-shorthand \*\/ backendContext\.\1/g, "$1");
    const references = [];
    walk(acorn.parse(restored, { ecmaVersion: "latest" }), node => {
      if (node.type === "MemberExpression" && node.object.name === "backendContext" && !node.computed) {
        references.push({ start: node.start, end: node.end, text: node.property.name });
      }
    });
    for (const reference of references.sort((a, b) => b.start - a.start)) {
      restored = restored.slice(0, reference.start) + reference.text + restored.slice(reference.end);
    }
    const parsed = acorn.parse(restored, { ecmaVersion: "latest" }).body[0];
    const params = parsed.params.map(node => restored.slice(node.start, node.end)).join(", ");
    const prefix = parsed.async ? "async " : "";
    const header = match[3] !== "function" ? prefix + "(" + params + ") => " : prefix + "function (" + params + ") ";
    const resultBody = match[3] === "expression" ? parsed.body.body[0].argument : parsed.body;
    handlerReplacements.push({ start: match.index, end: wrapper.end, text: header + restored.slice(resultBody.start, resultBody.end) });
  }
  for (const replacement of handlerReplacements.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end);
  }
  const ast = acorn.parse(source, { ecmaVersion: "latest" });
  const replacements = [];
  const modules = new Map();
  const functions = [];
  walk(ast, node => { if (node.type === "FunctionDeclaration") functions.push(node); });
  for (const match of source.matchAll(/\/\* extracted-function: ([\w/.-]+)#(\w+) \*\//g)) {
    const wrapper = functions.find(node => node.start > match.index && node.id.name === match[2]);
    const markerEnd = match.index + match[0].length;
    const hasWrapper = /^\s*(?:async )?function\s/.test(source.slice(markerEnd));
    if (hasWrapper && !wrapper) throw new Error("Extraction sans point d'entrée : " + match[2]);
    const moduleFile = path.resolve(root, match[1]);
    if (!moduleFile.startsWith(root + path.sep)) throw new Error("Source hors dépôt");
    if (!modules.has(moduleFile)) {
      const text = loadModule(moduleFile);
      const declarations = new Map();
      walk(acorn.parse(text, { ecmaVersion: "latest" }), node => {
        if (node.type === "FunctionDeclaration") declarations.set(node.id.name, node);
      });
      modules.set(moduleFile, { text, declarations });
    }
    const module = modules.get(moduleFile), declaration = module.declarations.get(match[2]);
    if (!declaration) throw new Error("Déclaration extraite absente : " + match[2]);
    const portal = match[1].startsWith("assets/portal/");
    let text = restoreBackendOperation(unindentCode(module.text.slice(declaration.start, declaration.end), portal ? 4 : 2), match[1]);
    if (portal || match[1].includes("/server-")) {
      text = text.replace(/(\w+): \/\* (?:portal|backend)-shorthand \*\/ (?:portal(?:Context|State|Actions|Config)|backendContext)\.\1/g, "$1");
      const contextReferences = [];
      walk(acorn.parse(text, { ecmaVersion: "latest" }), node => {
        if (node.type === "MemberExpression" && ["portalContext", "portalState", "portalActions", "portalConfig", "backendContext"].includes(node.object.name) && !node.computed) {
          contextReferences.push({ start: node.start, end: node.end, text: node.property.name });
        }
      });
      for (const reference of contextReferences.sort((a, b) => b.start - a.start)) {
        text = text.slice(0, reference.start) + reference.text + text.slice(reference.end);
      }
    }
    replacements.push({ start: match.index, end: hasWrapper ? wrapper.end : markerEnd, text });
  }
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end);
  }
  return source;
}

function readFileSync(file, options) {
  const value = fs.readFileSync(file, options);
  if (typeof value !== "string" || typeof file !== "string") return value;
  const absolute = path.resolve(file);
  return /(?:livepalmes-admin-portal\.(?:js|css)|functions[/\\]index\.js)$/.test(absolute)
    ? expandedSource(absolute, value) : value;
}

module.exports = { ...fs, readFileSync, expandedSource, unindentCode, restoreBackendOperation };
