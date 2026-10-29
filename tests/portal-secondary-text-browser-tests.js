"use strict";
// Local presentation fixtures only; the helper blocks all external HTTPS.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript, views } = require("../tools/capture-portal-design");
async function main() {
  const { server, baseUrl } = await startStaticServer();
  const browser = await launchBrowser(), client = browser.client;
  const results = [], failures = [];
  try {
    for (const width of [1280, 390]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 });
      for (const theme of ["light", "dark"]) {
        for (const view of views) {
          await client.send("Page.navigate", { url: baseUrl + "/portail.html#" + view.hash });
          assert.ok(await waitFor(client, "document.readyState === 'complete'", 12000));
          await evaluate(client, presentationScript(view));
          await evaluate(client, `
            const style = document.createElement('style');
            style.textContent = '* { animation:none!important; transition:none!important; }';
            document.head.appendChild(style);
            document.documentElement.dataset.portalTheme = ${JSON.stringify(theme)};
          `);
          await client.send("Runtime.evaluate", { expression: "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))", awaitPromise: true });
          const result = await evaluate(client, `
            const rgb = value => {
              const values = value.match(/[\\d.]+/g).map(Number);
              return value.startsWith('color(srgb ') ? values.map((v,i) => i < 3 ? v * 255 : v) : values;
            };
            const lum = color => color.slice(0,3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i], 0);
            const token = getComputedStyle(document.body).getPropertyValue('--portal-color-muted').trim();
            const expected = ${JSON.stringify(theme === "light" ? "#304650" : "#d0dee6")};
            const target = ${JSON.stringify(theme === "light" ? "rgb(48, 70, 80)" : "rgb(208, 222, 230)")};
            const samples = [...document.querySelectorAll('body *')].filter(el =>
              el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}) && !el.closest('[hidden],:disabled,[aria-disabled="true"]') &&
              [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(el).color === target
            ).map(el => {
              let parent = el, background;
              while(parent) { background = rgb(getComputedStyle(parent).backgroundColor); if(background[3] !== 0) break; parent = parent.parentElement; }
              const a = lum(rgb(target)), b = lum(background || [255,255,255]);
              return {tag:el.tagName, id:el.id, className:String(el.className), surface:parent && (parent.id || String(parent.className)), text:el.textContent.trim().slice(0,80), ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
            });
            return {token,expected,count:samples.length,minimum:samples.length ? Math.min(...samples.map(s => s.ratio)) : null,failures:samples.filter(s => s.ratio < 7)};
          `);
          assert.equal(result.token, result.expected, "Shared secondary palette");
          if (result.failures.length) failures.push({ width, theme, view: view.name, samples: result.failures });
          results.push({ width, theme, view: view.name, count: result.count, minimum: result.minimum });
        }
        console.log(width + "px " + theme + ": " + views.length + " portal views checked");
      }
    }
    fs.mkdirSync("tmp/readability", { recursive: true });
    fs.writeFileSync(path.resolve("tmp/readability/contrast-proof.json"), JSON.stringify({ synthetic:true, externalHttpsBlocked:true, results, failures }, null, 2));
    assert.equal(failures.length, 0, "See tmp/readability/contrast-proof.json for affected surfaces");
  } finally { browser.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
