"use strict";
// Existing singleton, values or query bodies; no business change.
const { COLUMNS, club } = require("./nap-club-values");
async function findClub(pool, value) {
 const id=String(value ?? "");
 if(!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id))) throw new TypeError("Identifiant club NAP invalide.");
 const [rows]=await pool.execute({sql:`SELECT ${COLUMNS.map(k=>`\`${k}\``).join(",")} FROM clubs FORCE INDEX (PRIMARY) WHERE num_club = ? LIMIT 1`,values:[Number(id)],timeout:10000});
 return rows.length ? club(rows[0]) : null;
}

module.exports = { findClub };
