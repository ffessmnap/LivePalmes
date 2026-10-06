"use strict";
// Fixed, additive schema operation authorized for the shared NAP portal.
// Never runs from an ordinary deployment or a public/client callable.
const { createHash } = require("node:crypto");
const column = (name, type, nullable = true, extra = "", defaultValue = null) => ({ name, type, nullable, extra, defaultValue });
const key = (name, columns, unique = false) => ({ name, columns, unique });
const tracking = [column("version", "bigint unsigned", false, "", "1"), column("created_at", "datetime(6)", false), column("updated_at", "datetime(6)", false), column("created_by", "varchar(128)", false), column("updated_by", "varchar(128)", false)];
const competitionKey = column("competition_id", "int", false);
const tables = [
  { name: "livepalmes_competition_options", columns: [competitionKey, column("address", "varchar(300)"), column("city", "varchar(120)"), column("organizer_label", "varchar(160)"), column("organizer_email", "varchar(255)"), column("whatsapp_url", "varchar(500)"), column("water_body_type", "varchar(32)"), column("canceled", "tinyint"), column("invited_region_ids", "json"), column("missing_time_mode", "varchar(32)"), column("max_events_per_swimmer", "int"), column("qualifications_enabled", "tinyint"), ...tracking], keys: [key("PRIMARY", ["competition_id"], true)] },
  { name: "livepalmes_course_options", columns: [competitionKey, column("event_code", "varchar(32)", false), column("category_restrictions", "json"), column("relay_mixed_mode", "varchar(32)"), column("multiple_relays_allowed", "tinyint"), ...tracking], keys: [key("PRIMARY", ["competition_id", "event_code"], true)] },
  { name: "livepalmes_competition_fees", columns: [competitionKey, column("enabled", "tinyint"), column("swimmer_fee", "decimal(10,2)"), column("individual_event_fee", "decimal(10,2)"), column("relay_fee", "decimal(10,2)"), column("helloasso_url", "varchar(300)"), ...tracking], keys: [key("PRIMARY", ["competition_id"], true)] },
  { name: "livepalmes_qualification_groups", columns: [column("id", "int", false, "auto_increment"), competitionKey, column("position", "int", false), column("label", "varchar(80)"), column("categories", "json"), column("mode", "varchar(8)"), column("start_date", "date"), column("end_date", "date"), column("electronic_only", "tinyint"), column("pools", "json"), column("competition_mode", "varchar(16)"), column("bonus_requires_selected", "tinyint"), ...tracking], keys: [key("PRIMARY", ["id"], true), key("competition_position", ["competition_id", "position"], true)] },
  { name: "livepalmes_qualification_standards", columns: [competitionKey, column("category", "varchar(10)", false), column("sex", "char(1)", false), column("event_code", "varchar(32)", false), column("minimum_centiseconds", "int"), ...tracking], keys: [key("PRIMARY", ["competition_id", "category", "sex", "event_code"], true)] },
  { name: "livepalmes_qualification_competitions", columns: [column("group_id", "int", false), column("qualifying_competition_id", "int", false), ...tracking], keys: [key("PRIMARY", ["group_id", "qualifying_competition_id"], true), key("qualifying_group", ["qualifying_competition_id", "group_id"])] },
  { name: "livepalmes_club_entry_options", columns: [competitionKey, column("club_id", "int", false), column("team_leader_waiver", "tinyint"), column("team_leader_contact", "json"), column("submission_metadata", "json"), ...tracking], keys: [key("PRIMARY", ["competition_id", "club_id"], true), key("club_competition", ["club_id", "competition_id"])] },
  { name: "livepalmes_competition_programs", columns: [competitionKey, column("program_sessions", "json"), ...tracking], keys: [key("PRIMARY", ["competition_id"], true)] }
];
function createSql(table) {
  const columns = table.columns.map(c => `\`${c.name}\` ${c.type} ${c.nullable ? "NULL" : "NOT NULL"}${c.defaultValue !== null ? ` DEFAULT ${c.defaultValue}` : ""}${c.extra ? ` ${c.extra}` : ""}`);
  const keys = table.keys.map(k => `${k.name === "PRIMARY" ? "PRIMARY KEY" : `${k.unique ? "UNIQUE " : ""}KEY \`${k.name}\``} (${k.columns.map(c => `\`${c}\``).join(",")})`);
  return `CREATE TABLE \`${table.name}\` (${[...columns, ...keys].join(",")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
}
const plan = tables.map(createSql);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash = digest(plan);
const normalizeType = value => String(value).toLowerCase().replace(/\b(bigint|int|tinyint)\(\d+\)/g, "$1");
function validateExisting(metadata) {
  for (const spec of tables) {
    const actual = metadata.tables.find(t => t.TABLE_NAME === spec.name);
    if (!actual) continue;
    if (actual.ENGINE !== "InnoDB" || actual.TABLE_COLLATION !== "utf8mb4_unicode_ci") throw new Error("Table complementaire incompatible.");
    const columns = metadata.columns.filter(c => c.TABLE_NAME === spec.name);
    if (columns.length !== spec.columns.length || columns.some((c, i) => {
      const expected = spec.columns[i];
      return c.COLUMN_NAME !== expected.name || normalizeType(c.COLUMN_TYPE) !== expected.type ||
        c.IS_NULLABLE !== (expected.nullable ? "YES" : "NO") || String(c.EXTRA || "") !== expected.extra ||
        (c.COLUMN_DEFAULT == null ? null : String(c.COLUMN_DEFAULT)) !== expected.defaultValue;
    })) throw new Error("Colonnes complementaires incompatibles.");
    const indexes = metadata.indexes.filter(k => k.TABLE_NAME === spec.name);
    if (indexes.length !== spec.keys.reduce((n, k) => n + k.columns.length, 0) || spec.keys.some(k => {
      const found = indexes.filter(i => i.INDEX_NAME === k.name).sort((a,b) => Number(a.SEQ_IN_INDEX) - Number(b.SEQ_IN_INDEX));
      return found.length !== k.columns.length || found.some((i, pos) => i.COLUMN_NAME !== k.columns[pos] || Number(i.NON_UNIQUE) !== (k.unique ? 0 : 1) || i.SUB_PART !== null);
    })) throw new Error("Index complementaires incompatibles.");
  }
}
async function inspect(connection) {
  const names = tables.map(t => t.name), placeholders = names.map(() => "?").join(",");
  const execute = async sql => (await connection.execute({sql, timeout:10000}, names))[0];
  const metadata = {
    tables: await execute(`SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME LIMIT 9`),
    columns: await execute(`SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 151`),
    indexes: await execute(`SELECT TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX LIMIT 31`)
  };
  if (metadata.tables.length > 8 || metadata.columns.length > 150 || metadata.indexes.length > 30) throw new Error("Structure complementaire trop volumineuse.");
  validateExisting(metadata);
  return metadata;
}
async function approvedPortalSchema(pool, input) {
  if (input?.confirmation !== "nap-create-livepalmes-portal-complements" || !["prepare", "apply"].includes(input?.phase)) throw new TypeError("Confirmation invalide.");
  const connection = await pool.getConnection();
  let locked = false;
  try {
    if (input.phase === "apply") {
      if (input.planHash !== planHash) throw new TypeError("Plan non confirme.");
      const [rows] = await connection.execute({sql:"SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired", timeout:10000});
      if (Number(rows[0]?.acquired) !== 1) throw new Error("Operation de structure deja en cours.");
      locked = true;
    }
    const metadata = await inspect(connection);
    const schemaHash = digest(metadata);
    const base = {source:"nap", mode:"approved-portal-schema", planHash, schemaHash, tables:tables.map(t=>t.name), before:metadata, sql:plan, dataRowsWritten:false};
    if (input.phase === "prepare") return base;
    if (input.schemaHash !== schemaHash) throw new TypeError("Structure modifiee depuis la sauvegarde.");
    const created = [];
    for (let i=0;i<tables.length;i++) {
      if (metadata.tables.some(t => t.TABLE_NAME === tables[i].name)) continue;
      await connection.query({sql:plan[i], timeout:30000});
      created.push(tables[i].name);
    }
    const after = await inspect(connection);
    if (after.tables.length !== tables.length) throw new Error("Verification incomplete.");
    return {...base, created, after, verified:true};
  } finally {
    try { if (locked) await connection.execute({sql:"SELECT RELEASE_LOCK('livepalmes_portal_schema')",timeout:10000}); }
    finally { connection.release(); }
  }
}
module.exports = { tables, plan, planHash, validateExisting, approvedPortalSchema };
