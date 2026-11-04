"use strict";
// Real portal markup/CSS, presentation fixtures and local-only services.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript, views } = require("../tools/capture-portal-design");
const root = path.resolve(__dirname, "..");
const presentation = ["livepalmes-public-shell.js", "livepalmes-portal-appearance.js", "livepalmes-portal-ux.js", "livepalmes-portal-shell.js", "livepalmes-engagement-qualifications.js"];
const stripStartup = text => text.replace(/<script\b[\s\S]*?<\/script>/gi, tag => presentation.some(name => tag.includes("/" + name)) ? tag : "");

// Contrast is measured on the actual containing surfaces, not inferred from tokens.
function contrastExpression(selector, minimum = 4.5) {
  return `
    const rgb = value => value.match(/[\\d.]+/g).map(Number);
    const lum = c => c.slice(0,3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4; }).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
    return [...document.querySelectorAll(${JSON.stringify(selector)})].filter(el => el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}) && el.getBoundingClientRect().width > 0).map(el => {
      let node=el, bg=[255,255,255];
      while(node) { const color=rgb(getComputedStyle(node).backgroundColor); if(color.length===3 || color[3]===1){bg=color;break;} node=node.parentElement; }
      const fg=rgb(getComputedStyle(el).color), a=lum(fg), b=lum(bg);
      return {text:el.textContent.trim().slice(0,70), ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05), minimum:${minimum}};
    });
  `;
}

async function main() {
  const portal = stripStartup(fs.readFileSync(path.join(root, "portail.html"), "utf8"));
  const publicPage = stripStartup(fs.readFileSync(path.join(root, "index.html"), "utf8"));
  const { server, baseUrl } = await startStaticServer(new Map([["/portail.html", portal], ["/index.html", publicPage]]));
  let browser;
  try {
    browser = await launchBrowser();
    const client = browser.client;
    let serial = 0, assertions = 0;
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: "localStorage.clear();sessionStorage.clear();localStorage.setItem('livepalmes.portal.appearance','dark');" });
    const run = expression => evaluate(client, expression);
    async function check(selector, minimum = 4.5) {
      const samples = await run(contrastExpression(selector, minimum));
      assert.ok(samples.length, "Visible samples: " + selector);
      for (const sample of samples) assert.ok(sample.ratio >= minimum, selector + " / " + JSON.stringify(sample));
      assertions += samples.length;
    }
    async function load(name) {
      const view = views.find(item => item.name === name), marker = "?dark-regression=" + (++serial);
      await client.send("Page.navigate", { url: baseUrl + "/portail.html" + marker + "#" + view.hash });
      assert.ok(await waitFor(client, "location.search===" + JSON.stringify(marker) + "&&document.readyState==='complete'"));
      const key = await run("return document.querySelector(" + JSON.stringify(view.selector) + ").dataset.adminView;");
      await run(`
        document.querySelectorAll('link[data-portal-style-src]').forEach(el => { if(!el.dataset.portalStyleView || el.dataset.portalStyleView===${JSON.stringify(key)}) el.href=el.dataset.portalStyleSrc; });
        document.getElementById('adminPerformanceStyles').disabled=!${JSON.stringify(["import", "correction", "records"].includes(key))};
        document.getElementById('adminImportStyles').disabled=!${JSON.stringify(["import", "correction"].includes(key))};
        return true;
      `);
      assert.ok(await waitFor(client, `[...document.querySelectorAll('link[data-portal-style-src]')].filter(el=>!el.dataset.portalStyleView||el.dataset.portalStyleView===${JSON.stringify(key)}).every(el=>el.sheet)`));
      await run(presentationScript(view));
      await run("scrollTo(0,0);return true;");
    }
    for (const width of [1280, 390, 320]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 700 });
      await load("access-request-loading");
      await check(".admin-portal-login-access summary,.admin-access-new-club-toggle > span:last-child");
      await load("access-user-add");
      await run("document.querySelector('#adminAccessPanel').showModal();return true;");
      await check("#adminAccessDialogTitle,.admin-access-rights label > span,.admin-access-reset-choice");
      await run("document.querySelector('.admin-access-rights input').checked=true;return true;");
      await check(".admin-access-rights label > span");
      await load("access-request-review");
      await run("document.querySelector('#adminEngagementsAccessRequestEditDialog').showModal();return true;");
      await check("#adminEngagementsAccessRequestEditTitle,.admin-access-request-review-head > span,.admin-access-request-review-head p,#adminEngagementsAccessRequestEditDialog label");
      await load("competition-detail-edit");
      await check("#adminEngagementsEditForm .admin-engagements-compact-field,#adminEngagementsFeesBlock strong,#adminEngagementsFeesGrid label");
      await load("club-officials-add");
      await check(".admin-engagements-club-person-identity-grid label,.admin-engagements-club-person-roles span");
      await load("club-swimmers");
      await check(width < 700 ? ".admin-engagements-club-swimmers-directory-sex" : ".admin-engagements-club-swimmers-directory-license-missing");
      await load("national-audit");
      await check(".admin-national-audit-entry-details dd");
      await load("club-courses");
      await check(".admin-engagements-detail-step-bar > button span,.admin-engagements-club-entry-group-head h4");
      await load("national-licenses");
      await check(".admin-license-admin-import > span");
      await load("account");
      await check(".public-site-wordmark,.public-site-wordmark small");
      const darkGeometry = await run("const r=document.querySelector('.public-site-header').getBoundingClientRect();return {width:r.width,height:r.height};");
      await run("document.querySelector('[data-portal-appearance=light]').click();return true;");
      assert.equal(await run("return getComputedStyle(document.querySelector('.public-site-header')).backgroundColor;"), "rgb(255, 255, 255)");
      assert.deepEqual(await run("const r=document.querySelector('.public-site-header').getBoundingClientRect();return {width:r.width,height:r.height};"), darkGeometry);
      await run("document.querySelector('[data-portal-appearance=dark]').click();document.querySelector('.public-site-brand').focus();return true;");
      await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      assert.equal(await run("return document.activeElement.matches(':focus-visible');"), true);
      await run("document.querySelector('#adminPortalAccountActions').hidden=false;return true;");
      await check("#adminPortalAccountActions a,#adminPortalAccountActions button");
      if (width > 850) {
        await run("document.querySelector('#adminPortalAccountActions').hidden=true;document.querySelector('.public-site-performances').open=true;return true;");
        await check(".public-site-dropdown a");
      }
      await run(`
        document.querySelector('#adminPortalAccountActions').hidden=true;
        const old=document.getElementById('adminQualificationEditor'); if(old)old.remove();
        const mount=document.createElement('fieldset');mount.id='adminQualificationEditor';document.querySelector('#adminAccountView').append(mount);
        LivePalmesEngagementQualifications.editor(mount,{national:true,rules:{enabled:true,groups:[{categories:['S'],pools:['25','50'],chrono:'all'}]},events:[{type:'individual',code:'50SF',label:'Démonstration',categories:['S']}]});
        return true;
      `);
      await check(".qualification-enable strong,.qualification-enable small,.qualification-options > span,.qualification-button,.qualification-grid-block h4");
      await run("document.querySelector('.qualification-enable input').click();return true;");
      await check(".qualification-enable strong,.qualification-enable small");
      await load("import");
      await run(`
        const sample=document.createElement('section');sample.className='import-review-compact';
        sample.innerHTML='<nav class="import-review-nav"><details open><summary>Cas à contrôler</summary></details></nav><div class="import-review-pane"><details open><summary>Profil à vérifier</summary><div class="import-profile-comparison"><article><h4>Profil proposé</h4><p>Démonstration</p></article></div></details></div><section class="import-confirmation-message"><h4>Confirmation</h4><p>Aucun envoi réel</p></section>';
        document.querySelector('#adminImportView').append(sample);return true;
      `);
      await check(".import-review-nav summary,.import-review-pane summary,.import-profile-comparison h4,.import-profile-comparison p,.import-confirmation-message h4,.import-confirmation-message p");
      await run(`
        const sample=document.createElement('div');sample.id='darkPrintFixture';
        sample.innerHTML='<span class="admin-pending-badge">5</span><div class="admin-engagements-club-entry-row" data-sex="F"><span>Identité de démonstration</span></div><div class="admin-engagements-club-swimmers-directory-row" data-sex="F"><span class="admin-engagements-club-swimmers-directory-sex">F</span></div><p data-tone="warning">Contrôle nécessaire</p>';
        document.querySelector('#adminImportView').append(sample);return true;
      `);
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await check("#adminImportView h2,.import-confirmation-message h4,.import-confirmation-message p,#darkPrintFixture span,#darkPrintFixture p");
      await client.send("Emulation.setEmulatedMedia", { media: "" });
      await client.send("Page.navigate", { url: baseUrl + "/index.html?public-dark-regression=" + width });
      assert.ok(await waitFor(client, "location.pathname==='/index.html'&&document.readyState==='complete'"));
      assert.equal(await run("return getComputedStyle(document.querySelector('.public-site-header')).backgroundColor;"), "rgb(255, 255, 255)");
      console.log(width + "px: dark surfaces, dialogs, header, light/public isolation, keyboard, qualification/import and print OK");
    }
    console.log(assertions + " actual text/surface contrast samples checked; no real authentication, backend or data writes.");
  } finally { browser?.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
