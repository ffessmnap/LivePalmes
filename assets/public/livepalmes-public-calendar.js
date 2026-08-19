(function (global) {
  "use strict";
  const LOCAL_BASE = /^(localhost|127\.0\.0\.1)$/.test(global.location?.hostname || "") ? `${global.location.origin}/tests/fixtures/public-calendar` : "";
  const BASE = global.LIVEPALMES_PUBLIC_CALENDAR_BASE || LOCAL_BASE || "https://storage.googleapis.com/livepalmes-public-data-718081132564/calendar";
  const TYPE_LABELS = { pool: "Piscine", openWater: "Eau libre", training: "Formation", stage: "Stage", meeting: "Réunion", other: "Autre" };
  const LEVEL_LABELS = { departemental: "Départemental", regional: "Régional", national: "National" };
  const STATUS_LABELS = { ongoing: "En cours", upcoming: "À venir", canceled: "Annulée", awaitingResults: "Terminée — résultats en attente", resultsPublished: "Résultats publiés" };

  function today() { return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }); }
  function seasonEndYear(date = new Date()) { return date.getMonth() >= 8 ? date.getFullYear() + 1 : date.getFullYear(); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
  function status(event, referenceDate = today()) {
    if (event.canceled) return "canceled";
    if (event.resultsPublishedAt) return "resultsPublished";
    if (referenceDate < event.date) return "upcoming";
    if (referenceDate <= (event.endDate || event.date)) return "ongoing";
    return "awaitingResults";
  }
  function compare(left, right) {
    const rank = { ongoing: 0, upcoming: 1, canceled: 2, awaitingResults: 3, resultsPublished: 4 };
    return rank[status(left)] - rank[status(right)] || String(left.date).localeCompare(String(right.date)) || String(left.name).localeCompare(String(right.name), "fr");
  }
  async function json(path) {
    const response = await fetch(`${BASE}/${path}`, { cache: "no-cache" });
    if (!response.ok) throw new Error(response.status === 404 ? "Calendrier non encore publié." : "Chargement du calendrier impossible.");
    return response.json();
  }
  function formatDate(event, options = {}) {
    const start = new Date(`${event.date}T12:00:00`);
    const end = new Date(`${event.endDate || event.date}T12:00:00`);
    if (event.endDate && event.endDate !== event.date) {
      return `Du ${start.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: options.year ? "numeric" : undefined })} au ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    return start.toLocaleDateString("fr-FR", { weekday: options.weekday ? "long" : undefined, day: "numeric", month: "long", year: "numeric" });
  }
  function seasonLabel(endYear) { return `${Number(endYear) - 1}-${endYear}`; }
  global.LivePalmesPublicCalendar = { BASE, LEVEL_LABELS, STATUS_LABELS, TYPE_LABELS, compare, escapeHtml, formatDate, json, seasonEndYear, seasonLabel, status, today };
})(window);
