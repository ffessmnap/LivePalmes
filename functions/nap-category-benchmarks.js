"use strict";
const { CATEGORY_SQL, MAX_COURSE_ROWS } = require("./nap-direct-tops");
const { CURRENT_POOL_COURSES, MIN_TIME_BY_COURSE, SUPPORTED_POOLS } = require("./nap-performance-courses");
const { CATEGORY_ORDER } = require("./nap-performance-categories");
const { parseCompactTime } = require("./nap-performance-time");
const { swimmerIdentityKey } = require("./nap-performance-identity");
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");

const MAX_BESTS = 20000;
const cache = new Map();
function requestGroups(value) {
  if (typeof value !== "string" || value.length > 1600) throw new TypeError("Saisons invalides.");
  const groups = new Map();
  for (const part of value.split(";")) {
    const fields = part.split(":");
    const category = fields[0];
    if (fields.length !== 2 || !CATEGORY_ORDER.includes(category) || groups.has(category) ||
        !/^(?:19|20|21)\d\d(?:,(?:19|20|21)\d\d){0,120}$/.test(fields[1])) throw new TypeError("Catégorie ou saisons invalides.");
    groups.set(category, [...new Set(fields[1].split(",").map(Number))].sort((a,b) => a-b));
  }
  return groups;
}

function summarize(rows) {
  const groups = new Map();
  for (const row of rows) {
    const time = parseCompactTime(row.best);
    if (time == null) throw new Error("Temps statistique invalide.");
    const key = row.category + "|" + row.pool;
    if (!groups.has(key)) groups.set(key, new Map());
    const best = groups.get(key);
    const identity = swimmerIdentityKey(row.prenom, row.nom, row.birth) || String(row.swimmer_id);
    best.set(identity, Math.min(time, best.get(identity) ?? Infinity));
  }
  return [...groups].map(([key, best]) => {
    const [category, pool] = key.split("|");
    const count = best.size;
    if (count < 20) return {category, pool, count};
    const times = [...best.values()].sort((a,b) => a-b);
    function quantile(p) {
      const index = (count-1)*p, low = Math.floor(index);
      return Math.round(times[low] + (times[Math.ceil(index)]-times[low])*(index-low));
    }
    return {category, pool, count, lower:quantile(.25), median:quantile(.5), upper:quantile(.75)};
  });
}

async function load(pool, course, sex, basin, groups) {
  const [overflow] = await pool.execute({
    sql: `SELECT id FROM perfs FORCE INDEX (livepalmes_course_relais_tps) WHERE course=? AND relais=0 LIMIT 1 OFFSET ${MAX_COURSE_ROWS}`,
    timeout:10000
  }, [course]);
  if (overflow.length) throw new RangeError("Course trop volumineuse.");
  const time = "CAST(TRIM(p.tps) AS UNSIGNED)";
  const minimum = MIN_TIME_BY_COURSE[course];
  const values = [course, sex, Math.floor(minimum / 6000)*10000 + minimum % 6000];
  const scopes = [];
  for (const [category, years] of groups) {
    scopes.push("(category = ? AND season IN (" + years.map(() => "?").join(",") + "))");
    values.push(category, ...years);
  }
  if (basin) values.push(Number(basin));
  // The competition club is mandatory here. A current-club fallback would change the cohort.
  const sql = `SELECT category, pool, swimmer_id, nom, prenom, birth, MIN(native_time) AS best FROM (
    SELECT n.id AS swimmer_id,n.nom,n.prenom,n.date AS birth,c.bassin AS pool,
      YEAR(c.date)+(MONTH(c.date)>=9) AS season,${CATEGORY_SQL} AS category,${time} AS native_time
    FROM perfs p FORCE INDEX (livepalmes_course_relais_tps)
    STRAIGHT_JOIN competitions c ON c.id=p.compet
    STRAIGHT_JOIN nageurs n ON n.id=p.nageur
    STRAIGHT_JOIN clubs cl ON cl.num_club=p.club AND CAST(cl.num_club AS CHAR)=p.club
    WHERE p.course=? AND p.relais=0 AND TRIM(n.sexe)=? AND COALESCE(c.ld,0)<>1 AND c.id<>0
      AND cl.comite_club>0 AND cl.comite_club<>5 AND COALESCE(NULLIF(p.passage,''),'0')='0'
      AND c.bassin IN (25,33,50) AND TRIM(p.tps) REGEXP '^[0-9]+$'
      AND ${time} BETWEEN ? AND 995999 AND MOD(FLOOR(${time}/100),100)<60 AND ${visiblePerformanceSql()}
  ) eligible WHERE (${scopes.join(" OR ")}) ${basin ? "AND pool=?" : ""}
  GROUP BY category,pool,swimmer_id,nom,prenom,birth LIMIT ${MAX_BESTS+1}`;
  const [rows] = await pool.execute({sql, timeout:10000}, values);
  if (rows.length > MAX_BESTS) throw new RangeError("Comparaison trop volumineuse.");
  return {source:"nap", groups:summarize(rows)};
}

async function read(pool, input) {
  const {course, sex} = input, basin = input.pool || "";
  if (!CURRENT_POOL_COURSES.includes(course) || !["M","F"].includes(sex) ||
      (basin && !SUPPORTED_POOLS.includes(basin))) throw new TypeError("Filtres invalides.");
  const groups = requestGroups(input.groups);
  const key = JSON.stringify([course,sex,basin,[...groups].sort()]);
  const saved = cache.get(key);
  if (saved && saved.until > Date.now()) return saved.promise;
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  const promise = load(pool, course, sex, basin, groups);
  cache.set(key, {promise, until:Date.now()+60000});
  try { return await promise; }
  catch (error) { if (cache.get(key)?.promise === promise) cache.delete(key); throw error; }
}
module.exports = { read, summarize, requestGroups };
