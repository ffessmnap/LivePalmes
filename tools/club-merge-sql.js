"use strict";
const p = require("./club-merge-plan"), crypto = require("node:crypto");
const quote = name => { if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)) p.fail("SQL_IDENTIFIER"); return "`"+name+"`"; };
const slots = values => values.map(() => "?").join(",");
const projectionTable = "livepalmes_club_account_emails";
function adapter(connection) {
  const q = async (sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  async function metadata() {
    const names = [...p.tables,projectionTable];
    const columns = await q(`SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,DATA_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,ORDINAL_POSITION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${slots(names)}) ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 1001`,names);
    const indexes = await q(`SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${slots(names)}) ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX LIMIT 501`,names);
    const engines = await q(`SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${slots(names)}) ORDER BY TABLE_NAME LIMIT 18`,names);
    if (columns.length >= 1001 || indexes.length >= 501 || engines.length !== names.length || engines.some(r => !["MyISAM","InnoDB"].includes(r.ENGINE))) p.fail("SCHEMA_BUDGET_OR_ENGINE");
    if ((await q(`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN (${slots(names)}) LIMIT 1`,names)).length) p.fail("UNREVIEWED_SQL_TRIGGER");
    if ((await q(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND (TABLE_NAME IN (${slots(names)}) OR REFERENCED_TABLE_NAME='clubs') LIMIT 1`,names)).length) p.fail("UNREVIEWED_FOREIGN_KEY");
    const references = await q("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME IN ('club','club_id','entry_club','pourclub') ORDER BY TABLE_NAME,COLUMN_NAME LIMIT 101");
    const allowed = new Set([...p.relations.flatMap(r => r[1].map(f => r[0]+"."+f)),projectionTable+".club_id","records.club"]);
    // records.club is the audited historical display label, never a club PK.
    if (references.length >= 101 || references.some(r => !allowed.has(r.TABLE_NAME+"."+r.COLUMN_NAME))) p.fail("NEW_SQL_CLUB_REFERENCE");
    for (const [table,fields,pk,required] of [["clubs",["num_club"],["num_club"],["PRIMARY"]],...p.relations]) {
      const ix = indexes.filter(r => r.TABLE_NAME === table);
      if (ix.filter(r => r.INDEX_NAME === "PRIMARY").map(r => r.COLUMN_NAME).join() !== pk.join() || ix.some(r => Number(r.NON_UNIQUE) === 0 && r.INDEX_NAME !== "PRIMARY")) p.fail("PRIMARY_OR_UNIQUE_INDEX_CHANGED");
      fields.forEach((field,i) => { if (!ix.some(r => r.INDEX_NAME === required[i] && Number(r.SEQ_IN_INDEX) === 1 && r.COLUMN_NAME === field && r.SUB_PART == null)) p.fail("CLUB_INDEX_MISSING"); });
      if (columns.filter(r => r.TABLE_NAME === table).some(r => /generated/i.test(r.EXTRA || ""))) p.fail("GENERATED_COLUMN_UNREVIEWED");
    }
    return {columns,indexes,engines,references};
  }
  async function rows(meta,{includeProjection=true}={}) {
    const result = {};
    for (const [table,fields,pk,ix] of [["clubs",["num_club"],["num_club"],["PRIMARY"]],...p.relations,[projectionTable,["club_id"],["firebase_uid"],["club_status"]]]) {
      if (table === projectionTable && !includeProjection) continue;
      const found = new Map();
      for (let n=0;n<fields.length;n++) {
        const type = meta.columns.find(c => c.TABLE_NAME === table && c.COLUMN_NAME === fields[n])?.DATA_TYPE;
        if (!type) p.fail("CLUB_COLUMN_MISSING");
        const values = /int/.test(type) ? p.ids.map(Number) : p.ids;
        const read = await q(`SELECT * FROM ${quote(table)} FORCE INDEX (${quote(ix[n])}) WHERE ${quote(fields[n])} IN (${slots(values)}) LIMIT 10001`,values);
        if (read.length >= 10001) p.fail("SQL_READ_LIMIT");
        for (const row of read) found.set(p.key(row,pk),row);
      }
      result[table] = [...found.values()];
      if (result[table].length >= 10001) p.fail("SQL_READ_LIMIT");
    }
    return result;
  }
  async function imports(sql) {
    const comps = [...new Set(Object.values(sql).flat().map(r => r.compet ?? r.competition_id).filter(v => v != null).map(String))];
    if (comps.length > 1000) p.fail("COMPETITION_CHECK_LIMIT");
    if (comps.some(v => !/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) <= 0 || Number(v) > 2147483647)) p.fail("COMPETITION_ID_RANGE");
    if (!comps.length) return [];
    const hashes = comps.map(c => crypto.createHash("sha256").update(JSON.stringify(["nap-results-current",Number(c)])).digest("hex"));
    const rows = await q(`SELECT id,status,metadata FROM livepalmes_performance_imports FORCE INDEX (PRIMARY) WHERE id IN (${slots(hashes)}) LIMIT 1001`,hashes);
    if (rows.length >= 1001) p.fail("IMPORT_CHECK_LIMIT");
    for (const row of rows) {
      const data = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
      if (data?.activeImportId || !["current","completed"].includes(row.status)) p.fail("IMPORT_PENDING");
    }
    return rows;
  }
  async function historical() {
    const labels = await q("SELECT id,club FROM records FORCE INDEX (PRIMARY) WHERE id>0 ORDER BY id LIMIT 1001");
    if (labels.length >= 1001 || labels.some(row => p.mapping.has(String(row.club)))) p.fail("HISTORICAL_RECORD_DEPENDENCY_CHANGED");
    const rows = await q("SELECT c.revision,OCTET_LENGTH(v.payload) AS bytes,IF(OCTET_LENGTH(v.payload)<=2097152,v.payload,NULL) AS payload FROM livepalmes_records_current c FORCE INDEX (PRIMARY) JOIN livepalmes_records_versions v FORCE INDEX (PRIMARY) ON v.revision=c.revision WHERE c.id=1 LIMIT 1");
    if (rows.length !== 1 || !rows[0].payload) p.fail("CURRENT_RECORDS_UNAVAILABLE_OR_TOO_LARGE");
    const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
    if (!Array.isArray(payload.records) || !Array.isArray(payload.franceRecords)) p.fail("CURRENT_RECORDS_FORMAT_CHANGED");
    if ([...payload.records,...payload.franceRecords].some(row => p.mapping.has(String(row.clubId)) || p.mapping.has(String(row.club)))) p.fail("CURRENT_RECORDS_CLUB_ID_DEPENDENCY");
    return {labels,revision:rows[0].revision,payloadDigest:p.digest(payload)};
  }
  function where(row) {
    const fields = Object.keys(row);
    return {sql:fields.map(f => `CAST(${quote(f)} AS BINARY) <=> CAST(? AS BINARY)`).join(" AND "),values:fields.map(f => row[f])};
  }
  async function mutate(op,direction) {
    const from = direction === "restore" ? op.after : op.before, to = direction === "restore" ? op.before : op.after;
    if (!from) {
      const fields = Object.keys(to);
      const r = await q(`INSERT INTO ${quote(op.table)} (${fields.map(quote).join(",")}) VALUES (${slots(fields)})`,fields.map(f => to[f]));
      if (r.affectedRows !== 1) p.fail("RESTORE_INSERT_FAILED");
    } else {
      const match = where(from);
      // An ordinary equality on the complete PK keeps the CAS indexable. The
      // binary predicates additionally reject collation-equivalent drift.
      match.sql = op.pk.map(f => quote(f)+"=?").join(" AND ")+" AND "+match.sql;
      match.values.unshift(...op.pk.map(f => from[f]));
      const fields = to ? Object.keys(to).filter(f => !p.equal(to[f],from[f])) : [];
      const r = to ? await q(`UPDATE ${quote(op.table)} SET ${fields.map(f => quote(f)+"=?").join(",")} WHERE ${match.sql} LIMIT 1`,[...fields.map(f => to[f]),...match.values]) : await q(`DELETE FROM ${quote(op.table)} WHERE ${match.sql} LIMIT 1`,match.values);
      if (r.affectedRows !== 1) p.fail("SQL_COMPARE_AND_SWAP_FAILED");
    }
  }
  async function locked(task) {
    // No Firebase calls, projection writes, backup upload or remote wait here.
    let timer;
    try {
      await q("SET SESSION lock_wait_timeout=10");
      await q("SET autocommit=1");
      await connection.query({sql:"LOCK TABLES "+p.tables.map(t => quote(t)+" WRITE").join(", ")+", `livepalmes_performance_imports` READ, `records` READ, `livepalmes_records_current` AS c READ, `livepalmes_records_versions` AS v READ",timeout:12000});
      timer = setTimeout(() => connection.destroy(),60000);
      return await task();
    } finally {
      clearTimeout(timer);
      await connection.query({sql:"UNLOCK TABLES",timeout:10000}).catch(() => connection.destroy());
    }
  }
  return {metadata,rows,imports,historical,mutate,locked,q};
}
module.exports = {adapter,quote,projectionTable};
