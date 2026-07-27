import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const INTRANAP_DIR = "C:/Users/ITIFP/OneDrive - SNCF/Documents/BDD INTRANAP";
const OUTPUT_DIR = path.resolve("outputs/intranap-corrections");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "competitions-intranap-a-completer.xlsx");

const POOL_COURSES = new Set([
  "50SF", "100SF", "200SF", "400SF", "800SF", "1500SF",
  "50AP", "100IS", "200IS", "400IS",
  "50BI", "100BI", "200BI", "400BI"
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === "\"") quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows.shift() || [];
  return rows
    .filter((values) => values.some((value) => String(value || "").trim()))
    .map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] || ""])));
}

function clean(value) {
  return String(value || "").trim();
}

function compactList(values, limit = 8) {
  const unique = Array.from(new Set(values.filter(Boolean)));
  const kept = unique.slice(0, limit);
  return kept.join(", ") + (unique.length > kept.length ? `, +${unique.length - kept.length}` : "");
}

const competitionsRows = parseCsv(await fs.readFile(path.join(INTRANAP_DIR, "competitions_202605151706.csv"), "utf8"));
const perfsRows = parseCsv(await fs.readFile(path.join(INTRANAP_DIR, "perfs_202605151707.csv"), "utf8"));

const statsByCompetition = new Map();
for (const perf of perfsRows) {
  const id = clean(perf.compet);
  if (!id) continue;
  const stats = statsByCompetition.get(id) || {
    total: 0,
    usefulPoolRows: 0,
    courses: []
  };
  stats.total += 1;
  if (POOL_COURSES.has(clean(perf.course)) && clean(perf.relais) !== "1") {
    stats.usefulPoolRows += 1;
    stats.courses.push(clean(perf.course));
  }
  statsByCompetition.set(id, stats);
}

const rowsToComplete = competitionsRows
  .filter((competition) => {
    const pool = clean(competition.bassin);
    const chrono = clean(competition.chrono);
    return !pool || pool === "0" || !chrono;
  })
  .map((competition) => {
    const stats = statsByCompetition.get(clean(competition.id)) || { total: 0, usefulPoolRows: 0, courses: [] };
    return [
      clean(competition.id),
      clean(competition.date),
      clean(competition.enddate),
      clean(competition.libelle),
      clean(competition.lieu),
      clean(competition.bassin),
      clean(competition.chrono),
      "",
      "",
      "",
      "",
      stats.total,
      stats.usefulPoolRows,
      compactList(stats.courses)
    ];
  })
  .sort((a, b) => Number(b[12]) - Number(a[12]) || String(a[1]).localeCompare(String(b[1])));

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("A completer");
const help = workbook.worksheets.add("Aide");

const headers = [[
  "competition_id",
  "date_debut",
  "date_fin",
  "nom_competition",
  "lieu",
  "bassin_source",
  "chrono_source",
  "bassin_a_completer",
  "chrono_a_completer",
  "certitude",
  "notes",
  "nb_perfs_total",
  "nb_perfs_piscine_utiles",
  "courses_concernees"
]];

sheet.getRange("A1:N1").values = headers;
if (rowsToComplete.length) {
  sheet.getRangeByIndexes(1, 0, rowsToComplete.length, headers[0].length).values = rowsToComplete;
}

sheet.getRange("A1:N1").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true
};
sheet.getRange(`A1:N${rowsToComplete.length + 1}`).format.borders = {
  preset: "all",
  style: "thin",
  color: "#D6E3EA"
};
sheet.getRange(`A2:N${rowsToComplete.length + 1}`).format = {
  wrapText: true,
  verticalAlignment: "top"
};
sheet.getRange(`H2:H${rowsToComplete.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["25", "33", "50", "a ignorer"] }
};
sheet.getRange(`I2:I${rowsToComplete.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["M", "E", "a verifier"] }
};
sheet.getRange(`J2:J${rowsToComplete.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["sur", "a verifier", "inconnu"] }
};
sheet.freezePanes.freezeRows(1);
sheet.getRange("A:A").format.columnWidthPx = 110;
sheet.getRange("B:C").format.columnWidthPx = 100;
sheet.getRange("D:E").format.columnWidthPx = 260;
sheet.getRange("F:J").format.columnWidthPx = 110;
sheet.getRange("K:K").format.columnWidthPx = 280;
sheet.getRange("L:M").format.columnWidthPx = 120;
sheet.getRange("N:N").format.columnWidthPx = 240;
sheet.tables.add(`A1:N${rowsToComplete.length + 1}`, true, "CompetitionsACompleter");

help.getRange("A1:D1").values = [["Champ", "A completer avec", "Pourquoi", "Exemple"]];
help.getRange("A2:D7").values = [
  ["bassin_a_completer", "25, 33 ou 50", "LivePalmes ne garde que les performances piscine dont le bassin est connu.", "50"],
  ["chrono_a_completer", "M ou E", "M = manuel, E = electronique. Si tu ne sais pas, mets a verifier.", "M"],
  ["certitude", "sur, a verifier ou inconnu", "Permet de savoir si on peut appliquer la correction directement.", "sur"],
  ["notes", "texte libre", "Tu peux indiquer ta source ou un doute.", "Piscine connue en 50 m"],
  ["nb_perfs_piscine_utiles", "lecture seule", "Nombre de performances potentiellement utilisables par LivePalmes.", "12"],
  ["courses_concernees", "lecture seule", "Aide a comprendre quelles courses seraient recuperees.", "100SF, 800SF"]
];
help.getRange("A1:D1").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true
};
help.getRange("A1:D7").format.borders = {
  preset: "all",
  style: "thin",
  color: "#D6E3EA"
};
help.getRange("A:D").format.columnWidthPx = 220;
help.getRange("C:C").format.columnWidthPx = 420;
help.getRange("A1:D7").format.wrapText = true;

const summary = workbook.worksheets.add("Synthese");
summary.getRange("A1:B6").values = [
  ["Indicateur", "Valeur"],
  ["Competitions a verifier", rowsToComplete.length],
  ["Bassin vide", competitionsRows.filter((row) => !clean(row.bassin)).length],
  ["Bassin egal 0", competitionsRows.filter((row) => clean(row.bassin) === "0").length],
  ["Chrono vide", competitionsRows.filter((row) => !clean(row.chrono)).length],
  ["Performances piscine utiles concernees", rowsToComplete.reduce((sum, row) => sum + Number(row[12] || 0), 0)]
];
summary.getRange("A1:B1").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF" }
};
summary.getRange("A1:B6").format.borders = {
  preset: "all",
  style: "thin",
  color: "#D6E3EA"
};
summary.getRange("A:B").format.columnWidthPx = 260;

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const preview = await workbook.render({ sheetName: "Synthese", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(path.join(OUTPUT_DIR, "competitions-intranap-a-completer-preview.png"), new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(OUTPUT_FILE);

console.log(JSON.stringify({ output: OUTPUT_FILE, rows: rowsToComplete.length }, null, 2));
