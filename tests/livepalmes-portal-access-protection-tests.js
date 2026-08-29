const assert = require("node:assert/strict");
const { nextPortalAccessRateLimit } = require("../functions/portal-access-protection");

const start = Date.parse("2026-08-04T10:00:00.000Z");
let state = {};

let result = nextPortalAccessRateLimit(state, start);
assert.equal(result.allowed, true);
state = result.next;

result = nextPortalAccessRateLimit(state, start + 1000);
assert.equal(result.allowed, false, "un second envoi immediat doit etre refuse");

for (let index = 1; index < 8; index += 1) {
  result = nextPortalAccessRateLimit(state, start + (index * 16000));
  assert.equal(result.allowed, true);
  state = result.next;
}

result = nextPortalAccessRateLimit(state, start + (8 * 16000));
assert.equal(result.allowed, false, "le quota horaire doit etre borne");

result = nextPortalAccessRateLimit(state, start + (61 * 60 * 1000));
assert.equal(result.allowed, true, "une nouvelle fenetre doit reinitialiser le quota");
assert.equal(result.next.count, 1);

console.log("Protection des demandes portail : OK");
