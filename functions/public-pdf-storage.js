const crypto = require("node:crypto");

const PDF_KINDS = new Set(["result", "series", "session-results"]);
const MAX_PDF_BYTES = 8 * 1024 * 1024;

function safePdfSegment(value, fallback = "pdf") {
  const clean = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return clean || fallback;
}

function decodePdfDataUrl(value) {
  const match = String(value || "").match(/^data:application\/pdf(?:;[^,]*)?;base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error("PDF base64 invalide.");
  const buffer = Buffer.from(match[1].replace(/\s+/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_PDF_BYTES) throw new Error("Taille PDF invalide.");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Le fichier transmis n'est pas un PDF.");
  return buffer;
}

function publicPdfStoragePath({ competitionId, kind, id, buffer }) {
  if (!PDF_KINDS.has(kind)) throw new Error("Type de PDF inconnu.");
  const digest = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  return [
    "competition-pdfs",
    safePdfSegment(competitionId, "competition"),
    kind,
    `${safePdfSegment(id)}-${digest}.pdf`
  ].join("/");
}

function publicStorageUrl(bucket, storagePath) {
  const encodedPath = String(storagePath || "").split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${encodeURIComponent(bucket)}/${encodedPath}`;
}

function storedPdfPayload(payload = {}, stored = {}) {
  const clean = { ...payload };
  delete clean.pdfDataUrl;
  return {
    ...clean,
    pdfUrl: stored.pdfUrl || "",
    storagePath: stored.storagePath || "",
    pdfSize: Number(stored.pdfSize || clean.pdfSize || 0)
  };
}

module.exports = {
  MAX_PDF_BYTES,
  PDF_KINDS,
  decodePdfDataUrl,
  publicPdfStoragePath,
  publicStorageUrl,
  safePdfSegment,
  storedPdfPayload
};
