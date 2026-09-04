"use strict";

const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { livePalmesEnvironment } = require("./livepalmes-environment");

const ENVIRONMENT = livePalmesEnvironment();
if (!ENVIRONMENT.isTest || ENVIRONMENT.projectId !== "livepalmes-test") {
  throw new Error("Le bootstrap getCurrentAccessUser est reserve au projet livepalmes-test.");
}

if (!getApps().length) initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const ACCESS_CAPABILITIES = [
  "admin.full",
  "records.manage",
  "consoles.manage",
  "consoles.access",
  "competitions.import",
  "dtn.view",
  "engagements.club.manage",
  "engagements.club.switch",
  "engagements.region.manage",
  "engagements.national.manage"
];

function cleanText(value) {
  return String(value || "").trim();
}

function activeCapabilitiesFromMap(map = {}) {
  return ACCESS_CAPABILITIES.filter((capability) => map?.[capability] === true);
}

function competitionEmailNotificationsEnabled(value = {}) {
  return value?.emailPreferences?.competitionNotifications !== false && value?.competitionNotificationsEnabled !== false;
}

exports.getCurrentAccessUser = onCall({ region: "europe-west1", invoker: "public" }, async (request) => {
  const startedAt = Date.now();
  const uid = cleanText(request.auth?.uid);
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion Firebase requise.");
  }

  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  const authTimeSeconds = Number(request.auth?.token?.auth_time) || 0;
  const lastLoginAt = authTimeSeconds ? new Date(authTimeSeconds * 1000).toISOString() : (data.lastLoginAt || "");

  if (snapshot.exists && lastLoginAt && lastLoginAt !== data.lastLoginAt) {
    await snapshot.ref.set({ lastLoginAt }, { merge: true }).catch((error) => {
      console.warn("Mise a jour de la derniere connexion impossible", error);
    });
  }

  if (!snapshot.exists) {
    throw new HttpsError("permission-denied", "Aucun acces LivePalmes actif.");
  }
  if (data.status !== "active") {
    throw new HttpsError("permission-denied", "Acces LivePalmes desactive.");
  }

  const capabilities = activeCapabilitiesFromMap(data.capabilities || {});
  if (!capabilities.length) {
    throw new HttpsError("permission-denied", "Aucun droit LivePalmes actif.");
  }

  return {
    ok: true,
    uid,
    email: data.email || request.auth?.token?.email || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    clubId: data.clubId || "",
    clubName: data.clubName || "",
    regionId: data.regionId || "",
    licenseNumber: data.licenseNumber || "",
    status: "active",
    capabilities,
    accessScopes: data.accessScopes || {},
    competitionNotificationsEnabled: competitionEmailNotificationsEnabled(data),
    lastLoginAt,
    readStats: {
      operation: "getCurrentAccessUser",
      durationMs: Date.now() - startedAt,
      baseDocuments: 1,
      cacheHit: false
    }
  };
});
