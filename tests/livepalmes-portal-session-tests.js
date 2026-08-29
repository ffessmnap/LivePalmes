const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("le Portail charge le verrouillage de session et ses dialogues", () => {
  const html = read("portail.html");
  const authIndex = html.indexOf("assets/livepalmes-admin-auth.js");
  const sessionIndex = html.indexOf("assets/livepalmes-portal-session.js");

  assert.ok(authIndex >= 0 && sessionIndex > authIndex);
  assert.match(html, /id="adminPortalSessionWarning"/);
  assert.match(html, /id="adminPortalSessionLock"/);
  assert.match(html, /id="adminPortalSessionUnlockForm"/);
});

test("le delai est de 30 minutes avec avertissement a 25 minutes", () => {
  const source = read("assets/livepalmes-portal-session.js");
  assert.match(source, /INACTIVITY_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(source, /INACTIVITY_WARNING_MS = 25 \* 60 \* 1000/);
  assert.match(source, /reauthenticateWithCredential/);
  assert.match(source, /global\.localStorage\?\.setItem/);
  assert.match(source, /global\.addEventListener\("storage", handleStorage\)/);
});

test("le format du compte a rebours reste lisible", () => {
  const source = read("assets/livepalmes-portal-session.js");
  const start = source.indexOf("  function formatRemainingTime");
  const end = source.indexOf("\n  function showWarning", start);
  const sandbox = {};

  vm.runInNewContext(`${source.slice(start, end)}\nthis.formatRemainingTime = formatRemainingTime;`, sandbox);
  assert.equal(sandbox.formatRemainingTime(5 * 60 * 1000), "5 min 00 s");
  assert.equal(sandbox.formatRemainingTime(29 * 1000), "29 s");
  assert.equal(sandbox.formatRemainingTime(-1), "0 s");
});
