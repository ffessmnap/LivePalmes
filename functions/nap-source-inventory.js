"use strict";
// Private structural inspection only: never reads records from these tables.
async function inspectSourceInventory(pool) {
  const [tables] = await pool.execute({ sql: "SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME LIMIT 201", timeout: 10000 });
  if (tables.length > 200) throw new RangeError("Inventaire trop volumineux.");
  const relevant = tables.map(row => row.TABLE_NAME).filter(name => ["perfs", "nageurs", "clubs"].includes(name) || /record|mpf|document|course|compet|categor/i.test(name));
  let columns = [], indexes = [];
  if (relevant.length) {
    const placeholders = relevant.map(() => "?").join(",");
    [columns] = await pool.execute({ sql: `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME, ORDINAL_POSITION LIMIT 501`, timeout: 10000 }, relevant);
    [indexes] = await pool.execute({ sql: `SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX LIMIT 501`, timeout: 10000 }, relevant);
    if (columns.length > 500 || indexes.length > 500) throw new RangeError("Structure trop volumineuse.");
  }
  const [competitionPlan] = await pool.execute({ sql: "EXPLAIN SELECT id, nageur, compet, course, tps FROM perfs WHERE compet = 2 ORDER BY id LIMIT 501", timeout: 10000 });
  return { source: "nap", mode: "structure-only", tables, relevant, columns, indexes, competitionPlan };
}
module.exports = { inspectSourceInventory };
