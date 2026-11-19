"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor } = require("../tools/capture-portal-design");
const portal = fs.readFileSync(path.join(__dirname, "../portail.html"), "utf8");
const card = portal.match(/<section id="adminOrganizerFeesCard"[\s\S]*?<\/section>/)[0];
const styles = [...portal.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(match => match[0]).filter(link => !/https?:/.test(link));
const fixture = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.join("")}</head>
<body>${card}<script>
window.LivePalmesPortalDeferred = { register(name, factory) { window.createEvents = factory; } };
</script><script src="/assets/portal/deferred/workspace-events.js"></script><script>
const requests = [], downloads = [], confirmations = [];
let approve = false, failOnce = true, nextId = 0;
const context = { state:{selectedEngagementCompetitionId:"legacy-nap-42",selectedEngagementCompetition:{name:"Meeting exemple"}},
  config:{}, elements:{engagementsHomeLinks:[]}, actions:{
    callFunction:async (name, input) => {
      requests.push(input);
      if (input.action === "preview-organizer-fees") return {pdfBase64:"fixture",fileName:"frais.pdf",total:"15,00 €",
        recipients:["orga@example.invalid"],digest:"fixture",requestId:"request-"+(++nextId)};
      if (failOnce) { failOnce = false; throw Error("Connexion interrompue"); }
      return {simulated:true};
    },
    downloadBase64File:(...args)=>downloads.push(args)
  }
};
window.confirm = text => {confirmations.push(text);return approve;};
createEvents(context).bindWorkspaceEvents();
document.getElementById("adminOrganizerFeesCard").hidden = false;
</script></body></html>`;

async function main() {
  const { server, baseUrl } = await startStaticServer(new Map([["/organizer-fixture.html", fixture]]));
  let browser;
  try {
    browser = await launchBrowser();
    const client = browser.client;
    const run = code => evaluate(client, code);
    const click = action => run(`document.querySelector('[data-organizer-fees="${action}"]').click();`);
    await client.send("Network.enable");
    await client.send("Network.setBlockedURLs", { urls: ["https://*"] });
    await client.send("Page.navigate", {url:baseUrl + "/organizer-fixture.html"});
    assert.ok(await waitFor(client, 'document.querySelector("#adminOrganizerFeesCard")?.hidden === false'));
    for (const width of [1280,390,320]) {
      await client.send("Emulation.setDeviceMetricsOverride", {width,height:800,deviceScaleFactor:1,mobile:width<500});
      assert.ok(await run("return Array.from(document.querySelectorAll('[data-organizer-fees]')).every(button => {const rect=button.getBoundingClientRect();return rect.width>0 && rect.left>=0 && rect.right<=innerWidth;});"));
    }
    await click("download");
    assert.deepEqual(await run("return downloads[0];"), ["fixture","frais.pdf","application/pdf"]);
    await click("send");
    assert.match(await run("return confirmations[0];"), /15,00 €[\s\S]*orga@example\.invalid/);
    assert.equal(await run("return requests.filter(r=>r.action==='send-organizer-fees').length;"),0);
    await run("approve=true;");
    await click("send");
    assert.match(await run("return document.querySelector('[role=status]').textContent;"), /interrompue/);
    await click("send");
    assert.match(await run("return document.querySelector('[role=status]').textContent;"), /Simulation TEST réussie/);
    const sent = await run("return requests.filter(r=>r.action==='send-organizer-fees');");
    assert.equal(sent.length,2);
    assert.equal(sent[0].requestId,sent[1].requestId);
    assert.deepEqual(client.events.filter(event=>event.method==="Runtime.exceptionThrown"),[]);
    console.log("Frais organisateur : téléchargement, confirmation, reprise et affichage à 1280, 390 et 320 px vérifiés.");
  } finally {
    browser?.cleanup();
    server.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
