"use strict";
const assert = require("node:assert/strict");
const net = require("node:net");
const { assertLocal } = require("./helpers/offline-network");
for (const host of ["localhost", "127.0.0.1", "::1"]) assert.doesNotThrow(() => assertLocal(host));
for (const host of ["example.invalid", "nap.ffessm.fr", "169.254.169.254", "127.0.0.1.example.invalid"]) {
  assert.throws(() => assertLocal(host), /external network/);
}
assert.throws(() => net.connect({ host: "example.invalid", port: 443 }), /external network/);
assert.throws(() => fetch("https://example.invalid/"), /external network/);
console.log("Offline suite: remote TCP/fetch denied before connection; local fixtures remain allowed.");
