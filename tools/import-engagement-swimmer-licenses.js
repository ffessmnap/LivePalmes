const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_INDEX = path.join(__dirname, "..", "functions", "assets", "intranap-swimmers-index.json");

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ";") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = (rows.shift() || []).map((value) => value.trim().toLowerCase());
  return rows.filter((values) => values.some((value) => value.trim())).map((values, index) => ({
    line: index + 2,
    data: Object.fromEntries(headers.map((header, column) => [header, String(values[column] || "").trim()]))
  }));
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isoDate(value) {
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return text;
  match = text.match(/^(\d{2})[/.\-](\d{2})[/.\-](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function rosterSwimmerKey(swimmer) {
  return stableHash(`reference|${swimmer.id}`).slice(0, 40);
}

function readValidatedRows(inputPath, indexPath) {
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const byId = new Map();
  index.forEach((swimmer) => {
    [swimmer.id, swimmer.swimmerId, ...(swimmer.aliases || []), ...(swimmer.sourceIds || [])]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .forEach((id) => byId.set(id, swimmer));
  });
  const accepted = [];
  const rejected = [];
  parseCsv(fs.readFileSync(inputPath, "utf8")).forEach(({ line, data }) => {
    const id = data.livepalmes_id || data.swimmer_index_id || data.id_livepalmes || "";
    const lastName = data.nom || data.last_name || "";
    const firstName = data.prenom || data.first_name || "";
    const birthDate = isoDate(data.date_naissance || data.birth_date || "");
    const licenseNumber = data.licence || data.numero_licence || data.license_number || "";
    const swimmer = byId.get(id);
    const exactStatus = !data.statut || data.statut.toLowerCase() === "found";
    const exactDetails = !data.details || normalizeName(data.details) === "CORRESPONDANCE UNIQUE";
    let reason = "";
    if (!id || !swimmer) reason = "livepalmes_id_introuvable";
    else if (!lastName || !firstName || !birthDate || !licenseNumber) reason = "donnees_obligatoires_manquantes";
    else if (normalizeName(lastName) !== normalizeName(swimmer.lastName) || normalizeName(firstName) !== normalizeName(swimmer.firstName) || birthDate !== swimmer.birthDate) reason = "identite_incoherente";
    else if (!exactStatus || !exactDetails) reason = "correspondance_non_exacte";
    if (reason) {
      rejected.push({ line, id, reason });
      return;
    }
    accepted.push({
      line,
      id: String(swimmer.id),
      swimmer,
      licenseNumber,
      targetId: stableHash(String(swimmer.id)).slice(0, 40)
    });
  });
  const seenIds = new Set();
  const seenLicenses = new Map();
  accepted.forEach((row) => {
    if (seenIds.has(row.id)) throw new Error(`ID LivePalmes duplique dans le CSV : ${row.id}`);
    const otherId = seenLicenses.get(row.licenseNumber);
    if (otherId && otherId !== row.id) throw new Error(`Licence ${row.licenseNumber} associee a plusieurs nageurs.`);
    seenIds.add(row.id);
    seenLicenses.set(row.licenseNumber, row.id);
  });
  return { accepted, rejected };
}

async function applyImport(rows, season, inputPath) {
  const projectId = option("project");
  const confirmCount = Number(option("confirm-count", "-1"));
  if (projectId !== "livepalmes") throw new Error("L'application exige --project livepalmes.");
  if (confirmCount !== rows.length) throw new Error(`L'application exige --confirm-count ${rows.length}.`);
  const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
  if (!admin.apps.length) admin.initializeApp({ projectId });
  const db = admin.firestore();
  const refs = rows.map((row) => db.collection("engagementSwimmerLicenses").doc(row.targetId));
  const existing = refs.length ? await db.getAll(...refs) : [];
  existing.forEach((snapshot, index) => {
    const previous = String(snapshot.data()?.licenseNumber || "").trim();
    if (previous && previous !== rows[index].licenseNumber) {
      throw new Error(`Conflit pour l'ID ${rows[index].id} : licence existante ${previous}.`);
    }
  });
  const expectedIdByLicense = new Map(rows.map((row) => [row.licenseNumber, row.id]));
  const licenseNumbers = Array.from(expectedIdByLicense.keys());
  for (let start = 0; start < licenseNumbers.length; start += 30) {
    const snapshot = await db.collection("engagementSwimmerLicenses")
      .where("licenseNumber", "in", licenseNumbers.slice(start, start + 30))
      .get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const expectedId = expectedIdByLicense.get(String(data.licenseNumber || ""));
      const existingId = String(data.swimmerIndexId || "");
      if (expectedId && existingId && existingId !== expectedId) {
        throw new Error(`Licence ${data.licenseNumber} deja associee a l'ID LivePalmes ${existingId}.`);
      }
    });
  }
  const now = new Date().toISOString();
  for (let start = 0; start < rows.length; start += 400) {
    const batch = db.batch();
    rows.slice(start, start + 400).forEach((row) => {
      const swimmer = row.swimmer;
      batch.set(db.collection("engagementSwimmerLicenses").doc(row.targetId), {
        swimmerIndexId: row.id,
        swimmerId: row.id,
        identityKey: `${normalizeName(swimmer.lastName)}|${normalizeName(swimmer.firstName)}|${swimmer.birthDate}`,
        firstName: swimmer.firstName,
        lastName: swimmer.lastName,
        name: swimmer.name || `${swimmer.firstName} ${swimmer.lastName}`,
        birthDate: swimmer.birthDate,
        sex: swimmer.sex || "",
        clubId: String(swimmer.clubId || ""),
        clubName: swimmer.clubName || swimmer.club || "",
        licenseNumber: row.licenseNumber,
        verificationStatus: "verified",
        verificationSource: "admin_import",
        licenseSeasonLabel: season,
        licenseSeasonStatus: "to_check",
        licenseSeasons: {
          [season]: { status: "to_check", updatedAt: now, updatedBy: "admin_import", source: "admin_import" }
        },
        source: { type: "admin_import", file: path.basename(inputPath), collectedAt: now },
        updatedAt: now,
        updatedBy: "admin_import"
      }, { merge: true });
    });
    await batch.commit();
  }
  const rowsByClub = new Map();
  rows.forEach((row) => {
    const clubId = String(row.swimmer.clubId || "");
    if (!clubId) return;
    if (!rowsByClub.has(clubId)) rowsByClub.set(clubId, []);
    rowsByClub.get(clubId).push(row);
  });
  for (const [clubId, clubRows] of rowsByClub) {
    const swimmers = {};
    clubRows.forEach((row) => {
      const swimmer = row.swimmer;
      swimmers[rosterSwimmerKey(row)] = {
        id: row.id,
        swimmerIndexId: row.id,
        swimmerId: row.id,
        source: "reference",
        firstName: swimmer.firstName,
        lastName: swimmer.lastName,
        name: swimmer.name || `${swimmer.firstName} ${swimmer.lastName}`,
        birthDate: swimmer.birthDate,
        sex: swimmer.sex || "",
        clubId,
        club: swimmer.club || "",
        clubName: swimmer.clubName || swimmer.club || "",
        licenseNumber: row.licenseNumber,
        licenseVerificationStatus: "verified",
        licenseSeasonLabel: season,
        licenseSeasonStatus: "to_check",
        active: true,
        updatedAt: now
      };
    });
    await db.collection("engagementClubRosters").doc(stableHash(clubId).slice(0, 40)).set({
      clubId,
      clubName: clubRows[0].swimmer.clubName || clubRows[0].swimmer.club || "",
      updatedAt: now,
      swimmers
    }, { merge: true });
  }
}

async function main() {
  const inputPath = path.resolve(option("input"));
  const indexPath = path.resolve(option("index", DEFAULT_INDEX));
  const season = option("season");
  const apply = process.argv.includes("--apply");
  if (!option("input") || !/^\d{4}-\d{4}$/.test(season)) {
    throw new Error("Usage: node tools/import-engagement-swimmer-licenses.js --input <csv> --season 2025-2026 [--apply --project livepalmes --confirm-count N]");
  }
  const { accepted, rejected } = readValidatedRows(inputPath, indexPath);
  const summary = { mode: apply ? "apply" : "dry-run", inputPath, season, accepted: accepted.length, rejected: rejected.length, rejectedRows: rejected.slice(0, 30) };
  console.log(JSON.stringify(summary, null, 2));
  if (rejected.length) throw new Error("Import refuse : certaines lignes ne sont pas des correspondances exactes.");
  if (!accepted.length) throw new Error("Aucune ligne importable.");
  if (apply) {
    await applyImport(accepted, season, inputPath);
    console.log(`Import termine : ${accepted.length} licence(s).`);
  } else {
    console.log("Simulation terminee : aucune ecriture Firebase.");
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
