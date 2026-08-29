const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("le portail initialise App Check avant l'authentification", () => {
  const portal = read("portail.html");
  const appCheckSdk = portal.indexOf("firebase-app-check-compat.js");
  const config = portal.indexOf("assets/livepalmes-app-config.js");
  const appCheck = portal.indexOf("assets/livepalmes-app-check.js");
  const auth = portal.indexOf("assets/livepalmes-admin-auth.js");

  assert.ok(appCheckSdk >= 0, "Le SDK Firebase App Check doit etre charge.");
  assert.ok(config > appCheckSdk, "La configuration doit etre chargee apres le SDK App Check.");
  assert.ok(appCheck > config, "App Check doit lire la configuration apres son chargement.");
  assert.ok(auth > appCheck, "L'authentification doit demarrer apres App Check.");
});

test("App Check reste desactive tant que la cle publique n'est pas configuree", () => {
  const config = read("assets/livepalmes-app-config.js");
  const appCheck = read("assets/livepalmes-app-check.js");

  assert.match(config, /APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY\s*=\s*""/);
  assert.match(appCheck, /if \(!key \|\| !firebase\?\.appCheck \|\| !firebase\?\.initializeApp \|\| !config\) return false;/);
  assert.match(appCheck, /if \(!firebase\.apps\?\.length\) firebase\.initializeApp\(config\);/);
});

test("la demande publique pourra imposer App Check apres activation explicite", () => {
  const functions = read("functions/index.js");

  assert.match(functions, /defineBoolean\("LIVEPALMES_ENFORCE_APP_CHECK", \{ default: false \}\)/);
  assert.match(functions, /enforceAppCheck:\s*LIVEPALMES_ENFORCE_APP_CHECK/);
});
