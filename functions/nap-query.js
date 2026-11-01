"use strict";
// Existing singleton, values or query bodies; no business change.
async function execute(pool, sql, values = []) { return (await pool.execute({ sql, timeout: 10000 }, values))[0]; }

module.exports = { execute };
