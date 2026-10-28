"use strict";

// Private projection of PROD profiles. Never use TEST accounts in the shared NAP database.
const TABLE = "livepalmes_club_account_emails";
const PAGE_SIZE = 100;
const FIELDS = ["email", "clubId", "status", "emailPreferences.competitionNotifications"];

function enabled(projectId) { return projectId === "livepalmes"; }

function sourceVersion(snapshot) {
  const time = snapshot.exists ? snapshot.updateTime : snapshot.readTime;
  if (!time || !Number.isSafeInteger(time.seconds) || !Number.isInteger(time.nanoseconds)) throw new Error("Version du profil requise.");
  return (BigInt(time.seconds) * 1000000n + BigInt(Math.floor(time.nanoseconds / 1000))).toString();
}

function project(snapshot) {
  const version = sourceVersion(snapshot);
  if (!snapshot.exists) return { uid: snapshot.id, clubId: null, email: null, status: "deleted", notifications: 0, version };
  const data = snapshot.data() || {};
  const email = String(data.email || "").trim().toLowerCase();
  const clubId = String(data.clubId || "").trim();
  if (email.length > 254 || clubId.length > 40 || email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Profil incompatible avec l'annuaire NAP ; synchronisation arretee.");
  }
  return { uid: snapshot.id, clubId: clubId || null, email: email || null,
    status: data.status === "active" ? "active" : "inactive",
    notifications: data.emailPreferences?.competitionNotifications === false ? 0 : 1, version };
}

function validateIds(uids) {
  if (!Array.isArray(uids) || !uids.length || uids.length > PAGE_SIZE ||
      uids.some(uid => typeof uid !== "string" || !uid || uid.length > 128 || uid.includes("/")) ||
      new Set(uids).size !== uids.length) throw new Error("Page de comptes incorrecte.");
}

async function writeProjection(pool, uids, readRows) {
  validateIds(uids);
  const ids = [...uids].sort();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Lock in a stable order. Tombstones keep deletion races serialized without retaining an email.
    await connection.execute({ sql: `INSERT INTO ${TABLE} (firebase_uid, status) VALUES ${ids.map(() => "(?, 'deleted')").join(",")}
      ON DUPLICATE KEY UPDATE firebase_uid = VALUES(firebase_uid)`, timeout: 10000 }, ids);
    await connection.execute({ sql: `SELECT firebase_uid FROM ${TABLE} WHERE firebase_uid IN (${ids.map(() => "?").join(",")}) ORDER BY firebase_uid FOR UPDATE`, timeout: 10000 }, ids);
    // Re-read the CURRENT profile after the SQL locks, never replay an obsolete event payload.
    const rows = await readRows(ids);
    if (rows.length !== ids.length || rows.some((row, index) => row.uid !== ids[index])) throw new Error("Page de profils incoherente.");
    const replace = column => `${column} = IF(VALUES(source_version) >= source_version, VALUES(${column}), ${column})`;
    await connection.execute({ sql: `INSERT INTO ${TABLE} (firebase_uid, club_id, email, status, competition_notifications, source_version)
      VALUES ${rows.map(() => "(?, ?, ?, ?, ?, ?)").join(",")}
      ON DUPLICATE KEY UPDATE ${["club_id", "email", "status", "competition_notifications"].map(replace).join(", ")},
      synchronized_at = IF(VALUES(source_version) >= source_version, CURRENT_TIMESTAMP(6), synchronized_at),
      source_version = GREATEST(source_version, VALUES(source_version))`, timeout: 10000 },
    rows.flatMap(row => [row.uid, row.clubId, row.email, row.status, row.notifications, row.version]));
    await connection.commit();
    return { synchronized: rows.length };
  } catch {
    await connection.rollback().catch(() => {});
    // SQL errors can contain bound values. Do not propagate them to Cloud Logging.
    throw new Error("Synchronisation des comptes NAP impossible ; reprise necessaire.");
  } finally { connection.release(); }
}

async function syncBatch({ projectId, pool, db, uids }) {
  if (!enabled(projectId)) return { disabled: true, synchronized: 0 };
  return writeProjection(pool, uids, async ids => {
    const snapshots = await db.getAll(...ids.map(uid => db.collection("users").doc(uid)), { fieldMask: FIELDS });
    return snapshots.map(project);
  });
}

function createSynchronizer({ projectId, createPool, db }) {
  let pool;
  return async uid => {
    if (!enabled(projectId)) return { disabled: true, synchronized: 0 };
    if (!pool) pool = createPool();
    return syncBatch({ projectId, pool, db, uids: [uid] });
  };
}

module.exports = { TABLE, PAGE_SIZE, FIELDS, enabled, project, syncBatch, createSynchronizer, validateIds, writeProjection };
