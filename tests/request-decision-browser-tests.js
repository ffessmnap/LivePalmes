"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), fs = require("node:fs");
const { startStaticServer, launchBrowser, waitFor } = require("../tools/capture-portal-design");
const { evaluate } = require("./helpers/portal-browser-evaluate");
(async () => {
  const { server, baseUrl } = await startStaticServer(), browser = await launchBrowser(), client = browser.client;
  try {
    for (const width of [1280, 390, 320]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 1000 });
      await client.send("Page.navigate", { url: baseUrl + "/portail.html" });
      assert.ok(await waitFor(client, "document.readyState === 'complete'", 12000));
      await evaluate(client, `await Promise.all(Array.from(document.querySelectorAll('[data-portal-style-src]')).map(link=>new Promise(resolve=>{link.onload=resolve;link.href=link.dataset.portalStyleSrc;})));`);
      await evaluate(client, `window.choice=null;window.pendingChoice=LivePalmesRequestDecision.collect({decision:'rejected',title:'Refuser une demande'}).then(value=>choice=value);`);
      assert.equal(await evaluate(client, "return document.querySelector('[data-decision-notify]').checked;"), true);
      await evaluate(client, "document.querySelector('[data-decision-notify]').click();document.querySelector('dialog[open] button[type=submit]').click();");
      assert.equal(await evaluate(client, "return choice;"), null);
      assert.equal(await evaluate(client, "return document.querySelector('[data-decision-comment]').required;"), true);
      await evaluate(client, "const input=document.querySelector('[data-decision-comment]');input.value='Motif public';input.dispatchEvent(new Event('input'));document.querySelector('dialog[open] button[type=submit]').click();await pendingChoice;");
      assert.deepEqual(await evaluate(client, "return choice;"), { resolutionNote: "Motif public", notifyRequester: false });
      await evaluate(client, "window.pendingChoice=LivePalmesRequestDecision.collect({decision:'approved',title:'Valider une demande'}).then(value=>choice=value);");
      const geometry = await evaluate(client, "const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect(),b=d.querySelector('button').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,button:b.height};");
      assert.ok(geometry.left >= 0 && geometry.right <= geometry.width, JSON.stringify(geometry));
      assert.ok(geometry.button >= 44, "Touch target must remain accessible");
      fs.mkdirSync("tmp/request-decisions", { recursive: true });
      fs.writeFileSync(`tmp/request-decisions/${width}.png`, Buffer.from((await client.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
      await evaluate(client, "document.querySelector('dialog[open] button[type=submit]').click();await pendingChoice;");
      assert.deepEqual(await evaluate(client, "return choice;"), { resolutionNote: "", notifyRequester: true });
      await evaluate(client, `const status=document.createElement('p');status.id='decision-fixture';document.body.append(status);window.retryCalls=[];
        LivePalmesRequestDecision.report(status,{requestId:'fixture',resolutionNotification:{status:'failed',key:'fixed-key'}},'resolveAccessUserDeletionRequest',async(name,payload)=>{retryCalls.push({name,payload});return {resolutionNotification:{status:'blocked_test'}};});status.querySelector('button').click();`);
      assert.ok(await waitFor(client, "document.querySelector('#decision-fixture').textContent.includes('aucun e-mail')"));
      assert.equal(await evaluate(client, "return retryCalls[0].payload.action;"), "retryNotification");
      await evaluate(client, `window.historyCalls=[];const root=document.createElement('section');root.id='history-fixture';document.body.append(root);
        LivePalmesRequestDecision.history({root,name:'accounts',callable:'listAccessUserDeletionRequests',resolver:'resolveAccessUserDeletionRequest',valid:()=>true,
          callFunction:async(name,input)=>{historyCalls.push({name,input});return {requests:[{id:'old',targetEmail:'fictif@example.test',status:'approved',resolutionNotification:{status:'uncertain',key:'old-key'}}],nextCursor:input.cursor?null:'old'};}});`);
      assert.equal(await evaluate(client, "return historyCalls.length;"), 0);
      await evaluate(client, "document.querySelector('#history-fixture details').open=true;");
      assert.ok(await waitFor(client, "document.querySelector('#history-fixture article')"));
      assert.equal(await evaluate(client, "return document.querySelector('#history-fixture article button');"), null, "An uncertain send cannot be resent");
      await evaluate(client, "document.querySelector('#history-fixture [data-history-next]').click();");
      assert.ok(await waitFor(client, "historyCalls.length === 2"));
      assert.equal(await evaluate(client, "return historyCalls[1].input.cursor;"), "old");
      await evaluate(client, "window.pendingChoice=LivePalmesRequestDecision.collect({decision:'approved'}).then(value=>choice=value);");
      await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      assert.ok(await waitFor(client, "!document.querySelector('dialog[open]')"));
      if (width === 390) {
        await evaluate(client, "window.decisionFactories={};window.originalRegister=LivePalmesPortalDeferred.register;LivePalmesPortalDeferred.register=(name,create)=>decisionFactories[name]=create;");
        await evaluate(client, fs.readFileSync("assets/portal/deferred/national-requests.js", "utf8"));
        await evaluate(client, fs.readFileSync("assets/portal/deferred/account-and-access.js", "utf8"));
        await evaluate(client, `LivePalmesPortalDeferred.register=originalRegister;window.routeCalls=[];
          const elements={};for(const el of document.querySelectorAll('[id^="admin"]')){const n=el.id.slice(5);elements[n[0].toLowerCase()+n.slice(1)]=el;}
          const actions={canDeleteEngagementCompetitionDirectly:()=>true,canDeleteAccessUserDirectly:()=>true,canManageAccessDirectory:()=>true,updateEngagementNationalRequestsPresentation:()=>{},markLastRefresh:()=>{},
            callFunction:async(name,input)=>{routeCalls.push({name,input});return input.action==='retryNotification'?{resolutionNotification:{status:'blocked_test'}}:input.status==='history'?{requests:[{id:'route-fixture',targetEmail:'fictif@example.test',current:{firstName:'Fictif'},status:'rejected',resolutionNotification:{status:'failed',key:'route-key'}}]}:{requests:[]};}};
          const state={};const noops={renderEngagementSwimmerChangeRequests:()=>{},updateEngagementNationalRequestsPresentation:()=>{},renderAccessDeletionRequests:()=>{},updateEngagementSwimmerChangeRequestsBadge:()=>{},engagementSwimmerChangeSummary:()=>[]};
          window.correctionFixture=decisionFactories['national-requests']({state,actions,elements,config:{}},noops);
          window.accountFixture=decisionFactories['account-and-access']({state,actions,elements,config:{}},noops);
          Object.assign(actions,{engagementSwimmerDisplayName:()=> 'Fictif',escapeHtml:value=>String(value||''),clubDisplayLabel:()=> 'Club fictif',formatAccessDateTime:()=> '08/11/2026'});
          state.engagementSwimmerChangeRequests=[{id:'duplicate-fixture',reportType:'duplicate',current:{}}];correctionFixture.renderEngagementSwimmerChangeRequests();
          if(!document.querySelector('[data-engagement-swimmer-change-request="duplicate-fixture"] [data-engagement-swimmer-change-decision="rejected"]'))throw Error('Missing duplicate refusal');
          await correctionFixture.loadEngagementSwimmerChangeRequests();await accountFixture.loadAccessDeletionRequests();
          await correctionFixture.loadEngagementSwimmerChangeRequests({force:true});await accountFixture.loadAccessDeletionRequests({force:true});
          for(const name of ['accounts','corrections']){const d=document.querySelector('[data-decision-history="'+name+'"]');if(!d)throw Error('Missing real insertion '+name);d.open=true;}`);
        assert.ok(await waitFor(client, "document.querySelectorAll('[data-decision-history] article button').length >= 2"));
        await evaluate(client, "document.querySelector('[data-decision-history=corrections] article button').click();document.querySelector('[data-decision-history=accounts] article button').click();");
        assert.ok(await waitFor(client, "routeCalls.filter(c=>c.input.action==='retryNotification').length === 2"));
        await evaluate(client, `window.regionalCalls=[];const root=document.querySelector('[data-access-requests-history]').parentElement;
          LivePalmesAccessRequestHistory.create({root,canReview:()=>true,scopeKey:()=> 'region-fixture',loadPending:()=>{},closeEditor:()=>{},
            callFunction:async(name,input)=>{regionalCalls.push({name,input});return input.action==='retryNotification'?{resolutionNotification:{status:'blocked_test'}}:{requests:[{id:'regional-fixture',status:'rejected',firstName:'Fictif',resolutionNotification:{status:'failed',key:'region-key'}}]};}});
          root.querySelector('[data-access-requests-show-history]').click();`);
        assert.ok(await waitFor(client, "document.querySelector('[data-request-notification] button')"));
        await evaluate(client, "document.querySelector('[data-request-notification] button').click();");
        assert.ok(await waitFor(client, "regionalCalls.some(c=>c.name==='resolveEngagementAccessRequest'&&c.input.action==='retryNotification')"));
      }
      console.log(`${width}px: decision dialog, default notification, required refusal while opted out, optional approval, targeted retry and Escape passed on fixtures.`);
    }
  } finally { browser.cleanup(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
