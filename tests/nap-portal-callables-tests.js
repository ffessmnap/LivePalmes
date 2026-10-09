"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../functions/index.js"), "utf8");
const calls = [];
const pool = {};
const event = { id: "legacy-nap-5140", date: "2026-10-11", competitionType: "pool", level: "regional", regionId: "PACA", nationalManagementOnly: false };
let management = { national: true, uid: "admin" };
let past=false;
let qualificationRules={enabled:false},startedControls=0;
const nativeParameters={qualif:0,cat_d:null,cat_f:null};
const context = { uid: "club-admin", clubId: "00123", clubName: "Club" };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const sandbox = { exports: {}, ENVIRONMENT: { projectId: "livepalmes-test" }, CALLABLE_OPTIONS: {}, defineSecret: name => name,
  onCall: (_, callback) => callback, HttpsError, TypeError, process: { env: {} }, ENGAGEMENT_EVENT_DEFINITION_BY_CODE: new Map(),
  ENGAGEMENT_COMPETITION_LEVELS: new Set(["regional", "national"]), ENGAGEMENT_ENTRY_STATUSES: new Set(["open", "closed", "upcoming"]),
  cleanEngagementProgramSessions:()=>[],
  cleanEngagementCompetitionEvents:raw=>raw,
  nativeQualificationServices:()=>({eventsFor:()=>[],competitionFor:()=>({qualifications:qualificationRules})}),qualificationEngine:{validateRules:value=>value},
  cleanEngagementCalendarEventPayload:raw=>({...raw,level:raw.level||"regional",regionId:raw.regionId||"PACA"}), CLUB_REFERENCE_REGION_LABELS:{"16":"PACA"},
  cleanText: value => String(value || ""), cleanIsoDate: value => /^\d{4}-\d\d-\d\d$/.test(String(value)) ? value : "",
  engagementSeasonEndYearFromIsoDate: value => Number(value.slice(0, 4)) + (value.slice(5, 7) >= "09" ? 1 : 0),
  engagementSeasonBoundsFromEndYear: endYear => ({ endYear, startYear: endYear - 1, startDate: `${endYear - 1}-09-01`, endDate: `${endYear}-08-31` }),
  engagementRegionsMatch: (left, right) => left === right || left === "16" && right === "PACA",
  engagementAccessContext: async () => management, engagementClubAccessContext: async () => context,
  assertCanManageEngagementCompetition: (actor, item) => { calls.push("authorize"); if (!actor.national && actor.regionId !== item.regionId) throw new HttpsError("permission-denied", "Hors region"); },
  engagementEventIsPast: () => past, ageCategoryFromDates: () => "M30+", portalReadStats: () => ({}),
  assertCanModifyEngagementEvent:(actor,item)=>{sandbox.assertCanManageEngagementCompetition(actor,item);if(past && !actor.national) throw new HttpsError("failed-precondition","Past event");},
  writeAuditLogOnce:async()=>calls.push("audit-complete"),
  armNativeCompetitionNotification:async(actor,input)=>{assert.equal(actor.uid,management.uid);assert.equal(input.competitionId,event.id);},
  assertEngagementClubWriteOpen:()=>calls.push("open-check"),
  db: { getAll: () => { throw new Error("Old sports read"); }, collection: name => { if(name!=="auditLogs") throw new Error("Old sports read");return {doc:()=>({get:async()=>({exists:false}),create:async()=>calls.push("audit-backup"),update:async()=>calls.push("audit-checkpoint")})}; } },
  require: name => {
    if(name==='node:util')return require('node:util');
    if(name==='./nap-qualification-control-start')return {beginControl:async(connection,input)=>{assert.equal(connection,pool);assert.equal(input.actorUid,management.uid);assert.equal(input.national,true);assert.equal(Object.hasOwn(input.patch,'qualifications'),false);startedControls++;return {qualificationJobId:'a'.repeat(64)};}};
    if(name === "./nap-qualification-jobs")return {activeControl:async()=>''};
    if(name === "./nap-qualification-edit-lock")return {ordinaryEdit:async(connection,id,action,services)=>{assert.equal(connection,pool);assert.equal(typeof services.authorize,'function');return action();}};
    if (name === "./nap-portal-swimmers") return { portalPool: () => pool };
    if(name === "./nap-competition-create") return {createCompetition:async(connection,input,audit,authorize)=>{assert.equal(connection,pool);assert.equal(input.actorUid,management.uid);assert.equal(input.creationId,"request-id");assert.equal(input.committeeId,"16");await authorize(input.event);await audit.prepare("operation",{});await audit.checkpoint("operation",{});calls.push("competition-create");await audit.complete("operation",{});return {ok:true,source:"nap",competitionId:event.id};}};
    if(name === "./nap-club-people") return {readClubPeople:async(connection,input,authorize)=>{assert.equal(connection,pool);assert.equal(input.clubId,context.clubId);await authorize(input);calls.push("native-people");return {source:"nap",people:[],hasMore:false};}};
    if (name === "./nap-portal-competitions") return {
      readNativeCompetitionSeason: async (connection, year) => { assert.equal(connection, pool); assert.equal(year, 2027); calls.push("season"); return { events: [event, { ...event, id: "legacy-nap-5200", competitionType: "training" }] }; },
      readNativeCompetition: async (_, id, authorize) => { assert.equal(id, event.id); await authorize(event); calls.push("detail"); return { event }; }
    };
    if (name === "./nap-portal-workspaces") return { listItem: item => ({ ...item, napSource: true }), competitionItem: pack => ({ ...pack.event, eventType:"pool",nativeParameters,nativeRules:{participations:[]},napSource: true }),
      readDocuments: async () => { calls.push("documents"); return []; }, entryWithCourseRules: async (_,pack) => ({ source: "nap", clubId: pack.clubId }) };
    if (name === "./nap-portal-entries") return { readNativeClubEntry: async (_, input, authorize) => { await authorize(input); calls.push("entry"); return {...input,leaders:[{id:51}]}; } };
    if(name === "./nap-club-person-status") return {changeNativePersonStatus:async(connection,input,audit,authorize)=>{if(input.personId==="old-id") throw new TypeError("Native reference required");assert.equal(connection,pool);assert.equal(input.clubId,context.clubId);assert.equal(input.actorUid,context.uid);await authorize(input);await audit.prepare("operation",{});calls.push("person-status");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    if(name === "./nap-club-person-create") return {createNativePerson:async(connection,input,audit,authorize)=>{assert.equal(connection,pool);assert.equal(input.clubId,context.clubId);assert.equal(input.actorUid,context.uid);await authorize(input);await audit.prepare("operation",{});await audit.checkpoint("operation",{});calls.push("person-create");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    if(name === "./nap-club-person-edit") return {editNativePerson:async(connection,input,audit,authorize)=>{if(input.personId==="old-id") throw new TypeError("Native reference required");assert.equal(connection,pool);assert.equal(input.clubId,context.clubId);assert.equal(input.actorUid,context.uid);await authorize(input);await audit.prepare("operation",{});calls.push("person-identity");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    if (name === "./nap-team-leader-change") return {editNativeTeamLeader:async(connection,input,audit,authorize)=>{assert.equal(connection,pool);assert.equal(input.clubId,context.clubId);assert.equal(input.actorUid,context.uid);await authorize(event);await audit.prepare("operation",{});calls.push("leader-edit");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    if (name === "./nap-team-leader-create") return {createNativeTeamLeader:async(connection,input,audit,authorize)=>{assert.equal(connection,pool);assert.equal(input.clubId,context.clubId);assert.equal(input.actorUid,context.uid);assert.equal(input.leaderId,undefined);await authorize(event);await audit.prepare("operation",{});await audit.checkpoint("operation",{});calls.push("leader-create");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    if (name === "./nap-swimmer-entry-plan") return require("../functions/nap-swimmer-entry-plan");
    if (name === "./nap-entry-course-rules") return require("../functions/nap-entry-course-rules");
    if (name === "./nap-portal-competition-change") return {applyCompetitionChange:async(connection,input,audit,authorize)=>{assert.equal(connection,pool);assert.equal(input.actorUid,management.uid);assert.equal(input.national,management.national);await authorize(event);await audit.prepare("operation",{});calls.push("write");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    if (name === "./nap-course-removal") return {removeNativeCourse:async(connection,input,audit,authorize)=>{assert.equal(connection,pool);assert.equal(input.actorUid,management.uid);assert.equal(input.national,management.national);await authorize(event);await audit.prepare("operation",{});calls.push("course-removal");await audit.complete("operation",{});return {ok:true,source:"nap"};}};
    throw new Error(`Unexpected module ${name}`);
  } };
vm.createContext(sandbox);
const helperStart = source.indexOf("async function nativePortalCalendarItems(");
vm.runInContext(source.slice(helperStart, source.indexOf("exports.listEngagementCompetitions", helperStart)), sandbox);
for (const name of ["listEngagementCompetitions", "listEngagementCalendarEvents", "getEngagementCompetition", "getEngagementCalendarEvent", "getEngagementClubEntry", "preloadEngagementClubWorkspaces", "createEngagementCompetition", "createEngagementCalendarEvent", "updateEngagementCompetition", "saveEngagementClubTeamLeader", "listEngagementClubPeople", "saveEngagementClubPerson", "setEngagementClubPersonStatus"]) {
  const start = source.indexOf(`exports.${name} =`);
  const end = source.indexOf("\nexports.", start + 1);
  vm.runInContext(source.slice(start, end), sandbox);
}
(async () => {
  const nativePeople=await sandbox.exports.listEngagementClubPeople({data:{clubId:"999",forceRoster:true}});assert.equal(nativePeople.clubId,context.clubId);assert.equal(nativePeople.source,"nap");assert.deepEqual(calls,["native-people"]);calls.length=0;
  for(const name of ["saveEngagementClubPerson","setEngagementClubPersonStatus"]) await assert.rejects(sandbox.exports[name]({data:{personId:"old-id"}}),error=>error.code==="failed-precondition");
  calls.length=0;await sandbox.exports.setEngagementClubPersonStatus({data:{personId:"nap-official-7",clubId:"999",actorUid:"spoof",active:false}});assert.deepEqual(calls,["audit-backup","person-status","audit-complete"]);
  calls.length=0;await sandbox.exports.saveEngagementClubPerson({data:{personId:"nap-official-7",clubId:"999",actorUid:"spoof",patch:{firstName:"A",lastName:"B",birthDate:"1980-01-03"}}});assert.deepEqual(calls,["audit-backup","person-identity","audit-complete"]);calls.length=0;
  await sandbox.exports.saveEngagementClubPerson({data:{creationId:"11111111-1111-4111-8111-111111111111",clubId:"999",actorUid:"spoof",person:{firstName:"A",lastName:"B",birthDate:"1980-01-03",roles:{teamLeader:true,official:false}}}});assert.deepEqual(calls,["audit-backup","audit-checkpoint","person-create","audit-complete"]);calls.length=0;
  const list = await sandbox.exports.listEngagementCompetitions({ data: { manageOnly: true, fromDate: "2026-09-01", toDate: "2027-08-31" } });
  assert.equal(list.source, "nap"); assert.equal(list.competitions.length, 1); assert.equal(list.competitions[0].id, event.id);
  const calendar = await sandbox.exports.listEngagementCalendarEvents({ data: { fromDate: "2026-09-01", toDate: "2027-08-31" } });
  assert.equal(calendar.events.length, 1); assert.equal(calendar.events[0].competitionType, "training");
  calls.length = 0;
  await sandbox.exports.getEngagementCompetition({ data: { competitionId: event.id } });
  assert.deepEqual(calls, ["authorize", "detail", "documents"]);
  calls.length = 0; management = { national: false, region: true, regionId: "AURA" };
  await assert.rejects(sandbox.exports.getEngagementCompetition({ data: { competitionId: event.id } }), error => error.code === "permission-denied");
  assert.deepEqual(calls, ["authorize"]);
  const entry = await sandbox.exports.getEngagementClubEntry({ data: { competitionId: event.id, clubId: "999" } });
  assert.equal(entry.entry.clubId, "00123", "Caller cannot choose another club dossier");
  assert.equal(entry.sqlBudget.queriesMax, 25);
  calls.length=0;
  const leader=await sandbox.exports.saveEngagementClubTeamLeader({data:{competitionId:event.id,clubId:"999",actorUid:"spoof",leaderId:51,patch:{firstName:"Chef",lastName:"Native",birthDate:"1980-01-02"}}});
  assert.equal(leader.competition.nativeTeamLeaderEditable,true);
  assert.equal(leader.competition.nativeSwimmerSelectionEditable,true,"selection remains available after a native leader correction");
  assert.deepEqual(calls,["open-check","audit-backup","leader-edit","audit-complete","detail","documents","entry"]);
  calls.length=0;
  await sandbox.exports.saveEngagementClubTeamLeader({data:{competitionId:event.id,clubId:"999",actorUid:"spoof",patch:{firstName:"Chef",lastName:"Native",birthDate:"1980-01-02"}}});
  assert.deepEqual(calls,["open-check","audit-backup","audit-checkpoint","leader-create","audit-complete","detail","documents","entry"]);
  nativeParameters.qualif=1;
  const restrictedLeader=await sandbox.exports.saveEngagementClubTeamLeader({data:{competitionId:event.id,leaderId:51,patch:{firstName:"Chef"}}});
  assert.equal(restrictedLeader.competition.nativeSwimmerSelectionEditable,false,"leader correction must not unlock unmapped qualifications");
  nativeParameters.qualif=0;
  const preload = await sandbox.exports.preloadEngagementClubWorkspaces({ data: { competitionIds: [event.id] } });
  assert.equal(preload.workspaces.length, 0);
  await assert.rejects(sandbox.exports.createEngagementCompetition({data:{}}),error=>error.code==="invalid-argument");
  await assert.rejects(sandbox.exports.createEngagementCalendarEvent({data:{}}),error=>error.code==="failed-precondition");
  calls.length=0;management={uid:"national-admin",national:true};await sandbox.exports.createEngagementCompetition({data:{competitionType:"pool",creationId:"request-id",actorUid:"spoof",regionId:"PACA"}});assert.deepEqual(calls,["authorize","audit-backup","audit-checkpoint","competition-create","audit-complete","authorize","detail","documents"]);
  for(const eventType of ["training","stage","meeting"]) {
    calls.length=0;
    const created=await sandbox.exports.createEngagementCalendarEvent({data:{eventType,creationId:"request-id",actorUid:"spoof",regionId:"PACA"}});
    assert.equal(created.source,"nap");assert.equal(created.event.id,event.id);
    assert.deepEqual(calls,["authorize","audit-backup","audit-checkpoint","competition-create","audit-complete","authorize","detail","documents"]);
  }
  calls.length=0;management={uid:"region-admin",national:false,region:true,regionId:"AURA"};
  await assert.rejects(sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,actorUid:"spoof",national:true,patch:{entryStatus:"closed"}}}),error=>error.code==="permission-denied");assert.deepEqual(calls,["authorize"]);
  calls.length=0;management.regionId=event.regionId;past=true;
  await assert.rejects(sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,patch:{name:"New"}}}),error=>error.code==="failed-precondition");assert.deepEqual(calls,["authorize"]);
  calls.length=0;management={uid:"national-admin",national:true};
  const changed=await sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,patch:{name:"New"},actorUid:"spoof"}});
  assert.equal(changed.source,"nap");assert.deepEqual(calls,["authorize","audit-backup","write","audit-complete","authorize","detail","documents"]);
  calls.length=0;
  const removed=await sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,patch:{removeNativeCourseId:90,confirmCourseRemoval:true},actorUid:"spoof",national:false}});
  assert.equal(removed.source,"nap");assert.deepEqual(calls,["authorize","audit-backup","course-removal","audit-complete","authorize","detail","documents"]);
  calls.length=0;past=false;management={uid:'region-admin',national:false,region:true,regionId:event.regionId};
  qualificationRules={enabled:true};
  await assert.rejects(sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,patch:{date:'2026-10-12'}}}),error=>error.code==='permission-denied');assert.equal(startedControls,0);assert.ok(!calls.includes('write'));
  calls.length=0;management={uid:'national-admin',national:true};
  const controlled=await sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,expectedFingerprint:'f'.repeat(64),patch:{date:'2026-10-12',name:'Virtual change'}}});
  assert.equal(controlled.qualificationJobId,'a'.repeat(64));assert.equal(startedControls,1);assert.ok(!calls.includes('write'),'Combined parameters must remain virtual before national review');
  calls.length=0;
  await sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,patch:{qualifications:{enabled:false}}}});assert.equal(startedControls,2);assert.ok(!calls.includes('write'));
  calls.length=0;qualificationRules={enabled:false};
  const noChange=await sandbox.exports.updateEngagementCompetition({data:{competitionId:event.id,patch:{qualifications:{enabled:false}}}});assert.equal(noChange.unchanged,true);assert.equal(startedControls,2);assert.ok(!calls.includes('write'));
  console.log("NAP portal callables: scope, authenticated club, native reads and no old sports fallback verified");
})().catch(error => { console.error(error); process.exitCode = 1; });
