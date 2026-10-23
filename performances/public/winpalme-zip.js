(function attachWinPalmeZip(global) {
  "use strict";
  // Read only the two selected members. Never extract the WinPalme database.
  const MAX_ZIP = 30 * 1024 * 1024, MAX_TOTAL = 256 * 1024 * 1024;
  const MAX_TXT = 5 * 1024 * 1024, MAX_PDF = 10 * 1024 * 1024;
  const fail = message => { throw new Error(message); };
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function inventory(bytes) {
    if (bytes.length > MAX_ZIP || bytes.length < 22) fail("ZIP invalide ou supérieur à 30 Mo.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
      if (view.getUint32(at, true) === 0x06054b50 && at + 22 + view.getUint16(at + 20, true) === bytes.length) { end = at; break; }
    }
    if (end < 0) fail("Répertoire du ZIP introuvable.");
    const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || !count || count > 2000 || start + size !== end) fail("ZIP multiple, ZIP64 ou trop de fichiers : format non pris en charge.");
    const entries = [], paths = new Set();
    let at = start, total = 0;
    for (let i = 0; i < count; i++) {
      if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) fail("Répertoire ZIP incomplet.");
      const nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
      const next = at + 46 + nameLength + extra + comment;
      if (next > end) fail("Nom de fichier ZIP tronqué.");
      // Selected paths are ASCII in WinPalme; replacement characters in other names are immaterial.
      const name = new TextDecoder("utf-8").decode(bytes.subarray(at + 46, at + 46 + nameLength)).replace(/\\/g, "/");
      if (!name || /^[\/]|^[a-z]:/i.test(name) || name.includes("\0") || name.split("/").some(part => part === ".." || part === ".")) fail("Chemin non autorisé dans le ZIP.");
      if (paths.has(name.toLowerCase())) fail("Le ZIP contient des chemins en double.");
      paths.add(name.toLowerCase());
      const entry = { name, flags: view.getUint16(at + 8, true), method: view.getUint16(at + 10, true), crc: view.getUint32(at + 16, true), compressed: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), offset: view.getUint32(at + 42, true), directoryStart: start };
      total += entry.size;
      if (total > MAX_TOTAL || entry.size === 0xffffffff || entry.compressed === 0xffffffff || entry.offset === 0xffffffff || view.getUint16(at + 34, true)) fail("ZIP trop volumineux après décompression ou format non pris en charge.");
      entries.push(entry); at = next;
    }
    if (at !== end) fail("Répertoire ZIP incohérent.");
    return entries;
  }
  function select(entries) {
    const texts = entries.filter(e => /(?:^|\/)ExportTxt\/[^/]+_Export\.txt$/i.test(e.name));
    if (texts.length !== 1) fail("Un seul export TXT WinPalme est requis dans ExportTxt.");
    const text = texts[0], match = /^(.*\/)ExportTxt\/([^/]+)_Export\.txt$/i.exec(text.name) || /^()ExportTxt\/([^/]+)_Export\.txt$/i.exec(text.name);
    const prefix = match[1], stem = match[2];
    const candidates = entries.flatMap(entry => {
      const dir = `${prefix}Protocoles/`, marker = `${stem}_ProtocoleComplet_`;
      if (!entry.name.toLowerCase().startsWith(dir.toLowerCase())) return [];
      const name = entry.name.slice(dir.length);
      if (!name.startsWith(marker)) return [];
      const stamp = /^(\d{8})_(\d{8})\.pdf$/i.exec(name.slice(marker.length));
      if (!stamp) return [];
      const [y, mo, d, h, mi, s] = [stamp[1].slice(0,4), stamp[1].slice(4,6), stamp[1].slice(6,8), stamp[2].slice(0,2), stamp[2].slice(2,4), stamp[2].slice(4,6)];
      const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
      const date = new Date(iso);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== iso.slice(0,19)) fail("Horodatage du protocole invalide.");
      return [{ ...entry, stamp: stamp[1] + stamp[2], displayDate: `${d}/${mo}/${y} à ${h}:${mi}` }];
    }).sort((a,b) => b.stamp.localeCompare(a.stamp));
    if (!candidates.length) fail("Aucun protocole complet correspondant au TXT dans Protocoles.");
    if (candidates.length > 1 && candidates[0].stamp === candidates[1].stamp) fail("Plusieurs derniers protocoles : sélection ambiguë.");
    return { text, pdf: candidates[0], versions: candidates.length };
  }
  async function extract(bytes, entry, limit) {
    if (!entry.size || entry.size > limit || entry.flags & 1 || ![0,8].includes(entry.method)) fail("Fichier sélectionné vide, chiffré, trop volumineux ou compression non prise en charge.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), at = entry.offset;
    if (at + 30 > entry.directoryStart || view.getUint32(at, true) !== 0x04034b50) fail("En-tête ZIP local invalide.");
    const nameLength = view.getUint16(at + 26, true), extra = view.getUint16(at + 28, true), start = at + 30 + nameLength + extra;
    const localName = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength)).replace(/\\/g, "/");
    if (localName !== entry.name || view.getUint16(at + 8, true) !== entry.method || view.getUint16(at + 6, true) !== entry.flags || start + entry.compressed > entry.directoryStart) fail("Fichier ZIP incohérent ou tronqué.");
    const compressed = bytes.subarray(start, start + entry.compressed);
    let result;
    if (entry.method === 0) result = compressed;
    else {
      if (typeof global.DecompressionStream !== "function") fail("Ce navigateur ne peut pas décompresser le ZIP. Utilisez une version récente de Chrome, Edge, Firefox ou Safari.");
      const reader = new Blob([compressed]).stream().pipeThrough(new global.DecompressionStream("deflate-raw")).getReader();
      const parts = []; let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > entry.size || length > limit) fail("Décompression supérieure à la taille annoncée.");
          parts.push(value);
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      result = new Uint8Array(length); let offset = 0;
      for (const part of parts) { result.set(part, offset); offset += part.length; }
    }
    if (result.length !== entry.size || crc32(result) !== entry.crc) fail("Contrôle d’intégrité du fichier ZIP échoué.");
    return result;
  }
  async function digest(bytes) {
    return Array.from(new Uint8Array(await global.crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2,"0")).join("");
  }
  async function read(file, encoding = "utf-8") {
    if (file.size > MAX_ZIP) fail("Le ZIP dépasse 30 Mo.");
    const bytes = new Uint8Array(await file.arrayBuffer()), entries = inventory(bytes), selected = select(entries);
    const textBytes = await extract(bytes, selected.text, MAX_TXT), pdfBytes = await extract(bytes, selected.pdf, MAX_PDF);
    const rawText = new TextDecoder(encoding, { fatal: true }).decode(textBytes);
    if (!/^\s*REN;/m.test(rawText) || !/^\s*(NAG|REL);/m.test(rawText) || rawText.includes("\0")) fail("Le TXT sélectionné n’est pas un export de résultats WinPalme.");
    if (new TextDecoder().decode(pdfBytes.subarray(0,5)) !== "%PDF-" || !new TextDecoder().decode(pdfBytes.subarray(-2048)).includes("%%EOF")) fail("Le protocole sélectionné n’est pas un PDF complet.");
    const counts = { individual: 0, relays: 0, clubs: 0, timed: 0, statuses: 0 };
    const identities = new Set(); let name = "", date = "", wid = "";
    for (const line of rawText.split(/\r?\n/)) {
      const c = line.split(";").map(s => s.trim());
      if (c[0] === "REN") { date = c[1]; name = c[2]; }
      if (c[0] === "WID") wid = c[1];
      if (c[0] === "CLU") counts.clubs++;
      if (c[0] === "NAG") { counts.individual++; identities.add(JSON.stringify(c.slice(1,5))); }
      if (c[0] === "REL") counts.relays++;
      if (["NAG","REL"].includes(c[0])) { if (c[c[0] === "NAG" ? 10 : 6] === "NAG") counts.timed++; else counts.statuses++; }
    }
    return { rawText, pdf: new Blob([pdfBytes], { type: "application/pdf" }), manifest: {
      zipName: file.name, textPath: selected.text.name, pdfPath: selected.pdf.name,
      pdfDate: selected.pdf.displayDate, protocolVersions: selected.versions,
      textHash: await digest(textBytes), pdfHash: await digest(pdfBytes), name, date, wid,
      counts: { ...counts, swimmers: identities.size }
    } };
  }
  const api = { read, inventory, select, crc32 };
  if (typeof module === "object" && module.exports) module.exports = api;
  else global.LivePalmesWinPalmeZip = api;
})(typeof window === "object" ? window : globalThis);
