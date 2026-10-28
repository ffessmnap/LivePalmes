"use strict";

// Preloaded only by the offline unit suite. TEST shares the real NAP database:
// a mistaken SDK initialization must never open a remote socket during tests.
const net = require("node:net");
const local = host => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(host).toLowerCase());
function assertLocal(host) {
  if (!local(host)) throw new Error("Offline test: external network access forbidden");
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let first = args[0];
  // Node can pass its already normalized [options, callback] representation.
  if (Array.isArray(first)) first = first[0];
  if (first && typeof first === "object") {
    if (!first.path) assertLocal(first.host || first.hostname || "localhost");
  } else if (typeof first === "number") {
    assertLocal(typeof args[1] === "string" ? args[1] : "localhost");
  } // String-only forms are local IPC paths, not TCP hosts.
  return connect.apply(this, args);
};
if (globalThis.fetch) {
  const fetch = globalThis.fetch;
  globalThis.fetch = function (input, ...args) {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assertLocal(url.hostname);
    return fetch.call(this, input, ...args);
  };
}

module.exports = { assertLocal };
