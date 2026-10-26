"use strict";
// Real module and portal markup, synthetic accounts; all network is blocked.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { chromium } = require("playwright");
async function main() {
  const out = path.resolve("outputs/access-request-history"); fs.mkdirSync(out, { recursive: true });
  const portal = fs.readFileSync("portail.html", "utf8");
  const start = portal.indexOf('<div id="adminEngagementsAccessRequestsPanel"');
  const end = portal.indexOf('<dialog id="adminEngagementsAccessRequestEditDialog"', start);
  const markup = portal.slice(start, end).replace(' hidden>', '>') + '</section></div>';
  const css = ["styles.css", "assets/livepalmes-admin-portal.css", "assets/livepalmes-portal-appearance.css"].map(file => fs.readFileSync(file, "utf8")).join("\n");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.LIVEPALMES_BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  try { for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route("**/*", route => route.abort());
    await page.setContent(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body class="admin-portal-page"><main class="admin-portal" style="padding:12px"><h1>Demandes d’accès</h1>${markup}</main></body></html>`);
    await page.addScriptTag({ content: fs.readFileSync("assets/livepalmes-access-request-history.js", "utf8") });
    await page.evaluate(() => {
      window.calls = []; window.scope = "region-a"; window.allowed = true; window.fail = false; window.hold = false;
      window.controller = LivePalmesAccessRequestHistory.create({ root: document.querySelector("#adminEngagementsAccessRequestsPanel"), canReview: () => allowed, scopeKey: () => scope,
        loadPending: () => {}, closeEditor: () => {}, callFunction: async (name, input) => {
          calls.push({ name, input }); if (fail) throw Error("Réseau indisponible");
          if (hold) await new Promise(resolve => { window.release = resolve; });
          return { requests: [{ id: input.cursor ? "older" : "recent", firstName: "Camille", lastName: "Martin", email: "camille@example.invalid", clubName: "Club avec un nom particulièrement long à vérifier sur téléphone", regionId: scope, status: input.cursor ? "rejected" : "approved", resolvedAt: "2026-10-26T13:32:00.000Z", resolvedByName: input.cursor ? "" : "Alex Dupont", resolvedByEmail: "admin@example.invalid", resolutionReason: "Demande en double <script>" }], nextCursor: input.cursor ? null : { id: "recent", resolvedAt: "2026-10-26T13:32:00.000Z" } };
        } });
    });
    const history = page.locator("[data-access-requests-show-history]"), pending = page.locator("[data-access-requests-show-pending]"), refresh = page.locator("[data-access-requests-refresh]");
    assert.equal(await page.evaluate(() => calls.length), 0, "Chargement à la demande");
    await history.click(); await page.waitForFunction(() => document.querySelector("[data-access-requests-history-status]").dataset.tone === "ok");
    assert.match(await page.locator("[data-access-requests-history-list]").innerText(), /Alex Dupont/);
    await pending.click(); await history.click(); assert.equal(await page.evaluate(() => calls.length), 1, "Cache au retour");
    await page.locator("[data-access-requests-next]").click(); await page.waitForFunction(() => document.querySelectorAll(".admin-access-history-card").length === 2);
    assert.equal(await page.locator("[data-access-requests-next]").isHidden(), true);
    await page.locator("details > summary").click(); assert.match(await page.locator("details[open]").innerText(), /Demande en double <script>/);
    if (width > 700) {
      const positions = await page.locator(".admin-access-history-card .admin-engagements-request-scope").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
      assert.equal(positions[0], positions[1], "Colonnes alignées avec ou sans motif de refus");
    }
    assert.equal(await page.locator("[data-access-requests-history-list] script").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Débordement ${width}`);
    await page.screenshot({ path: path.join(out, `historique-${width}.png`), fullPage: true });
    await page.evaluate(() => { window.fail = true; }); await refresh.click();
    await page.waitForFunction(() => document.querySelector("[data-access-requests-history-status]").dataset.tone === "error");
    assert.equal(await page.locator(".admin-access-history-card").count(), 2, "Erreur conserve les lignes déjà lues");
    await page.evaluate(() => { window.fail = false; }); await refresh.click();
    await page.waitForFunction(() => document.querySelectorAll(".admin-access-history-card").length === 1);
    await page.evaluate(() => { scope = "changed-region"; controller.onProfileChange(); });
    assert.equal(await page.locator(".admin-access-history-card").count(), 0, "Changement de droits/périmètre efface le cache");
    await history.focus(); await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".admin-access-history-card").length === 1);
    await page.evaluate(() => { window.hold = true; }); await refresh.click();
    await page.waitForFunction(() => typeof window.release === "function");
    await page.evaluate(() => { controller.reset(); scope = "region-b"; release(); });
    assert.equal(await page.locator(".admin-access-history-card").count(), 0, "Réponse ancienne ignorée après changement de compte");
    await page.evaluate(() => { allowed = false; controller.onOpen(); }); assert.equal(await page.locator("[data-access-requests-history]").isHidden(), true);
    await page.close();
  } } finally { await browser.close(); }
  console.log("Historique navigateur : données fictives hors réseau, cache, suite, refresh, erreur, réponse obsolète, clavier/toucher et 1440/390/320px OK");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
