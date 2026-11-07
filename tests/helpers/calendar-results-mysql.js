"use strict";
// Called only by the existing guarded, isolated MySQL 5.7 fixture suite.
const assert = require("node:assert/strict"), { createHash } = require("node:crypto");
async function verifyCalendarResultSignal(pool) {
  const connection = await pool.getConnection();
  const tables = {
    perfs: "id int PRIMARY KEY,compet int,KEY livepalmes_compet_id(compet,id)",
    perfs_relais: "id int PRIMARY KEY,compet int,KEY livepalmes_compet_id(compet,id)",
    livepalmes_performance_visibility: "performance_id int PRIMARY KEY,hidden int",
    livepalmes_performance_imports: "id char(64) PRIMARY KEY,status varchar(20),metadata json",
    livepalmes_performance_import_rows: "import_id varchar(64),row_number int,status varchar(20),PRIMARY KEY(import_id,row_number)"
  };
  const q = async (sql, values = []) => (await connection.execute(sql, values))[0];
  try {
    let expression = require("../../functions/nap-calendar-event").SELECT_EVENT.split(",(EXISTS")[1].split(" AS has_results FROM")[0];
    expression = "(EXISTS" + expression;
    for (const [name, columns] of Object.entries(tables)) {
      await q(`CREATE TEMPORARY TABLE fixture_calendar_${name} (${columns}) ENGINE=InnoDB`);
      expression = expression.replaceAll(new RegExp("\\b" + name + "\\b", "g"), "fixture_calendar_" + name);
    }
    const hasResults = async () => Number((await q(`SELECT ${expression} AS present FROM (SELECT 2 AS id) c`))[0].present);
    const pointer = createHash("sha256").update('["nap-results-current",2]').digest("hex");
    const metadata = async value => q("REPLACE INTO fixture_calendar_livepalmes_performance_imports(id,status,metadata) VALUES (?,'current',?)", [pointer, JSON.stringify(value)]);
    assert.equal(await hasResults(), 0);
    await metadata({ currentImportId: "import" });
    assert.equal(await hasResults(), 0, "Journal alone does not publish results");
    await q("INSERT INTO fixture_calendar_livepalmes_performance_import_rows VALUES ('import',1,'perfs')");
    assert.equal(await hasResults(), 0, "Historical timed rows do not replace visible performances");
    await q("INSERT INTO fixture_calendar_livepalmes_performance_import_rows VALUES ('import',2,'status')");
    assert.equal(await hasResults(), 1, "Current non-timed statuses are real public results");
    for (const resultsDeleted of [true, 1, "true", "1"]) { await metadata({ currentImportId: "import", resultsDeleted }); assert.equal(await hasResults(), 0); }
    for (const resultsDeleted of [false, 0, "false", "0", null]) { await metadata({ currentImportId: "import", resultsDeleted }); assert.equal(await hasResults(), 1); }
    for (const value of [true, 1, "text", null, {}, { currentImportId: "other" }]) { await metadata(value); assert.equal(await hasResults(), 0); }
    await q("INSERT INTO fixture_calendar_perfs VALUES (1,2)"); assert.equal(await hasResults(), 1);
    await q("INSERT INTO fixture_calendar_livepalmes_performance_visibility VALUES (1,1)"); assert.equal(await hasResults(), 0);
    await q("INSERT INTO fixture_calendar_perfs_relais VALUES (1,2)"); assert.equal(await hasResults(), 1);
    console.log("Calendar result signal MySQL 5.7: actual indexed SQL, hidden/deleted/empty/status-only imports and JSON scalar types verified.");
  } finally {
    for (const name of Object.keys(tables)) await q(`DROP TEMPORARY TABLE IF EXISTS fixture_calendar_${name}`);
    connection.release();
  }
}
module.exports = { verifyCalendarResultSignal };
