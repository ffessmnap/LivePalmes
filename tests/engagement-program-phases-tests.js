const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const functionsSource = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");
const cleanerStart = functionsSource.indexOf("function cleanEngagementProgramSessions");
const cleanerEnd = functionsSource.indexOf("function engagementCompetitionCalendarItem", cleanerStart);
const cleanerSource = functionsSource.slice(cleanerStart, cleanerEnd);

class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const cleanerSandbox = {
  HttpsError,
  cleanText: (value) => String(value || "").trim(),
  cleanIsoDate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "",
  ENGAGEMENT_PROGRAM_GENDER_MODES: new Set(["female", "male", "mixed"]),
  ENGAGEMENT_PROGRAM_PHASES: new Set(["direct", "heats", "final", "slowHeats", "fastHeat"]),
  ENGAGEMENT_EVENT_DEFINITION_BY_CODE: new Map([
    ["100SF", { code: "100SF", type: "individual" }],
    ["400BI", { code: "400BI", type: "individual" }]
  ])
};
vm.createContext(cleanerSandbox);
vm.runInContext(`${cleanerSource}\nthis.clean = cleanEngagementProgramSessions;`, cleanerSandbox);

const events = [{ code: "100SF" }, { code: "400BI" }];
const legacy = cleanerSandbox.clean([{ items: [{ eventCode: "100SF", genderMode: "female" }] }], events);
assert.equal(legacy[0].items[0].phase, "direct");

const heatsAndFinal = cleanerSandbox.clean([
  { items: [{ eventCode: "100SF", genderMode: "female", phase: "heats" }] },
  { items: [{ eventCode: "100SF", genderMode: "female", phase: "final" }] }
], events);
assert.deepEqual(Array.from(heatsAndFinal, (session) => session.items[0].phase), ["heats", "final"]);

const slowAndFast = cleanerSandbox.clean([
  { items: [{ eventCode: "400BI", genderMode: "male", phase: "slowHeats" }] },
  { items: [{ eventCode: "400BI", genderMode: "male", phase: "fastHeat" }] }
], events);
assert.deepEqual(Array.from(slowAndFast, (session) => session.items[0].phase), ["slowHeats", "fastHeat"]);

assert.throws(() => cleanerSandbox.clean([
  { items: [{ eventCode: "100SF", genderMode: "female", phase: "final" }] }
], events), /series et la finale/);
assert.throws(() => cleanerSandbox.clean([
  { items: [{ eventCode: "100SF", genderMode: "female", phase: "final" }] },
  { items: [{ eventCode: "100SF", genderMode: "female", phase: "heats" }] }
], events), /finale doit etre placee apres/);
assert.throws(() => cleanerSandbox.clean([
  { items: [
    { eventCode: "100SF", genderMode: "female", phase: "direct" },
    { eventCode: "100SF", genderMode: "female", phase: "direct" }
  ] }
], events), /Doublon/);

const portalSource = fs.readFileSync(path.join(root, "assets", "livepalmes-admin-portal.js"), "utf8");
assert.ok(portalSource.includes('["direct", "Course directe"]'));
assert.ok(portalSource.includes('["heatsFinal", "Séries + finale(s)"]'));
assert.ok(portalSource.includes('final: "Finale(s)"'));
assert.ok(portalSource.includes('["slowFast", "Séries lentes / série rapide"]'));
assert.ok(portalSource.includes("function applyEngagementProgramFormatChange"));
assert.ok(portalSource.includes("engagementProgramSecondPhaseForFormat"));
assert.ok(portalSource.includes("function normalizeEngagementProgramPassageOrder"));
assert.ok(portalSource.includes("function engagementProgramCanAddPassage"));
assert.ok(portalSource.includes("engagementProgramNextPhase"));
const entriesStart = portalSource.indexOf("function engagementClubProgramSessionsForEntries");
const entriesEnd = portalSource.indexOf("function engagementClubProgramItemAllowsSwimmer", entriesStart);
const entriesSource = portalSource.slice(entriesStart, entriesEnd);
const portalSandbox = {
  selectedEngagementCompetition: {
    date: "2026-10-03",
    programSessions: [
      { id: "s1", items: [
        { eventCode: "100SF", genderMode: "female", phase: "heats" },
        { eventCode: "400BI", genderMode: "male", phase: "slowHeats" }
      ] },
      { id: "s2", items: [
        { eventCode: "400BI", genderMode: "male", phase: "fastHeat" },
        { eventCode: "100SF", genderMode: "female", phase: "final" }
      ] }
    ]
  },
  engagementClubIndividualEvents: () => [
    { code: "100SF", type: "individual" },
    { code: "400BI", type: "individual" }
  ],
  normalizedEngagementProgramSessions: (sessions) => sessions,
  engagementEventDefinition: () => ({ type: "individual" })
};
vm.createContext(portalSandbox);
vm.runInContext(`${entriesSource}\nthis.entrySessions = engagementClubProgramSessionsForEntries();`, portalSandbox);
assert.deepEqual(
  JSON.parse(JSON.stringify(portalSandbox.entrySessions.flatMap((session) => session.items.map((item) => `${item.eventCode}:${item.phase}`)))),
  ["100SF:heats", "400BI:slowHeats"]
);

console.log("Engagement program phases tests OK");
