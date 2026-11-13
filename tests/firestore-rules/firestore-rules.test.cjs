const { before, after, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require("@firebase/rules-unit-testing");
const {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  disableNetwork,
  enableNetwork,
  setDoc,
  updateDoc
} = require("firebase/firestore");

const PROJECT_ID = "demo-livepalmes";
const COMPETITION_ID = "livepalmes-active";
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const RULES = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");

let testEnv;

function consoleClaims(role, competitionId = COMPETITION_ID) {
  return {
    livepalmesAccess: true,
    livepalmesConsoleAccess: true,
    livepalmesCapabilities: { "consoles.access": true },
    livepalmesRole: role,
    livepalmesCompetition: competitionId,
    livepalmesConsole: true
  };
}

function roleDb(role, claims = consoleClaims(role), uid = `${role}-uid`) {
  return testEnv.authenticatedContext(uid, claims).firestore();
}

function adminDb(uid = "capability-admin") {
  return testEnv.authenticatedContext(uid, {
    livepalmesAccess: true,
    livepalmesCapabilities: { "admin.full": true }
  }).firestore();
}

function competitionDoc(db, collectionName, id) {
  return doc(db, "competitions", COMPETITION_ID, collectionName, id);
}

function validResult(overrides = {}) {
  return {
    id: "result-1",
    raceKey: "event-1|F",
    programKey: "program-1",
    eventId: "event-1",
    eventLabel: "100 m surface",
    sex: "F",
    sexLabel: "Dames",
    stage: "series",
    phaseLabel: "Séries",
    finalStageCount: 1,
    session: "1",
    startTime: "10:00",
    hasFinal: true,
    finalists: {
      a: [
        { rank: 1, firstName: "Alice", lastName: "MARTIN", club: "CLUB A", time: "40.00" },
        { rank: 2, firstName: "Zoé", lastName: "DURAND", club: "CLUB B", time: "41.00", repechaged: true }
      ],
      b: []
    },
    nextUnqualified: [],
    ranking: [{ rank: 1, firstName: "Alice", lastName: "MARTIN", time: "40.00" }],
    performances: [],
    pdfName: "resultat.pdf",
    pdfSize: 1234,
    createdAt: "2026-07-27T09:00:00.000Z",
    updatedAt: "2026-07-27T09:00:00.000Z",
    isPartial: false,
    status: "finalists_pending_speaker",
    ...overrides
  };
}

function validPublicIndex(id, overrides = {}) {
  return {
    id,
    meet: {},
    events: [],
    program: [],
    entrants: [],
    series: [],
    results: [],
    records: [],
    qualifications: [],
    seriesPdfs: [],
    sessionResultsPdfs: [],
    sessionInfos: {},
    publicAccess: { online: true },
    updatedAt: "2026-07-27T09:00:00.000Z",
    sourceVersion: "test-v1",
    sourceLabel: "Tests",
    lastUpdatedSession: "1",
    ...overrides
  };
}

function validPublicArchivesIndex(overrides = {}) {
  return {
    id: "archivesIndex",
    archives: [{
      id: "archive-1",
      createdAt: "2026-07-27T09:00:00.000Z",
      publicArchive: true,
      meet: {},
      count: 12,
      raceCount: 3,
      extras: []
    }],
    updatedAt: "2026-07-27T09:00:00.000Z",
    ...overrides
  };
}

function validAlert(overrides = {}) {
  return {
    id: "alert-1",
    competitionId: "local",
    roleSource: "referee",
    eventId: "event-1",
    sex: "F",
    session: "1",
    series: "1",
    stage: "series",
    line: "4",
    swimmerId: "swimmer-1",
    displayName: "Alice MARTIN",
    club: "CLUB A",
    clubCode: "CLA",
    type: "false_start",
    comment: "",
    relayLeg: "",
    lengthType: "",
    lengthNumber: "",
    requiresVideo: true,
    videoStatus: "pending",
    speakerStatus: "none",
    secretaryStatus: "none",
    informaticsStatus: "none",
    createdAt: "2026-07-27T09:00:00.000Z",
    updatedAt: "2026-07-27T09:00:00.000Z",
    active: true,
    ...overrides
  };
}

async function seedGrant(db, role, options = {}) {
  const uid = options.uid || `${role}-uid`;
  const expiresAt = options.expiresAt || Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
  await setDoc(competitionDoc(db, "consoleGrants", uid), {
    uid,
    role: options.grantRole || role,
    competitionId: options.competitionId || COMPETITION_ID,
    expiresAt
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES }
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const role of ROLES) await seedGrant(db, role);
    await setDoc(competitionDoc(db, "results", "result-1"), validResult());
    await setDoc(competitionDoc(db, "public", "resultsIndex"), validPublicIndex("resultsIndex"));
    await setDoc(competitionDoc(db, "public", "seriesIndex"), validPublicIndex("seriesIndex"));
    await setDoc(competitionDoc(db, "alerts", "alert-1"), validAlert());
    await setDoc(competitionDoc(db, "liveData", "current"), {
      data: {
        meet: {}, events: [], entrants: [], series: [], program: [], qualifications: [],
        top2025: [], records: [], edfMembers: [], internationalMedals: [],
        competitionStats: [], swimmerInfos: [], sourceVersion: "v1", notes: {}
      },
      updatedAt: "2026-07-27T09:00:00.000Z",
      source: "Tests"
    });
    await setDoc(doc(db, "accessDirectorySnapshots", "national"), {
      scopeType: "national", scopeId: "", status: "ready", version: 1, entries: {}
    });
    await setDoc(doc(db, "accessDirectorySnapshots", "region:IDF"), {
      scopeType: "region", scopeId: "IDF", status: "ready", version: 1, entries: {}
    });
    await setDoc(doc(db, "accessDirectorySnapshots", "region:HDF"), {
      scopeType: "region", scopeId: "HDF", status: "ready", version: 1, entries: {}
    });
    await setDoc(doc(db, "users", "region-idf"), {
      status: "active",
      regionId: "IDF",
      accessScopes: { "engagements.region.manage": { scopeType: "region", scopeId: "IDF" } }
    });
    await setDoc(doc(db, "users", "national-manager"), {
      status: "active"
    });
    await setDoc(doc(db, "users", "region-without-scope"), {
      status: "active",
      regionId: "IDF"
    });
  });
});

test("public non authentifié : lecture publique autorisée, modification des résultats refusée", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(competitionDoc(db, "public", "resultsIndex")));
  await assertFails(updateDoc(competitionDoc(db, "results", "result-1"), { status: "published" }));
});

test("claim et grant : grant absent, expiré, de rôle différent ou de compétition différente refusé", async () => {
  await assertFails(getDoc(competitionDoc(roleDb("speaker", consoleClaims("speaker"), "no-grant"), "results", "result-1")));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await seedGrant(db, "speaker", { uid: "expired", expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    await seedGrant(db, "speaker", { uid: "wrong-role", grantRole: "video" });
    await seedGrant(db, "speaker", { uid: "wrong-competition", competitionId: "livepalmes-test" });
  });

  await assertFails(getDoc(competitionDoc(roleDb("speaker", consoleClaims("speaker"), "expired"), "results", "result-1")));
  await assertFails(getDoc(competitionDoc(roleDb("speaker", consoleClaims("speaker"), "wrong-role"), "results", "result-1")));
  await assertFails(getDoc(competitionDoc(roleDb("speaker", consoleClaims("speaker"), "wrong-competition"), "results", "result-1")));
  await assertFails(getDoc(competitionDoc(roleDb("speaker", consoleClaims("video"), "speaker-uid"), "results", "result-1")));
});

test("speaker : seules les métadonnées d'annonce initiale sont modifiables", async () => {
  const ref = competitionDoc(roleDb("speaker"), "results", "result-1");
  await assertSucceeds(updateDoc(ref, {
    finalistsAnnouncedAt: "2026-07-27T09:05:00.000Z",
    status: "published",
    updatedAt: "2026-07-27T09:05:00.000Z"
  }));
  await assertFails(updateDoc(ref, {
    ranking: [{ rank: 1, firstName: "Mallory", time: "39.00" }],
    updatedAt: "2026-07-27T09:06:00.000Z"
  }));
  await assertFails(updateDoc(ref, { status: "cancelled", updatedAt: "2026-07-27T09:06:00.000Z" }));
});

test("speaker : ajoute uniquement repechageAnnouncedAt à une finaliste déjà repêchée", async () => {
  const ref = competitionDoc(roleDb("speaker"), "results", "result-1");
  const allowed = validResult();
  allowed.finalists.a[1] = { ...allowed.finalists.a[1], repechageAnnouncedAt: "2026-07-27T09:10:00.000Z" };
  allowed.updatedAt = "2026-07-27T09:10:00.000Z";
  await assertSucceeds(setDoc(ref, allowed));
});

test("annuaire privé : lecture directe strictement limitée au périmètre d'habilitation", async () => {
  const anonymous = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, "accessDirectorySnapshots", "national")));

  const admin = adminDb();
  await assertSucceeds(getDoc(doc(admin, "accessDirectorySnapshots", "national")));
  await assertSucceeds(getDoc(doc(admin, "accessDirectorySnapshots", "region:IDF")));
  await assertFails(setDoc(doc(admin, "accessDirectorySnapshots", "national"), {
    scopeType: "national", scopeId: "", status: "ready", version: 1, entries: {}
  }));

  const national = testEnv.authenticatedContext("national-manager", {
    livepalmesAccess: true,
    livepalmesCapabilities: { "engagements.national.manage": true }
  }).firestore();
  await assertSucceeds(getDoc(doc(national, "accessDirectorySnapshots", "national")));
  await assertFails(getDoc(doc(national, "accessDirectorySnapshots", "region:IDF")));

  const regional = testEnv.authenticatedContext("region-idf", {
    livepalmesAccess: true,
    livepalmesCapabilities: { "engagements.region.manage": true }
  }).firestore();
  await assertSucceeds(getDoc(doc(regional, "accessDirectorySnapshots", "region:IDF")));
  await assertFails(getDoc(doc(regional, "accessDirectorySnapshots", "region:HDF")));
  await assertFails(getDoc(doc(regional, "accessDirectorySnapshots", "national")));

  const regionalWithoutScope = testEnv.authenticatedContext("region-without-scope", {
    livepalmesAccess: true,
    livepalmesCapabilities: { "engagements.region.manage": true }
  }).firestore();
  await assertFails(getDoc(doc(regionalWithoutScope, "accessDirectorySnapshots", "region:IDF")));
});

test("session portail TEST : annuaire direct et registre technique interdits aux clients", async () => {
  const client = testEnv.authenticatedContext("national-manager", {
    aud:"livepalmes-test", livepalmesAccess:true,
    livepalmesCapabilities:{"engagements.national.manage":true,"admin.full":true}
  }).firestore();
  await assertFails(getDoc(doc(client,"accessDirectorySnapshots","national")));
  await assertFails(getDoc(doc(client,"portalSessions","fixture")));
  await assertFails(setDoc(doc(client,"portalSessions","fixture"),{lastActivityAt:Date.now()}));
});

test("index public des archives : lecture publique et ecriture computer uniquement", async () => {
  const publicRef = competitionDoc(testEnv.unauthenticatedContext().firestore(), "public", "archivesIndex");
  await assertSucceeds(getDoc(publicRef));
  await assertSucceeds(setDoc(
    competitionDoc(roleDb("computer"), "public", "archivesIndex"),
    validPublicArchivesIndex()
  ));
  await assertFails(setDoc(
    competitionDoc(roleDb("speaker"), "public", "archivesIndex"),
    validPublicArchivesIndex()
  ));
  await assertFails(setDoc(
    competitionDoc(roleDb("computer"), "public", "archivesIndex"),
    validPublicArchivesIndex({ archives: Array.from({ length: 51 }, (_, index) => ({ id: `archive-${index}` })) })
  ));
});

test("console : claim et grant de rôle restent refusés sans accès portail", async () => {
  const claimsWithoutPortal = {
    livepalmesRole: "speaker",
    livepalmesCompetition: COMPETITION_ID,
    livepalmesConsole: true
  };
  await assertFails(getDoc(competitionDoc(
    roleDb("speaker", claimsWithoutPortal, "speaker-uid"),
    "results",
    "result-1"
  )));
});

test("speaker : ajout d'une finaliste pendant l'annonce refusé", async () => {
  const ref = competitionDoc(roleDb("speaker"), "results", "result-1");
  const added = validResult();
  added.finalists.a.push({
    rank: 3,
    firstName: "Eva",
    lastName: "BERNARD",
    club: "CLUB C",
    time: "42.00",
    repechaged: true,
    repechageAnnouncedAt: "2026-07-27T09:11:00.000Z"
  });
  added.updatedAt = "2026-07-27T09:11:00.000Z";
  await assertFails(setDoc(ref, added));
});

test("speaker : suppression d'une finaliste pendant l'annonce refusée", async () => {
  const ref = competitionDoc(roleDb("speaker"), "results", "result-1");
  const removed = validResult();
  removed.finalists.a.pop();
  removed.updatedAt = "2026-07-27T09:12:00.000Z";
  await assertFails(setDoc(ref, removed));
});

test("speaker : remplacement d'une finaliste pendant l'annonce refusé", async () => {
  const ref = competitionDoc(roleDb("speaker"), "results", "result-1");
  const replaced = validResult();
  replaced.finalists.a[1] = {
    rank: 2,
    firstName: "Mallory",
    lastName: "ATTAQUANTE",
    club: "CLUB X",
    time: "38.00",
    repechaged: true,
    repechageAnnouncedAt: "2026-07-27T09:13:00.000Z"
  };
  replaced.updatedAt = "2026-07-27T09:13:00.000Z";
  await assertFails(setDoc(ref, replaced));
});

test("speaker : PDF, archives, séries et index hors republication sont refusés", async () => {
  const db = roleDb("speaker");
  await assertFails(setDoc(competitionDoc(db, "resultPdfs", "result-1"), {
    id: "result-1", resultId: "result-1", pdfName: "r.pdf", pdfSize: 10,
    pdfDataUrl: "data:application/pdf;base64,AA==", updatedAt: "2026-07-27T09:10:00.000Z"
  }));
  await assertFails(setDoc(competitionDoc(db, "seriesPdfs", "series-1"), {
    id: "series-1", scope: "session", session: "1", pdfName: "s.pdf",
    pdfDataUrl: "data:application/pdf;base64,AA==", updatedAt: "2026-07-27T09:10:00.000Z"
  }));
  await assertFails(setDoc(competitionDoc(db, "resultArchives", "archive-1"), {
    id: "archive-1", createdAt: "2026-07-27T09:10:00.000Z", meet: {}, count: 0
  }));
  await assertFails(updateDoc(competitionDoc(db, "public", "resultsIndex"), {
    events: [{ id: "forbidden" }], updatedAt: "2026-07-27T09:10:00.000Z"
  }));
  await assertFails(updateDoc(competitionDoc(db, "public", "resultsIndex"), {
    results: [validResult({ finalistsAnnouncedAt: "2026-07-27T09:05:00.000Z", status: "published" })],
    updatedAt: "2026-07-27T09:10:00.000Z"
  }));
});

test("speaker : mise à jour des seules données de support speaker et republication séries autorisées", async () => {
  const db = roleDb("speaker");
  await assertSucceeds(setDoc(competitionDoc(db, "liveData", "current"), {
    data: {
      meet: {}, events: [], entrants: [{ id: "swimmer-1", speakerInfo: "Championne" }],
      series: [], program: [], qualifications: [], top2025: [], records: [],
      edfMembers: [], internationalMedals: [], competitionStats: [], swimmerInfos: [],
      sourceVersion: "speaker-info-v2",
      notes: {
        speakerInfoSource: "Google Sheets",
        speakerInfoUpdatedAt: "27/07/2026 11:00:00",
        livePublishedAt: "2026-07-27T09:10:00.000Z",
        liveSource: "Infos speaker Google Sheets"
      }
    },
    updatedAt: "2026-07-27T09:10:00.000Z",
    source: "Infos speaker Google Sheets"
  }));
  await assertSucceeds(updateDoc(competitionDoc(db, "public", "seriesIndex"), {
    entrants: [{ id: "swimmer-1", speakerInfo: "Championne" }],
    records: [],
    qualifications: [],
    updatedAt: "2026-07-27T09:10:00.000Z"
  }));
});

test("referee : décisions et progression autorisées, résultat sportif refusé", async () => {
  const db = roleDb("referee");
  await assertSucceeds(setDoc(competitionDoc(db, "alerts", "alert-referee"), validAlert({ id: "alert-referee" })));
  await assertSucceeds(updateDoc(competitionDoc(db, "alerts", "alert-1"), {
    cancelledAt: "2026-07-27T09:15:00.000Z",
    cancelledBy: "referee",
    updatedAt: "2026-07-27T09:15:00.000Z",
    active: false
  }));
  const liveData = {
    meet: {}, events: [], entrants: [], series: [], program: [], qualifications: [],
    top2025: [], records: [], edfMembers: [], internationalMedals: [],
    competitionStats: [], swimmerInfos: [], sourceVersion: "v2",
    notes: { refereeProgress: { eventId: "event-1" }, livePublishedAt: "2026-07-27T09:15:00.000Z", liveSource: "JA" }
  };
  await assertSucceeds(setDoc(competitionDoc(db, "liveData", "current"), {
    data: liveData, updatedAt: "2026-07-27T09:15:00.000Z", source: "JA"
  }));
  await assertFails(updateDoc(competitionDoc(db, "results", "result-1"), { ranking: [], updatedAt: "2026-07-27T09:15:00.000Z" }));
});

test("video : validation vidéo et annulation délégué autorisées, résultats refusés", async () => {
  const db = roleDb("video");
  await assertSucceeds(updateDoc(competitionDoc(db, "alerts", "alert-1"), {
    videoStatus: "confirmed",
    videoConfirmedAt: "2026-07-27T09:20:00.000Z",
    speakerStatus: "pending",
    informaticsStatus: "pending",
    updatedAt: "2026-07-27T09:20:00.000Z",
    active: true
  }));
  await assertSucceeds(setDoc(competitionDoc(db, "alerts", "delegate-alert"), validAlert({
    id: "delegate-alert", type: "requalification", roleSource: "delegate",
    originalAlertId: "alert-1", requiresVideo: false, videoStatus: "none",
    speakerStatus: "pending", informaticsStatus: "pending"
  })));
  await assertSucceeds(updateDoc(competitionDoc(db, "alerts", "alert-1"), {
    cancelledAt: "2026-07-27T09:21:00.000Z",
    cancelledBy: "delegate",
    speakerStatus: "pending",
    informaticsStatus: "pending",
    secretaryStatus: "none",
    updatedAt: "2026-07-27T09:21:00.000Z",
    active: true
  }));
  await assertFails(updateDoc(competitionDoc(db, "results", "result-1"), { status: "published", updatedAt: "2026-07-27T09:20:00.000Z" }));
});

test("secretary : gestion des forfaits/finalistes autorisée, chrono et PDF refusés", async () => {
  const db = roleDb("secretary");
  await assertSucceeds(updateDoc(competitionDoc(db, "results", "result-1"), {
    finalWithdrawals: [{ rowKey: "a-1", withdrawnAt: "2026-07-27T09:25:00.000Z" }],
    updatedAt: "2026-07-27T09:25:00.000Z"
  }));
  await assertFails(updateDoc(competitionDoc(db, "results", "result-1"), {
    ranking: [{ rank: 1, time: "35.00" }], updatedAt: "2026-07-27T09:25:00.000Z"
  }));
  await assertFails(setDoc(competitionDoc(db, "resultPdfs", "secretary-pdf"), { id: "secretary-pdf" }));
  await assertFails(updateDoc(competitionDoc(db, "public", "resultsIndex"), {
    results: [validResult({ status: "published" })],
    updatedAt: "2026-07-27T09:25:00.000Z"
  }));
});

test("présences et verrous : chaque console écrit son propre rôle, jamais celui d'une autre", async () => {
  for (const role of ROLES) {
    const db = roleDb(role);
    const presenceId = `${role}-presence`;
    await assertSucceeds(setDoc(competitionDoc(db, "presence", presenceId), {
      id: presenceId,
      clientId: `${role}-client`,
      role,
      page: "console",
      updatedAt: "2026-07-27T09:28:00.000Z",
      expiresAt: "2026-07-27T09:29:00.000Z"
    }));
    const lock = role === "live"
      ? {
          role,
          clients: { [`${role}-client`]: { updatedAt: "2026-07-27T09:28:00.000Z" } },
          roleLabel: role,
          updatedAt: "2026-07-27T09:28:00.000Z",
          expiresAt: "2026-07-27T09:29:00.000Z"
        }
      : {
          role,
          clientId: `${role}-client`,
          roleLabel: role,
          createdAt: "2026-07-27T09:28:00.000Z",
          updatedAt: "2026-07-27T09:28:00.000Z",
          expiresAt: "2026-07-27T09:29:00.000Z"
        };
    await assertSucceeds(setDoc(competitionDoc(db, "roleLocks", role), lock));
  }

  const speaker = roleDb("speaker");
  await assertFails(setDoc(competitionDoc(speaker, "presence", "cross-role-presence"), {
    id: "cross-role-presence", clientId: "speaker-client", role: "video", page: "console",
    updatedAt: "2026-07-27T09:28:00.000Z", expiresAt: "2026-07-27T09:29:00.000Z"
  }));
  await assertFails(deleteDoc(competitionDoc(speaker, "presence", "video-presence")));
  await assertFails(setDoc(competitionDoc(speaker, "roleLocks", "video"), {
    role: "video", clientId: "speaker-client", roleLabel: "video",
    createdAt: "2026-07-27T09:28:00.000Z", updatedAt: "2026-07-27T09:28:00.000Z",
    expiresAt: "2026-07-27T09:29:00.000Z"
  }));
});

test("écritures croisées : live, speaker, referee, video et secretary ne prennent pas les droits computer", async () => {
  for (const role of ["live", "speaker", "referee", "video", "secretary"]) {
    await assertFails(setDoc(competitionDoc(roleDb(role), "seriesPdfs", `pdf-${role}`), {
      id: `pdf-${role}`,
      scope: "session",
      session: "1",
      pdfName: "series.pdf",
      pdfDataUrl: "data:application/pdf;base64,AA==",
      updatedAt: "2026-07-27T09:30:00.000Z"
    }));
  }
});

test("computer : publication séries/résultats/PDF et suppression opérationnelle autorisées", async () => {
  const db = roleDb("computer");
  await assertSucceeds(setDoc(competitionDoc(db, "results", "result-2"), validResult({ id: "result-2" })));
  await assertSucceeds(setDoc(competitionDoc(db, "seriesPdfs", "series-1"), {
    id: "series-1", scope: "session", session: "1", pdfName: "series.pdf",
    pdfDataUrl: "data:application/pdf;base64,AA==", updatedAt: "2026-07-27T09:30:00.000Z"
  }));
  await assertSucceeds(setDoc(competitionDoc(db, "seriesPdfs", "series-storage"), {
    id: "series-storage", scope: "session", session: "1", pdfName: "series.pdf",
    pdfUrl: "https://storage.googleapis.com/livepalmes-public-data-718081132564/competition-pdfs/livepalmes-active/series/series-storage.pdf",
    storagePath: "competition-pdfs/livepalmes-active/series/series-storage.pdf",
    updatedAt: "2026-07-27T09:30:00.000Z"
  }));
  await assertSucceeds(setDoc(competitionDoc(db, "sessionResultsPdfs", "protocol"), {
    id: "protocol", scope: "protocol", sessions: [], pdfName: "protocol.pdf",
    pdfDataUrl: "data:application/pdf;base64,AA==", updatedAt: "2026-07-27T09:30:00.000Z",
    documentType: "protocol"
  }));
  await assertSucceeds(updateDoc(competitionDoc(db, "public", "resultsIndex"), {
    results: [validResult()], updatedAt: "2026-07-27T09:30:00.000Z"
  }));
  await assertSucceeds(setDoc(competitionDoc(db, "resultArchives", "archive-v2"), {
    id: "archive-v2",
    archiveVersion: 2,
    createdAt: "2026-07-27T09:30:00.000Z",
    createdLabel: "27/07/2026 11:30:00",
    reason: "Test émulateur",
    publicArchive: true,
    meet: {},
    count: 1,
    raceCount: 1,
    extras: ["medals"],
    archiveIndex: {},
    publicIndex: {}
  }));
  await assertSucceeds(setDoc(doc(db, "competitions", COMPETITION_ID, "resultArchives", "archive-v2", "races", "event-1-F"), {
    id: "event-1-F",
    raceKey: "event-1|F",
    eventId: "event-1",
    sex: "F",
    label: "100 m surface",
    session: "1",
    order: 1,
    resultCount: 1,
    latestUpdatedAt: "2026-07-27T09:30:00.000Z",
    programRows: [],
    seriesRows: [],
    results: [validResult()]
  }));
  await assertSucceeds(setDoc(doc(db, "competitions", COMPETITION_ID, "resultArchives", "archive-v2", "extras", "medals"), {
    id: "medals", title: "Tableau des médailles", count: 1, rows: []
  }));
  await assertSucceeds(deleteDoc(competitionDoc(db, "results", "result-1")));
});

test("structures invalides et champs inattendus : refusés même au computer", async () => {
  const db = roleDb("computer");
  await assertFails(setDoc(competitionDoc(db, "results", "invalid-result"), validResult({
    id: "invalid-result", unexpectedAdminFlag: true
  })));
  await assertFails(setDoc(competitionDoc(db, "seriesPdfs", "invalid-pdf"), {
    id: "invalid-pdf", scope: "session", session: "1", pdfName: "series.pdf",
    pdfDataUrl: "data:application/pdf;base64,AA==", updatedAt: "2026-07-27T09:30:00.000Z",
    unexpectedField: "forbidden"
  }));
  await assertFails(setDoc(competitionDoc(db, "seriesPdfs", "missing-pdf-source"), {
    id: "missing-pdf-source", scope: "session", session: "1", pdfName: "series.pdf",
    updatedAt: "2026-07-27T09:30:00.000Z"
  }));
  await assertFails(setDoc(competitionDoc(db, "public", "resultsIndex"), {
    ...validPublicIndex("resultsIndex"), results: "not-a-list"
  }));
});

test("suppressions : tous les rôles non-computer sont refusés et l'index actif reste non supprimable", async () => {
  for (const role of ["live", "speaker", "referee", "video", "secretary"]) {
    await assertFails(deleteDoc(competitionDoc(roleDb(role), "results", "result-1")));
  }
  await assertFails(deleteDoc(competitionDoc(roleDb("computer"), "public", "resultsIndex")));
});

test("admin.full et UID historique : opérations administratives autorisées sans grant console", async () => {
  await assertSucceeds(setDoc(competitionDoc(adminDb(), "testMode", "state"), {
    enabled: true, startedAt: "2026-07-27T09:35:00.000Z", updatedAt: "2026-07-27T09:35:00.000Z"
  }));
  await assertSucceeds(setDoc(competitionDoc(adminDb(), "secrets", "test-secret"), { enabled: true }));

  const productionLegacy = testEnv.authenticatedContext("AgvWJjvLOfe3uB0lz0Xr3wwJxzT2", { aud: "livepalmes" }).firestore();
  await assertSucceeds(setDoc(competitionDoc(productionLegacy, "secrets", "legacy-secret"), { enabled: true }));

  const testLegacy = testEnv.authenticatedContext("AgvWJjvLOfe3uB0lz0Xr3wwJxzT2", { aud: "livepalmes-test" }).firestore();
  await assertFails(setDoc(competitionDoc(testLegacy, "secrets", "test-legacy-secret"), { enabled: true }));
});

test("garde-fou statique : les doubles allow permissifs audités ne réapparaissent pas", () => {
  const permissiveDuplicate = /allow create, update:[^;]+canWriteComputer\(competitionId\);\s*allow create, update:/s;
  assert.doesNotMatch(RULES, permissiveDuplicate);
  assert.doesNotMatch(RULES, /function canWriteComputer\([^)]*\)\s*\{\s*return canWriteConsole/s);
  assert.doesNotMatch(RULES, /function canWriteRole\([^)]*\)\s*\{\s*return canWriteConsole/s);
});

test("signal Direct privé : compte actif, inscription NAP temporaire, compétition et environnement exacts", async () => {
  const signal="livepalmesDirectSignals/test-900001/signal/current",access="livepalmesDirectSignals/test-900001/private/access";
  await testEnv.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();await setDoc(doc(db,'users/console-user'),{status:'active'});
    await setDoc(doc(db,signal),{version:{config:1,workflow:1},updatedAt:Timestamp.now()});
    await setDoc(doc(db,access),{members:{'console-user':{until:Timestamp.fromMillis(Date.now()+300000)}}});
  });
  const permitted=testEnv.authenticatedContext('console-user').firestore(),other=testEnv.authenticatedContext('other-user').firestore();
  await assertSucceeds(getDoc(doc(permitted,signal)));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),signal)));
  await assertFails(getDoc(doc(other,signal)));
  await assertFails(getDoc(doc(permitted,signal.replace('900001','900002'))));
  await assertFails(getDoc(doc(permitted,access)));
  await assertFails(getDocs(collection(permitted,'livepalmesDirectSignals/test-900001/signal')));
  await assertFails(setDoc(doc(permitted,signal),{version:{config:999,workflow:999}}));
  await assertFails(setDoc(doc(permitted,access),{members:{'console-user':{until:Timestamp.fromMillis(Date.now()+999999)}}}));
  await testEnv.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),access),{members:{'console-user':{until:Timestamp.fromMillis(Date.now()-1000)}}});});
  await assertFails(getDoc(doc(permitted,signal)));
  await testEnv.withSecurityRulesDisabled(async context=>{const db=context.firestore();await setDoc(doc(db,access),{members:{'console-user':{until:Timestamp.fromMillis(Date.now()+300000)}}});await updateDoc(doc(db,'users/console-user'),{status:'disabled'});});
  await assertFails(getDoc(doc(permitted,signal)));
});

test("temps réel Direct via émulateur : commit NAP, réception, panne/reprise, deux compétitions et révocation", async () => {
  const serverRequire=require('node:module').createRequire(path.resolve(__dirname,'../../functions/package.json'));
  const {initializeApp,deleteApp}=serverRequire('firebase-admin/app');
  const {getFirestore}=serverRequire('firebase-admin/firestore');
  const {randomUUID}=require('node:crypto'),{fixture}=require('../helpers/direct-console-sql-fixture');
  const {createStore,createService}=(()=>{const c=require('../helpers/direct-test-clock');return {createStore:c.storeModule.createStore,createService:c.serviceModule.createService};})();
  const {createRelay}=require('../../functions/nap-direct-realtime');
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST,'Ce test exige un émulateur, jamais une base réelle.');
  const app=initializeApp({projectId:PROJECT_ID},'direct-realtime-'+randomUUID()),db=getFirestore(app),pool=fixture(),store=createStore(pool,'test'),actor={uid:'realtime-root',national:true},relay=createRelay({db,environment:'test'});
  let unsubscribe=()=>{},otherUnsubscribe=()=>{},broken=false;
  try{
    await db.doc('users/realtime-root').set({status:'active'});
    const service=createService({getPool:()=>pool,environment:'test',authorize:async()=>actor,matchRegion:()=>false,realtime:{...relay,publish:input=>broken?Promise.reject(Error('Publication du signal coupée')):relay.publish(input)}});
    const call=(id,action,data={})=>service({auth:{uid:actor.uid},data:{competitionId:id,action,...data}});
    for(const id of [900001,900002]){
      await store.settings(id,actor,{consoles:['computer','referee'],operationKey:randomUUID()});
      const group={kind:'series',event:{eventCode:'100sf',eventLabel:'100 m Surface',sex:'M',date:'2026-11-07',sessionKey:'1',expectedSeries:2},rows:[1,2].map(series=>({lastName:'FICTIF',firstName:'Test '+series,club:'CLUB',category:'HSE',birthYear:2000,series,lane:1,entryTime:'595999'})),operationKey:randomUUID()},batch={groups:[group]},preview=await store.previewBatch(id,batch);await store.publishBatch(id,actor,{...batch,fingerprint:preview.fingerprint});
    }
    const ticket=await call(900001,'consoleSubscribe',{role:'referee'}),other=await call(900002,'consoleSubscribe',{role:'computer'}),client=testEnv.authenticatedContext(actor.uid).firestore();
    let latest=-1,otherCount=0,receive,revoked;
    const arrival=()=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Signal non reçu dans l’émulateur')),6000);receive=value=>{clearTimeout(timeout);resolve(value);};});
    const initial=arrival();
    unsubscribe=onSnapshot(doc(client,ticket.path),{includeMetadataChanges:true},snapshot=>{if(!snapshot.metadata.fromCache&&snapshot.exists()){latest=snapshot.data().version.workflow;receive?.(latest);}},error=>revoked?.(error));
    otherUnsubscribe=onSnapshot(doc(client,other.path),snapshot=>{if(snapshot.exists())otherCount++;});
    await initial;await assertSucceeds(getDoc(doc(client,other.path)));await new Promise(resolve=>setTimeout(resolve,100));const otherBefore=otherCount;
    const current=await call(900001,'consoleSnapshot',{role:'referee'}),request={role:'referee',eventId:current.selectedEventId,command:'decision',participantKey:current.entries[0].key,type:'false_start',revision:current.revision,configVersion:current.configVersion,operationKey:randomUUID()};
    let notification=arrival(),started=Date.now();const result=await call(900001,'consoleCommand',request);assert.equal(await notification,result.revision);const elapsedMs=Date.now()-started;
    assert.ok(elapsedMs<6000);await new Promise(resolve=>setTimeout(resolve,100));assert.equal(otherCount,otherBefore,'Aucune notification sur l’autre compétition');
    const saved=await call(900001,'consoleSnapshot',{role:'computer'});assert.equal(saved.workflow.alerts.length,1);assert.equal(saved.workflow.alerts[0].type,'false_start');
    broken=true;const pending=await call(900001,'consoleCommand',{...request,command:'progress',series:1,revision:saved.revision,configVersion:saved.configVersion,operationKey:randomUUID()});assert.equal(pending.ok,true);assert.ok(latest<pending.revision);
    broken=false;notification=arrival();await call(900001,'consoleSnapshot',{role:'computer'});assert.equal(await notification,pending.revision,'La version durable NAP répare le signal manqué');
    await disableNetwork(client);const next=await call(900001,'consoleCommand',{...request,command:'progress',series:2,revision:pending.revision,operationKey:randomUUID()});notification=arrival();await enableNetwork(client);assert.equal(await notification,next.revision,'Reconnexion sur la dernière version');
    const denied=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Révocation non reçue')),6000);revoked=error=>{clearTimeout(timeout);resolve(error);};});
    await relay.revoke({id:900001,uid:actor.uid});assert.equal((await denied).code,'permission-denied');await assertFails(getDoc(doc(client,ticket.path)));
    console.log(JSON.stringify({directRealtimeEmulator:true,latencyMs:elapsedMs,recovery:true,competitionsIsolated:true,revocation:true,realWrites:0}));
  }finally{unsubscribe();otherUnsubscribe();await db.terminate();await deleteApp(app);}
});
