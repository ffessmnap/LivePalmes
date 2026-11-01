// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_setCompetitionEmailNotificationPreference(backendContext) {
  async function setCompetitionEmailNotificationPreference(uid = "", enabled = true, source = "portal") {
    const cleanUid = backendContext.cleanText(uid).slice(0, 128);
    if (!cleanUid) throw new backendContext.HttpsError("invalid-argument", "Compte requis.");
    const userRef = backendContext.db.collection("users").doc(cleanUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Compte LivePalmes introuvable.");
    const userData = snapshot.data() || {};
    const now = new Date().toISOString();
    const preferencePatch = {
      emailPreferences: {
        competitionNotifications: enabled === true,
        updatedAt: now,
        source: backendContext.cleanText(source).slice(0, 40)
      },
      updatedAt: now
    };
    const before = backendContext.engagementMailRecipientFromUserDoc(snapshot);
    const afterData = {
      ...userData,
      ...preferencePatch,
      emailPreferences: {
        ...(userData.emailPreferences || {}),
        ...preferencePatch.emailPreferences
      }
    };
    const after = afterData.status === "active"
      ? backendContext.engagementMailRecipientFromUserDoc({ id: cleanUid, data: () => afterData })
      : null;
    const recipientKey = backendContext.engagementMailRecipientIndexKey(cleanUid);
    const capabilities = new Set([...(before.capabilities || []), ...(after?.capabilities || [])]);
    const batch = backendContext.db.batch();
    batch.set(userRef, preferencePatch, { merge: true });
    capabilities.forEach((capability) => {
      const shardNumber = backendContext.engagementMailRecipientShardNumber(cleanUid);
      const value = after?.capabilities?.includes(capability) ? after : backendContext.FieldValue.delete();
      batch.set(backendContext.engagementMailRecipientShardRef(backendContext.db, capability, shardNumber), {
        capability,
        shardNumber,
        recipients: { [recipientKey]: value },
        generatedAt: now
      }, { merge: true });
    });
    await batch.commit();
    await backendContext.writeAuditLog("accessUser.competitionEmailPreferenceUpdated", cleanUid, {
      uid: cleanUid,
      enabled: enabled === true,
      source: backendContext.cleanText(source).slice(0, 40)
    }).catch((error) => console.warn("Journalisation de la préférence mail impossible", error));
    return { enabled: enabled === true, updatedAt: now };
  }

  return { setCompetitionEmailNotificationPreference };
}

module.exports = { createDirectoryService_setCompetitionEmailNotificationPreference };
