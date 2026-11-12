"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { launchBrowserProcess } = require("../tools/browser-test-launcher");

async function testBrowserLauncher() {
  let profile, child, captured;
  const create = (executable, args, options) => {
    captured = { executable, args, options };
    profile = args.find(arg => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
    child = new EventEmitter();
    child.exitCode = null;
    child.stderr = new PassThrough();
    child.kill = () => { child.killed = true; child.exitCode = 0; };
    return child;
  };
  const browser = await launchBrowserProcess("fixture-browser", { spawnProcess: (...args) => {
    const process = create(...args);
    fs.writeFileSync(path.join(profile, "DevToolsActivePort"), "56789\n/devtools/browser/fixture-id\n");
    return process;
  } });
  assert.equal(browser.port, 56789);
  assert.ok(captured.args.includes("--remote-debugging-port=0"));
  assert.ok(captured.args.includes("--remote-debugging-address=127.0.0.1"));
  assert.ok(!captured.args.includes("--no-sandbox"), "Browser sandbox remains enabled");
  assert.equal(captured.options.windowsHide, true);
  browser.cleanup();
  assert.equal(child.killed, true);
  assert.equal(fs.existsSync(profile), false);

  await assert.rejects(launchBrowserProcess("fixture-browser", { spawnProcess: (...args) => {
    const process = create(...args);
    process.next = setImmediate(() => { process.stderr.write("fixture startup refused"); process.exitCode = 17; });
    return process;
  } }), /code 17.*fixture startup refused/);
  assert.equal(child.killed, true);
  assert.equal(fs.existsSync(profile), false);

  await assert.rejects(launchBrowserProcess("fixture-browser", { spawnProcess: (...args) => {
    const process = create(...args);
    fs.writeFileSync(path.join(profile, "DevToolsActivePort"), "56789\nhttps://example.invalid/not-a-browser\n");
    return process;
  }, startTimeoutMs: 35 }), /startup budget/);
  assert.equal(fs.existsSync(profile), false);

  await assert.rejects(launchBrowserProcess("fixture-browser", { spawnProcess: create, startTimeoutMs: 35 }), /startup budget/);
  assert.equal(child.killed, true);
  assert.equal(fs.existsSync(profile), false);

  await assert.rejects(launchBrowserProcess("fixture-browser", { spawnProcess: (...args) => {
    const process = create(...args);
    setImmediate(() => process.emit("error", new Error("fixture spawn error")));
    return process;
  } }), /fixture spawn error/);
  assert.equal(fs.existsSync(profile), false);
  console.log("Browser launcher: owned ephemeral CDP port, bounded startup, diagnostics and failure cleanup verified.");
}

module.exports = { testBrowserLauncher };
if (require.main === module) testBrowserLauncher().catch(error => { console.error(error); process.exitCode = 1; });
