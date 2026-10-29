"use strict";
// Real portal styles and local presentation fixtures; external HTTPS is blocked
// by the existing browser helper. No authentication or backend reads/writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript, views } = require("../tools/capture-portal-design");

async function main() {
  const server = await startStaticServer();
  const browser = await launchBrowser();
  const client = browser.client;
  const output = path.resolve("tmp/portal-contrast");
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const width of [1280, 390]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 });
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: width === 390 });
      for (const theme of ["light", "dark"]) {
        for (const name of ["overview-expanded", "competition-detail"]) {
          const view = views.find(item => item.name === name);
          await client.send("Page.navigate", { url: server.baseUrl + "/portail.html#" + view.hash });
          assert.ok(await waitFor(client, "document.readyState === 'complete'", 12000));
          await evaluate(client, presentationScript(view));
          await evaluate(client, `
            document.documentElement.dataset.portalTheme = ${JSON.stringify(theme)};
            const info = document.querySelector('#adminEngagementsPublicInfo');
            info.hidden = false;
            info.querySelector('p').textContent = 'Informations de l’organisateur : accueil des clubs à 8 h.';
            const style = document.createElement('style');
            style.textContent = '* { transition:none!important; animation:none!important; }';
            document.head.appendChild(style);
          `);
          const selectors = name === "overview-expanded"
            ? ["#adminOverviewView .admin-overview-space-tools a", "#adminOverviewView .admin-overview-space-main > p", ...(width > 700 ? ["#adminPortalNavigation a", ".public-site-nav a", ".public-site-nav summary"] : [])]
            : ["#adminEngagementsDetailTitle", "#adminEngagementsPublicInfo p", "#adminEngagementsPublicInfo strong", "#adminEngagementsDetailList dt", "#adminEngagementsDetailList dd", "#adminEngagementsDetailList a"];
          const results = await evaluate(client, `
            function rgb(value) { return value.match(/[\\d.]+/g).map(Number); }
            function luminance(color) {
              return color.slice(0,3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0);
            }
            return ${JSON.stringify(selectors)}.map(selector => {
              const elements = [...document.querySelectorAll(selector)].filter(el => el.getBoundingClientRect().height && getComputedStyle(el).visibility !== 'hidden');
              return { selector, samples: elements.map(el => {
                let parent = el, background;
                while(parent) { background = rgb(getComputedStyle(parent).backgroundColor); if(background[3] !== 0) break; parent = parent.parentElement; }
                const foreground = rgb(getComputedStyle(el).color);
                const a = luminance(foreground), b = luminance(background);
                const rect = el.getBoundingClientRect();
                return { text:el.textContent.trim().slice(0,70), ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05), fits:rect.left >= -1 && rect.right <= innerWidth + 1 };
              }) };
            });
          `);
          for (const result of results) {
            assert.ok(result.samples.length, "Visible sample: " + result.selector);
            for (const sample of result.samples) {
              assert.ok(sample.ratio >= 4.5, `${width}/${theme}/${sample.text}: contrast ${sample.ratio}`);
              assert.ok(sample.fits, `${width}/${theme}/${sample.text}: horizontal overflow`);
            }
          }
          if (name === "competition-detail") await evaluate(client, "document.querySelector('#adminEngagementsPublicInfo').scrollIntoView({block:'center'});");
          const screenshot = await client.send("Page.captureScreenshot", { format: "png" });
          fs.writeFileSync(path.join(output, `${name}-${width}-${theme}.png`), Buffer.from(screenshot.data, "base64"));
          console.log(`${width}px ${theme} ${name}: contrast >= 4.5, no horizontal overflow`);
        }
      }
    }
  } finally { browser.cleanup(); server.server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
