const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { exportSource, csvLine } = require("../tools/export-nap-public-source");
const { buildNapPublicFiles } = require("../tools/build-nap-public-files");
const { publicationPlan } = require("../tools/publish-nap-public-test");

(async () => {
  const parent = path.resolve(__dirname, "../outputs");
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, "nap-pipeline-test-"));
  try {
    assert.equal(csvLine(["nom", "date"], { nom: 'Nom, "test"', date: null }), '"Nom, ""test""",""\n');
    const data = {
      nageurs: [{ id: 1, nom: "TEST", prenom: "Paul", date: "2000-01-01", sexe: "M", club: 10 }],
      clubs: [{ num_club: 10, abre_club: "TEST", nom_club: "Club Test", federal_club: "001", comite_club: 3 }],
      competitions: [
        { id: 83, libelle: "Bassin connu", lieu: "Ville", date: "2025-05-01", enddate: "2025-05-01", bassin: 50, chrono: "E", ld: 0 },
        { id: 84, libelle: "Longueur inconnue", lieu: "Ville", date: "2025-05-02", enddate: "2025-05-02", bassin: 0, chrono: "M", ld: 0 },
        { id: 85, libelle: "Eau libre", lieu: "Ville", date: "2025-05-03", enddate: "2025-05-03", bassin: 25, chrono: "M", ld: 1 }
      ],
      perfs: [0, 1, 2].map(id => ({ id, nageur: 1, compet: 83 + id, course: "50SF", cat: "HSE", tps: "002000", club: 10, passage: 0, relais: 0, pid: 0, classement: 1 }))
    };
    const bounds = { nageurs: 1, clubs: 10, competitions: 85, perfs: 2 };
    const request = async ({ table, after, through }) => ({ source: "nap", table, through, items: data[table], hasMore: false, next: bounds[table] });
    const source = path.join(temporary, "export");
    const first = await exportSource({ request, directory: path.join(source, "source"), bounds });
    const second = await exportSource({ request, directory: path.join(source, "verification"), bounds });
    assert.deepEqual(first, second);
    fs.writeFileSync(path.join(source, "export-proof.json"), JSON.stringify({ source: "nap", project: "livepalmes-test", consistency: "two-identical-paginated-reads", tables: first }));
    const output = path.join(temporary, "build");
    const built = buildNapPublicFiles(source, output);
    assert.equal(built.rowCount, 2);
    const rows = fs.readFileSync(built.seed, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(rows.find(row => String(row.id) === "0").pool, "50");
    assert.equal(rows.find(row => String(row.id) === "1").pool, "");
    assert.equal(rows.some(row => String(row.id) === "2"), false);
    const manifest = JSON.parse(fs.readFileSync(path.join(built.publicDirectory, "manifest.json"), "utf8"));
    assert.equal(manifest.source, "nap");
    assert.equal(publicationPlan(built.publicDirectory).prefix, "performance-public-nap/versions/20261006-v1");
    fs.writeFileSync(path.join(built.publicDirectory, "licences.csv"), "private");
    assert.throws(() => publicationPlan(built.publicDirectory), /hors publication/);
    fs.unlinkSync(path.join(built.publicDirectory, "licences.csv"));
    const swimmerIndex = JSON.parse(fs.readFileSync(path.join(built.publicDirectory, "ids/01.json"), "utf8"));
    assert.equal(swimmerIndex["1"].firstName, "Paul");
    fs.appendFileSync(path.join(source, "source/perfs_nap.csv"), "modified");
    assert.throws(() => buildNapPublicFiles(source, path.join(temporary, "changed")), /differente/);
    console.log("Pipeline NAP : fichiers existants compatibles, id zero, bassin inconnu conserve, eau libre exclue et export modifie refuse.");
  } finally {
    if (!temporary.startsWith(parent + path.sep)) throw new Error("Nettoyage hors dossier de test refuse.");
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
