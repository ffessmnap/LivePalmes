"use strict";
// Real portal markup/CSS, presentation fixtures and local-only services.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript, views } = require("../tools/capture-portal-design");
const root = path.resolve(__dirname, "..");
const presentation = ["livepalmes-public-shell.js", "livepalmes-portal-appearance.js", "livepalmes-portal-ux.js", "livepalmes-portal-shell.js", "livepalmes-engagement-qualifications.js"];
const stripStartup = text => text.replace(/<script\b[\s\S]*?<\/script>/gi, tag => presentation.some(name => tag.includes("/" + name)) ? tag : "");
const fragments = Object.fromEntries(['records','import','correction','dtn'].map(name =>
  [name, fs.readFileSync(path.join(root,'assets/portal/views',name+'.html'),'utf8')]));

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
    async function checkEach(...selectors) {
      for (const selector of selectors) await check(selector);
    }
    async function load(name) {
      const view = views.find(item => item.name === name), marker = "?dark-regression=" + (++serial);
      await client.send("Page.navigate", { url: baseUrl + "/portail.html" + marker + "#" + view.hash });
      assert.ok(await waitFor(client, "location.search===" + JSON.stringify(marker) + "&&document.readyState==='complete'"));
      const key = await run("return document.querySelector(" + JSON.stringify(view.selector) + ").dataset.adminView;");
      if (fragments[key]) await run(`
        const mount=document.querySelector('[data-portal-fragment="${key}"]');
        mount.innerHTML=${JSON.stringify(fragments[key])};mount.hidden=false;return true;
      `);
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
      await run(`
        const regions=document.querySelector('#adminEngagementsEditForm .admin-engagements-invited-regions-field');
        regions.hidden=false;
        regions.innerHTML='<span>Régions invitées</span><div class="admin-engagements-region-choices"><label><input type="checkbox">Île-de-France</label><label><input type="checkbox" checked>Bretagne</label></div>';
        return true;
      `);
      await checkEach('.admin-engagements-region-choices label');
      // Dynamic fragments use the same DOM contracts as the program/statistics renderers.
      await run(`
        document.querySelectorAll('[data-engagements-detail-tab-panel]').forEach(el=>el.hidden=true);
        const panel=document.querySelector('#adminEngagementsDetailConfigPanel') || document.querySelector('[data-engagements-detail-tab-panel]');
        panel.hidden=false;
        const sample=document.createElement('section');sample.id='darkCompetitionAudit';
        sample.innerHTML='<details class="admin-engagements-events-section" open><summary><span>Choix des épreuves</span><small>Catégories</small></summary><div class="admin-engagements-events-head"><strong>Programme</strong></div><section class="admin-engagements-program-session" data-active="true"><div class="admin-engagements-program-session-title"><strong>Réunion 1</strong><span>Matin</span></div><div class="admin-engagements-program-row"><div class="admin-engagements-program-row-main"><span>1</span><strong>50 m surface</strong><i>Finale</i></div><span class="admin-engagements-program-format-read-value">Séries</span><span class="admin-engagements-program-phase">Finale A</span></div></section></details><div class="admin-engagements-statistics-summary"><article><small>Participants</small><strong>24</strong><span>5 clubs</span></article></div><p class="admin-engagements-statistics-warning">Un dossier à compléter</p><p class="admin-engagements-statistics-ok">Dossiers complets</p><div class="admin-engagements-statistics-club-row" role="row"><span>24</span><span>Club fictif</span><span>09/11/2026</span></div><div class="admin-engagements-documents-head"><strong>Documents partagés</strong><small>Règlement</small></div>';
        const row=sample.querySelector('.admin-engagements-program-row-main');
        for(const tone of ['female','male','relay-mixed','combined']) {
          const badge=document.createElement('em');badge.dataset.genderTone=tone;badge.textContent=tone;row.append(badge);
        }
        panel.append(sample);return true;
      `);
      await checkEach('#darkCompetitionAudit summary span','#darkCompetitionAudit summary small',
        '#darkCompetitionAudit .admin-engagements-program-session-title span',
        '#darkCompetitionAudit .admin-engagements-program-row-main > span',
        '#darkCompetitionAudit .admin-engagements-program-row-main > em',
        '#darkCompetitionAudit strong','#darkCompetitionAudit .admin-engagements-program-format-read-value',
        '#darkCompetitionAudit .admin-engagements-program-phase',
        '#darkCompetitionAudit .admin-engagements-statistics-summary small',
        '#darkCompetitionAudit .admin-engagements-statistics-summary span',
        '#darkCompetitionAudit .admin-engagements-statistics-warning','#darkCompetitionAudit .admin-engagements-statistics-ok',
        '#darkCompetitionAudit .admin-engagements-statistics-club-row > span');
      await load("club-officials-add");
      await checkEach('.admin-engagements-club-person-identity-grid label','.admin-engagements-club-person-roles span','.admin-engagements-club-person-form p');
      await load("club-swimmers");
      await check(width < 700 ? ".admin-engagements-club-swimmers-directory-sex" : ".admin-engagements-club-swimmers-directory-license-missing");
      await load("national-audit");
      await check(".admin-national-audit-entry-details dd");
      await load("club-courses");
      await check(".admin-engagements-detail-step-bar > button span,.admin-engagements-club-entry-group-head h4");
      await run(`
        document.querySelectorAll('[data-engagements-detail-tab-panel]').forEach(el=>el.hidden=true);
        document.querySelector('#adminEngagementsDetailTeamPanel').hidden=false;
        document.querySelector('#adminEngagementsClubTeamChoices').hidden=false;
        document.querySelector('#adminEngagementsClubTeamForm').dataset.locked='true';
        document.querySelector('#adminEngagementsClubTeamMessage').textContent='Renseignez le chef d’équipe avant de commencer les engagements.';
        return true;
      `);
      await checkEach('#adminEngagementsClubTeamSummary','#adminEngagementsClubTeamMessage','.admin-engagements-club-choice span');
      await run("document.querySelector('.admin-engagements-club-choice input').checked=true;return true;");
      await check('.admin-engagements-club-choice span');
      await load("national-licenses");
      await check(".admin-license-admin-import > span");
      await load("access-users");
      await run("document.querySelector('#adminAccessPagination').hidden=false;return true;");
      await check('#adminAccessPageLabel');
      await load("correction");
      await run(`
        document.querySelector('#performanceCorrectionForm').hidden=false;
        for(const id of ['performanceCorrectionDate','performanceCorrectionLocation'])document.getElementById(id).disabled=true;
        document.querySelector('#performanceCorrectionLocation').value='Lieu de démonstration';
        return true;
      `);
      await checkEach('#performanceCorrectionForm label','#performanceCorrectionForm strong','#performanceCorrectionLocation');
      await check('#performanceCorrectionHide');
      assert.equal(await run("return getComputedStyle(document.querySelector('#performanceCorrectionHide')).backgroundColor;"),'rgb(67, 42, 49)');
      assert.equal(await run("return getComputedStyle(document.querySelector('#performanceCorrectionLocation')).opacity;"),'1');
      await client.send('Emulation.setEmulatedMedia',{media:'print'});
      assert.equal(await run("return getComputedStyle(document.querySelector('#performanceCorrectionHide')).backgroundColor;"),'rgb(255, 255, 255)');
      await client.send('Emulation.setEmulatedMedia',{media:''});
      await load("records");
      await run(`
        document.querySelector('#recordHistoryPanel').hidden=false;
        document.querySelector('#recordHistoryList').innerHTML='<article class="admin-history-item"><div><span>Modification · 09/11/2026</span><strong>50 m surface</strong><small>Exemple fictif</small></div><dl><dt>Avant</dt><dd>00:22.00</dd><dt>Après</dt><dd>00:21.99</dd></dl><button type="button">Restaurer</button></article>';
        return true;
      `);
      await checkEach('.admin-history-head strong','.admin-history-head p','.admin-history-item strong','.admin-history-item span','.admin-history-item dt','.admin-history-item dd');
      await load("dtn");
      await run(`
        const sample=document.createElement('section');sample.id='darkDtnAudit';
        sample.innerHTML='<nav class="admin-dtn-edf-tabs"><button data-dtn-edf-group="senior" aria-selected="true">TSP</button><button data-dtn-edf-group="junior" aria-selected="false">TJP</button><button data-dtn-edf-group="u16" aria-selected="false">TU16 C2</button></nav><div class="admin-dtn-edf-standard-head"><strong>Temps senior</strong><span>Tous âges</span></div><details class="admin-dtn-export"><summary>Exporter les listes</summary></details>';
        document.querySelector('#adminDtnGrid').append(sample);return true;
      `);
      await checkEach('#darkDtnAudit button','#darkDtnAudit .admin-dtn-edf-standard-head span','#darkDtnAudit summary');
      const selectedTab=await run("return getComputedStyle(document.querySelector('#darkDtnAudit [aria-selected=true]')).backgroundColor;");
      assert.notEqual(selectedTab,await run("return getComputedStyle(document.querySelector('#darkDtnAudit [aria-selected=false]')).backgroundColor;"));
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
      await run("document.querySelector('#competitionImportDialog').showModal();return true;");
      await checkEach('.competition-import-dialog-head h3','.competition-import-dialog-head p','.competition-import-dialog-head span');
      await run("document.querySelector('#competitionImportDialog').close();return true;");
      await run(`
        const sample=document.createElement('section');sample.className='import-review-compact';
        sample.innerHTML='<nav class="import-review-nav"><details open><summary>Cas à contrôler</summary></details></nav><div class="import-review-pane"><details open><summary>Profil à vérifier</summary><div class="import-profile-comparison"><article><h4>Profil proposé</h4><p>Démonstration</p></article></div></details></div><section class="import-confirmation-message"><h4>Confirmation</h4><p>Aucun envoi réel</p></section>';
        document.querySelector('#adminImportView').append(sample);return true;
      `);
      await check(".import-review-nav summary,.import-review-pane summary,.import-profile-comparison h4,.import-profile-comparison p,.import-confirmation-message h4,.import-confirmation-message p");
      await run(`
        const progress=document.createElement('aside');progress.id='darkOperationAudit';progress.className='admin-long-operation';
        progress.innerHTML='<span class="admin-long-operation-icon">✓</span><strong>Traitement en cours</strong><p>Aucune donnée réelle</p><small>Veuillez patienter</small>';
        document.querySelector('#adminImportView').append(progress);return true;
      `);
      const stateColors=[];
      for(const state of ['pending','success','error','background']) {
        await run("document.querySelector('#darkOperationAudit').dataset.state="+JSON.stringify(state)+";return true;");
        await checkEach('#darkOperationAudit strong','#darkOperationAudit p','#darkOperationAudit small');
        stateColors.push(await run("return getComputedStyle(document.querySelector('#darkOperationAudit')).backgroundColor;"));
      }
      assert.equal(new Set(stateColors).size,4,'Progress states keep distinct surfaces');
      await run(`
        const sample=document.createElement('div');sample.id='darkPrintFixture';
        sample.innerHTML='<span class="admin-pending-badge">5</span><div class="admin-engagements-club-entry-row" data-sex="F"><span>Identité de démonstration</span></div><div class="admin-engagements-club-swimmers-directory-row" data-sex="F"><span class="admin-engagements-club-swimmers-directory-sex">F</span></div><p data-tone="warning">Contrôle nécessaire</p>';
        document.querySelector('#adminImportView').append(sample);return true;
      `);
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await check("#adminImportView h2,.import-confirmation-message h4,.import-confirmation-message p,#darkPrintFixture span,#darkPrintFixture p");
      await checkEach('#darkOperationAudit strong','#darkOperationAudit p');
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
