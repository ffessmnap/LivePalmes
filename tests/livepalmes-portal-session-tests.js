const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("le Portail ne charge plus de verrouillage automatique de session", () => {
  const html = read("portail.html");

  assert.doesNotMatch(html, /data-portal-session/);
  assert.doesNotMatch(html, /assets\/livepalmes-portal-session\.js/);
  assert.doesNotMatch(html, /id="adminPortalSessionWarning"/);
  assert.doesNotMatch(html, /id="adminPortalSessionLock"/);
  assert.doesNotMatch(html, /id="adminPortalSessionUnlockForm"/);
  assert.match(html, /id="adminPortalSignOutButton"/);
});
