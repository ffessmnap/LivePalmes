// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_buildEngagementClubRecapPdf(backendContext) {
  function engagementPdfFormatDate(value) {
    const text = (0, backendContext.cleanIsoDate)(value);
    if (!text) return "-";
    const [year, month, day] = text.split("-");
    return `${day}/${month}/${year}`;
  }

  function engagementPdfFormatDateTime(value) {
    const text = (0, backendContext.cleanText)(value);
    if (!text) return "-";
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function engagementPdfLevelLabel(level) {
    return {
      departemental: "Départemental",
      regional: "Régional",
      national: "National"
    }[(0, backendContext.cleanText)(level)] || "-";
  }

  function engagementPdfMoney(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0
      ? `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
      : "0,00 EUR";
  }

  function engagementPdfSwimmerName(swimmer = {}) {
    return (0, backendContext.cleanText)(swimmer.name) || [(0, backendContext.cleanText)(swimmer.firstName), (0, backendContext.cleanText)(swimmer.lastName)].filter(Boolean).join(" ") || "Nageur";
  }

  function engagementPdfPersonName(person = {}) {
    return [(0, backendContext.cleanText)(person.firstName), (0, backendContext.cleanText)(person.lastName)].filter(Boolean).join(" ") || (0, backendContext.cleanText)(person.name) || "-";
  }

  function engagementPdfGenderLabel(mode) {
    return {
      female: "Femmes",
      male: "Hommes",
      mixed: "Mixte"
    }[(0, backendContext.cleanText)(mode)] || "-";
  }

  function engagementPdfRelayCategoryLabel(code) {
    return {
      P: "Poussin",
      B: "Benjamin",
      M: "Minime",
      C: "Cadet",
      J: "Junior",
      S: "Senior",
      "M30+": "Master 30+",
      "M40+": "Master 40+",
      "M50+": "Master 50+",
      "M60+": "Master 60+",
      "M70+": "Master 70+",
      "M80+": "Master 80+",
      R140: "R140",
      R180: "R180",
      R220: "R220",
      R260: "R260"
    }[(0, backendContext.cleanText)(code).toUpperCase()] || (0, backendContext.cleanText)(code) || "-";
  }

  function engagementPdfIndividualProgramColumns(competition = {}, sex = "") {
    const eventsByCode = new Map((Array.isArray(competition.events) ? competition.events : [])
      .map((event) => [(0, backendContext.normalizeCourseCode)(event.code || event.eventCode), event])
      .filter(([code]) => code));
    const genderMode = sex === "F" ? "female" : sex === "M" ? "male" : "mixed";
    const columns = [];
    const seen = new Set();
    (Array.isArray(competition.programSessions) ? competition.programSessions : []).forEach((session, sessionIndex) => {
      (Array.isArray(session.items) ? session.items : []).forEach((item) => {
        const eventCode = (0, backendContext.normalizeCourseCode)(item.eventCode || item.code);
        const event = eventsByCode.get(eventCode) || backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(eventCode) || {};
        const itemGenderMode = (0, backendContext.cleanText)(item.genderMode) || "mixed";
        if (!eventCode || seen.has(eventCode) || event.type === "relay" || (itemGenderMode !== "mixed" && itemGenderMode !== genderMode)) return;
        seen.add(eventCode);
        columns.push({ eventCode, label: (0, backendContext.local$engagementPdfEventLabel)(eventCode), sessionLabel: session.label || `S${sessionIndex + 1}` });
      });
    });
    if (columns.length) return columns;
    (Array.isArray(competition.events) ? competition.events : []).forEach((event) => {
      const eventCode = (0, backendContext.normalizeCourseCode)(event.code || event.eventCode);
      if (!eventCode || seen.has(eventCode) || event.type === "relay") return;
      seen.add(eventCode);
      columns.push({ eventCode, label: (0, backendContext.local$engagementPdfEventLabel)(eventCode), sessionLabel: "" });
    });
    return columns;
  }

  function engagementPdfIndividualMatrix(entry = {}, competition = {}, sex = "", title = "") {
    const rows = (Array.isArray(entry.swimmers) ? entry.swimmers : [])
      .filter((swimmer) => (0, backendContext.cleanText)(swimmer.sex).toUpperCase() === sex)
      .filter((swimmer) => Array.isArray(swimmer.individualEntries) && swimmer.individualEntries.length)
      .sort((left, right) => engagementPdfSwimmerName(left).localeCompare(engagementPdfSwimmerName(right), "fr"));
    if (!rows.length) return null;
    const selectedCodes = new Set(rows.flatMap((swimmer) => (swimmer.individualEntries || []).map((item) => (0, backendContext.normalizeCourseCode)(item.eventCode))));
    const columns = engagementPdfIndividualProgramColumns(competition, sex);
    const fallbackColumns = Array.from(selectedCodes).map((eventCode) => ({ eventCode, label: (0, backendContext.local$engagementPdfEventLabel)(eventCode), sessionLabel: "" }));
    const nativeColumns = entry.source === "nap" ? [...columns, ...fallbackColumns.filter(column => !columns.some(item => item.eventCode === column.eventCode))] : columns;
    return { title, rows, columns: nativeColumns.length ? nativeColumns : fallbackColumns };
  }

  function engagementPdfSwimmersWithoutIndividualRows(entry = {}, competition = {}) {
    const relayMemberIds = new Set((Array.isArray(entry.relays) ? entry.relays : []).flatMap((relay) => [
      ...(Array.isArray(relay.memberIds) ? relay.memberIds : []),
      ...(Array.isArray(relay.members) ? relay.members : []).map((member) => member.swimmerIndexId)
    ]).map(backendContext.cleanText).filter(Boolean));
    // The registered roster is authoritative: relay members must not add participants or fees.
    return (Array.isArray(entry.swimmers) ? entry.swimmers : [])
      .filter((swimmer) => !Array.isArray(swimmer.individualEntries) || !swimmer.individualEntries.length)
      .map((swimmer) => ({
        swimmer: engagementPdfSwimmerName(swimmer),
        license: swimmer.licenseNumber || "-",
        sex: (0, backendContext.normalizeCategoryCode)(swimmer.sex) || "-",
        category: (0, backendContext.ageCategoryFromDates)(competition.date, swimmer.birthDate) || "-",
        entries: relayMemberIds.has((0, backendContext.cleanText)(swimmer.swimmerIndexId))
          ? "Relais uniquement"
          : "Aucune course engagée"
      }))
      .sort((left, right) => left.swimmer.localeCompare(right.swimmer, "fr"));
  }

  function engagementPdfCompactSummary(doc, items = [], y) {
    const width = doc.page.width - 84;
    const height = 36;
    y = engagementPdfEnsureSpace(doc, y, height + 8);
    doc.roundedRect(42, y, width, height, 3).fill("#eef5f4");
    const itemWidth = width / items.length;
    items.forEach((item, index) => {
      const x = 52 + index * itemWidth;
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#6b7f7a").text(item.label, x, y + 6, { width: itemWidth - 20 });
      doc.font("Helvetica").fontSize(7.5).fillColor("#102f35").text(item.value || "-", x, y + 17, { width: itemWidth - 20 });
    });
    return y + height + 8;
  }

  function engagementPdfDrawIndividualMatrix(doc, matrix = {}, competition = {}, y) {
    const left = 42;
    const tableWidth = doc.page.width - 84;
    const identityWidth = 92;
    const categoryWidth = 24;
    const columns = matrix.columns || [];
    if (columns.length) {
      const chunk = columns;
      const courseWidth = (tableWidth - identityWidth - categoryWidth) / chunk.length;
      const headerHeight = 30;
      const sessionGroups = chunk.reduce((groups, column, index) => {
        const previous = groups[groups.length - 1];
        if (previous && previous.label === column.sessionLabel) previous.count += 1;
        else groups.push({ label: column.sessionLabel || "Programme", start: index, count: 1 });
        return groups;
      }, []);
      const drawHeader = () => {
        const headerFill = matrix.title === "Nageuse" ? "#f2e8eb" : "#e7eef3";
        doc.rect(left, y, tableWidth, headerHeight).fill(headerFill);
        sessionGroups.forEach((group, groupIndex) => {
          const x = left + identityWidth + categoryWidth + group.start * courseWidth;
          const sessionFill = matrix.title === "Nageuse"
            ? (groupIndex % 2 ? "#eee3e6" : "#e5d7dc")
            : (groupIndex % 2 ? "#e2ebf0" : "#d5e2e9");
          doc.rect(x, y, group.count * courseWidth, 13).fill(sessionFill);
        });
        doc.font("Helvetica-Bold").fontSize(6.2).fillColor("#173b42").text(matrix.title, left + 4, y + 11, { width: identityWidth - 8 });
        doc.text("Cat.", left + identityWidth + 2, y + 11, { width: categoryWidth - 4, align: "center" });
        sessionGroups.forEach((group) => {
          const x = left + identityWidth + categoryWidth + group.start * courseWidth;
          doc.font("Helvetica-Bold").fontSize(5.6).fillColor("#274b51").text(group.label, x + 2, y + 3, { width: group.count * courseWidth - 4, align: "center" });
        });
        chunk.forEach((column, index) => {
          const x = left + identityWidth + categoryWidth + index * courseWidth;
          doc.font("Helvetica-Bold").fontSize(5.1).fillColor("#173b42").text(column.label, x + 1, y + 19, { width: courseWidth - 2, align: "center" });
        });
        doc.lineWidth(0.3).strokeColor("#c4d2d4");
        [identityWidth, identityWidth + categoryWidth, ...chunk.map((_, index) => identityWidth + categoryWidth + (index + 1) * courseWidth)].forEach((offset) => {
          doc.moveTo(left + offset, y + 13).lineTo(left + offset, y + headerHeight).stroke();
        });
        doc.lineWidth(1.15).strokeColor("#879da1");
        [identityWidth, identityWidth + categoryWidth, ...sessionGroups.slice(1).map((group) => identityWidth + categoryWidth + group.start * courseWidth), identityWidth + categoryWidth + chunk.length * courseWidth].forEach((offset) => {
          doc.moveTo(left + offset, y).lineTo(left + offset, y + headerHeight).stroke();
        });
        doc.lineWidth(0.45).strokeColor("#c4d2d4").moveTo(left + identityWidth + categoryWidth, y + 13).lineTo(left + tableWidth, y + 13).stroke();
        y += headerHeight;
      };
      y = engagementPdfEnsureSpace(doc, y, headerHeight + 23);
      drawHeader();
      matrix.rows.forEach((swimmer, rowIndex) => {
        const rowHeight = 17;
        if (y + rowHeight > doc.page.height - 57) {
          doc.addPage();
          y = typeof doc.engagementPdfContinuationHeader === "function"
            ? doc.engagementPdfContinuationHeader()
            : 42;
          drawHeader();
        }
        doc.rect(left, y, tableWidth, rowHeight).fill(rowIndex % 2 ? "#f8fbfa" : "#ffffff").stroke("#d8e5e2");
        doc.lineWidth(0.35).strokeColor("#d8e5e2");
        [identityWidth, identityWidth + categoryWidth, ...chunk.map((_, index) => identityWidth + categoryWidth + (index + 1) * courseWidth)].forEach((offset) => {
          doc.moveTo(left + offset, y).lineTo(left + offset, y + rowHeight).stroke();
        });
        doc.lineWidth(1.15).strokeColor("#879da1");
        [identityWidth, identityWidth + categoryWidth, ...sessionGroups.slice(1).map((group) => identityWidth + categoryWidth + group.start * courseWidth), identityWidth + categoryWidth + chunk.length * courseWidth].forEach((offset) => {
          doc.moveTo(left + offset, y).lineTo(left + offset, y + rowHeight).stroke();
        });
        const lastName = ((0, backendContext.cleanText)(swimmer.lastName || swimmer.name) || "Nageur").toUpperCase();
        const firstName = (0, backendContext.cleanText)(swimmer.firstName);
        const availableNameWidth = identityWidth - 8;
        const baseNameSize = 6.1;
        doc.font("Helvetica-Bold").fontSize(baseNameSize);
        const combinedWidth = doc.widthOfString(lastName) + (firstName ? 3 + doc.font("Helvetica").widthOfString(firstName) : 0);
        const nameSize = combinedWidth > availableNameWidth ? 5.2 : baseNameSize;
        doc.font("Helvetica-Bold").fontSize(nameSize).fillColor("#102f35").text(lastName, left + 4, y + 5, { width: availableNameWidth });
        const firstNameX = left + 6 + doc.widthOfString(lastName);
        if (firstName) doc.font("Helvetica").fontSize(nameSize).text(firstName, firstNameX, y + 5, { width: Math.max(12, left + identityWidth - 3 - firstNameX) });
        doc.font("Helvetica").fontSize(5.7).text((0, backendContext.ageCategoryFromDates)(competition.date, swimmer.birthDate) || "-", left + identityWidth + 2, y + 5.5, { width: categoryWidth - 4, align: "center" });
        const entriesByCode = new Map((swimmer.individualEntries || []).map((item) => [(0, backendContext.normalizeCourseCode)(item.eventCode), item]));
        chunk.forEach((column, index) => {
          const item = entriesByCode.get(column.eventCode);
          const value = (0, backendContext.cleanText)(item?.entryTime || item?.manualEntryTime);
          const x = left + identityWidth + categoryWidth + index * courseWidth;
          if ((0, backendContext.cleanEngagementCompetitionType)(competition.competitionType) === "openWater" && item) {
            doc.font("Helvetica-Bold").fontSize(6).fillColor("#47745a").text("X", x + 1, y + 5.5, { width: courseWidth - 2, align: "center" });
          } else if (value) {
            const marker = (0, backendContext.cleanText)(item?.entryTimeMode) === "manual" ? "*" : "";
            doc.font("Helvetica").fontSize(5.15).fillColor("#102f35").text(`${value}${marker}`, x + 1, y + 5.5, { width: courseWidth - 2, align: "center" });
          } else if (item) {
            doc.font("Helvetica-Bold").fontSize(5.4).fillColor("#6b7f7a").text("?", x + 1, y + 5.5, { width: courseWidth - 2, align: "center" });
          }
        });
        y += rowHeight;
      });
      y += 10;
    }
    return y;
  }

  function engagementPdfCollectRelayRows(entry = {}) {
    return (Array.isArray(entry.relays) ? entry.relays : [])
      .map((relay) => ({
        event: (0, backendContext.local$engagementPdfEventLabel)(relay.eventCode),
        category: engagementPdfRelayCategoryLabel(relay.category),
        gender: engagementPdfGenderLabel(relay.genderMode),
        time: relay.entryTime || relay.manualEntryTime || "-",
        members: (Array.isArray(relay.members) ? relay.members : [])
          .map((member) => engagementPdfPersonName(member))
          .filter((name) => name && name !== "-")
          .join(", ") || "Relayeurs non déclarés"
      }));
  }

  function engagementPdfDocToBuffer(doc) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });
  }

  function engagementPdfAddFooter(doc, generatedAt) {
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.fontSize(6.3).fillColor("#6b7f7a");
      doc.text(`Récapitulatif indicatif LivePalmes, sous réserve de modifications - généré le ${engagementPdfFormatDateTime(generatedAt)} - page ${index + 1}/${range.count}`, 42, doc.page.height - 52, {
        width: doc.page.width - 84,
        align: "center"
      });
    }
  }

  function engagementPdfEnsureSpace(doc, y, height) {
    if (y + height <= doc.page.height - 57) return y;
    doc.addPage();
    return typeof doc.engagementPdfContinuationHeader === "function"
      ? doc.engagementPdfContinuationHeader()
      : 42;
  }

  function engagementPdfSection(doc, title, y) {
    y = engagementPdfEnsureSpace(doc, y, 28);
    const width = doc.page.width - 84;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#073b44").text(title, 42, y + 2, { width });
    doc.moveTo(42, y + 18).lineTo(42 + width, y + 18).lineWidth(0.6).strokeColor("#c7d6d7").stroke();
    return y + 26;
  }

  function engagementPdfEmptyState(doc, message, y) {
    y = engagementPdfEnsureSpace(doc, y, 20);
    doc.font("Helvetica").fontSize(8).fillColor("#6b7f7a").text(message, 46, y + 2, {
      width: doc.page.width - 92
    });
    return y + 18;
  }

  function engagementPdfWhatsAppBlock(doc, whatsAppUrl, qrBuffer, y) {
    const url = (0, backendContext.cleanPublicCalendarWhatsAppUrl)(whatsAppUrl);
    if (!url) return y;
    const left = 42;
    const width = doc.page.width - 84;
    const height = qrBuffer ? 102 : 68;
    y = engagementPdfEnsureSpace(doc, y, height + 10);
    doc.roundedRect(left, y, width, height, 4).fill("#f4faf7").strokeColor("#b8d9c5").stroke();
    const textLeft = qrBuffer ? left + 104 : left + 12;
    const textWidth = width - (textLeft - left) - 12;
    if (qrBuffer) {
      doc.image(qrBuffer, left + 10, y + 10, { width: 82, height: 82 });
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#155c34").text("Groupe WhatsApp des chefs d'équipe", textLeft, y + 16, { width: textWidth });
    doc.font("Helvetica").fontSize(7.5).fillColor("#526d5d").text(
      qrBuffer ? "Scannez le QR code ou utilisez le lien ci-dessous." : "Utilisez le lien ci-dessous pour rejoindre le groupe.",
      textLeft,
      y + 34,
      { width: textWidth }
    );
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#168f46").text("Rejoindre le groupe WhatsApp", textLeft, y + (qrBuffer ? 61 : 47), {
      width: textWidth,
      link: url,
      underline: true
    });
    return y + height + 10;
  }

  function engagementPdfFeesTable(doc, stats = {}, fees = {}, y) {
    const left = 42;
    const tableWidth = doc.page.width - 84;
    const columns = [
      { key: "type", label: "Type", width: 220, align: "left" },
      { key: "quantity", label: "Quantité", width: 68, align: "right" },
      { key: "rate", label: "Tarif", width: 101, align: "right" },
      { key: "subtotal", label: "Sous-total", width: 122, align: "right" }
    ];
    const scale = tableWidth / columns.reduce((sum, column) => sum + column.width, 0);
    const scaledColumns = columns.map((column) => ({ ...column, width: column.width * scale }));
    const rows = [
      {
        type: "Nageurs",
        quantity: stats.swimmerCount,
        rate: engagementPdfMoney(fees.swimmerFee),
        subtotal: engagementPdfMoney(stats.swimmerCount * (Number(fees.swimmerFee) || 0))
      },
      {
        type: "Courses individuelles",
        quantity: stats.individualCount,
        rate: engagementPdfMoney(fees.individualEventFee),
        subtotal: engagementPdfMoney(stats.individualCount * (Number(fees.individualEventFee) || 0))
      },
      {
        type: "Relais",
        quantity: stats.relayCount,
        rate: engagementPdfMoney(fees.relayFee),
        subtotal: engagementPdfMoney(stats.relayCount * (Number(fees.relayFee) || 0))
      }
    ];
    const drawCells = (row, rowY, font = "Helvetica", color = "#102f35") => {
      let x = left;
      scaledColumns.forEach((column) => {
        const rawValue = row[column.key];
        const value = rawValue === 0 ? "0" : (0, backendContext.cleanText)(rawValue) || "-";
        doc.font(font).fontSize(8).fillColor(color).text(value, x + 6, rowY + 6, {
          width: column.width - 12,
          align: column.align
        });
        x += column.width;
      });
    };

    doc.rect(left, y, tableWidth, 18).fill("#e8f1f1");
    drawCells(Object.fromEntries(scaledColumns.map((column) => [column.key, column.label])), y, "Helvetica-Bold", "#173b42");
    y += 18;
    rows.forEach((row, index) => {
      doc.rect(left, y, tableWidth, 20).fill(index % 2 ? "#f8fbfa" : "#ffffff");
      doc.moveTo(left, y + 20).lineTo(left + tableWidth, y + 20).lineWidth(0.5).strokeColor("#d8e5e2").stroke();
      drawCells(row, y);
      y += 20;
    });

    doc.roundedRect(left, y, tableWidth, 24, 2).fill("#edf5f5").strokeColor("#a8bfc0").stroke();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#073b44").text("TOTAL ESTIMÉ", left + 8, y + 7, {
      width: tableWidth - scaledColumns[3].width - 16
    });
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#073b44").text(engagementPdfMoney((0, backendContext.local$engagementPdfFeeTotal)({
      swimmerCount: stats.swimmerCount,
      individualCount: stats.individualCount,
      relayCount: stats.relayCount
    }, { fees })), left + tableWidth - scaledColumns[3].width + 6, y + 7, {
      width: scaledColumns[3].width - 14,
      align: "right"
    });
    y += 32;

    const paymentRows = [
      ["Paiement", fees.helloAssoUrl ? "Lien HelloAsso publié" : "Lien HelloAsso en attente de publication"],
      ["Échéance", "Avant la fin de la première journée"],
      ["Après l'échéance", `Supplément forfaitaire de ${engagementPdfMoney(fees.latePaymentSurcharge ?? 50)}`]
    ];
    doc.roundedRect(left, y, tableWidth, 50, 3).fill("#f8fbfa").strokeColor("#d8e5e2").stroke();
    paymentRows.forEach((row, index) => {
      const rowY = y + 7 + index * 13;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#6b7f7a").text(row[0], left + 8, rowY, { width: 92 });
      doc.font("Helvetica").fontSize(8).fillColor("#102f35").text(row[1], left + 106, rowY, { width: tableWidth - 114 });
    });
    return y + 58;
  }

  function engagementPdfTextHeight(doc, text, width, fontSize = 8) {
    return doc.font("Helvetica").fontSize(fontSize).heightOfString((0, backendContext.cleanText)(text) || "-", { width });
  }

  function engagementPdfTable(doc, columns, rows, y) {
    const left = 42;
    const tableWidth = doc.page.width - 84;
    const columnsWidth = columns.reduce((sum, column) => sum + column.width, 0) || 1;
    const scaledColumns = columns.map((column) => ({ ...column, width: column.width * tableWidth / columnsWidth }));
    const headerHeight = 18;
    const drawHeader = () => {
      doc.rect(left, y, tableWidth, headerHeight).fill("#e8f1f1");
      let x = left;
      scaledColumns.forEach((column) => {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173b42").text(column.label, x + 5, y + 5, { width: column.width - 10 });
        x += column.width;
      });
      y += headerHeight;
    };
    y = engagementPdfEnsureSpace(doc, y, headerHeight + 18);
    drawHeader();
    if (!rows.length) {
      doc.rect(left, y, tableWidth, 22).fill("#ffffff").stroke("#d8e5e2");
      doc.font("Helvetica").fontSize(8).fillColor("#6b7f7a").text("Aucune donnée.", left + 6, y + 7, { width: tableWidth - 12 });
      return y + 28;
    }
    rows.forEach((row, index) => {
      const heights = scaledColumns.map((column) => engagementPdfTextHeight(doc, row[column.key], column.width - 10, 8));
      const rowHeight = Math.max(20, Math.ceil(Math.max(...heights)) + 10);
      if (y + rowHeight > doc.page.height - 57) {
        doc.addPage();
        y = typeof doc.engagementPdfContinuationHeader === "function"
          ? doc.engagementPdfContinuationHeader()
          : 42;
        drawHeader();
      }
      doc.rect(left, y, tableWidth, rowHeight).fill(index % 2 ? "#f8fbfa" : "#ffffff").stroke("#d8e5e2");
      let x = left;
      scaledColumns.forEach((column) => {
        doc.font("Helvetica").fontSize(8).fillColor("#102f35").text((0, backendContext.cleanText)(row[column.key]) || "-", x + 5, y + 6, {
          width: column.width - 10
        });
        x += column.width;
      });
      y += rowHeight;
    });
    return y + 10;
  }

  async function buildEngagementClubRecapPdf(competition = {}, entry = {}) {
    const generatedAt = new Date().toISOString();
    const whatsAppUrl = ["national", "international"].includes((0, backendContext.cleanEngagementCompetitionLevel)(competition.level))
      ? (0, backendContext.cleanPublicCalendarWhatsAppUrl)(competition.teamLeadersWhatsAppUrl)
      : "";
    let whatsAppQrBuffer = null;
    if (whatsAppUrl) {
      try {
        whatsAppQrBuffer = await backendContext.QRCode.toBuffer(whatsAppUrl, {
          type: "png",
          width: 320,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#073b44", light: "#ffffff" }
        });
      } catch (error) {
        console.warn("engagement recap WhatsApp QR generation failed", {
          competitionId: (0, backendContext.cleanText)(competition.id).slice(0, 128),
          message: (0, backendContext.cleanText)(error?.message || error).slice(0, 220)
        });
      }
    }
    const doc = new backendContext.PDFDocument({
      size: "A4",
      layout: "portrait",
      margin: 42,
      bufferPages: true,
      info: {
        Title: `Récapitulatif engagements - ${competition.name || ""}`,
        Author: "LivePalmes",
        Subject: "Engagements compétition"
      }
    });

    const pageWidth = doc.page.width;
    doc.engagementPdfContinuationHeader = () => {
      const competitionLabel = (0, backendContext.cleanText)(competition.name) || "Compétition";
      const clubLabel = (0, backendContext.cleanText)(entry.clubName) || (0, backendContext.engagementClubCode)(entry.clubId, entry.clubCode) || "Club";
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#173b42").text(`${competitionLabel} · ${clubLabel}`, 42, 24, {
        width: pageWidth - 84
      });
      doc.moveTo(42, 38).lineTo(pageWidth - 42, 38).lineWidth(0.5).strokeColor("#c7d6d7").stroke();
      return 48;
    };
    doc.rect(0, 0, pageWidth, 70).fill("#f4faf9");
    if (backendContext.fs.existsSync(backendContext.ENGAGEMENT_PDF_LOGO_PATH)) {
      doc.image(backendContext.ENGAGEMENT_PDF_LOGO_PATH, 42, 10, { width: 70 });
    }
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#073b44").text("Récapitulatif des engagements", 125, 11, { width: pageWidth - 167 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173b42").text(competition.name || "Compétition", 125, 29, { width: pageWidth - 167 });
    doc.font("Helvetica").fontSize(7).fillColor("#46625d").text([
      competition.endDate && competition.endDate !== competition.date
        ? `${engagementPdfFormatDate(competition.date)} au ${engagementPdfFormatDate(competition.endDate)}`
        : engagementPdfFormatDate(competition.date),
      competition.location,
      engagementPdfLevelLabel(competition.level)
    ].filter(Boolean).join(" · "), 125, 48, { width: pageWidth - 167 });

    let y = 86;
    const teamLeader = entry.teamLeader || {};
    const stats = (0, backendContext.local$engagementPdfEntryStats)(entry);
    const teamLeaderLabel = teamLeader.mode === "renounced"
      ? "Renonciation au droit de réclamation"
      : [engagementPdfPersonName(teamLeader), teamLeader.licenseNumber].filter((value) => value && value !== "-").join(" · ") || "-";
    y = engagementPdfCompactSummary(doc, [
      { label: "Club", value: [entry.clubName || "-", (0, backendContext.engagementClubCode)(entry.clubId, entry.clubCode)].filter(Boolean).join(" · ") },
      { label: "Chef d'équipe", value: teamLeaderLabel },
      { label: "Engagements", value: `${stats.swimmerCount} nageur${stats.swimmerCount > 1 ? "s" : ""} · ${stats.individualCount} course${stats.individualCount > 1 ? "s" : ""} · ${stats.relayCount} relais` }
    ], y);

    y = engagementPdfWhatsAppBlock(doc, whatsAppUrl, whatsAppQrBuffer, y);

    y = engagementPdfSection(doc, "Nageurs et courses individuelles", y);
    const individualMatrices = [
      engagementPdfIndividualMatrix(entry, competition, "F", "Nageuse"),
      engagementPdfIndividualMatrix(entry, competition, "M", "Nageur")
    ].filter(Boolean);
    if (individualMatrices.length) {
      individualMatrices.forEach((matrix) => {
        y = engagementPdfDrawIndividualMatrix(doc, matrix, competition, y);
      });
      const poolCompetition = (0, backendContext.cleanEngagementCompetitionType)(competition.competitionType) === "pool";
      const hasManualTime = poolCompetition && individualMatrices.some((matrix) => matrix.rows.some((swimmer) =>
        (swimmer.individualEntries || []).some((item) => (0, backendContext.cleanText)(item.entryTimeMode) === "manual")
      ));
      const hasMissingTime = poolCompetition && individualMatrices.some((matrix) => matrix.rows.some((swimmer) =>
        (swimmer.individualEntries || []).some((item) => !(0, backendContext.cleanText)(item.entryTime || item.manualEntryTime))
      ));
      if (hasManualTime || hasMissingTime) {
        y = engagementPdfEnsureSpace(doc, y, 18);
        doc.font("Helvetica").fontSize(6.5).fillColor("#6b7f7a").text([
          hasManualTime ? "* temps manuel" : "",
          hasMissingTime ? "? temps à vérifier" : ""
        ].filter(Boolean).join(" · "), 42, y, { width: doc.page.width - 84 });
        y += 14;
      }
    } else {
      y = engagementPdfEmptyState(doc, "Aucun engagement individuel.", y);
    }

    const swimmersWithoutIndividualRows = engagementPdfSwimmersWithoutIndividualRows(entry, competition);
    if (swimmersWithoutIndividualRows.length) {
      y = engagementPdfSection(doc, "Nageurs sans course individuelle", y);
      y = engagementPdfTable(doc, [
        { key: "swimmer", label: "Nageur", width: 165 },
        { key: "license", label: "Licence", width: 90 },
        { key: "sex", label: "Sexe", width: 36 },
        { key: "category", label: "Cat.", width: 40 },
        { key: "entries", label: "Engagements", width: 180 }
      ], swimmersWithoutIndividualRows, y);
    }

    y = engagementPdfSection(doc, "Relais", y);
    const relayRows = engagementPdfCollectRelayRows(entry);
    const relayColumns = (0, backendContext.cleanEngagementCompetitionType)(competition.competitionType) === "openWater"
      ? [
          { key: "event", label: "Relais", width: 90 },
          { key: "category", label: "Catégorie", width: 90 },
          { key: "gender", label: "Sexe", width: 70 },
          { key: "members", label: "Relayeurs", width: 261 }
        ]
      : [
          { key: "event", label: "Relais", width: 80 },
          { key: "category", label: "Catégorie", width: 82 },
          { key: "gender", label: "Sexe", width: 62 },
          { key: "time", label: "Temps", width: 58 },
          { key: "members", label: "Relayeurs", width: 229 }
        ];
    y = relayRows.length
      ? engagementPdfTable(doc, relayColumns, relayRows, y)
      : engagementPdfEmptyState(doc, "Aucun relais engagé.", y);

    y = engagementPdfSection(doc, "Officiels", y);
    const officialRows = (Array.isArray(entry.officials) ? entry.officials : []).map((official) => ({
          name: engagementPdfPersonName(official),
          license: official.licenseNumber || "-",
          role: "Officiel"
        }));
    y = competition.officialsRequired === false
      ? engagementPdfEmptyState(doc, "Officiels non requis pour cette compétition.", y)
      : officialRows.length
        ? engagementPdfTable(doc, [
          { key: "name", label: "Nom", width: 260 },
          { key: "license", label: "Licence", width: 120 },
          { key: "role", label: "Rôle", width: 131 }
        ], officialRows, y)
        : engagementPdfEmptyState(doc, "Aucun officiel déclaré.", y);

    const fees = competition.fees || {};
    y = engagementPdfEnsureSpace(doc, y, fees.enabled === false ? 58 : 201);
    y = engagementPdfSection(doc, "Frais d'engagement", y);
    y = fees.enabled === false
      ? engagementPdfEmptyState(doc, "Aucun frais d'engagement.", y)
      : engagementPdfFeesTable(doc, stats, fees, y);

    engagementPdfAddFooter(doc, generatedAt);
    const buffer = await engagementPdfDocToBuffer(doc);
    return {
      buffer,
      generatedAt,
      fileName: `recap-engagements-${(0, backendContext.local$engagementPdfFileName)(competition.name)}-${(0, backendContext.local$engagementPdfFileName)(entry.clubName || entry.clubId)}.pdf`
    };
  }

  return { engagementPdfFormatDate, engagementPdfFormatDateTime, engagementPdfLevelLabel, engagementPdfMoney, engagementPdfSwimmerName, engagementPdfPersonName, engagementPdfGenderLabel, engagementPdfRelayCategoryLabel, engagementPdfIndividualProgramColumns, engagementPdfIndividualMatrix, engagementPdfSwimmersWithoutIndividualRows, engagementPdfCompactSummary, engagementPdfDrawIndividualMatrix, engagementPdfCollectRelayRows, engagementPdfDocToBuffer, engagementPdfAddFooter, engagementPdfEnsureSpace, engagementPdfSection, engagementPdfEmptyState, engagementPdfWhatsAppBlock, engagementPdfFeesTable, engagementPdfTextHeight, engagementPdfTable, buildEngagementClubRecapPdf };
}

module.exports = { createEngagementPdfRenderer_buildEngagementClubRecapPdf };
