"use strict";
const { TABLE } = require("./nap-club-account-emails");
const CREATE_SQL = `CREATE TABLE ${TABLE} (
  firebase_uid VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  club_id VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  email VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  status ENUM('active','inactive','deleted') NOT NULL,
  competition_notifications TINYINT UNSIGNED NOT NULL DEFAULT 0,
  synchronized_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (firebase_uid),
  KEY club_status (club_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`;

async function inspect(pool) {
  const [columns] = await pool.execute({ sql: `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`, timeout: 10000 }, [TABLE]);
  if (!columns.length) return { exists: false, compatible: true };
  const expected = [
    ["firebase_uid", "varchar(128)", "NO", "utf8mb4_bin"],
    ["club_id", "varchar(40)", "YES", "utf8mb4_bin"],
    ["email", "varchar(254)", "YES", "utf8mb4_bin"],
    ["status", "enum('active','inactive','deleted')", "NO", "utf8mb4_bin"],
    ["competition_notifications", "tinyint(3) unsigned", "NO", null],
    ["synchronized_at", "timestamp(6)", "NO", null]
  ];
  const normalize = type => String(type).replace(/^tinyint(?:\(\d+\))? unsigned$/, "tinyint unsigned");
  if (columns.length !== expected.length || columns.some((column, i) =>
    column.COLUMN_NAME !== expected[i][0] || normalize(column.COLUMN_TYPE) !== normalize(expected[i][1]) ||
    column.IS_NULLABLE !== expected[i][2] || column.COLLATION_NAME !== expected[i][3])) {
    throw new Error("Table des comptes NAP existante incompatible ; aucune alteration automatique.");
  }
  const [indexes] = await pool.execute({ sql: `SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX`, timeout: 10000 }, [TABLE]);
  const [tables] = await pool.execute({ sql: `SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, timeout: 10000 }, [TABLE]);
  const keys = indexes.map(index => [index.INDEX_NAME, Number(index.NON_UNIQUE), Number(index.SEQ_IN_INDEX), index.COLUMN_NAME]);
  if (tables[0]?.ENGINE !== "InnoDB" || JSON.stringify(keys) !== JSON.stringify([
    ["club_status", 1, 1, "club_id"], ["club_status", 1, 2, "status"], ["PRIMARY", 0, 1, "firebase_uid"]
  ])) throw new Error("Index ou moteur de la table des comptes NAP incompatible.");
  return { exists: true, compatible: true };
}

async function ensure(pool) {
  const before = await inspect(pool);
  if (!before.exists) await pool.execute({ sql: CREATE_SQL, timeout: 10000 });
  if (!(await inspect(pool)).exists) throw new Error("Creation de la table NAP non confirmee.");
  return { created: !before.exists };
}
module.exports = { CREATE_SQL, inspect, ensure };
