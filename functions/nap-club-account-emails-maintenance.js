"use strict";
const { createHash } = require("node:crypto");
const { TABLE, validateIds, writeProjection } = require("./nap-club-account-emails");
const schema = require("./nap-club-account-emails-schema");
const CONFIRMATION = "nap-shared-prod-account-emails";
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const PLAN = hash(schema.CREATE_SQL);

function validateRows(rows) {
  if (!Array.isArray(rows)) throw new Error("Page requise.");
  validateIds(rows.map(row => row?.uid));
  for (const row of rows) {
    if (Object.keys(row).sort().join(",") !== "clubId,email,notifications,status,uid,version" ||
      row.clubId !== null && (typeof row.clubId !== "string" || !row.clubId || row.clubId.length > 40) ||
      row.email !== null && (typeof row.email !== "string" || row.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) ||
      !["active", "inactive", "deleted"].includes(row.status) || ![0, 1].includes(row.notifications) ||
      typeof row.version !== "string" || !/^[1-9]\d{0,17}$/.test(row.version) ||
      row.status === "deleted" && (row.clubId !== null || row.email !== null || row.notifications !== 0)) {
      throw new Error("Projection de profil incompatible.");
    }
  }
  return [...rows].sort((a, b) => a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
}

async function request(pool, input, projectId) {
  if (projectId !== "livepalmes-test" || input?.confirmation !== CONFIRMATION || input.sourceProject !== "livepalmes" ||
    !["inspect", "prepare", "create", "apply"].includes(input.phase)) throw new Error("Maintenance hors perimetre.");
  const base = { table: TABLE, sourceProject: "livepalmes", planHash: PLAN };
  if (["inspect", "prepare"].includes(input.phase)) {
    const structure = await schema.inspect(pool);
    const [rows] = structure.exists ? await pool.execute({ sql: `SELECT firebase_uid, club_id, email, status, competition_notifications, source_version FROM ${TABLE} ORDER BY firebase_uid LIMIT 10001`, timeout: 10000 }) : [[]];
    if (rows.length > 10000) throw new Error("Annuaire hors budget.");
    return { ...base, structure, uids: rows.map(row => row.firebase_uid),
      ...(input.phase === "prepare" ? { before: rows } : {}) };
  }
  if (input.planHash !== PLAN) throw new Error("Plan de table incompatible.");
  if (input.phase === "create") return { ...base, ...await schema.ensure(pool), verified: true };
  const rows = validateRows(input.rows);
  if (input.hash !== hash(input.rows)) throw new Error("Empreinte de page incompatible.");
  const result = await writeProjection(pool, rows.map(row => row.uid), async () => rows);
  const [saved] = await pool.execute({ sql: `SELECT firebase_uid, club_id, email, status, competition_notifications, source_version FROM ${TABLE} WHERE firebase_uid IN (${rows.map(() => "?").join(",")}) ORDER BY firebase_uid`, timeout: 10000 }, rows.map(row => row.uid));
  if (saved.length !== rows.length || saved.some((row, i) => {
    const expected = rows[i];
    return row.firebase_uid !== expected.uid || BigInt(row.source_version) < BigInt(expected.version) ||
      BigInt(row.source_version) === BigInt(expected.version) &&
      (row.club_id !== expected.clubId || row.email !== expected.email || row.status !== expected.status || Number(row.competition_notifications) !== expected.notifications);
  })) throw new Error("Verification de la reprise incomplete.");
  return { ...base, ...result, verified: true };
}
module.exports = { request, validateRows, hash, PLAN, CONFIRMATION };
