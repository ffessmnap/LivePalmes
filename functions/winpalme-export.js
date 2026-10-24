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
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}`;
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
    "4": "CNNP",
    "5": "CMAS",
    "6": "BPL",
    "8": "CENT",
    "9": "GUAD",
    "10": "OPM",
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
  return `CNNP${date}${String(suffix).padStart(4, "0")}`;
}

function compareWinPalmeText(left, right) {
  return text(left).localeCompare(text(right), "fr", { sensitivity: "base", numeric: true });
}

function sortedSwimmers(swimmers = []) {
  return [...swimmers].sort((left, right) =>
    compareWinPalmeText(left.lastName, right.lastName)
    || compareWinPalmeText(left.firstName, right.firstName)
    || compareWinPalmeText(left.birthDate, right.birthDate)
    || compareWinPalmeText(swimmerWinPalmeId(left), swimmerWinPalmeId(right))
  );
}

function sortedIndividualEntries(entries = []) {
  return [...entries].sort((left, right) =>
    compareWinPalmeText(left.eventCode, right.eventCode)
    || compareWinPalmeText(left.entryTime || left.manualEntryTime, right.entryTime || right.manualEntryTime)
  );
}

function relayMemberIds(relay = {}) {
  const ids = (relay.members || []).slice(0, 4).map(swimmerWinPalmeId);
  while (ids.length < 4) ids.push("");
  return ids;
}

function swimmerWinPalmeId(swimmer = {}) {
  const source = text(swimmer.swimmerIndexId || swimmer.swimmerId || swimmer.licenseNumber);
  if (/^\d+$/.test(source)) return source;
  const suffix = parseInt(crypto.createHash("sha256").update(source).digest("hex").slice(0, 10), 16) % 1000000000;
  return String(suffix).padStart(9, "0");
}

function openWaterExportProgram(competition) {
  const events = competition.events || [];
  if (!events.length) throw new Error("Programme eau libre absent : export impossible.");
  const byCode = new Map();
  const definitions = events.map(event => {
    const rows = event.nativeCourses || [];
    const first = rows[0];
    const nativeCode = text(first?.course).toUpperCase();
    const code = text(first?.wplabel);
    if (!code || !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/.test(code)
        || ["LD11KM", "WPRELAISLD3500", "LD4X2KMM", "LD05KM Mixte"].includes(code)
        || rows.some(row => ["wplabel", "longueur", "style", "nbnageur", "mixte", "relais", "type_"].some(key => String(row[key]) !== String(first[key])))
        || byCode.has(event.code) || [...byCode.values()].some(item => item.code === code)) {
      throw new Error(`Course eau libre sans correspondance WinPalme validee ou ambigue : ${event.label || event.code}.`);
    }
    const relay = Number(first.relais) === 1;
    const distance = Number(first.longueur), members = Number(first.nbnageur), mixed = Number(first.mixte);
    if ((event.type === "relay") !== relay || ![0,1].includes(Number(first.relais))
        || first.style !== "SF" || !Number.isSafeInteger(distance) || distance < 1 || distance > 100000
        || ![0,1].includes(mixed) || rows.some(row => Number(row.ld) !== 1 || Number(row.actif) !== 1 || Number(row.validation) !== 1)
        || (!relay && (members !== 1 || Number(first.type_) !== 1 || mixed !== 0))
        || (relay && (nativeCode !== "4X1000SB MIXTE" || code !== "LD4X1KMMM" || distance !== 4000 || members !== 4 || mixed !== 1 || Number(first.type_) !== 0))) {
      throw new Error(`Type de course eau libre incoherent : ${event.code}.`);
    }
    const elimination = nativeCode === "150BIEL" || nativeCode === "150SFEL";
    if (rows.some(row => !/^[1-9]\d*$/.test(String(row.id_course || ""))) || new Set(rows.map(row => String(row.sexe))).size !== rows.length
        || rows.some(row => !(relay ? ["0"] : ["F", "M"]).includes(String(row.sexe)))
        || (elimination && (distance !== 150 || code !== (nativeCode === "150BIEL" ? "LD150BIE" : "LD150SFE")))) {
      throw new Error(`Reference native eau libre absente : ${event.code}.`);
    }
    const item = { code, fields: ["DIS", code, first.course, distance, "SF", relay ? 2 : 1,
      members, relay || elimination ? "" : first.id_course, mixed] };
    byCode.set(event.code, item);
    return item;
  });
  return { byCode, definitions };
}

function buildWinPalmeCompetitionTxt(competition = {}, entries = [], clubsById = new Map(), options = {}) {
  const openWater = competition.competitionType === "openWater";
  const waterProgram = openWater ? openWaterExportProgram(competition) : null;
  const exportCode = code => {
    if (!openWater) return code;
    const item = waterProgram.byCode.get(code);
    if (!item) throw new Error(`Engagement eau libre hors programme : ${code}.`);
    return item.code;
  };
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const lines = [
    `XXX;GENERER PAR LIVEPALMES le ${formatGeneratedAt(generatedAt)}`,
    "",
    line(["XXX", "RENCONTRE", competition.location || competition.name, formatDate(competition.date), openWater ? "Longue distance" : "Piscine"]),
    "",
    line(["WID", stableMeetingId(competition)])
  ];
  if (waterProgram) waterProgram.definitions.forEach(item => lines.push(item.fields.map(value => text(String(value))).join(";")));
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
    sortedSwimmers(entry.swimmers || []).forEach((swimmer) => {
      sortedIndividualEntries(swimmer.individualEntries || []).forEach((individual) => {
        lines.push(line([
          "NAG",
          swimmer.lastName,
          swimmer.firstName,
          formatDate(swimmer.birthDate),
          swimmer.sex,
          entry.clubCode || club.clubCode,
          "",
          exportCode(individual.eventCode),
          openWater ? "000001" : formatTime(individual.entryTime || individual.manualEntryTime),
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
        exportCode(relay.eventCode),
        openWater ? "595999" : formatTime(relay.entryTime || relay.manualEntryTime),
        ...relayMemberIds(relay)
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
  relayMemberIds,
  stableMeetingId,
  swimmerWinPalmeId
};
