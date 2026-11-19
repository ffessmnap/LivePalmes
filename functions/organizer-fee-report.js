"use strict";

const { createHash } = require("node:crypto");
const { list } = require("./competition-mail-addresses");
const teams = require("./nap-team-entries");
const { engagementPdfEntryStats } = require("./backend/engagement-pdf-renderer/engagement-pdf-entry-stats").createEngagementPdfRenderer_engagementPdfEntryStats({});
const { engagementPdfFeeTotal } = require("./backend/engagement-pdf-renderer/engagement-pdf-fee-total").createEngagementPdfRenderer_engagementPdfFeeTotal({ local$engagementPdfEntryStats: engagementPdfEntryStats });
const { engagementClubEntryHasParticipants } = require("./backend/server-entry-model-service/engagement-club-entry-has-participants").createEntryModelService_engagementClubEntryHasParticipants({});
const money = cents => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }).replace(/[\u202f\u00a0]/g, " ");

function summary(competition, entries) {
  if (!["pool", "openWater"].includes(competition.competitionType) || competition.canceled || competition.qualificationJobId) {
    throw new TypeError("Le récapitulatif nécessite une compétition active sans contrôle de qualification en cours.");
  }
  if (!Array.isArray(entries) || entries.length > 500) throw new RangeError("Liste des clubs trop volumineuse.");
  const fees = competition.fees || {};
  const classic = !competition.entryFormat || competition.entryFormat === "classic";
  const counts = classic ? ["Nageurs", "Courses", "Relais"] : ["Équipes", "Nageurs HC", "Courses HC"];
  const rates = classic ? [fees.swimmerFee, fees.individualEventFee, fees.relayFee] : [fees.teamFee, fees.swimmerFee, fees.individualEventFee];
  const rows = entries.filter(engagementClubEntryHasParticipants).map(entry => {
    const stats = engagementPdfEntryStats(entry);
    const team = teams.fees(competition, entry);
    const quantities = team ? [team.teamCount, team.hcPeople, team.hcEvents] : [stats.swimmerCount, stats.individualCount, stats.relayCount];
    return { id: String(entry.clubId), club: entry.clubName || entry.clubCode || "Club", quantities,
      incomplete: entry.teamLeaderComplete === false, cents: Math.round(engagementPdfFeeTotal(entry, competition) * 100) };
  }).sort((a, b) => a.club.localeCompare(b.club, "fr") || a.id.localeCompare(b.id));
  const recipients = list(competition.organizerEmail, "Organisateur").sort();
  const report = { name: competition.name || "Compétition", date: competition.date, counts, enabled: fees.enabled !== false,
    rates: rates.map(value => Math.round(Number(value || 0) * 100)), rows, total: rows.reduce((sum, row) => sum + row.cents, 0) };
  const digest = createHash("sha256").update(JSON.stringify([String(competition.id).replace(/^legacy-nap-/, ""), recipients, report])).digest("hex");
  return { report, recipients, digest };
}

async function pdf(report, generatedAt = new Date().toISOString()) {
  const PDFDocument = require("pdfkit");
  const path = require("node:path");
  const helpers = require("./backend/engagement-pdf-renderer/build-engagement-club-recap-pdf").createEngagementPdfRenderer_buildEngagementClubRecapPdf({
    cleanText: value => String(value ?? "").trim()
  });
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: {
    Title: "Frais d’engagement par club", Author: "LivePalmes", CreationDate: new Date(generatedAt)
  } });
  const width = doc.page.width - 84;
  doc.engagementPdfContinuationHeader = () => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#173b42").text("Frais d’engagement par club", 42, 24);
    return 48;
  };
  doc.rect(0, 0, doc.page.width, 74).fill("#f4faf9");
  doc.image(path.join(__dirname, "assets", "logo-ffessm-nage-avec-palmes.png"), 42, 10, { fit: [74, 54] });
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#073b44").text("Frais d’engagement par club", 130, 27, { width: width - 88 });
  doc.fontSize(13).fillColor("#173b42").text(report.name, 42, 89, { width });
  const date = String(report.date || "").split("-").reverse().join("/");
  doc.font("Helvetica").fontSize(9).text([date, report.rows.length + " club(s)"].filter(Boolean).join("  ·  "), 42, doc.y + 4);
  const tariff = report.enabled ? report.counts.map((label, i) => label + " : " + money(report.rates[i])).join("   ·   ") : "Aucun frais d’engagement";
  doc.text(tariff, 42, doc.y + 6, { width });
  doc.font("Helvetica-Bold").fontSize(12).text("Total général : " + money(report.total), 42, doc.y + 10, { width });
  const columns = [{ key: "club", label: "Club", width: 218 }, ...report.counts.map((label, i) => ({ key: "q" + i, label, width: 61 })), { key: "amount", label: "Montant", width: 110 }];
  const rows = report.rows.map(row => ({ club: row.club + " (" + row.id + ")" + (row.incomplete ? " · dossier incomplet" : ""),
    q0: String(row.quantities[0]), q1: String(row.quantities[1]), q2: String(row.quantities[2]), amount: money(row.cents) }));
  helpers.engagementPdfTable(doc, columns, rows, doc.y + 12);
  helpers.engagementPdfAddFooter(doc, generatedAt);
  return { buffer: await helpers.engagementPdfDocToBuffer(doc), fileName: "frais-engagements-par-club.pdf" };
}

module.exports = { summary, pdf, money };
