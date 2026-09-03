(function exposeLicenseControlCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LivePalmesLicenseControl = api;
})(typeof window !== "undefined" ? window : {}, () => {
  "use strict";

  const INPUT_ALIASES = {
    batchId: ["lot_id", "batch_id"],
    season: ["saison", "season"],
    livePalmesId: ["livepalmes_id", "id_livepalmes", "swimmer_id", "nageur_id"],
    lastName: ["nom", "nom_livepalmes", "last_name", "lastname"],
    firstName: ["prenom", "prenom_livepalmes", "first_name", "firstname"],
    birthDate: ["date_naissance", "date_naissance_livepalmes", "birth_date", "birthdate"],
    currentLicense: ["licence_livepalmes", "licence", "license_number"],
    competitions: ["competitions_sources", "competitions", "competition"]
  };

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function normalizeHeader(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
  }

  function dateParts(value) {
    const text = String(value ?? "").trim();
    let match = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (match) return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
    match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return { day: Number(match[3]), month: Number(match[2]), year: Number(match[1]) };
    return null;
  }

  function validDateParts(parts) {
    if (!parts || parts.year < 1900 || parts.year > 2200 || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return false;
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    return date.getUTCFullYear() === parts.year && date.getUTCMonth() === parts.month - 1 && date.getUTCDate() === parts.day;
  }

  function normalizeDate(value) {
    const parts = dateParts(value);
    if (!validDateParts(parts)) return "";
    return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
  }

  function isoDate(value) {
    const parts = dateParts(value);
    if (!validDateParts(parts)) return "";
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }

  function normalizeLicense(value) {
    return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function requiredValidityForSeason(season) {
    const match = String(season ?? "").trim().match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      throw new Error(`Saison invalide : ${season || "non renseignée"}. Format attendu : 2026-2027.`);
    }
    return `31/12/${match[2]}`;
  }

  function validityCoversSeason(validity, season) {
    const actual = isoDate(validity);
    const required = isoDate(requiredValidityForSeason(season));
    return Boolean(actual && required && actual >= required);
  }

  function chooseDelimiter(text) {
    const firstLine = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
    return ["\t", ";", ","]
      .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
      .sort((left, right) => right.count - left.count)[0].delimiter;
  }

  function parseDelimited(text, delimiter = chooseDelimiter(text)) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = String(text ?? "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === delimiter) {
        row.push(cell.trim());
        cell = "";
      } else if (char === "\n") {
        row.push(cell.replace(/\r$/, "").trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    if (quoted) throw new Error("CSV invalide : guillemet non fermé.");
    if (cell || row.length) {
      row.push(cell.replace(/\r$/, "").trim());
      if (row.some(Boolean)) rows.push(row);
    }
    return rows;
  }

  function inputIndexes(headers) {
    return Object.fromEntries(Object.entries(INPUT_ALIASES).map(([field, aliases]) => [
      field,
      headers.findIndex((header) => aliases.includes(header))
    ]));
  }

  function parseLivePalmesBatch(text) {
    const rows = parseDelimited(text);
    if (rows.length < 2) throw new Error("Le fichier ne contient aucun nageur.");
    const headers = rows[0].map(normalizeHeader);
    const indexes = inputIndexes(headers);
    ["batchId", "season", "livePalmesId", "lastName", "firstName", "birthDate"].forEach((field) => {
      if (indexes[field] < 0) throw new Error(`Colonne obligatoire absente : ${INPUT_ALIASES[field][0]}.`);
    });
    const people = rows.slice(1).map((values, offset) => {
      const value = (field) => String(values[indexes[field]] ?? "").trim();
      const person = {
        line: offset + 2,
        batchId: value("batchId"),
        season: value("season"),
        livePalmesId: value("livePalmesId"),
        lastName: value("lastName"),
        firstName: value("firstName"),
        birthDate: normalizeDate(value("birthDate")),
        currentLicense: indexes.currentLicense >= 0 ? normalizeLicense(value("currentLicense")) : "",
        competitions: indexes.competitions >= 0 ? value("competitions") : ""
      };
      if (!person.batchId || !person.season || !person.livePalmesId || !person.lastName || !person.firstName || !person.birthDate) {
        throw new Error(`Ligne ${person.line} : lot, saison, identifiant, identité ou date de naissance manquant.`);
      }
      person.requiredValidity = requiredValidityForSeason(person.season);
      return person;
    });
    const batchIds = new Set(people.map((person) => person.batchId));
    const seasons = new Set(people.map((person) => person.season));
    const ids = new Set();
    if (batchIds.size !== 1) throw new Error("Le fichier contient plusieurs identifiants de lot.");
    if (seasons.size !== 1) throw new Error("Un même contrôle ne peut pas mélanger plusieurs saisons.");
    people.forEach((person) => {
      if (ids.has(person.livePalmesId)) throw new Error(`Identifiant LivePalmes dupliqué : ${person.livePalmesId}.`);
      ids.add(person.livePalmesId);
    });
    return {
      batchId: people[0].batchId,
      season: people[0].season,
      requiredValidity: people[0].requiredValidity,
      people
    };
  }

  function searchQueries(person) {
    const candidates = [
      person.currentLicense,
      `${person.lastName} ${person.firstName}`,
      person.lastName,
      person.firstName
    ].map((value) => String(value ?? "").trim()).filter((value) => normalizeText(value).length >= 3);
    const seen = new Set();
    return candidates.filter((value) => {
      const key = normalizeText(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildCandidate(person, raw = {}, index = 0) {
    const federalName = normalizeText(raw.name);
    const lastName = normalizeText(person.lastName);
    const firstName = normalizeText(person.firstName);
    const nameMatches = Boolean(lastName && firstName && federalName.includes(lastName) && federalName.includes(firstName));
    const federalBirthDate = normalizeDate(raw.birthDate);
    const birthDateMatches = Boolean(federalBirthDate && federalBirthDate === person.birthDate);
    const federalLicense = normalizeLicense(raw.license || raw.licence);
    const licenseMatches = person.currentLicense ? federalLicense === person.currentLicense : null;
    const federalValidity = normalizeDate(raw.validity || raw.validite);
    const validitySufficient = validityCoversSeason(federalValidity, person.season);
    return {
      candidateNumber: index + 1,
      license: federalLicense,
      name: String(raw.name ?? "").trim(),
      birthDate: federalBirthDate,
      structure: String(raw.structure ?? "").trim(),
      validity: federalValidity,
      nameMatches,
      birthDateMatches,
      licenseMatches,
      validitySufficient,
      exactIdentity: nameMatches && birthDateMatches,
      exactMatch: nameMatches && birthDateMatches && licenseMatches !== false && validitySufficient
    };
  }

  function uniqueFederalRows(rows = []) {
    const seen = new Set();
    return rows.filter((row) => {
      const key = [normalizeLicense(row.license || row.licence), normalizeText(row.name), normalizeDate(row.birthDate)].join("|");
      if (!key.replace(/\|/g, "") || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function analyzeCandidates(person, rows = []) {
    const candidates = uniqueFederalRows(rows).map((row, index) => buildCandidate(person, row, index));
    const exactIdentity = candidates.filter((candidate) => candidate.exactIdentity);
    const exactLicense = exactIdentity.filter((candidate) => candidate.licenseMatches !== false);
    const validable = exactLicense.filter((candidate) => candidate.validitySufficient);
    let status = "introuvable";
    let details = "Recherche terminée : aucun candidat fédéral.";
    let selectedCandidate = null;
    if (exactIdentity.length > 1) {
      status = "ambigu";
      details = `${exactIdentity.length} correspondances exactes à départager.`;
    } else if (validable.length === 1) {
      status = "validable";
      details = `Correspondance unique, licence valable jusqu’au ${validable[0].validity}.`;
      selectedCandidate = validable[0];
    } else if (validable.length > 1) {
      status = "ambigu";
      details = `${validable.length} correspondances exactes à départager.`;
    } else if (exactLicense.length === 1) {
      status = "licence_expiree";
      details = `Licence valable jusqu’au ${exactLicense[0].validity || "date inconnue"}, au lieu du ${person.requiredValidity} minimum.`;
      selectedCandidate = exactLicense[0];
    } else if (exactIdentity.length === 1) {
      status = "anomalie_licence";
      details = `Identité retrouvée avec la licence ${exactIdentity[0].license || "non renseignée"} au lieu de ${person.currentLicense || "aucune licence LivePalmes"}.`;
      selectedCandidate = exactIdentity[0];
    } else if (candidates.length) {
      status = "anomalie_identite";
      details = `${candidates.length} candidat${candidates.length > 1 ? "s" : ""} fédéral${candidates.length > 1 ? "aux" : ""} proche${candidates.length > 1 ? "s" : ""} à examiner.`;
      if (candidates.length === 1) selectedCandidate = candidates[0];
    }
    return { ...person, status, details, selectedCandidate, candidates };
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function booleanCell(value) {
    return value === null || value === undefined ? "non_renseignee" : value ? "oui" : "non";
  }

  function exportResultsCsv(results = [], controlledAt = new Date().toISOString()) {
    const header = [
      "lot_id", "saison", "livepalmes_id", "nom_livepalmes", "prenom_livepalmes",
      "date_naissance_livepalmes", "licence_livepalmes", "competitions_sources", "candidat_no",
      "licence_ffessm", "identite_ffessm", "date_naissance_ffessm", "structure_ffessm",
      "validite_ffessm", "date_validite_requise", "nom_prenom_correspondent",
      "date_naissance_correspond", "licence_correspond", "validite_suffisante",
      "correspondance_exacte", "statut", "details", "controle_le"
    ];
    const rows = results.flatMap((result) => {
      const candidates = result.candidates?.length ? result.candidates : [null];
      return candidates.map((candidate) => [
        result.batchId, result.season, result.livePalmesId, result.lastName, result.firstName,
        result.birthDate, result.currentLicense, result.competitions, candidate?.candidateNumber || "",
        candidate?.license || "", candidate?.name || "", candidate?.birthDate || "",
        candidate?.structure || "", candidate?.validity || "", result.requiredValidity,
        candidate ? booleanCell(candidate.nameMatches) : "non_renseignee",
        candidate ? booleanCell(candidate.birthDateMatches) : "non_renseignee",
        candidate ? booleanCell(candidate.licenseMatches) : "non_renseignee",
        candidate ? booleanCell(candidate.validitySufficient) : "non_renseignee",
        candidate ? booleanCell(candidate.exactMatch) : "non_renseignee",
        result.status, result.details, controlledAt
      ]);
    });
    return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
  }

  return {
    analyzeCandidates,
    buildCandidate,
    exportResultsCsv,
    isoDate,
    normalizeDate,
    normalizeHeader,
    normalizeLicense,
    normalizeText,
    parseDelimited,
    parseLivePalmesBatch,
    requiredValidityForSeason,
    searchQueries,
    validityCoversSeason
  };
});
