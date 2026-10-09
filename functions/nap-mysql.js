const mysql = require("mysql2/promise");
const {visiblePerformanceSql}=require("./nap-performance-visibility");

function napPoolOptions(password) {
  if (!password) {
    throw new Error("Configuration NAP incomplete : mot de passe requis.");
  }
  return {
    host: "nap.ffessm.fr", port: 3372, user: "nage-palmes", database: "nage-palmes",
    // TLS obligatoire ; verification du certificat desactivee selon le choix valide.
    password, ssl: { rejectUnauthorized: false },
    connectionLimit: 2, waitForConnections: true, queueLimit: 8,
    connectTimeout: 10000, dateStrings: true, supportBigNumbers: true,
    bigNumberStrings: true, multipleStatements: false, enableKeepAlive: true
  };
}

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

function createNapPool(password) {
  return mysql.createPool(napPoolOptions(password));
}

module.exports = { napPoolOptions, performanceRequest, readSwimmerPerformances, createNapPool };
