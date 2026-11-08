"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), fs = require("node:fs");
const { startStaticServer, launchBrowser, waitFor, presentationScript } = require("../tools/capture-portal-design");
const { evaluate } = require("./helpers/portal-browser-evaluate");
const { memoryDb } = require("./mail-templates-tests");
const templates = require("../functions/mail-templates");
const getFactory = require("../functions/backend/portal-competition-handlers/get-engagement-automatic-mail-control").createCompetitionHandlers_getEngagementAutomaticMailControl;
const setFactory = require("../functions/backend/portal-competition-handlers/update-engagement-automatic-mail-control").createCompetitionHandlers_updateEngagementAutomaticMailControl;
async function main() {
  const { server, baseUrl } = await startStaticServer(), staticHandler = server.listeners("request")[0];
  let db = memoryDb(), calls = [], national = true;
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  server.removeListener("request", staticHandler);
  server.on("request", (request, response) => {
    if (request.url !== "/__mail_fixture") return staticHandler(request, response);
    let body = ""; request.on("data", chunk => { body += chunk; }); request.on("end", async () => {
      try {
        const { name, data } = JSON.parse(body); calls.push({ name, action: data.action });
        const context = { db, HttpsError, ENVIRONMENT: { projectId: "livepalmes-test" }, engagementAccessContext: async () => ({ national, uid: "fixture", email: "fixture@example.invalid" }) };
        assert.ok(["getEngagementAutomaticMailControl", "updateEngagementAutomaticMailControl"].includes(name));
        const value = name.startsWith("get") ? await getFactory(context).getEngagementAutomaticMailControl({ data }) : await setFactory(context).updateEngagementAutomaticMailControl({ data });
        response.writeHead(200, { "Content-Type": "application/json" }); response.end(JSON.stringify({ data: value }));
      } catch (error) { response.writeHead(200, { "Content-Type": "application/json" }); response.end(JSON.stringify({ error: { message: error.message, code: error.code } })); }
    });
  });
  let browser;
  try { browser = await launchBrowser(); } catch (error) { server.close(); throw error; }
  const client = browser.client;
  fs.mkdirSync("tmp/mail-template-editor", { recursive: true });
  try {
    for (const width of [1280, 390, 320]) {
      db = memoryDb(); calls = []; national = true;
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 700 });
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: width < 700 });
      await evaluate(client, "window.fixtureNavigating=true;");
      await client.send("Page.navigate", { url: baseUrl + `/portail.html?mail-fixture=${width}#administration-notifications` });
      assert.ok(await waitFor(client, "document.readyState === 'complete' && !window.fixtureNavigating", 12000));
      await evaluate(client, presentationScript({ authenticated: true, hash: "administration-notifications", selector: "#adminNationalNotificationsView", pinned: true }));
      await evaluate(client, `await Promise.all([...document.querySelectorAll('[data-portal-style-src]')].filter(slot=>!slot.dataset.portalStyleView||slot.dataset.portalStyleView==='nationalNotifications').map(slot=>slot.sheet?Promise.resolve():new Promise((resolve,reject)=>{slot.onload=resolve;slot.onerror=reject;slot.href=slot.dataset.portalStyleSrc;})));`);
      await evaluate(client, `
        window.LivePalmesAppConfig={firebaseConfig:{}};
        window.firebase={apps:[{}],initializeApp(){throw Error('No remote SDK');},functions:{},app:()=>({functions:()=>({httpsCallable:name=>async data=>{
          const result=await (await fetch('/__mail_fixture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,data})})).json();
          if(result.error)throw Object.assign(Error(result.error.message),{code:result.error.code});return result;
        }})})};
        const state={activeAuthUid:'fixture',adminAuth:{hasCapability:cap=>cap==='engagements.national.manage'},currentAccessProfile:{capabilities:['engagements.national.manage']}};
        window.fixtureState=state;
        const loader=LivePalmesPortalModulesAndClubs.create({state,actions:{},config:{},elements:{}});
        window.fixtureNav=LivePalmesPortalNavigation.create({state,config:{portalCallSamples:new Map(),PORTAL_FRENCH_ERROR_REPLACEMENTS:[]},elements:{},actions:{loadScriptOnce:loader.loadScriptOnce,callFunction:(...args)=>fixtureNav.callFunction(...args)}});
        await fixtureNav.loadNationalAutomaticMailControl();
      `);
      assert.equal(calls.filter(call => call.action === "mailTemplates").length, 0, "Lazy catalogue loading");
      const point = await evaluate(client, `const button=document.querySelector('#adminNationalMailTemplatesOpen');button.scrollIntoView({block:'center'});const rect=button.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};`);
      if (width < 700) await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      else await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
      if (width < 700) await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      else await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-form]')?.hidden===false"));
      assert.equal(calls.filter(call => call.action === "mailTemplates").length, 1);
      await evaluate(client, `const selector=document.querySelector('[data-mail-type]');selector.value='club_recap_pdf';selector.dispatchEvent(new Event('change'));document.querySelector('[data-mail-preview]').click();`);
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-preview-panel]').hidden===false"));
      assert.equal(db.rows.size, 0, "Preview never writes a configuration, event or job");
      const layout = await evaluate(client, `const root=document.querySelector('#adminNationalMailTemplates');return {overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('input,textarea,select')].map(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;}),buttons:[...root.querySelectorAll('button')].filter(el=>el.getBoundingClientRect().height>0).every(el=>el.getBoundingClientRect().height>=44),preview:root.querySelector('[data-mail-preview-text]').textContent};`);
      assert.equal(layout.overflow, false); assert.ok(layout.fields.every(Boolean));
      assert.ok(layout.buttons, JSON.stringify(await evaluate(client, "return [...document.querySelectorAll('#adminNationalMailTemplates button')].map(el=>[el.textContent,el.getBoundingClientRect().height,getComputedStyle(el).minHeight]);")));
      assert.match(layout.preview, /Club Exemple/);
      await evaluate(client, String.raw`const text=document.querySelector('[data-mail-text]');text.value='Bonjour personnalisé\n\n'+text.value;text.dispatchEvent(new Event('input'));document.querySelector('[data-mail-save]').focus();`);
      await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
      await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-status]').textContent.includes('Modèle enregistré')"), JSON.stringify(await evaluate(client,"return {status:document.querySelector('[data-mail-status]').textContent,active:document.activeElement?.outerHTML,valid:document.querySelector('[data-mail-form]').checkValidity()};")));
      assert.equal(db.rows.size, 2); assert.equal(db.rows.get("engagementConfigurations/mailTemplates").revision, 1);
      await evaluate(client, String.raw`const text=document.querySelector('[data-mail-text]');text.value+='\n{{interdit}}';text.dispatchEvent(new Event('input'));document.querySelector('[data-mail-save]').click();`);
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-status]').dataset.tone==='error'"));
      assert.equal(db.rows.get("engagementConfigurations/mailTemplates").revision, 1);
      await templates.update(db, { id: "club_recap_pdf", operation: "reset", expectedRevision: 1 }, { national: true, uid: "another" });
      await evaluate(client, String.raw`const text=document.querySelector('[data-mail-text]');text.value=text.value.replace('\n{{interdit}}','');text.dispatchEvent(new Event('input'));document.querySelector('[data-mail-save]').click();`);
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-status]').textContent.includes('changé')"));
      await evaluate(client, `window.confirm=()=>true;document.querySelector('[data-mail-refresh]').click();`);
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-status]').textContent.includes('Modèles chargés')"));
      await evaluate(client, `document.querySelector('[data-mail-reset]').click();`);
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-status]').textContent.includes('rétabli')"));
      assert.ok([...db.rows.keys()].every(key => key.startsWith("auditLogs/") || key === "engagementConfigurations/mailTemplates"));
      await evaluate(client, `const selector=document.querySelector('[data-mail-type]');selector.value='license_control_report';selector.dispatchEvent(new Event('change'));document.querySelector('[data-mail-preview]').click();`);
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-preview-panel]').hidden===false"));
      assert.match(await evaluate(client, "return document.querySelector('[data-mail-preview-text]').textContent;"), /Une erreur technique/);
      const priorLoads=calls.filter(call=>call.action==='mailTemplates').length;
      await evaluate(client, `document.querySelector('[data-mail-text]').value+=' Brouillon privé';document.querySelector('[data-mail-text]').dispatchEvent(new Event('input'));fixtureState.activeAuthUid='other-national';await fixtureNav.loadNationalAutomaticMailControl();`);
      assert.equal(await evaluate(client,"return document.querySelector('#adminNationalMailTemplates').hidden;"),true,'Account changes immediately clear and hide the previous draft');
      assert.equal(await evaluate(client,"return document.querySelector('#adminNationalMailTemplatesOpen').getAttribute('aria-expanded');"),'false');
      await evaluate(client,"document.querySelector('#adminNationalMailTemplatesOpen').click();");
      assert.ok(await waitFor(client,"document.querySelector('[data-mail-form]')?.hidden===false"));
      assert.equal(calls.filter(call=>call.action==='mailTemplates').length,priorLoads+1);
      assert.equal(await evaluate(client,"return document.querySelector('[data-mail-text]').value.includes('Brouillon privé');"),false,'A new account must never inherit another account’s unsaved draft');
      await evaluate(client, "document.querySelector('#adminNationalMailTemplates').scrollIntoView({block:'start'});document.documentElement.dataset.portalTheme='dark';");
      fs.writeFileSync(`tmp/mail-template-editor/${width}.png`, Buffer.from((await client.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
      await evaluate(client, `window.slowEditor=LivePalmesMailTemplateEditor.open({root:document.querySelector('#adminNationalMailTemplates'),identity:'slow-account',callFunction:()=>new Promise(resolve=>window.releaseSlowEditor=resolve)});await LivePalmesMailTemplateEditor.open({root:document.querySelector('#adminNationalMailTemplates'),identity:'current-account',callFunction:(...args)=>fixtureNav.callFunction(...args)});releaseSlowEditor({revision:999,models:[{id:'stale',label:'Compte précédent',subject:'Ancien compte',text:'Ancien brouillon',variables:[],required:[],blocks:[],editable:true}]});await slowEditor;`);
      assert.notEqual(await evaluate(client,"return document.querySelector('[data-mail-type]').value;"),'stale','Late responses from the previous account cannot replace the current editor');
      national = false;
      await evaluate(client, "document.querySelector('[data-mail-refresh]').click();");
      assert.ok(await waitFor(client, "document.querySelector('[data-mail-status]').textContent.includes('nationale')"));
      console.log(`${width}px: real navigation/lazy editor and handlers, keyboard/touch, preview/no send, save/reset, conflict, variables, national denial and layout passed on fixtures.`);
    }
  } finally { browser.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
