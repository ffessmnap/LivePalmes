// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_sendEngagementSwimmerChangeResolutionNotification(backendContext) {
  async function sendEngagementSwimmerChangeResolutionNotification(payload = {}) {
    const attemptedAt = new Date().toISOString();
    const recipientEmail = backendContext.normalizeEmail(payload.requestedByEmail);
    if (!recipientEmail) {
      return {
        status: "skipped_missing_recipient",
        attemptedAt,
        reason: "Adresse e-mail du demandeur absente."
      };
    }
    const config = backendContext.engagementMailSmtpConfig();
    if (!config.ready) {
      return {
        status: "skipped_missing_config",
        attemptedAt,
        reason: "Configuration SMTP incomplete."
      };
    }
    const original = backendContext.engagementSwimmerChangeResolutionMail(payload);
    let contentReady = false;
    try {
      const blocks = original.text.split("\n\n");
      const mail = require("../../mail-template-rendering").requestMail(await require("../../mail-templates").read(backendContext.db), {
        kind: "swimmer_correction", decision: payload.decision, greeting: blocks[0], subject: original.subject, summary: blocks[1],
        details: blocks.slice(2, -1).filter(block => !block.startsWith("Commentaire de l’administrateur national :")).join("\n\n"),
        comment: payload.resolutionNote
      }, original);
      contentReady = true;
      const transporter = backendContext.nodemailer.createTransport(config.transport);
      await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: recipientEmail,
        subject: backendContext.cleanText(mail.subject).slice(0, 220),
        text: mail.text,
        html: backendContext.livePalmesMailHtml(mail.text)
      });
      return {
        status: "sent",
        attemptedAt,
        sentAt: new Date().toISOString(),
        reason: ""
      };
    } catch (error) {
      console.error(
        "Notification de resolution de correction nageur impossible.",
        backendContext.cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
      );
      return {
        status: "failed",
        attemptedAt,
        reason: contentReady ? "Envoi SMTP impossible." : "Modèle de mail indisponible ou invalide."
      };
    }
  }

  return { sendEngagementSwimmerChangeResolutionNotification };
}

module.exports = { createNationalService_sendEngagementSwimmerChangeResolutionNotification };
