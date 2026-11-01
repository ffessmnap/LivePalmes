// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementLicenseControlPerson(backendContext) {
  function engagementLicenseControlPerson(swimmer = {}, entry = {}, competitions = []) {
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId).slice(0, 80);
    const firstName = backendContext.cleanText(swimmer.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(swimmer.lastName || swimmer.name).slice(0, 80);
    return {
      livePalmesId: swimmerIndexId,
      swimmerIndexId,
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      source: backendContext.cleanText(swimmer.source || "performances").slice(0, 40) || "performances",
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      firstName,
      lastName,
      name: backendContext.cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" "),
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).toUpperCase().slice(0, 1),
      clubId: backendContext.cleanText(entry.clubId || swimmer.clubId).slice(0, 40),
      clubName: backendContext.cleanText(entry.clubName || swimmer.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).toUpperCase().slice(0, 60),
      competitionIds: competitions.map((competition) => competition.id),
      competitions: competitions.map((competition) => backendContext.cleanText(competition.name || competition.title || competition.id).slice(0, 160))
    };
  }

  async function engagementLicenseReportRequest(input, context, pool) {
    const reports = require("../../engagement-license-reports"), store = require("../../nap-license-reports").store(pool);
    if (input.action === "summaries") return reports.summaries(backendContext.db, input.season, store);
    if (input.action === "reportHistory") return store.history(input.season, input.competitionId, input.before);
    if (input.action === "reportVersion") { const report=await store.readVersion(input.season,input.competitionId,input.version); return {report, text:report?reports.message(report).text:""}; }
    if (!["readReport", "completeReport", "closeReport", "previewReport", "sendReport"].includes(input.action)) throw new TypeError("Action de contrôle inconnue.");
    const batch = await require("../../nap-license-control").prepareBatch(pool, { season: input.season, competitionIds: [input.competitionId] });
    if (input.action === "readReport") {
      await reports.attach(backendContext.db, batch, store);
      return { report: batch.controlReports[String(require("../../nap-direct-calendar").positiveId(input.competitionId))], participantCount: batch.people.length, history: await store.history(input.season,input.competitionId) };
    }
    if (input.action === "completeReport") return reports.complete(backendContext.db, batch, input, context.uid, store);
    if (input.action === "closeReport") return reports.close(backendContext.db, batch, input, context.uid, store);
    let transporter;
    try {
      return await reports.notify(backendContext.db, batch, input, {
        projectId: backendContext.ENVIRONMENT.projectId,
        competition: async competitionId => {
          const rows = await require("../../nap-portal-competitions").bounded(pool,
            "SELECT c.id,c.comite,cp.mailtxt FROM competitions c FORCE INDEX (PRIMARY) LEFT JOIN compet_parametres cp ON cp.compet=c.id WHERE c.id=? LIMIT 2", [Number(competitionId)], 1);
          if (!rows.length) throw new TypeError("Compétition introuvable.");
          return { regionId: require("../../nap-competition-scope").REGIONS[rows[0].comite] || "", computerEmail: backendContext.cleanText(rows[0].mailtxt) };
        },
        directory: async () => {
          if ((await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get()).data()?.status !== "ready") throw new TypeError("Annuaire des destinataires indisponible ; aucune reconstruction automatique.");
          return backendContext.engagementMailRecipientsFromIndex(backendContext.db, ["engagements.region.manage"]);
        },
        setting: () => require("../../engagement-mail-control").read(backendContext.db),
        send: async (ref, job) => {
          // TEST is blocked both here and before any outbox write in the report module.
          if (backendContext.ENVIRONMENT.projectId === "livepalmes-test") throw new TypeError("Envois réels désactivés sur TEST.");
          let started = false;
          try {
            const gate = require("../../engagement-mail-control").decision(await require("../../engagement-mail-control").read(backendContext.db), job, backendContext.ENVIRONMENT.projectId);
            if (!gate.allowed) throw new TypeError("Envoi bloqué par le réglage des notifications.");
            const config = backendContext.engagementMailSmtpConfig();
            if (!config.ready) throw new TypeError("Configuration des mails indisponible.");
            if (!transporter) transporter = backendContext.nodemailer.createTransport({ ...config.transport, pool: true, maxConnections: 1, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 });
            started = true;
            await transporter.sendMail({ from: `LivePalmes <${config.fromEmail}>`, to: gate.to, subject: job.subject, text: job.textBody, html: backendContext.livePalmesMailHtml(job.textBody) });
            const sentAt = new Date().toISOString();
            await ref.set({ status: "sent", sentAt, sentBy: context.uid, updatedAt: sentAt }, { merge: true });
            return { status: "sent" };
          } catch (error) {
            const status = started ? "uncertain" : "failed";
            await ref.set({ status, updatedAt: new Date().toISOString(), reason: "Envoi non confirmé ; aucun renvoi automatique." }, { merge: true });
            throw new TypeError("Envoi non confirmé. Vérifiez le journal avant de reprendre.");
          }
        }
      }, store);
    } finally { if (transporter) transporter.close(); }
  }

  return { engagementLicenseControlPerson, engagementLicenseReportRequest };
}

module.exports = { createNationalService_engagementLicenseControlPerson };
