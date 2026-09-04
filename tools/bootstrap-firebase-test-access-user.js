"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const PROJECT_ID = "livepalmes-test";
const CONFIRMATION = "livepalmes-test-access-bootstrap";
const CAPABILITIES = Object.freeze([
  "admin.full", "records.manage", "consoles.manage", "consoles.access",
  "competitions.import", "dtn.view", "engagements.club.manage",
  "engagements.club.switch", "engagements.region.manage", "engagements.national.manage"
]);

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--apply") values.apply = true;
    else if (["--project", "--confirm", "--uid", "--first-name", "--last-name", "--club-id", "--club-name", "--region-id", "--license-number", "--credential"].includes(key)) {
      values[key.slice(2)] = argv[++index] || "";
    } else throw new Error(`Argument inconnu : ${key}`);
  }
  return values;
}

function assertTestTarget(args, env = process.env) {
  if (args.project !== PROJECT_ID || env.TARGET_FIREBASE_PROJECT !== PROJECT_ID) {
    throw new Error(`Cible refusée : --project et TARGET_FIREBASE_PROJECT doivent valoir ${PROJECT_ID}.`);
  }
  for (const variable of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT", "GCP_PROJECT"]) {
    if (env[variable] && env[variable] !== PROJECT_ID) throw new Error(`${variable} ne cible pas ${PROJECT_ID}.`);
  }
  if (args.apply && args.confirm !== CONFIRMATION) {
    throw new Error(`Écriture refusée : utiliser --confirm ${CONFIRMATION}.`);
  }
}

function credentialPath(args, env = process.env) {
  const candidate = args.credential || env.GOOGLE_APPLICATION_CREDENTIALS || "";
  if (!candidate) throw new Error("Credential TEST requis via --credential ou GOOGLE_APPLICATION_CREDENTIALS.");
  const resolved = path.resolve(candidate);
  const credentials = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (credentials.project_id !== PROJECT_ID) throw new Error("Le credential n'appartient pas à livepalmes-test.");
  return resolved;
}

function capabilitiesMap() {
  return Object.fromEntries(CAPABILITIES.map((capability) => [capability, true]));
}

function capabilityMapsEqual(actual, expected = capabilitiesMap()) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

function accessScopes(args) {
  return Object.fromEntries(CAPABILITIES.map((capability) => {
    if (capability === "engagements.club.manage") return [capability, { scopeType: "club", scopeId: args["club-id"] }];
    if (capability === "engagements.region.manage") return [capability, { scopeType: "region", scopeId: args["region-id"] }];
    return [capability, { scopeType: "national", scopeId: "" }];
  }));
}

function accessDirectoryKeys() {
  return ["all", "status:active", ...CAPABILITIES.flatMap((capability) => [
    `capability:${capability}`, `status:active|capability:${capability}`
  ])];
}

function validateProfileArgs(args) {
  for (const key of ["uid", "first-name", "last-name", "club-id", "region-id"]) {
    if (!String(args[key] || "").trim()) throw new Error(`Argument obligatoire manquant : --${key}`);
  }
}

function loadFirebaseAdmin() {
  const functionsRequire = createRequire(path.join(__dirname, "..", "functions", "package.json"));
  const { applicationDefault, initializeApp } = functionsRequire("firebase-admin/app");
  const { getAuth } = functionsRequire("firebase-admin/auth");
  const { getFirestore } = functionsRequire("firebase-admin/firestore");
  return { applicationDefault, initializeApp, getAuth, getFirestore };
}

async function run(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  assertTestTarget(args, env);
  validateProfileArgs(args);
  const keyFile = credentialPath(args, env);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;

  const { applicationDefault, initializeApp, getAuth, getFirestore } = loadFirebaseAdmin();
  const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = await auth.getUser(args.uid);
  if (!user.email) throw new Error("Le compte Auth TEST doit posséder une adresse email.");
  const now = new Date().toISOString();
  const claims = {
    ...(user.customClaims || {}),
    livepalmesAccess: true,
    livepalmesConsoleAccess: true,
    livepalmesCapabilities: capabilitiesMap()
  };
  const profile = {
    uid: user.uid,
    email: user.email || "",
    firstName: args["first-name"].trim(),
    lastName: args["last-name"].trim(),
    clubId: args["club-id"].trim(),
    clubName: String(args["club-name"] || "").trim(),
    regionId: args["region-id"].trim(),
    licenseNumber: String(args["license-number"] || "").trim(),
    status: "active",
    capabilities: capabilitiesMap(),
    accessScopes: accessScopes(args),
    accessDirectoryKeys: accessDirectoryKeys(),
    updatedAt: now,
    updatedBy: `test-bootstrap:${user.uid}`
  };

  if (!args.apply) {
    console.log(JSON.stringify({ mode: "dry-run", projectId: PROJECT_ID, uid: user.uid, capabilities: CAPABILITIES }, null, 2));
    return;
  }

  const previousClaims = user.customClaims || {};
  await auth.setCustomUserClaims(user.uid, claims);
  try {
    const batch = db.batch();
    batch.set(db.collection("users").doc(user.uid), profile, { merge: true });
    for (const capability of CAPABILITIES) {
      const scope = profile.accessScopes[capability];
      batch.set(db.collection("accessGrants").doc(`${user.uid}_${capability.replace(".", "_")}`), {
        uid: user.uid, email: profile.email, capability, scopeType: scope.scopeType,
        scopeId: scope.scopeId, status: "active", updatedAt: now,
        updatedBy: profile.updatedBy, createdAt: now
      }, { merge: true });
    }
    batch.set(db.collection("auditLogs").doc(`test-access-bootstrap_${user.uid}_${Date.now()}`), {
      action: "accessUser.testBootstrap", actorUid: user.uid,
      target: { uid: user.uid, capabilities: CAPABILITIES }, createdAt: now
    });
    await batch.commit();
  } catch (error) {
    await auth.setCustomUserClaims(user.uid, previousClaims);
    throw error;
  }

  const [savedUser, savedProfile] = await Promise.all([auth.getUser(user.uid), db.collection("users").doc(user.uid).get()]);
  if (!savedProfile.exists || !capabilityMapsEqual(savedProfile.data().capabilities) ||
      !capabilityMapsEqual(savedUser.customClaims?.livepalmesCapabilities)) {
    throw new Error("Vérification finale de cohérence refusée.");
  }
  console.log(JSON.stringify({ ok: true, projectId: PROJECT_ID, uid: user.uid, capabilities: CAPABILITIES }, null, 2));
}

module.exports = { CAPABILITIES, CONFIRMATION, PROJECT_ID, accessDirectoryKeys, accessScopes, assertTestTarget, capabilitiesMap, capabilityMapsEqual, loadFirebaseAdmin, parseArgs, validateProfileArgs };

if (require.main === module) run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
