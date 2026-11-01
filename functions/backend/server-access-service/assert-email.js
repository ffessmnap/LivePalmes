// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertEmail(backendContext) {
  function assertEmail(email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new backendContext.HttpsError("invalid-argument", "Email invalide.");
    }
  }

  return { assertEmail };
}

module.exports = { createAccessService_assertEmail };
