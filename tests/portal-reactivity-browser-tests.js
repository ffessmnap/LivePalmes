"use strict";
// Actual portal, local HTTP, synthetic auth/RPC; launchBrowser blocks all HTTPS.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const { startStaticServer, launchBrowser, evaluate, waitFor } = require("../tools/capture-portal-design");

const fixture = `
window.LIVEPALMES_ENVIRONMENT = 'test';
try { localStorage.clear(); if(!new URL(location.href).searchParams.has('keepCache'))sessionStorage.clear(); } catch {}
const OriginalDate = Date;let clockOffset = 0;
window.Date = class extends OriginalDate { constructor(...args){super(...(args.length?args:[OriginalDate.now()+clockOffset]));}static now(){return OriginalDate.now()+clockOffset;} };
window.fixtureAdvance = ms => { clockOffset += ms; };
window.fixtureCalls = [];
window.fixtureFailProfile = new URL(location.href).searchParams.has('profileFailure');
new MutationObserver(()=>{if(!window.fixtureHomeAt&&document.body?.dataset.adminAuth==='unlocked'&&!document.querySelector('#adminClubHomeView')?.hidden)requestAnimationFrame(()=>{window.fixtureHomeAt ||= performance.now();});}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-admin-auth']});
window.fixtureProfile = {uid:'reactivity-user',email:'fixture@example.test',status:'active',firstName:'Compte',lastName:'TEST',clubId:'106',clubName:'Club fictif',capabilities:['engagements.club.manage'],accessScopes:{'engagements.club.manage':{scopeId:'106'}}};
let authTime=Math.floor(Date.now()/1000);
const user = {uid:'reactivity-user',email:'fixture@example.test',getIdTokenResult:async()=>({claims:{auth_time:authTime},authTime:new Date(authTime*1000).toISOString()}),getIdToken:async()=> 'fixture',reauthenticateWithCredential:async credential=>{if(credential.password!=='correct')throw Object.assign(new Error('incorrect'),{code:'auth/invalid-credential'});authTime=Math.floor(Date.now()/1000);}};
const auth = {currentUser:user,setPersistence:async()=>{},onAuthStateChanged:fn=>{queueMicrotask(()=>fn(user));return ()=>{};},signOut:async()=>{auth.currentUser=null;}};
const authFactory = ()=>auth;authFactory.Auth={Persistence:{LOCAL:'local'}};authFactory.EmailAuthProvider={credential:(email,password)=>({email,password})};
const service = {httpsCallable:name=>async input=>{
  window.fixtureCalls.push({name,input,at:performance.now()});
  if(window.fixtureFailProfile&&name==='getCurrentAccessUser')throw Object.assign(new Error('Unavailable'),{code:'functions/unavailable'});
  if(name==='getCurrentAccessUser'&&input._portalSessionAction==='open') {await new Promise(r=>setTimeout(r,100));return {data:{ok:true,profile:window.fixtureProfile,expiresAt:Date.now()+86400000,serverTime:Date.now()}};}
  if(name==='getCurrentAccessUser'&&input._portalSessionAction==='touch') return {data:{ok:true,expiresAt:Date.now()+86400000,serverTime:Date.now()}};
  if(name==='getCurrentAccessUser'||name==='getPortalAccessUser') {await new Promise(r=>setTimeout(r,100));return {data:window.fixtureProfile};}
  if(name==='openPortalSession') {await new Promise(r=>setTimeout(r,100));return {data:{ok:true,profile:window.fixtureProfile,expiresAt:Date.now()+86400000,serverTime:Date.now()}};}
  if(name==='touchPortalSession') return {data:{ok:true,expiresAt:Date.now()+86400000,serverTime:Date.now()}};
  return {data:{ok:true,source:'nap',competitions:[],calendarEvents:[],people:[],swimmers:[],entries:[],clubs:[],users:[],items:[],hasMore:false,counts:{},documents:[]}};
}};
window.firebase={apps:[{}],auth:authFactory,app:()=>({functions:()=>service}),functions:()=>service,initializeApp:()=>({})};
`;

async function main() {
  const baseline = process.env.PORTAL_MEASURE_BASELINE, overrides = new Map();
  if (baseline) {
    assert.match(baseline,/^[a-f0-9]{40}$/);
    const changed=execFileSync("git",["diff","--name-only",baseline],{encoding:"utf8"}).trim().split(/\r?\n/).filter(file=>/\.(?:html|js|css)$/.test(file));
    for (const file of changed) {
      try { overrides.set("/"+file,execFileSync("git",["show",baseline+":"+file],{encoding:"utf8",maxBuffer:4000000,stdio:["ignore","pipe","ignore"]})); } catch {}
    }
  }
  const { server, baseUrl } = await startStaticServer(overrides);
  const browser = await launchBrowser(), client = browser.client, results = [];
  const output = path.resolve("tmp/portal-reactivity");
  fs.mkdirSync(output, { recursive: true });
  try {
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: fixture });
    for (const width of [1280, 390, 320]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: width === 320 ? 568 : 900, deviceScaleFactor: 1, mobile: width < 700 });
      await client.send("Network.clearBrowserCache");
      for (const warm of [false, true]) {
        const eventStart = client.events.length;
        await client.send("Page.navigate", { url: baseUrl + `/portail.html?measure=${width}-${Number(warm)}#espace-club` });
        assert.ok(await waitFor(client, "fixtureHomeAt > 0 && document.body.dataset.adminAuth === 'unlocked' && !document.querySelector('#adminClubHomeView').hidden", 15000), "Club home must become usable");
        const startup = await evaluate(client, `return {homeAt:fixtureHomeAt,domReady:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')&&r.name.split('?')[0].endsWith('.js')).map(r=>({path:new URL(r.name).pathname,bytes:r.decodedBodySize})),calls:fixtureCalls.map(c=>c.name),overflow:document.documentElement.scrollWidth>innerWidth+1};`);
        assert.equal(startup.overflow, false);
        const errors = client.events.slice(eventStart).filter(e => e.method === "Runtime.exceptionThrown").map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
        assert.deepEqual(errors, []);
        results.push({ width, warm, ...startup });
        console.log(`${width}px ${warm ? "warm" : "cold"}: home ${Math.round(startup.homeAt)}ms, local JS ${startup.resources.reduce((n,r)=>n+r.bytes,0)} bytes, RPC ${startup.calls.length}`);
      }
      if (baseline) continue;
      const preparedNames = ["listEngagementCompetitions","listEngagementClubSwimmers","listEngagementClubPeople"];
      assert.ok(await waitFor(client,`['listEngagementCompetitions','listEngagementClubSwimmers','listEngagementClubPeople'].every(name=>fixtureCalls.some(c=>c.name===name))`));
      const prepared = await evaluate(client,`return {home:!document.querySelector('#adminClubHomeView').hidden,homeAt:fixtureHomeAt,calls:fixtureCalls.filter(c=>['listEngagementCompetitions','listEngagementClubSwimmers','listEngagementClubPeople'].includes(c.name)),overlay:document.body.hasAttribute('data-portal-module-loading')};`);
      assert.equal(prepared.home,true);assert.equal(prepared.overlay,false);assert.equal(prepared.calls.length,3);
      assert.ok(prepared.calls.every(c=>c.at>prepared.homeAt),"Speculative reads must start after the authorised home paints");
      await evaluate(client,`fixtureAdvance(6*60*1000);document.querySelector('a[href="#club-officiels"][data-engagements-nav]').click();`);
      assert.ok(await waitFor(client,"!document.querySelector('#adminEngagementsView').hidden && document.querySelector('#adminEngagementsClubPeopleStatus').dataset.tone!=='error'"));
      const reused = await evaluate(client,`return fixtureCalls.filter(c=>['listEngagementClubSwimmers','listEngagementClubPeople'].includes(c.name)).map(c=>c.name);`);
      assert.equal(reused.length,2,"The first officials visit reuses prepared people/swimmer data");
      for(const hash of ['#club-nageurs','#club-competitions','#club-officiels','#club-nageurs','#club-competitions']){
        await evaluate(client,`document.querySelector('a[href="${hash}"][data-engagements-nav]').click();`);
        assert.ok(await waitFor(client,`location.hash==='${hash}' && !document.querySelector('#adminEngagementsView').hidden`));
      }
      assert.equal(await evaluate(client,`return fixtureCalls.filter(c=>['listEngagementCompetitions','listEngagementClubSwimmers','listEngagementClubPeople'].includes(c.name)).length;`),3,"Real sidebar clicks do not reload any prepared catalog, even after five minutes");
      assert.equal(await evaluate(client,`return !!document.querySelector('.admin-portal-module-status:not([hidden])');`),false,"Fast catalog navigation must not show an abandoned restore as a module error");
      for(const [hash,name] of [['#club-competitions','listEngagementCompetitions'],['#club-nageurs','listEngagementClubSwimmers'],['#club-officiels','listEngagementClubPeople']]){
        await evaluate(client,`document.querySelector('a[href="${hash}"][data-engagements-nav]').click();`);
        assert.ok(await waitFor(client,"!document.querySelector('#adminEngagementsCatalogRefresh').hidden"));
        const control=await evaluate(client,`const b=document.querySelector('#adminEngagementsCatalogRefresh'),r=b.getBoundingClientRect(),head=b.parentElement;const overlap=Array.from(head.querySelectorAll('button')).filter(other=>other!==b&&other.getClientRects().length&&getComputedStyle(other).visibility!=='hidden').some(other=>{const a=other.getBoundingClientRect();return r.left<a.right&&r.right>a.left&&r.top<a.bottom&&r.bottom>a.top;});const t=document.querySelector('#adminEngagementsViewTitle').getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth+1,overlap:overlap||r.left<t.right&&r.right>t.left&&r.top<t.bottom&&r.bottom>t.top};`);
        assert.equal(control.fits,true);assert.equal(control.overlap,false);
        await evaluate(client,`document.querySelector('#adminEngagementsCatalogRefresh').click();`);
        assert.ok(await waitFor(client,`fixtureCalls.filter(c=>c.name==='${name}').length===2 && !document.querySelector('#adminEngagementsCatalogRefresh').disabled`));
      }
      const headerShot=await client.send("Page.captureScreenshot",{format:"png"});fs.writeFileSync(path.join(output,`catalog-header-${width}.png`),Buffer.from(headerShot.data,"base64"));
      console.log(`${width}px: home paints before three quiet reads; first officials visit reuses the prepared data.`);
      assert.equal(await evaluate(client,`return Object.values(sessionStorage).some(value=>{try{const c=JSON.parse(value);return c?.version===3&&Array.isArray(c.competitions)&&!c.loadedInPage;}catch{return false;}});`),true,"The stored calendar exists and contains no trusted page marker");
      await client.send("Page.navigate",{url:baseUrl+`/portail.html?keepCache=${width}#espace-club`});
      assert.ok(await waitFor(client,`['listEngagementCompetitions','listEngagementClubSwimmers','listEngagementClubPeople'].every(name=>fixtureCalls.some(c=>c.name===name))`));
      assert.equal(await evaluate(client,`return fixtureCalls.filter(c=>['listEngagementCompetitions','listEngagementClubSwimmers','listEngagementClubPeople'].includes(c.name)).length;`),3,"A full page reload reads all three catalogs, even with persistent caches retained");
      console.log(`${width}px: sidebar navigation stays local, Actualiser reads each catalog and full reload reads fresh data.`);
      const start = client.events.length;
      await evaluate(client, `location.hash='#mon-compte';`);
      assert.ok(await waitFor(client,"!document.querySelector('#adminAccountView').hidden"));
      await evaluate(client, `document.querySelector('#adminAccountEmail').value='draft@example.test';document.querySelector('#adminPortalPassword').type='text';document.querySelector('#adminPortalPassword').value='secret-to-clear';fixtureAdvance(86400001);LivePalmesPortalSession.check();`);
      assert.ok(await waitFor(client,"document.querySelector('#adminPortalSessionLock')?.open"));
      const locked = await evaluate(client, `const r=document.querySelector('#adminPortalSessionLock').getBoundingClientRect();return {inert:document.querySelector('main').inert,hidden:getComputedStyle(document.querySelector('main')).visibility==='hidden',fits:r.left>=0&&r.right<=innerWidth+1&&r.height<=innerHeight};`);
      assert.deepEqual(locked,{inert:true,hidden:true,fits:true});
      assert.equal(await evaluate(client,"return document.querySelector('#adminPortalPassword').value;"),"");
      const shot = await client.send("Page.captureScreenshot",{format:"png"});fs.writeFileSync(path.join(output,`session-lock-${width}.png`),Buffer.from(shot.data,"base64"));
      await evaluate(client, `document.querySelector('#adminPortalSessionPassword').value='wrong';document.querySelector('#adminPortalSessionUnlockForm').requestSubmit();`);
      assert.ok(await waitFor(client,"document.querySelector('#adminPortalSessionMessage').textContent.includes('incorrect')"));
      await evaluate(client, `document.querySelector('#adminPortalSessionPassword').value='correct';document.querySelector('#adminPortalSessionUnlockForm').requestSubmit();`);
      assert.ok(await waitFor(client,"!document.querySelector('#adminPortalSessionLock').open && document.body.dataset.portalSession==='active'"));
      assert.equal(await evaluate(client,"return document.querySelector('#adminAccountEmail').value;"),"draft@example.test");
      await evaluate(client, `location.hash='#club-officiels';`);
      assert.ok(await waitFor(client,"fixtureCalls.some(c=>c.name==='listEngagementClubPeople') && document.querySelector('#adminEngagementsClubPeopleStatus').dataset.tone!=='error'"));
      assert.equal(await evaluate(client,"return document.documentElement.scrollWidth>innerWidth+1;"),false);
      assert.equal(await evaluate(client,"return fixtureCalls.some(c=>/^(save|send|create|delete|update)/.test(c.name));"),false);
      assert.deepEqual(client.events.slice(start).filter(e=>e.method==="Runtime.exceptionThrown").map(e=>e.params.exceptionDetails.text),[]);
      console.log(`${width}px: account route, expiry/visible dialog, wrong password, resume/draft, deferred officials and no write passed.`);
      await client.send("Page.navigate",{url:baseUrl+`/portail.html?foregroundPriority=${width}#espace-club`});
      assert.ok(await waitFor(client,"fixtureHomeAt>0"));
      await evaluate(client,`location.hash='#mon-compte';return await new Promise(resolve=>setTimeout(resolve,1200));`);
      assert.equal(await evaluate(client,`return fixtureCalls.some(c=>['listEngagementCompetitions','listEngagementClubSwimmers','listEngagementClubPeople'].includes(c.name));`),false,"Leaving home suspends speculative data reads");
      await client.send("Page.navigate",{url:baseUrl+`/portail.html?profileFailure=${width}#espace-club`});
      assert.ok(await waitFor(client,"!document.querySelector('#adminPortalAuthRetry').hidden && document.querySelector('#adminPortalMessage').textContent.includes('indisponible')"));
      assert.equal(await evaluate(client,"return document.querySelector('#adminPortalDashboard').hidden;"),true);
      await evaluate(client,"fixtureFailProfile=false;document.querySelector('#adminPortalAuthRetry').click();");
      assert.ok(await waitFor(client,"document.body.dataset.adminAuth==='unlocked' && document.querySelector('#adminPortalAuthRetry').hidden"));
      console.log(`${width}px: unavailable profile keeps private content hidden, manual verification recovers.`);
    }
    const target = path.join(output, (process.env.PORTAL_MEASURE_LABEL || "current") + ".json");
    fs.writeFileSync(target, JSON.stringify({ baseline:baseline||null,synthetic:true,profileDelayMs:100,externalHttpsBlocked:true,results },null,2));
  } finally { browser.cleanup(); server.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
