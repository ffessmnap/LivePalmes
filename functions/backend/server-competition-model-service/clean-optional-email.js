// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanOptionalEmail(backendContext) {
  function cleanOptionalEmail(value, label = "Email") {
    const email = backendContext.normalizeEmail(value).slice(0, 180);
    if (!email) return "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new backendContext.HttpsError("invalid-argument", `${label} invalide.`);
    }
    return email;
  }

  return { cleanOptionalEmail };
}

module.exports = { createCompetitionModelService_cleanOptionalEmail };
