// Private, paginated source export for the existing public-file builder.
// No SQL writes and no account, contact, credential or licence fields.
const SOURCES = Object.freeze({
  nageurs: { key: "id", columns: ["id", "nom", "prenom", "date", "sexe", "club"] },
  clubs: { key: "num_club", columns: ["num_club", "abre_club", "nom_club", "federal_club", "comite_club"] },
  competitions: { key: "id", columns: ["id", "libelle", "lieu", "date", "enddate", "bassin", "chrono", "ld"] },
  perfs: { key: "id", columns: ["id", "nageur", "compet", "course", "cat", "tps", "points", "newpoints", "passage", "club", "relais", "pid", "classement"] }
});
const PAGE_SIZE = 2000;

function exportRequest(input = {}) {
  if (typeof input.table !== "string" || !Object.hasOwn(SOURCES, input.table)) throw new TypeError("Source NAP inconnue.");
  const after = input.after === undefined ? -1 : Number(input.after);
  const through = Number(input.through);
  if (!Number.isSafeInteger(after) || after < -1 ||
      !Number.isSafeInteger(through) || through < 0 || after > through) {
    throw new TypeError("Bornes NAP invalides.");
  }
  return { table: input.table, after, through };
}

async function readExportPage(pool, input) {
  const { table, after, through } = exportRequest(input);
  const { key, columns } = SOURCES[table];
  // Identifiers come exclusively from the fixed whitelist above.
  const [rows] = await pool.execute({
    sql: `SELECT ${columns.map(c => "`" + c + "`").join(", ")} FROM \`${table}\` WHERE \`${key}\` > ? AND \`${key}\` <= ? ORDER BY \`${key}\` LIMIT ${PAGE_SIZE + 1}`,
    timeout: 10000
  }, [after, through]);
  const items = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const next = items.length ? Number(items[items.length - 1][key]) : after;
  if (items.length && (!Number.isSafeInteger(next) || next <= after || next > through)) {
    throw new Error("Curseur NAP incoherent.");
  }
  return { source: "nap", table, items, hasMore, next, through };
}

async function readSourceSchema(pool) {
  const [columns] = await pool.execute({
    sql: "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('nageurs', 'clubs', 'competitions', 'perfs') ORDER BY TABLE_NAME, ORDINAL_POSITION",
    timeout: 10000
  });
  const [indexes] = await pool.execute({
    sql: "SELECT TABLE_NAME, COLUMN_NAME, SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('nageurs', 'clubs', 'competitions', 'perfs') AND INDEX_NAME = 'PRIMARY' ORDER BY TABLE_NAME, SEQ_IN_INDEX",
    timeout: 10000
  });
  return { columns, indexes };
}

async function inspectExportSources(pool) {
  const { columns, indexes } = await readSourceSchema(pool);
  for (const [table, spec] of Object.entries(SOURCES)) {
    const actual = columns.filter(c => c.TABLE_NAME === table);
    if (!spec.columns.every(name => actual.some(c => c.COLUMN_NAME === name))) {
      throw new Error("Structure NAP incompatible.");
    }
    const key = actual.find(c => c.COLUMN_NAME === spec.key);
    const primary = indexes.filter(i => i.TABLE_NAME === table);
    if (key?.COLUMN_KEY !== "PRI" || !/^(?:tiny|small|medium|big)?int\b/i.test(key.COLUMN_TYPE) ||
        primary.length !== 1 || primary[0].COLUMN_NAME !== spec.key || Number(primary[0].SEQ_IN_INDEX) !== 1) {
      throw new Error("Cle de pagination NAP non verifiee.");
    }
  }
  const bounds = {};
  for (const [table, { key }] of Object.entries(SOURCES)) {
    const [rows] = await pool.execute({ sql: `SELECT MAX(\`${key}\`) AS through FROM \`${table}\``, timeout: 10000 });
    const through = rows[0]?.through === null ? null : Number(rows[0]?.through);
    if (through !== null && (!Number.isSafeInteger(through) || through < 0)) throw new Error("Borne NAP invalide.");
    bounds[table] = through;
  }
  return { source: "nap", bounds, pageSize: PAGE_SIZE };
}

module.exports = { SOURCES, PAGE_SIZE, exportRequest, readExportPage, inspectExportSources, readSourceSchema };
