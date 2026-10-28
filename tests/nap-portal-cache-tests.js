"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"), "utf8");
const storage = new Map();
const context = { engagementCompetitionCalendarMemoryCache: new Map(), ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX: "calendar.",
  global: { sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
  engagementTeamLeadersWhatsAppUrl: value => value || "", engagementCompetitionType: item => item.competitionType || "pool" };
vm.createContext(context);
for (const [name, next] of [["engagementCalendarCacheCompetition", "readEngagementCalendarCache"], ["readEngagementCalendarCache", "writeEngagementCalendarCache"], ["writeEngagementCalendarCache", "activateEngagementCalendarCache"]]) {
  const start = source.indexOf(`  function ${name}(`);
  vm.runInContext(source.slice(start, source.indexOf(`  function ${next}(`, start)), context);
}
const item = { id: "legacy-nap-5140", napSource: true, nativeReadOnly: true, legacyCompetitionId: "5140", competitionType: "pool" };
context.writeEngagementCalendarCache("club", [item], 100, "nap");
context.engagementCompetitionCalendarMemoryCache.clear();
const restored = context.readEngagementCalendarCache("club");
assert.equal(restored.source, "nap");
assert.equal(restored.competitions[0].napSource, true);
assert.equal(restored.competitions[0].nativeReadOnly, true);
assert.equal(restored.competitions[0].legacyCompetitionId, "5140");
context.writeEngagementCalendarCache("empty", [], 100, "nap");
context.engagementCompetitionCalendarMemoryCache.clear();
assert.equal(context.readEngagementCalendarCache("empty").source, "nap", "Empty native calendar also requires a fresh read");
storage.set("calendar.old", JSON.stringify({ version: 2, competitions: [{ id: "obsolete" }], cachedAt: 100 }));
assert.equal(context.readEngagementCalendarCache("old"), null, "Pre-cutover sports calendar must not delay the first native read");
console.log("NAP portal cache: native source, read-only status, empty calendars and obsolete-cache invalidation verified");

// Native event types must survive both display and the session calendar cache.
vm.runInContext(source.slice(source.indexOf("  function engagementCompetitionType("), source.indexOf("  function engagementCompetitionTypeLabel(")), context);
for (const type of ["pool", "openWater", "training", "stage", "meeting", "other"]) {
  const native = { ...item, eventType: type, competitionType: type };
  assert.equal(context.engagementCompetitionType(native), type);
  context.writeEngagementCalendarCache(type, [native], 100, "nap");
  context.engagementCompetitionCalendarMemoryCache.clear();
  assert.equal(context.engagementCompetitionType(context.readEngagementCalendarCache(type).competitions[0]), type);
}
assert.equal(context.engagementCompetitionType({ ...item, eventType: "training", competitionType: "pool" }), "training", "Native eventType repairs the display of an older cached pool label");
assert.equal(context.engagementCompetitionType({ competitionType: "pool" }), "pool");
assert.equal(context.engagementCompetitionType({ sourceType: "calendarEvent", eventType: "meeting" }), "meeting");

// A stalled read must terminate visibly; normal responses/errors remain intact.
const detail = source.slice(source.indexOf("  async function loadEngagementCompetitionDetail("), source.indexOf("  async function saveEngagementClubTeamLeader("));
assert.ok(detail.includes('callFunctionWithTimeout("getEngagementClubEntry", { competitionId: cleanId })'));
assert.ok(detail.includes('setEngagementClubEntryLoadingState(clubMode && !cachedWorkspace ? "error" : "")'));
let timer;
let cleared = 0;
let read = () => Promise.resolve({ entry: { id: "saved" } });
const timeoutContext = { callFunction: (...args) => read(...args), setTimeout: (callback, delay) => { assert.equal(delay, 30000); timer = callback; return 1; }, clearTimeout: () => { cleared++; } };
vm.createContext(timeoutContext);
vm.runInContext(source.slice(source.indexOf("  async function callFunctionWithTimeout("), source.indexOf("  function downloadBase64File(")), timeoutContext);
(async () => {
  assert.equal((await timeoutContext.callFunctionWithTimeout("getEngagementClubEntry", {})).entry.id, "saved");
  read = () => Promise.reject(new Error("Lecture indisponible"));
  await assert.rejects(timeoutContext.callFunctionWithTimeout("getEngagementClubEntry", {}), /Lecture indisponible/);
  read = () => new Promise(() => {});
  const stalled = timeoutContext.callFunctionWithTimeout("getEngagementClubEntry", {});
  timer();
  await assert.rejects(stalled, /Délai de lecture dépassé/);
  assert.equal(cleared, 3, "Timers are released for success, failure and timeout");
  console.log("Portal recipe: native event labels/cache and bounded engagement reads verified offline");
})().catch(error => { console.error(error); process.exitCode = 1; });

async function calendarOpening(){
  function fixture({mode="admin",cached=null,legacy=false,fail=false}={}){
    const trace=[],cache=new Map();let release;
    if(cached)cache.set(mode,cached);
    const pending=new Promise(resolve=>{release=resolve;});
    const state={Date,Boolean,URLSearchParams,canCreateEngagementCompetition:()=>true,canUse:()=>true,
      engagementNavigationMode:()=>mode,engagementCalendarFiltersPayload:()=>({startDate:"2026-09-01",endDate:"2027-08-31"}),
      engagementCalendarSeptemberPreview:()=>null,engagementCalendarRequestedRange:()=>"season",engagementCalendarCacheKey:value=>value,
      global:{location:{hash:mode==="club"?"#club-competitions":"#competitions-calendrier",search:""}},
      readEngagementCalendarCache:key=>cache.get(key),engagementCompetitionsLoadedCacheKey:"",engagementCompetitionsLoaded:false,
      engagementCompetitions:[],engagementCompetitionsCachedAt:0,ENGAGEMENT_CALENDAR_CACHE_TTL_MS:300000,
      activateEngagementCalendarCache:(_key,_range,entry)=>{trace.push("display");state.engagementCompetitions=entry.competitions;},
      scheduleEngagementClubWorkspacePreload:()=>{},elements:{engagementsCalendarList:{innerHTML:"cached list"},engagementsStatus:{dataset:{}}},
      engagementCompetitionCalendarRequests:new Map(),engagementCalendarCacheRevision:0,
      callFunction:async(name,payload)=>{trace.push(name);if(name==="listEngagementCalendarEvents")return {events:[{id:"event"}]};
        assert.equal(payload.includeCalendarEvents,mode==="admin");await pending;if(fail)throw Error("offline");
        return {source:legacy?"firestore":"nap",competitions:[{id:"competition",napSource:!legacy}],...(!legacy?{calendarEvents:[{id:"event",napSource:true}]}:{})};},
      canManageEngagementCompetitionScope:()=>true,
      writeEngagementCalendarCache:(key,competitions,cachedAt,source)=>{const entry={competitions,cachedAt,source};cache.set(key,entry);return entry;},
      engagementPublicDeepLinkHandled:false,loadEngagementCompetitionDetail:()=>{throw Error("Unexpected detail read");}};
    const start=source.indexOf("  async function loadEngagementCompetitions(");
    vm.runInNewContext(source.slice(start,source.indexOf("  function engagementCompetitionPayloadFromFields",start)),state);
    return {state,trace,release};
  }
  for(const competitions of [[],[{id:"previous",napSource:true}]]){
    const f=fixture({cached:{competitions,source:"nap",cachedAt:Date.now()}});
    const opening=f.state.loadEngagementCompetitions(),duplicate=f.state.loadEngagementCompetitions();
    assert.equal(f.trace[0],"display","Cached lists, including empty lists, render before waiting for NAP");
    assert.equal(f.state.elements.engagementsCalendarList.innerHTML,"cached list");
    assert.equal(f.trace.filter(x=>x==="listEngagementCompetitions").length,1,"Concurrent reads coalesce");
    f.release();await opening;await duplicate;
    assert.equal(f.trace.includes("listEngagementCalendarEvents"),false,"Combined native result skips the second endpoint");
    assert.equal(f.state.engagementCompetitions.length,2);
    await f.state.loadEngagementCompetitions();
    assert.equal(f.trace.filter(x=>x==="listEngagementCompetitions").length,2,"Every later NAP visit still refreshes native data");
  }
  const club=fixture({mode:"club"});const clubRead=club.state.loadEngagementCompetitions();club.release();await clubRead;
  assert.equal(club.state.engagementCompetitions.length,1);assert.equal(club.trace.includes("listEngagementCalendarEvents"),false);
  const old=fixture({legacy:true});const oldRead=old.state.loadEngagementCompetitions();old.release();await oldRead;
  assert.equal(old.trace.filter(x=>x==="listEngagementCalendarEvents").length,1,"Older backends retain their authorized fallback");
  const failed=fixture({fail:true,cached:{competitions:[],source:"nap",cachedAt:Date.now()}});
  const failedRead=failed.state.loadEngagementCompetitions();failed.release();await failedRead;
  assert.equal(failed.state.elements.engagementsStatus.dataset.tone,"error");assert.equal(failed.state.elements.engagementsCalendarList.innerHTML,"cached list");
  assert.equal(failed.state.engagementCompetitionCalendarRequests.size,0);
  console.log("Calendar opening: immediate cached/empty display, one native admin endpoint, grouped concurrent calls, fresh returns, club scope and error retention verified.");
}
calendarOpening().catch(error=>{console.error(error);process.exitCode=1;});
