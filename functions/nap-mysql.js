const { napPoolOptions, createNapPool } = require("./nap-connection");
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");



function performanceRequest(data = {}) {
  const swimmerId = data.swimmerId;
  const afterId = data.afterId === undefined ? null : data.afterId;
  if (!Number.isSafeInteger(swimmerId) || swimmerId <= 0 || swimmerId > 2147483647 ||
      (afterId !== null && (!Number.isSafeInteger(afterId) || afterId < 0 || afterId > 2147483647))) {
    throw new TypeError("Identifiants NAP entiers requis.");
  }
  return { swimmerId, afterId };
}

async function readSwimmerPerformances(pool, input) {
  const { swimmerId, afterId } = performanceRequest(input);
  const [rows] = await pool.execute({
    sql: `SELECT id, nageur, compet, course, cat, tps, points, newpoints, passage, club, relais, pid, classement FROM perfs WHERE ${visiblePerformanceSql('perfs')} AND nageur = ? AND id > ? ORDER BY id LIMIT 51`,
    timeout: 10000
  }, [swimmerId, afterId === null ? -1 : afterId]);
  const hasMore = rows.length > 50;
  const items = rows.slice(0, 50);
  return { source: "nap", items, hasMore, nextAfterId: hasMore ? items[items.length - 1].id : null };
}



module.exports = { napPoolOptions, performanceRequest, readSwimmerPerformances, createNapPool };
