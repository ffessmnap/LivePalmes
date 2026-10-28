"use strict";
// Local browser only: fresh profile, external HTTPS blocked by the existing
// capture helper, synthetic presentation fixtures and no backend invocation.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript, views } = require("../tools/capture-portal-design");
const { compare } = require("./helpers/png-comparison");
const baseline = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(baseline || "")) throw Error("Full baseline commit required");
const output = path.resolve("tmp/architecture-layout");
fs.mkdirSync(output, { recursive: true });
const overrides = new Map(["portail.html", "assets/livepalmes-admin-portal.js", "assets/livepalmes-admin-portal.css"].map(file =>
  ["/" + file, execFileSync("git", ["show", baseline + ":" + file], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })]));

async function main() {
  const before = await startStaticServer(overrides), after = await startStaticServer();
  const browser = await launchBrowser(), client = browser.client, results = [];
  try {
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: `
      const OriginalDate = Date;
      globalThis.Date = class extends OriginalDate {
        constructor(...args) { super(...(args.length ? args : ["2026-10-28T08:00:00Z"])); }
        static now() { return 1793174400000; }
      };
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
    ` });
    const selected = process.env.LIVEPALMES_EQUIVALENCE_VIEWS
      ? views.filter(view => process.env.LIVEPALMES_EQUIVALENCE_VIEWS.split(",").includes(view.name)) : views;
    for (const width of [1280, 390]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 });
      for (const view of selected) {
        const images = [], errors = [], timings = [], geometry = [];
        for (const [name, server] of [["before", before], ["after", after]]) {
          const start = client.events.length;
          await client.send("Page.navigate", { url: server.baseUrl + "/portail.html#" + view.hash });
          assert.ok(await waitFor(client, "document.readyState === 'complete'", 12000), "Page load " + view.name);
          await new Promise(resolve => setTimeout(resolve, 350));
          await evaluate(client, presentationScript(view));
          // Freeze presentation-only animation/caret and move the pointer out of
          // the controls. Native overlay scrollbars are browser chrome, not CSS.
          await evaluate(client, 'const style=document.createElement("style"); style.textContent="*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}"; document.head.appendChild(style); scrollTo(0,0);');
          await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
          await new Promise(resolve => setTimeout(resolve, 350));
          await client.send("Runtime.evaluate", { expression: "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))", awaitPromise: true });
          geometry.push(await evaluate(client, "return {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight};"));
          const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, clip: { x: 0, y: 0, width: width - 5, height: 950, scale: 1 } });
          const bytes = Buffer.from(screenshot.data, "base64");
          fs.writeFileSync(path.join(output, `${view.name}-${width}-${name}.png`), bytes);
          images.push(bytes);
          errors.push(client.events.slice(start).filter(event => event.method === "Runtime.exceptionThrown")
            .map(event => event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text));
          timings.push(await evaluate(client, "const n=performance.getEntriesByType('navigation')[0]; return {domReady:n.domContentLoadedEventEnd,loaded:n.loadEventEnd};"));
        }
        const pixels = compare(images[0], images[1], 2);
        // Chromium occasionally varies four antialias edge pixels by <=8/255
        // on the unchanged header SVG. Dimensions and exceptions stay exact.
        const minorRasterDifference = pixels.changedPixels <= 4 && pixels.maxDifference <= 8;
        const equal = pixels.equal || minorRasterDifference;
        results.push({ view: view.name, width, equal, pixels, minorRasterDifference, beforeErrors: errors[0], afterErrors: errors[1], timings, geometry });
        console.log(`${view.name}/${width}: ${equal ? "identical" : "DIFFERENT"}; exceptions ${errors[0].length}/${errors[1].length}`);
      }
    }
    fs.writeFileSync(path.join(output, "comparison.json"), JSON.stringify({ baseline, synthetic: true, externalNetworkBlocked: true, results }, null, 2));
    const failed = results.filter(result => !result.equal || JSON.stringify(result.beforeErrors) !== JSON.stringify(result.afterErrors) || JSON.stringify(result.geometry[0]) !== JSON.stringify(result.geometry[1]));
    assert.deepEqual(failed.map(result => ({ view: result.view, width: result.width, equal: result.equal, errors: result.afterErrors })), []);
    console.log(`Portal before/after: ${results.length} desktop/mobile views match with bounded antialias tolerance, identical dimensions and unchanged JavaScript exceptions.`);
  } finally {
    browser.cleanup();
    before.server.close();
    after.server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
