// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nationalLibraryContext(backendContext) {
  async function nationalLibraryContext(request) {
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError('permission-denied','Administration nationale requise.');
    if(backendContext.ENVIRONMENT.sportingDataSource!=='nap')throw new backendContext.HttpsError('failed-precondition','Bibliothèque NAP indisponible.');
    return context;
  }

  return { nationalLibraryContext };
}

module.exports = { createCompetitionService_nationalLibraryContext };
