// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailRecipientShardGroups(backendContext) {
  function engagementMailRecipientShardGroups(recipients = []) {
    const groups = new Map();
    recipients.forEach((recipient) => {
      (recipient.capabilities || []).forEach((capability) => {
        if (!backendContext.ENGAGEMENT_MAIL_CAPABILITIES.includes(capability)) return;
        const shardNumber = (0, backendContext.local$engagementMailRecipientShardNumber)(recipient.uid);
        const groupKey = `${capability}|${shardNumber}`;
        if (!groups.has(groupKey)) groups.set(groupKey, { capability, shardNumber, recipients: {} });
        groups.get(groupKey).recipients[(0, backendContext.local$engagementMailRecipientIndexKey)(recipient.uid)] = recipient;
      });
    });
    return groups;
  }

  return { engagementMailRecipientShardGroups };
}

module.exports = { createMailService_engagementMailRecipientShardGroups };
