// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_dtnSeasonService(backendContext) {
  function dtnSeasonService() {
    const native = backendContext.ENVIRONMENT.sportingDataSource === "nap";
    const factory = native ? require("../../nap-dtn-season-service").createNativeDtnSeasonService : backendContext.createDtnSeasonService;
    return factory({
      db: /* backend-shorthand */ backendContext.db, fieldPath: backendContext.FieldPath,
      getPool: () => require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),
      audit: (action, request, target) => backendContext.writeAuditLogOnce(action, request.auth.uid, target, `nap-dtn-${target.seasonId}-${target.revision}-${action}`),
      fail: (message, code = "failed-precondition") => { throw new backendContext.HttpsError(code, message); },
      authorize: async (request) => {
        if (!request.auth?.uid) throw new backendContext.HttpsError("unauthenticated", "Connexion requise.");
        await backendContext.assertLivePalmesAccess(request);
        (await backendContext.assertCapability(request, "dtn.view"));
      },
      canManage: (request) => {
        const caps = require("../../current-access-profile").currentAccessCapabilities(request, { db: backendContext.db, HttpsError: backendContext.HttpsError });
        return caps["admin.full"] === true || caps["dtn.manage"] === true;
      },
      normalizeRow: backendContext.publicPerformanceBaseRow
    });
  }

  return { dtnSeasonService };
}

module.exports = { createDtnService_dtnSeasonService };
