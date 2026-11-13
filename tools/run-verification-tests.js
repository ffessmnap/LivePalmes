"use strict";
// Stable runner: adding a test changes the inventory, not the trusted CI controller.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const suites = ["application", "publication", "browser", "publicationFallback", "mysql", "standalone"];

function inventory(directory = root) {
  const value = JSON.parse(fs.readFileSync(path.join(directory, "tools/verification-tests.json"), "utf8"));
  if (value.schema !== 1 || Object.keys(value).sort().join() !== ["schema", ...suites].sort().join()) throw Error("Inventaire de tests inconnu");
  for (const suite of suites) {
    const files = value[suite];
    if (!Array.isArray(files) || files.length > 600 || new Set(files).size !== files.length) throw Error("Inventaire de tests invalide : " + suite);
    for (const file of files) {
      if (typeof file !== "string" || !/^(?:tests\/[a-z0-9-]+\.(?:js|py)|tools\/(?:verify-release-acceleration\.py|livepalmes-browser-smoke\.js))$/.test(file) ||
          !fs.statSync(path.join(directory, file)).isFile()) throw Error("Chemin de test invalide : " + file);
    }
  }
  const registered = new Set(suites.flatMap(s => value[s]));
  for (const file of fs.readdirSync(path.join(directory, "tests"))) {
    if (/^.*-tests\.(js|py)$/.test(file) && !registered.has("tests/" + file)) throw Error("Nouveau test sans parcours déclaré : " + file);
  }
  const common = ["application", "publication", "browser", "mysql"].flatMap(s => value[s]);
  if (new Set(common).size !== common.length) throw Error("Test exécuté deux fois dans la CI commune");
  if (value.standalone.some(file => common.includes(file))) throw Error("Test spécifique également déclaré dans la CI commune");
  return value;
}

function family(file) {
  if (/club-merge/.test(file)) return "Fusion des clubs et cohérence des annuaires";
  if (/retire|historical-migration/.test(file)) return "Blocage des anciens outils retirés";
  if (/dtn|qualification/.test(file)) return "Qualifications et paramètres sportifs";
  if (/direct/.test(file)) return "Direct : bureau, consoles et consultation publique";
  if (/release|production|publication|ci-|backup|hosting/.test(file)) return "Fiabilité des vérifications et des publications";
  if (/mail|notification|reminder/.test(file)) return "Messages et préférences de notification";
  if (/import|winpalme|pdf/.test(file)) return "Imports, documents et résultats";
  if (/swimmer|license|people/.test(file)) return "Nageurs, personnes et licences";
  return "Portail, espace public et composants partagés";
}

function runSuite(suite, options = {}) {
  if (!suites.includes(suite) || suite === "standalone") throw Error("Suite exécutable inconnue : " + suite);
  const directory = options.root || root, declared = inventory(directory)[suite];
  const impact = require("./verification-test-impact");
  const selection = impact.plan(suite, declared, { root: directory });
  const files = selection.selected;
  const receipt = process.env.RUNNER_TEMP && path.join(process.env.RUNNER_TEMP, "ci-test-selection", suite + ".json");
  const save = value => { if (receipt) { fs.mkdirSync(path.dirname(receipt), { recursive: true }); fs.writeFileSync(receipt, JSON.stringify(value, null, 2) + "\n"); } };
  save({ ...selection, result: "pending", executed: [] });
  console.log(`Sélection ${suite} : ${files.length}/${declared.length} à exécuter — ${selection.reason}`);
  for (const item of selection.skipped) console.log(`Non requis pour les styles : ${item.file} — ${item.reason}`);
  const execute = options.execute || spawnSync, rows = [];
  for (const [index, file] of files.entries()) {
    console.log(`::group::${index + 1}/${files.length} — ${family(file)} (${path.basename(file)})`);
    const start = Date.now();
    const command = file.endsWith(".py") ? process.env.PYTHON_BINARY || "python" : process.execPath;
    const env = { ...process.env };
    if (suite === "application") {
      const guard = path.join(directory, "tests/helpers/offline-network.js").replace(/\\/g, "/");
      env.NODE_OPTIONS = [env.NODE_OPTIONS, "--require=" + JSON.stringify(guard)].filter(Boolean).join(" ");
    }
    const result = execute(command, [path.join(directory, file)], {
      cwd: directory, env, encoding: "utf8", timeout: suite === "browser" ? 120000 : undefined, maxBuffer: 8 * 1024 * 1024
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    console.log("::endgroup::");
    if (result.status !== 0 || result.error) {
      save({ ...selection, result: "failure", executed: rows, failedFile: file });
      throw Error(`Échec : ${family(file)} — ${file}${result.error ? " : " + result.error.message : ""}`);
    }
    rows.push({ file, seconds: (Date.now() - start) / 1000 });
  }
  if (selection.mode === "styles" && !impact.unchanged(directory)) {
    save({ ...selection, result: "failure", executed: rows, failure: "tracked-inputs-changed" });
    throw Error("Sources suivies modifiées pendant la suite : preuve sélective refusée");
  }
  save({ ...selection, result: "success", executed: rows });
  const title = { application: "Application", publication: "Circuit de publication", browser: "Parcours navigateur", publicationFallback: "Circuit de publication", mysql: "Intégration MySQL" }[suite];
  const summary = `${title} : ${rows.length} fichiers exécutés et réussis, ${selection.skipped.length} non requis ; ${selection.reason}.\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\n" + summary + rows.toSorted((a, b) => b.seconds - a.seconds).slice(0, 3).map(r => `- ${family(r.file)} : ${r.seconds.toFixed(1)} s (${r.file})`).join("\n") + "\n");
  }
  return rows;
}

module.exports = { inventory, runSuite, family };
if (require.main === module) {
  try { runSuite(process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
