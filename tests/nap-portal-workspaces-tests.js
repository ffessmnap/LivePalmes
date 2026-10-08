"use strict";
const assert = require("node:assert/strict");
const view = require("../functions/nap-portal-workspaces");
assert.equal(view.nativeCourseCode("4X100BI Mixte"),"4X100BI");
assert.equal(view.nativeCourseCode("4X100SB Mixte"),"4X100SB");
assert.equal(view.nativeCourseCode("4X50SF Mixte"),"4X50SF");
assert.notEqual(view.nativeCourseCode("4X100BI Mixte"),view.nativeCourseCode("4X100SB Mixte"));
assert.equal(view.nativeCourseCode("4X100SF HSE"),"4X100SFHSE");
const pack = { source: "nap", readAt: "2026-10-06T10:00:00Z", event: { id: "legacy-nap-5140", city: "Antibes", date: "2026-10-11", competitionType: "pool" },
  nativeParameters: { saisie: 0, relais: 0, officiel: 1, mailtxt: "", mailjuges: "" },
  courses: [{ id: 1, id_course: 10, course: "50BI", sexe: "F", relais: 0 }, { id: 2, id_course: 11, course: "50BI", sexe: "M", relais: 0 }, { id: 3, id_course: 90, course: "25AP", sexe: "F", relais: 0 }],
  restrictions: [{ id: 50, course: 10, categorie: 15, swim: 0 }], participations: [{ id: 9, modeengagement: 2 }], committees: [{ id: 2, comite: "AURA" }],
  options: null, courseOptions: [], fees: null, detailedProgram: null, groups: [], standards: [] };
const competition = view.competitionItem(pack, new Map([["50BI", { code: "50BI", label: "50 m Bi-palmes" }]]));
assert.equal(competition.events.length, 2);
assert.equal(competition.events[0].nativeCourses.length, 2);
assert.deepEqual(competition.nativeRules.restrictions, pack.restrictions);
assert.equal(competition.events[1].code, "25AP");
assert.equal(competition.events[1].nativeRecognized, false);
assert.equal(competition.events[0].allowMultipleRelays, null);
assert.equal(competition.nativeOptionsConfigured, false);
assert.deepEqual(competition.fees, { enabled: false });
assert.equal(competition.missingEntryTimeMode, "default595999");
assert.equal(competition.nativeReadOnly, true);
const invitations=view.competitionItem({...pack,committees:[{id:1,comite:3}],options:{invited_region_ids:["Sud"]}});
assert.deepEqual(invitations.invitedRegionIds,["Ile de France"],"The shared native list takes precedence over an old LP supplement");
assert.equal(invitations.nativeInvitationsEditable,true);
const unusedOpen=view.competitionItem({...pack,committees:[{id:1,comite:19},{id:2,comite:3}],options:{invited_region_ids:["OPEN"]}});
assert.equal(unusedOpen.nativeInvitationsEditable,true);
assert.deepEqual(unusedOpen.invitedRegionIds,["Ile de France"]);
assert.deepEqual(view.competitionItem({...pack,committees:[],options:{invited_region_ids:["OPEN","Sud"]}}).invitedRegionIds,["Sud"]);
const water=view.competitionItem({...pack,event:{...pack.event,eventType:"openWater",competitionType:"openWater"},courses:[{id:1,id_course:116,course:"1000",sexe:"F",relais:0},{id:2,id_course:117,course:"1000",sexe:"M",relais:0},{id:3,id_course:416,course:"500BI",sexe:"M",relais:0},{id:4,id_course:9,course:"150",sexe:"M",relais:0}]});
assert.equal(water.events[0].code,"OW1000SF");
assert.equal(water.events[0].nativeCourses[0].course,"1000");
assert.equal(water.events[0].nativeCourses.length,2);
assert.equal(water.events[1].code,"OW500BI");
assert.equal(water.events[2].nativeRecognized,false,"150 m does not silently become elimination");
assert.equal(competition.napFingerprint, view.fingerprint({ ...pack, readAt: "other-time" }));
assert.notEqual(competition.napFingerprint, view.fingerprint({ ...pack, nativeParameters: { ...pack.nativeParameters, saisie: 1 } }));
assert.throws(() => view.json("invalid", []), /illisible/);
assert.equal(view.nativeTime("14200").entryTimeValue, 10200);
assert.equal(view.nativeTime("014200").entryTimeValue, 10200);
assert.equal(view.nativeTime("14200").nativeTime, "14200");
assert.equal(view.nativeTime("599999").nativeTime, "599999");
assert.equal(view.nativeTime("599999").entryTimeValue, 0);
const entryPack = { source: "nap", readAt: "now", competitionId: "5140", clubId: "00123",
  swimmers: [{ id: "912", swimmerIndexId: "912", firstName: "Antoine", lastName: "FAUVAU", birthDate: "1994-01-01", licenseNumber: "obsolete" }],
  inscriptions: [{ id: 100, nageur: 912 }, { id: 101, nageur: 912 }],
  individual: [{ id: 50, engagement: 100, course: "50BI", tps: "14200" }, { id: 51, engagement: 100, course: "50BI", tps: "014200" }],
  relays: [{ id: 2, categorie: 0, course: 95, course_code: "ANCIEN", sexe: "?", tps: "599999" }],
  members: [{ id: 90, relais: 2, pos: 4, nageur: 912, nom: "FAUVAU", prenom: "Antoine" }],
  officials: [{ id: 3, officiel: 5, nom: "Officiel", prenom: "Test" }],
  leaders: [{ id: 1, nom: "Premier", prenom: "Chef" }, { id: 2, nom: "Second", prenom: "Chef" }], options: null };
const entry = view.entryItem(entryPack, { clubName: "Club" }, () => "M30");
assert.equal(entry.clubId, "00123");
assert.equal(entry.swimmers.length, 2);
assert.equal(entry.swimmers[0].individualEntries.length, 2);
assert.equal(entry.swimmers[0].licenseNumber, "");
assert.equal(entry.swimmers[0].category, "M30");
assert.equal(entry.relays.length, 1);
assert.equal(entry.relays[0].nativeCategory, 0);
assert.equal(entry.relays[0].genderMode, "");
assert.equal(entry.relays[0].members[0].nativePosition, 4);
assert.equal(entry.nativeLeaders.length, 2);
assert.deepEqual(entry.teamLeader, {});
assert.equal(entry.teamLeaderComplete, false);
assert.equal(entry.officials.length, 1);
assert.equal(entry.officials[0].licenseNumber, "");
assert.throws(() => view.entryItem({ ...entryPack, swimmers: [] }, {}, () => ""), /sans fiche/);
console.log("NAP portal presentation bridge tests passed");
