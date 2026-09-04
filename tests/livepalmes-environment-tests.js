const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { livePalmesEnvironment } = require("../functions/livepalmes-environment");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "livepalmes-environment.js"), "utf8");

function browserContext(hostname, explicitEnvironment = "", candidateSource = source, pathname = "/index.html") {
  const listeners = new Map();
  const inserted = [];
  const document = {
    readyState: "loading",
    addEventListener(name, callback) { listeners.set(name, callback); },
    querySelector() { return null; },
    createElement(tagName) { return { tagName, dataset: {}, setAttribute() {} }; },
    head: { appendChild(element) { inserted.push(element); } },
    body: {
      classList: { contains() { return false; } },
      prepend(element) { inserted.push(element); }
    }
  };
  const window = {
    LIVEPALMES_ENVIRONMENT: explicitEnvironment,
    location: { hostname, pathname }
  };
  vm.runInNewContext(candidateSource, { window, document, URL, console });
  return { config: window.LivePalmesEnvironment, inserted, listeners };
}

const production = browserContext("livepalmes.web.app").config;
production.assertSafe();
assert.equal(production.name, "production");
assert.equal(production.firebaseConfig.projectId, "livepalmes");
assert.equal(production.publicStorageUrl("calendar/index.json"), "https://storage.googleapis.com/livepalmes-public-data-718081132564/calendar/index.json");
assert.deepEqual(Array.from(production.legacyAdminUids), ["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]);

assert.throws(
  () => browserContext("livepalmes-test.web.app", "production"),
  /domaine TEST ne peut pas charger la configuration de production/
);

const testPage = browserContext("livepalmes-test.web.app", "", source, "/portail.html");
const test = testPage.config;
test.assertSafe();
assert.equal(test.firebaseConfig.apiKey, "AIzaSyCJ6d6ZhUMbtYxBh1WKxhWjTaW7_LmoFEk");
assert.equal(test.firebaseConfig.appId, "1:206080168534:web:70dad29434b9878ecea1f7");
assert.equal(test.firebaseConfig.messagingSenderId, "206080168534");
assert.equal(test.publicStorageUrl("calendar"), "https://storage.googleapis.com/livepalmes-test-public-data-206080168534/calendar");
assert.equal(test.hostingOrigin, "https://livepalmes-test.web.app");
testPage.listeners.get("DOMContentLoaded")();
assert.ok(testPage.inserted.some((element) => element.dataset.livepalmesTestBanner === "true" && element.textContent === "ENVIRONNEMENT TEST"));
assert.ok(testPage.inserted.some((element) => element.dataset.livepalmesTestBanner === "true" && element.dataset.variant === "sensitive"));

const publicTestPage = browserContext("livepalmes-test.web.app", "", source, "/resultats.html");
publicTestPage.listeners.get("DOMContentLoaded")();
assert.ok(publicTestPage.inserted.some((element) => element.dataset.livepalmesTestBanner === "true" && element.dataset.variant === "public"));

assert.equal(livePalmesEnvironment({ GCLOUD_PROJECT: "livepalmes" }).legacyAdminUids.length, 1);
assert.equal(livePalmesEnvironment({ GCLOUD_PROJECT: "livepalmes-test" }).legacyAdminUids.length, 0);
assert.equal(livePalmesEnvironment({ GCLOUD_PROJECT: "livepalmes-test" }).publicBucket, "livepalmes-test-public-data-206080168534");
assert.throws(() => livePalmesEnvironment({ GCLOUD_PROJECT: "unexpected-project" }), /non autorise/);

console.log("Configuration TEST/PROD LivePalmes : OK");
