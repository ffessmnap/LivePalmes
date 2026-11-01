// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailRecipientIndexStateRef(backendContext) {
  function engagementMailRecipientIndexStateRef(db) {
    return db.collection(backendContext.ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION).doc("default");
  }

  function engagementMailRecipientShardRefs(db, capabilities = backendContext.ENGAGEMENT_MAIL_CAPABILITIES) {
    return capabilities.flatMap((capability) => Array.from(
      { length: backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT },
      (_, shardNumber) => (0, backendContext.local$engagementMailRecipientShardRef)(db, capability, shardNumber)
    ));
  }

  async function engagementMailRecipientsFromIndex(db, capabilities = backendContext.ENGAGEMENT_MAIL_CAPABILITIES) {
    const refs = engagementMailRecipientShardRefs(db, capabilities);
    const snapshots = refs.length ? await db.getAll(...refs) : [];
    return snapshots.flatMap((snapshot) => {
      const recipients = snapshot.exists ? snapshot.data()?.recipients : null;
      return recipients && typeof recipients === "object" ? Object.values(recipients) : [];
    });
  }

  return { engagementMailRecipientIndexStateRef, engagementMailRecipientShardRefs, engagementMailRecipientsFromIndex };
}

module.exports = { createMailService_engagementMailRecipientIndexStateRef };
