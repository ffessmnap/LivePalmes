"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { startStaticServer, launchBrowser, waitFor } = require("../tools/capture-portal-design");
const { evaluate } = require("./helpers/portal-browser-evaluate");

async function verify() {
  const overrides = new Map();
  const loader = "/assets/livepalmes-portal-deferred.js";
  const modulePath = "/assets/portal/deferred/club-people.js";
  overrides.set("/a6-version.html", '<textarea aria-label="Brouillon">saisie conservée</textarea><script src="' + loader + '"></script>');
  overrides.set("/a6-records.html", fs.readFileSync("assets/portal/views/records.html", "utf8") +
    '<script src="/performances/public/admin-records.js"></script>');
  const { server, baseUrl } = await startStaticServer(overrides);
  let browser;
  try {
    browser = await launchBrowser();
    const client = browser.client;
    async function visit(path, ready) {
      await client.send("Page.navigate", { url: baseUrl + path });
      assert.ok(await waitFor(client, ready, 9000), path + " " + ready);
    }
    await visit("/a6-version.html", "!!window.LivePalmesPortalDeferred");
    overrides.set(modulePath, "window.mixedVersionExecuted = true;");
    assert.deepEqual(await evaluate(client, `let refused=false;
      try { await LivePalmesPortalDeferred.load("club-people"); } catch { refused=true; }
      return [refused, !!window.mixedVersionExecuted, document.querySelector("textarea").value];`),
      [true, false, "saisie conservée"]);
    overrides.delete(modulePath);
    await evaluate(client, 'await LivePalmesPortalDeferred.load("club-people");');

    for (const width of [390, 1280]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 850, deviceScaleFactor: 1, mobile: width < 700 });
      await visit("/a6-records.html", "typeof renderTable === 'function'");
      const row = await evaluate(client, `state.scope = "RF";
        elements.recordLevelFilter.value = "RF"; elements.sexFilter.value = "F";
        sourceRows = [{ id: "fixture", scope: "RF", sex: "F", category: "S", course: "50SF",
          swimmer: "Nom <exemple>", location: "Lieu <fictif>", time: "00:20.00", club: "A & B" }];
        renderTable(); const button = document.querySelector("[data-record-select]"); button.focus();
        return [button === document.activeElement, elements.tableBody.innerText.includes("Lieu <fictif>")];`);
      assert.deepEqual(row,[true,true]);
      for(const selected of ["true","false"]) {
        for(const type of ["keyDown","keyUp"]) await client.send("Input.dispatchKeyEvent",{type,key:"Enter",code:"Enter",windowsVirtualKeyCode:13, ...(type === "keyDown" ? { text: "\r" } : {})});
        assert.ok(await waitFor(client,'document.activeElement?.getAttribute("aria-expanded")==='+JSON.stringify(selected),3000));
      }
      await visit("/direct-secours.html", "!!document.querySelector('main h1')");
      assert.ok(await evaluate(client,"return document.documentElement.scrollWidth <= window.innerWidth;"));
    }
    const pdf = await browser.client.send("Page.printToPDF", { preferCSSPageSize: true });
    assert.equal((Buffer.from(pdf.data,"base64").toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length,1);
    console.log("A6 : version incompatible refusée avant exécution, brouillon conservé, reprise réussie ; Records clavier et texte littéral à 390/1280 px ; fiche secours sur une page.");
  } finally {
    if (browser) { await browser.client.send("Browser.close").catch(()=>{}); browser.cleanup(); }
    server.closeAllConnections(); server.close();
  }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
