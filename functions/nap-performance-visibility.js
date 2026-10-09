"use strict";
// Primary-key antijoin inside each bounded sporting query, no network read per
// result. Administrative correction reads deliberately include hidden rows.
function visiblePerformanceSql(alias = "p") {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw new TypeError("Alias de performance invalide.");
  return `NOT EXISTS (SELECT 1 FROM livepalmes_performance_visibility lpv FORCE INDEX (PRIMARY) WHERE lpv.performance_id=${alias}.id AND lpv.hidden=1)`;
}
async function visibilityStamp(connection, { settled = false } = {}) {
  const [rows] = await connection.execute({ sql: "SELECT performance_id,version,DATE_FORMAT(updated_at,'%Y-%m-%d %H:%i:%s.%f') AS changed_at,TIMESTAMPDIFF(SECOND,updated_at,UTC_TIMESTAMP(6)) AS age_seconds FROM livepalmes_performance_visibility FORCE INDEX (livepalmes_visibility_updated) ORDER BY updated_at DESC,performance_id DESC LIMIT 1", timeout: 10000 });
  if (!Array.isArray(rows) || rows.length > 1) throw new TypeError("Suivi du masquage NAP indisponible.");
  if (!rows.length) return null;
  const row = rows[0];
  if (!Number.isSafeInteger(Number(row.performance_id)) || Number(row.performance_id) < 1 || !/^[1-9]\d*$/.test(String(row.version)) || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(row.changed_at) || !Number.isSafeInteger(Number(row.age_seconds)) || Number(row.age_seconds) < 0) throw new TypeError("Suivi du masquage NAP indisponible.");
  if (settled && Number(row.age_seconds) < 2) throw new TypeError("Le masquage vient de changer. Reessayez dans quelques secondes.");
  return [String(row.performance_id), String(row.version), row.changed_at];
}
module.exports = { visiblePerformanceSql, visibilityStamp };
