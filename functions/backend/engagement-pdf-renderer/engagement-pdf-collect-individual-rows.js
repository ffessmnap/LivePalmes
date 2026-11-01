// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_engagementPdfCollectIndividualRows(backendContext) {
  function engagementPdfStatusLabel(status) {
    return {
      upcoming: "À venir",
      open: "Engagements ouverts",
      closed: "Engagements fermés"
    }[(0, backendContext.cleanText)(status)] || "-";
  }

  function engagementPdfTimingLabel(value) {
    const timingType = (0, backendContext.cleanEngagementTimingType)(value);
    return timingType === "manual" ? "Manuel" : timingType === "electronic" ? "Électronique" : "Non renseigné";
  }

  function engagementPdfCollectIndividualRows(entry = {}, competition = {}) {
    return (Array.isArray(entry.swimmers) ? entry.swimmers : [])
      .map((swimmer) => {
        const entries = Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : [];
        return {
          license: swimmer.licenseNumber || "-",
          swimmer: (0, backendContext.local$engagementPdfSwimmerName)(swimmer),
          sex: (0, backendContext.normalizeCategoryCode)(swimmer.sex) || "-",
          category: (0, backendContext.ageCategoryFromDates)(competition.date, swimmer.birthDate) || "-",
          entries: entries.map((item) => {
            const time = item.entryTime || item.manualEntryTime || "";
            return `${(0, backendContext.local$engagementPdfEventLabel)(item.eventCode)}${time ? ` (${time})` : ""}`;
          }).join(", ") || "-"
        };
      })
      .sort((left, right) => left.swimmer.localeCompare(right.swimmer, "fr"));
  }

  function engagementPdfKeyValues(doc, rows, y) {
    const colWidth = (doc.page.width - 84) / 2;
    rows.forEach((row, index) => {
      y = (0, backendContext.local$engagementPdfEnsureSpace)(doc, y, 30);
      const x = 42 + (index % 2) * colWidth;
      const rowY = y;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#6b7f7a").text(row[0], x, rowY, { width: colWidth - 16 });
      doc.font("Helvetica").fontSize(9).fillColor("#102f35").text(row[1] || "-", x, rowY + 10, { width: colWidth - 16 });
      if (index % 2 === 1) y += 30;
    });
    return rows.length % 2 ? y + 30 : y + 6;
  }

  return { engagementPdfStatusLabel, engagementPdfTimingLabel, engagementPdfCollectIndividualRows, engagementPdfKeyValues };
}

module.exports = { createEngagementPdfRenderer_engagementPdfCollectIndividualRows };
