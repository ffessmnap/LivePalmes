// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage(backendContext) {
  async function rebuildEngagementMailRecipientIndexNextPage(request) {
    backendContext.assertCapability(request, "engagements.national.manage");
    const reset = request.data?.reset === true;
    const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 200) || 200, 50), 250);
    const stateRef = backendContext.engagementMailRecipientIndexStateRef(backendContext.db);
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
    if (!reset && state.status !== "rebuilding") {
      throw new backendContext.HttpsError("failed-precondition", "Commence la reconstruction des destinataires avec reset: true.");
    }
    const cursor = reset ? "" : backendContext.cleanText(state.cursor);
    const now = new Date().toISOString();
    if (reset) {
      const deleteBatch = backendContext.db.batch();
      backendContext.engagementMailRecipientShardRefs(backendContext.db).forEach((ref) => deleteBatch.delete(ref));
      deleteBatch.set(stateRef, { status: "rebuilding", cursor: "", processedCount: 0, updatedAt: now }, { merge: true });
      await deleteBatch.commit();
    }

    let query = backendContext.db.collection("users").orderBy(backendContext.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const recipients = snapshot.docs
      .filter((doc) => (doc.data() || {}).status === "active")
      .map(backendContext.engagementMailRecipientFromUserDoc)
      .filter((recipient) => recipient.email && recipient.capabilities?.length);
    const batch = backendContext.db.batch();
    backendContext.engagementMailRecipientShardGroups(recipients).forEach((group) => {
      batch.set(backendContext.engagementMailRecipientShardRef(backendContext.db, group.capability, group.shardNumber), {
        capability: group.capability,
        shardNumber: group.shardNumber,
        recipients: group.recipients,
        generatedAt: now
      }, { merge: true });
    });
    const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
    const done = snapshot.size < pageSize;
    const processedCount = (reset ? 0 : Number(state.processedCount || 0) || 0) + snapshot.size;
    batch.set(stateRef, {
      status: done ? "ready" : "rebuilding",
      cursor: done ? "" : nextCursor,
      processedCount,
      generatedAt: done ? now : backendContext.cleanText(state.generatedAt),
      updatedAt: now,
      source: "paged-rebuild"
    }, { merge: true });
    await batch.commit();
    if (done) {
      const indexedRecipients = await backendContext.engagementMailRecipientsFromIndex(backendContext.db, ["engagements.club.manage"]);
      await backendContext.writeEngagementClubAdminDirectory(backendContext.db, indexedRecipients, now);
    }
    return { ok: true, done, pageCount: snapshot.size, processedCount, nextCursor: done ? "" : nextCursor };
  }

  return { rebuildEngagementMailRecipientIndexNextPage };
}

module.exports = { createCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage };
