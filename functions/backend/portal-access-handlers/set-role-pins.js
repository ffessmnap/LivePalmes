// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_setRolePins(backendContext) {
  async function setRolePins(request) {
    backendContext.assertCapability(request, "consoles.manage");
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    if (request.data?.enabled === false) {
      throw new backendContext.HttpsError("failed-precondition", "Les codes PIN des consoles ne peuvent plus etre desactives.");
    }
    const enabled = true;
    const now = new Date().toISOString();
    const pins = request.data?.pins || {};
    const ref = backendContext.rolePinsRef(competitionId);

    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const previousRoles = snapshot.exists ? (snapshot.data()?.roles || {}) : {};
      const nextRoles = enabled ? { ...previousRoles } : {};

      if (enabled) {
        backendContext.ROLES.forEach((role) => {
          const pin = backendContext.cleanText(pins[role]);
          if (!pin) {
            const previous = previousRoles[role] || {};
            if (!previous.hash || !previous.salt) {
              throw new backendContext.HttpsError("invalid-argument", `Le code PIN ${role} doit contenir 4 chiffres.`);
            }
            nextRoles[role] = previous;
            return;
          }
          backendContext.assertPin(pin);
          const salt = backendContext.crypto.randomBytes(16).toString("hex");
          nextRoles[role] = {
            hash: backendContext.pinHash(pin, salt),
            salt,
            updatedAt: now
          };
        });
      }

      transaction.set(ref, {
        enabled,
        roles: nextRoles,
        updatedAt: now,
        updatedBy: request.auth.uid,
        version: 1
      }, { merge: false });
    });

    await backendContext.db.runTransaction(async (transaction) => {
      const attemptsRoot = backendContext.db
        .collection("competitions")
        .doc(competitionId)
        .collection("security")
        .doc("pinAttempts")
        .collection("items");
      const changedRoles = new Set(backendContext.ROLES.filter((role) => backendContext.cleanText(pins[role])));
      if (!changedRoles.size) return;
      const snapshot = await transaction.get(attemptsRoot.where("role", "in", [...changedRoles]));
      snapshot.docs.forEach((doc) => {
        transaction.delete(doc.ref);
      });
    }).catch(() => {});

    await backendContext.updatePublicPinNotes(competitionId, enabled);

    return {
      ok: true,
      enabled,
      mode: "cloud",
      updatedAt: now
    };
  }

  return { setRolePins };
}

module.exports = { createAccessHandlers_setRolePins };
