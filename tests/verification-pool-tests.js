"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const pool = require("../tools/verification-test-pool");
(async () => {
  const trusted = { CI: "true", GITHUB_ACTIONS: "true", LP_CI_CONTAINER: "true" };
  assert.equal(pool.enabled("application", trusted, "linux"), true);
  for (const suite of ["mysql", "standalone", "publicationFallback"]) assert.equal(pool.enabled(suite, trusted, "linux"), false);
  assert.equal(pool.enabled("application", { ...trusted, LP_TEST_POOL_WORKER: "1" }, "linux"), false);
  assert.equal(pool.enabled("application", {}, "linux"), false);
  assert.equal(pool.enabled("browser", trusted, "win32"), false);
  const environment = pool.workerEnvironment("/worker", "/source", "/scratch", "application", {
    GH_TOKEN: "fixture", GITHUB_TOKEN: "fixture", GOOGLE_APPLICATION_CREDENTIALS: "fixture",
    CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE: "fixture", RUNNER_TEMP: "/runtime", NODE_PATH: "/source/functions/node_modules"
  });
  assert.equal(environment.GH_TOKEN, undefined); assert.equal(environment.GITHUB_TOKEN, undefined);
  assert.equal(environment.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  assert.equal(environment.RUNNER_TEMP, "/runtime"); assert.equal(environment.TMPDIR, "/scratch");
  assert(environment.NODE_OPTIONS.includes("offline-network.js"));
  let active = 0, maximum = 0;
  const results = await pool.schedule(["a", "b", "c", "d", "e"], [0, 1], async (file, lane) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 15)); active--;
    return { file, lane, status: 0 };
  });
  assert.equal(maximum, 2); assert.deepEqual(results.map(r => r.file), ["a", "b", "c", "d", "e"]);
  await assert.rejects(pool.schedule(["a", "a"], [0], async () => ({})), /Couverture/);
  const failed = await pool.schedule(["a", "b", "c"], [0], async file => ({ file, status: 1 }));
  assert.deepEqual(failed.map(r => r.file), ["a"]); // No pending test can masquerade as passed.
  const thrown = await pool.schedule(["a"], [0], async () => { throw Error("fixture error"); });
  assert.equal(thrown[0].failure, "fixture error");
  const parent = fs.realpathSync(os.tmpdir()), fixture = fs.mkdtempSync(path.join(parent, "livepalmes-pool-contract-"));
  try {
    const source = path.join(fixture, "source"); fs.mkdirSync(source);
    const git = (...args) => execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: source, stdio: "pipe", encoding: "utf8" }).trim();
    git("init", "-q"); fs.writeFileSync(path.join(source, ".gitignore"), "output.json\n");
    fs.writeFileSync(path.join(source, "pass.js"), 'require("node:fs").writeFileSync("output.json",JSON.stringify({root:process.cwd(),tmp:require("node:os").tmpdir()}));');
    fs.writeFileSync(path.join(source, "fail.js"), 'process.exitCode=3;');
    fs.writeFileSync(path.join(source, "wait.js"), 'setTimeout(()=>{},10000);');
    git("add", "."); git("commit", "-qm", "fixture"); const head = git("rev-parse", "HEAD");
    const lanes = [0, 1].map(i => pool.prepare(source, path.join(fixture, String(i)), head));
    for (const lane of lanes) {
      const result = await pool.execute("pass.js", lane, "publication", source);
      assert.equal(result.status, 0); const output = JSON.parse(fs.readFileSync(path.join(lane.root, "output.json")));
      assert.equal(output.root, lane.root); assert.equal(output.tmp, lane.temporary);
      assert(pool.clean(lane.root));
    }
    assert(!fs.existsSync(path.join(source, "output.json")));
    assert.notEqual(lanes[0].root, lanes[1].root); assert.notEqual(lanes[0].temporary, lanes[1].temporary);
    assert.equal((await pool.execute("fail.js", lanes[0], "publication", source)).status, 3);
    assert.match((await pool.execute("wait.js", lanes[0], "publication", source, 100)).failure, /Delai/);
    fs.appendFileSync(path.join(lanes[0].root, "pass.js"), "\n// changed");
    assert.equal(pool.clean(lanes[0].root), false); assert.equal(pool.clean(source), true);
    await assert.rejects(pool.runPool("publication", ["pass.js"], source, () => {}), /Commit CI different/);
  } finally {
    assert.equal(path.dirname(path.resolve(fixture)), parent);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
  console.log("Execution parallele : couverture unique, erreurs et delais bloquants, copies/temporaires isoles et source preservee.");
})().catch(error => { console.error(error); process.exitCode = 1; });
