(function (root, factory) {
  "use strict";
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  else root.LivePalmesHomeModel = model;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const MAJOR_LEVELS = new Set(["national", "international"]);
  const DAY = 86400000;
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const millis = Date.parse(`${value}T12:00:00Z`);
    return Number.isFinite(millis) && new Date(millis).toISOString().slice(0, 10) === value;
  }
  function parisToday(now = Date.now()) {
    return new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Paris", year:"numeric", month:"2-digit", day:"2-digit"}).format(new Date(now));
  }
  function eventGroups(events, today = parisToday()) {
    if (!validDate(today)) throw new TypeError("Date de référence invalide.");
    const seen = new Set();
    const eligible = [];
    for (const event of Array.isArray(events) ? events : []) {
      if (!event || typeof event.id !== "string" || !event.id || seen.has(event.id) || event.canceled || !validDate(event.date)) continue;
      const endDate = event.endDate || event.date;
      if (!validDate(endDate) || endDate < event.date) continue;
      seen.add(event.id);
      eligible.push({...event,endDate});
    }
    const order = (a,b) => a.date.localeCompare(b.date) || String(a.name || "").localeCompare(String(b.name || ""),"fr") || a.id.localeCompare(b.id);
    const ongoing = eligible.filter(event => event.date <= today && today <= event.endDate)
      .sort((a,b) => Number(MAJOR_LEVELS.has(b.level)) - Number(MAJOR_LEVELS.has(a.level)) || order(a,b));
    const future = eligible.filter(event => event.date > today).sort(order);
    let major = [];
    if (!ongoing.some(event => MAJOR_LEVELS.has(event.level))) {
      const candidates = future.filter(event => MAJOR_LEVELS.has(event.level));
      if (candidates.length) major = candidates.filter(event => event.date === candidates[0].date);
    }
    const levels = new Set(major.map(event => event.level));
    const majorTitle = levels.size > 1 ? "Prochains rendez-vous" : levels.has("international") ? "International" : "National";
    return {ongoing,major,majorTitle,upcoming:future.filter(event => !MAJOR_LEVELS.has(event.level)).slice(0,5)};
  }
  // Publication timestamps are normalized to explicit-offset ISO on the server.
  // Never use the selection's createdAt/updatedAt as a publication timestamp.
  function publicationMillis(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) || !validDate(value.slice(0,10))) return NaN;
    return Date.parse(value);
  }
  function isNewDocument(publishedAt, now = Date.now()) {
    const published = publicationMillis(publishedAt);
    return Number.isFinite(published) && Number.isFinite(now) && published <= now && now - published < 30 * DAY;
  }
  function publicationLabel(publishedAt) {
    const millis = publicationMillis(publishedAt);
    return Number.isFinite(millis) ? `Mis en ligne le ${new Intl.DateTimeFormat("fr-FR", {timeZone:"Europe/Paris",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(millis))}` : "";
  }
  return {validDate,parisToday,eventGroups,isNewDocument,publicationLabel};
});
