// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_buildEngagementOfficialsPdf(backendContext) {
  async function buildEngagementOfficialsPdf(competition = {}, rows = []) {
    const generatedAt = new Date().toISOString();
    const doc = new backendContext.PDFDocument({
      size: "A4",
      layout: "portrait",
      margin: 42,
      bufferPages: true,
      info: {
        Title: `Liste des officiels - ${competition.name || ""}`,
        Author: "LivePalmes",
        Subject: "Officiels inscrits sur la compétition"
      }
    });
    const pageWidth = doc.page.width;
    doc.engagementPdfContinuationHeader = () => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173b42").text(
        `${(0, backendContext.cleanText)(competition.name) || "Compétition"} · Liste des officiels`,
        42,
        24,
        { width: pageWidth - 84 }
      );
      doc.moveTo(42, 38).lineTo(pageWidth - 42, 38).lineWidth(0.5).strokeColor("#c7d6d7").stroke();
      return 48;
    };
    doc.rect(0, 0, pageWidth, 70).fill("#f4faf9");
    if (backendContext.fs.existsSync(backendContext.ENGAGEMENT_PDF_LOGO_PATH)) doc.image(backendContext.ENGAGEMENT_PDF_LOGO_PATH, 42, 10, { width: 70 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#073b44").text("Liste des officiels", 125, 11, { width: pageWidth - 167 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173b42").text(competition.name || "Compétition", 125, 29, { width: pageWidth - 167 });
    doc.font("Helvetica").fontSize(7).fillColor("#46625d").text([
      competition.endDate && competition.endDate !== competition.date
        ? `${(0, backendContext.local$engagementPdfFormatDate)(competition.date)} au ${(0, backendContext.local$engagementPdfFormatDate)(competition.endDate)}`
        : (0, backendContext.local$engagementPdfFormatDate)(competition.date),
      competition.location,
      `${rows.length} officiel${rows.length > 1 ? "s" : ""}`
    ].filter(Boolean).join(" · "), 125, 48, { width: pageWidth - 167 });

    let y = 88;
    if (rows.length) {
      y = (0, backendContext.local$engagementPdfTable)(doc, [
        { key: "club", label: "Club", width: 145 },
        { key: "lastName", label: "Nom", width: 105 },
        { key: "firstName", label: "Prénom", width: 90 },
        { key: "birthDateLabel", label: "Date de naissance", width: 91 },
        { key: "licenseNumber", label: "Licence", width: 80 }
      ], rows.map((row) => ({ ...row, birthDateLabel: (0, backendContext.local$engagementPdfFormatDate)(row.birthDate) })), y);
    } else {
      y = (0, backendContext.local$engagementPdfEmptyState)(doc, "Aucun officiel déclaré pour cette compétition.", y);
    }
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.fontSize(6.3).fillColor("#6b7f7a").text(
        `Liste des officiels générée le ${(0, backendContext.local$engagementPdfFormatDateTime)(generatedAt)} · page ${index + 1}/${range.count}`,
        42,
        doc.page.height - 52,
        { width: doc.page.width - 84, align: "center" }
      );
    }
    const buffer = await (0, backendContext.local$engagementPdfDocToBuffer)(doc);
    return {
      buffer,
      generatedAt,
      officialCount: rows.length,
      fileName: `liste-officiels-${(0, backendContext.local$engagementPdfFileName)(competition.name)}.pdf`
    };
  }

  return { buildEngagementOfficialsPdf };
}

module.exports = { createEngagementPdfRenderer_buildEngagementOfficialsPdf };
