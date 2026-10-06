"use strict";
// Private lookup labels and publication flag counts only; no document content.
async function inspectCalendarContract(pool) {
  const references = {};
  for (const table of ["compet_level", "compet_type", "compet_types", "documents_types"]) {
    const [rows] = await pool.execute({ sql: `SELECT id, label FROM ${table} ORDER BY id LIMIT 51`, timeout: 10000 });
    if (rows.length > 50) throw new RangeError("Referentiel trop volumineux.");
    references[table] = rows;
  }
  // Read the native age bounds, rather than assuming that old category labels
  // correspond to the current LivePalmes age bands. Reference data only.
  const [categories] = await pool.execute({ sql: "SELECT id,abbr,title,age_d,age_f,sexe,record_categorie FROM categories FORCE INDEX (PRIMARY) ORDER BY id LIMIT 201", timeout: 10000 });
  if (categories.length > 200) throw new RangeError("Referentiel de categories trop volumineux.");
  references.categories = categories;
  const [documentCount] = await pool.execute({ sql: "SELECT COUNT(*) AS count FROM (SELECT id FROM documents ORDER BY id LIMIT 10001) bounded", timeout: 10000 });
  if (Number(documentCount[0]?.count) > 10000) throw new RangeError("Diagnostic de publication trop volumineux.");
  const [publicationFlags] = await pool.execute({ sql: "SELECT public, COUNT(*) AS count FROM (SELECT public FROM documents ORDER BY id LIMIT 10001) bounded GROUP BY public LIMIT 21", timeout: 10000 });
  return { source: "nap", mode: "calendar-contract", references, publicationFlags };
}
module.exports = { inspectCalendarContract };
