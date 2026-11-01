"use strict";
// Existing singleton, values or query bodies; no business change.
const { person } = require("./nap-swimmer-profile");
const { swimmerId } = require("./nap-swimmer-values");
const licenseState = require("./nap-license-state");
const mergeState = require("./nap-swimmer-merge-state");
async function searchPortalSwimmers(connection, query) {
  const result = await require("./nap-direct-search").searchDirectSwimmers(connection, query);
  if (!result.swimmers.length) return { ...result, swimmers: [] };
  const ids = result.swimmers.map(item => swimmerId(item.id));
  const [rows] = await connection.execute({ sql: `SELECT n.*,cl.abre_club,cl.nom_club,${licenseState.projection()},${mergeState.projection} FROM nageurs n LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${licenseState.join()} ${mergeState.join} WHERE n.id IN (${ids.map(() => "?").join(",")}) ORDER BY n.nom,n.prenom,n.date,n.id LIMIT 20`, timeout: 10000 }, ids);
  return { ...result, swimmers: rows.map(person) };
}

async function listPortalClubSwimmers(connection, clubId) {
  if (!/^\d{1,16}$/.test(String(clubId))) throw new TypeError("Club NAP invalide.");
  const [rows] = await connection.execute({ sql: `SELECT n.*,cl.abre_club,cl.nom_club,${licenseState.projection()},${mergeState.projection} FROM nageurs n FORCE INDEX (livepalmes_club_id) LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${licenseState.join()} ${mergeState.join} WHERE n.club=? AND m.swimmer_id IS NULL ORDER BY n.id LIMIT 801`, timeout: 10000 }, [String(clubId)]);
  if (rows.length > 800) throw new RangeError("Effectif superieur a 800 nageurs : pagination requise.");
  return rows.map(person);
}

async function listNationalSwimmers(connection, input = {}) {
  const cursor = input.cursor === undefined || input.cursor === null ? 0 : input.cursor;
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > 2147483647) throw new TypeError("Page nationale invalide.");
  const [rows] = await connection.execute({sql:`SELECT n.*,cl.abre_club,cl.nom_club,${licenseState.projection()},${mergeState.projection} FROM nageurs n FORCE INDEX (PRIMARY) LEFT JOIN clubs cl FORCE INDEX (PRIMARY) ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${licenseState.join()} ${mergeState.join} WHERE n.id>? ORDER BY n.id LIMIT 101`,timeout:10000},[cursor]);
  if (rows.length > 101) throw new RangeError("Page nationale trop volumineuse.");
  let previous = cursor;
  for (const row of rows) {
    if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) <= previous || Number(row.id) > 2147483647) throw new TypeError("Page nationale incoherente.");
    previous = Number(row.id);
  }
  const page = rows.slice(0,100), hasMore = rows.length > 100;
  return {ok:true,source:"nap",swimmers:page.map(person),hasMore,nextCursor:hasMore?Number(page.at(-1).id):null,sqlBudget:{queriesMax:1,rowsMax:101}};
}

module.exports = { searchPortalSwimmers, listPortalClubSwimmers, listNationalSwimmers };
