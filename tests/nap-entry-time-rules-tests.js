"use strict";
const assert = require("node:assert/strict");
const { resolveTime } = require("../functions/nap-entry-time-rules");
let known = false, reads = 0;
const services = {
  automatic: entry => { reads++; return known
    ? { ...entry, entryTimeMode: "known", entryTime: "01:42.00", entryTimeValue: 10200 }
    : { ...entry, entryTimeMode: "default595999", entryTime: "59:59.99", entryTimeValue: 359999 }; },
  parse: raw => raw === "14200" ? { display: "01:42.00", value: 10200 } : null
};
const entry = { eventCode: "100SF" };
assert.throws(() => resolveTime(entry, { missingEntryTimeMode: "forbidden" }, services), /engagement interdit/);
assert.equal(resolveTime(entry, { missingEntryTimeMode: "forbidden" }, services, true).entryTimeMode, "forbidden");
known = true;
assert.equal(resolveTime(entry, { missingEntryTimeMode: "forbidden" }, services).entryTimeValue, 10200);
known = false;
assert.equal(resolveTime(entry, { missingEntryTimeMode: "default595999" }, services).entryTime, "59:59.99");
assert.equal(resolveTime(entry, {}, services).entryTimeMode, "default595999");
assert.throws(() => resolveTime(entry, { missingEntryTimeMode: "" }, services), /a completer/);
assert.equal(resolveTime(entry, { missingEntryTimeMode: "" }, services, true).entryTimeMode, "unconfigured");
known = true;
assert.equal(resolveTime(entry, { missingEntryTimeMode: "" }, services).entryTimeMode, "known");
known = false;
const manual = { ...entry, entryTimeMode: "manual", manualEntryTime: "14200" };
const before = reads;
assert.equal(resolveTime(manual, { missingEntryTimeMode: "manual" }, services).manualEntryTime, "14200");
assert.equal(reads, before);
for (const mode of ["forbidden", "default595999"]) {
  assert.throws(() => resolveTime(manual, { missingEntryTimeMode: mode }, services), /non autorisee/);
}
assert.throws(() => resolveTime(manual, { missingEntryTimeMode: "manual", qualifications: { enabled: true } }, services), /non autorisee/);
assert.throws(() => resolveTime({ ...manual, manualEntryTime: "invalid" }, { missingEntryTimeMode: "manual" }, services), /invalide/);
assert.equal(resolveTime(entry, { competitionType: "openWater", missingEntryTimeMode: "none" }, services).entryTimeMode, "notRequired");
assert.throws(() => resolveTime(entry, { missingEntryTimeMode: "none" }, services), /piscine/);
const nativePolicy = require("../functions/nap-entry-time-policy");
assert.deepEqual([0,-1,1].map(nativePolicy.policy),["default595999","forbidden","manual"]);
assert.throws(()=>nativePolicy.policy(9),/inconnu/);
const history=[{id:7,course:"100SF",time:"1:42.00",timeValue:10200,date:"2026-02-01"},{id:8,course:"100SF",time:"1:40.00",timeValue:10000,date:"2025-02-01"}];
const selected={eventCode:"100SF",entryTimeMode:"known",entryTime:"14200"};
const nativeServices={...services,known:requested=>nativePolicy.known(requested,history,{qualificationStartDate:"2026-01-01"},services.parse)};
const nativeCompetition=saisie=>({napSource:true,nativeParameters:{saisie},missingEntryTimeMode:nativePolicy.policy(saisie)});
assert.equal(resolveTime(selected,nativeCompetition(0),nativeServices).sourcePerformanceId,"7");
assert.throws(()=>resolveTime({...selected,manualEntryTime:"14200"},nativeCompetition(0),nativeServices),/libre/);
assert.throws(()=>nativePolicy.known(selected,history,{qualificationStartDate:"2026-02-02"},services.parse),/periode/);
known=true;
assert.equal(resolveTime({...selected,entryTime:"invented"},nativeCompetition(-1),nativeServices).entryTimeValue,10200,"best automatic time is imposed in mode -1");
known=false;
assert.equal(resolveTime(entry,nativeCompetition(0),nativeServices).nativeTime,"599999");
assert.throws(()=>resolveTime(entry,nativeCompetition(-1),nativeServices),/interdit/);
assert.equal(resolveTime(manual,nativeCompetition(1),nativeServices).entryTimeValue,10200);
console.log("Native time rules preserve manual/default policies and enforce forbidden missing times without database access");
