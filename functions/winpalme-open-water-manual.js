"use strict";

// Export-only projection. Native category 0 is the mixed relay sentinel, not
// a WinPalme category. The supplied Jumièges TXT establishes XSE for this event.
function prepareManualOpenWaterEntries(entries) {
  return entries.map(entry => ({
    ...entry,
    relays: (entry.relays || []).map(relay => {
      if (!/^NAP-/i.test(String(relay.category || ""))) return relay;
      if (relay.category === "NAP-0" && String(relay.nativeCategory) === "0"
          && relay.genderMode === "mixed" && relay.eventCode === "4X1000SBMIXTE") {
        return { ...relay, category: "S" };
      }
      throw new Error(`Categorie native du relais eau libre non raccordee : ${relay.eventCode}.`);
    })
  }));
}

// e-NAP meeting identity: committee code + meeting date + native meeting ID.
// Verified against Jumièges 4982 and Beaumont 4760 supplied TXT references.
async function readManualOpenWaterCompetition(connection, competition) {
  const { positiveId } = require("./nap-direct-calendar");
  const { regionCode } = require("./winpalme-export");
  const id = positiveId(competition.id);
  let rows;
  try {
    [rows] = await connection.execute({
      sql: "SELECT id,date,comite FROM competitions FORCE INDEX (PRIMARY) WHERE id=? LIMIT 2",
      timeout: 10000
    }, [id]);
  } catch {
    throw new Error("Lecture de la reference e-NAP indisponible.");
  }
  if (rows.length !== 1 || Number(rows[0].id) !== id || rows[0].date !== competition.date
      || !/^\d{4}-\d{2}-\d{2}$/.test(rows[0].date) || !/^\d+$/.test(String(rows[0].comite))) {
    throw new Error("Reference e-NAP de la competition absente ou modifiee : rechargez la fiche.");
  }
  const prefix = regionCode({ regionId: String(rows[0].comite) });
  if (!/^[A-Z]{2,8}$/.test(prefix)) throw new Error("Code du comite e-NAP non raccorde pour le WID.");
  const events = competition.events || [];
  const ids = [...new Set(events.flatMap(event => (event.nativeCourses || []).map(row => Number(row.id_course))))];
  if (!ids.length || ids.length > 300 || ids.some(value => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error("Programme eau libre absent ou hors limites.");
  }
  let catalogue;
  try {
    [catalogue] = await connection.execute({
      sql: `SELECT id,course,sexe,ld,wplabel,longueur,style,type_,nbnageur,mixte,relais,actif,validation FROM course_dispo FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id LIMIT 301`,
      timeout: 10000
    }, ids);
  } catch {
    throw new Error("Lecture du catalogue eau libre indisponible.");
  }
  const byId = new Map(catalogue.map(row => [Number(row.id), row]));
  if (catalogue.length !== ids.length || byId.size !== ids.length || catalogue.some(row => !ids.includes(Number(row.id)))) {
    throw new Error("Catalogue eau libre incomplet ou ambigu.");
  }
  return { ...competition, winPalmeId: `${prefix}${rows[0].date.replace(/-/g, "")}${id}`,
    events: events.map(event => ({ ...event, nativeCourses: event.nativeCourses.map(row => {
      const source = byId.get(Number(row.id_course));
      if (source.course !== row.course || String(source.sexe) !== String(row.sexe) || Number(source.relais) !== Number(row.relais)) {
        throw new Error("Programme eau libre modifie : rechargez la fiche.");
      }
      return { ...row, ...source, id: row.id, id_course: source.id };
    }) })) };
}

const text = value => String(value ?? "").trim();
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
        || rows.some(row => !/^[A-Za-z0-9 ,.-]{1,15}$/.test(String(row.course)))
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


// Reuse the existing field serialization; project only water-specific records.
// The shared pool generator and all automatic export callers stay unchanged.
function buildNativeManualOpenWaterTxt(competition, entries = [], clubsById = new Map(), options = {}) {
  const program = openWaterExportProgram(competition);
  const { buildWinPalmeCompetitionTxt, formatDate } = require("./winpalme-export");
  const result = buildWinPalmeCompetitionTxt(
    {...competition, competitionType:"pool"}, entries, clubsById, options);
  const field = value => String(value ?? "").trim().replace(/[;\r\n]+/g, " ");
  const officials = entries.map(entry => {
    const club = clubsById.get(text(entry.clubId)) || {};
    return (entry.officials || []).map(person => {
      if (!text(person.lastName) || !text(person.firstName)) throw new Error("Identite d'un officiel eau libre incomplete : verification requise.");
      return ["OFF", person.lastName, person.firstName, entry.clubCode || club.clubCode, formatDate(person.birthDate), ""].map(field).join(";");
    });
  });
  const lines = [];
  let clubIndex = -1, officialsWritten = false;
  for (const line of result.buffer.toString("utf8").split("\r\n")) {
    const fields = line.split(";");
    if (fields[0] === "CLU") { clubIndex++; officialsWritten = false; }
    // Use the block position, never the potentially shared club abbreviation.
    if (!officialsWritten && clubIndex >= 0 && (fields[0] === "CEQ" || line === "XXX;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx")) {
      lines.push(...officials[clubIndex]);
      officialsWritten = true;
    }
    if (fields[0] === "XXX" && fields[1] === "RENCONTRE") fields[4] = "Longue distance";
    if (fields[0] === "NAG" || fields[0] === "REL") {
      const index = fields[0] === "NAG" ? 7 : 3;
      const definition = program.byCode.get(fields[index]);
      if (!definition) throw new Error("Engagement eau libre hors programme : " + fields[index]);
      fields[index] = definition.code;
      fields[index + 1] = fields[0] === "NAG" ? "000001" : "595999";
    }
    lines.push(fields.join(";"));
    if (fields[0] === "WID") program.definitions.forEach(item => lines.push(item.fields.map(String).join(";")));
  }
  return {...result, buffer:Buffer.from(lines.join("\r\n"),"utf8")};
}

module.exports = { prepareManualOpenWaterEntries, readManualOpenWaterCompetition, buildNativeManualOpenWaterTxt };
