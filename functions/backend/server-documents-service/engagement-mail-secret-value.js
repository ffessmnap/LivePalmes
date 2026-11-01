// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementMailSecretValue(backendContext) {
  function engagementMailSecretValue(secret, envName) {
    try {
      return String(secret.value() || process.env[envName] || "");
    } catch (error) {
      return String(process.env[envName] || "");
    }
  }

  function engagementMailSmtpConfig() {
    const host = backendContext.cleanText(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_HOST, "LIVEPALMES_SMTP_HOST"));
    const port = Number(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_PORT, "LIVEPALMES_SMTP_PORT") || 587);
    const user = backendContext.cleanText(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_USER, "LIVEPALMES_SMTP_USER"));
    const pass = engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_PASS, "LIVEPALMES_SMTP_PASS");
    const secureSetting = backendContext.cleanText(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_SECURE, "LIVEPALMES_SMTP_SECURE")).toLowerCase();
    const fromEmail = backendContext.normalizeEmail(engagementMailSecretValue(backendContext.LIVEPALMES_MAIL_FROM, "LIVEPALMES_MAIL_FROM") || "livepalmes@nap-ffessm.fr");
    const missing = [];
    if (!host) missing.push("LIVEPALMES_SMTP_HOST");
    if (!Number.isFinite(port) || port <= 0) missing.push("LIVEPALMES_SMTP_PORT");
    if (!user) missing.push("LIVEPALMES_SMTP_USER");
    if (!pass) missing.push("LIVEPALMES_SMTP_PASS");
    if (!fromEmail) missing.push("LIVEPALMES_MAIL_FROM");
    return {
      ready: !missing.length,
      missing,
      transport: {
        host,
        port,
        secure: secureSetting ? secureSetting === "true" : port === 465,
        auth: { user, pass }
      },
      fromEmail
    };
  }

  return { engagementMailSecretValue, engagementMailSmtpConfig };
}

module.exports = { createDocumentsService_engagementMailSecretValue };
