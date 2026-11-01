// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_bootstrapEngagementMailRecipientIndex(backendContext) {
  async function replaceEngagementMailRecipientIndex(db, recipients = [], context = {}) {
    const now = context.now || new Date().toISOString();
    const deleteBatch = db.batch();
    (0, backendContext.local$engagementMailRecipientShardRefs)(db).forEach((ref) => deleteBatch.delete(ref));
    await deleteBatch.commit();

    const writeBatch = db.batch();
    (0, backendContext.local$engagementMailRecipientShardGroups)(recipients).forEach((group) => {
      writeBatch.set((0, backendContext.local$engagementMailRecipientShardRef)(db, group.capability, group.shardNumber), {
        capability: group.capability,
        shardNumber: group.shardNumber,
        recipients: group.recipients,
        generatedAt: now
      }, { merge: false });
    });
    writeBatch.set((0, backendContext.local$engagementMailRecipientIndexStateRef)(db), {
      status: "ready",
      cursor: "",
      recipientCount: recipients.length,
      generatedAt: now,
      updatedAt: now,
      source: context.source || "bounded-bootstrap"
    }, { merge: true });
    await writeBatch.commit();
    await (0, backendContext.local$writeEngagementClubAdminDirectory)(db, recipients, now);
  }

  async function bootstrapEngagementMailRecipientIndex(db) {
    const snapshots = await Promise.all(backendContext.ENGAGEMENT_MAIL_CAPABILITIES.map((capability) => {
      const capabilityField = new backendContext.FieldPath("capabilities", capability);
      return db.collection("users")
        .where(capabilityField, "==", true)
        .limit(backendContext.ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT + 1)
        .get();
    }));
    if (snapshots.some((snapshot) => snapshot.size > backendContext.ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT)) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Index des destinataires a initialiser par lots avant de preparer les courriels."
      );
    }
    const recipientsByUid = new Map();
    snapshots.flatMap((snapshot) => snapshot.docs)
      .filter((doc) => (doc.data() || {}).status === "active")
      .forEach((doc) => recipientsByUid.set(doc.id, (0, backendContext.local$engagementMailRecipientFromUserDoc)(doc)));
    const recipients = Array.from(recipientsByUid.values()).filter((recipient) => recipient.email && recipient.capabilities?.length);
    await replaceEngagementMailRecipientIndex(db, recipients);
    return recipients;
  }

  async function engagementActiveMailRecipients(db, capabilities = backendContext.ENGAGEMENT_MAIL_CAPABILITIES) {
    const mailCapabilities = capabilities.filter((capability) => backendContext.ENGAGEMENT_MAIL_CAPABILITIES.includes(capability));
    if (!mailCapabilities.length) return [];
    const stateSnapshot = await (0, backendContext.local$engagementMailRecipientIndexStateRef)(db).get();
    const indexedRecipients = stateSnapshot.data()?.status === "ready"
      ? await (0, backendContext.local$engagementMailRecipientsFromIndex)(db, mailCapabilities)
      : await bootstrapEngagementMailRecipientIndex(db);
    const recipientsByEmail = new Map();
    indexedRecipients
      .filter((recipient) => mailCapabilities.some((capability) => (0, backendContext.local$engagementRecipientHasCapability)(recipient, capability)))
      .filter((recipient) => recipient.email && recipient.capabilities?.length)
      .forEach((recipient) => {
        const existing = recipientsByEmail.get(recipient.email);
        if (!existing) {
          recipientsByEmail.set(recipient.email, recipient);
          return;
        }
        recipientsByEmail.set(recipient.email, {
          ...existing,
          ...recipient,
          competitionNotificationsEnabled: existing.competitionNotificationsEnabled !== false && recipient.competitionNotificationsEnabled !== false,
          capabilities: Array.from(new Set([...(existing.capabilities || []), ...(recipient.capabilities || [])]))
        });
      });
    return [...recipientsByEmail.values()];
  }

  return { replaceEngagementMailRecipientIndex, bootstrapEngagementMailRecipientIndex, engagementActiveMailRecipients };
}

module.exports = { createMailService_bootstrapEngagementMailRecipientIndex };
