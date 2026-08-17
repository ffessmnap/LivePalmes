"use strict";

const crypto = require("node:crypto");

function text(value) {
  return String(value || "").trim().replace(/[;\r\n]+/g, " ").replace(/\s+/g, " ");
}

function line(fields = []) {
  return `${fields.map((value) => text(value)).join(";")};`;
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function formatGeneratedAt(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(value) {
  const raw = text(value).replace(",", ".");
  if (!raw || raw === "59:59.99" || raw === "595999") return "595999";
  if (/^\d{6}$/.test(raw)) return raw;
  const match = raw.match(/^(?:(\d+):)?(\d{1,2})(?:[.:](\d{1,2}))$/);
  if (!match) return "595999";
  const minutes = Number(match[1] || 0);
  const seconds = Number(match[2] || 0);
  const hundredths = Number(String(match[3] || "0").padEnd(2, "0").slice(0, 2));
  if (seconds >= 60) return "595999";
  return String(minutes * 10000 + seconds * 100 + hundredths).padStart(6, "0").slice(-6);
}

function categoryCode(category, sex) {
  const prefix = String(sex || "").toUpperCase() === "F" ? "F" : "H";
  const suffix = {
    P: "PO",
    B: "BE",
    M: "MI",
    C: "CA",
    J: "JU",
    S: "SE",
    "M30+": "30+",
    "M40+": "40+",
    "M50+": "50+",
    "M60+": "60+",
    "M70+": "70+",
    "M80+": "80+"
  }[text(category).toUpperCase()];
  return suffix ? `${prefix}${suffix}` : "";
}

function relayCategoryCode(category, genderMode) {
  const gender = genderMode === "mixed" ? "X" : genderMode === "female" ? "F" : "H";
  const suffix = { P: "PO", B: "BE", M: "MI", C: "CA", J: "JU", S: "SE" }[text(category).toUpperCase()] || text(category).toUpperCase();
  return `${gender}${suffix}`;
}

function regionCode(club = {}) {
  if (club.winPalmeRegionCode) return text(club.winPalmeRegionCode).toUpperCase();
  return {
    "1": "EST",
    "2": "CSNA",
    "3": "IDF",
    "5": "ETR",
    "6": "BPL",
    "8": "CENT",
    "9": "GUAD",
    "10": "PMO",
    "11": "MAR",
    "12": "CORS",
    "13": "HDF",
    "15": "NORM",
    "16": "PACA",
    "17": "AURA",
    "18": "REUN",
    "22": "BFC"
  }[text(club.regionId)] || text(club.regionId).toUpperCase().slice(0, 8);
}

function stableMeetingId(competition = {}) {
  if (competition.winPalmeId) return text(competition.winPalmeId).toUpperCase();
  const date = text(competition.date).replace(/\D/g, "").slice(0, 8);
  const suffix = parseInt(crypto.createHash("sha256").update(text(competition.id || competition.name)).digest("hex").slice(0, 6), 16) % 10000;
  return `LP${date}${String(suffix).padStart(4, "0")}`;
}

function swimmerWinPalmeId(swimmer = {}) {
  const source = text(swimmer.swimmerIndexId || swimmer.swimmerId || swimmer.licenseNumber);
  if (/^\d+$/.test(source)) return source;
  const suffix = parseInt(crypto.createHash("sha256").update(source).digest("hex").slice(0, 10), 16) % 1000000000;
  return String(suffix).padStart(9, "0");
}

function buildWinPalmeCompetitionTxt(competition = {}, entries = [], clubsById = new Map(), options = {}) {
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const lines = [
    `XXX;GENERER PAR LIVEPALMES le ${formatGeneratedAt(generatedAt)}`,
    "",
    line(["XXX", "RENCONTRE", competition.location || competition.name, formatDate(competition.date), "Piscine"]),
    "",
    line(["WID", stableMeetingId(competition)])
  ];
  const warnings = [];
  entries.forEach((entry) => {
    const club = clubsById.get(text(entry.clubId)) || {};
    const federalNumber = text(club.federalNumber || entry.federalNumber);
    if (!federalNumber) warnings.push(`Numero federal manquant pour ${entry.clubCode || entry.clubName || entry.clubId}.`);
    lines.push(
      "XXX;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      line(["CLU", entry.clubCode || club.clubCode, entry.clubName || club.clubName, federalNumber, regionCode(club), ""]),
      ""
    );
    (entry.swimmers || []).forEach((swimmer) => {
      (swimmer.individualEntries || []).forEach((individual) => {
        lines.push(line([
          "NAG",
          swimmer.lastName,
          swimmer.firstName,
          formatDate(swimmer.birthDate),
          swimmer.sex,
          entry.clubCode || club.clubCode,
          "",
          individual.eventCode,
          formatTime(individual.entryTime || individual.manualEntryTime),
          categoryCode(swimmer.category, swimmer.sex),
          swimmerWinPalmeId(swimmer),
          ""
        ]));
      });
    });
    (entry.relays || []).forEach((relay) => {
      lines.push(line([
        "REL",
        entry.clubCode || club.clubCode,
        relayCategoryCode(relay.category, relay.genderMode),
        relay.eventCode,
        formatTime(relay.entryTime || relay.manualEntryTime),
        ...(relay.members || []).slice(0, 6).map(swimmerWinPalmeId)
      ]));
    });
    const leader = entry.teamLeader || {};
    if (leader.mode === "person") {
      lines.push(line(["CEQ", leader.lastName, leader.firstName, entry.clubCode || club.clubCode, formatDate(leader.birthDate), ""]));
    }
    lines.push("XXX;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx", "");
  });
  if (warnings.length) {
    const error = new Error(warnings.join(" "));
    error.code = "missing-club-federal-number";
    error.warnings = warnings;
    throw error;
  }
  return {
    buffer: Buffer.from(`${lines.join("\r\n")}\r\n`, "utf8"),
    generatedAt: generatedAt.toISOString(),
    meetingId: stableMeetingId(competition)
  };
}

module.exports = {
  buildWinPalmeCompetitionTxt,
  categoryCode,
  formatDate,
  formatTime,
  regionCode,
  relayCategoryCode,
  stableMeetingId,
  swimmerWinPalmeId
};
