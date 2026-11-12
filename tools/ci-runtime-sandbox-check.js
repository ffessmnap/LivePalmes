"use strict";
// Internal Chromium diagnostics only: no application URL, SDK or account.
const assert = require("node:assert/strict");
const { launchBrowserProcess } = require("./browser-test-launcher");

function validateSandbox(rows) {
  assert(Array.isArray(rows), "Missing internal sandbox diagnostics");
  for (const label of ["Namespace Sandbox", "Seccomp-BPF sandbox"]) {
    const matching = rows.filter(row => Array.isArray(row) && row[0]?.toLowerCase() === label.toLowerCase());
    assert.equal(matching.length, 1, "Missing or ambiguous " + label);
    assert.equal(matching[0][1], "Yes", "Inactive " + label);
  }
  return { namespace: "Yes", seccomp: "Yes" };
}

async function inspectSandbox() {
  const browser = await launchBrowserProcess(process.env.EDGE_BIN, { startTimeoutMs: 20000 });
  let socket;
  const pending = new Map();
  try {
    const pages = await (await fetch(`http://127.0.0.1:${browser.port}/json/list`,
      { signal: AbortSignal.timeout(5000) })).json();
    assert.equal(pages.length, 1, "Expected only our fresh blank browser page");
    assert.equal(pages[0].url, "about:blank");
    const url = new URL(pages[0].webSocketDebuggerUrl);
    assert.equal(url.protocol, "ws:");
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, String(browser.port));
    assert.match(url.pathname, /^\/devtools\/page\/[A-Za-z0-9-]+$/);
    socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("Owned browser connection timed out")), 5000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(Error("Owned browser connection failed")); }, { once: true });
    });
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(Error(message.error.message));
      else request.resolve(message.result);
    });
    let id = 0;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => { pending.delete(requestId); reject(Error("Internal browser command timed out")); }, 5000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
    await send("Page.enable");
    await send("Page.navigate", { url: "chrome://sandbox" });
    const deadline = Date.now() + 10000;
    let observed = [];
    while (Date.now() < deadline) {
      const value = await send("Runtime.evaluate", { returnByValue: true, expression:
        "({url:location.href,rows:Array.from(document.querySelectorAll('tr'),r=>Array.from(r.cells,c=>c.textContent.trim()))})" });
      const page = value.result?.value;
      if (page?.url?.startsWith("chrome://sandbox")) {
        observed = page.rows;
        try { return validateSandbox(observed); } catch { /* Wait for the internal status response. */ }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error("Chromium sandbox status missing or inactive: " + JSON.stringify(observed).slice(0, 2000));
  } catch (error) {
    throw Error(error.message + "; browser: " + browser.diagnostic());
  } finally {
    for (const request of pending.values()) clearTimeout(request.timer);
    socket?.close();
    browser.cleanup(); // Existing owned process-group/profile cleanup, never a user profile.
  }
}

module.exports = { validateSandbox };
if (require.main === module) {
  inspectSandbox().then(value => console.log(JSON.stringify(value))).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
