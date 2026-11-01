"use strict";
// Existing singleton, values or query bodies; no business change.
const { createNapPool } = require("./nap-connection");

let pool;

function portalPool(password) { if (!pool) pool = createNapPool(password); return pool; }

module.exports = { portalPool };
