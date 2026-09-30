(function (root) {
  "use strict";
  const COURSES = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function display(value) {
    if (!value) return "";
    return `${String(Math.floor(value / 6000)).padStart(2, "0")}:${String(Math.floor(value / 100) % 60).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}`;
  }
  function parse(raw) {
    if (raw === "" || raw == null) return null;
    if (typeof raw === "number" && raw > 0 && raw < 1) return parse(display(Math.round(raw * 8640000)));
    let value = String(raw).trim().replace(",", ".");
    if (/^\d{1,2}\.\d{1,2}$/.test(value)) value = `00:${value.padStart(value.indexOf(".") === 1 ? value.length + 1 : value.length, "0")}`;
    if (/^\d{1,6}$/.test(value)) { value = value.padStart(6, "0"); value = `${value.slice(0, 2)}:${value.slice(2, 4)}.${value.slice(4)}`; }
    const match = value.match(/^(\d{1,2}):(\d{2})\.(\d{1,2})$/);
    if (!match || Number(match[2]) >= 60) throw new Error("Temps invalide : utilisez 01:23.45.");
    const time = Number(match[1]) * 6000 + Number(match[2]) * 100 + Number(match[3].padEnd(2, "0"));
    if (time <= 0 || time >= 359999) throw new Error("Temps hors limites.");
    return time;
  }
  function preview(profiles, rows, device, replace) {
    const next = clone(profiles), errors = [], seen = new Set();
    if (replace) next.filter((p) => !p.sourceId).forEach((p) => { p.grid = {}; });
    const headers = device === "france" ? ["Catégorie", "Sexe", "Course", "Temps minimum", "Top", "Action"] : ["Référentiel", "Sexe", "Course", "Temps minimum", "Action"];
    if (JSON.stringify(rows[0]) !== JSON.stringify(headers)) return { next, errors: ["Colonnes incorrectes : utilisez la trame de ce dispositif."], changes: [] };
    if (rows.length > 1000) errors.push("La trame dépasse 1 000 lignes.");
    rows.slice(1).forEach((row, i) => {
      if (!row.some((v) => String(v ?? "").trim())) return;
      try {
        const id = String(row[0] || "").trim(), sex = ({ F: "F", H: "M", M: "M", Femmes: "F", Hommes: "M" })[row[1]], course = String(row[2] || "").replace(/\s/g, "").toUpperCase();
        const p = next.find((p) => p.id === id), key = `${sex}|${course}`, identity = `${id}|${key}`;
        if (!p || p.sourceId || !sex || !COURSES.includes(course)) throw new Error("Référentiel, sexe ou course invalide, ou grille liée à l’EDF.");
        if (seen.has(identity)) throw new Error("Ligne en double.");
        seen.add(identity);
        const action = String(row[device === "france" ? 5 : 4] || "").trim().toLowerCase();
        if (action && action !== "supprimer") throw new Error("Action inconnue : vide ou Supprimer.");
        if (action === "supprimer") { delete p.grid[key]; return; }
        const old = p.grid[key];
        const rawTime = row[3], rawTop = device === "france" ? row[4] : null;
        const time = (rawTime == null || rawTime === "") && !replace ? old?.time ?? null : parse(rawTime);
        const top = (rawTop == null || rawTop === "") && !replace ? old?.top ?? null : rawTop == null || rawTop === "" ? null : Number(rawTop);
        if (![null, 8, 16].includes(top)) throw new Error("Top : 8 ou 16 uniquement.");
        if (time !== null || top !== null) p.grid[key] = { time, top };
      } catch (error) { errors.push(`Ligne ${i + 2} : ${error.message}`); }
    });
    const changes = [];
    next.forEach((p, i) => {
      const old = profiles[i];
      for (const key of new Set([...Object.keys(old.grid), ...Object.keys(p.grid)])) {
        const before = old.grid[key] || null, after = p.grid[key] || null;
        changes.push({ profile: p.id, key, before, after, type: JSON.stringify(before) === JSON.stringify(after) ? "Identiques" : !before ? "Ajouts" : !after ? "Suppressions" : "Modifications" });
      }
    });
    return { next, errors, changes };
  }
  const api = { COURSES, display, parse, preview };
  if (typeof module !== "undefined") module.exports = api;
  else root.LivePalmesDtnImport = api;
})(typeof window === "undefined" ? {} : window);
