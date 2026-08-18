const assert = require("node:assert/strict");
const {
  MAX_COMPETITION_DOCUMENT_BYTES,
  canonicalDocumentContentType,
  cleanCompetitionDocuments,
  competitionDocumentDownloadUrl,
  competitionDocumentStoragePath,
  decodeCompetitionDocumentDataUrl
} = require("../functions/engagement-competition-documents");

const pdf = Buffer.from("%PDF-1.4\n%%EOF", "ascii");
const decodedPdf = decodeCompetitionDocumentDataUrl(
  `data:application/pdf;base64,${pdf.toString("base64")}`,
  "Affiche régionale.pdf"
);
assert.deepEqual(decodedPdf.buffer, pdf);
assert.equal(decodedPdf.contentType, "application/pdf");
assert.equal(canonicalDocumentContentType("circulaire.DOCX"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
assert.equal(canonicalDocumentContentType("archive.zip"), "application/zip");
assert.equal(canonicalDocumentContentType("programme.exe"), "");
assert.throws(
  () => decodeCompetitionDocumentDataUrl("data:application/pdf;base64,SGVsbG8=", "faux.pdf"),
  /pas un PDF valide/
);

const zip = Buffer.from("504b030400000000", "hex");
assert.equal(
  decodeCompetitionDocumentDataUrl(`data:application/zip;base64,${zip.toString("base64")}`, "documents.zip").contentType,
  "application/zip"
);
assert.throws(
  () => decodeCompetitionDocumentDataUrl("data:application/zip;base64,SGVsbG8=", "documents.zip"),
  /pas une archive ZIP valide/
);
assert.throws(
  () => decodeCompetitionDocumentDataUrl(
    `data:application/pdf;base64,${Buffer.alloc(MAX_COMPETITION_DOCUMENT_BYTES + 1).toString("base64")}`,
    "trop-lourd.pdf"
  ),
  /10 Mo/
);

const storagePath = competitionDocumentStoragePath({
  competitionId: "Championnat régional 2026",
  documentId: "document-1",
  fileName: "Affiche été.pdf",
  buffer: pdf
});
assert.match(storagePath, /^competition-documents\/Championnat-regional-2026\/document-1\/Affiche-ete-[a-f0-9]{16}\.pdf$/);
assert.match(competitionDocumentDownloadUrl("bucket.test", storagePath, "token-test"), /firebasestorage\.googleapis\.com/);

const uploader = { uid: "admin-1", name: "Admin Régional", email: "admin@example.test" };
const documents = cleanCompetitionDocuments([{
  id: "document-1",
  title: "Affiche",
  category: "poster",
  description: "Informations pratiques",
  fileName: "affiche.pdf",
  storagePath,
  url: "https://example.test/affiche.pdf",
  size: pdf.length,
  uploadedAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  uploadedBy: uploader
}]);
assert.equal(Object.hasOwn(documents[0], "uploadedBy"), false);
const adminDocuments = cleanCompetitionDocuments([{ ...documents[0], uploadedBy: uploader }], { includeUploader: true });
assert.deepEqual(adminDocuments[0].uploadedBy, uploader);

console.log("Engagement competition documents tests OK");
