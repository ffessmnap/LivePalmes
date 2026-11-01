"use strict";
// Existing singleton, values or query bodies; no business change.
function competitionYear(date) {
  const match = String(date || "").match(/^(\d{4})-/);
  return match ? Number(match[1]) : 0;
}

function competitionSeasonYear(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-/);
  if (!match) return competitionYear(date);
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 9 ? year + 1 : year;
}

function birthYear(date) {
  const match = String(date || "").match(/^(\d{4})-/);
  const year = match ? Number(match[1]) : 0;
  return year >= 1900 && year <= 2100 ? year : 0;
}

function seasonAge(competitionDate, birthDate) {
  const year = competitionSeasonYear(competitionDate);
  const born = birthYear(birthDate);
  return year && born ? year - born : null;
}

module.exports = { competitionYear, competitionSeasonYear, birthYear, seasonAge };
