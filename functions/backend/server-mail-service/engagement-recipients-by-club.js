// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementRecipientsByClub(backendContext) {
  function engagementRecipientsByClub(recipients = []) {
    return recipients.reduce((acc, recipient) => {
      const clubId = backendContext.cleanText(recipient.clubId);
      if (!clubId) return acc;
      if (!acc.has(clubId)) acc.set(clubId, []);
      acc.get(clubId).push(recipient);
      return acc;
    }, new Map());
  }

  return { engagementRecipientsByClub };
}

module.exports = { createMailService_engagementRecipientsByClub };
