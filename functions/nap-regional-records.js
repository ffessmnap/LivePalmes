"use strict";
const { CATEGORY_SQL } = require("./nap-direct-tops");
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");
const { cleanText, swimmerIdentityKey } = require("./nap-performance-identity");
const { parseCompactTime, formatTime } = require("./nap-performance-time");
const { CURRENT_POOL_COURSES: courses, MIN_TIME_BY_COURSE } = require("./nap-performance-courses");
const { CATEGORY_ORDER } = require("./nap-performance-categories");

const MAX_CLUBS = 1000;
const MAX_SWIMMERS = 20000;
const MAX_PER_PATH = 150000;
const MAX_TIED_SWIMS = 1000;
const marks = values => values.map(() => "?").join(",");
const minimumSql = "CASE p.course " + courses.map(() => "WHEN ? THEN ?").join(" ") + " END";
const minimumValues = courses.flatMap(course => {
  const time = MIN_TIME_BY_COURSE[course];
  return [course, Math.floor(time / 6000) * 10000 + time % 6000];
});

async function load(pool, f) {
  const connection = await pool.getConnection();
  const select = async (sql, values) => (await connection.execute({ sql, timeout: 5000 }, values))[0];
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    const regions = new Set(f.region.split(",").map(Number));
    const clubs = await select(`SELECT num_club, comite_club FROM clubs FORCE INDEX (PRIMARY) ORDER BY num_club LIMIT ${MAX_CLUBS + 1}`, []);
    if (clubs.length > MAX_CLUBS) throw new RangeError("Comité trop volumineux.");
    const ids = clubs.filter(row => regions.has(Number(row.comite_club))).map(row => String(row.num_club));
    if (!ids.length) return [];
    const clubList = marks(ids);
    const roster = `FROM nageurs n FORCE INDEX (livepalmes_club_id) WHERE n.club IN (${clubList})`;
    const represented = `SELECT p.id FROM perfs p FORCE INDEX (livepalmes_club_id) WHERE p.club IN (${clubList})`;
    const current = `SELECT p.id FROM nageurs n FORCE INDEX (livepalmes_club_id)
      STRAIGHT_JOIN perfs p FORCE INDEX (nageur) ON p.nageur=n.id WHERE n.club IN (${clubList})`;
    const bounds = [`SELECT n.id ${roster} LIMIT 1 OFFSET ${MAX_SWIMMERS}`,
      `${represented} LIMIT 1 OFFSET ${MAX_PER_PATH}`, `${current} LIMIT 1 OFFSET ${MAX_PER_PATH}`];
    for (const sql of bounds) {
      if ((await select(sql, ids)).length) throw new RangeError("Région trop volumineuse.");
    }

    // The two indexed paths form a superset. TOP eligibility below resolves the
    // competition club first, including athletes who have changed regions.
    const candidates = `(${represented} UNION ${current}) candidates`;
    const from = `FROM ${candidates} STRAIGHT_JOIN perfs p FORCE INDEX (PRIMARY) ON p.id=candidates.id
      STRAIGHT_JOIN nageurs n ON n.id=p.nageur STRAIGHT_JOIN competitions c ON c.id=p.compet
      LEFT JOIN clubs cp ON cp.num_club=p.club AND CAST(cp.num_club AS CHAR)=p.club
      LEFT JOIN clubs cn ON cn.num_club=n.club AND CAST(cn.num_club AS CHAR)=n.club`;
    const time = "CAST(TRIM(p.tps) AS UNSIGNED)";
    const where = `${visiblePerformanceSql()} AND p.relais=0 AND TRIM(n.sexe)=? AND COALESCE(c.ld,0)<>1 AND c.id<>0
      AND TRIM(p.tps) REGEXP '^[0-9]+$' AND ${time} BETWEEN ${minimumSql} AND 995999
      AND MOD(FLOOR(${time}/100),100)<60 AND ${CATEGORY_SQL} ${f.category ? "= ?" : "<> ''"}
      AND COALESCE(cp.comite_club,cn.comite_club) IN (${marks([...regions])})`;
    const values = [f.sex, ...minimumValues, ...(f.category ? [f.category] : []), ...regions];
    const args = [...ids, ...ids, ...values];
    const eligible = from + " WHERE " + where;
    // Keep the minima and their holders in the same SELECT, including on native
    // tables whose storage engine does not implement transactional snapshots.
    const minima = `SELECT p.course, MIN(${time}) AS best ${eligible} GROUP BY p.course`;
    const tied = await select(`SELECT p.course,p.tps,n.id AS swimmer_id,n.nom,n.prenom,n.date AS birth_date,
      c.date,c.bassin,c.chrono,c.lieu,options.city,COALESCE(cp.abre_club,cn.abre_club) AS abre_club,COALESCE(cp.nom_club,cn.nom_club) AS nom_club ${from}
      JOIN (${minima}) winners ON winners.course=p.course AND winners.best=${time}
      LEFT JOIN livepalmes_competition_options options FORCE INDEX (PRIMARY) ON options.competition_id=c.id
      WHERE ${where} ORDER BY c.date,p.id LIMIT ${MAX_TIED_SWIMS + 1}`,
      [...ids, ...ids, ...args, ...values]);
    if (tied.length > MAX_TIED_SWIMS) throw new RangeError("Trop de performances ex æquo.");
    const holders = new Map();
    for (const swim of tied) {
      const first = cleanText(swim.prenom), last = cleanText(swim.nom);
      const identity = swimmerIdentityKey(first, last, swim.birth_date) || String(swim.swimmer_id);
      const key = JSON.stringify([swim.course, identity]);
      if (!holders.has(key)) holders.set(key, {
        course: swim.course, swimmer: [first, last].filter(Boolean).join(" "), club: cleanText(swim.abre_club || swim.nom_club),
        swimmerId: String(swim.swimmer_id), birthYear: String(swim.birth_date || "").match(/^\d{4}/)?.[0] || "",
        location: cleanText(swim.city) || cleanText(swim.lieu), chrono: cleanText(swim.chrono),
        time: formatTime(parseCompactTime(swim.tps)), date: swim.date, pool: Number(swim.bassin) > 0 ? String(swim.bassin) : ""
      });
    }
    return [...holders.values()];
  } finally {
    try { await connection.rollback(); }
    finally { connection.release(); }
  }
}

const cache = new Map();
async function read(pool, input) {
  const { sex, category = "", region } = input;
  if (!["M","F"].includes(sex) || (category !== "" && !CATEGORY_ORDER.includes(category)) ||
      typeof region !== "string" || !/^\d{1,3}(,\d{1,3}){0,20}$/.test(region)) throw new TypeError("Filtres régionaux invalides.");
  if (region.split(",").some(id => Number(id) === 0)) throw new TypeError("Région inconnue.");
  const normalizedRegion = [...new Set(region.split(",").map(Number))].sort((a,b) => a-b).join(",");
  const key = JSON.stringify([normalizedRegion, sex, category]);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.until) return cached.promise;
  const promise = load(pool, { sex, category, region: normalizedRegion }).then(rows => ({source:"nap", rows}));
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  cache.set(key, {promise, until:Date.now()+60000});
  try { return await promise; }
  catch (error) { if (cache.get(key)?.promise === promise) cache.delete(key); throw error; }
}

module.exports = { read };
