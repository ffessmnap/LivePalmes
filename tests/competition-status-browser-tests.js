"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.LIVEPALMES_BROWSER_EXECUTABLE ? { executablePath: process.env.LIVEPALMES_BROWSER_EXECUTABLE } : {}) });
  try {
    for (const width of [1440, 390, 320]) for (const national of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 950 }, hasTouch: true }), errors = [], requests = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
      await page.setContent('<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page"></body></html>');
      await page.evaluate(html => {
        const source = new DOMParser().parseFromString(html, "text/html");
        const card = source.querySelector("#adminEngagementsCalendarCard"); card.hidden = false; document.body.append(card);
      }, fs.readFileSync("portail.html", "utf8"));
      for (const file of ["styles.css", "assets/livepalmes-admin-portal.css"]) {
        // Resolve imports locally; every external request remains blocked.
        let css = fs.readFileSync(file, "utf8");
        if (file.includes("admin-portal")) css = css.replace(/@import url\("([^"?]+)(?:\?[^" ]*)?"\);/g, (_, name) => fs.readFileSync("assets/" + name, "utf8"));
        await page.addStyleTag({ content: css });
      }
      for (const file of ["navigation", "competition-settings", "documents-and-program"]) await page.addScriptTag({ path: `assets/portal/${file}.js` });
      await page.evaluate(national => {
        const state = { engagementCompetitions: [], selectedEngagementCompetitionId: "" }, calls = [];
        const context = { state, actions: {}, config: {}, elements: {} }, actions = context.actions;
        Object.assign(actions, LivePalmesPortalNavigation.create(context), LivePalmesPortalCompetitionSettings.create(context), LivePalmesPortalDocumentsAndProgram.create(context));
        Object.assign(actions, { escapeHtml: value => String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[char]), isEngagementAdminMode: () => true, canUse: capability => national && capability === "engagements.national.manage", engagementSeasonBounds: () => ({ startYear: 2026 }), canonicalLivePalmesRegion: () => "", currentEngagementSeasonStartYear: () => 2026, regionDisplayLabel: () => "Île-de-France", engagementCompetitionIsInSeptemberPreview: () => false, engagementCalendarFiltersPayload: () => ({}), callFunction: (...args) => { calls.push(args); throw Error("Unexpected network call"); } });
        const base = { publicationStatus: "published", eventType: "pool", entryStatus: "upcoming", date: "2026-11-08", level: national ? "national" : "regional", regionId: "IDF", city: "Une ville au nom long", name: "Compétition au nom suffisamment long pour vérifier la présentation mobile" };
        const states = [
          { canceled: true, resultsPublishedAt: base.date },
          { resultsPdfUrl: "https://example.test/protocole.pdf", entryStatus: "closed" },
          { entryStatus: "closed" },
          { entryStatus: "open", entryDeadlineAt: new Date(Date.now() + 3600000).toISOString() },
          {}, { entryStatus: "open", entryDeadlineAt: "" },
          { eventType: "training", sourceType: "calendarEvent", entryStatus: "" }
        ];
        state.engagementCompetitions = states.map((patch, index) => ({ ...base, ...patch, id: String(index + 1) }));
        document.querySelector("#adminEngagementsCalendarList").innerHTML = actions.renderEngagementCompetitionTable(state.engagementCompetitions, "upcoming", 24);
        document.querySelector("#adminEngagementsCalendarList").addEventListener("click", event => {
          const button = event.target.closest("[data-engagement-competition-id]");
          if (button) window.openedCompetition = button.dataset.engagementCompetitionId;
        });
        window.statusFixture = { actions, state, calls };
      }, national);
      assert.deepEqual(await page.locator("[data-engagement-admin-status-id]").allTextContents(), ["Annulée", "Résultats publiés", "Engagements fermés", "Engagements ouverts", "Au calendrier", "État à vérifier", "Au calendrier"]);
      assert.equal(await page.locator(".admin-engagements-competition-status .admin-engagements-competition-entry-badge").count(), 7);
      assert.equal(await page.locator(".admin-engagements-competition-status small").count(), 0);
      await page.locator('[data-engagement-competition-id="4"]').focus();
      await page.keyboard.press("Enter"); assert.equal(await page.evaluate(() => window.openedCompetition), "4");
      await page.evaluate(() => { statusFixture.state.engagementCompetitions[3].entryDeadlineAt = new Date(Date.now() - 1).toISOString(); statusFixture.actions.refreshEngagementDeadlineCountdowns(); });
      assert.equal(await page.locator('[data-engagement-admin-status-id="4"]').textContent(), "Engagements fermés");
      assert.equal(await page.evaluate(() => document.activeElement.dataset.engagementCompetitionId), "4", "Refresh preserves focus");
      assert.equal(await page.evaluate(() => statusFixture.calls.length), 0);
      const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, badges: [...document.querySelectorAll("[data-engagement-admin-status-id]")].map(node => ({ visible: node.getBoundingClientRect().width > 0, overflow: node.scrollWidth > node.clientWidth + 1 })) }));
      assert.ok(layout.width <= layout.viewport + 1, JSON.stringify(layout));
      assert.ok(layout.badges.every(badge => badge.visible && !badge.overflow));
      if (width < 760) { await page.locator('[data-engagement-competition-id="1"]').tap(); assert.equal(await page.evaluate(() => window.openedCompetition), "1"); }
      if (process.env.LIVEPALMES_STATUS_SCREENSHOTS && national) {
        fs.mkdirSync("outputs/competition-status", { recursive: true });
        await page.screenshot({ path: `outputs/competition-status/status-${width}.png`, fullPage: true });
      }
      assert.deepEqual(errors, []);
      assert.ok(requests.every(url => !/firebase|cloudfunctions|nap\.ffessm/.test(url)));
      await page.close();
    }
    console.log("Competition statuses browser: single badge, regional/national, 1440/390/320, touch/keyboard, deadline refresh and zero data calls verified.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
