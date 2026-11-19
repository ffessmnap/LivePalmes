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
  setLogLevel,
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

setLogLevel("silent"); // Expected denials remain assertions; keep emulator logs bounded.
const PROJECT_ID = "demo-livepalmes-a5";
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
  // Isolate stored data/rule compilation from the historical suite while
  // exercising its actual allowed test audience. No production rule is changed.
  const authenticated = testEnv.authenticatedContext.bind(testEnv);
  testEnv.authenticatedContext = (uid, claims = {}) => authenticated(uid, { aud: "demo-livepalmes", ...claims });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const role of ROLES) await seedGrant(db, role);
    for (const uid of ["capability-admin", "AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]) await setDoc(doc(db,"users",uid),{status:"active",capabilities:{"admin.full":true}});
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

test("A5 : anciennes données inaccessibles avec grants valides, rôles et administrateurs", async () => {
 const paths=["public/resultsIndex","public/seriesIndex","public/archivesIndex","liveData/current","results/result-1","seriesPdfs/pdf-1","resultPdfs/pdf-1","sessionResultsPdfs/pdf-1","resultArchives/archive-1","resultArchives/archive-1/races/race-1","resultArchives/archive-1/items/result-1","resultArchives/archive-1/extras/medals","resultArchives/archive-1/resultPdfs/pdf-1","resultArchives/archive-1/sessionResultsPdfs/pdf-1","historyArchives/archive-1","alerts/alert-1","summaries/alerts","presence/presence-1","roleLocks/computer","secrets/roles","testMode/state","performanceData/records"];
 for(const id of ["livepalmes-active","livepalmes-test"]){
  await testEnv.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();
   for(const role of ROLES)await setDoc(doc(db,"competitions",id,"consoleGrants",role+"-uid"),{uid:role+"-uid",role,competitionId:id,expiresAt:Timestamp.fromMillis(Date.now()+3600000)});
   for(const route of paths)await setDoc(doc(db,"competitions",id,...route.split("/")),{fixture:"retired",updatedAt:"2026-11-19T12:00:00.000Z"},{merge:true});
  });
  const clients=[testEnv.unauthenticatedContext().firestore(),...ROLES.map(role=>roleDb(role,consoleClaims(role,id))),adminDb(),adminDb("AgvWJjvLOfe3uB0lz0Xr3wwJxzT2")];
  for(const client of clients){
   await assertFails(getDoc(doc(client,"competitions",id)));
   for(const route of paths){const target=doc(client,"competitions",id,...route.split("/"));await assertFails(getDoc(target));await assertFails(setDoc(target,{fixture:"recreate"}));await assertFails(updateDoc(target,{updatedAt:"2026-11-19T13:00:00.000Z"}));await assertFails(deleteDoc(target));}
  }
  await assertFails(setDoc(doc(roleDb("computer",consoleClaims("computer",id)),"competitions",id,"results","result-1"),validResult()));
  await assertFails(getDocs(collection(adminDb(),"competitions",id,"public")));
 }
});

test("annuaire privé : accès direct fermé même aux profils habilités, lecture par serveur uniquement", async () => {
  const anonymous = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, "accessDirectorySnapshots", "national")));

  const admin = adminDb();
  await assertFails(getDoc(doc(admin, "accessDirectorySnapshots", "national")));
  await assertFails(getDoc(doc(admin, "accessDirectorySnapshots", "region:IDF")));
  await assertFails(setDoc(doc(admin, "accessDirectorySnapshots", "national"), {
    scopeType: "national", scopeId: "", status: "ready", version: 1, entries: {}
  }));

  const national = testEnv.authenticatedContext("national-manager", {
    livepalmesAccess: true,
    livepalmesCapabilities: { "engagements.national.manage": true }
  }).firestore();
  await assertFails(getDoc(doc(national, "accessDirectorySnapshots", "national")));
  await assertFails(getDoc(doc(national, "accessDirectorySnapshots", "region:IDF")));

  const regional = testEnv.authenticatedContext("region-idf", {
    livepalmesAccess: true,
    livepalmesCapabilities: { "engagements.region.manage": true }
  }).firestore();
  await assertFails(getDoc(doc(regional, "accessDirectorySnapshots", "region:IDF")));
  await assertFails(getDoc(doc(regional, "accessDirectorySnapshots", "region:HDF")));
  await assertFails(getDoc(doc(regional, "accessDirectorySnapshots", "national")));

  const regionalWithoutScope = testEnv.authenticatedContext("region-without-scope", {
    livepalmesAccess: true,
    livepalmesCapabilities: { "engagements.region.manage": true }
  }).firestore();
  await assertFails(getDoc(doc(regionalWithoutScope, "accessDirectorySnapshots", "region:IDF")));
});

test("session portail : annuaire direct et registre technique interdits aux deux audiences", async () => {
  for(const audience of ["livepalmes-test","livepalmes"]){
  const client = testEnv.authenticatedContext("national-manager", {
    aud:audience, livepalmesAccess:true,
    livepalmesCapabilities:{"engagements.national.manage":true,"admin.full":true}
  }).firestore();
  await assertFails(getDoc(doc(client,"accessDirectorySnapshots","national")));
  await assertFails(getDoc(doc(client,"portalSessions","fixture")));
  await assertFails(setDoc(doc(client,"portalSessions","fixture"),{lastActivityAt:Date.now()}));
  }
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
