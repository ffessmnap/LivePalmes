"use strict";
// Real shipped navigation, synthetic capabilities, all external HTTPS blocked.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript } = require("../tools/capture-portal-design");
async function main() {
  const { server, baseUrl } = await startStaticServer();
  const browser = await launchBrowser(), client = browser.client;
  try {
    for (const width of [1280, 390]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 });
      for (const theme of ["light", "dark"]) {
        await client.send("Page.navigate", { url: baseUrl + "/portail.html#nouveautes" });
        assert.ok(await waitFor(client, "document.readyState === 'complete'", 12000));
        await evaluate(client, presentationScript({ authenticated: true, hash: "nouveautes", selector: '[data-admin-view="news"]', pinned: true }));
        await evaluate(client, `
          document.documentElement.dataset.portalTheme = ${JSON.stringify(theme)};
          window.LivePalmesNationalDocuments = undefined;
          window.newsCaps = [];
          window.newsNavigation = LivePalmesPortalNavigation.create({
            state: {adminAuth:{hasCapability:cap => newsCaps.includes(cap)}, activeEngagementsNavEntry:'', activeEngagementNationalTab:''},
            config: {ENGAGEMENT_ROUTE_BY_HASH:{}}, actions: {}, elements: {
              sidebar:document.querySelector('.admin-portal-sidebar'), navToggle:document.querySelector('#adminPortalNavToggle')
            }
          });
        `);
        for (const caps of [["engagements.region.manage"], ["engagements.national.manage"], ["admin.full"], ["engagements.club.manage"], ["records.manage"], ["dtn.view"], []]) {
          const allowed = caps.some(cap => ["engagements.region.manage", "engagements.national.manage", "admin.full"].includes(cap));
          const result = await evaluate(client, `
            window.newsCaps = ${JSON.stringify(caps)};
            history.replaceState(null,'','#nouveautes');
            newsNavigation.updateNavigationView();
            const link = document.querySelector('#adminPortalNavigation [data-portal-news-nav]');
            return {link:!link.hidden, allLinks:[...document.querySelectorAll('[data-portal-news-nav]')].every(el => el.hidden === link.hidden), view:!document.querySelector('#adminNewsView').hidden, active:link.getAttribute('aria-current'),
              afterHelp:link.previousElementSibling.textContent.includes('Aide et retours'),
              items:[...document.querySelectorAll('#adminNewsPublishedEntries article li')].map(el=>el.textContent),
              time:document.querySelector('#adminNewsPublishedEntries time')?.getAttribute('datetime'),
              overflow:document.documentElement.scrollWidth > innerWidth};
          `);
          assert.equal(result.link, allowed, caps.join(","));
          assert.ok(result.allLinks, "Both menu entries share the same visibility");
          assert.equal(result.view, allowed, "Direct hash access");
          assert.equal(result.active, allowed ? "page" : null);
          assert.ok(result.afterHelp);
          assert.equal(result.items.length, 3);
          assert.match(result.items[0], /administrateurs régionaux.*clubs de leur région/);
          assert.match(result.items[1], /NS.*étranger.*décision nationale/);
          assert.match(result.items[2], /distance et spécialité.*ajoutés ou retirés/);
          assert.equal(result.time, '2026-10-30T19:39:00+01:00');
          assert.equal(result.overflow, false);
        }
        await evaluate(client, `window.newsCaps=['engagements.region.manage']; newsNavigation.updateNavigationView();`);
        fs.mkdirSync("tmp/portal-news", {recursive:true});
        const shot = await client.send("Page.captureScreenshot", {format:"png"});
        fs.writeFileSync(`tmp/portal-news/${width}-${theme}.png`, Buffer.from(shot.data, "base64"));
        if (width === 390) {
          const touchTarget = await evaluate(client, `
            document.querySelector('#adminPortalAccountToggle').click();
            const link = document.querySelector('#adminPortalAccountActions [data-portal-news-nav]');
            link.scrollIntoView({block:'center'});
            return {visible:link.checkVisibility(), height:link.getBoundingClientRect().height};
          `);
          assert.ok(touchTarget.visible && touchTarget.height >= 40, "Mobile menu touch target: " + JSON.stringify(touchTarget));
          const menuShot = await client.send("Page.captureScreenshot", {format:"png"});
          fs.writeFileSync(`tmp/portal-news/${width}-${theme}-menu.png`, Buffer.from(menuShot.data, "base64"));
          await evaluate(client, "document.querySelector('#adminPortalAccountToggle').click();");
        }
        console.log(`${width}px ${theme}: 7 capability profiles, route, menu, published entry and overflow verified`);
      }
    }
  } finally { browser.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
