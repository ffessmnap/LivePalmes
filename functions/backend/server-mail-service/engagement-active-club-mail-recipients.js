// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementActiveClubMailRecipients(backendContext) {
  async function engagementActiveClubMailRecipients(db) {
    return (await (0, backendContext.local$engagementActiveMailRecipients)(db, ["engagements.club.manage"]))
      .filter((recipient) =>
        recipient.clubId &&
        (0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.club.manage")
      );
  }

  return { engagementActiveClubMailRecipients };
}

module.exports = { createMailService_engagementActiveClubMailRecipients };
