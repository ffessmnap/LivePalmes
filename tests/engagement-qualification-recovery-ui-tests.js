"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../assets/livepalmes-admin-portal.js"), "utf8");
function section(start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }
function element() { return { children: [], hidden: false, append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; }, setAttribute() {}, scrollIntoView() { this.scrolled = true; } }; }
async function main() {
  const banner = element(); const calls = []; let national = true, conflict = false, cancelFails = false;
  const context = { selectedEngagementCompetition: { id: "meet", qualificationJobId: "job" },
    document: { querySelector: () => banner, createElement: element },
    elements: { engagementsDetailStatus: element() }, global: { confirm: () => true },
    canUse: () => national, qualificationEditor: { read: () => ({ enabled: true }) }, engagementCompetitionType: () => "pool",
    finishQualificationJob: async () => { calls.push("resume"); return { competition: { id: "meet", qualificationJobId: "" } }; },
    renderEngagementCompetitionDetail: () => {},
    callFunction: async (name) => { calls.push(name); if (name === "updateEngagementCompetition" && conflict) throw new Error("Un contrôle de qualification est déjà en cours."); if (name === "getEngagementCompetition") return { competition: { id: "meet", qualificationJobId: "job" } }; if (cancelFails) throw new Error("Application commencée : reprenez le traitement."); return {}; }
  };
  vm.createContext(context);
  vm.runInContext(section("  function renderQualificationJobActions(", "  function renderQualificationEditor("), context);
  vm.runInContext(section("  async function updateCompetitionWithQualifications(", "  function updateQualificationCheckboxes("), context);
  context.renderQualificationJobActions();
  assert.equal(banner.hidden, false);
  assert.equal(banner.children[1].textContent, "Reprendre le contrôle des qualifications");
  assert.equal(calls.length, 0, "Le bandeau ne déclenche aucune lecture.");
  await assert.rejects(context.updateCompetitionWithQualifications({ competitionId: "meet" }), /bandeau/);
  assert.equal(calls.length, 0, "Un verrou connu ne déclenche pas une nouvelle sauvegarde.");
  assert.equal(banner.scrolled, true);
  cancelFails = true;
  await banner.children[2].onclick();
  assert.equal(context.selectedEngagementCompetition.qualificationJobId, "job", "Le refus serveur d'annuler conserve le verrou.");
  assert.match(banner.children[3].textContent, /Application commencée/);
  cancelFails = false;
  await banner.children[2].onclick();
  assert.equal(context.selectedEngagementCompetition.qualificationJobId, "");
  assert.equal(banner.hidden, true);
  calls.length = 0; conflict = true;
  await assert.rejects(context.updateCompetitionWithQualifications({ competitionId: "meet" }), /bandeau/);
  assert.deepEqual(calls, ["updateEngagementCompetition", "getEngagementCompetition"], "Un conflit inconnu nécessite une seule récupération de fiche.");
  assert.equal(banner.hidden, false);
  await banner.children[1].onclick();
  assert.ok(calls.includes("resume"));
  national = false; context.selectedEngagementCompetition.qualificationJobId = "job";
  context.renderQualificationJobActions(); assert.equal(banner.hidden, true);
  console.log("Reprise qualifications : visibilité, conflit périmé, annulation protégée et lectures bornées OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
