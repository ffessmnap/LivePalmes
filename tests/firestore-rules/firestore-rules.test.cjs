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

test("speaker : une annonce de repêchage peut ajouter uniquement repechageAnnouncedAt à une seule finaliste", async () => {
  const db = roleDb("speaker");
  const ref = competitionDoc(db, "results", "result-1");
  const allowed = validResult();
  allowed.finalists.a[1] = { ...allowed.finalists.a[1], repechageAnnouncedAt: "2026-07-27T09:10:00.000Z" };
  allowed.updatedAt = "2026-07-27T09:10:00.000Z";
  await assertSucceeds(setDoc(ref, allowed));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(competitionDoc(context.firestore(), "results", "result-1"), validResult());
  });
  const forbidden = validResult();
  forbidden.finalists.a[1] = {
    ...forbidden.finalists.a[1],
    time: "38.00",
    repechageAnnouncedAt: "2026-07-27T09:11:00.000Z"
  };
  forbidden.updatedAt = "2026-07-27T09:11:00.000Z";
  await assertFails(setDoc(ref, forbidden));
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
  await assertSucceeds(updateDoc(competitionDoc(db, "public", "resultsIndex"), {
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

  const legacy = testEnv.authenticatedContext("AgvWJjvLOfe3uB0lz0Xr3wwJxzT2").firestore();
  await assertSucceeds(setDoc(competitionDoc(legacy, "secrets", "legacy-secret"), { enabled: true }));
});

test("garde-fou statique : les doubles allow permissifs audités ne réapparaissent pas", () => {
  const permissiveDuplicate = /allow create, update:[^;]+canWriteComputer\(competitionId\);\s*allow create, update:/s;
  assert.doesNotMatch(RULES, permissiveDuplicate);
  assert.doesNotMatch(RULES, /function canWriteComputer\([^)]*\)\s*\{\s*return canWriteConsole/s);
  assert.doesNotMatch(RULES, /function canWriteRole\([^)]*\)\s*\{\s*return canWriteConsole/s);
});
