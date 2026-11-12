"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const fs = require("node:fs"), http = require("node:http"), path = require("node:path");
const { launchBrowser, evaluate, waitFor } = require("../tools/capture-portal-design");
const root = path.resolve(__dirname, "..");

// Real page markup/styles and shell scripts; business scripts are omitted and
// CSP blocks connections. No Firebase, NAP, login or sporting fixture is used.
function start() {
  let generation = 0;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    const name = decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    const file = path.resolve(root, name);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'");
    if (!file.startsWith(root + path.sep) || /^(functions|tests|tools)\//.test(name) || !/\.(html|css|js|png|svg|jpg)$/.test(name)) {
      response.writeHead(404); response.end(); return;
    }
    try {
      let bytes = fs.readFileSync(file);
      const ext = path.extname(file);
      if (ext === ".html") bytes = bytes.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,
        script => /src=["'][^"']*assets\/public\/livepalmes-public-shell\.js/.test(script) ? script : "")
        .replace("</head>", `<meta name="navigation-test-generation" content="${++generation}"></head>`);
      response.setHeader("Content-Type", { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" }[ext] || "image/jpeg");
      response.end(bytes);
    } catch { response.writeHead(404); response.end(); }
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })));
}

async function main() {
  const { server, baseUrl } = await start();
  let browser;
  let navigations = 0;
  let focuslessNavigations = 0;
  try {
    browser = await launchBrowser();
    const client = browser.client;
    async function load(route) {
      await client.send("Page.navigate", { url: baseUrl + route });
      assert.ok(await waitFor(client, "document.querySelector('#publicSiteHeader') && document.readyState === 'complete'"), "Shell ready: " + route);
    }
    async function point(selector) {
      return evaluate(client, `const el=document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};`);
    }
    let touch = true;
    async function activate(selector, modifiers = 0) {
      const position = await point(selector);
      if (touch) {
        await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...position, radiusX: 1, radiusY: 1 }] });
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...position, modifiers });
        await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...position, modifiers });
      }
    }
    async function open(group) {
      if (touch) await activate(".public-site-menu-toggle");
      if (group) await activate(`.public-site-${group} summary`);
    }
    async function follow(selector, label, keyboard = false) {
      const before = await evaluate(client, "return document.querySelector('[name=navigation-test-generation]').content");
      const destination = await evaluate(client, `return document.querySelector(${JSON.stringify(selector)}).href`);
      await evaluate(client, `sessionStorage.removeItem('navigation-activation');document.addEventListener('click',event=>{const link=event.target.closest('a');if(link)sessionStorage.setItem('navigation-activation',JSON.stringify({href:link.href,visible:link.getClientRects().length>0,prevented:event.defaultPrevented}));},{once:true});`);
      if (keyboard) {
        await evaluate(client, `document.querySelector(${JSON.stringify(selector)}).focus()`);
        await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      } else await activate(selector);
      assert.ok(await waitFor(client, `location.href===${JSON.stringify(destination)} && document.querySelector('[name=navigation-test-generation]')?.content!==${JSON.stringify(before)} && document.readyState==='complete'`, 2500),
        `${label}: native activation must load ${destination}; actual ${await evaluate(client, "return location.href")}`);
      assert.ok(await waitFor(client, "document.querySelector('.public-site-menu-toggle')?.getAttribute('aria-expanded') === 'false'"), "Arrival starts with menu closed");
      const activation = await evaluate(client, "return JSON.parse(sessionStorage.getItem('navigation-activation'))");
      assert.deepEqual(activation, { href: destination, visible: true, prevented: false }, "Native link stays visible and uncancelled until activation completes");
      navigations++;
    }
    const links = [[null, ".public-site-nav>a"], ...["calendar", "performances", "documents"].flatMap(group => {
      const count = { calendar: 3, performances: 5, documents: 6 }[group];
      return Array.from({ length: count }, (_, index) => [group, `.public-site-${group} a:nth-child(${index + 1})`]);
    })];

    // Regression: real touch/mouse events and real navigation, with null focus
    // transfer modelled explicitly. This is NOT a claim to run Safari/WebKit.
    for (const [width, height] of [[390, 844], [844, 390], [1440, 900]]) {
      touch = width < 1000;
      await client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: touch });
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: touch });
      for (const origin of ["/index.html", "/performances/records.html"]) {
        for (const [group, selector] of links) {
          for (const focusless of touch && group ? [false, true] : [false]) {
            await load(origin);
            await open(group);
            if (focusless) {
              // Models null focus transfer; Safari itself is not run here.
              // Only focus behaviour is modelled; link activation remains native.
              await evaluate(client, "document.addEventListener('mousedown',event=>{if(event.target.closest('a')){document.activeElement.blur();event.preventDefault();}},true)");
            }
            await follow(selector, `${width}px ${origin} ${selector} focusless=${focusless}`);
            if (focusless) focuslessNavigations++;
          }
        }
      }
      for (const group of ["calendar", "performances", "documents"]) {
        await load("/bibliotheque.html"); await open(group);
        await follow(`.public-site-${group} a`, `${width}px keyboard ${group}`, true);
      }
      for (const selector of [".public-site-brand", ".public-site-portal"]) {
        await load("/calendrier.html");
        await follow(selector, `${width}px ${selector}`);
      }
      // Back must reset the menu and allow a second actual departure.
      await load("/calendrier.html"); await open("performances");
      await follow(".public-site-performances a", "before back");
      const history = await client.send("Page.getNavigationHistory");
      await client.send("Page.navigateToHistoryEntry", { entryId: history.entries[history.currentIndex - 1].id });
      assert.ok(await waitFor(client, "location.pathname==='/calendrier.html' && document.querySelector('.public-site-menu-toggle')?.getAttribute('aria-expanded')==='false'"));
      await open("documents"); await follow(".public-site-documents a", "reopen after back");
    }
    // Modifier/new-tab activation must retain the browser's native behaviour.
    await load("/index.html"); await open("performances");
    const expected = baseUrl + "/performances/records.html";
    await activate(".public-site-performances a", 2); // Control on Windows.
    let popup;
    for (let attempt = 0; attempt < 30 && !popup; attempt++) {
      const targets = await client.send("Target.getTargets");
      popup = targets.targetInfos.find(target => target.url === expected);
      if (!popup) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(popup, "Control-click opens a real new tab");
    assert.equal(await evaluate(client, "return location.pathname"), "/index.html");
    await client.send("Target.closeTarget", { targetId: popup.targetId });
    console.log(`Public navigation: ${navigations} native page loads (${navigations - focuslessNavigations} natural/keyboard/back, ${focuslessNavigations} modelled null-focus), touch portrait/landscape, desktop, brand/portal and modifier passed (Chromium; not WebKit).`);
  } finally { browser?.cleanup(); server.close(); }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { start };
