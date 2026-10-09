"use strict";
// One result per operation. NAP perfs is MyISAM: a durable before image and
// verified replay replace any claim of a cross-table transaction/rollback.
const { isDeepStrictEqual } = require("node:util");
const { COLUMNS, positiveId, nativeRow, fingerprint, planChange } = require("./nap-performance-change-plan");
const json = value => typeof value === "string" ? JSON.parse(value) : value;
const comparableRow = row => {
  const value = nativeRow(row);
  // mysql2 returns BIGINT as strings; validated numeric patches represent the
  // same integer and must remain recoverable after a lost response.
  for (const key of ["points", "newpoints"]) value[key] = String(value[key]);
  return value;
};
const sameRow = (a, b) => a === null || b === null ? a === b : isDeepStrictEqual(comparableRow(a), comparableRow(b));
const projection = COLUMNS.map(c => `\`${c}\``).join(",");
function createPerformanceWriter({ getPool, authorize }) {
  async function context(request) {
    const actor = await authorize(request);
    if (!actor || typeof actor.uid !== "string" || !actor.uid || actor.uid.length > 128) throw new TypeError("Auteur autorise requis.");
    return { actor, pool: await getPool() };
  }
  async function read(request, performanceId) {
    const { pool } = await context(request), id = positiveId(performanceId);
    const [rows] = await pool.execute({ sql: `SELECT ${projection} FROM perfs WHERE id=? LIMIT 1`, timeout: 10000 }, [id]);
    if (rows.length !== 1) throw new TypeError("Performance NAP introuvable.");
    const [visibility] = await pool.execute({ sql: "SELECT hidden FROM livepalmes_performance_visibility WHERE performance_id=? LIMIT 1", timeout: 10000 }, [id]);
    const hidden = Number(visibility[0]?.hidden || 0) === 1;
    return { source: "nap", row: nativeRow(rows[0]), hidden, fingerprint: fingerprint(rows[0], hidden) };
  }
  async function change(request, input) {
    const { actor, pool } = await context(request);
    const id = positiveId(input?.performanceId), operationId = input?.operationId;
    if (typeof operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) throw new TypeError("Identifiant d'operation requis.");
    const conn = await pool.getConnection();
    const q = async (sql, values = []) => (await conn.execute({ sql, timeout: 10000 }, values))[0];
    let named = false, tables = false;
    try {
      if (Number((await q("SELECT GET_LOCK(?,0) AS acquired", [`livepalmes_performance_${id}`]))[0]?.acquired) !== 1) throw new TypeError("Une correction est deja en cours.");
      named = true;
      // Trigger side effects would invalidate a one-row before image.
      const triggers = await q("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='perfs' LIMIT 1");
      if (triggers.length) throw new TypeError("Declencheur NAP a verifier avant correction.");
      await conn.query({ sql: "LOCK TABLES perfs WRITE, livepalmes_performance_visibility WRITE, livepalmes_performance_changes WRITE, clubs READ", timeout: 10000 });
      tables = true;
      const rows = await q(`SELECT ${projection} FROM perfs WHERE id=? LIMIT 1`, [id]);
      const visibility = await q("SELECT hidden FROM livepalmes_performance_visibility WHERE performance_id=? LIMIT 1", [id]);
      const hidden = Number(visibility[0]?.hidden || 0) === 1;
      const previous = await q("SELECT performance_id,action,reason,before_image,after_image,status,created_by FROM livepalmes_performance_changes WHERE id=? LIMIT 1", [operationId]);
      let plan, current = rows[0] ? nativeRow(rows[0]) : null;
      if (previous.length) {
        const journal = previous[0], before = json(journal.before_image), after = json(journal.after_image);
        if (Number(journal.performance_id) !== id || journal.created_by !== actor.uid) throw new TypeError("Identifiant d'operation deja utilise.");
        plan = planChange({ row: before.row, hidden: before.hidden, input, national: actor.national === true });
        if (journal.action !== plan.action || journal.reason !== plan.reason || !sameRow(after.row, plan.after) || after.hidden !== plan.hiddenAfter) throw new TypeError("Le contenu de l'operation a change.");
        if (sameRow(current, plan.after) && (plan.action === "delete" || hidden === plan.hiddenAfter)) {
          if (plan.action === "delete") await q("DELETE FROM livepalmes_performance_visibility WHERE performance_id=? LIMIT 1", [id]);
          if (journal.status !== "completed") await q("UPDATE livepalmes_performance_changes SET status='completed',updated_at=UTC_TIMESTAMP(6) WHERE id=? LIMIT 1", [operationId]);
          return { ok: true, source: "nap", replayed: true, operationId, deleted: plan.after === null, hidden: plan.hiddenAfter };
        }
        if (journal.status === "completed" || !sameRow(current, plan.before) || hidden !== plan.hiddenBefore) throw new TypeError("Le resultat a change depuis cette operation ; verification requise.");
      } else {
        if (!current) throw new TypeError("Performance NAP introuvable.");
        plan = planChange({ row: current, hidden, input, national: actor.national === true });
      }
      if (plan.requiredClubId) {
        const clubs = await q("SELECT num_club FROM clubs WHERE num_club=? LIMIT 1", [plan.requiredClubId]);
        if (clubs.length !== 1) throw new TypeError("Club NAP introuvable.");
      }
      if (!previous.length) {
        await q("INSERT INTO livepalmes_performance_changes (id,performance_id,competition_id,action,status,reason,before_image,after_image,created_at,created_by,updated_at) VALUES (?,?,?,?,'prepared',?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6))", [operationId,id,plan.competitionId,plan.action,plan.reason,JSON.stringify({ row: plan.before, hidden: plan.hiddenBefore }),JSON.stringify({ row: plan.after, hidden: plan.hiddenAfter }),actor.uid]);
      }
      if (plan.action === "correct") {
        const fields = COLUMNS.filter(c => plan.after[c] !== plan.before[c]);
        const result = await q(`UPDATE perfs SET ${fields.map(c => `\`${c}\`=?`).join(",")} WHERE id=? LIMIT 1`, [...fields.map(c => plan.after[c]), id]);
        if (result.affectedRows !== 1) throw new TypeError("Correction native non confirmee.");
      } else if (plan.action === "delete") {
        const result = await q("DELETE FROM perfs WHERE id=? LIMIT 1", [id]);
        if (result.affectedRows !== 1) throw new TypeError("Suppression native non confirmee.");
        await q("DELETE FROM livepalmes_performance_visibility WHERE performance_id=? LIMIT 1", [id]);
      } else {
        await q("INSERT INTO livepalmes_performance_visibility (performance_id,hidden,version,updated_at,updated_by) VALUES (?,?,1,UTC_TIMESTAMP(6),?) ON DUPLICATE KEY UPDATE hidden=VALUES(hidden),version=version+1,updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)", [id,plan.hiddenAfter ? 1 : 0,actor.uid]);
      }
      const verified = await q(`SELECT ${projection} FROM perfs WHERE id=? LIMIT 1`, [id]);
      const finalVisibility = await q("SELECT hidden FROM livepalmes_performance_visibility WHERE performance_id=? LIMIT 1", [id]);
      if (!sameRow(verified[0] || null, plan.after) || Boolean(Number(finalVisibility[0]?.hidden || 0)) !== plan.hiddenAfter) throw new TypeError("Verification native impossible ; reprise avec le meme identifiant requise.");
      await q("UPDATE livepalmes_performance_changes SET status='completed',updated_at=UTC_TIMESTAMP(6) WHERE id=? LIMIT 1", [operationId]);
      return { ok: true, source: "nap", replayed: false, operationId, deleted: plan.after === null, hidden: plan.hiddenAfter };
    } finally {
      try { if (tables) await conn.query({ sql: "UNLOCK TABLES", timeout: 10000 }); }
      finally { try { if (named) await q("SELECT RELEASE_LOCK(?)", [`livepalmes_performance_${id}`]); } finally { conn.release(); } }
    }
  }
  return { read, change };
}
module.exports = { createPerformanceWriter };
