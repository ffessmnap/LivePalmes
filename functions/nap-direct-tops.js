"use strict";
const {visiblePerformanceSql}=require("./nap-performance-visibility");
const rules = require("./nap-performance-normalization");
const { performanceRow } = require("./nap-direct-swimmer");
const MAX_COURSE_ROWS = 150000;
const MAX_CANDIDATES = 5000;
const MAX_LIMIT = 2000;
const season = "(YEAR(c.date) + IF(MONTH(c.date) >= 9, 1, 0))";
const age = `(${season} - YEAR(n.date))`;
function categorySql() {
  const bands = new Map();
  for (let year = 0; year <= 120; year++) {
    const key = rules.categoryFromAge(year);
    const band = bands.get(key) || [year, year]; band[1] = year; bands.set(key, band);
  }
  const sources = new Map();
  const codes = ["M30+"];
  for (const sex of ["F", "H"]) {
    for (let year = 30; year <= 80; year += 5) codes.push(`${sex}${year}+`);
    for (const marker of ["M", "V"]) for (let i = 0; i < 10; i++) codes.push(`${sex}${marker}${i}`);
  }
  for (const code of codes) {
    const category = rules.fallbackCategoryFromSource(code);
    if (category) sources.set(category, [...(sources.get(category) || []), code]);
  }
  const fallback = ["PO", "BE", "MI", "CA", "JU", "SE", "S1"].map(suffix => `WHEN BINARY RIGHT(UPPER(p.cat), 2) = '${suffix}' THEN '${rules.fallbackCategoryFromSource(`X${suffix}`)}'`);
  for (const [category, values] of sources) fallback.push(`WHEN BINARY UPPER(p.cat) IN (${values.map(value => `'${value}'`).join(",")}) THEN '${category}'`);
  return `(CASE WHEN YEAR(n.date) BETWEEN 1900 AND 2100 AND YEAR(c.date) > 0 AND ${age} BETWEEN 0 AND 120 THEN CASE ${[...bands].map(([category, [low, high]]) => `WHEN ${age} BETWEEN ${low} AND ${high} THEN '${category}'`).join(" ")} ELSE '' END ELSE CASE ${fallback.join(" ")} ELSE '' END END)`;
}
const CATEGORY_SQL = categorySql();
const FROM = "FROM perfs p FORCE INDEX (livepalmes_course_relais_tps) STRAIGHT_JOIN nageurs n ON n.id = p.nageur STRAIGHT_JOIN competitions c ON c.id = p.compet LEFT JOIN clubs cp ON cp.num_club = p.club AND CAST(cp.num_club AS CHAR) = p.club LEFT JOIN clubs cn ON cn.num_club = n.club AND CAST(cn.num_club AS CHAR) = n.club";
const PROJECTION = "p.id, p.course, p.cat, p.tps, p.passage, p.relais, n.id AS swimmer_id, n.nom, n.prenom, n.date AS birth_date, n.sexe, c.id AS competition_id, c.libelle, c.lieu, c.date, c.bassin, c.chrono, c.ld, COALESCE(cp.num_club, cn.num_club) AS selected_club, COALESCE(cp.abre_club, cn.abre_club) AS abre_club, COALESCE(cp.nom_club, cn.nom_club) AS nom_club, COALESCE(cp.comite_club, cn.comite_club) AS comite_club";
function filters(input) {
  const result = {};
  for (const field of ["course", "sex", "category", "season", "region", "pool", "birthYear"]) result[field] = String(input?.[field] || "");
  if (!rules.CURRENT_POOL_COURSES.includes(result.course) || !["M", "F"].includes(result.sex) || result.category && !rules.CATEGORY_ORDER.includes(result.category)) throw new TypeError("Filtres invalides.");
  if (result.pool && !["25", "50"].includes(result.pool) || result.season && !/^[1-9]\d{0,3}$/.test(result.season) || result.birthYear && !/^\d{4}$/.test(result.birthYear) || result.region && !/^\d{1,3}(,\d{1,3}){0,20}$/.test(result.region)) throw new TypeError("Filtres invalides.");
  result.limit = Number(input?.limit || 25);
  if (!Number.isSafeInteger(result.limit) || result.limit < 1 || result.limit > MAX_LIMIT) throw new TypeError("Limite invalide.");
  return result;
}
function queryFor(input, facet = false) {
  const f = filters(input);
  const encodedMinimum = Math.floor(rules.MIN_TIME_BY_COURSE[f.course] / 6000) * 10000 + rules.MIN_TIME_BY_COURSE[f.course] % 6000;
  const where = [visiblePerformanceSql(), "p.course = ?", "p.relais = 0", "TRIM(n.sexe) = ?", "COALESCE(c.ld, 0) <> 1", "c.id <> 0", "TRIM(p.tps) REGEXP '^[0-9]+$'", "CAST(TRIM(p.tps) AS UNSIGNED) BETWEEN ? AND 995999", "MOD(FLOOR(CAST(TRIM(p.tps) AS UNSIGNED) / 100), 100) < 60", `${CATEGORY_SQL} <> ''`];
  const values = [f.course, f.sex, encodedMinimum];
  if (f.category) { where.push(`${CATEGORY_SQL} = ?`); values.push(f.category); }
  if (f.season) { where.push(`${season} = ?`); values.push(Number(f.season)); }
  if (f.pool) { where.push("c.bassin = ?"); values.push(Number(f.pool)); }
  if (f.birthYear && !facet) { where.push("YEAR(n.date) = ?"); values.push(Number(f.birthYear)); }
  if (f.region) { const regions = f.region.split(",").map(Number); where.push(`COALESCE(cp.comite_club, cn.comite_club) IN (${regions.map(() => "?").join(",")})`); values.push(...regions); }
  const suffix = facet ? "GROUP BY YEAR(n.date) ORDER BY YEAR(n.date) DESC LIMIT 10001" : `ORDER BY CAST(TRIM(p.tps) AS UNSIGNED), c.date, p.id LIMIT ${MAX_CANDIDATES + 1}`;
  return { sql: `SELECT ${facet ? "YEAR(n.date) AS birthYear" : PROJECTION} ${FROM} WHERE ${where.join(" AND ")} ${suffix}`, values };
}
async function courseBudget(pool, course) {
  const [rows] = await pool.execute({ sql: `SELECT COUNT(*) AS rowCount FROM (SELECT id FROM perfs FORCE INDEX (livepalmes_course_relais_tps) WHERE course = ? AND relais = 0 LIMIT ${MAX_COURSE_ROWS + 1}) bounded_course`, timeout: 10000 }, [course]);
  if (Number(rows[0]?.rowCount) > MAX_COURSE_ROWS) throw new RangeError("Course trop volumineuse.");
}
function publicRow(raw) {
  const person = { id: String(raw.swimmer_id), firstName: rules.cleanText(raw.prenom), lastName: rules.cleanText(raw.nom), birthDate: raw.birth_date, sex: rules.cleanText(raw.sexe) };
  person.name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  person.identityKey = rules.swimmerIdentityKey(person.firstName, person.lastName, person.birthDate);
  return performanceRow(raw, person);
}
async function readDirectTop(pool, input) {
  const f = filters(input);
  await courseBudget(pool, f.course);
  const query = queryFor(f);
  const [raw] = await pool.execute({ sql: query.sql, timeout: 10000 }, query.values);
  const best = new Map();
  for (const value of raw) {
    const row = publicRow(value);
    if (!row) continue;
    const key = row.swimmerIdentityKey || row.swimmerId;
    const current = best.get(key);
    if (!current || row.timeValue < current.timeValue || row.timeValue === current.timeValue && String(row.date) < String(current.date)) best.set(key, row);
  }
  const ranked = [...best.values()].sort((a, b) => a.timeValue - b.timeValue || String(a.date).localeCompare(String(b.date)) || Number(a.id) - Number(b.id));
  if (raw.length > MAX_CANDIDATES) {
    const boundary = ranked[f.limit - 1];
    const lastTime = rules.parseCompactTime(raw[raw.length - 1].tps);
    if (!boundary || lastTime <= boundary.timeValue) throw new RangeError("Classement trop volumineux pour cette consultation.");
  }
  const facet = input?.years === "1" ? await readTopBirthYears(pool, f, true) : null;
  return { source: "nap", ...(facet ? { years: facet.years } : {}), readAt: new Date().toISOString(), rows: ranked.slice(0, f.limit).map((row, i) => ({ ...row, topRank: i + 1 })), hasMore: ranked.length > f.limit || raw.length > MAX_CANDIDATES, complete: raw.length <= MAX_CANDIDATES, total: raw.length <= MAX_CANDIDATES ? ranked.length : null };
}
async function readTopBirthYears(pool, input, budgetChecked = false) {
  const f = filters(input); if (!budgetChecked) await courseBudget(pool, f.course);
  const query = queryFor(f, true);
  const [rows] = await pool.execute({ sql: query.sql, timeout: 10000 }, query.values);
  if (rows.length > 10000) throw new RangeError("Annees trop nombreuses.");
  return { source: "nap", years: rows.filter(row => row.birthYear != null).map(row => String(row.birthYear).padStart(4, "0")).filter(year => /^\d{4}$/.test(year)) };
}
async function readTopMetadata(pool) {
  const [dates] = await pool.execute({ sql: "SELECT date FROM competitions ORDER BY id LIMIT 5001", timeout: 10000 });
  const [clubs] = await pool.execute({ sql: "SELECT comite_club FROM clubs ORDER BY num_club LIMIT 1001", timeout: 10000 });
  if (dates.length > 5000 || clubs.length > 1000) throw new RangeError("Referentiel trop volumineux.");
  return { source: "nap", seasons: [...new Set(dates.map(row => rules.competitionSeasonYear(row.date)).filter(Boolean))].sort((a, b) => b - a), regions: [...new Set(clubs.map(row => rules.committeeId(row.comite_club)).filter(Boolean))].map(id => ({ id, label: rules.committeeLabel(id) })) };
}
module.exports = { MAX_COURSE_ROWS, MAX_CANDIDATES, MAX_LIMIT, CATEGORY_SQL, filters, queryFor, readDirectTop, readTopBirthYears, readTopMetadata };
