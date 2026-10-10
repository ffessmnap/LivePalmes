(function exposeLicenseReport(root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./core.js") : root.LivePalmesLicenseControl);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LivePalmesLicenseReport = api;
})(typeof window !== "undefined" ? window : {}, (core) => {
  "use strict";

  const LABELS = {
    validable: "Conforme", licence_expiree: "Licence expirée", anomalie_licence: "Licence différente",
    anomalie_identite: "Identité à vérifier", ambigu: "Correspondance ambiguë", introuvable: "Introuvable",
    timeout: "Contrôle à relancer", erreur: "Erreur de contrôle", non_controle: "Non contrôlé"
  };
  const WIDTHS = [22, 20, 28, 14, 19, 19, 15, 26, 60, 80];
  const HEADERS = ["Nom", "Prénom", "Club LivePalmes", "Date de naissance", "Licence LivePalmes", "Licence FFESSM", "Validité FFESSM", "Contrôle", "Écart constaté", "Observations"];

  function competitionsOf(person) {
    return String(person.competitions || "").split("|").map(value => value.trim()).filter(Boolean);
  }

  function competitionNames(people = []) {
    return Array.from(new Set(people.flatMap(competitionsOf))).sort((a, b) => a.localeCompare(b, "fr"));
  }

  function retainedCandidate(result) {
    return result.status !== "ambigu" && result.selectedCandidate?.exactIdentity ? result.selectedCandidate : null;
  }


  function nameParts(person, candidate) {
    const raw = String(candidate.name || "").trim();
    const tokens = Array.from(raw.matchAll(/[\p{L}\p{N}]+/gu)).map(match => ({
      value: core.normalizeText(match[0]), start: match.index, end: match.index + match[0].length
    })).filter(token => token.value);
    const parts = [];
    for (const [field, other] of [["lastName", "firstName"], ["firstName", "lastName"]]) {
      const expected = core.normalizeText(person[field]).split(" ").filter(Boolean);
      if (!expected.length || tokens.length <= expected.length) continue;
      for (const atStart of [true, false]) {
        const offset = atStart ? 0 : tokens.length - expected.length;
        if (!expected.every((value, index) => tokens[offset + index].value === value)) continue;
        const known = atStart ? raw.slice(0, tokens[expected.length - 1].end) : raw.slice(tokens[offset].start);
        const remainder = atStart ? raw.slice(tokens[expected.length].start) : raw.slice(0, tokens[offset - 1].end);
        parts.push({ [field]: known.trim(), [other]: remainder.trim() });
      }
    }
    return parts;
  }

  function smallNameDifference(left, right) {
    const a = core.normalizeText(left).replace(/\s/g, ""), b = core.normalizeText(right).replace(/\s/g, "");
    if (!a || !b || a === b || Math.min(a.length, b.length) < 3 || Math.max(a.length, b.length) > 100) return false;
    // Distance de Damerau-Levenshtein : une inversion voisine compte pour une faute.
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
        }
      }
    }
    const distance = matrix[a.length][b.length], longest = Math.max(a.length, b.length);
    return distance <= (longest < 6 ? 1 : 2) && distance / longest <= 0.25;
  }

  function identityLead(person, candidate) {
    const matches = new Map();
    const birthDate = core.normalizeDate(candidate.birthDate);
    for (const parts of nameParts(person, candidate)) {
      const last = core.normalizeText(parts.lastName) === core.normalizeText(person.lastName);
      const first = core.normalizeText(parts.firstName) === core.normalizeText(person.firstName);
      const date = birthDate && birthDate === person.birthDate;
      let lead = null;
      if (!last && first && date && smallNameDifference(parts.lastName, person.lastName)) {
        lead = { field: "Nom", local: person.lastName, federal: parts.lastName, agreement: "Prénom et date de naissance concordent." };
      } else if (last && !first && date && smallNameDifference(parts.firstName, person.firstName)) {
        lead = { field: "Prénom", local: person.firstName, federal: parts.firstName, agreement: "Nom et date de naissance concordent." };
      } else if (last && first && !date) {
        lead = { field: "Date de naissance", local: person.birthDate, federal: birthDate || "non renseignée", agreement: "Nom et prénom concordent." };
      }
      if (lead) matches.set([lead.field, lead.federal].join("|"), lead);
    }
    return matches.size === 1 ? Array.from(matches.values())[0] : null;
  }

  function observation(result) {
    const retained = retainedCandidate(result);
    if (retained) {
      const notes = new Set();
      for (const parts of nameParts(result, retained)) {
        if (["lastName", "firstName"].every(field => core.normalizeText(parts[field]) === core.normalizeText(result[field]))) {
          for (const [field, label] of [["lastName", "Nom"], ["firstName", "Prénom"]]) {
            const presentation = value => String(value).normalize("NFC").toUpperCase().replace(/\s+/g, " ").trim();
            if (presentation(parts[field]) !== presentation(result[field])) {
              notes.add(label + " : LivePalmes « " + result[field] + " » ; Ma Commission « " + parts[field] + " ». Différence d’accent ou de présentation, déjà tolérée par le contrôle.");
            }
          }
        }
      }
      return Array.from(notes).join("\n");
    }
    if (result.status !== "anomalie_identite") return "";
    const leads = (result.candidates || []).map(candidate => ({ candidate, lead: identityLead(result, candidate) })).filter(item => item.lead);
    if (leads.length > 1) return "Plusieurs profils concordent sur deux éléments d’identité. Aucune piste unique ; contrôle manuel nécessaire.";
    if (leads.length !== 1) return "";
    const { candidate, lead } = leads[0];
    return "Piste unique à vérifier — profil Ma Commission : " + candidate.name + ", né(e) le " + (candidate.birthDate || "date non renseignée") +
      (candidate.license ? ", licence " + candidate.license : "") + ".\n" +
      lead.field + " : LivePalmes « " + lead.local + " » ; Ma Commission « " + lead.federal + " ». " + lead.agreement +
      "\nRapprochement non validé. Vérifier les justificatifs pour déterminer la valeur correcte.";
  }

  function discrepancy(result, candidate) {
    if (result.status === "validable") return result.currentLicense ? "Aucun écart." : "Numéro de licence absent de LivePalmes ; retrouvé sur Ma Commission.";
    if (result.status === "licence_expiree") return `Validité ${candidate?.validity || "non renseignée"} ; minimum requis : ${result.requiredValidity}.`;
    if (result.status === "anomalie_licence") {
      const validity = candidate?.validitySufficient === false ? ` Validité ${candidate.validity || "non renseignée"} insuffisante (minimum : ${result.requiredValidity}).` : "";
      return `Numéro LivePalmes différent du numéro FFESSM pour la même identité.${validity}`;
    }
    if (result.status === "anomalie_identite") return "Aucune identité exacte retrouvée (nom, prénom et date de naissance). Contrôle manuel nécessaire.";
    if (result.status === "ambigu") return "Plusieurs identités exactes retrouvées. Contrôle manuel nécessaire.";
    if (result.status === "introuvable") return "Aucune correspondance retrouvée sur Ma Commission.";
    if (result.status === "non_controle") return "Ce nageur n’a pas encore été contrôlé.";
    return result.details || "Le contrôle n’a pas abouti. Relancer la recherche.";
  }

  function buildReport(batch, results, competition, controlledAt = new Date()) {
    if (!batch?.people?.length) throw new Error("Chargez un lot LivePalmes.");
    const names = competitionNames(batch.people);
    if (names.length && !names.includes(competition)) throw new Error("Choisissez une compétition du lot.");
    if (!names.length && competition) throw new Error("La compétition n’est pas renseignée dans ce lot.");
    const byId = new Map();
    for (const result of results) {
      if (byId.has(result.livePalmesId)) throw new Error("Un nageur possède plusieurs résultats de contrôle.");
      byId.set(result.livePalmesId, result);
    }
    const people = batch.people.filter(person => !names.length || competitionsOf(person).includes(competition));
    const rows = people.map(person => {
      const result = byId.get(person.livePalmesId) || { ...person, status: "non_controle" };
      const candidate = retainedCandidate(result);
      return {
        id: person.livePalmesId, status: result.status,
        values: [person.lastName, person.firstName, person.clubName || "Non renseigné", person.birthDate, person.currentLicense,
          candidate?.license || "", candidate?.validity || "", LABELS[result.status] || "À vérifier",
          discrepancy(result, candidate), observation(result)]
      };
    }).sort((a, b) => (a.status === "validable") - (b.status === "validable") ||
      String(a.values[0]).localeCompare(String(b.values[0]), "fr") || String(a.values[1]).localeCompare(String(b.values[1]), "fr"));
    const pending = rows.filter(row => row.status === "non_controle").length;
    const conforming = rows.filter(row => row.status === "validable").length;
    return {
      competition: competition || "Compétition non renseignée", batchId: batch.batchId,
      season: batch.season, requiredValidity: batch.requiredValidity,
      controlledAt: new Date(controlledAt), rows,
      summary: { total: rows.length, controlled: rows.length - pending, conforming, toReview: rows.length - pending - conforming, pending }
    };
  }

  function xml(value) {
    return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 32767)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function excelDate(value) {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
    const date = Date.UTC(year, month - 1, day);
    const parts = new Date(date);
    if (year < 1900 || parts.getUTCFullYear() !== year || parts.getUTCMonth() !== month - 1 || parts.getUTCDate() !== day) return null;
    return (date - Date.UTC(1899, 11, 31)) / 86400000 + (date >= Date.UTC(1900, 2, 1) ? 1 : 0);
  }

  function cell(address, value, style = 0, date = false) {
    const number = date ? excelDate(value) : typeof value === "number" ? value : null;
    if (number !== null) return `<c r="${address}" s="${date ? 3 : style}"><v>${number}</v></c>`;
    return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }

  function worksheet(report) {
    const row = (n, cells, height = 24) => `<row r="${n}" ht="${height}" customHeight="1">${cells}</row>`;
    const dateText = report.controlledAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const s = report.summary;
    let data = row(1, cell("A1", "LivePalmes — Bilan du contrôle des licences", 1), 36);
    data += row(2, cell("A2", report.competition, 6), Math.max(28, Math.ceil(report.competition.length / 120) * 16));
    data += row(3, cell("A3", `Saison ${report.season} · Export du ${dateText} · Lot ${report.batchId}`, 6), 24);
    data += row(5, [cell("A5", "Contrôlés", 6), cell("B5", s.controlled, 7), cell("C5", "Conformes", 6), cell("D5", s.conforming, 7),
      cell("E5", "À vérifier", 6), cell("F5", s.toReview, 7), cell("G5", "Non contrôlés", 6), cell("H5", s.pending, 7)].join(""), 30);
    data += row(6, cell("A6", `${s.total} nageur(s) inscrit(s) · Validité minimale requise : ${report.requiredValidity}. Filtrez la colonne Contrôle pour afficher les écarts.`, 6), 26);
    data += row(8, HEADERS.map((h, i) => cell(`${String.fromCharCode(65 + i)}8`, h, 2)).join(""), 36);
    report.rows.forEach((result, index) => {
      const n = index + 9;
      const statusStyle = result.status === "validable" ? 4 : result.status === "non_controle" ? 8 :
        ["licence_expiree", "erreur"].includes(result.status) ? 9 : 5;
      const lines = Math.max(...result.values.map((value, i) => String(value || "").split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / (WIDTHS[i] - 2))), 0)));
      const cells = result.values.map((value, i) => cell(`${String.fromCharCode(65 + i)}${n}`, value, i === 7 ? statusStyle : 0, i === 3 || i === 6)).join("");
      data += row(n, cells, Math.min(400, Math.max(36, 14 * lines + 10)));
    });
    const last = report.rows.length + 8;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:J${last}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="8" topLeftCell="A9" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="24"/><cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${data}</sheetData><autoFilter ref="A8:J${last}"/>
<mergeCells count="4"><mergeCell ref="A1:J1"/><mergeCell ref="A2:J2"/><mergeCell ref="A3:J3"/><mergeCell ref="A6:J6"/></mergeCells>
<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>
<pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L${xml(report.competition)}&amp;RPage &amp;P / &amp;N</oddFooter></headerFooter></worksheet>`;
  }

  function styles() {
    const font = (color, bold = false, size = 11) => `<font><sz val="${size}"/><color rgb="FF${color}"/><name val="Arial"/>${bold ? "<b/>" : ""}</font>`;
    const fill = color => `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`;
    const xf = (fontId, fillId, numFmtId = 0, borderId = 1) => `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyAlignment="1" applyNumberFormat="1" applyFill="1" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="7">${font("172033")}${font("FFFFFF", true, 18)}${font("FFFFFF", true)}${font("166534")}${font("92400E")}${font("64748B")}${font("991B1B")}</fonts>
<fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill("123B67")}${fill("EEF4FB")}${fill("E8F5EC")}${fill("FFF4D6")}${fill("F1F5F9")}${fill("FDECEC")}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="hair"><color rgb="FFD8DEE8"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">${xf(0, 0)}${xf(1, 2, 0, 0)}${xf(2, 2)}${xf(0, 0, 164)}${xf(3, 4)}${xf(4, 5)}${xf(0, 3, 0, 0)}${xf(0, 3, 0, 0)}${xf(5, 6)}${xf(6, 7)}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }

  // A small ZIP writer for these six local XML files: no dependency or network access.
  function zipFiles(files) {
    const encoder = new TextEncoder();
    const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
      let c = index;
      for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      return c >>> 0;
    });
    const crc = bytes => {
      let c = 0xffffffff;
      for (const byte of bytes) c = (c >>> 8) ^ crcTable[(c ^ byte) & 255];
      return (c ^ 0xffffffff) >>> 0;
    };
    const entries = files.map(([name, contents]) => ({ name: encoder.encode(name), data: encoder.encode(contents) }));
    const localSize = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length, 0);
    const centralSize = entries.reduce((n, e) => n + 46 + e.name.length, 0);
    const bytes = new Uint8Array(localSize + centralSize + 22);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    for (const e of entries) {
      e.offset = offset; e.crc = crc(e.data);
      view.setUint32(offset, 0x04034b50, true); view.setUint16(offset + 4, 20, true);
      view.setUint16(offset + 6, 0x800, true); view.setUint16(offset + 12, 33, true);
      view.setUint32(offset + 14, e.crc, true); view.setUint32(offset + 18, e.data.length, true);
      view.setUint32(offset + 22, e.data.length, true); view.setUint16(offset + 26, e.name.length, true);
      bytes.set(e.name, offset + 30); bytes.set(e.data, offset + 30 + e.name.length);
      offset += 30 + e.name.length + e.data.length;
    }
    const centralOffset = offset;
    for (const e of entries) {
      view.setUint32(offset, 0x02014b50, true); view.setUint16(offset + 4, 20, true);
      view.setUint16(offset + 6, 20, true); view.setUint16(offset + 8, 0x800, true);
      view.setUint16(offset + 14, 33, true); view.setUint32(offset + 16, e.crc, true);
      view.setUint32(offset + 20, e.data.length, true); view.setUint32(offset + 24, e.data.length, true);
      view.setUint16(offset + 28, e.name.length, true); view.setUint32(offset + 42, e.offset, true);
      bytes.set(e.name, offset + 46); offset += 46 + e.name.length;
    }
    view.setUint32(offset, 0x06054b50, true); view.setUint16(offset + 8, entries.length, true);
    view.setUint16(offset + 10, entries.length, true); view.setUint32(offset + 12, centralSize, true);
    view.setUint32(offset + 16, centralOffset, true);
    return bytes;
  }

  function exportReportXlsx(batch, results, competition, controlledAt = new Date()) {
    const report = buildReport(batch, results, competition, controlledAt);
    const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    const relns = "http://schemas.openxmlformats.org/package/2006/relationships";
    return zipFiles([
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${relns}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contrôle licences" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Contrôle licences'!$8:$8</definedName></definedNames></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${relns}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml", styles()], ["xl/worksheets/sheet1.xml", worksheet(report)]
    ]);
  }

  return { buildReport, competitionNames, exportReportXlsx };
});
