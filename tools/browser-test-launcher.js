"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

async function launchBrowserProcess(executable, { spawnProcess = spawn, startTimeoutMs = 10000 } = {}) {
  const tempRoot = path.resolve(os.tmpdir());
  const userDataDir = fs.mkdtempSync(path.join(tempRoot, "livepalmes-browser-"));
  let processRef, spawnError, stderr = "";
  const diagnostic = () => stderr.slice(-1600).replace(/[\r\n]+/g, " ");
  function cleanup() {
    try { processRef?.kill(); } catch {}
    // Delete only the fresh profile created by this invocation, never a user profile.
    if (path.dirname(userDataDir) !== tempRoot || !path.basename(userDataDir).startsWith("livepalmes-browser-")) {
      throw new Error("Browser fixture profile escaped its temporary directory");
    }
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
  try {
    processRef = spawnProcess(executable, [
      "--headless=new", "--disable-gpu", "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0", `--user-data-dir=${userDataDir}`, "about:blank"
    ], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    processRef.once("error", error => { spawnError = error; });
    processRef.stderr?.setEncoding("utf8");
    processRef.stderr?.on("data", data => { stderr = (stderr + data).slice(-4096); });
    const deadline = Date.now() + startTimeoutMs;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (processRef.exitCode !== null && processRef.exitCode !== undefined) {
        throw new Error(`Browser exited during startup (code ${processRef.exitCode})`);
      }
      try {
        const [port, browserPath] = fs.readFileSync(path.join(userDataDir, "DevToolsActivePort"), "utf8").split(/\r?\n/);
        if (/^[0-9]+$/.test(port) && Number(port) > 1023 && Number(port) <= 65535 &&
            /^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(browserPath)) {
          return { port: Number(port), processRef, cleanup, diagnostic };
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error("Browser did not publish its owned DevToolsActivePort within the startup budget");
  } catch (error) {
    cleanup();
    throw new Error(`${error.message}${stderr ? "; browser stderr: " + diagnostic() : ""}`);
  }
}

module.exports = { launchBrowserProcess };
