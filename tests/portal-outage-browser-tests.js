"use strict";
// Full portal markup/styles, actual extracted modules, synthetic RPC only.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor, presentationScript, views } = require("../tools/capture-portal-design");
async function main() {
  const { server, baseUrl } = await startStaticServer(), browser = await launchBrowser(), client = browser.client;
  const output = path.resolve("tmp/portal-outage-browser"); fs.mkdirSync(output, { recursive: true }); const results = [];
  try {
    for (const width of [1280, 390, 320]) {
      const eventStart = client.events.length;
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 700 });
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: width < 700 });
      await client.send("Page.navigate", { url: baseUrl + "/portail.html#club-officiels" });
      assert.ok(await waitFor(client, "document.readyState === 'complete'", 12000));
      await evaluate(client, presentationScript(views.find(view => view.name === "club-officials")));
      await evaluate(client, `
        window.fixtureMode = 'failure'; window.fixtureCalls = 0;
        window.LivePalmesEnvironment = { sportingDataSource: 'nap' };
        window.LivePalmesAppConfig = { firebaseConfig: {} };
        window.firebase = { apps: [{}], initializeApp(){throw Error('Fixture SDK must already be initialized');}, functions: {}, app: () => ({ functions: () => ({ httpsCallable: () => async () => {
          window.fixtureCalls++;
          if (window.fixtureMode === 'failure') throw Object.assign(new Error('UNAVAILABLE'), {code:'functions/unavailable'});
          return {data:{source:'nap',people:[],hasMore:false}};
        } }) }) };
        const state = {engagementClubPeople:[],engagementClubPeopleLoaded:false,engagementClubPeopleLoading:false,engagementClubPeopleRequestVersion:1,engagementClubPersonSaving:false,activeEngagementsTab:'clubPeople'};
        const oldRetry=document.querySelector('#adminEngagementsClubPeopleRetry');oldRetry.replaceWith(oldRetry.cloneNode(true));
        const elements = Object.fromEntries(['List','AddButton','LoadMore','Status','Retry'].map(suffix=>['engagementsClubPeople'+suffix,document.querySelector('#adminEngagementsClubPeople'+suffix)]));
        const navigation = window.LivePalmesPortalNavigation.create({state,config:{portalCallSamples:new Map(),PORTAL_FRENCH_ERROR_REPLACEMENTS:[]},actions:{},elements});
        const noop=()=>{};
        const actions={canUse:()=>true,updateNativeCompetitionPersonCreationButton:noop,renderEngagementClubPersonSwimmerOptions:noop,renderEngagementClubTeamPersonOptions:noop,renderEngagementClubOfficials:noop,callFunction:navigation.callFunction};
        window.fixturePeople = window.LivePalmesPortalClubAndCompetition.create({state,actions,elements,config:{}});
        window.LivePalmesPortalEvents.create({state,config:{},elements,actions:{loadEngagementClubPeople:options=>{
          window.fixtureDone=false;return fixturePeople.loadEngagementClubPeople(options).then(()=>window.fixtureDone=true);
        }}}).bindEngagementClubPeopleRetry();
        window.fixtureState=state; window.fixtureDone=false;
        fixturePeople.loadEngagementClubPeople().then(()=>window.fixtureDone=true);
      `);
      assert.ok(await waitFor(client, "window.fixtureDone === true"));
      await evaluate(client, 'document.querySelector("#adminEngagementsClubPeopleStatus").scrollIntoView({block:"center"});');
      const error = await evaluate(client, `const status=document.querySelector('#adminEngagementsClubPeopleStatus'),rect=status.getBoundingClientRect();return {text:status.textContent,tone:status.dataset.tone,loading:fixtureState.engagementClubPeopleLoading,disabled:document.querySelector('#adminEngagementsClubPeopleAddButton').disabled,calls:fixtureCalls,retryVisible:!document.querySelector('#adminEngagementsClubPeopleRetry').hidden,emptyMessage:document.querySelector('#adminEngagementsClubPeopleList').textContent.includes('Aucun officiel'),fits:rect.left>=-1&&rect.right<=innerWidth+1&&status.scrollWidth<=status.clientWidth+1};`);
      assert.match(error.text, /service LivePalmes.*indisponible/); assert.equal(error.tone, "error"); assert.equal(error.loading, false); assert.equal(error.disabled, true); assert.equal(error.calls, 1); assert.equal(error.fits, true);
      assert.equal(error.retryVisible, true); assert.equal(error.emptyMessage, false);
      const failure = await client.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(output, width + "-failure.png"), Buffer.from(failure.data, "base64"));
      const point = await evaluate(client, "window.fixtureMode='success';window.fixtureDone=false;const rect=document.querySelector('#adminEngagementsClubPeopleRetry').getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};");
      if (width < 700) {
        await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
        await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
      }
      assert.ok(await waitFor(client, "window.fixtureDone === true"));
      const recovery = await evaluate(client, `return {text:document.querySelector('#adminEngagementsClubPeopleStatus').textContent,loaded:fixtureState.engagementClubPeopleLoaded,disabled:document.querySelector('#adminEngagementsClubPeopleAddButton').disabled,calls:fixtureCalls};`);
      assert.equal(recovery.text, ""); assert.equal(recovery.loaded, true); assert.equal(recovery.disabled, false); assert.equal(recovery.calls, 2);
      assert.equal(client.events.slice(eventStart).filter(event => event.method === "Runtime.exceptionThrown").length, 0, "No uncaught JavaScript error");
      const success = await client.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(output, width + "-recovery.png"), Buffer.from(success.data, "base64"));
      results.push({ width, error, recovery }); console.log("Portal outage/recovery " + width + "px: readable error, controls restored, exactly two manual attempts.");
    }
    fs.writeFileSync(path.join(output, "proof.json"), JSON.stringify({ synthetic: true, externalHttpsBlocked: true, results }, null, 2));
  } finally { browser.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
