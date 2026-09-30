"use strict";

// Sporting rules only: no I/O. Times are integer hundredths.
const COURSES = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
const DEVICES = ["france", "edf", "listing"];
const associations = require("./config/calendar-result-associations.json");
const copy = (value) => JSON.parse(JSON.stringify(value));
const text = (value) => String(value ?? "").trim();
const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
function fail(message) { throw new Error(message); }
function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) fail(`${label} invalide.`);
  return value;
}
function validateSeason(input, { incomplete = false } = {}) {
  const season = copy(input);
  integer(season.year, 2001, 2100, "Année");
  if (season.id !== `${season.year - 1}-${season.year}`) fail("Identifiant de saison invalide.");
  season.label = season.id.replace("-", "–");
  season.revision = Number.isInteger(season.revision) ? season.revision : 0;
  for (const device of DEVICES) {
    const profiles = season[device];
    if (!Array.isArray(profiles) || !profiles.length || profiles.length > 12) fail("Référentiels incomplets ou trop nombreux.");
    const ids = profiles.map((p) => p.id);
    if (new Set(ids).size !== ids.length) fail("Référentiels en double.");
    if (device === "france" && (ids.length !== 3 || !["C", "J", "S"].every((id) => ids.includes(id)))) fail("France : cadets, juniors et seniors requis.");
    for (const p of profiles) {
      if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(p.id) || !text(p.label) || p.label.length > 80) fail("Libellé ou identifiant invalide.");
      p.enabled = p.enabled !== false;
      integer(p.minAge, 0, 120, "Âge minimum"); integer(p.maxAge, p.minAge, 120, "Âge maximum");
      if (!date(p.startDate) || !date(p.endDate) || p.startDate > p.endDate || p.startDate < `${season.year - 1}-09-01` || p.endDate > `${season.year}-08-31`) fail("La période doit rester dans la saison, début et fin inclus.");
      if (!Array.isArray(p.pools) || p.pools.some((pool) => !["25", "50"].includes(pool))) fail("Bassins invalides.");
      if (!p.pools.length && !p.legacyUnrestricted) fail("Choisissez au moins un bassin.");
      p.electronicOnly = p.electronicOnly !== false;
      p.allowIntermediate = p.allowIntermediate !== false;
      if (!["all", "selected"].includes(p.competitionMode)) fail("Choix des compétitions invalide.");
      if (!Array.isArray(p.competitions) || p.competitions.length > 200 || p.competitions.some((c) => !text(c.id) || c.id.length > 128 || !text(c.name) || c.name.length > 200)) fail("Liste de compétitions invalide.");
      if (new Set(p.competitions.map((c) => c.id)).size !== p.competitions.length) fail("Compétitions en double.");
      if (!incomplete && p.enabled && p.competitionMode === "selected" && !p.competitions.length) fail(`${p.label} : sélectionnez les compétitions.`);
      if (!p.grid || typeof p.grid !== "object" || Array.isArray(p.grid)) fail("Grille invalide.");
      for (const [key, cell] of Object.entries(p.grid)) {
        const [sex, course] = key.split("|");
        if (key !== `${sex}|${course}` || !["F", "M"].includes(sex) || !COURSES.includes(course) || !cell || typeof cell !== "object") fail("Case de grille invalide.");
        if (cell.time !== null) integer(cell.time, 1, 359999, "Temps minimum");
        if (![null, 8, 16].includes(cell.top) || (device !== "france" && cell.top !== null)) fail("Top : 8 ou 16, réservé aux Championnats de France.");
        if (cell.time === null && cell.top === null) fail("Une course activée doit avoir un minimum ou un Top.");
      }
      if (p.sourceId && (device !== "listing" || !season.edf.some((source) => source.id === p.sourceId))) fail("Grille source introuvable dans cette saison.");
      if (!incomplete && p.enabled && !p.sourceId && !Object.keys(p.grid).length) fail(`${p.label} : définissez la grille ou désactivez le référentiel.`);
      p.excludeIf = p.excludeIf || [];
      if (!Array.isArray(p.excludeIf) || p.excludeIf.length > 11 || p.excludeIf.some((id) => id === p.id || !ids.includes(id))) fail("Priorité entre listes invalide.");
      const r = p.requirements;
      if (!r || !["any", "all"].includes(r.mode) || !Array.isArray(r.groups) || !r.groups.length || r.groups.length > 8) fail("Conditions de minima invalides.");
      for (const g of r.groups) {
        if (!Array.isArray(g.courses) || !g.courses.length || g.courses.some((c) => !COURSES.includes(c)) || new Set(g.courses).size !== g.courses.length) fail("Courses des conditions invalides.");
        integer(g.count, 1, g.courses.length, "Nombre de courses distinctes");
      }
    }
    // A priority graph must not contain a cycle.
    const visit = (id, path = []) => {
      if (path.includes(id)) fail("Priorités circulaires entre listes.");
      for (const next of profiles.find((p) => p.id === id).excludeIf) visit(next, [...path, id]);
    };
    ids.forEach((id) => visit(id));
  }
  if (Buffer.byteLength(JSON.stringify(season)) > 200000) fail("Configuration trop volumineuse.");
  return season;
}
function gridFor(season, profile) {
  return profile.sourceId ? season.edf.find((p) => p.id === profile.sourceId).grid : profile.grid;
}
function legacyFranceMatch(row) {
  const str = `${row.competition || ""} ${row.location || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return (str.includes("rennes") && str.includes("meeting")) || (str.includes("dijon") && str.includes("france") && str.includes("club")) || (str.includes("aix") && /world cup|coupe du monde|wcup/.test(str));
}
function admissible(row, profile, seasonYear) {
  if (!profile.enabled || row.active === false || ["hidden", "deleted"].includes(row.status) || !Number.isInteger(row.timeValue) || row.timeValue <= 0) return false;
  if (!row.date || row.date < profile.startDate || row.date > profile.endDate) return false;
  const born = Number(text(row.birthDate).slice(0, 4));
  if ((profile.minAge !== 0 || profile.maxAge !== 120) && (!born || seasonYear - born < profile.minAge || seasonYear - born > profile.maxAge)) return false;
  const pool = text(row.pool).toUpperCase().replace(/\s*M$/, "");
  if (profile.pools.length && !profile.pools.includes(pool)) return false;
  const chrono = text(row.chrono).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (profile.electronicOnly && !["e", "electronic", "electronique"].includes(chrono)) return false;
  if (!profile.allowIntermediate && row.isIntermediate) return false;
  if (profile.competitionMode === "all") return true;
  const ids = new Set(profile.competitions.map((c) => c.id));
  if ([row.competitionId, row.qualificationCompetitionId, row.importId].some((id) => ids.has(text(id)))) return true;
  if ([row.competitionId, row.qualificationCompetitionId].flatMap((id) => associations[text(id)] || []).some((rule) => ids.has(rule.calendarCompetitionId) && (!rule.categoryKind || (rule.categoryKind === "master" && /^M\d+\+$/.test(row.category)) || (rule.categoryKind === "minime" && row.category === "M")))) return true;
  return profile.legacyFranceNames === true && legacyFranceMatch(row);
}
function swimmerKey(row) {
  return text(row.swimmerIdentityKey || (row.firstName && row.lastName && row.birthDate ? `${row.lastName}|${row.firstName}|${row.birthDate}` : row.swimmerId || row.swimmer));
}
function compact(row) {
  const result = {};
  for (const key of ["swimmerId", "swimmerIdentityKey", "swimmer", "firstName", "lastName", "birthDate", "sex", "club", "competition", "location", "date", "course", "time", "timeValue"]) result[key] = row[key] ?? "";
  return result;
}
function createAccumulator(season, device) {
  return season[device].map((profile) => ({ profile, best: new Map() }));
}
function consume(accumulator, season, row) {
  if (!COURSES.includes(row.course) || !["F", "M"].includes(row.sex)) return;
  const identity = swimmerKey(row);
  if (!identity) return;
  for (const entry of accumulator) {
    const cell = gridFor(season, entry.profile)[`${row.sex}|${row.course}`];
    if (!cell || !admissible(row, entry.profile, season.year)) continue;
    // Retain all Top candidates; for time-only rules a 5% margin is sufficient.
    if (!cell.top && row.timeValue * 100 >= cell.time * 105 && row.timeValue > cell.time) continue;
    const key = `${row.sex}|${row.course}|${identity}`;
    const current = entry.best.get(key);
    if (!current || row.timeValue < current.timeValue || (row.timeValue === current.timeValue && row.date < current.date)) entry.best.set(key, compact(row));
    if (entry.best.size > 20000) fail("Trop de candidats pour une vue DTN : limitez les critères puis relancez.");
  }
}
function finish(accumulator, season, device) {
  const results = accumulator.map(({ profile, best }) => {
    const grid = gridFor(season, profile), athletes = new Map();
    const courses = Object.entries(grid).map(([key, cell]) => {
      const [sex, course] = key.split("|");
      const rows = [...best.values()].filter((r) => r.sex === sex && r.course === course).sort((a, b) => a.timeValue - b.timeValue || text(a.swimmer).localeCompare(text(b.swimmer), "fr"));
      let rank = 0, previous = -1;
      const ranked = rows.map((r, i) => {
        if (r.timeValue !== previous) rank = i + 1;
        previous = r.timeValue;
        return { ...r, rank, minimum: cell.time !== null && r.timeValue <= cell.time, top: cell.top !== null && rank <= cell.top };
      });
      const qualifiers = ranked.filter((r) => r.minimum || r.top);
      for (const row of qualifiers) {
        const id = `${row.sex}|${swimmerKey(row)}`;
        if (!athletes.has(id)) athletes.set(id, { ...row, qualifications: [] });
        athletes.get(id).qualifications.push({ ...row, threshold: cell.time });
      }
      const nearMinimum = cell.time ? ranked.filter((r) => !r.minimum && (r.timeValue - cell.time) * 100 < cell.time * 5) : [];
      return { sex, course, threshold: cell.time, topLimit: cell.top, qualifiers, nearMinimum };
    });
    const eligible = [...athletes.values()].filter((athlete) => {
      const courses = new Set(athlete.qualifications.map((q) => q.course));
      const checks = profile.requirements.groups.map((g) => g.courses.filter((c) => courses.has(c)).length >= g.count);
      return profile.requirements.mode === "all" ? checks.every(Boolean) : checks.some(Boolean);
    });
    return { id: profile.id, label: profile.label, courses, athletes: eligible };
  });
  // Exclusion refers to satisfying the higher criterion, before display exclusions.
  const qualified = new Map(results.map((r) => [r.id, new Set(r.athletes.map((a) => `${a.sex}|${swimmerKey(a)}`))]));
  for (const result of results) {
    const profile = season[device].find((p) => p.id === result.id);
    result.athletes = result.athletes.filter((a) => !profile.excludeIf.some((id) => qualified.get(id).has(`${a.sex}|${swimmerKey(a)}`)));
    if (device !== "france") {
      const ids = new Set(result.athletes.map((a) => `${a.sex}|${swimmerKey(a)}`));
      result.courses.forEach((c) => { c.qualifiers = c.qualifiers.filter((a) => ids.has(`${a.sex}|${swimmerKey(a)}`)); });
    }
  }
  return results;
}
module.exports = { COURSES, DEVICES, validateSeason, gridFor, admissible, swimmerKey, createAccumulator, consume, finish };
