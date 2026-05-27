(function attachLivePalmesAppModules(global) {
  const modules = {
    livePalmesLocalState: "LivePalmesLocalState",
    livePalmesAppStorageWorkflowModule: "LivePalmesAppStorageWorkflow",
    livePalmesFirebase: "LivePalmesFirebase",
    livePalmesFirestoreRefs: "LivePalmesFirestoreRefs",
    livePalmesConsoleSyncModule: "LivePalmesConsoleSync",
    livePalmesRealtimeSyncModule: "LivePalmesRealtimeSync",
    livePalmesRoleAccess: "LivePalmesRoleAccess",
    livePalmesRoleState: "LivePalmesRoleState",
    livePalmesRoleSessionWorkflowModule: "LivePalmesRoleSessionWorkflow",
    livePalmesRaceCore: "LivePalmesRaceCore",
    livePalmesAlerts: "LivePalmesAlerts",
    livePalmesAlertPresenterModule: "LivePalmesAlertPresenter",
    livePalmesFinalists: "LivePalmesFinalists",
    livePalmesSecretaryFinals: "LivePalmesSecretaryFinals",
    livePalmesPublication: "LivePalmesPublication",
    livePalmesDiagnostics: "LivePalmesDiagnostics",
    livePalmesAdminDiagnostics: "LivePalmesAdminDiagnostics",
    livePalmesAdminMaintenance: "LivePalmesAdminMaintenance",
    livePalmesAdminActionsModule: "LivePalmesAdminActions",
    livePalmesAdminModals: "LivePalmesAdminModals",
    livePalmesAdminArchives: "LivePalmesAdminArchives",
    livePalmesExportActions: "LivePalmesExportActions",
    livePalmesExportReportsWorkflowModule: "LivePalmesExportReportsWorkflow",
    livePalmesAdminResults: "LivePalmesAdminResults",
    livePalmesResults: "LivePalmesResults",
    livePalmesPdfImport: "LivePalmesPdfImport",
    livePalmesSeriesImport: "LivePalmesSeriesImport",
    livePalmesSeriesImportWorkflowModule: "LivePalmesSeriesImportWorkflow",
    livePalmesSpeakerInfo: "LivePalmesSpeakerInfo",
    livePalmesSpeakerInfoWorkflowModule: "LivePalmesSpeakerInfoWorkflow",
    livePalmesProgramNavigation: "LivePalmesProgramNavigation",
    livePalmesProgramModalsModule: "LivePalmesProgramModals",
    livePalmesEntrantHelpersModule: "LivePalmesEntrantHelpers",
    livePalmesSwimmerPanel: "LivePalmesSwimmerPanel",
    livePalmesResultsAdminWorkflow: "LivePalmesResultsAdminWorkflow",
    livePalmesResultPublicationWorkflowModule: "LivePalmesResultPublicationWorkflow",
    livePalmesResultMaintenanceWorkflowModule: "LivePalmesResultMaintenanceWorkflow",
    livePalmesFinalWithdrawalsWorkflow: "LivePalmesFinalWithdrawalsWorkflow",
    livePalmesDiagnosticsWorkflow: "LivePalmesDiagnosticsWorkflow",
    livePalmesUiEvents: "LivePalmesUiEvents",
    livePalmesProgramView: "LivePalmesProgramView",
    livePalmesConsoleRenderWorkflowModule: "LivePalmesConsoleRenderWorkflow",
    livePalmesRefereeView: "LivePalmesRefereeView",
    livePalmesRoleQueueView: "LivePalmesRoleQueueView",
    livePalmesHistoryView: "LivePalmesHistoryView",
    livePalmesHistoryActionsModule: "LivePalmesHistoryActions",
    livePalmesHistoryPresenterModule: "LivePalmesHistoryPresenter",
    livePalmesDecisionWorkflowModule: "LivePalmesDecisionWorkflow",
    livePalmesHeaderView: "LivePalmesHeaderView",
    livePalmesAlertDetailView: "LivePalmesAlertDetailView",
    livePalmesAlertCardView: "LivePalmesAlertCardView",
    livePalmesLineStatusView: "LivePalmesLineStatusView",
    livePalmesPublicProgressWorkflowModule: "LivePalmesPublicProgressWorkflow",
    livePalmesAppLifecycleModule: "LivePalmesAppLifecycle",
    livePalmesAppState: "LivePalmesAppState",
    livePalmesAppDom: "LivePalmesAppDom"
  };

  function collect(source = global) {
    return Object.fromEntries(
      Object.entries(modules).map(([key, windowKey]) => [key, source[windowKey] || {}])
    );
  }

  global.LivePalmesAppModules = {
    collect,
    modules: { ...modules }
  };
})(window);
