"use strict";
const assert = require("node:assert/strict");
const { portalModule, deferred } = require("./helpers/portal-module-runtime");
const noop = () => {};

function nationalFixture() {
  const state = { engagementNationalClubs: [], engagementNationalClubsLoaded: false, engagementNationalClubsLoading: false };
  const status = { dataset: {} }, calls = [], writes = [], cached = [{ clubId: "fixture-old" }];
  let reply = async () => ({ clubs: [], hasMore: false });
  const actions = {
    canDeleteEngagementCompetitionDirectly: () => true, loadAccessClubReference: async () => {},
    readEngagementNationalClubCache: () => ({ clubs: cached, syncedThrough: "2026-10-27" }),
    mergeEngagementNationalClubDirectory: (reference, clubs) => clubs.slice(), mergeNationalClubsIntoAccessReference: noop,
    renderEngagementNationalClubs: noop, engagementNationalClubSyncStart: value => value,
    normalizeEngagementNationalClub: value => value, setEngagementNationalClubAdministrators: noop,
    writeEngagementNationalClubCache: (...input) => writes.push(input),
    callFunction: async (name, input) => { assert.equal(name, "listEngagementNationalClubs"); calls.push(input); return reply(input); }
  };
  const module = portalModule("national-directories.js", "LivePalmesPortalNationalDirectories", {
    state, actions, config: { ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE: 25 }, elements: { engagementsNationalClubsStatus: status }
  });
  return { module, state, status, calls, writes, setReply: value => { reply = value; } };
}

async function main() {
  const f = nationalFixture(), pending = deferred(); f.setReply(() => pending.promise);
  const first = f.module.loadEngagementNationalClubs(); await Promise.resolve(); await Promise.resolve();
  await f.module.loadEngagementNationalClubs(); assert.equal(f.calls.length, 1, "One request for concurrent openings");
  pending.reject(new Error("Annuaire NAP indisponible.")); await first;
  assert.equal(f.state.engagementNationalClubsLoading, false); assert.equal(f.state.engagementNationalClubsLoaded, false);
  assert.equal(f.status.dataset.tone, "error"); assert.equal(f.writes.length, 0); assert.equal(f.state.engagementNationalClubs[0].clubId, "fixture-old");
  f.setReply(async () => ({ clubs: [], hasMore: false, replaceDirectory: true }));
  await f.module.loadEngagementNationalClubs(); assert.equal(f.state.engagementNationalClubsLoaded, true); assert.equal(f.state.engagementNationalClubs.length, 0);
  const requests = f.calls.length; await f.module.loadEngagementNationalClubs(); assert.equal(f.calls.length, requests, "Empty successful directory is cached");

  const pages = nationalFixture(); pages.setReply(async input => {
    if (pages.calls.length === 1) return { clubs: [{ clubId: "fixture-a" }], hasMore: true, cursor: { updatedAt: "2026-10-28", clubId: "fixture-a" } };
    assert.equal(input.afterClubId, "fixture-a"); assert.equal(input.includeAdministrators, false);
    return { clubs: [{ clubId: "fixture-b" }], hasMore: false };
  });
  await pages.module.loadEngagementNationalClubs(); assert.equal(pages.calls.length, 2); assert.equal(pages.writes.length, 1);
  assert.equal(pages.state.engagementNationalClubs.length, 3); assert.equal(pages.state.engagementNationalClubsLoaded, true);

  const partial = nationalFixture();
  partial.setReply(async () => {
    if (partial.calls.length === 1) return { clubs: [{ clubId: "fixture-new" }], replaceDirectory: true, hasMore: true, cursor: { updatedAt: "2026-10-28", clubId: "fixture-new" } };
    throw new Error("Panne pendant la deuxième page.");
  });
  await partial.module.loadEngagementNationalClubs(); assert.equal(partial.calls.length, 2);
  assert.equal(partial.writes.length, 0, "A failed continuation never replaces the saved complete directory");
  assert.equal(partial.state.engagementNationalClubs[0].clubId, "fixture-old"); assert.equal(partial.state.engagementNationalClubsLoading, false);

  const stuck = nationalFixture();
  stuck.setReply(async () => {
    if (stuck.calls.length > 2) throw Error("Fixture guard: pagination must stop before another request");
    return { clubs: [], hasMore: true, cursor: { updatedAt: "same", clubId: "same" } };
  });
  await stuck.module.loadEngagementNationalClubs();
  assert.equal(stuck.calls.length, 2, "Repeated cursor must not cause an endless request loop");
  assert.equal(stuck.writes.length, 0); assert.equal(stuck.status.dataset.tone, "error"); assert.equal(stuck.state.engagementNationalClubsLoading, false);
  const missingCursor = nationalFixture(); missingCursor.setReply(async () => ({ clubs: [], hasMore: true }));
  await missingCursor.module.loadEngagementNationalClubs(); assert.equal(missingCursor.calls.length, 1);
  assert.equal(missingCursor.writes.length, 0, "A missing continuation cannot be saved as a complete empty directory");
  assert.equal(missingCursor.status.dataset.tone, "error");
  const refresh = nationalFixture();
  refresh.state.engagementNationalClubs = [{ clubId: "last-complete-directory" }]; refresh.state.engagementNationalClubsLoaded = true;
  refresh.setReply(async () => { throw new Error("Panne pendant l’actualisation."); });
  await refresh.module.loadEngagementNationalClubs({ force: true });
  assert.equal(refresh.state.engagementNationalClubs[0]?.clubId, "last-complete-directory", "A failed forced refresh must preserve the last complete directory");
  assert.equal(refresh.writes.length, 0); assert.equal(refresh.state.engagementNationalClubsLoading, false); assert.equal(refresh.status.dataset.tone, "error");
  refresh.setReply(async () => ({ clubs: [{ clubId: "fresh-directory" }], hasMore: false }));
  await refresh.module.loadEngagementNationalClubs({ force: true });
  assert.equal(refresh.calls.length, 2); assert.equal(refresh.writes.length, 1);
  assert.equal(refresh.state.engagementNationalClubs.length, 1); assert.equal(refresh.state.engagementNationalClubs[0].clubId, "fresh-directory", "A successful forced refresh still replaces the previous directory");

  const referenceState = { accessClubReference: [], accessClubReferenceLoadPromise: null }, referenceMessages = [];
  let referenceReply = deferred(), referenceCalls = 0;
  const reference = portalModule("modules-and-clubs.js", "LivePalmesPortalModulesAndClubs", {
    state: referenceState, config: {}, elements: {}, actions: {
      callFunction: () => { referenceCalls++; return referenceReply.promise; },
      setAccessMessage: text => referenceMessages.push(text), setPublicAccessRequestMessage: text => referenceMessages.push(text)
    }
  });
  const referencePending = reference.loadAccessClubReference(); assert.equal(referencePending, reference.loadAccessClubReference());
  referenceReply.reject(new Error("NAP indisponible")); assert.equal((await referencePending).length, 0);
  assert.equal(referenceCalls, 1); assert.equal(referenceState.accessClubReferenceLoadPromise, null); assert.equal(referenceMessages.length, 2);
  referenceReply = deferred(); const referenceRetry = reference.loadAccessClubReference(); referenceReply.resolve({ clubs: [] });
  await referenceRetry; await reference.loadAccessClubReference(); assert.equal(referenceCalls, 2, "Successful empty references stay shared");

  const peopleState = { engagementClubPeople: [], engagementClubPeopleLoading: false, engagementClubPeopleLoaded: false,
    engagementClubPeopleRequestVersion: 1, activeEngagementsTab: "clubPeople", engagementClubPeopleHasMore: false, engagementClubPersonSaving: false };
  let retryClick;
  const elements = { engagementsClubPeopleList: { innerHTML: "" }, engagementsClubPeopleAddButton: {},
    engagementsClubPeopleRetry: { hidden: true, disabled: false, addEventListener: (name, handler) => { assert.equal(name, "click"); retryClick = handler; } },
    engagementsClubPeopleLoadMore: {}, engagementsClubPeopleStatus: { dataset: {} } };
  let peopleReply = deferred(), peopleCalls = 0;
  const peopleActions = { canUse: () => true, updateNativeCompetitionPersonCreationButton: noop,
    renderEngagementClubPersonSwimmerOptions: noop, renderEngagementClubTeamPersonOptions: noop, renderEngagementClubOfficials: noop,
    callFunction: () => { peopleCalls++; return peopleReply.promise; } };
  const people = portalModule("club-and-competition.js", "LivePalmesPortalClubAndCompetition", { state: peopleState, actions: peopleActions, elements, config: {} });
  portalModule("events.js", "LivePalmesPortalEvents", { state: {}, actions: { loadEngagementClubPeople: people.loadEngagementClubPeople }, elements, config: {} }).bindEngagementClubPeopleRetry();
  const loading = people.loadEngagementClubPeople(); await people.loadEngagementClubPeople(); assert.equal(peopleCalls, 1);
  peopleReply.reject(new Error("NAP indisponible")); await loading;
  assert.equal(peopleState.engagementClubPeopleLoading, false); assert.equal(elements.engagementsClubPeopleLoadMore.disabled, false);
  assert.equal(elements.engagementsClubPeopleAddButton.disabled, true, "Editing remains locked without a loaded directory");
  assert.equal(elements.engagementsClubPeopleRetry.hidden, false); assert.equal(elements.engagementsClubPeopleRetry.disabled, false);
  assert.ok(!elements.engagementsClubPeopleList.innerHTML.includes("Aucun officiel"), "An unavailable directory is not an empty directory");
  peopleReply = deferred(); const retry = retryClick(); await retryClick(); assert.equal(peopleCalls, 2, "Repeated clicks share the loading guard");
  peopleReply.resolve({ source: "nap", people: [], hasMore: false }); await retry;
  assert.equal(peopleCalls, 2); assert.equal(peopleState.engagementClubPeopleLoaded, true); assert.equal(elements.engagementsClubPeopleAddButton.disabled, false);
  assert.equal(elements.engagementsClubPeopleRetry.hidden, true); assert.ok(elements.engagementsClubPeopleList.innerHTML.includes("Aucun officiel"));
  peopleReply = deferred(); const stale = people.loadEngagementClubPeople({ force: true });
  peopleState.engagementClubPeopleRequestVersion++; peopleState.engagementClubPeople = []; peopleState.engagementClubPeopleLoading = false;
  peopleReply.resolve({ source: "nap", people: [{ id: "previous-club" }] }); await stale;
  assert.equal(peopleState.engagementClubPeople.length, 0, "A late reply cannot restore the previous club");
  console.log("Actual directory modules: shared loading, cached empty lists, outage recovery, partial/stuck pagination, disabled edits and stale club replies passed offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
