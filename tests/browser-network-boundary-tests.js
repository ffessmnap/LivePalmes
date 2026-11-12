"use strict";
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const {startStaticServer,collectErrors}=require("../tools/livepalmes-browser-smoke");
(async()=>{
  await require("./browser-launcher-tests").testBrowserLauncher();
  const {server,baseUrl}=await startStaticServer();
  try {
    for(const path of ["/speaker.html","/index.html","/assets/livepalmes-environment.js"]){
      const response=await fetch(baseUrl+path),csp=response.headers.get("content-security-policy");
      assert.equal(response.status,200);
      assert.match(csp,/connect-src 'self'/);
      assert.match(csp,/script-src 'self' 'unsafe-inline'/);
      assert.match(csp,/object-src 'none'/);
      assert.ok(!csp.includes("https:")&&!csp.includes("*"),"No external origin allowed by CSP");
      if(path.endsWith(".html")){
        const html=await response.text();
        assert.ok(!/src=["']https:\/\/www\.gstatic\.com\/firebasejs\//.test(html),"Firebase SDK transports replaced by local fixtures");
        if(path==="/speaker.html")assert.ok(html.includes("/tests/helpers/browser-smoke-services.js"));
      }
      if(path.endsWith("environment.js")){
        const source=await response.text();
        assert.ok(source.includes("napReaderUrl:new URL('/__smoke/nap',location.origin).href"));
      }
    }
    const rows=await (await fetch(baseUrl+"/__smoke/nap?action=records")).json();
    assert.equal(rows.source,"nap");
    assert.equal(rows.data.franceRecords.length,2);
    assert.ok(rows.data.franceRecords.every(row=>row.key.startsWith("smoke-record-")));
    assert.equal((await fetch(baseUrl+"/__smoke/nap?action=records",{method:"POST"})).status,405);
    assert.equal((await fetch(baseUrl+"/__smoke/nap?action=swimmer")).status,405);
    const runtime={method:"Runtime.exceptionThrown",params:{exceptionDetails:{text:"real runtime failure"}}};
    const log=(text,source="security")=>({method:"Log.entryAdded",params:{entry:{level:"error",source,text}}});
    const errors=collectErrors({events:[runtime,
      log("Connecting to 'https://example.invalid/api' violates Content Security Policy"),
      log("Loading 'http://127.0.0.1/required.js' violates Content Security Policy"),
      log("Content Security Policy https://example.invalid/api","javascript")]});
    assert.equal(errors.length,4,"All runtime, local, JavaScript and unexpected CSP errors remain blocking");
    const expectedBlocked={method:"Log.entryAdded",params:{entry:{level:"error",source:"network",
      url:baseUrl+"/assets/livepalmes-console-page-gate.js?v=fixture",text:"Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"}}};
    assert.deepEqual(collectErrors({events:[expectedBlocked]}),[]);
    const foreignBlocked={...expectedBlocked,params:{entry:{...expectedBlocked.params.entry,url:"https://example.invalid/assets/livepalmes-console-page-gate.js"}}};
    assert.equal(collectErrors({events:[foreignBlocked]}).length,1,"An external URL is never an allowed fixture failure");
    assert.equal(collectErrors({events:[{method:"Runtime.exceptionThrown",params:{exceptionDetails:{text:"TypeError: Failed to fetch"}}}]}).length,1,
      "Unhandled failed fetch remains blocking");
    let localFetchCalls=0;
    const context={Response,window:{location:new URL(baseUrl+"/fixture"),fetch:async()=>{localFetchCalls++;return {ok:true};}},URL,queueMicrotask};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"helpers/browser-smoke-services.js"),"utf8"),context);
    const fixture=context.window;
    assert.equal((await fixture.fetch("/__smoke/nap?action=records")).ok,true);
    await assert.rejects(fixture.fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp"),/Failed to fetch/);
    assert.equal(localFetchCalls,1,"External requests must never reach the real fetch transport");
    const restUrl="https://firestore.googleapis.com/v1/projects/demo-livepalmes-smoke/databases/(default)/documents/competitions/livepalmes-active/alerts";
    assert.deepEqual(await (await fixture.fetch(restUrl)).json(),{documents:[]});
    assert.equal((await fixture.fetch(restUrl.replace("/alerts","/liveData/current"))).status,404);
    await assert.rejects(fixture.fetch(restUrl,{method:"POST"}),/Failed to fetch/);
    assert.equal(localFetchCalls,1,"Even fixture REST reads must not reach the real fetch transport");
    fixture.firebase.initializeApp({projectId:"real-project-must-not-be-used"});
    assert.equal(fixture.firebase.app().options.projectId,"demo-livepalmes-smoke");
    await assert.rejects(fixture.firebase.auth().signInAnonymously(),/service unavailable/);
    await assert.rejects(fixture.firebase.firestore().collection("competitions").doc("fixture").set({}),/service unavailable/);
    await assert.rejects(fixture.firebase.functions().httpsCallable("mail")({}),/service unavailable/);
    assert.equal(fixture.firebase.auth().currentUser,null,"No account, even in the fixture, is created");
    assert.deepEqual({...fixture.__livepalmesSmokeServices},{authAttempts:1,firestoreCalls:1,functionCalls:1,deniedExternalFetches:2,fixtureRestReads:2});
    assert.throws(()=>vm.runInNewContext(fs.readFileSync(path.join(__dirname,"helpers/browser-smoke-services.js"),"utf8"),
      {window:{location:new URL("https://example.invalid")}}),/require localhost/);
    console.log("Browser network boundary: synthetic services only; external fetch, Auth, Firestore and Functions cannot use real transports.");
  } finally { await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
