import fs from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve("docs", "Trame_import_competition_internationale_LivePalmes.xlsx");

const courses = [
  ["50SF", "50 m Surface", "SF", 50],
  ["100SF", "100 m Surface", "SF", 100],
  ["200SF", "200 m Surface", "SF", 200],
  ["400SF", "400 m Surface", "SF", 400],
  ["800SF", "800 m Surface", "SF", 800],
  ["1500SF", "1500 m Surface", "SF", 1500],
  ["50AP", "50 m Apnee", "AP", 50],
  ["100IS", "100 m Immersion", "IS", 100],
  ["200IS", "200 m Immersion", "IS", 200],
  ["400IS", "400 m Immersion", "IS", 400],
  ["50BI", "50 m Bipalmes", "BI", 50],
  ["100BI", "100 m Bipalmes", "BI", 100],
  ["200BI", "200 m Bipalmes", "BI", 200],
  ["400BI", "400 m Bipalmes", "BI", 400]
];

const competitionRows = [
  ["Champ", "Obligatoire", "Valeur a completer", "Exemple", "Utilisation LivePalmes"],
  ["competition_name", "OUI", "", "CMAS World Cup - Round 1", "Nom affiche et cle de regroupement"],
  ["competition_start_date", "OUI", "", "22-05-2026", "Date principale de la competition"],
  ["competition_end_date", "NON", "", "24-05-2026", "Utile pour les competitions sur plusieurs jours"],
  ["competition_city", "OUI", "", "Lignano Sabbiadoro", "Lieu affiche dans les tops/fiches"],
  ["competition_country", "OUI", "", "Italie", "Pays de la competition"],
  ["pool_size", "OUI", "", "50", "Seulement 25 ou 50 m sont acceptes"],
  ["pool_kind", "OUI", "", "Piscine", "Les courses hors bassin ne seront pas importees"],
  ["competition_level", "NON", "", "Internationale", "Information de controle"],
  ["external_competition_id", "NON", "", "CMAS-2026-WC1", "Reference externe si disponible"],
  ["source_url", "NON", "", "https://...", "Lien vers resultats officiels"],
  ["contact_email", "NON", "", "results@example.org", "Contact si controle necessaire"],
  ["notes", "NON", "", "", "Commentaire libre"]
];

const performanceHeaders = [
  "race_date",
  "course_code",
  "sex",
  "last_name",
  "first_name",
  "birth_date",
  "nationality",
  "federation_code",
  "club_code",
  "club_name",
  "international_id",
  "category_declared",
  "round",
  "rank",
  "final_time",
  "ti1_100m",
  "ti2_200m",
  "ti3_400m",
  "ti4_800m",
  "entry_time",
  "points",
  "status",
  "notes"
];

const performanceNotes = [
  ["Colonne", "Obligatoire", "Format attendu", "Exemple", "Remarque"],
  ["race_date", "NON", "JJ-MM-AAAA", "22-05-2026", "Si vide, la date competition_start_date sera utilisee"],
  ["course_code", "OUI", "Liste LivePalmes", "400SF", "Courses bassin uniquement"],
  ["sex", "OUI", "F ou M", "F", "Jamais de melange F/M dans les tops"],
  ["last_name", "OUI", "Texte", "DUPONT", "Nom officiel du nageur"],
  ["first_name", "OUI", "Texte", "Camille", "Prenom officiel du nageur"],
  ["birth_date", "OUI", "JJ-MM-AAAA", "14-03-2003", "Sert au rapprochement et au calcul categorie"],
  ["nationality", "OUI", "Texte ou code pays", "France", "Nationalite sportive"],
  ["federation_code", "OUI", "Code pays/federation", "FRA", "Important pour les competitions internationales"],
  ["club_code", "NON", "Texte", "PAN", "Code club/equipe si connu"],
  ["club_name", "OUI", "Texte", "Pays d'Aix Natation", "Affiche dans les tops/fiches"],
  ["international_id", "NON", "Texte", "CMAS123456", "Identifiant CMAS/federation si connu"],
  ["category_declared", "NON", "Liste", "S", "La categorie LivePalmes sera recalculee avec l'age"],
  ["round", "NON", "Texte", "Finale A", "Serie, demi-finale, finale"],
  ["rank", "NON", "Nombre", "1", "Classement officiel de la course"],
  ["final_time", "OUI", "ss.cc ou m:ss.cc", "3:18.42", "Utiliser le point pour les centiemes"],
  ["ti1_100m", "NON", "ss.cc ou m:ss.cc", "45.54", "TI1 correspond au passage 100 m"],
  ["ti2_200m", "NON", "ss.cc ou m:ss.cc", "1:39.86", "TI2 correspond au passage 200 m"],
  ["ti3_400m", "NON", "ss.cc ou m:ss.cc", "3:31.56", "TI3 correspond au passage 400 m"],
  ["ti4_800m", "NON", "ss.cc ou m:ss.cc", "7:20.87", "TI4 correspond au passage 800 m"],
  ["entry_time", "NON", "ss.cc ou m:ss.cc", "3:20.00", "Temps d'engagement si disponible"],
  ["points", "NON", "Nombre", "958", "Points officiels si disponibles"],
  ["status", "OUI", "OK/DNS/DNF/DSQ", "OK", "Seules les lignes OK entreront dans les tops"],
  ["notes", "NON", "Texte", "", "Commentaire libre"]
];

const exampleRows = [
  performanceHeaders,
  ["22-05-2026", "400SF", "F", "DUPONT", "Camille", "14-03-2003", "France", "FRA", "PAN", "Pays d'Aix Natation", "CMAS123456", "S", "Finale A", 1, "3:18.42", "45.54", "1:39.86", "", "", "3:20.00", 958, "OK", "Exemple fictif"],
  ["22-05-2026", "1500SF", "M", "MARTIN", "Louis", "02-11-2001", "France", "FRA", "TMP", "Toulouse Metropole Palmes", "", "S", "Finale", 2, "13:12.40", "49.71", "1:43.34", "3:35.20", "7:20.87", "", "", "OK", "Les passages peuvent entrer dans les tops"],
  ["23-05-2026", "100BI", "F", "ROSSI", "Giulia", "06-07-2005", "Italie", "ITA", "ITA", "Federazione Italiana", "ITA789", "J", "Serie", 3, "48.61", "", "", "", "", "49.00", "", "OK", "Nageuse internationale"]
];

const listRows = [
  ["Courses autorisees", "Libelle", "Famille", "Distance"],
  ...courses,
  [],
  ["Sexes"],
  ["F"],
  ["M"],
  [],
  ["Tailles bassin"],
  ["25"],
  ["50"],
  [],
  ["Statuts"],
  ["OK"],
  ["DNS"],
  ["DNF"],
  ["DSQ"],
  [],
  ["Categories indicatives"],
  ["P", "Poussin"],
  ["B", "Benjamin"],
  ["M", "Minime"],
  ["C", "Cadet"],
  ["J", "Junior"],
  ["S", "Senior"],
  ["M30+", "Master 30+"],
  ["M40+", "Master 40+"],
  ["M50+", "Master 50+"],
  ["M60+", "Master 60+"],
  ["M70+", "Master 70+"],
  ["M80+", "Master 80+"],
  [],
  ["Passages"],
  ["TI1", "100 m"],
  ["TI2", "200 m"],
  ["TI3", "400 m"],
  ["TI4", "800 m"]
];

const helpRows = [
  ["Trame d'import competition internationale LivePalmes"],
  [""],
  ["Objectif", "Permettre a une federation ou un club de fournir des resultats internationaux exploitables pour les TOP et les fiches nageurs."],
  ["Principe", "Remplir d'abord l'onglet Competition, puis saisir une ligne par performance dans l'onglet Performances."],
  ["Nageur", "Le rapprochement se fera prioritairement avec nom + prenom + date de naissance + sexe. L'identifiant international aide au controle mais ne remplace pas la date de naissance."],
  ["Categorie", "Ne pas se fier uniquement a la categorie fournie. LivePalmes recalculera la categorie avec l'age du nageur et la date de course."],
  ["Temps", "Saisir les temps en texte avec un point pour les centiemes : 45.54 ou 3:18.42. Eviter les formats Excel automatiques."],
  ["Passages", "TI1=100 m, TI2=200 m, TI3=400 m, TI4=800 m. Ces passages pourront alimenter les tops correspondants."],
  ["Courses", "Seules les courses bassin listees dans l'onglet Listes sont prevues : SF, AP, IS et BI."],
  ["Statut", "Mettre OK pour une performance valide. DNS, DNF et DSQ sont gardes pour controle mais ne doivent pas alimenter les tops."],
  ["Club / federation", "Pour un nageur international, renseigner club_name avec l'equipe/federation visible dans les resultats officiels si le club reel n'est pas connu."],
  ["Exemple", "L'onglet Exemple contient des lignes fictives. Ne pas les copier dans Performances sauf pour les remplacer."]
];

function xml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

function cellRef(rowIndex, colIndex) {
  return `${columnName(colIndex)}${rowIndex + 1}`;
}

function styleForCell(sheetName, rowIndex, colIndex, value) {
  if (sheetName === "Aide" && rowIndex === 0) return 1;
  if (sheetName === "Competition" && rowIndex === 0) return 1;
  if (sheetName === "Competition" && rowIndex === 2) return 2;
  if (sheetName === "Performances" && rowIndex === 0) return 1;
  if (sheetName === "Performances" && rowIndex === 2) return 5;
  if (sheetName === "Performances" && rowIndex === 3) {
    const required = new Set(["course_code", "sex", "last_name", "first_name", "birth_date", "nationality", "federation_code", "club_name", "final_time", "status"]);
    return required.has(String(value)) ? 3 : 4;
  }
  if (sheetName === "Exemple" && rowIndex === 0) return 2;
  if (sheetName === "Listes" && [0, 5, 9, 13, 19, 33].includes(rowIndex)) return 2;
  return 0;
}

function rowXml(sheetName, row, rowIndex) {
  const cells = row.map((value, colIndex) => {
    if (value === null || value === undefined || value === "") return "";
    const ref = cellRef(rowIndex, colIndex);
    const style = styleForCell(sheetName, rowIndex, colIndex, value);
    const styleAttr = style ? ` s="${style}"` : "";
    if (typeof value === "number") {
      return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${xml(value)}</t></is></c>`;
  }).join("");
  return `<row r="${rowIndex + 1}">${cells}</row>`;
}

function sheetXml({ name, rows, columns, merges = [], validations = [], autofilter = "", freezeRows = 0 }) {
  const colsXml = columns?.length
    ? `<cols>${columns.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const paneXml = freezeRows
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  const mergesXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  const validationXml = validations.length
    ? `<dataValidations count="${validations.length}">${validations.map((validation) => (
      `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${validation.ref}"><formula1>${xml(validation.formula)}</formula1></dataValidation>`
    )).join("")}</dataValidations>`
    : "";
  const autofilterXml = autofilter ? `<autoFilter ref="${autofilter}"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${paneXml}
${colsXml}
<sheetData>
${rows.map((row, rowIndex) => rowXml(name, row, rowIndex)).join("\n")}
</sheetData>
${autofilterXml}
${mergesXml}
${validationXml}
</worksheet>`;
}

function workbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("\n")}
</sheets>
</workbook>`;
}

function workbookRelsXml(sheets) {
  const sheetRels = sheets.map((sheet, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypesXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF0B2F34"/><name val="Calibri"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0F7A87"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD8A21B"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEAF4F5"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD6E2E3"/></left><right style="thin"><color rgb="FFD6E2E3"/></right><top style="thin"><color rgb="FFD6E2E3"/></top><bottom style="thin"><color rgb="FFD6E2E3"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function dosTimeDate(date = new Date()) {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function zip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosTimeDate();
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.content, "utf8");
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(stamp.time),
      u16(stamp.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data
    ]);
    localParts.push(local);
    centralParts.push(Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(stamp.time),
      u16(stamp.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    ]));
    offset += local.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0)
  ]);
  return Buffer.concat([...localParts, central, end]);
}

const blankPerformanceRows = Array.from({ length: 200 }, () => Array(performanceHeaders.length).fill(""));
const sheets = [
  {
    name: "Aide",
    xml: sheetXml({
      name: "Aide",
      rows: helpRows,
      columns: [26, 120],
      merges: ["A1:B1"],
      freezeRows: 1
    })
  },
  {
    name: "Competition",
    xml: sheetXml({
      name: "Competition",
      rows: [["Competition"], [], ...competitionRows],
      columns: [28, 16, 28, 28, 62],
      merges: ["A1:E1"],
      autofilter: "A3:E16",
      freezeRows: 3,
      validations: [
        { ref: "C9", formula: '"25,50"' },
        { ref: "C10", formula: '"Piscine"' }
      ]
    })
  },
  {
    name: "Performances",
    xml: sheetXml({
      name: "Performances",
      rows: [
        ["Performances a importer"],
        [],
        ["Colonnes jaunes = obligatoires. Saisir une ligne par performance individuelle valide."],
        performanceHeaders,
        ...blankPerformanceRows
      ],
      columns: [14, 14, 9, 20, 18, 14, 16, 15, 14, 26, 18, 18, 14, 10, 14, 14, 14, 14, 14, 14, 10, 10, 36],
      merges: ["A1:W1", "A3:W3"],
      autofilter: "A4:W204",
      freezeRows: 4,
      validations: [
        { ref: "B5:B204", formula: "Listes!$A$2:$A$15" },
        { ref: "C5:C204", formula: "Listes!$A$18:$A$19" },
        { ref: "L5:L204", formula: "Listes!$A$32:$A$43" },
        { ref: "V5:V204", formula: "Listes!$A$26:$A$29" }
      ]
    })
  },
  {
    name: "Exemple",
    xml: sheetXml({
      name: "Exemple",
      rows: exampleRows,
      columns: [14, 14, 9, 20, 18, 14, 16, 15, 14, 26, 18, 18, 14, 10, 14, 14, 14, 14, 14, 14, 10, 10, 36],
      autofilter: "A1:W4",
      freezeRows: 1
    })
  },
  {
    name: "Listes",
    xml: sheetXml({
      name: "Listes",
      rows: listRows,
      columns: [20, 28, 14, 12],
      freezeRows: 1
    })
  }
];

const now = new Date().toISOString();
const files = [
  { name: "[Content_Types].xml", content: contentTypesXml(sheets) },
  { name: "_rels/.rels", content: rootRels },
  { name: "xl/workbook.xml", content: workbookXml(sheets) },
  { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml(sheets) },
  { name: "xl/styles.xml", content: styles },
  ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheet.xml })),
  {
    name: "docProps/core.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Trame import competition internationale LivePalmes</dc:title>
<dc:creator>LivePalmes</dc:creator>
<cp:lastModifiedBy>LivePalmes</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`
  },
  {
    name: "docProps/app.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>LivePalmes</Application>
<DocSecurity>0</DocSecurity>
<ScaleCrop>false</ScaleCrop>
<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
<TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map((sheet) => `<vt:lpstr>${xml(sheet.name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts>
</Properties>`
  }
];

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, zip(files));
console.log(outputPath);
