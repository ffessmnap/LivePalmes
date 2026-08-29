const assert = require("node:assert/strict");
const {
  decodePdfDataUrl,
  publicPdfStoragePath,
  publicStorageUrl,
  storedPdfPayload
} = require("../functions/public-pdf-storage");

const buffer = Buffer.from("%PDF-1.4\n%%EOF", "ascii");
const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
assert.deepEqual(decodePdfDataUrl(dataUrl), buffer);
assert.throws(() => decodePdfDataUrl("data:text/plain;base64,QQ=="), /PDF base64 invalide/);

const storagePath = publicPdfStoragePath({
  competitionId: "livepalmes-active",
  kind: "result",
  id: "100 SF / Dames",
  buffer
});
assert.match(storagePath, /^competition-pdfs\/livepalmes-active\/result\/100-SF-Dames-[a-f0-9]{16}\.pdf$/);
assert.equal(
  publicStorageUrl("public-bucket", storagePath),
  `https://storage.googleapis.com/public-bucket/${storagePath}`
);

const payload = storedPdfPayload({
  id: "result-1",
  pdfName: "resultat.pdf",
  pdfDataUrl: dataUrl
}, {
  pdfUrl: "https://storage.googleapis.com/public-bucket/result.pdf",
  storagePath,
  pdfSize: buffer.length
});
assert.equal(Object.hasOwn(payload, "pdfDataUrl"), false);
assert.equal(payload.pdfSize, buffer.length);
assert.equal(payload.storagePath, storagePath);

console.log("LivePalmes public PDF storage tests OK");
