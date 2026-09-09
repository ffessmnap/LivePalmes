"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../assets/livepalmes-admin-portal.js"), "utf8");
function section(start, end) { const offset = source.indexOf(start); assert.ok(offset >= 0); return source.slice(offset, source.indexOf(end, offset)); }
async function main() {
  let national = true, club = "a", confirm = false, fails = false;
  const calls = [], cache = new Map();
  const context = {
    selectedEngagementCompetitionId: "meet", selectedEngagementCompetition: { qualifications: { enabled: true } },
    currentAccessProfile: { uid: "national" }, canUse: () => national,
    activeEngagementClubProfile: () => ({ clubId: club }),
    selectedEngagementClubSwimmerRows: () => [{ swimmerIndexId: "swimmer" }],
    engagementClubSwimmerEventTimesCache: cache, engagementClubSwimmerEventTimesCacheKey: () => "swimmer",
    engagementClubEntryMutationQueue: Promise.resolve(), elements: { engagementsClubEntriesMessage: {} },
    global: { confirm: () => confirm, LivePalmesEngagementQualifications: { display: String } },
    callFunction: async (name, data) => { calls.push({ name, data }); if (fails) throw new Error("Refus serveur"); return { qualification: { mode: "one", allowed: true, qualified: false, approved: true, exceptionEligible: true } }; }
  };
  vm.createContext(context);
  vm.runInContext('let qualificationExceptionScope = "";\n' + section("  function qualificationExceptionContext(", "  function engagementManualIndividualTimesAllowed("), context);
  vm.runInContext(section("  function updateQualificationCheckboxes(", "  function fillEngagementEditForm("), context);
  const boxes = ["50SF", "100SF", "200SF", "400SF"].map(code => ({ dataset: { engagementClubSwimmerEvent: code }, checked: false, closest: () => ({ setAttribute() {} }) }));
  const row = { dataset: { engagementClubEntrySwimmerId: "swimmer" }, querySelectorAll: () => boxes };
  const previews = [
    { eventCode: "50SF", qualification: { allowed: true, qualified: true, mode: "one", exceptionEligible: true } },
    { eventCode: "100SF", qualification: { allowed: true, qualified: false, mode: "one", exceptionEligible: true } },
    { eventCode: "200SF", qualification: { allowed: false, qualified: false, mode: "one", exceptionEligible: true, reason: "Minimum non réalisé" } },
    { eventCode: "400SF", qualification: { allowed: false, qualified: false, mode: "one", exceptionEligible: false } }
  ];
  cache.set("swimmer", previews);
  const update = () => context.updateQualificationCheckboxes(row);
  update();
  assert.deepEqual(boxes.map(x => x.hidden), [false, true, true, true], "National normal : seules les courses admissibles sont visibles.");
  boxes[0].checked = true; update(); assert.equal(boxes[1].hidden, false, "Une vraie qualification débloque le bonus.");
  boxes[0].checked = false;
  vm.runInContext("qualificationExceptionScope = qualificationExceptionContext()", context);
  update(); assert.deepEqual(boxes.map(x => x.hidden), [false, false, false, true]);
  assert.equal(boxes[2].dataset.qualificationExceptionRequired, "true");
  assert.equal(await context.confirmQualificationException(boxes[2], row), false);
  assert.equal(calls.length, 0, "Annuler ne produit aucun appel.");
  confirm = true; fails = true;
  assert.equal(await context.confirmQualificationException(boxes[2], row), false);
  assert.equal(context.elements.engagementsClubEntriesMessage.textContent, "Refus serveur");
  assert.equal(boxes[2].disabled, false);
  fails = false;
  assert.equal(await context.confirmQualificationException(boxes[2], row), true);
  assert.equal(calls[1].name, "grantEngagementQualificationException");
  assert.equal(JSON.stringify(calls[1].data), JSON.stringify({ competitionId: "meet", swimmerIndexId: "swimmer", eventCode: "200SF", confirmed: true }));
  boxes[2].checked = true;
  vm.runInContext('qualificationExceptionScope = ""', context);
  update(); assert.equal(boxes[2].hidden, false); assert.equal(boxes[1].hidden, true, "Une exception ne débloque pas les bonus.");
  const count = calls.length;
  vm.runInContext("qualificationExceptionScope = qualificationExceptionContext()", context);
  club = "b"; assert.equal(context.qualificationExceptionsEnabled(), false);
  club = "a"; assert.equal(context.qualificationExceptionsEnabled(), false, "Le retour au club ne réactive pas le mode.");
  vm.runInContext("qualificationExceptionScope = qualificationExceptionContext()", context);
  context.selectedEngagementCompetitionId = "other"; assert.equal(context.qualificationExceptionsEnabled(), false);
  vm.runInContext("qualificationExceptionScope = qualificationExceptionContext()", context);
  national = false; update(); assert.equal(boxes[1].hidden, true);
  assert.equal(await context.confirmQualificationException(boxes[1], row), false);
  assert.equal(calls.length, count, "Affichage et changements de contexte sans lectures supplémentaires.");
  console.log("Exceptions nationales : masquage, confirmation, permissions, bonus et isolation du contexte OK.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
