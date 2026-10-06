"use strict";
// Fixed portal indexes. Preparation is uploaded by the workflow before apply.
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { SPECS } = require("../functions/nap-approved-index");
const KINDS = ["entrySwimmers", "entryRelays", "relayMembers", "teamLeaders", "entryOfficials", "entryForfeits", "programSessions", "programCourses", "courseRestrictions", "participationRules", "invitedCommittees"];
const PEOPLE_KINDS = ["clubTeamLeaders", "clubOfficials"];
function selection(group, confirmation) {
  if (group === "engagements" && confirmation === "nap-add-portal-engagement-indexes") return KINDS;
  if (group === "club-people" && confirmation === "nap-add-club-people-indexes") return PEOPLE_KINDS;
  throw new Error("Groupe et confirmation incompatibles.");
}
const FILE = "outputs/nap-portal-indexes-before.json";
async function run() {
  const phase = process.env.NAP_PORTAL_INDEX_PHASE;
  if (process.env.TARGET_FIREBASE_PROJECT !== "livepalmes-test" || !["prepare", "apply"].includes(phase)) throw new Error("Confirmation invalide.");
  const kinds = selection(process.env.NAP_PORTAL_INDEX_GROUP || "engagements", process.env.NAP_PORTAL_INDEX_CONFIRMATION);
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes-test" || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte TEST incorrect.");
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  const uri = execFileSync("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", "--project=livepalmes-test", "--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint incorrect.");
  const token = execFileSync("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  url.searchParams.set("action", "approved-index");
  fs.mkdirSync("outputs", { recursive: true });
  const before = phase === "apply" ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
  if (phase === "apply" && JSON.stringify(Object.keys(before)) !== JSON.stringify(kinds)) throw new Error("Sauvegarde incomplete.");
  const proof = {};
  for (const kind of kinds) {
    const spec = SPECS[kind], saved = before[kind];
    if (phase === "apply" && (saved?.table !== spec.table || saved?.index !== spec.name || JSON.stringify(saved.columns) !== JSON.stringify(spec.columns) || !Array.isArray(saved.definition) || !/^[a-f0-9]{64}$/.test(saved.schemaHash))) throw new Error("Sauvegarde incompatible.");
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ index: kind, confirmation: `nap-add-${kind}-index`, phase, schemaHash: saved?.schemaHash }), signal: AbortSignal.timeout(170000) });
    if (!response.ok) throw new Error("Operation privee indisponible.");
    const result = await response.json();
    if (result.source !== "nap" || result.mode !== "approved-index" || result.table !== spec.table || result.index !== spec.name || JSON.stringify(result.columns) !== JSON.stringify(spec.columns) || (phase === "apply" && result.verified !== true)) throw new Error("Verification incomplete.");
    if (phase === "prepare" && (!Array.isArray(result.definition) || !/^[a-f0-9]{64}$/.test(result.schemaHash))) throw new Error("Structure incomplete.");
    proof[kind] = result;
    // Save each verified result, including partial progress after an interruption.
    fs.writeFileSync(phase === "prepare" ? FILE : "outputs/nap-portal-indexes-result.json", JSON.stringify(proof, null, 2) + "\n");
  }
  console.log(`${kinds.length} index portail : ${phase === "prepare" ? "structures sauvegardees" : "verifies"}. Aucune ligne sportive modifiee.`);
}
if (require.main === module) run().catch(() => { console.error("Operation index portail arretee. Consulter les preuves avant reprise ; aucun secret affiche."); process.exitCode = 1; });
module.exports = { KINDS, PEOPLE_KINDS, selection, run };
