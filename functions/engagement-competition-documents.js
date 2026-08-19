const crypto = require("node:crypto");

const MAX_COMPETITION_DOCUMENTS = 20;
const MAX_COMPETITION_DOCUMENT_BYTES = 10 * 1024 * 1024;

const DOCUMENT_CATEGORIES = new Set([
  "poster",
  "circular",
  "rules",
  "information",
  "access",
  "other"
]);

const DOCUMENT_TYPES = Object.freeze({
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  zip: "application/zip"
});

function cleanText(value) {
  return String(value || "").trim();
}

function safeSegment(value, fallback = "document") {
  const clean = cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return clean || fallback;
}

function documentExtension(fileName = "") {
  const match = cleanText(fileName).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function canonicalDocumentContentType(fileName = "") {
  return DOCUMENT_TYPES[documentExtension(fileName)] || "";
}

function decodeCompetitionDocumentDataUrl(value, fileName = "") {
  const contentType = canonicalDocumentContentType(fileName);
  if (!contentType) throw new Error("Format de document non autorisé.");
  const match = String(value || "").match(/^data:([^;,]+)?(?:;[^,]*)?;base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error("Contenu du document invalide.");
  const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  if (!buffer.length) throw new Error("Le document est vide.");
  if (buffer.length > MAX_COMPETITION_DOCUMENT_BYTES) {
    throw new Error("Le document dépasse la limite de 10 Mo.");
  }
  const extension = documentExtension(fileName);
  if (extension === "pdf" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Le fichier transmis n'est pas un PDF valide.");
  }
  if (extension === "png" && buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Le fichier transmis n'est pas une image PNG valide.");
  }
  if (["jpg", "jpeg"].includes(extension) && buffer.subarray(0, 3).toString("hex") !== "ffd8ff") {
    throw new Error("Le fichier transmis n'est pas une image JPEG valide.");
  }
  if (extension === "zip" && !["504b0304", "504b0506", "504b0708"].includes(buffer.subarray(0, 4).toString("hex"))) {
    throw new Error("Le fichier transmis n'est pas une archive ZIP valide.");
  }
  return { buffer, contentType, extension };
}

function competitionDocumentStoragePath({ competitionId, documentId, fileName, buffer }) {
  const extension = documentExtension(fileName);
  if (!DOCUMENT_TYPES[extension]) throw new Error("Format de document non autorisé.");
  const digest = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const baseName = cleanText(fileName).replace(/\.[^.]+$/, "");
  return [
    "competition-documents",
    safeSegment(competitionId, "competition"),
    safeSegment(documentId, "document"),
    `${safeSegment(baseName)}-${digest}.${extension}`
  ].join("/");
}

function competitionDocumentDownloadUrl(bucket, storagePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

function competitionDocumentTokenFromUrl(url = "") {
  try {
    return cleanText(new URL(String(url || "")).searchParams.get("token")).slice(0, 120);
  } catch (_) {
    return "";
  }
}

function cleanCompetitionDocument(raw = {}, { includeUploader = false } = {}) {
  const id = cleanText(raw.id).slice(0, 80);
  const storagePath = cleanText(raw.storagePath).slice(0, 320);
  const url = cleanText(raw.url).slice(0, 900);
  const fileName = cleanText(raw.fileName).slice(0, 180);
  const contentType = canonicalDocumentContentType(fileName);
  if (!id || !storagePath || !url || !contentType) return null;
  const category = DOCUMENT_CATEGORIES.has(cleanText(raw.category)) ? cleanText(raw.category) : "other";
  const document = {
    id,
    title: cleanText(raw.title).slice(0, 160) || fileName,
    category,
    description: cleanText(raw.description).slice(0, 500),
    fileName,
    contentType,
    storagePath,
    url,
    size: Math.max(0, Math.min(MAX_COMPETITION_DOCUMENT_BYTES, Math.trunc(Number(raw.size) || 0))),
    uploadedAt: cleanText(raw.uploadedAt).slice(0, 40),
    updatedAt: cleanText(raw.updatedAt || raw.uploadedAt).slice(0, 40)
  };
  if (includeUploader) {
    document.uploadedBy = {
      uid: cleanText(raw.uploadedBy?.uid).slice(0, 128),
      name: cleanText(raw.uploadedBy?.name).slice(0, 180),
      email: cleanText(raw.uploadedBy?.email).slice(0, 180)
    };
  }
  return document;
}

function cleanCompetitionDocuments(raw = [], options = {}) {
  return (Array.isArray(raw) ? raw : [])
    .map((document) => cleanCompetitionDocument(document, options))
    .filter(Boolean)
    .slice(0, MAX_COMPETITION_DOCUMENTS)
    .sort((left, right) => cleanText(right.updatedAt).localeCompare(cleanText(left.updatedAt)) || left.title.localeCompare(right.title, "fr"));
}

function cleanCompetitionDocumentInput(raw = {}) {
  const fileName = cleanText(raw.fileName).slice(0, 180);
  if (!canonicalDocumentContentType(fileName)) throw new Error("Format de document non autorisé.");
  const title = cleanText(raw.title).slice(0, 160);
  if (!title) throw new Error("Le titre du document est obligatoire.");
  return {
    title,
    category: DOCUMENT_CATEGORIES.has(cleanText(raw.category)) ? cleanText(raw.category) : "other",
    description: cleanText(raw.description).slice(0, 500),
    fileName
  };
}

module.exports = {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  MAX_COMPETITION_DOCUMENT_BYTES,
  MAX_COMPETITION_DOCUMENTS,
  canonicalDocumentContentType,
  cleanCompetitionDocument,
  cleanCompetitionDocumentInput,
  cleanCompetitionDocuments,
  competitionDocumentDownloadUrl,
  competitionDocumentTokenFromUrl,
  competitionDocumentStoragePath,
  decodeCompetitionDocumentDataUrl,
  documentExtension,
  safeSegment
};
