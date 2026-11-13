"use strict";
// Closed, reviewed independence contracts. Unknown contexts always keep every test.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const POLICY = "tools/verification-test-impact.json";
const WORKFLOW = "ffessmnap/LivePalmes/.github/workflows/livepalmes-verification-preview.yml@";
const sha = text => crypto.createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
function git(directory, args) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 });
}
function context(environment, directory) {
  const e = environment;
  if (e.CI !== "true" || e.GITHUB_ACTIONS !== "true" || e.GITHUB_REPOSITORY !== "ffessmnap/LivePalmes" ||
      e.GITHUB_RUN_ATTEMPT !== "1" || !e.GITHUB_WORKFLOW_REF?.startsWith(WORKFLOW) ||
      !/^[a-f0-9]{40}$/.test(e.BASE_SHA || "") || !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA || "")) throw Error("contexte CI exact absent");
  const event = JSON.parse(fs.readFileSync(e.GITHUB_EVENT_PATH, "utf8"));
  if (e.GITHUB_EVENT_NAME === "pull_request") {
    const pr = event.pull_request;
    if (pr?.base?.ref !== "main" || pr.base.repo?.full_name !== e.GITHUB_REPOSITORY ||
        pr.head?.repo?.full_name !== e.GITHUB_REPOSITORY || pr.base.sha !== e.BASE_SHA) throw Error("provenance PR différente");
    const parents = git(directory, ["rev-list", "--parents", "-n", "1", e.GITHUB_SHA]).trim().split(" ");
    if (parents.length !== 3 || parents[1] !== e.BASE_SHA || parents[2] !== pr.head.sha) throw Error("parents PR différents");
  } else if (e.GITHUB_EVENT_NAME === "push") {
    if (e.GITHUB_REF !== "refs/heads/main" || event.ref !== e.GITHUB_REF || event.before !== e.BASE_SHA || event.after !== e.GITHUB_SHA) throw Error("push main différent");
  } else throw Error("événement non autorisé");
  if (git(directory, ["rev-parse", "HEAD"]).trim() !== e.GITHUB_SHA) throw Error("checkout différent");
  git(directory, ["merge-base", "--is-ancestor", e.BASE_SHA, e.GITHUB_SHA]);
  if (git(directory, ["status", "--porcelain", "--untracked-files=no"]).trim()) throw Error("sources suivies modifiées pendant la vérification");
  return { base: e.BASE_SHA, candidate: e.GITHUB_SHA };
}
function styleChanges(raw) {
  const fields = raw.split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (!fields.length || fields.length % 2) throw Error("diff vide ou incomplet");
  const styles = [], html = [];
  for (let i = 0; i < fields.length; i += 2) {
    const header = fields[i], file = fields[i + 1];
    if (/^docs\/.+\.md$/.test(file) && /^:(?:100644 100644 [a-f0-9]{40} [a-f0-9]{40} M|000000 100644 [a-f0-9]{40} [a-f0-9]{40} A|100644 000000 [a-f0-9]{40} [a-f0-9]{40} D)$/.test(header)) continue;
    if (!/^:100644 100644 [a-f0-9]{40} [a-f0-9]{40} M$/.test(header) || file.split("/").some(p => p === ".." || p === ".")) throw Error("ajout, retrait ou changement de type : " + file);
    if (/^(?:[^/]+\.css|(?:assets|css)\/.+\.css)$/.test(file)) styles.push(file);
    else if (/^[a-zA-Z0-9_-]+\.html$/.test(file)) html.push(file);
    else throw Error("code ou chemin inconnu : " + file);
  }
  if (!styles.length) throw Error("aucune modification de style autonome");
  return { styles, html };
}
function styleVersions(text, file, styles) {
  // Script/style blocks and comments stay byte-significant; only actual link tags
  // outside them can change a CSS version. Every other HTML byte must match.
  if (/<template\b/i.test(text)) return text; // Nested inert markup is deliberately not interpreted.
  const comments = /<!--/g;
  for (let m; (m = comments.exec(text));) {
    const end = text.indexOf("-->", comments.lastIndex);
    if (end < 0) return text;
    comments.lastIndex = end + 3;
  }
  const blocks = /<(script|style|textarea|title|xmp|iframe|noembed|noframes)\b[^>]*>/gi;
  for (let m; (m = blocks.exec(text));) {
    const closing = new RegExp("</" + m[1] + "\\s*>", "gi"); closing.lastIndex = blocks.lastIndex;
    const end = closing.exec(text);
    if (!end) return text;
    blocks.lastIndex = closing.lastIndex;
  }
  return text.replace(/<!--[^]*?-->|<(script|style|textarea|title|xmp|iframe|noembed|noframes)\b[^]*?<\/\1\s*>|<link\b[^>]*>/gi, (tag, rawTag) => {
      if (rawTag || tag.startsWith("<!--") || tag.slice(1).includes("<")) return tag;
      if (!/\srel=(["'])stylesheet\1/i.test(tag)) return tag;
      const hrefs = [...tag.matchAll(/\shref=(["'])([^]*?)\1/gi)];
      if (hrefs.length !== 1) return tag;
      const href = hrefs[0], target = href[2].match(/^([a-zA-Z0-9_./-]+\.css)\?v=[a-zA-Z0-9_.-]+$/);
      if (!target) return tag;
      const resolved = target[1].startsWith("/") ? target[1].slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), target[1]));
      if (!styles.includes(resolved)) return tag;
      return tag.slice(0, href.index) + href[0].replace(href[2], target[1] + "?v=STYLE_VERSION") + tag.slice(href.index + href[0].length);
  });
}
function htmlVersionsOnly(directory, origin, files, styles) {
  for (const file of files) {
    const read = ref => {
      const bytes = execFileSync("git", ["show", ref + ":" + file], { cwd: directory, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 });
      const text = bytes.toString("utf8");
      if (!Buffer.from(text, "utf8").equals(bytes)) throw Error("HTML non UTF-8");
      return text;
    };
    const before = read(origin.base), after = read(origin.candidate);
    if (styleVersions(before, file, styles) !== styleVersions(after, file, styles)) throw Error("HTML modifié au-delà des versions CSS : " + file);
  }
}
function reviewedPolicy(directory) {
  const p = JSON.parse(fs.readFileSync(path.join(directory, POLICY), "utf8"));
  if (p.schema !== 1 || Object.keys(p).sort().join() !== "contracts,guards,schema" || !Array.isArray(p.contracts) || !p.contracts.length || p.contracts.length > 16 || !p.guards || typeof p.guards !== "object") throw Error("contrats inconnus");
  const keys = Object.keys(p.guards);
  if (!keys.length || keys.length > 64) throw Error("sources inspectées absentes ou hors limite");
  for (const [file, expected] of Object.entries(p.guards)) {
    if (!/^(?:tools|tests|functions|docs)\/[a-zA-Z0-9/_.-]+$/.test(file) || file.split("/").some(p => p === "..") || !/^[a-f0-9]{64}$/.test(expected) ||
        sha(fs.readFileSync(path.join(directory, file), "utf8")) !== expected) throw Error("contrat à réexaminer : " + file);
  }
  const names = new Set();
  for (const c of p.contracts) {
    if (Object.keys(c).sort().join() !== "reason,suite,test" || !["application", "publication"].includes(c.suite) ||
        !/^tests\/[a-z0-9-]+-tests\.js$/.test(c.test) || !p.guards[c.test] || typeof c.reason !== "string" || !c.reason.trim() || names.has(c.test)) throw Error("contrat de test invalide");
    names.add(c.test);
  }
  return p;
}
function plan(suite, files, options = {}) {
  const result = { schema: 1, suite, mode: "full", selected: [...files], skipped: [], reason: "suite complète conservée" };
  if (!["application", "publication"].includes(suite)) return result;
  const directory = options.root || ROOT, environment = options.environment || process.env;
  try {
    const origin = context(environment, directory);
    const changes = styleChanges(git(directory, ["diff", "--raw", "-z", "--no-abbrev", "--no-renames", origin.base, origin.candidate]));
    htmlVersionsOnly(directory, origin, changes.html, changes.styles);
    const policy = reviewedPolicy(directory);
    const contracts = policy.contracts.filter(c => c.suite === suite);
    if (contracts.some(c => !files.includes(c.test))) throw Error("contrat hors inventaire de la suite");
    const skipped = contracts.map(c => ({ file: c.test, reason: c.reason }));
    return { ...result, ...origin, mode: "styles", ...changes, selected: files.filter(f => !skipped.some(s => s.file === f)), skipped,
      policySha256: sha(fs.readFileSync(path.join(directory, POLICY), "utf8")), reason: "styles existants seuls ; indépendance revue et sources inspectées inchangées" };
  } catch (error) {
    return { ...result, reason: error instanceof Error ? error.message : "impact incertain" };
  }
}
function unchanged(directory = ROOT) {
  return !git(directory, ["status", "--porcelain", "--untracked-files=no"]).trim();
}
module.exports = { plan, styleChanges, styleVersions, reviewedPolicy, context, unchanged, sha };
