// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailRecipientShardRef(backendContext) {
  function engagementMailRecipientShardRef(db, capability, shardNumber) {
    const capabilityKey = backendContext.cleanText(capability).replace(/[^a-z0-9]+/gi, "_");
    return db.collection(backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION).doc(`${capabilityKey}-${shardNumber}`);
  }

  return { engagementMailRecipientShardRef };
}

module.exports = { createMailService_engagementMailRecipientShardRef };
