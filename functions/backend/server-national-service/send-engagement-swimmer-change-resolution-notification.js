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
    const mail = backendContext.engagementSwimmerChangeResolutionMail(payload);
    try {
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
        reason: "Envoi SMTP impossible."
      };
    }
  }

  return { sendEngagementSwimmerChangeResolutionNotification };
}

module.exports = { createNationalService_sendEngagementSwimmerChangeResolutionNotification };
