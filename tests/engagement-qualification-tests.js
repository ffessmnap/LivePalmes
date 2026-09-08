"use strict";
const assert = require("node:assert/strict");
const { validateRules, evaluate, reconcile, relayEligible } = require("../functions/engagement-qualification");
const events = ["100SF", "50SF", "200SF"].map((code) => ({ code, type: "individual", categories: ["C", "J"] }));
const group = { categories: ["C"], mode: "one", startDate: "2025-09-01", endDate: "2026-08-31", pools: ["25", "50"], competitionMode: "all", competitionIds: [], bonusRequiresSelectedCompetition: true };
const standards = {};
for (const category of ["C", "J"]) for (const sex of ["F", "M"]) for (const event of events) standards[`${category}|${sex}|${event.code}`] = event.code === "200SF" ? null : 6000;
const raw = { enabled: true, groups: [group, { ...group, categories: ["J"], mode: "each", pools: ["50"], competitionMode: "selected", competitionIds: ["national"] }], standards };
const rules = validateRules(raw, events, true);
const performance = { course: "100SF", date: "2026-01-01", pool: "50", chrono: "E", timeValue: 6000, competitionId: "national", publicKey: "proof" };
const run = (options = {}) => evaluate({ rules, category: "C", sex: "F", events, rows: [performance, { ...performance, course: "50SF", timeValue: 6500 }, { ...performance, course: "200SF", timeValue: 8000 }], ...options });
const codes = (rows) => rows.map((eventCode) => ({ eventCode }));

assert.equal(run().courses["100SF"].qualified, true, "L'égalité au minimum qualifie.");
assert.equal(run().courses["50SF"].qualified, false);
assert.equal(run().courses["50SF"].bonus, true);
assert.equal(run().courses["200SF"].qualified, false, "Sans minimum ne constitue pas une qualification.");
assert.equal(reconcile(codes(["100SF", "50SF", "200SF"]), run()).removed.length, 0);
assert.equal(reconcile(codes(["50SF", "200SF"]), run()).entries.length, 0, "Sans course qualifiée engagée, aucun bonus.");
assert.equal(reconcile(codes(["50SF"]), run({ category: "J" })).entries.length, 0, "Mode chaque course.");
assert.equal(reconcile(codes(["200SF"]), run({ category: "J" })).entries.length, 1, "Sans minimum reste accessible en mode chaque course.");
assert.equal(reconcile(codes(["100SF"]), { enabled: false }).entries.length, 1);

for (const invalid of [{ pool: "33" }, { chrono: "M" }, { date: "2025-08-31" }, { date: "2026-09-01" }, { date: "2026-02-30" }, { active: false }, { status: "hidden" }, { timeValue: 359999 }, { timeValue: 0 }]) {
  assert.equal(run({ rows: [{ ...performance, ...invalid }] }).courses["100SF"].qualified, false, JSON.stringify(invalid));
}
assert.equal(run({ rows: [{ ...performance, pool: "25", competitionId: "regional" }] }).courses["100SF"].qualified, true);
assert.equal(run({ category: "J", rows: [{ ...performance, pool: "25" }] }).courses["100SF"].qualified, false);
assert.equal(run({ category: "J", rows: [{ ...performance, competitionId: "regional" }] }).courses["100SF"].qualified, false);
assert.equal(run({ rows: [{ ...performance, category: "M" }] }).courses["100SF"].qualified, true, "La catégorie de la performance ne remplace pas celle de la saison visée.");
assert.equal(run({ rows: [{ ...performance, publicKey: "removed", active: false }, { ...performance, publicKey: "alternate" }] }).courses["100SF"].proof.id, "alternate");

const bonusRules = structuredClone(rules);
Object.assign(bonusRules.groups[0], { competitionMode: "selected", competitionIds: ["national"], bonusRequiresSelectedCompetition: false });
let bonus = run({ rules: bonusRules, rows: [performance, { ...performance, competitionId: "regional", course: "50SF", timeValue: 6500 }] });
assert.equal(bonus.courses["50SF"].bonus, true);
bonusRules.groups[0].bonusRequiresSelectedCompetition = true;
bonus = run({ rules: bonusRules, rows: [performance, { ...performance, competitionId: "regional", course: "50SF", timeValue: 6500 }] });
assert.equal(bonus.courses["50SF"].bonus, false);

for (const status of ["pending", "refused"]) assert.equal(reconcile(codes(["50SF"]), run({ approvals: [{ eventCode: "50SF", status }] })).entries.length, 0);
const approved = run({ approvals: [{ eventCode: "50SF", status: "accepted" }] });
assert.equal(reconcile(codes(["50SF"]), approved).entries.length, 1);
assert.equal(approved.courses["50SF"].qualified, false, "Une dérogation n'invente pas une performance qualifiante.");
assert.equal(reconcile(codes(["200SF"]), approved).entries.length, 0, "L'accord ne s'étend pas aux autres courses.");

const swimmers = [{ swimmerIndexId: "a", individualEntries: codes(["100SF"]) }, { swimmerIndexId: "b", individualEntries: [] }];
assert.equal(relayEligible({ memberIds: [] }, swimmers, {}), true);
assert.equal(relayEligible({ memberIds: ["a", "b"] }, swimmers, { a: run() }), true);
assert.equal(relayEligible({ memberIds: ["a", "b"] }, [{ swimmerIndexId: "a", individualEntries: [] }], { a: run() }), false);
assert.equal(relayEligible({ memberIds: ["a"] }, [{ swimmerIndexId: "a", individualEntries: codes(["200SF"]) }], { a: run() }), false);

assert.throws(() => validateRules({ ...raw, groups: [group, group] }, events, true), /seul groupe/);
assert.throws(() => validateRules({ ...raw, groups: [group] }, events, true), /Aucun groupe/);
assert.throws(() => validateRules({ ...raw, standards: {} }, events, true), /incomplète/);
assert.doesNotThrow(() => validateRules({ ...raw, standards: {} }, events, false));
assert.throws(() => validateRules({ ...raw, groups: [{ ...group, startDate: "2026-99-99" }] }), /Période/);
assert.throws(() => validateRules({ ...raw, groups: [{ ...group, pools: ["33"] }] }), /bassins/);
assert.throws(() => validateRules({ ...raw, standards: { "C|F|100SF": "6000" } }), /Minimum invalide/);
assert.equal(run({ category: "J", rows: [{ ...performance, competitionId: "replacement", qualificationCompetitionId: "national" }] }).courses["100SF"].qualified, true, "Un remplacement conserve le rattachement à la compétition qualificative.");
const manualRules = structuredClone(rules);
manualRules.groups[0].electronicOnly = false;
assert.equal(run({ rules: manualRules, rows: [{ ...performance, chrono: "M" }] }).courses["100SF"].qualified, true);
const mapped = structuredClone(rules);
mapped.groups[0].competitionMode = "selected";
mapped.groups[0].competitionIds = ["4980"];
assert.equal(run({ rules: mapped, rows: [{ ...performance, competitionId: "e40fe3129ffd5d76286774193a2855ed" }] }).courses["100SF"].qualified, true);
mapped.groups[0].competitionIds = ["5132"];
assert.equal(run({ rules: mapped, rows: [{ ...performance, category: "M", competitionId: "d18c4f3dc04b5cc5402f340fe2af1ca5" }] }).courses["100SF"].qualified, true);
assert.equal(run({ rules: mapped, rows: [{ ...performance, category: "M30+", competitionId: "d18c4f3dc04b5cc5402f340fe2af1ca5" }] }).courses["100SF"].qualified, false);
console.log("Qualification : groupes, seuils, bonus, preuves alternatives, dérogations et relais OK.");
