// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailRecipientShardNumber(backendContext) {
  function engagementMailRecipientShardNumber(uid = "") {
    return Number.parseInt(backendContext.stableHash(uid).slice(0, 8), 16) % backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT;
  }

  return { engagementMailRecipientShardNumber };
}

module.exports = { createMailService_engagementMailRecipientShardNumber };
