(function () {
  let context = {};
  let data = { events: [] };
  let SPEAKER_SHEET_ID = "";

  function useContext(nextContext = {}) {
    context = nextContext || {};
    data = context.data || data || { events: [] };
    SPEAKER_SHEET_ID = context.speakerSheetId || SPEAKER_SHEET_ID;
  }

  function callDependency(name, fallback, ...args) {
    return typeof context[name] === "function" ? context[name](...args) : fallback(...args);
  }

  function normalizePdfLabel(value) {
    return callDependency("normalizePdfLabel", (input) => String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase(), value);
  }

  function fixPdfEncoding(value) {
    return callDependency("fixPdfEncoding", (input) => String(input || ""), value);
  }

  function importedEventId(value) {
    return callDependency("importedEventId", () => "", value);
  }

  function importedSeriesTime(value) {
    return callDependency("importedSeriesTime", (input) => String(input || "").trim(), value);
  }

  function eventSignature(value) {
    return callDependency("eventSignature", () => "", value);
  }

  function formatPersonNameParts(firstName, lastName, fallback = "") {
    return callDependency("formatPersonNameParts", (first, last, backup) => [last, first].filter(Boolean).join(" ") || backup || "", firstName, lastName, fallback);
  }

  function normalizePersonName(value) {
    return callDependency("normalizePersonName", (input) => String(input || "").trim().toLowerCase(), value);
  }

  function sameCategory(a, b) {
    return callDependency("sameCategory", (left, right) => String(left || "").toLowerCase() === String(right || "").toLowerCase(), a, b);
  }

  function shouldKeepRecord(record) {
    return callDependency("shouldKeepRecord", () => true, record);
  }

  function timeToMs(value) {
    return callDependency("timeToMs", () => Number.NaN, value);
  }

  function seedSourceLookupKeys(row) {
    return callDependency("seedSourceLookupKeys", () => [], row);
  }

  function normalizeClubMatch(value) {
    return callDependency("normalizeClubMatch", (input) => String(input || "").trim().toLowerCase(), value);
  }

  function parseDelimitedRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const separator = source.split("\n")[0]?.includes(";") ? ";" : ",";
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char === '"') {
        if (quoted && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === separator && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if (char === "\n" && !quoted) {
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows.map((cells) => (cells.length === 1 && cells[0].includes(";") ? cells[0].split(";").map((item) => item.trim()) : cells));
  }
  
  function normalizeSheetHeader(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  
  function sheetObjects(rows) {
    if (!rows.length) return [];
    const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeSheetHeader(cell)));
    if (headerIndex < 0) return [];
    const headers = rows[headerIndex].map(normalizeSheetHeader);
    return rows.slice(headerIndex + 1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
  }
  
  function rowValue(row, names) {
    return names.map((name) => row[normalizeSheetHeader(name)]).find((value) => String(value || "").trim()) || "";
  }
  
  function sheetEventId(value) {
    const normalized = normalizePdfLabel(value);
    const compact = normalized.replace(/[^a-z0-9]+/g, "");
    const signature = eventSignature(value);
    return importedEventId(value) ||
      (data.events || []).find((event) => event.id === normalized || event.id === compact)?.id ||
      signature ||
      compact ||
      normalized;
  }
  
  function sheetTime(value) {
    const clean = String(value || "").trim().replace(",", ".").replace(/\s+/g, "");
    if (!clean || clean === ":." || clean === "00.00" || clean === "00:00") return "";
    if (/^\d{6}$/.test(clean)) {
      return `${clean.slice(0, 2)}:${clean.slice(2, 4)}.${clean.slice(4, 6)}`;
    }
    if (/^\d{5}$/.test(clean)) {
      return `00:${clean.slice(1, 3)}.${clean.slice(3, 5)}`;
    }
    return importedSeriesTime(clean);
  }
  
  function seedSourceTimeKey(value) {
    const ms = timeToMs(value);
    if (Number.isFinite(ms)) return String(ms);
    return String(value || "").trim().replace(",", ".").replace(/^00:/, "");
  }
  
  function sheetSex(value) {
    const text = normalizeSheetHeader(value);
    if (["f", "femme", "femmes"].includes(text)) return "F";
    if (["h", "homme", "hommes", "m"].includes(text)) return "M";
    if (["x", "mixte"].includes(text)) return "X";
    return String(value || "").trim();
  }
  
  function splitRawTimingCells(cells) {
    if (String(cells?.[0] || "").includes(";")) {
      return String(cells[0]).split(";").map((item) => fixPdfEncoding(item).trim());
    }
    return (cells || []).map((item) => fixPdfEncoding(item).trim());
  }
  
  function displayNameFromParts(firstName, lastName, fallback = "") {
    return formatPersonNameParts(firstName, lastName, fallback);
  }
  
  function categoryFromCodeOrText(value) {
    const text = String(value || "").toUpperCase();
    if (text.includes("CA") || text.includes("CADET")) return "Cadet";
    if (text.includes("JU") || text.includes("JUNIOR")) return "Junior";
    if (text.includes("SE") || text.includes("SENIOR")) return "Senior";
    return value || "";
  }
  
  function personKeyFromSheet(row, sex = "") {
    const firstName = rowValue(row, ["prenom", "prénom", "firstName"]);
    const lastName = rowValue(row, ["nom", "lastName"]);
    const fullName = rowValue(row, ["nom_prenom", "nom prenom", "detenteur", "détenteur", "name"]);
    return `${sheetSex(sex || rowValue(row, ["sexe", "sex"]) || "")}|${normalizePersonName(displayNameFromParts(firstName, lastName, fullName))}`;
  }
  
  async function fetchSpeakerSheetRows(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SPEAKER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&cache=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`onglet ${sheetName} inaccessible (${response.status})`);
    const text = await response.text();
    if (/^\s*</.test(text)) {
      throw new Error(`Google n'a pas renvoyé le CSV de l'onglet ${sheetName}. Vérifie que le fichier est bien partagé en lecture avec le lien.`);
    }
    const rows = parseDelimitedRows(text);
    if (!rows.length) throw new Error(`onglet ${sheetName} vide ou non lisible`);
    return rows;
  }
  
  function parseTopSheet(rows) {
    return sheetObjects(rows).map((row) => {
      const firstName = rowValue(row, ["prenom", "prénom"]);
      const lastName = rowValue(row, ["nom"]);
      return {
        eventId: rowValue(row, ["course_id", "eventId"]).toLowerCase(),
        sex: rowValue(row, ["sexe", "sex"]),
        category: categoryFromCodeOrText(rowValue(row, ["categorie", "catégorie", "category"])),
        rank: Number(rowValue(row, ["rang", "rank"])) || "",
        name: displayNameFromParts(firstName, lastName, rowValue(row, ["nom_prenom", "name"])),
        birthDate: rowValue(row, ["annee_naissance", "naissance", "birthDate"]),
        clubCode: rowValue(row, ["club_code", "code_club"]),
        club: rowValue(row, ["club", "club_nom_complet"]),
        time: importedSeriesTime(rowValue(row, ["temps", "time"]))
      };
    }).filter((row) => row.eventId && row.sex && row.category && row.name && row.time);
  }
  
  function parseRecordsSheet(rows) {
    const directRows = sheetObjects(rows).map((row) => {
      const category = categoryFromCodeOrText(rowValue(row, ["categorie", "catégorie", "category"]));
      const type = rowValue(row, ["type", "label"]);
      return {
        eventId: sheetEventId(rowValue(row, ["course_id", "eventId", "epreuve", "épreuve"])),
        sex: sheetSex(rowValue(row, ["sexe", "sex"])),
        category,
        label: type || (sameCategory(category, "Cadet") ? "Meilleure performance" : `Record de France ${category}`),
        holder: rowValue(row, ["detenteur", "détenteur", "holder", "nom_prenom", "nom"]),
        club: rowValue(row, ["club_code", "club"]),
        time: sheetTime(rowValue(row, ["temps", "time"])),
        date: rowValue(row, ["date", "annee", "année"]),
        place: rowValue(row, ["lieu", "place"])
      };
    }).filter((row) => row.eventId && row.sex && row.category && row.time && shouldKeepRecord(row));
    if (directRows.length) return directRows;
  
    const records = [];
    let context = null;
    rows.forEach((cells) => {
      const [first = "", time = "", holder = "", club = "", date = "", place = ""] = cells.map((cell) => fixPdfEncoding(cell).trim());
      const title = normalizeSheetHeader(first);
      if (!first) return;
      if (title.includes("jeunes_hommes")) context = { sex: "M", category: "Junior", label: "Record de France junior" };
      else if (title.includes("jeunes_femmes")) context = { sex: "F", category: "Junior", label: "Record de France junior" };
      else if (title.includes("toutes_categories_hommes")) context = { sex: "M", category: "Senior", label: "Record de France senior" };
      else if (title.includes("toutes_categories_femmes")) context = { sex: "F", category: "Senior", label: "Record de France senior" };
      else if (title.includes("mpf_cadets")) context = { sex: "M", category: "Cadet", label: "Meilleure performance cadet" };
      else if (title.includes("mpf_cadettes")) context = { sex: "F", category: "Cadet", label: "Meilleure performance cadette" };
      if (!context) return;
      if (/^(epreuve|surface|immersion|apnee|apnée|bi palmes|relais)$/i.test(first)) return;
      const eventId = sheetEventId(first);
      const parsedTime = sheetTime(time);
      if (!eventId || !parsedTime) return;
      if (!shouldKeepRecord({ eventId, club, holder })) return;
      records.push({
        eventId,
        sex: context.sex,
        category: context.category,
        label: context.label,
        holder,
        club,
        time: parsedTime,
        date,
        place
      });
    });
    return records;
  }
  
  function parseEdfSheet(rows) {
    const members = [];
    sheetObjects(rows).forEach((row) => {
      const edf = rowValue(row, ["edf", "equipe", "équipe", "selection", "sélection"]);
      const base = { personKey: personKeyFromSheet(row), label: edf || "Equipe de France" };
      const senior = rowValue(row, ["edf_senior_2025", "senior", "s"]) || (/edf\s*s/i.test(edf) ? edf : "");
      const junior = rowValue(row, ["edf_junior_2026", "junior", "j"]) || (/edf\s*j/i.test(edf) ? edf : "");
      if (/oui|x|1|s/i.test(senior)) members.push({ ...base, team: "S", label: "EDF senior 2025" });
      if (/oui|x|1|j/i.test(junior)) members.push({ ...base, team: "J", label: "EDF junior 2026" });
    });
    return members.filter((row) => row.personKey !== "|");
  }
  
  function statTypeFromLabel(label) {
    const text = normalizeSheetHeader(label);
    const female = ["nageuse", "femme", "femmes", "fille", "filles", "female", "feminin", "doyenne", "vieille"].some((word) => text.includes(word));
    const male = ["nageur", "homme", "hommes", "garcon", "garcons", "male", "masculin", "doyen", "vieux"].some((word) => text.includes(word));
    if (text.includes("anniversaire")) return { type: "birthday", icon: "🎂", label: "Anniversaire aujourd'hui" };
    if (text.includes("plus_jeune")) {
      if (female) return { type: "youngest-female", icon: "👶", label: "Plus jeune nageuse de la compétition", sex: "F" };
      if (male) return { type: "youngest-male", icon: "👶", label: "Plus jeune nageur de la compétition", sex: "M" };
      return { type: "youngest", icon: "👶", label: "Plus jeune de la compétition" };
    }
    if (text.includes("doyenne") || (text.includes("plus_vieille") && !male)) return { type: "oldest-female", icon: "★", label: "Doyenne de la rencontre", sex: "F" };
    if (text.includes("doyen") || text.includes("plus_vieux")) return { type: "oldest-male", icon: "★", label: "Doyen de la rencontre", sex: "M" };
    return null;
  }
  
  function parseCompetitionStatPerson(value) {
    const text = fixPdfEncoding(value).replace(/\s+/g, " ").trim();
    const match = text.match(/^(.+?)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+([A-Z0-9]+))?(?:\s+\(([^)]+)\))?$/i);
    if (!match) return null;
    const [, name, birthDate, clubCode = "", extra = ""] = match;
    return {
      name: name.trim(),
      birthDate,
      birthYear: (birthDate.match(/\d{4}$/) || [])[0] || "",
      clubCode: clubCode.toUpperCase(),
      extra: extra.trim()
    };
  }
  
  function ageFromFrenchDate(value, referenceDate = new Date()) {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const birthDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (Number.isNaN(birthDate.getTime())) return "";
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const birthdayThisYear = new Date(referenceDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (referenceDate < birthdayThisYear) age -= 1;
    return age >= 0 ? `${age} ans` : "";
  }
  
  function frenchDateMatchesToday(value, referenceDate = new Date()) {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;
    return Number(match[1]) === referenceDate.getDate() && Number(match[2]) === referenceDate.getMonth() + 1;
  }
  
  function competitionStatAgeLabel(type, birthDate) {
    if (!String(type || "").startsWith("youngest") && !String(type || "").startsWith("oldest")) return "";
    return ageFromFrenchDate(birthDate);
  }
  
  function parseCompetitionStatsSheet(rows) {
    const objectStats = sheetObjects(rows).map((row) => {
      const label = rowValue(row, ["type", "repere", "repère", "stat", "categorie", "catégorie"]);
      const currentType = statTypeFromLabel(label);
      if (!currentType) return null;
      const name = rowValue(row, ["nom_prenom", "nom prenom", "nageur", "nageuse", "nom", "name"]);
      const firstName = rowValue(row, ["prenom", "prénom", "firstName"]);
      const lastName = rowValue(row, ["nom", "lastName"]);
      const birthDate = rowValue(row, ["date_naissance", "date naissance", "naissance", "birthDate"]);
      if (!name && !firstName && !lastName) return null;
      const person = {
        name: name || formatPersonNameParts(firstName, lastName),
        birthDate,
        birthYear: (String(birthDate).match(/\d{4}$/) || [])[0] || rowValue(row, ["annee", "année", "birthYear"]),
        clubCode: rowValue(row, ["club", "code_club", "code club"]).toUpperCase(),
        extra: rowValue(row, ["info", "extra", "commentaire"])
      };
      const sex = sheetSex(rowValue(row, ["sexe", "sex"])) || currentType.sex || "";
      const ageLabel = competitionStatAgeLabel(currentType.type, person.birthDate);
      if (currentType.type === "birthday" && !frenchDateMatchesToday(person.birthDate)) return null;
      const detailParts = [currentType.label, ageLabel, person.birthDate, person.clubCode, person.extra].filter(Boolean);
      return {
        ...currentType,
        ...person,
        ageLabel,
        sex,
        detail: detailParts.join(" - ")
      };
    }).filter(Boolean);
    if (objectStats.length) return objectStats;
  
    const stats = [];
    let currentType = null;
    rows.forEach((cells) => {
      const first = fixPdfEncoding(cells?.[0] || "").trim();
      if (!first) return;
      const type = statTypeFromLabel(first);
      if (type) {
        currentType = type;
        return;
      }
      if (!currentType) return;
      const person = parseCompetitionStatPerson(first);
      if (!person) return;
      const ageLabel = competitionStatAgeLabel(currentType.type, person.birthDate);
      if (currentType.type === "birthday" && !frenchDateMatchesToday(person.birthDate)) return;
      const detailParts = [currentType.label, ageLabel, person.birthDate, person.clubCode, person.extra].filter(Boolean);
      stats.push({
        ...currentType,
        ...person,
        ageLabel,
        detail: detailParts.join(" - ")
      });
    });
    return stats;
  }
  
  function parseInternationalSheet(rows) {
    return sheetObjects(rows).map((row) => {
      const eventText = rowValue(row, ["course_id", "eventId", "epreuve", "épreuve", "course", "course_libelle"]);
      return {
        personKey: personKeyFromSheet(row, rowValue(row, ["sexe", "sex"])),
        eventId: sheetEventId(eventText),
        sex: sheetSex(rowValue(row, ["sexe", "sex"])),
        eventLabel: rowValue(row, ["course_libelle", "course", "epreuve", "épreuve"]) || eventText,
        medal: rowValue(row, ["medaille", "médaille"]),
        time: sheetTime(rowValue(row, ["temps", "time"])),
        championship: [rowValue(row, ["championnat", "competition", "compétition"]), rowValue(row, ["annee", "année"])].filter(Boolean).join(" "),
        place: rowValue(row, ["lieu", "place"])
      };
    }).filter((row) => row.personKey !== "|" && row.eventId);
  }
  
  function parseQualificationsSheet(rows) {
    const objects = sheetObjects(rows);
    const directRows = objects.map((row) => ({
      eventId: sheetEventId(rowValue(row, ["course_id", "eventId", "epreuve", "épreuve", "course"])),
      sex: rowValue(row, ["sexe", "sex"]),
      label: rowValue(row, ["type", "label"]),
      time: sheetTime(rowValue(row, ["temps", "time"])),
      category: rowValue(row, ["categorie_concernee", "catégorie", "category"])
    })).filter((row) => row.eventId && row.sex && row.label && row.time);
    if (directRows.length) return directRows;
  
    const qualifications = [];
    rows.forEach((cells) => {
      const sexText = String(cells[0] || "").trim();
      const eventText = String(cells[1] || "").trim();
      if (!/^(femmes|hommes)$/i.test(sexText) || !eventText) return;
      const sex = /^femmes$/i.test(sexText) ? "F" : "M";
      const eventId = sheetEventId(eventText);
      const tsp = sheetTime(cells[2]);
      const trp = sheetTime(cells[3]);
      if (eventId && tsp) qualifications.push({ eventId, sex, label: "TSP", time: tsp, category: "Senior" });
      if (eventId && trp) qualifications.push({ eventId, sex, label: "TRP", time: trp, category: "Relève" });
    });
    return qualifications;
  }
  
  function parseClubSheet(rows) {
    const clubs = new Map();
    sheetObjects(rows).forEach((row) => {
      const code = rowValue(row, ["club_code", "code_club"]).toUpperCase();
      const name = rowValue(row, ["club_nom_complet", "club", "nom"]);
      if (code && name) clubs.set(code, name);
    });
    return clubs;
  }
  
  function parseSwimmerInfosSheet(rows) {
    return sheetObjects(rows).map((row) => {
      const firstName = rowValue(row, ["prenom", "prénom", "firstName"]);
      const lastName = rowValue(row, ["nom", "lastName"]);
      const fullName = rowValue(row, ["nom_prenom", "nom prenom", "nageur", "nageuse", "name"]);
      const club = rowValue(row, ["club", "code_club", "club_code", "club_nom_complet"]);
      const info = rowValue(row, ["infos", "info", "remarque", "commentaire"]);
      const name = displayNameFromParts(firstName, lastName, fullName);
      return {
        name,
        club,
        info,
        personKey: normalizePersonName(name),
        clubKey: normalizeClubMatch(club)
      };
    }).filter((row) => row.personKey && row.info);
  }
  
  function seedSourceNameFromRen(cells) {
    const date = cells[1] || "";
    const year = (date.match(/\b(20\d{2})\b/) || date.match(/\b(\d{2})$/))?.[1] || "";
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    const place = fixPdfEncoding(cells[3] || "").replace(/,\s*France$/i, "").trim();
    return [place, normalizedYear].filter(Boolean).join(" ");
  }
  
  function parseSeedSourceSheet(rows) {
    const sourceByKey = new Map();
    let currentSource = "";
    rows.forEach((cells) => {
      cells = splitRawTimingCells(cells);
      if (!cells.length) return;
      if (cells[0] === "REN") {
        currentSource = seedSourceNameFromRen(cells);
        return;
      }
      if (cells[0] !== "NAG" || !currentSource) return;
      const lastName = fixPdfEncoding(cells[1] || "").trim();
      const firstName = fixPdfEncoding(cells[2] || "").trim();
      const birthDate = cells[3] || "";
      const birthYear = (birthDate.match(/\d{4}$/) || [])[0] || "";
      const sex = cells[4] || "";
      const clubCode = String(cells[5] || "").trim().toUpperCase();
      const eventId = normalizePdfLabel(cells[7] || "").toLowerCase();
      const times = [sheetTime(cells[15] || ""), sheetTime(cells[8] || "")]
        .filter((time, index, list) => time && time !== "00:00" && time !== "00.00" && list.indexOf(time) === index);
      if (!lastName || !firstName || !eventId || !times.length) return;
      times.forEach((time) => {
        const row = { eventId, sex, seedTime: time, swimmerId: `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${birthYear}|${sex}`, clubCode, firstName, lastName };
        seedSourceLookupKeys(row).forEach((key) => sourceByKey.set(key, currentSource));
      });
    });
    return sourceByKey;
  }
  
  function applySpeakerInfoToEntrants(entrants, seedSources, clubs) {
    return entrants.map((entrant) => {
      const seedSource = seedSourceLookupKeys(entrant).map((key) => seedSources.get(key)).find(Boolean);
      const clubName = clubs.get(String(entrant.clubCode || "").toUpperCase());
      return {
        ...entrant,
        seedSource: seedSource || entrant.seedSource || "",
        club: clubName || entrant.club
      };
    });
  }

  const withContext = (nextContext, callback) => {
    useContext(nextContext);
    return callback();
  };

  window.LivePalmesSpeakerInfo = {
    applySpeakerInfoToEntrants: (entrants, seedSources, clubs, options = {}) => withContext(options, () => applySpeakerInfoToEntrants(entrants, seedSources, clubs)),
    fetchSpeakerSheetRows: (sheetName, options = {}) => withContext(options, () => fetchSpeakerSheetRows(sheetName)),
    parseClubSheet: (rows, options = {}) => withContext(options, () => parseClubSheet(rows)),
    parseCompetitionStatsSheet: (rows, options = {}) => withContext(options, () => parseCompetitionStatsSheet(rows)),
    parseEdfSheet: (rows, options = {}) => withContext(options, () => parseEdfSheet(rows)),
    parseInternationalSheet: (rows, options = {}) => withContext(options, () => parseInternationalSheet(rows)),
    parseQualificationsSheet: (rows, options = {}) => withContext(options, () => parseQualificationsSheet(rows)),
    parseRecordsSheet: (rows, options = {}) => withContext(options, () => parseRecordsSheet(rows)),
    parseSeedSourceSheet: (rows, options = {}) => withContext(options, () => parseSeedSourceSheet(rows)),
    parseSwimmerInfosSheet: (rows, options = {}) => withContext(options, () => parseSwimmerInfosSheet(rows)),
    parseTopSheet: (rows, options = {}) => withContext(options, () => parseTopSheet(rows)),
    sheetSex: (value, options = {}) => withContext(options, () => sheetSex(value)),
    seedSourceTimeKey: (value, options = {}) => withContext(options, () => seedSourceTimeKey(value))
  };
}());
