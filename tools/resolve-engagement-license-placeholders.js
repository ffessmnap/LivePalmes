const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
  return rows.filter((values) => values.some((value) => value.trim())).map((values) =>
    Object.fromEntries(headers.map((header, column) => [header, String(values[column] || "").trim()]))
  );
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

async function main() {
  const projectId = option("project");
  const inputPath = path.resolve(option("input"));
  const conflictReportPath = path.resolve(option("conflict-report"));
  const season = option("season");
  const confirmCount = Number(option("confirm-count", "-1"));
  if (!process.argv.includes("--apply") || projectId !== "livepalmes" || !option("input") || !option("conflict-report") || !/^\d{4}-\d{4}$/.test(season)) {
    throw new Error("Usage: node tools/resolve-engagement-license-placeholders.js --input <csv> --conflict-report <json> --season 2025-2026 --apply --project livepalmes --confirm-count 5");
  }

  const report = JSON.parse(fs.readFileSync(conflictReportPath, "utf8"));
  const conflicts = (Array.isArray(report.exceptions) ? report.exceptions : []).filter((item) =>
    item.status === "conflict" && item.existingLicense === "XXX"
  );
  if (conflicts.length !== confirmCount) throw new Error(`Confirmation invalide : ${conflicts.length} correction(s) attendue(s).`);
  const inputById = new Map(parseCsv(fs.readFileSync(inputPath, "utf8")).map((row) => [row.livepalmes_id, row]));
  const swimmers = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "functions", "assets", "intranap-swimmers-index.json"), "utf8"));
  const swimmersById = new Map(swimmers.map((swimmer) => [String(swimmer.id || ""), swimmer]));
  const corrections = conflicts.map((conflict) => {
    const row = inputById.get(String(conflict.livepalmesId || ""));
    const swimmer = swimmersById.get(String(conflict.livepalmesId || ""));
    if (!row || !swimmer || row.licence !== conflict.licenseNumber) {
      throw new Error(`Donnees locales incoherentes pour l'ID ${conflict.livepalmesId}.`);
    }
    return { conflict, row, swimmer };
  });

  const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
  if (!admin.apps.length) admin.initializeApp({ projectId });
  const db = admin.firestore();
  const now = new Date().toISOString();
  const outcomes = [];

  for (const correction of corrections) {
    const id = String(correction.conflict.livepalmesId);
    const ref = db.collection("engagementSwimmerLicenses").doc(stableHash(id).slice(0, 40));
    try {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.data() || {};
        if (!snapshot.exists || String(data.swimmerIndexId || "") !== id || String(data.licenseNumber || "") !== "XXX") {
          throw new Error("Condition de remplacement XXX non satisfaite.");
        }
        transaction.set(ref, {
          licenseNumber: correction.row.licence,
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
      outcomes.push({ id, status: "corrected" });
    } catch (error) {
      outcomes.push({ id, status: "failed", error: error?.message || String(error) });
    }
  }

  const correctedIds = new Set(outcomes.filter((item) => item.status === "corrected").map((item) => item.id));
  const rowsByClub = new Map();
  corrections.filter((item) => correctedIds.has(String(item.conflict.livepalmesId))).forEach((item) => {
    const clubId = String(item.swimmer.clubId || "");
    if (!rowsByClub.has(clubId)) rowsByClub.set(clubId, []);
    rowsByClub.get(clubId).push(item);
  });
  const batch = db.batch();
  for (const [clubId, clubRows] of rowsByClub) {
    const rosterSwimmers = {};
    clubRows.forEach(({ conflict, row, swimmer }) => {
      const id = String(conflict.livepalmesId);
      rosterSwimmers[stableHash(`reference|${id}`).slice(0, 40)] = {
        id,
        swimmerIndexId: id,
        swimmerId: id,
        source: "reference",
        firstName: swimmer.firstName || "",
        lastName: swimmer.lastName || "",
        name: swimmer.name || `${swimmer.firstName || ""} ${swimmer.lastName || ""}`.trim(),
        birthDate: swimmer.birthDate || "",
        sex: swimmer.sex || "",
        clubId,
        club: swimmer.club || "",
        clubName: swimmer.clubName || swimmer.club || "",
        licenseNumber: row.licence,
        licenseVerificationStatus: "verified",
        licenseSeasonLabel: season,
        licenseSeasonStatus: "to_check",
        active: true,
        updatedAt: now
      };
    });
    batch.set(db.collection("engagementClubRosters").doc(stableHash(clubId).slice(0, 40)), {
      clubId,
      clubName: clubRows[0].swimmer.clubName || clubRows[0].swimmer.club || "",
      updatedAt: now,
      swimmers: rosterSwimmers
    }, { merge: true });
  }
  if (correctedIds.size) await batch.commit();

  const verificationSnapshots = await db.getAll(...corrections.map(({ conflict }) =>
    db.collection("engagementSwimmerLicenses").doc(stableHash(String(conflict.livepalmesId)).slice(0, 40))
  ));
  const verified = verificationSnapshots.filter((snapshot, index) => {
    const data = snapshot.data() || {};
    return data.licenseNumber === corrections[index].row.licence &&
      data.verificationStatus === "verified" &&
      data.licenseSeasonLabel === season &&
      data.licenseSeasonStatus === "to_check";
  }).length;
  const result = {
    projectId,
    season,
    seasonStatus: "to_check",
    requested: corrections.length,
    corrected: correctedIds.size,
    verified,
    rosterDocumentsWritten: rowsByClub.size,
    outcomes,
    completedAt: new Date().toISOString()
  };
  const outputPath = path.join(path.dirname(conflictReportPath), `rapport-correction-licences-xxx-${now.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, outputPath }, null, 2));
  if (correctedIds.size !== corrections.length || verified !== corrections.length) {
    throw new Error(`Correction incomplete. Consulter ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
