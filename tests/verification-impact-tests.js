"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const impact = require("../tools/verification-test-impact");
const root = path.resolve(__dirname, "..");
// Stale execution hashes are a supported full-suite fallback, not a CI error.
// Validate the bounded declaration here; live hash validation is exercised by
// the positive/stale Git fixtures below and by the selector on every eligible run.
const current = JSON.parse(fs.readFileSync(path.join(root, "tools/verification-test-impact.json"), "utf8"));
assert.equal(current.schema, 1);
for (const c of current.contracts) assert.match(current.guards[c.test], /^[a-f0-9]{64}$/);
assert.equal(current.contracts.length, 7);
assert.equal(current.contracts.filter(c => c.suite === "application").length, 6);
assert.equal(impact.plan("browser", ["browser.js"]).selected.length, 1);
assert.equal(impact.plan("application", ["any.js"], { environment: {} }).mode, "full");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-test-impact-"));
try {
  const directory = path.join(fixture, "repo"); fs.mkdirSync(directory);
  const write = (name, text) => { const file = path.join(directory, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  const git = (...args) => execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: directory, encoding: "utf8", stdio: "pipe" }).trim();
  const commit = () => { git("add", "."); git("commit", "-qm", "fixture"); return git("rev-parse", "HEAD"); };
  const file = "tests/server-tests.js", all = [file, "tests/interface-tests.js"];
  const html = '<link rel="stylesheet" href="assets/direct/direct.css?v=1"><p>Visible</p>';
  write("assets/direct/direct.css", "body{color:red}"); write("direct.html", html);
  write(file, "// Reviewed server-only fixture\n"); write("tests/interface-tests.js", "");
  write("tools/verification-tests.json", JSON.stringify({ schema: 1, application: all, publication: [], browser: [], publicationFallback: [], mysql: [], standalone: [] }));
  write("tools/verification-test-impact.json", JSON.stringify({ schema: 1, contracts: [{ suite: "application", test: file, reason: "server-only fixture" }], guards: { [file]: impact.sha(fs.readFileSync(path.join(directory, file), "utf8")) } }));
  git("init", "-q"); git("branch", "-M", "main"); const base = commit();
  git("switch", "-qc", "feature");
  write("assets/direct/direct.css", "body{color:blue}"); write("direct.html", html.replace("?v=1", "?v=2"));
  const head = commit(); git("switch", "-q", "main"); git("merge", "--no-ff", "-qm", "fixture merge", "feature");
  const candidate = git("rev-parse", "HEAD"), eventPath = path.join(fixture, "event.json");
  const env = { CI: "true", GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "ffessmnap/LivePalmes", GITHUB_RUN_ATTEMPT: "1", BASE_SHA: base, GITHUB_SHA: candidate,
    GITHUB_WORKFLOW_REF: "ffessmnap/LivePalmes/.github/workflows/livepalmes-verification-preview.yml@refs/heads/main", GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main", GITHUB_EVENT_PATH: eventPath };
  const push = () => fs.writeFileSync(eventPath, JSON.stringify({ before: base, after: env.GITHUB_SHA, ref: "refs/heads/main" })); push();
  const select = (environment = env) => impact.plan("application", all, { root: directory, environment });
  let plan = select(); assert.equal(plan.mode, "styles"); assert.deepEqual(plan.selected, [all[1]]); assert.deepEqual(plan.skipped.map(s => s.file), [file]);
  assert.deepEqual(plan.html, ["direct.html"]); assert.equal(plan.candidate, candidate);
  fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { base: { sha: base, ref: "main", repo: { full_name: env.GITHUB_REPOSITORY } }, head: { sha: head, repo: { full_name: env.GITHUB_REPOSITORY } } } }));
  assert.equal(select({ ...env, GITHUB_EVENT_NAME: "pull_request", GITHUB_REF: "refs/pull/1/merge" }).mode, "styles");
  const pr = JSON.parse(fs.readFileSync(eventPath)); pr.pull_request.head.repo.full_name = "fork/repo"; fs.writeFileSync(eventPath, JSON.stringify(pr));
  assert.equal(select({ ...env, GITHUB_EVENT_NAME: "pull_request" }).mode, "full"); push();
  for (const override of [{ GITHUB_RUN_ATTEMPT: "2" }, { GITHUB_REF: "refs/heads/feature" }, { BASE_SHA: head }, { GITHUB_SHA: head }, { GITHUB_WORKFLOW_REF: "another-workflow" }, { CI: "false" }]) {
    const result = select({ ...env, ...override }); assert.equal(result.mode, "full"); assert.deepEqual(result.selected, all);
  }
  write(file, "// concurrent edit\n"); assert.equal(select().mode, "full"); assert.equal(impact.unchanged(directory), false); git("restore", file);
  for (const [name, text] of [["direct.html", html.replace("Visible", "Changed")], ["assets/direct/new.css", "a{}"], ["assets/direct/client.js", "alert(1)"]]) {
    git("reset", "--hard", candidate); write(name, text); env.GITHUB_SHA = commit(); push(); assert.equal(select().mode, "full", name);
  }
  git("reset", "--hard", candidate); write(file, "// Changed server execution contract\n"); const changedBase = commit();
  write("assets/direct/direct.css", "body{color:green}"); env.BASE_SHA = changedBase; env.GITHUB_SHA = commit();
  fs.writeFileSync(eventPath, JSON.stringify({ before: changedBase, after: env.GITHUB_SHA, ref: "refs/heads/main" }));
  plan = select(); assert.equal(plan.mode, "full"); assert.match(plan.reason, /réexaminer/);
  const normalize = text => impact.styleVersions(text, "direct.html", ["assets/direct/direct.css"]);
  assert.equal(normalize(html), normalize(html.replace("?v=1", "?v=other-version")));
  for (const wrapped of [t => "<!--" + t + "-->", t => "<!--" + t, t => "<script>" + t, t => "<script>const s='" + t + "';</script>", t => "<textarea>" + t + "</textarea>", t => "<template>" + t + "</template>", t => '<link rel="stylesheet" data-href="' + t + '">']) {
    const a = wrapped(html), b = wrapped(html.replace("?v=1", "?v=2")); assert.notEqual(normalize(a), normalize(b));
  }
  const raw = (mode, status, name) => `:${mode} ${mode} ${"a".repeat(40)} ${"b".repeat(40)} ${status}\0${name}\0`;
  for (const args of [["120000", "M", "style.css"], ["120000", "M", "docs/linked.md"], ["100644", "A", "style.css"], ["100644", "D", "style.css"], ["100644", "M", "unknown/style.css"], ["100644", "M", "app.js"]]) assert.throws(() => impact.styleChanges(raw(...args)));
  // Even after an eligible plan, a test that changes tracked inputs cannot emit
  // a successful partial-suite receipt. All state stays in this private fixture.
  git("reset", "--hard", candidate); env.BASE_SHA = base; env.GITHUB_SHA = candidate; push();
  const overrides = { ...env, RUNNER_TEMP: path.join(fixture, "runner"), GITHUB_STEP_SUMMARY: "" };
  const previous = Object.fromEntries(Object.keys(overrides).map(k => [k, process.env[k]])), log = console.log;
  try {
    Object.assign(process.env, overrides); console.log = () => {};
    assert.throws(() => require("../tools/run-verification-tests").runSuite("application", { root: directory, execute() {
      write("assets/direct/direct.css", "body{color:purple}"); return { status: 0 };
    }}), /preuve sélective refusée/);
    const receipt = JSON.parse(fs.readFileSync(path.join(overrides.RUNNER_TEMP, "ci-test-selection/application.json")));
    assert.equal(receipt.result, "failure"); assert.equal(receipt.executed.length, 1); assert.equal(receipt.failure, "tracked-inputs-changed");
  } finally {
    console.log = log;
    for (const [k,v] of Object.entries(previous)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  console.log("Sélection : styles et versions CSS seuls, PR/push exacts, refus des dérives, scripts/HTML réels, ajouts/retraits/liens et contrats périmés ; navigateur conservé.");
} finally {
  assert.equal(path.dirname(path.resolve(fixture)), path.resolve(os.tmpdir())); fs.rmSync(fixture, { recursive: true, force: true });
}
