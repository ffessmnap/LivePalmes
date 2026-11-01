"use strict";
// Existing singleton, values or query bodies; no business change.
function visiblePerformanceSql(alias = "p") {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw new TypeError("Alias de performance invalide.");
  return `NOT EXISTS (SELECT 1 FROM livepalmes_performance_visibility lpv FORCE INDEX (PRIMARY) WHERE lpv.performance_id=${alias}.id AND lpv.hidden=1)`;
}

module.exports = { visiblePerformanceSql };
