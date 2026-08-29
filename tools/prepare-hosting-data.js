const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");

function printHelp() {
  console.log(`
Utilisation :
  node tools/prepare-hosting-data.js --write

Prépare explicitement les données statiques avant une publication Hosting complète :
  - synchronisation du secours Records / MPF depuis Firestore ;
  - régénération du référentiel clubs du portail et des Functions.

Cette commande lit Firebase de production et écrit des fichiers générés.
L'option --write est obligatoire.
`);
}

function run(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(rootDir, script), ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Échec de ${script} (code ${result.status ?? "inconnu"}).`);
  }
}

function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }
  if (!process.argv.includes("--write")) {
    printHelp();
    throw new Error("Confirmation explicite requise : ajoutez --write.");
  }
  run("tools/sync-records-from-firestore.js", ["--write"]);
  run("tools/build-admin-club-reference.js");
  console.log("Données Hosting préparées. Contrôlez les fichiers générés avant le déploiement.");
}

try {
  main();
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
}
