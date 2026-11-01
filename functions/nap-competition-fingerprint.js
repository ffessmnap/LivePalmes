"use strict";
// Existing singleton, values or query bodies; no business change.
const { createHash } = require("node:crypto");
function fingerprint(pack) {
  const { readAt, ...data } = pack;
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

module.exports = { fingerprint };
