"use strict";
// Budget before implementation: <=29 native statements, one scoped DELETE,
// journal before mutation; no participant, roster or entry option is removed.
const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const { positiveId } = require("./nap-direct-calendar");
const { nativeEqual } = require("./nap-native-compare");
const { COLUMNS } = require("./nap-team-leader-change");
const { indexed } = require("./nap-team-leader-create");
const { fingerprint } = require("./nap-portal-workspaces");
const { operationHash, authorityGuard } = require("./nap-portal-competition-change");
const { readNativeCompetition } = require("./nap-portal-competitions");
const { readNativeClubEntry } = require("./nap-portal-entries");

function emptyDossier(pack) {
  for (const key of ["inscriptions", "individual", "officials", "relays", "members"]) {
    if (!Array.isArray(pack[key])) throw new TypeError("Dossier NAP incomplet.");
    if (pack[key].length) throw new TypeError("Le dossier contient des participants : remplacez le chef d'equipe.");
  }
}
function beforeLeader(pack, input) {
  emptyDossier(pack);
  if (pack.leaders?.length !== 1 || Number(pack.leaders[0].id) !== input.leaderId) throw new TypeError("Chef d'equipe absent ou ambigu.");
  const row = pack.leaders[0];
  if (COLUMNS.some(key => !Object.hasOwn(row, key)) || Number(row.compet) !== input.competitionId || ![String(row.club), String(row.pourclub)].includes(input.clubId)) throw new TypeError("Chef d'equipe hors du dossier.");
  if (String(row.club) !== input.clubId || !["", "0", input.clubId].includes(String(row.pourclub ?? ""))) throw new TypeError("Declaration de chef d'equipe pour un autre club : verification IntraNAP requise avant retrait.");
  return Object.fromEntries(COLUMNS.map(key => [key, row[key]]));
}
function removalStatement(before, authority, deadline, clubId) {
  const scope = authorityGuard("chefsdequipe", authority), id = before.compet;
  return {
    sql: `DELETE FROM chefsdequipe WHERE id=? AND ${COLUMNS.slice(1).map(key => nativeEqual(`\`${key}\``)).join(" AND ")} AND ${scope.sql} AND UTC_TIMESTAMP() < ? AND NOT EXISTS (SELECT 1 FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) STRAIGHT_JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=e.nageur WHERE e.compet=? AND n.club=?) AND NOT EXISTS (SELECT 1 FROM officielsengager FORCE INDEX (livepalmes_compet_club_id) WHERE compet=? AND club=?) AND NOT EXISTS (SELECT 1 FROM engagements_relais FORCE INDEX (livepalmes_compet_club_id) WHERE compet=? AND club=?) LIMIT 1`,
    values: [before.id, ...COLUMNS.slice(1).map(key => before[key]), ...scope.values, deadline.replace("T", " ").replace("Z", ""), id, clubId, id, clubId, id, clubId]
  };
}
async function removeNativeTeamLeader(pool, input, audit, authorize, readers = { competition: readNativeCompetition, entry: readNativeClubEntry }) {
  if (typeof authorize !== "function" || !/^[1-9]\d{0,15}$/.test(String(input?.clubId)) || !Number.isSafeInteger(Number(input.clubId)) || typeof input?.actorUid !== "string" || !input.actorUid || input.actorUid.length > 128) throw new TypeError("Utilisateur et club autorises requis.");
  input = { ...input, competitionId: positiveId(input.competitionId), leaderId: positiveId(input.leaderId), clubId: String(input.clubId) };
  const operation = operationHash({ ...input, patch: { action: "remove-empty-team-leader", clubId: input.clubId, leaderId: input.leaderId } });
  const connection = await pool.getConnection(), query = async (sql, values = []) => (await connection.execute({ sql, timeout: 10000 }, values))[0];
  const lock = `lp-entry-${createHash("sha256").update(JSON.stringify([input.competitionId, input.clubId])).digest("hex").slice(0,40)}`;
  let locked = false, safe = true;
  try {
    if (Number((await query("SELECT GET_LOCK(?,0) AS acquired", [lock]))[0]?.acquired) !== 1) throw new TypeError("Dossier en cours d'enregistrement.");
    locked = true;
    const competition = await readers.competition(connection, input.competitionId, authorize);
    if (!competition || competition.event.entryStatus !== "open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now() >= Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    const pack = await readers.entry(connection, input, ({clubId}) => { if (String(clubId) !== input.clubId) throw new TypeError("Dossier hors du club autorise."); });
    emptyDossier(pack);
    const authority = { competitions: competition.nativeSnapshot.competition, compet_parametres: competition.nativeSnapshot.parameters };
    let target = await audit.read(operation);
    const saved = Boolean(target);
    if (target) {
      if (target.kind !== "native-team-leader-remove" || target.operation !== operation || target.actorUid !== input.actorUid || target.clubId !== input.clubId || target.competitionId !== input.competitionId || target.leaderId !== input.leaderId || target.expectedFingerprint !== input.expectedFingerprint || !isDeepStrictEqual(target.authority, authority) || !["prepared", "writing", "deleted"].includes(target.phase)) throw new TypeError("Sauvegarde de retrait incompatible.");
      beforeLeader({ ...pack, leaders: [target.before] }, input);
      if (fingerprint({ ...pack, leaders: [target.before] }) !== input.expectedFingerprint) throw new TypeError("Le dossier a change depuis la sauvegarde.");
      if (!pack.leaders.length && ["writing", "deleted"].includes(target.phase)) {
        await audit.complete(operation, { competitionId: input.competitionId, clubId: input.clubId, leaderId: input.leaderId, verified: true, entriesPreserved: true });
        return { ok: true, source: "nap", operation };
      }
      if (target.phase !== "prepared") throw new TypeError("Retrait a verifier avant une nouvelle tentative : sauvegarde conservee.");
    } else {
      if (fingerprint(pack) !== input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant le retrait.");
      target = { kind: "native-team-leader-remove", operation, actorUid: input.actorUid, clubId: input.clubId, competitionId: input.competitionId, leaderId: input.leaderId, expectedFingerprint: input.expectedFingerprint, authority, before: beforeLeader(pack, input), phase: "prepared" };
    }
    if (!isDeepStrictEqual(beforeLeader(pack, input), target.before)) throw new TypeError("Le chef d'equipe a change.");
    if ((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='chefsdequipe' LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier avant retrait.");
    const statement = removalStatement(target.before, authority, competition.event.entryDeadlineAt, input.clubId);
    if (!indexed(await query(`EXPLAIN ${statement.sql}`, statement.values))) throw new TypeError("Plan de retrait NAP a verifier.");
    if (!saved) await audit.prepare(operation, target);
    target = { ...target, phase: "writing" }; await audit.checkpoint(operation, target);
    const result = await query(statement.sql, statement.values);
    if (result.affectedRows !== 1) throw new TypeError("Le dossier ou sa fermeture a change. Retrait non confirme.");
    if ((await query("SELECT id FROM chefsdequipe WHERE id=? LIMIT 1", [input.leaderId])).length) throw new Error("Retrait a verifier : sauvegarde conservee.");
    await audit.checkpoint(operation, { ...target, phase: "deleted" });
    await audit.complete(operation, { competitionId: input.competitionId, clubId: input.clubId, leaderId: input.leaderId, verified: true, entriesPreserved: true });
    return { ok: true, source: "nap", operation };
  } finally {
    if (locked) { try { await query("SELECT RELEASE_LOCK(?) AS released", [lock]); } catch { safe = false; } }
    if (safe) connection.release(); else connection.destroy();
  }
}
module.exports = { emptyDossier, beforeLeader, removalStatement, removeNativeTeamLeader };
