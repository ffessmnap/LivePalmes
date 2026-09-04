"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const {
  COPY, DESTINATION_PROJECT, EXCLUDE, PRESERVE_TEST, REBUILD,
  REFERENCE_REPLACEMENTS, SOURCE_PROJECT
} = require("./firebase-test-data-sync-manifest");

const METRICS = Object.freeze({
  clubs: { root: "engagementClubs" },
  swimmers: { root: "engagementClubSwimmers" },
  performances: { root: "performances" },
  competitions: { root: "engagementCompetitions" },
  results: { group: "results" },
  "officials/people": { root: "engagementClubPeople" },
  "records/MPF": { path: ["competitions", "livepalmes-active", "performanceData", "records"] }
});

function parseArgs(argv) {
  const out = { pageSize: 300 };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (["--source-credential", "--destination-credential", "--page-size"].includes(key)) out[key.slice(2)] = argv[++i] || "";
    else throw new Error(`Argument inconnu : ${key}`);
  }
  out.pageSize = Number(out["page-size"] || out.pageSize);
  return out;
}

function credential(file, project) {
  const value = JSON.parse(fs.readFileSync(path.resolve(file || ""), "utf8"));
  if (value.project_id !== project) throw new Error(`Credential invalide pour ${project}.`);
  return value;
}

function loadFirebaseAdmin() {
  const functionsRequire = createRequire(path.join(__dirname, "..", "functions", "package.json"));
  const { cert, initializeApp } = functionsRequire("firebase-admin/app");
  const { FieldPath, getFirestore } = functionsRequire("firebase-admin/firestore");
  return { cert, initializeApp, FieldPath, getFirestore };
}

async function metricCount(db, spec) {
  if (spec.root) return (await db.collection(spec.root).count().get()).data().count;
  if (spec.group) return (await db.collectionGroup(spec.group).count().get()).data().count;
  return (await db.collection(spec.path[0]).doc(spec.path[1]).collection(spec.path[2]).doc(spec.path[3]).get()).exists ? 1 : 0;
}

async function findForbiddenReferences(db, pageSize, FieldPath) {
  const forbidden = REFERENCE_REPLACEMENTS.map(([source]) => source);
  const findings = [];
  const collectionIds = [...new Set([...COPY, "results", "liveData", "history", "performanceData"] )];
  for (const collection of collectionIds) {
    let cursorSnapshot;
    do {
      let query = db.collectionGroup(collection).orderBy(FieldPath.documentId()).limit(pageSize);
      if (cursorSnapshot) query = query.startAfter(cursorSnapshot);
      const snapshot = await query.get();
      for (const doc of snapshot.docs) {
        const serialized = JSON.stringify(doc.data(), (key, value) => {
          if (value?.constructor?.name === "DocumentReference") {
            return `projects/${value.firestore?.projectId || "unknown"}/documents/${value.path}`;
          }
          return value;
        });
        const matches = forbidden.filter((value) => serialized.includes(value));
        if (matches.length) findings.push({ path: doc.ref.path, references: matches });
      }
      cursorSnapshot = snapshot.docs.at(-1);
      if (snapshot.size < pageSize) break;
    } while (true);
  }
  return findings;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const { cert, initializeApp, FieldPath, getFirestore } = loadFirebaseAdmin();
  const sourceApp = initializeApp({ credential: cert(credential(args["source-credential"], SOURCE_PROJECT)), projectId: SOURCE_PROJECT }, "verify-prod-readonly");
  const destinationApp = initializeApp({ credential: cert(credential(args["destination-credential"], DESTINATION_PROJECT)), projectId: DESTINATION_PROJECT }, "verify-test-readonly");
  const sourceDb = getFirestore(sourceApp);
  const destinationDb = getFirestore(destinationApp);
  const counts = {};
  for (const [name, spec] of Object.entries(METRICS)) {
    const [source, destination] = await Promise.all([metricCount(sourceDb, spec), metricCount(destinationDb, spec)]);
    counts[name] = { source, destination, difference: destination - source };
  }
  const residualReferences = await findForbiddenReferences(destinationDb, args.pageSize, FieldPath);
  const adminSnapshot = await destinationDb.collection("users").where("capabilities.admin.full", "==", true).get();
  const protectedAdminUids = adminSnapshot.docs.filter((doc) => doc.data().status === "active").map((doc) => doc.id);
  console.log(JSON.stringify({
    projects: { source: SOURCE_PROJECT, destination: DESTINATION_PROJECT }, counts,
    intentionallyDifferent: { excluded: EXCLUDE, preservedInTest: PRESERVE_TEST, rebuiltInTest: REBUILD },
    protectedAdminUids, residualReferences
  }, null, 2));
  if (residualReferences.length) process.exitCode = 2;
}

module.exports = { METRICS, findForbiddenReferences, loadFirebaseAdmin, parseArgs };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
