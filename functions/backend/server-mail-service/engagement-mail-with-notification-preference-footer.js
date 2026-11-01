// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailWithNotificationPreferenceFooter(backendContext) {
  function engagementMailWithNotificationPreferenceFooter(text = "", html = "", uid = "") {
    const preferenceUrl = backendContext.competitionNotificationPreferenceUrl(uid);
    if (!preferenceUrl) throw new Error("Configuration du lien de gestion des notifications manquante.");
    const footerText = [
      "",
      "Vous pouvez gérer ou désactiver les notifications email LivePalmes en utilisant ce lien :",
      preferenceUrl,
      "ou depuis la rubrique Mon compte du portail LivePalmes :",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#mon-compte`
    ].join("\n");
    const htmlBody = html || backendContext.livePalmesMailHtml(text);
    const footerHtml = [
      '<hr style="margin:24px 0;border:0;border-top:1px solid #d8e0e5">',
      '<p style="color:#66717a;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">',
      `Vous pouvez gérer ou désactiver les notifications email LivePalmes en cliquant sur <a href="${backendContext.escapeMailHtml(preferenceUrl)}">ce lien</a>, ou depuis la rubrique <a href="${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#mon-compte">« Mon compte »</a> du portail LivePalmes.</p>`
    ].join("");
    return { text: `${text}${footerText}`, html: `${htmlBody}${footerHtml}` };
  }

  async function sendEngagementMailJob(transporter, doc, config, context) {
    const data = doc.data() || {};
    if(data.deliveryMode==='bcc-v1')return {skipped:true,reason:'task-worker-required'};
    let smtpStarted = false, smtpAccepted = false;
    const now = new Date().toISOString();
    const toEmail = backendContext.normalizeEmail(data.toEmail);
    const subject = backendContext.cleanText(data.subject).slice(0, 220);
    let text = backendContext.cleanText(data.textBody || data.textPreview).slice(0, 5000);
    let html = String(data.htmlBody || "").trim().slice(0, 20000);
    if (!toEmail || !subject || !text) {
      const update = {
        status: "failed",
        reason: "Mail incomplet.",
        failedAt: now,
        updatedAt: now,
        updatedBy: context.uid || ""
      };
      await doc.ref.set(update, { merge: true });
      return (0, backendContext.local$engagementMailJobItemFromData)({ ...data, ...update }, doc.id);
    }
    try {
      if (backendContext.OPTIONAL_COMPETITION_MAIL_TYPES.has(backendContext.cleanText(data.type))) {
        const content = engagementMailWithNotificationPreferenceFooter(text, html, data.recipientUid);
        text = content.text;
        html = content.html;
      }
      if (!html) html = backendContext.livePalmesMailHtml(text);
      const attachments = await (0, backendContext.local$engagementMailAttachments)(data);
      // Fresh server read immediately before SMTP; never trust the UI switch.
      const control = require("../../engagement-mail-control");
      const gate = control.decision(await control.read(backendContext.db), data, backendContext.ENVIRONMENT.projectId);
      if (!gate.allowed) {
        const update = { status: 'cancelled', reason: gate.reason, updatedAt: new Date().toISOString() };
        await doc.ref.set(update, { merge: true });
        return (0, backendContext.local$engagementMailJobItemFromData)({ ...data, ...update }, doc.id);
      }
      smtpStarted = true;
      const info = await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: gate.to,
        subject: gate.test ? `[TEST LivePalmes] ${subject}` : subject,
        text,
        ...(html ? { html } : {}),
        attachments
      });
      smtpAccepted = true;
      const update = backendContext.cleanFirestoreValue({
        status: "sent",
        reason: "",
        sentAt: now,
        sentBy: context.uid || "",
        sentByEmail: context.email || "",
        providerMessageId: backendContext.cleanText(info?.messageId).slice(0, 180),
        deliveredTo: gate.to,
        updatedAt: now,
        updatedBy: context.uid || ""
      });
      await doc.ref.set(update, { merge: true });
      return (0, backendContext.local$engagementMailJobItemFromData)({ ...data, ...update }, doc.id);
    } catch (error) {
      const outcome = data.source === 'nap'
        ? require("../../nap-mail-delivery").failure(error, { smtpStarted, smtpAccepted })
        : { status: 'failed' };
      const update = backendContext.cleanFirestoreValue({
        status: outcome.status,
        reason: backendContext.cleanText(error?.message || error).slice(0, 220),
        failedAt: now,
        updatedAt: now,
        updatedBy: context.uid || ""
      });
      await doc.ref.set(update, { merge: true });
      return { ...(0, backendContext.local$engagementMailJobItemFromData)({ ...data, ...update }, doc.id), stopDelivery: outcome.stop === true };
    }
  }

  return { engagementMailWithNotificationPreferenceFooter, sendEngagementMailJob };
}

module.exports = { createMailService_engagementMailWithNotificationPreferenceFooter };
