"use strict";

const text = value => String(value || "").trim();

function competitionMailDate(value) {
  const input = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return "-";
  const date = new Date(`${input}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(date);
}

function competitionMailDateTime(value) {
  if (!text(value)) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year} à ${parts.hour}h${parts.minute}`;
}

function competitionMailLines(competition = {}) {
  const date = competitionMailDate(competition.date);
  const end = competition.endDate && competition.endDate !== competition.date
    ? ` au ${competitionMailDate(competition.endDate)}` : "";
  const address = text(competition.address), city = text(competition.city);
  const includesCity = city && address.toLocaleLowerCase("fr").endsWith(city.toLocaleLowerCase("fr"));
  return [
    `Compétition : ${text(competition.name) || "-"}`,
    `Date : ${date}${end}`,
    `Lieu : ${text(competition.location) || "-"}`,
    ...(address ? [`Adresse : ${address}${city && !includesCity ? `, ${city}` : ""}`] : city ? [`Ville : ${city}`] : [])
  ];
}

module.exports = { competitionMailDate, competitionMailDateTime, competitionMailLines };
