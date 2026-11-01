"use strict";
// Real shipped navigation, synthetic capabilities, all external HTTPS blocked.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { INITIAL_ENTRY } = require("../functions/portal-news");
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
          window.newsData = {revision:0,entries:[${JSON.stringify(INITIAL_ENTRY)}]};
          window.newsCalls = 0; window.newsFail = false; window.newsConflict = false; window.newsUid='fixture'; window.newsDefer=false;
          window.LivePalmesPortalNews = LivePalmesPortalNews.create({
            auth:{isAdminAuthenticated:()=>true,hasCapability:cap=>newsCaps.includes(cap)}, uid:()=> newsUid,
            call:async input=>{
              window.newsCalls++;
              if(window.newsFail)throw Error('Service indisponible');
              if(window.newsDefer)await new Promise(resolve=>{window.newsRelease=resolve;});
              if(input.action==='list')return structuredClone(newsData);
              if(window.newsConflict)throw Error('Les nouveautés ont changé. Actualisez.');
              if(input.action==='save'){
                const id=input.id||'new-entry';
                newsData.entries=newsData.entries.filter(item=>item.id!==id);
                newsData.entries.push({id,publishedAt:input.publishedAt,lines:input.text.split('\\n').filter(Boolean)});
              }else newsData.entries=newsData.entries.filter(item=>item.id!==input.id);
              newsData.entries.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)); newsData.revision++;
              return structuredClone(newsData);
            }
          });
          window.newsNavigation = LivePalmesPortalNavigation.create({
            state: {adminAuth:{hasCapability:cap => newsCaps.includes(cap)}, activeEngagementsNavEntry:'', activeEngagementNationalTab:''},
            config: {ENGAGEMENT_ROUTE_BY_HASH:{}}, actions: {}, elements: {
              sidebar:document.querySelector('.admin-portal-sidebar'), navToggle:document.querySelector('#adminPortalNavToggle')
            }
          });
        `);
        for (const caps of [["engagements.region.manage"], ["engagements.national.manage"], ["admin.full"], ["engagements.club.manage"], ["records.manage"], ["dtn.view"], []]) {
          const allowed = caps.some(cap => ["engagements.region.manage", "engagements.national.manage", "admin.full"].includes(cap));
          await evaluate(client, `window.newsCaps=${JSON.stringify(caps)}; LivePalmesPortalNews.refreshAuth(); history.replaceState(null,'','#nouveautes'); newsNavigation.updateNavigationView();`);
          assert.ok(await waitFor(client, "!document.querySelector('#adminNewsRefresh').disabled", 2000));
          const result = await evaluate(client, `
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
          if (allowed) {
          assert.equal(result.items.length, 3);
          assert.match(result.items[0], /administrateurs régionaux.*clubs de leur région/);
          assert.match(result.items[1], /NS.*étranger.*décision nationale/);
          assert.match(result.items[2], /distance et spécialité.*ajoutés ou retirés/);
          assert.equal(result.time, '2026-10-30T19:39:00+01:00');
          }
          assert.equal(result.overflow, false);
          await waitFor(client, "!document.querySelector('#adminNewsRefresh').disabled", 2000);
        }
        await evaluate(client, `newsCaps=['engagements.national.manage']; LivePalmesPortalNews.refreshAuth(); newsNavigation.updateNavigationView();`);
        assert.ok(await waitFor(client, "document.querySelector('[data-news-action=edit]') !== null", 2000));
        const initialState = await evaluate(client, `const count=newsCalls; newsNavigation.updateNavigationView(); return {count,after:newsCalls,add:!document.querySelector('#adminNewsAdd').hidden};`);
        assert.equal(initialState.count, initialState.after, "Cached returns do not read again"); assert.ok(initialState.add);
        await evaluate(client, `document.querySelector('[data-news-action=edit]').click(); document.querySelector('#adminNewsText').value='Ancienne nouveauté corrigée'; window.confirm=()=>true; document.querySelector('#adminNewsForm').requestSubmit();`);
        assert.ok(await waitFor(client, "document.querySelector('#adminNewsStatus').textContent==='Nouveauté enregistrée.'", 2000));
        assert.match(await evaluate(client, "return document.querySelector('#adminNewsPublishedEntries').textContent;"), /Ancienne nouveauté corrigée/);
        await evaluate(client, `document.querySelector('#adminNewsAdd').click(); document.querySelector('#adminNewsDate').value='2026-11-01T19:00'; document.querySelector('#adminNewsText').value='Première modification\\n<script>alerte</script>'; window.newsConflict=true; document.querySelector('#adminNewsForm').requestSubmit();`);
        assert.ok(await waitFor(client, "document.querySelector('#adminNewsStatus').textContent.includes('Actualisez')", 2000));
        assert.equal(await evaluate(client, "return document.querySelector('#adminNewsForm').hidden;"), false, "Draft retained on conflict");
        await evaluate(client, `window.newsConflict=false; document.querySelector('#adminNewsRefresh').click();`);
        assert.ok(await waitFor(client, "!document.querySelector('#adminNewsRefresh').disabled", 2000));
        assert.match(await evaluate(client, "return document.querySelector('#adminNewsText').value;"), /Première modification/);
        const editShot = await client.send("Page.captureScreenshot", {format:"png"});
        fs.mkdirSync("tmp/portal-news", {recursive:true});
        fs.writeFileSync(`tmp/portal-news/${width}-${theme}-editor.png`, Buffer.from(editShot.data,"base64"));
        await evaluate(client, "document.querySelector('#adminNewsForm').requestSubmit();");
        assert.ok(await waitFor(client, "document.querySelector('#adminNewsStatus').textContent==='Nouveauté enregistrée.'", 2000));
        const published = await evaluate(client, `return {text:document.querySelector('#adminNewsPublishedEntries article').textContent,scripts:document.querySelectorAll('#adminNewsPublishedEntries script').length,overflow:document.documentElement.scrollWidth>innerWidth};`);
        assert.match(published.text, /Première modification/); assert.match(published.text, /<script>/); assert.equal(published.scripts,0); assert.equal(published.overflow,false);
        await evaluate(client, `window.confirm=()=>false; document.querySelector('[data-news-action=delete]').click();`);
        assert.equal(await evaluate(client, "return newsData.entries.length;"), 2, "Deletion requires confirmation");
        await evaluate(client, `window.confirm=()=>true; document.querySelector('[data-news-action=delete]').click();`);
        assert.ok(await waitFor(client, "document.querySelector('#adminNewsStatus').textContent==='Nouveauté supprimée.'", 2000));
        await evaluate(client, `document.querySelector('[data-news-action=delete]').click();`);
        assert.ok(await waitFor(client, "newsData.entries.length===0 && !document.querySelector('#adminNewsRefresh').disabled", 2000));
        assert.match(await evaluate(client, "return document.querySelector('#adminNewsPublishedEntries').textContent;"), /Aucune nouveauté/);
        await evaluate(client, `newsData.entries=Array.from({length:45},(_,i)=>({id:'item-'+i,publishedAt:'2026-11-01T18:00:00Z',lines:['Texte '+i]}));document.querySelector('#adminNewsRefresh').click();`);
        assert.ok(await waitFor(client, "document.querySelectorAll('#adminNewsPublishedEntries article').length===20", 2000));
        const pageCalls = await evaluate(client, "return newsCalls;");
        await evaluate(client, "document.querySelector('#adminNewsMore').click();");
        assert.equal(await evaluate(client, "return document.querySelectorAll('#adminNewsPublishedEntries article').length;"), 40);
        assert.equal(await evaluate(client, "return newsCalls;"), pageCalls, "Pagination uses the bounded document already read");
        await evaluate(client, `newsData.entries=[${JSON.stringify(INITIAL_ENTRY)}]; document.querySelector('#adminNewsRefresh').click();`);
        assert.ok(await waitFor(client, "!document.querySelector('#adminNewsRefresh').disabled", 2000));
        await evaluate(client, `window.newsCaps=['engagements.region.manage']; newsNavigation.updateNavigationView();`);
        assert.equal(await evaluate(client, "return document.querySelectorAll('[data-news-action]').length;"), 0, "Regional users have no edit/delete controls");
        assert.equal(await evaluate(client, "return document.querySelector('#adminNewsAdd').hidden;"), true);
        await evaluate(client, `window.newsFail=true; document.querySelector('#adminNewsRefresh').click();`);
        assert.ok(await waitFor(client, "document.querySelector('#adminNewsStatus').textContent.includes('indisponible')", 2000));
        assert.equal(await evaluate(client, "return document.querySelectorAll('#adminNewsPublishedEntries article').length;"), 1, "Read failures preserve the loaded publications");
        await evaluate(client, `window.newsFail=false; window.newsDefer=true; document.querySelector('#adminNewsRefresh').click();`);
        const readCalls = await evaluate(client, `const count=newsCalls; newsNavigation.updateNavigationView(); return {count,after:newsCalls};`);
        assert.equal(readCalls.count,readCalls.after,"Concurrent requests are coalesced");
        await evaluate(client, `newsCaps=[]; newsUid='other'; LivePalmesPortalNews.refreshAuth(); window.newsDefer=false; window.newsRelease();`);
        assert.ok(await waitFor(client, "document.querySelectorAll('#adminNewsPublishedEntries article').length===0", 2000));
        await evaluate(client, `newsCaps=['engagements.region.manage']; LivePalmesPortalNews.refreshAuth(); newsNavigation.updateNavigationView();`);
        assert.ok(await waitFor(client, "document.querySelectorAll('#adminNewsPublishedEntries article').length===1", 2000));
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
