"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { livePalmesEnvironment } = require("../functions/livepalmes-environment");
const source = fs.readFileSync("functions/index.js", "utf8");
const start = source.indexOf("// Public sporting reads use NAP;");
const end = source.indexOf("const ENGAGEMENT_MAIL_CALLABLE_OPTIONS", start);
assert.ok(start > 0 && end > start);
for (const projectId of ["livepalmes", "livepalmes-test"]) {
  let connections = 0;
  const exports = {};
  const context = {
    ENVIRONMENT: livePalmesEnvironment({ GCLOUD_PROJECT: projectId }), exports,
    REGION: "europe-west1", CALLABLE_OPTIONS: {},
    defineSecret: name => ({ name, value: () => "offline-secret-placeholder" }),
    onRequest: (options, handler) => ({ options, handler }), onCall: (options, handler) => ({ options, handler }),
    createNapPool: () => { connections++; throw Error("Must not connect during initialization"); },
    require: name => { assert.equal(name, "./nap-public-export"); return {}; }
  };
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(connections, 0);
  assert.equal(exports.readNapPublicSwimmer.options.secrets[0].name, "LIVEPALMES_NAP_PASSWORD");
  assert.equal(exports.readNapPublicSwimmer.options.maxInstances, 2);
  assert.equal(exports.readNapPublicSwimmer.options.concurrency, 4);
  if (projectId === "livepalmes") {
    assert.equal(exports.exportNapPublicPage, undefined, "Migration endpoint must never be promoted to PROD");
    assert.deepEqual(Array.from(exports.readNapPublicSwimmer.options.cors), ["https://livepalmes.web.app", "https://livepalmes.firebaseapp.com"]);
  } else {
    assert.equal(exports.exportNapPublicPage.options.invoker, "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com");
    assert.ok(exports.readNapPublicSwimmer.options.cors[0].test("https://livepalmes-test--pr-217-example.web.app"));
    assert.ok(!exports.readNapPublicSwimmer.options.cors[0].test("https://livepalmes.web.app"));
  }
}
console.log("NAP TEST/PROD: lazy bounded public endpoint, isolated CORS and migration endpoint restricted to TEST.");
