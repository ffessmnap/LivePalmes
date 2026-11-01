// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_assertPin(backendContext) {
  function assertPin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      throw new backendContext.HttpsError("invalid-argument", "Le code PIN doit contenir 4 chiffres.");
    }
  }

  function pinHash(pin, salt) {
    return backendContext.crypto.pbkdf2Sync(String(pin), String(salt), backendContext.HASH_ITERATIONS, backendContext.HASH_BYTES, "sha256").toString("hex");
  }

  return { assertPin, pinHash };
}

module.exports = { createAccessService_assertPin };
