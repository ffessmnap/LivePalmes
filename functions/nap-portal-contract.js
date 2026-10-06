"use strict";
// Private metadata diagnostic. No sporting rows, grant text or account names leave it.
const TABLES = ["nageurs", "clubs", "competitions", "compet_parametres", "compet_courses", "nageursengager", "perfs", "documents", "engagements", "engagements_relais", "engagements_relayeurs", "sessions", "qualifs", "qualif_types", "chefsdequipe", "officiels", "officielsengager", "forfait", "open_nageurs", "open_courses", "winpalme_sessions", "winpalme_courses", "winpalme_serie", "winpalme_lignes"];
function summarizePrivileges(grantRows) {
  const permissions = Object.fromEntries(TABLES.map(table => [table, { select: false, insert: false, update: false, delete: false }]));
  for (const row of grantRows) {
    const grant = String(Object.values(row)[0] || "");
    const match = grant.match(/^GRANT (.+?) ON (\*|`[^`]+`)\.(\*|`[^`]+`) TO /i);
    if (!match || !["*", "`nage-palmes`"].includes(match[2])) continue;
    const names = match[3] === "*" ? TABLES : TABLES.filter(table => match[3] === `\`${table}\``);
    const privileges = match[1].split(",").map(value => value.trim().toUpperCase());
    for (const table of names) for (const operation of Object.keys(permissions[table])) {
      if (privileges.includes("ALL PRIVILEGES") || privileges.includes(operation.toUpperCase())) permissions[table][operation] = true;
    }
  }
  return permissions;
}
async function inspectPortalContract(pool) {
  const query = async (sql, values = []) => (await pool.execute({ sql, timeout: 10000 }, values))[0];
  const grants = await query("SHOW GRANTS");
  if (grants.length > 100) throw new RangeError("Droits trop volumineux.");
  const placeholders = TABLES.map(() => "?").join(",");
  const tables = await query(`SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME LIMIT ${TABLES.length + 1}`, TABLES);
  const columns = await query(`SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 401`, TABLES);
  const indexes = await query(`SELECT TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX LIMIT 201`, TABLES);
  const triggers = await query(`SELECT EVENT_OBJECT_TABLE,EVENT_MANIPULATION,ACTION_TIMING FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN (${placeholders}) ORDER BY EVENT_OBJECT_TABLE,EVENT_MANIPULATION LIMIT 101`, TABLES);
  if (tables.length > TABLES.length || columns.length > 400 || indexes.length > 200 || triggers.length > 100) throw new RangeError("Contrat trop volumineux.");
  // Default literals can contain private legacy configuration. Publish only their presence.
  const safeColumns = columns.map(({ COLUMN_DEFAULT, ...column }) => ({ ...column, HAS_DEFAULT: COLUMN_DEFAULT !== null && COLUMN_DEFAULT !== undefined }));
  return { source: "nap", mode: "portal-contract-readonly", inspectedAt: new Date().toISOString(),
    permissions: summarizePrivileges(grants), tables, columns: safeColumns, indexes, triggers,
    missingTables: TABLES.filter(name => !tables.some(table => table.TABLE_NAME === name)),
    atomicAcrossTables: tables.length === TABLES.length && tables.every(table => table.ENGINE === "InnoDB"),
    writesExecuted: false };
}
module.exports = { TABLES, summarizePrivileges, inspectPortalContract };
