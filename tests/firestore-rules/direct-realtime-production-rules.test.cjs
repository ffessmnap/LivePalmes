const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertFails, assertSucceeds, initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { Timestamp, doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc } = require("firebase/firestore");

test("règles PROD Direct dérivées : ajout privé seul, audience et adhésion temporaires", async () => {
  const net = require("node:net");
  const endpoint = process.env.FIRESTORE_EMULATOR_HOST || "";
  assert.match(endpoint, /^(127\.0\.0\.1|localhost):[0-9]+$/, "Émulateur local obligatoire, aucun accès Firebase réel");
  const [host, port] = endpoint.split(":");
  assert.ok(net.isIP(host) || host === "localhost");
  const evidence = path.resolve(__dirname, "../../.github/releases/evidence");
  const previous = fs.readFileSync(path.join(evidence, "20261113-direct-realtime-observed-production-before.rules"), "utf8");
  const derived = fs.readFileSync(path.join(evidence, "20261113-direct-realtime-observed-production-after.rules"), "utf8");
  const marker = "    // NAP authorizes short-lived membership server-side.";
  const start = derived.indexOf(marker), end = derived.indexOf("    match /{document=**}", start);
  assert.equal(derived.slice(0,start) + derived.slice(end), previous);
  assert.equal(derived.slice(start,end).split("\n").length - 1, 10);
  const production = await initializeTestEnvironment({projectId:"livepalmes",firestore:{host,port:Number(port),rules:derived}});
  const signal="livepalmesDirectSignals/production-900001/signal/current", access="livepalmesDirectSignals/production-900001/private/access";
  try {
    await production.withSecurityRulesDisabled(async context => {
      const db=context.firestore();
      await setDoc(doc(db,"users/closed-production-console"),{status:"active"});
      await setDoc(doc(db,signal),{version:{config:1,workflow:2},updatedAt:Timestamp.now()});
      await setDoc(doc(db,access),{members:{"closed-production-console":{until:Timestamp.fromMillis(Date.now()+300000)}}});
      await setDoc(doc(db,signal.replace("production-","test-")),{version:{config:1,workflow:2}});
      await setDoc(doc(db,access.replace("production-","test-")),{members:{"closed-production-console":{until:Timestamp.fromMillis(Date.now()+300000)}}});
    });
    const allowed=production.authenticatedContext("closed-production-console").firestore();
    await assertSucceeds(getDoc(doc(allowed,signal)));
    await assertFails(getDoc(doc(production.unauthenticatedContext().firestore(),signal)));
    await assertFails(getDoc(doc(production.authenticatedContext("other-console").firestore(),signal)));
    await assertFails(getDoc(doc(allowed,signal.replace("900001","900002"))));
    await assertFails(getDoc(doc(allowed,signal.replace("production-","test-"))));
    await assertFails(getDoc(doc(allowed,access)));
    await assertFails(getDocs(collection(allowed,"livepalmesDirectSignals/production-900001/signal")));
    await assertFails(setDoc(doc(allowed,signal),{version:{config:99,workflow:99}}));
    await assertFails(setDoc(doc(allowed,access),{members:{"closed-production-console":{until:Timestamp.fromMillis(Date.now()+999999)}}}));
    await assertFails(deleteDoc(doc(allowed,signal)));
    await production.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(),access),{members:{"closed-production-console":{until:Timestamp.fromMillis(Date.now()-1000)}}});
    });
    await assertFails(getDoc(doc(allowed,signal)));
    await production.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(),access),{members:{"closed-production-console":{until:Timestamp.fromMillis(Date.now()+300000)}}});
      await updateDoc(doc(context.firestore(),"users/closed-production-console"),{status:"disabled"});
    });
    await assertFails(getDoc(doc(allowed,signal)));
    const wrongAudience = await initializeTestEnvironment({projectId:"demo-livepalmes-direct-prod-audience",firestore:{host,port:Number(port),rules:derived}});
    try { await assertFails(getDoc(doc(wrongAudience.authenticatedContext("closed-production-console").firestore(),signal))); }
    finally { await wrongAudience.cleanup(); }
  } finally { await production.cleanup(); }
});
