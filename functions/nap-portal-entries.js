"use strict";
// Native entry dossier. Reading does not reconcile, remove or rewrite old entries.
const { positiveId } = require("./nap-direct-calendar");
const { bounded } = require("./nap-portal-competitions");
const { listPortalClubSwimmers } = require("./nap-portal-swimmers");
const LIMITS = Object.freeze({ swimmers: 800, inscriptions: 800, individual: 5000, relays: 200, members: 1200, officials: 200, leaders: 20 });
const placeholders = rows => rows.map(() => "?").join(",");
async function readNativeClubEntry(connection, input, authorize) {
  if (typeof authorize !== "function") throw new TypeError("Controle du dossier club requis.");
  const competitionId = positiveId(input?.competitionId);
  const clubId = String(input?.clubId ?? "");
  if (!/^\d{1,16}$/.test(clubId)) throw new TypeError("Club NAP invalide.");
  // The caller must check the authenticated club/scope and native competition.
  // No identity or entry is fetched until that check has completed.
  await authorize({ competitionId, clubId });
  const swimmers = await listPortalClubSwimmers(connection, clubId);
  const swimmerIds = swimmers.map(swimmer => positiveId(swimmer.id));
  const inscriptions = swimmerIds.length ? await bounded(connection,
    `SELECT id,nageur,compet FROM nageursengager FORCE INDEX (livepalmes_compet_nageur_id) WHERE compet=? AND nageur IN (${placeholders(swimmerIds)}) ORDER BY nageur,id LIMIT 801`,
    [competitionId, ...swimmerIds], LIMITS.inscriptions) : [];
  const inscriptionIds = inscriptions.map(row => positiveId(row.id));
  const individual = inscriptionIds.length ? await bounded(connection,
    `SELECT id,engagement,course,tps FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${placeholders(inscriptionIds)}) ORDER BY engagement,course,id LIMIT 5001`,
    inscriptionIds, LIMITS.individual) : [];
  const relays = await bounded(connection,
    "SELECT r.id,r.compet,r.categorie,r.club,r.course,r.tps,d.course AS course_code,d.sexe,d.relais FROM engagements_relais r FORCE INDEX (livepalmes_compet_club_id) LEFT JOIN course_dispo d ON d.id=r.course WHERE r.compet=? AND r.club=? ORDER BY r.id LIMIT 201",
    [competitionId, clubId], LIMITS.relays);
  const relayIds = relays.map(row => positiveId(row.id));
  const members = relayIds.length ? await bounded(connection,
    `SELECT m.id,m.relais,m.pos,m.nageur,n.nom,n.prenom,n.date,n.sexe,n.club FROM engagements_relayeurs m FORCE INDEX (livepalmes_relais_pos_id) LEFT JOIN nageurs n ON n.id=m.nageur WHERE m.relais IN (${placeholders(relayIds)}) ORDER BY m.relais,m.pos,m.id LIMIT 1201`,
    relayIds, LIMITS.members) : [];
  const officials = await bounded(connection,
    "SELECT e.id,e.compet,e.officiel,e.club,o.nom,o.prenom,o.date FROM officielsengager e FORCE INDEX (livepalmes_compet_club_id) LEFT JOIN officiels o ON o.id=e.officiel WHERE e.compet=? AND e.club=? ORDER BY e.id LIMIT 201",
    [competitionId, clubId], LIMITS.officials);
  // 'pourclub' is used by IntraNAP for a leader representing another club.
  // Keep both native fields; never turn a missing leader into a waiver.
  const leaders = await bounded(connection,
    "SELECT id,compet,nom,prenom,date,club,pourclub FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? AND (club=? OR pourclub=?) ORDER BY id LIMIT 21",
    [competitionId, clubId, clubId], LIMITS.leaders);
  const options = await bounded(connection,
    "SELECT * FROM livepalmes_club_entry_options WHERE competition_id=? AND club_id=? LIMIT 1", [competitionId, clubId], 1);
  return { source: "nap", competitionId: String(competitionId), clubId, readAt: new Date().toISOString(),
    swimmers, inscriptions, individual, relays, members, officials, leaders, options: options[0] || null };
}
// Private proof on one existing dossier. Neither names nor contacts nor native
// identifiers of people leave this diagnostic; it performs no data writes.
async function inspectNativeClubEntry(connection) {
  const plans = []; let queryIndex = 0;
  const checked = { execute: async (query, values) => {
    queryIndex++;
    const [plan] = await connection.execute({sql:`EXPLAIN ${query.sql}`,timeout:10000}, values);
    const safe = plan.map(({table,type,key,rows,Extra}) => ({table,type,key,rows,Extra}));
    plans.push(safe);
    const provenEmpty = row => row.table == null && row.type == null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table)$/i.test(String(row.Extra || ""));
    if (!plan.length || plan.some(row => !provenEmpty(row) && !String(row.table).startsWith("<") && !["system","const"].includes(row.type) && !(row.rows != null && Number(row.rows) === 0) && (row.type === "ALL" || !row.key))) throw Object.assign(new Error("non-indexed-native-entry"),{code:"NAP_NON_INDEXED"});
    return connection.execute(query, values);
  } };
  try {
    const [clubs] = await checked.execute({sql:"SELECT n.club FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) LEFT JOIN nageurs n ON n.id=e.nageur WHERE e.compet=? ORDER BY e.nageur,e.id LIMIT 1",timeout:10000},[5140]);
    if (!clubs.length || !/^\d{1,16}$/.test(String(clubs[0].club ?? ""))) return {source:"nap",mode:"portal-entry-contract-readonly",present:false,complete:true,plans,writesExecuted:false};
    const result = await readNativeClubEntry(checked,{competitionId:5140,clubId:String(clubs[0].club)},()=>{});
    const directory = await require("./nap-club-people").readClubPeople(checked,{clubId:String(clubs[0].club)},()=>{});
    return {source:"nap",mode:"portal-entry-contract-readonly",present:true,complete:true,plans,
    counts:Object.fromEntries(["swimmers","inscriptions","individual","relays","members","officials","leaders"].map(key=>[key,result[key].length])),
      optionsPresent:result.options !== null,directory:{rows:directory.people.length,hasMore:directory.hasMore,queriesExecuted:directory.sqlBudget.queriesExecuted},writesExecuted:false};
  } catch (error) {
    // Keep partial plans, never SQL/driver messages, identities or credentials.
    return {source:"nap",mode:"portal-entry-contract-readonly",complete:false,plans,writesExecuted:false,
      errors:[{queryIndex,reason:({NAP_NON_INDEXED:"non-indexed",ER_BAD_FIELD_ERROR:"column",ER_PARSE_ERROR:"syntax",ER_NO_SUCH_TABLE:"table"})[error.code] || (error instanceof RangeError ? "volume" : "unavailable")}]};
  }
}
module.exports = { LIMITS, readNativeClubEntry, inspectNativeClubEntry };
