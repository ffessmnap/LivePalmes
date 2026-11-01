// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementRecipientHasCapability(backendContext) {
  function engagementRecipientHasCapability(recipient = {}, capability) {
    return Array.isArray(recipient.capabilities) && recipient.capabilities.includes(capability);
  }

  return { engagementRecipientHasCapability };
}

module.exports = { createMailService_engagementRecipientHasCapability };
