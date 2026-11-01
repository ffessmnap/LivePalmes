// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_publicEngagementClubDirectoryRef(backendContext) {
  function publicEngagementClubDirectoryRef() {
    return backendContext.db.collection(backendContext.ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION).doc("clubs");
  }

  return { publicEngagementClubDirectoryRef };
}

module.exports = { createAccessService_publicEngagementClubDirectoryRef };
