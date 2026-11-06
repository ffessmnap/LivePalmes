"use strict";
// Additive, explicitly approved schema. No migration of existing tables or rows.
const { createHash } = require("node:crypto");
const field = (name, type, nullable = false, defaultValue = null) => ({ name, type, nullable, defaultValue });
const scope = [field("environment", "varchar(16)"), field("competition_id", "int")];
const tracking = [field("version", "bigint unsigned", false, "1"), field("created_at", "datetime(6)"), field("updated_at", "datetime(6)"), field("created_by", "varchar(128)"), field("updated_by", "varchar(128)")];
const tables = [
  { name: "livepalmes_direct_competitions", columns: [...scope, field("state", "varchar(16)"), field("public_visible", "tinyint", false, "1"), field("enabled_consoles_json", "json"), field("documents_json", "json"), field("public_revision", "bigint unsigned", false, "0"), ...tracking], keys: [["PRIMARY", true, "environment", "competition_id"]] },
  { name: "livepalmes_direct_events", columns: [...scope, field("id", "char(64)"), field("source_event_id", "varchar(100)", true), field("event_code", "varchar(32)"), field("event_label", "varchar(160)"), field("sex", "char(1)"), field("phase", "varchar(32)"), field("event_date", "date", true), field("session_key", "varchar(64)"), field("session_label", "varchar(120)"), field("program_order", "int"), field("event_number", "varchar(16)"), field("scheduled_at", "varchar(32)"), field("publication_state_json", "json"), ...tracking], keys: [["PRIMARY", true, "environment", "competition_id", "id"], ["program_order", false, "environment", "competition_id", "program_order", "id"]] },
  { name: "livepalmes_direct_entries", columns: [...scope, field("event_id", "char(64)"), field("participant_key", "char(64)"), field("source_entry_id", "varchar(100)", true), field("entry_kind", "varchar(16)"), field("swimmer_id", "int", true), field("club_id", "varchar(32)", true), field("last_name", "varchar(160)"), field("first_name", "varchar(160)"), field("birth_year", "smallint", true), field("club_label", "varchar(200)"), field("category_code", "varchar(32)"), field("series_number", "smallint unsigned", true), field("lane", "tinyint unsigned", true), field("entry_time_raw", "varchar(32)"), field("entry_time_cs", "int unsigned", true), field("entry_time_status", "varchar(20)"), field("result_time_raw", "varchar(32)"), field("result_time_cs", "int unsigned", true), field("result_status", "varchar(32)"), field("published_rank", "smallint unsigned", true), field("relay_members_json", "json"), field("splits_json", "json"), field("has_series", "tinyint", false, "0"), field("has_result", "tinyint", false, "0"), ...tracking], keys: [["PRIMARY", true, "environment", "competition_id", "event_id", "participant_key"], ["series_lane", false, "environment", "competition_id", "event_id", "series_number", "lane"]] },
  { name: "livepalmes_direct_publications", columns: [...scope, field("id", "char(64)"), field("batch_id", "varchar(64)"), field("event_id", "char(64)", true), field("operation_key", "char(64)"), field("action", "varchar(24)"), field("source_type", "varchar(24)"), field("source_name", "varchar(200)"), field("source_hash", "varchar(64)"), field("before_json", "json"), field("after_json", "json"), field("created_at", "datetime(6)"), field("created_by", "varchar(128)")], keys: [["PRIMARY", true, "environment", "competition_id", "id"], ["operation_once", true, "environment", "competition_id", "operation_key"], ["history_page", false, "environment", "competition_id", "created_at", "id"]] },
  { name: "livepalmes_direct_access", columns: [...scope, field("user_uid", "varchar(128)"), field("can_manage", "tinyint"), field("allowed_consoles_json", "json"), field("active", "tinyint"), field("expires_at", "datetime(6)", true), ...tracking], keys: [["PRIMARY", true, "environment", "competition_id", "user_uid"], ["user_competitions", false, "environment", "user_uid", "active", "competition_id"]] }
];
const sql = tables.map(table => `CREATE TABLE \`${table.name}\` (${table.columns.map(c => `\`${c.name}\` ${c.type} ${c.nullable ? "NULL" : "NOT NULL"}${c.defaultValue === null ? "" : ` DEFAULT ${c.defaultValue}`}`).concat(table.keys.map(([name, unique, ...columns]) => `${name === "PRIMARY" ? "PRIMARY KEY" : `${unique ? "UNIQUE " : ""}KEY \`${name}\``} (${columns.map(name => `\`${name}\``).join(",")})`)).join(",")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash = hash(sql);
const normalize = value => String(value).toLowerCase().replace(/\b(tinyint|smallint|int|bigint)\(\d+\)/g, "$1");
function validate(metadata) {
  return tables.map((table, i) => {
    const meta = metadata[i];
    if (!meta || meta.tables.length > 1) throw new TypeError("Structure Direct ambiguë.");
    if (!meta.tables.length) {
      if (meta.columns.length || meta.keys.length) throw new TypeError("Structure Direct incohérente.");
      return false;
    }
    if (meta.tables[0].ENGINE !== "InnoDB" || meta.tables[0].TABLE_COLLATION !== "utf8mb4_unicode_ci" || meta.columns.length !== table.columns.length || meta.columns.some((c,j) => c.COLUMN_NAME !== table.columns[j].name || normalize(c.COLUMN_TYPE) !== table.columns[j].type || c.IS_NULLABLE !== (table.columns[j].nullable ? "YES" : "NO") || (c.COLUMN_DEFAULT == null ? null : String(c.COLUMN_DEFAULT)) !== table.columns[j].defaultValue || c.EXTRA)) throw new TypeError("Table Direct existante incompatible ; aucune modification automatique.");
    const expected = table.keys.flatMap(([name, unique, ...columns]) => columns.map((column,j) => [name, column, unique ? 0 : 1, j + 1])).sort((a,b) => a[0].localeCompare(b[0]) || a[3] - b[3]);
    const actual = meta.keys.map(k => [k.INDEX_NAME,k.COLUMN_NAME,Number(k.NON_UNIQUE),Number(k.SEQ_IN_INDEX)]).sort((a,b) => a[0].localeCompare(b[0]) || a[3] - b[3]);
    if (hash(actual) !== hash(expected) || meta.keys.some(k => k.SUB_PART !== null)) throw new TypeError("Index Direct incompatible.");
    return true;
  });
}
async function inspect(connection) {
  const result = [];
  for (const table of tables) {
    const q = async query => (await connection.execute({sql:query,timeout:10000},[table.name]))[0];
    result.push({ tables: await q("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2"), columns: await q("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 50"), keys: await q("SELECT INDEX_NAME,COLUMN_NAME,NON_UNIQUE,SEQ_IN_INDEX,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 30") });
  }
  validate(result); return result;
}
async function approvedDirectSchema(pool,input) {
  if (input?.confirmation !== "nap-create-livepalmes-direct-tables" || !["prepare","apply"].includes(input.phase)) throw new TypeError("Confirmation de création Direct requise.");
  const c = await pool.getConnection(); let locked = false;
  try {
    const lock = (await c.execute("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0];
    if (Number(lock[0]?.acquired) !== 1) throw new TypeError("Structure occupée.");
    locked = true;
    const before = await inspect(c), present = validate(before), schemaHash = hash(before);
    const proof = {source:"nap",mode:"approved-direct-schema",planHash,schemaHash,tables:tables.map(t=>t.name),before,sql,dataRowsWritten:false};
    if (input.phase === "prepare") return proof;
    if (input.planHash !== planHash || input.schemaHash !== schemaHash) throw new TypeError("Preuve de structure absente ou périmée.");
    const created=[];
    for (let i=0;i<tables.length;i++) if (!present[i]) { await c.query({sql:sql[i],timeout:30000}); created.push(tables[i].name); }
    if (!validate(await inspect(c)).every(Boolean)) throw new TypeError("Création Direct incomplète.");
    return {...proof,created,verified:true};
  } finally {
    let safe=true;
    if (locked) { try { await c.execute("SELECT RELEASE_LOCK('livepalmes_portal_schema')"); } catch { safe=false; } }
    if(safe)c.release();else c.destroy();
  }
}
module.exports = {tables,sql,hash,planHash,inspect,validate,approvedDirectSchema};
