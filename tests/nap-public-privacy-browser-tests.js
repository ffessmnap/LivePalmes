"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor } = require("../tools/capture-portal-design");
const { publicSportingPayload } = require("../functions/nap-public-privacy");
const birthday = "2004-06-17";
const person = { id: "1", firstName: "Paul", lastName: "FICTIF", name: "Paul FICTIF", birthDate: birthday, sex: "M", club: "ABC", clubName: "Club fictif", identityKey: "FICTIF|PAUL|" + birthday, aliases: [], sourceIds: ["1"] };
const row = { id: "1", source: "nap", swimmerId: "1", swimmerIdentityKey: person.identityKey, swimmer: person.name, firstName: person.firstName, lastName: person.lastName, birthDate: birthday, sex: "M", competitionId: "1", competition: "Compétition fictive", date: "2025-05-01", seasonYear: 2025, location: "Piscine fictive", pool: "50", chrono: "E", course: "50SF", courseLabel: "50 m Surface", courseShortLabel: "50 SF", style: "SF", length: 50, category: "S", categoryCode: "HSE", categoryLabel: "Senior", timeValue: 2000, time: "00:20.00", club: "ABC", clubName: "Club fictif" };
const payload = publicSportingPayload({ source: "nap", swimmer: { ...person, rows: [row], rowCount: 1, performanceCount: 1 } }, "offline-browser-fixture");
async function main() {
  const { server, baseUrl } = await startStaticServer(); let browser;
  const output = path.resolve("tmp/audit-a1-browser"); fs.mkdirSync(output, { recursive: true });
  try {
    browser = await launchBrowser(); const client = browser.client;
    await client.send("Network.enable");
    await client.send("Network.setBlockedURLs", { urls: ["https://*"] });
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: `
      window.__privacyReads=[];window.__privacyErrors=[];window.addEventListener('error',event=>__privacyErrors.push(event.message));window.addEventListener('unhandledrejection',event=>__privacyErrors.push(String(event.reason)));const originalFetch=window.fetch.bind(window),profile=${JSON.stringify(payload)};
      window.fetch=async function(input,options){const url=new URL(String(input),location.href);if(url.origin===location.origin)return originalFetch(input,options);
        window.__privacyReads.push(url.searchParams.get('action'));let data;
        if(url.searchParams.get('action')==='swimmer')data=profile;
        else if(url.searchParams.get('action')==='records')data={source:'nap',data:{records:[],franceRecords:[],filters:{}}};
        else if(url.searchParams.get('action')==='search')data={source:'nap',swimmers:[profile.swimmer]};
        else throw Error('External network forbidden in A1 fixture');
        return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
      };` });
    for (const width of [390, 1440]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 700 });
      await client.send("Page.navigate", { url: baseUrl + "/performances/nageur.html?id=1" });
      const ready = await waitFor(client, "document.querySelector('#swimmerTitle')?.textContent === 'Paul FICTIF (2004)' && window.__privacyReads.includes('records') && document.querySelector('#swimmerStatus')?.textContent === ''", 12000);
      assert.ok(ready, "Year visible at " + width + ": " + JSON.stringify(await evaluate(client, "return {status:document.querySelector('#swimmerStatus')?.textContent,profile:document.querySelector('#swimmerProfilePanel')?.textContent,reads:__privacyReads,errors:__privacyErrors}")));
      const proof = await evaluate(client, `return {profile:document.querySelector('#swimmerProfilePanel').textContent,body:document.body.innerText,reads:__privacyReads,title:document.querySelector('#swimmerTitle').textContent,yearWeight:getComputedStyle(document.querySelector('#swimmerTitle span')).fontWeight}`);
      assert.equal(proof.title, "Paul FICTIF (2004)");
      assert.equal(proof.yearWeight, "400");
      assert.ok(!proof.body.includes("Année de naissance"));
      assert.ok(!proof.body.includes(birthday) && !proof.body.includes("17/06/2004"));
      assert.ok(proof.reads.includes("swimmer") && proof.reads.includes("records"));
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(output, `profile-${width}.png`), Buffer.from(shot.data, "base64"));
    }
    console.log("Public profile: actual page at 390/1440px, year-only display, profile/history and synthetic reads verified; external HTTPS blocked.");
  } finally { browser?.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
