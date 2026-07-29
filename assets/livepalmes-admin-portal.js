(function attachLivePalmesAdminPortal(global) {
  const ENGAGEMENT_EVENT_DEFINITIONS = [
    ["50SF", "individual", "50 m Surface", "50 SF", "SF", 50],
    ["100SF", "individual", "100 m Surface", "100 SF", "SF", 100],
    ["200SF", "individual", "200 m Surface", "200 SF", "SF", 200],
    ["400SF", "individual", "400 m Surface", "400 SF", "SF", 400],
    ["800SF", "individual", "800 m Surface", "800 SF", "SF", 800],
    ["1500SF", "individual", "1500 m Surface", "1500 SF", "SF", 1500],
    ["50AP", "individual", "50 m Apnee", "50 AP", "AP", 50],
    ["100IS", "individual", "100 m Immersion", "100 IS", "IS", 100],
    ["200IS", "individual", "200 m Immersion", "200 IS", "IS", 200],
    ["400IS", "individual", "400 m Immersion", "400 IS", "IS", 400],
    ["50BI", "individual", "50 m Bi-palmes", "50 BI", "BI", 50],
    ["100BI", "individual", "100 m Bi-palmes", "100 BI", "BI", 100],
    ["200BI", "individual", "200 m Bi-palmes", "200 BI", "BI", 200],
    ["400BI", "individual", "400 m Bi-palmes", "400 BI", "BI", 400],
    ["4X50SF", "relay", "4 x 50 m Surface", "4 x 50 SF", "SF", 50, 4, "mastersOnly"],
    ["4X100SF", "relay", "4 x 100 m Surface", "4 x 100 SF", "SF", 100, 4],
    ["4X200SF", "relay", "4 x 200 m Surface", "4 x 200 SF", "SF", 200, 4],
    ["4X100BI", "relay", "4 x 100 m Bi-palmes mixte", "4 x 100 BI", "BI", 100, 4, "required"],
    ["4X100SB", "relay", "4 x 100 m Surface/Bi-palmes mixte", "4 x 100 SB", "SB", 100, 4, "required"]
  ].map(([code, type, label, shortLabel, discipline, distance, relayLegs, relayMixedRule]) => ({
    code,
    type,
    label,
    shortLabel,
    discipline,
    distance,
    ...(relayLegs ? { relayLegs } : {}),
    ...(relayMixedRule ? { relayMixedRule } : {})
  }));
  const ENGAGEMENT_EVENT_BY_CODE = new Map(ENGAGEMENT_EVENT_DEFINITIONS.map((event) => [event.code, event]));
  const ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS = [
    ["P", "Poussins"],
    ["B", "Benjamins"],
    ["M", "Minimes"],
    ["C", "Cadets"],
    ["J", "Juniors"],
    ["S", "Seniors"],
    ["M30+", "Master 30+"],
    ["M40+", "Master 40+"],
    ["M50+", "Master 50+"],
    ["M60+", "Master 60+"],
    ["M70+", "Master 70+"],
    ["M80+", "Master 80+"]
  ];
  const ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS = [
    ["P", "Poussins"],
    ["B", "Benjamins"],
    ["M", "Minimes"],
    ["C", "Cadets"],
    ["J", "Juniors"],
    ["S", "Seniors"],
    ["R140", "Relais R140"],
    ["R180", "Relais R180"],
    ["R220", "Relais R220"],
    ["R260", "Relais R260"]
  ];
  const ENGAGEMENT_CATEGORY_DEFINITIONS = Array.from(new Map([
    ...ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS,
    ...ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
  ]));
  const ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = {
    "50AP": new Set(["P", "B", "M"])
  };
  const ENGAGEMENT_PROGRAM_GENDER_MODES = [
    ["female", "Femmes"],
    ["male", "Hommes"],
    ["mixed", "F/H ensemble"]
  ];
  const ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS = Object.fromEntries(ENGAGEMENT_PROGRAM_GENDER_MODES);
  const LIVEPALMES_REGION_DEFINITIONS = [
    "Hauts de France",
    "Normandie",
    "Ile de France",
    "Grand Est",
    "Bretagne Pays de la Loire",
    "Centre",
    "Nouvelle Aquitaine",
    "Pyr\u00e9n\u00e9es M\u00e9diterran\u00e9e Occitanie",
    "Corse",
    "Sud",
    "Auvergne Rh\u00f4ne Alpes",
    "Bourgogne Franche Comt\u00e9",
    "R\u00e9union",
    "Guadeloupe",
    "Martinique Guyane",
    "Nouvelle Cal\u00e9donie",
    "Polyn\u00e9sie"
  ];
  const LIVEPALMES_REFERENCE_REGION_LABELS = {
    "1": "Grand Est",
    "2": "Nouvelle Aquitaine",
    "3": "Ile de France",
    "6": "Bretagne Pays de la Loire",
    "8": "Centre",
    "9": "Guadeloupe",
    "10": "Pyr\u00e9n\u00e9es M\u00e9diterran\u00e9e Occitanie",
    "11": "Martinique Guyane",
    "12": "Corse",
    "13": "Hauts de France",
    "15": "Normandie",
    "16": "Sud",
    "17": "Auvergne Rh\u00f4ne Alpes",
    "18": "R\u00e9union",
    "22": "Bourgogne Franche Comt\u00e9"
  };

  const elements = {
    dashboard: document.querySelector("#adminPortalDashboard"),
    email: document.querySelector("#adminPortalEmail"),
    form: document.querySelector("#adminPortalLoginForm"),
    message: document.querySelector("#adminPortalMessage"),
    password: document.querySelector("#adminPortalPassword"),
    reset: document.querySelector("#adminPortalResetButton"),
    publicAccessRequestForm: document.querySelector("#adminPublicAccessRequestForm"),
    publicAccessRequestFirstName: document.querySelector("#adminPublicAccessRequestFirstName"),
    publicAccessRequestLastName: document.querySelector("#adminPublicAccessRequestLastName"),
    publicAccessRequestEmail: document.querySelector("#adminPublicAccessRequestEmail"),
    publicAccessRequestLicenseNumber: document.querySelector("#adminPublicAccessRequestLicenseNumber"),
    publicAccessRequestRegionId: document.querySelector("#adminPublicAccessRequestRegionId"),
    publicAccessRequestClubSelect: document.querySelector("#adminPublicAccessRequestClubSelect"),
    publicAccessRequestClubName: document.querySelector("#adminPublicAccessRequestClubName"),
    publicAccessRequestClubId: document.querySelector("#adminPublicAccessRequestClubId"),
    publicAccessRequestText: document.querySelector("#adminPublicAccessRequestText"),
    publicAccessRequestMessage: document.querySelector("#adminPublicAccessRequestMessage"),
    sessionLabel: document.querySelector("#adminPortalSessionLabel"),
    signOut: document.querySelector("#adminPortalSignOutButton"),
    accountControl: document.querySelector("#adminPortalAccount"),
    accountToggle: document.querySelector("#adminPortalAccountToggle"),
    accountActions: document.querySelector("#adminPortalAccountActions"),
    navToggle: document.querySelector("#adminPortalNavToggle"),
    navCurrent: document.querySelector("#adminPortalNavCurrent"),
    navigation: document.querySelector("#adminPortalNavigation"),
    performanceMenu: document.querySelector("[data-admin-performance-menu]"),
    performanceToggle: document.querySelector("#adminPortalPerformanceToggle"),
    performanceSubmenu: document.querySelector("#adminPortalPerformanceSubmenu"),
    engagementsAdminMenu: document.querySelector("[data-engagements-admin-nav]"),
    engagementsAdminToggle: document.querySelector("#adminPortalEngagementsToggle"),
    engagementsAdminSubmenu: document.querySelector("#adminPortalEngagementsSubmenu"),
    dtnMenu: document.querySelector("[data-admin-dtn-menu]"),
    dtnToggle: document.querySelector("#adminPortalDtnToggle"),
    dtnSubmenu: document.querySelector("#adminPortalDtnSubmenu"),
    accessForm: document.querySelector("#adminAccessForm"),
    accessMessage: document.querySelector("#adminAccessMessage"),
    accessList: document.querySelector("#adminAccessList"),
    accessCount: document.querySelector("#adminAccessCount"),
    accessPanel: document.querySelector("#adminAccessPanel"),
    accessAdd: document.querySelector("#adminAccessAddButton"),
    accessRefresh: document.querySelector("#adminAccessRefreshButton"),
    accessRegionId: document.querySelector("#adminAccessRegionId"),
    accessClubSelect: document.querySelector("#adminAccessClubSelect"),
    accessClubName: document.querySelector("#adminAccessClubName"),
    accessClubId: document.querySelector("#adminAccessClubId"),
    accessFilters: document.querySelector("#adminAccessFilters"),
    accessSearch: document.querySelector("#adminAccessSearch"),
    accessStatusFilter: document.querySelector("#adminAccessStatusFilter"),
    accessCapabilityFilter: document.querySelector("#adminAccessCapabilityFilter"),
    accessClearFilters: document.querySelector("#adminAccessClearFilters"),
    accessPagination: document.querySelector("#adminAccessPagination"),
    accessPreviousPage: document.querySelector("#adminAccessPreviousPage"),
    accessNextPage: document.querySelector("#adminAccessNextPage"),
    accessPageLabel: document.querySelector("#adminAccessPageLabel"),
    accessDeletionRequestsPanel: document.querySelector("#adminAccessDeletionRequestsPanel"),
    accessDeletionRequestsRefresh: document.querySelector("#adminAccessDeletionRequestsRefresh"),
    accessDeletionRequestsStatus: document.querySelector("#adminAccessDeletionRequestsStatus"),
    accessDeletionRequestsList: document.querySelector("#adminAccessDeletionRequestsList"),
    cancelEdit: document.querySelector("#adminAccessCancelEdit"),
    accessRequestForm: document.querySelector("#adminAccessRequestForm"),
    accessRequestFirstName: document.querySelector("#adminAccessRequestFirstName"),
    accessRequestLastName: document.querySelector("#adminAccessRequestLastName"),
    accessRequestEmail: document.querySelector("#adminAccessRequestEmail"),
    accessRequestLicenseNumber: document.querySelector("#adminAccessRequestLicenseNumber"),
    accessRequestRegionId: document.querySelector("#adminAccessRequestRegionId"),
    accessRequestClubSelect: document.querySelector("#adminAccessRequestClubSelect"),
    accessRequestClubName: document.querySelector("#adminAccessRequestClubName"),
    accessRequestClubId: document.querySelector("#adminAccessRequestClubId"),
    accessRequestText: document.querySelector("#adminAccessRequestText"),
    accessRequestMessage: document.querySelector("#adminAccessRequestMessage"),
    accountEmailForm: document.querySelector("#adminAccountEmailForm"),
    accountEmail: document.querySelector("#adminAccountEmail"),
    accountEmailPassword: document.querySelector("#adminAccountEmailPassword"),
    accountEmailMessage: document.querySelector("#adminAccountEmailMessage"),
    accountPasswordForm: document.querySelector("#adminAccountPasswordForm"),
    accountCurrentPassword: document.querySelector("#adminAccountCurrentPassword"),
    accountNewPassword: document.querySelector("#adminAccountNewPassword"),
    accountConfirmPassword: document.querySelector("#adminAccountConfirmPassword"),
    accountPasswordMessage: document.querySelector("#adminAccountPasswordMessage"),
    accountCapabilities: document.querySelector("#adminAccountCapabilities"),
    recordModuleStatus: document.querySelector("#adminRecordModuleStatus"),
    performanceStyles: document.querySelector("#adminPerformanceStyles"),
    recordWorkbench: document.querySelector("#adminWorkbench"),
    importModuleStatus: document.querySelector("#adminImportModuleStatus"),
    importStyles: document.querySelector("#adminImportStyles"),
    importWorkbench: document.querySelector("#importWorkbench"),
    correctionModuleStatus: document.querySelector("#adminCorrectionModuleStatus"),
    correctionWorkbench: document.querySelector("#correctionWorkbench"),
    engagementsView: document.querySelector("#adminEngagementsView"),
    engagementsViewEyebrow: document.querySelector("#adminEngagementsViewEyebrow"),
    engagementsViewTitle: document.querySelector("#adminEngagementsViewTitle"),
    engagementsViewIntro: document.querySelector("#adminEngagementsViewIntro"),
    engagementsAccessLevel: document.querySelector("#adminEngagementsAccessLevel"),
    engagementsClubScope: document.querySelector("#adminEngagementsClubScope"),
    engagementsRegionScope: document.querySelector("#adminEngagementsRegionScope"),
    engagementsTabButtons: document.querySelectorAll("[data-engagements-tab-button]"),
    engagementsTabPanels: document.querySelectorAll("[data-engagements-tab-panel]"),
    engagementsDetailTabButtons: document.querySelectorAll("[data-engagements-detail-tab-button]"),
    engagementsDetailTabPanels: document.querySelectorAll("[data-engagements-detail-tab-panel]"),
    engagementsStatus: document.querySelector("#adminEngagementsStatus"),
    engagementsRefresh: document.querySelector("#adminEngagementsRefreshButton"),
    engagementsCalendarPanel: document.querySelector("#adminEngagementsCalendarPanel"),
    engagementsCalendarCard: document.querySelector("#adminEngagementsCalendarCard"),
    engagementsCalendarFilters: document.querySelector("#adminEngagementsCalendarFilters"),
    engagementsSeasonFilter: document.querySelector("#adminEngagementsSeasonFilter"),
    engagementsRegionFilter: document.querySelector("#adminEngagementsRegionFilter"),
    engagementsLevelFilter: document.querySelector("#adminEngagementsLevelFilter"),
    engagementsStatusFilter: document.querySelector("#adminEngagementsStatusFilter"),
    engagementsMineFilterLabel: document.querySelector("#adminEngagementsMineFilterLabel"),
    engagementsMineFilter: document.querySelector("#adminEngagementsMineFilter"),
    engagementsFiltersReset: document.querySelector("#adminEngagementsFiltersReset"),
    engagementsCalendarList: document.querySelector("#adminEngagementsCalendarList"),
    engagementsCalendarEyebrow: document.querySelector("#adminEngagementsCalendarEyebrow"),
    engagementsCalendarTitle: document.querySelector("#adminEngagementsCalendarTitle"),
    engagementsClubPeoplePanel: document.querySelector("#adminEngagementsClubPeoplePanel"),
    engagementsClubPeopleAddButton: document.querySelector("#adminEngagementsClubPeopleAddButton"),
    engagementsClubPeopleRefresh: document.querySelector("#adminEngagementsClubPeopleRefresh"),
    engagementsClubPeopleStatus: document.querySelector("#adminEngagementsClubPeopleStatus"),
    engagementsClubPersonForm: document.querySelector("#adminEngagementsClubPersonForm"),
    engagementsClubPersonId: document.querySelector("#adminEngagementsClubPersonId"),
    engagementsClubPersonFirstName: document.querySelector("#adminEngagementsClubPersonFirstName"),
    engagementsClubPersonLastName: document.querySelector("#adminEngagementsClubPersonLastName"),
    engagementsClubPersonLicense: document.querySelector("#adminEngagementsClubPersonLicense"),
    engagementsClubPersonRoleTeamLeader: document.querySelector("#adminEngagementsClubPersonRoleTeamLeader"),
    engagementsClubPersonRoleOfficial: document.querySelector("#adminEngagementsClubPersonRoleOfficial"),
    engagementsClubPersonCancel: document.querySelector("#adminEngagementsClubPersonCancel"),
    engagementsClubPersonMessage: document.querySelector("#adminEngagementsClubPersonMessage"),
    engagementsClubPeopleList: document.querySelector("#adminEngagementsClubPeopleList"),
    engagementsClubSwimmersPanel: document.querySelector("#adminEngagementsClubSwimmersPanel"),
    engagementsClubSwimmersDirectoryRefresh: document.querySelector("#adminEngagementsClubSwimmersDirectoryRefresh"),
    engagementsClubSwimmersDirectorySummary: document.querySelector("#adminEngagementsClubSwimmersDirectorySummary"),
    engagementsClubSwimmersDirectorySearch: document.querySelector("#adminEngagementsClubSwimmersDirectorySearch"),
    engagementsClubSwimmersDirectoryStatus: document.querySelector("#adminEngagementsClubSwimmersDirectoryStatus"),
    engagementsClubSwimmersDirectoryList: document.querySelector("#adminEngagementsClubSwimmersDirectoryList"),
    engagementsDeletionRequestsNav: document.querySelector("#adminEngagementsDeletionRequestsNav"),
    engagementsDeletionRequestsBadge: document.querySelector("#adminEngagementsDeletionRequestsBadge"),
    engagementsAccessRequestsBadge: document.querySelector("#adminEngagementsAccessRequestsBadge"),
    engagementsAccessRequestsRefresh: document.querySelector("#adminEngagementsAccessRequestsRefresh"),
    engagementsAccessRequestsStatus: document.querySelector("#adminEngagementsAccessRequestsStatus"),
    engagementsAccessRequestsList: document.querySelector("#adminEngagementsAccessRequestsList"),
    engagementsAccessRequestEditForm: document.querySelector("#adminEngagementsAccessRequestEditForm"),
    engagementsAccessRequestEditId: document.querySelector("#adminEngagementsAccessRequestEditId"),
    engagementsAccessRequestEditFirstName: document.querySelector("#adminEngagementsAccessRequestEditFirstName"),
    engagementsAccessRequestEditLastName: document.querySelector("#adminEngagementsAccessRequestEditLastName"),
    engagementsAccessRequestEditEmail: document.querySelector("#adminEngagementsAccessRequestEditEmail"),
    engagementsAccessRequestEditLicenseNumber: document.querySelector("#adminEngagementsAccessRequestEditLicenseNumber"),
    engagementsAccessRequestEditRegionId: document.querySelector("#adminEngagementsAccessRequestEditRegionId"),
    engagementsAccessRequestEditClubSelect: document.querySelector("#adminEngagementsAccessRequestEditClubSelect"),
    engagementsAccessRequestEditClubName: document.querySelector("#adminEngagementsAccessRequestEditClubName"),
    engagementsAccessRequestEditClubId: document.querySelector("#adminEngagementsAccessRequestEditClubId"),
    engagementsAccessRequestEditCancel: document.querySelector("#adminEngagementsAccessRequestEditCancel"),
    engagementsAccessRequestEditMessage: document.querySelector("#adminEngagementsAccessRequestEditMessage"),
    engagementsDeletionRequestsPanel: document.querySelector("#adminEngagementsDeletionRequestsPanel"),
    engagementsDeletionRequestsRefresh: document.querySelector("#adminEngagementsDeletionRequestsRefresh"),
    engagementsDeletionRequestsStatus: document.querySelector("#adminEngagementsDeletionRequestsStatus"),
    engagementsDeletionRequestsList: document.querySelector("#adminEngagementsDeletionRequestsList"),
    engagementsNationalSwimmersRefresh: document.querySelector("#adminEngagementsNationalSwimmersRefresh"),
    engagementsNationalSwimmersStatus: document.querySelector("#adminEngagementsNationalSwimmersStatus"),
    engagementsNationalSwimmersList: document.querySelector("#adminEngagementsNationalSwimmersList"),
    engagementsDetail: document.querySelector("#adminEngagementsDetail"),
    engagementsDetailEyebrow: document.querySelector("#adminEngagementsDetailEyebrow"),
    engagementsDetailTitle: document.querySelector("#adminEngagementsDetailTitle"),
    engagementsDetailSubtitle: document.querySelector("#adminEngagementsDetailSubtitle"),
    engagementsEditState: document.querySelector("#adminEngagementsEditState"),
    engagementsDetailMeta: document.querySelector("#adminEngagementsDetailMeta"),
    engagementsDetailList: document.querySelector("#adminEngagementsDetailList"),
    engagementsDetailStatus: document.querySelector("#adminEngagementsDetailStatus"),
    engagementsDetailClose: document.querySelector("#adminEngagementsDetailClose"),
    engagementsEventsForm: document.querySelector("#adminEngagementsEventsForm"),
    engagementsEventsSummary: document.querySelector("#adminEngagementsEventsSummary"),
    engagementsEventsChoiceSection: document.querySelector("#adminEngagementsEventsChoiceSection"),
    engagementsEventsChoiceSummary: document.querySelector("#adminEngagementsEventsChoiceSummary"),
    engagementsProgramSection: document.querySelector("#adminEngagementsProgramSection"),
    engagementsSectionToggles: document.querySelectorAll("[data-engagements-section-toggle]"),
    engagementsIndividualEvents: document.querySelector("#adminEngagementsIndividualEvents"),
    engagementsRelayEvents: document.querySelector("#adminEngagementsRelayEvents"),
    engagementsProgramSummary: document.querySelector("#adminEngagementsProgramSummary"),
    engagementsProgramAddSession: document.querySelector("#adminEngagementsProgramAddSession"),
    engagementsProgramSessions: document.querySelector("#adminEngagementsProgramSessions"),
    engagementsEventsSaveButton: document.querySelector("#adminEngagementsEventsSaveButton"),
    engagementsEventsMessage: document.querySelector("#adminEngagementsEventsMessage"),
    engagementsFeesForm: document.querySelector("#adminEngagementsFeesForm"),
    engagementsFeesSummary: document.querySelector("#adminEngagementsFeesSummary"),
    engagementsSwimmerFee: document.querySelector("#adminEngagementsSwimmerFee"),
    engagementsSwimmerFeeRead: document.querySelector("#adminEngagementsSwimmerFeeRead"),
    engagementsIndividualEventFee: document.querySelector("#adminEngagementsIndividualEventFee"),
    engagementsIndividualEventFeeRead: document.querySelector("#adminEngagementsIndividualEventFeeRead"),
    engagementsRelayFee: document.querySelector("#adminEngagementsRelayFee"),
    engagementsRelayFeeRead: document.querySelector("#adminEngagementsRelayFeeRead"),
    engagementsHelloAssoUrl: document.querySelector("#adminEngagementsHelloAssoUrl"),
    engagementsHelloAssoUrlRead: document.querySelector("#adminEngagementsHelloAssoUrlRead"),
    engagementsFeesSaveButton: document.querySelector("#adminEngagementsFeesSaveButton"),
    engagementsFeesMessage: document.querySelector("#adminEngagementsFeesMessage"),
    engagementsClubTeamForm: document.querySelector("#adminEngagementsClubTeamForm"),
    engagementsClubTeamSummary: document.querySelector("#adminEngagementsClubTeamSummary"),
    engagementsClubTeamPersonFields: document.querySelector("#adminEngagementsClubTeamPersonFields"),
    engagementsClubTeamPersonSelect: document.querySelector("#adminEngagementsClubTeamPersonSelect"),
    engagementsClubTeamFirstName: document.querySelector("#adminEngagementsClubTeamFirstName"),
    engagementsClubTeamLastName: document.querySelector("#adminEngagementsClubTeamLastName"),
    engagementsClubTeamLicense: document.querySelector("#adminEngagementsClubTeamLicense"),
    engagementsClubTeamExternal: document.querySelector("#adminEngagementsClubTeamExternal"),
    engagementsClubTeamExternalClubIdLabel: document.querySelector("#adminEngagementsClubTeamExternalClubIdLabel"),
    engagementsClubTeamExternalClubNameLabel: document.querySelector("#adminEngagementsClubTeamExternalClubNameLabel"),
    engagementsClubTeamExternalClubId: document.querySelector("#adminEngagementsClubTeamExternalClubId"),
    engagementsClubTeamExternalClubName: document.querySelector("#adminEngagementsClubTeamExternalClubName"),
    engagementsClubTeamRenunciationLabel: document.querySelector("#adminEngagementsClubTeamRenunciationLabel"),
    engagementsClubTeamRenunciation: document.querySelector("#adminEngagementsClubTeamRenunciation"),
    engagementsClubTeamSaveButton: document.querySelector("#adminEngagementsClubTeamSaveButton"),
    engagementsClubTeamMessage: document.querySelector("#adminEngagementsClubTeamMessage"),
    engagementsClubOfficialsForm: document.querySelector("#adminEngagementsClubOfficialsForm"),
    engagementsClubOfficialsSummary: document.querySelector("#adminEngagementsClubOfficialsSummary"),
    engagementsClubOfficialsList: document.querySelector("#adminEngagementsClubOfficialsList"),
    engagementsClubOfficialsSaveButton: document.querySelector("#adminEngagementsClubOfficialsSaveButton"),
    engagementsClubOfficialsMessage: document.querySelector("#adminEngagementsClubOfficialsMessage"),
    engagementsClubSwimmersForm: document.querySelector("#adminEngagementsClubSwimmersForm"),
    engagementsClubSwimmersSummary: document.querySelector("#adminEngagementsClubSwimmersSummary"),
    engagementsClubSwimmersSearch: document.querySelector("#adminEngagementsClubSwimmersSearch"),
    engagementsClubSwimmersList: document.querySelector("#adminEngagementsClubSwimmersList"),
    engagementsClubSwimmersSaveButton: document.querySelector("#adminEngagementsClubSwimmersSaveButton"),
    engagementsClubSwimmersMessage: document.querySelector("#adminEngagementsClubSwimmersMessage"),
    engagementsClubEntriesForm: document.querySelector("#adminEngagementsClubEntriesForm"),
    engagementsClubEntriesSummary: document.querySelector("#adminEngagementsClubEntriesSummary"),
    engagementsClubEntriesList: document.querySelector("#adminEngagementsClubEntriesList"),
    engagementsClubEntriesSaveButton: document.querySelector("#adminEngagementsClubEntriesSaveButton"),
    engagementsClubEntriesMessage: document.querySelector("#adminEngagementsClubEntriesMessage"),
    engagementsClubRelaysForm: document.querySelector("#adminEngagementsClubRelaysForm"),
    engagementsClubRelaysSummary: document.querySelector("#adminEngagementsClubRelaysSummary"),
    engagementsClubRelaysList: document.querySelector("#adminEngagementsClubRelaysList"),
    engagementsClubRelaysAddButton: document.querySelector("#adminEngagementsClubRelaysAddButton"),
    engagementsClubRelaysSaveButton: document.querySelector("#adminEngagementsClubRelaysSaveButton"),
    engagementsClubRelaysMessage: document.querySelector("#adminEngagementsClubRelaysMessage"),
    engagementsClubSummaryStatus: document.querySelector("#adminEngagementsClubSummaryStatus"),
    engagementsClubSummaryList: document.querySelector("#adminEngagementsClubSummaryList"),
    engagementsClubSummaryRelays: document.querySelector("#adminEngagementsClubSummaryRelays"),
    engagementsClubSummaryPdfButton: document.querySelector("#adminEngagementsClubSummaryPdfButton"),
    engagementsClubNewSwimmerFirstName: document.querySelector("#adminEngagementsClubNewSwimmerFirstName"),
    engagementsClubNewSwimmerLastName: document.querySelector("#adminEngagementsClubNewSwimmerLastName"),
    engagementsClubNewSwimmerBirthDate: document.querySelector("#adminEngagementsClubNewSwimmerBirthDate"),
    engagementsClubNewSwimmerSex: document.querySelector("#adminEngagementsClubNewSwimmerSex"),
    engagementsClubNewSwimmerLicense: document.querySelector("#adminEngagementsClubNewSwimmerLicense"),
    engagementsClubNewSwimmerSaveButton: document.querySelector("#adminEngagementsClubNewSwimmerSaveButton"),
    engagementsClubNewSwimmerAlerts: document.querySelector("#adminEngagementsClubNewSwimmerAlerts"),
    engagementsDocumentsSummary: document.querySelector("#adminEngagementsDocumentsSummary"),
    engagementsComputerEmailLabel: document.querySelector("#adminEngagementsComputerEmailLabel"),
    engagementsDocumentsList: document.querySelector("#adminEngagementsDocumentsList"),
    engagementsClubRecapFiles: document.querySelector("#adminEngagementsClubRecapFiles"),
    engagementsGeneratedFiles: document.querySelector("#adminEngagementsGeneratedFiles"),
    engagementsEditButton: document.querySelector("#adminEngagementsEditButton"),
    engagementsSaveButton: document.querySelector("#adminEngagementsSaveButton"),
    engagementsEditCancelTop: document.querySelector("#adminEngagementsEditCancelTop"),
    engagementsDeleteButton: document.querySelector("#adminEngagementsDeleteButton"),
    engagementsEditForm: document.querySelector("#adminEngagementsEditForm"),
    engagementsEditCancel: document.querySelector("#adminEngagementsEditCancel"),
    engagementsEditName: document.querySelector("#adminEngagementsEditName"),
    engagementsEditDate: document.querySelector("#adminEngagementsEditDate"),
    engagementsEditEndDate: document.querySelector("#adminEngagementsEditEndDate"),
    engagementsEditLocation: document.querySelector("#adminEngagementsEditLocation"),
    engagementsEditLevel: document.querySelector("#adminEngagementsEditLevel"),
    engagementsEditRegionId: document.querySelector("#adminEngagementsEditRegionId"),
    engagementsEditRegionNote: document.querySelector("#adminEngagementsEditRegionNote"),
    engagementsEditDeadline: document.querySelector("#adminEngagementsEditDeadline"),
    engagementsEditComputerEmail: document.querySelector("#adminEngagementsEditComputerEmail"),
    engagementsEditPoolLength: document.querySelector("#adminEngagementsEditPoolLength"),
    engagementsEditTimingType: document.querySelector("#adminEngagementsEditTimingType"),
    engagementsEditQualificationMode: document.querySelector("#adminEngagementsEditQualificationMode"),
    engagementsEditQualificationStart: document.querySelector("#adminEngagementsEditQualificationStart"),
    engagementsEditQualificationEnd: document.querySelector("#adminEngagementsEditQualificationEnd"),
    engagementsEditMissingEntryTimeMode: document.querySelector("#adminEngagementsEditMissingEntryTimeMode"),
    engagementsEditMaxEvents: document.querySelector("#adminEngagementsEditMaxEvents"),
    engagementsEditEntryStatus: document.querySelector("#adminEngagementsEditEntryStatus"),
    engagementsEditOfficialsRequired: document.querySelector("#adminEngagementsEditOfficialsRequired"),
    engagementsCreateForm: document.querySelector("#adminEngagementsCreateForm"),
    engagementsName: document.querySelector("#adminEngagementsName"),
    engagementsDate: document.querySelector("#adminEngagementsDate"),
    engagementsEndDate: document.querySelector("#adminEngagementsEndDate"),
    engagementsLocation: document.querySelector("#adminEngagementsLocation"),
    engagementsLevel: document.querySelector("#adminEngagementsLevel"),
    engagementsRegionId: document.querySelector("#adminEngagementsRegionId"),
    engagementsRegionNote: document.querySelector("#adminEngagementsRegionNote"),
    engagementsDeadline: document.querySelector("#adminEngagementsDeadline"),
    engagementsComputerEmail: document.querySelector("#adminEngagementsComputerEmail"),
    engagementsPoolLength: document.querySelector("#adminEngagementsPoolLength"),
    engagementsTimingType: document.querySelector("#adminEngagementsTimingType"),
    engagementsQualificationMode: document.querySelector("#adminEngagementsQualificationMode"),
    engagementsQualificationStart: document.querySelector("#adminEngagementsQualificationStart"),
    engagementsQualificationEnd: document.querySelector("#adminEngagementsQualificationEnd"),
    engagementsMissingEntryTimeMode: document.querySelector("#adminEngagementsMissingEntryTimeMode"),
    engagementsMaxEvents: document.querySelector("#adminEngagementsMaxEvents"),
    engagementsEntryStatus: document.querySelector("#adminEngagementsEntryStatus"),
    engagementsOfficialsRequired: document.querySelector("#adminEngagementsOfficialsRequired"),
    engagementsCreateMessage: document.querySelector("#adminEngagementsCreateMessage")
  };

  let adminAuth = null;
  let accessUsers = [];
  let editingUid = "";
  let accessCurrentCursor = null;
  let accessNextCursor = null;
  let accessPreviousCursors = [];
  let accessPage = 1;
  let accessUsersLoading = false;
  let accessLoadSequence = 0;
  let accessDeletionRequests = [];
  let accessDeletionRequestsLoaded = false;
  let accessDeletionRequestsLoading = false;
  let currentUserLoading = false;
  let engagementCompetitions = [];
  let engagementCompetitionsLoaded = false;
  let engagementCompetitionsLoading = false;
  let engagementDeletionRequests = [];
  let engagementDeletionRequestsLoaded = false;
  let engagementDeletionRequestsLoading = false;
  let engagementAccessRequests = [];
  let engagementAccessRequestsLoaded = false;
  let engagementAccessRequestsLoading = false;
  let engagementNationalSwimmers = [];
  let engagementNationalSwimmersLoaded = false;
  let engagementNationalSwimmersLoading = false;
  let engagementClubPeople = [];
  let engagementClubPeopleLoaded = false;
  let engagementClubPeopleLoading = false;
  let engagementClubSwimmers = [];
  let engagementClubSwimmersLoaded = false;
  let engagementClubSwimmersLoading = false;
  let engagementClubSwimmersClubId = "";
  let engagementClubRecapEntries = [];
  let engagementClubRecapEntriesCompetitionId = "";
  let engagementClubRecapEntriesLoading = false;
  let engagementCalendarFiltersInitialized = false;
  let activeEngagementsTab = "calendar";
  let activeEngagementsNavEntry = "club";
  let activeEngagementsDetailTab = "general";
  let activeEngagementProgramSessionId = "";
  let engagementClubRelaysDraft = [];
  let dirtyEngagementDetailTabs = new Set();
  let engagementDetailEditing = false;
  let selectedEngagementCompetitionId = "";
  let selectedEngagementCompetition = null;
  let selectedEngagementClubEntry = null;
  let currentAccessProfile = null;
  let recordModuleLoadPromise = null;
  let importModuleLoadPromise = null;
  let accessClubReferenceLoadPromise = null;
  let accessClubReference = [];
  let activeAuthUid = "";

  function ensureFirebaseApp() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !config) return false;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return true;
  }

  function ensureAdminAuth() {
    if (adminAuth) return adminAuth;
    if (!ensureFirebaseApp() || !global.LivePalmesAdminAuth?.init) return null;
    adminAuth = global.LivePalmesAdminAuth.init({
      firebase: global.firebase,
      authConfig: global.LivePalmesAppConfig?.adminAuth || {}
    });
    adminAuth.onChange(updateView);
    return adminAuth;
  }

  function functionsService() {
    if (!ensureFirebaseApp() || !global.firebase?.functions) return null;
    try {
      const service = global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
    } catch {
      const service = global.firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
    }
  }

  async function callFunction(name, payload) {
    const functions = functionsService();
    if (!functions?.httpsCallable) throw new Error("Cloud Functions LivePalmes indisponibles.");
    const result = await functions.httpsCallable(name)(payload);
    return result.data || {};
  }

  function downloadBase64File(base64, fileName, contentType = "application/octet-stream") {
    const binary = atob(String(base64 || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "livepalmes.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setMessage(message, tone = "error") {
    if (!elements.message) return;
    elements.message.textContent = message || "";
    elements.message.dataset.tone = tone;
  }

  function setAccessMessage(message, tone = "error") {
    if (!elements.accessMessage) return;
    elements.accessMessage.textContent = message || "";
    elements.accessMessage.dataset.tone = tone;
  }

  function setAccessRequestMessage(message, tone = "error") {
    if (!elements.accessRequestMessage) return;
    elements.accessRequestMessage.textContent = message || "";
    elements.accessRequestMessage.dataset.tone = tone;
  }

  function setPublicAccessRequestMessage(message, tone = "error") {
    if (!elements.publicAccessRequestMessage) return;
    elements.publicAccessRequestMessage.textContent = message || "";
    elements.publicAccessRequestMessage.dataset.tone = tone;
  }

  function setAccountMessage(element, message, tone = "error") {
    if (!element) return;
    element.textContent = message || "";
    element.dataset.tone = tone;
  }

  function closeAccountMenu() {
    elements.accountToggle?.setAttribute("aria-expanded", "false");
    if (elements.accountActions) elements.accountActions.hidden = true;
  }

  function canManagePerformances() {
    return canUse("records.manage") || canUse("competitions.import");
  }

  function canManageEngagements() {
    return canUse("engagements.club.manage") ||
      canUse("engagements.region.manage") ||
      canUse("engagements.national.manage");
  }

  function canCreateEngagementCompetition() {
    return canUse("engagements.region.manage") || canUse("engagements.national.manage");
  }

  function canDeleteEngagementCompetitionDirectly() {
    return canUse("engagements.national.manage");
  }

  function canReviewEngagementAccessRequests() {
    return canUse("engagements.region.manage") || canUse("engagements.national.manage");
  }

  function canManageAccessDirectory() {
    return canUse("admin.full") || canUse("engagements.region.manage") || canUse("engagements.national.manage");
  }

  function canDeleteAccessUserDirectly() {
    return canUse("engagements.national.manage") || canUse("admin.full");
  }

  function engagementClubScope(user = currentAccessProfile || {}) {
    const clubScope = user.accessScopes?.["engagements.club.manage"] || {};
    return clubScope.scopeId || user.clubId || "";
  }

  function resetEngagementClubData() {
    engagementClubPeople = [];
    engagementClubPeopleLoaded = false;
    engagementClubSwimmers = [];
    engagementClubSwimmersLoaded = false;
    engagementClubSwimmersLoading = false;
    engagementClubSwimmersClubId = "";
    engagementClubRecapEntries = [];
    engagementClubRecapEntriesCompetitionId = "";
    selectedEngagementClubEntry = null;
    selectedEngagementClubEntryCompetitionId = "";
  }

  function engagementRegionScope(user = currentAccessProfile || {}) {
    const regionScope = user.accessScopes?.["engagements.region.manage"] || {};
    return regionScope.scopeId || user.regionId || "";
  }

  function canEditEngagementCompetition(competition = selectedEngagementCompetition || {}) {
    if (!competition?.id) return false;
    const capabilities = new Set(currentAccessProfile?.capabilities || []);
    if (capabilities.has("engagements.national.manage")) return true;
    return capabilities.has("engagements.region.manage") &&
      competition.level !== "national" &&
      competition.regionId === engagementRegionScope();
  }

  function setPerformanceMenuOpen(open) {
    const expanded = canManagePerformances();
    elements.performanceToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.performanceSubmenu) elements.performanceSubmenu.hidden = !expanded;
  }

  function setDtnMenuOpen(open) {
    const expanded = canUse("dtn.view");
    elements.dtnToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.dtnSubmenu) elements.dtnSubmenu.hidden = !expanded;
  }

  function setEngagementsAdminMenuOpen(open) {
    const expanded = canCreateEngagementCompetition();
    elements.engagementsAdminToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.engagementsAdminSubmenu) elements.engagementsAdminSubmenu.hidden = !expanded;
  }

  function isEngagementAdminMode() {
    return activeEngagementsNavEntry.startsWith("admin");
  }

  function updateEngagementsModeView() {
    const adminMode = isEngagementAdminMode();
    const peopleMode = activeEngagementsTab === "clubPeople";
    const swimmersMode = activeEngagementsTab === "clubSwimmers";
    if (elements.engagementsView) elements.engagementsView.dataset.engagementsMode = adminMode ? "admin" : "club";
    if (elements.engagementsViewEyebrow) elements.engagementsViewEyebrow.textContent = adminMode ? "Administration" : "Espace club";
    if (elements.engagementsViewTitle) {
      elements.engagementsViewTitle.textContent = adminMode
        ? "Administration des comp\u00e9titions"
        : peopleMode
          ? "Mes officiels"
          : swimmersMode
            ? "Mes nageurs"
            : "Espace club";
    }
    if (elements.engagementsViewIntro) {
      elements.engagementsViewIntro.textContent = adminMode
        ? "Calendrier admin, cr\u00e9ation, param\u00e9trage, documents et statistiques."
        : peopleMode
          ? "Base des chefs d'equipe et officiels reutilisables par le club."
          : swimmersMode
            ? "Liste des nageurs dont le dernier club connu est votre club."
            : "Calendrier, fiche comp\u00e9tition et engagements du club.";
    }
    if (elements.engagementsCalendarEyebrow) {
      elements.engagementsCalendarEyebrow.textContent = adminMode ? "Calendrier admin" : "Calendrier club";
    }
    if (elements.engagementsCalendarTitle) {
      elements.engagementsCalendarTitle.textContent = adminMode ? "Comp\u00e9titions \u00e0 administrer" : "Comp\u00e9titions ouvertes aux clubs";
    }
    if (elements.engagementsDetailEyebrow) {
      elements.engagementsDetailEyebrow.textContent = adminMode ? "Fiche admin comp\u00e9tition" : "Fiche comp\u00e9tition club";
    }
    const capabilities = new Set(currentAccessProfile?.capabilities || []);
    const showMineFilter = adminMode && capabilities.has("engagements.region.manage") && !capabilities.has("engagements.national.manage");
    if (elements.engagementsMineFilterLabel) elements.engagementsMineFilterLabel.hidden = !showMineFilter;
    if (!showMineFilter && elements.engagementsMineFilter) elements.engagementsMineFilter.checked = false;
    if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(activeEngagementsDetailTab) && !canOpenClubEngagementTab(activeEngagementsDetailTab)) {
      setEngagementsDetailTab("team");
    } else {
      setEngagementsDetailTab(activeEngagementsDetailTab);
    }
  }

  function updateEngagementDirtyTabIndicators() {
    elements.engagementsDetailTabButtons?.forEach((button) => {
      const dirty = dirtyEngagementDetailTabs.has(button.dataset.engagementsDetailTabButton);
      button.dataset.dirty = dirty ? "true" : "false";
    });
    updateEngagementDetailEditState();
  }

  function updateEngagementDetailEditState() {
    if (!elements.engagementsEditState) return;
    if (!selectedEngagementCompetition?.id) {
      elements.engagementsEditState.hidden = true;
      return;
    }
    const canEdit = isEngagementAdminMode() && canEditEngagementCompetition(selectedEngagementCompetition);
    const hasDirty = dirtyEngagementDetailTabs.size > 0;
    const deletionPending = isEngagementAdminMode() && selectedEngagementCompetition.deletionRequestStatus === "pending";
    elements.engagementsEditState.hidden = false;
    elements.engagementsEditState.dataset.state = deletionPending
      ? "deletion-pending"
      : hasDirty
        ? "dirty"
        : engagementDetailEditing
          ? "editing"
          : canEdit
            ? "readonly"
            : "consultation";
    elements.engagementsEditState.textContent = deletionPending
      ? "Suppression demandee"
      : hasDirty
        ? "Modifications non enregistrees"
        : engagementDetailEditing
          ? "Modification en cours"
          : canEdit
            ? "Lecture seule"
            : "Consultation";
  }

  function markEngagementDetailTabDirty(tab = activeEngagementsDetailTab) {
    if (!engagementDetailEditing || !isEngagementAdminMode() || !selectedEngagementCompetition?.id) return;
    dirtyEngagementDetailTabs.add(tab);
    updateEngagementDirtyTabIndicators();
  }

  function clearEngagementDetailTabDirty(tab) {
    if (tab) {
      dirtyEngagementDetailTabs.delete(tab);
    } else {
      dirtyEngagementDetailTabs = new Set();
    }
    updateEngagementDirtyTabIndicators();
  }

  function confirmLeaveDirtyEngagementTab(tab = activeEngagementsDetailTab) {
    if (!dirtyEngagementDetailTabs.has(tab)) return true;
    return global.confirm("Des modifications n'ont pas ete enregistrees sur cet onglet. Changer d'onglet sans enregistrer ?");
  }

  function isClubEngagementWorkflowTab(tab = "") {
    return ["team", "officials", "swimmers", "entries", "relays", "summary"].includes(tab);
  }

  function engagementClubTeamComplete(entry = selectedEngagementClubEntry || {}) {
    return entry.teamLeaderComplete === true;
  }

  function canOpenClubEngagementTab(tab = "") {
    return tab === "team" || engagementClubTeamComplete();
  }

  function requestEngagementDetailTab(tab) {
    if (tab === activeEngagementsDetailTab) return;
    if (!confirmLeaveDirtyEngagementTab()) return;
    if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(tab) && !canOpenClubEngagementTab(tab)) {
      setEngagementsDetailTab("team");
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = "Renseignez le chef d'equipe ou confirmez la renonciation avant de commencer les engagements.";
        elements.engagementsClubTeamMessage.dataset.tone = "error";
      }
      return;
    }
    setEngagementsDetailTab(tab);
  }

  function setEngagementsTab(tab) {
    const canCreate = canCreateEngagementCompetition();
    const canNationalRequests = canDeleteEngagementCompetitionDirectly();
    const canAccessRequests = canReviewEngagementAccessRequests();
    const canClubPeople = canUse("engagements.club.manage");
    const canClubSwimmers = canUse("engagements.club.manage");
    const allowedTabs = new Set(["calendar"]);
    if (canCreate) allowedTabs.add("create");
    if (canNationalRequests) allowedTabs.add("deletionRequests");
    if (canAccessRequests) allowedTabs.add("accessRequests");
    if (canClubPeople) allowedTabs.add("clubPeople");
    if (canClubSwimmers) allowedTabs.add("clubSwimmers");
    const nextTab = allowedTabs.has(tab) ? tab : "calendar";
    activeEngagementsTab = nextTab;
    if (nextTab === "create") {
      activeEngagementsNavEntry = "adminCreate";
    } else if (nextTab === "accessRequests") {
      activeEngagementsNavEntry = "adminAccessRequests";
    } else if (nextTab === "deletionRequests") {
      activeEngagementsNavEntry = "adminDeletionRequests";
    } else if (nextTab === "clubPeople") {
      activeEngagementsNavEntry = "clubPeople";
    } else if (nextTab === "clubSwimmers") {
      activeEngagementsNavEntry = "clubSwimmers";
    } else if (activeEngagementsNavEntry === "adminCreate" || activeEngagementsNavEntry === "adminAccessRequests" || activeEngagementsNavEntry === "adminDeletionRequests" || activeEngagementsNavEntry === "clubPeople" || activeEngagementsNavEntry === "clubSwimmers") {
      activeEngagementsNavEntry = canCreate ? "adminCalendar" : "club";
    }
    elements.engagementsTabButtons?.forEach((button) => {
      const buttonTab = button.dataset.engagementsTabButton;
      const createOnly = buttonTab === "create";
      const nationalOnly = buttonTab === "deletionRequests";
      const accessRequestsOnly = buttonTab === "accessRequests";
      const clubOnly = buttonTab === "clubPeople";
      const clubSwimmersOnly = buttonTab === "clubSwimmers";
      button.hidden = (createOnly && !canCreate) || (nationalOnly && !canNationalRequests) || (accessRequestsOnly && !canAccessRequests) || (clubOnly && !canClubPeople) || (clubSwimmersOnly && !canClubSwimmers);
      const selected = buttonTab === nextTab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    elements.engagementsTabPanels?.forEach((panel) => {
      const panelTab = panel.dataset.engagementsTabPanel;
      const createOnly = panelTab === "create";
      const nationalOnly = panelTab === "deletionRequests";
      const accessRequestsOnly = panelTab === "accessRequests";
      const clubOnly = panelTab === "clubPeople";
      const clubSwimmersOnly = panelTab === "clubSwimmers";
      panel.hidden = panelTab !== nextTab || (createOnly && !canCreate) || (nationalOnly && !canNationalRequests) || (accessRequestsOnly && !canAccessRequests) || (clubOnly && !canClubPeople) || (clubSwimmersOnly && !canClubSwimmers);
    });
  }

  function setEngagementsDetailTab(tab) {
    const allowedTabs = new Set(["general", "courses", "fees", "team", "officials", "swimmers", "entries", "relays", "summary", "documents"]);
    const adminOnlyTabs = new Set(["documents"]);
    const clubOnlyTabs = new Set(["team", "officials", "swimmers", "entries", "relays", "summary"]);
    const requestedTab = allowedTabs.has(tab) ? tab : "general";
    const nextTab = !isEngagementAdminMode() && adminOnlyTabs.has(requestedTab)
      ? "general"
      : isEngagementAdminMode() && clubOnlyTabs.has(requestedTab)
        ? "general"
        : requestedTab;
    activeEngagementsDetailTab = nextTab;
    elements.engagementsDetailTabButtons?.forEach((button) => {
      const buttonTab = button.dataset.engagementsDetailTabButton;
      const adminOnly = adminOnlyTabs.has(buttonTab);
      const clubOnly = clubOnlyTabs.has(buttonTab);
      const lockedClubStep = !isEngagementAdminMode() && isClubEngagementWorkflowTab(buttonTab) && !canOpenClubEngagementTab(buttonTab);
      button.hidden = (adminOnly && !isEngagementAdminMode()) || (clubOnly && isEngagementAdminMode());
      button.dataset.locked = lockedClubStep ? "true" : "false";
      button.setAttribute("aria-disabled", lockedClubStep ? "true" : "false");
      const selected = buttonTab === nextTab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    elements.engagementsDetailTabPanels?.forEach((panel) => {
      const panelTab = panel.dataset.engagementsDetailTabPanel;
      const adminOnly = adminOnlyTabs.has(panelTab);
      const clubOnly = clubOnlyTabs.has(panelTab);
      panel.hidden = panelTab !== nextTab || (adminOnly && !isEngagementAdminMode()) || (clubOnly && isEngagementAdminMode());
    });
    if (!isEngagementAdminMode() && (nextTab === "swimmers" || nextTab === "entries" || nextTab === "relays") && canUse("engagements.club.manage")) {
      loadEngagementClubSwimmers({ silent: engagementClubSwimmersLoaded });
      renderEngagementClubEntries();
      renderEngagementClubRelays();
    }
    if (isEngagementAdminMode() && nextTab === "documents") {
      loadEngagementClubRecapFiles();
    }
  }

  function firebaseAccountError(error) {
    const code = String(error?.code || "");
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Le mot de passe actuel est incorrect.";
    if (code.includes("email-already-in-use") || code.includes("already-exists")) return "Cette adresse email est déjà utilisée.";
    if (code.includes("invalid-email")) return "L’adresse email n’est pas valide.";
    if (code.includes("weak-password")) return "Le nouveau mot de passe n’est pas assez sécurisé.";
    if (code.includes("too-many-requests")) return "Trop de tentatives. Réessayez dans quelques minutes.";
    if (code.includes("requires-recent-login") || code.includes("failed-precondition")) return "Votre session doit être confirmée à nouveau. Vérifiez votre mot de passe actuel.";
    return error?.message || String(error);
  }

  async function reauthenticateCurrentUser(password) {
    const firebase = global.firebase;
    const user = firebase?.auth?.().currentUser;
    if (!user?.email || !firebase?.auth?.EmailAuthProvider?.credential || !user.reauthenticateWithCredential) {
      throw new Error("Compte Firebase indisponible.");
    }
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
    await user.getIdToken?.(true);
    return user;
  }

  function canUse(capability) {
    const auth = ensureAdminAuth();
    if (capability === "dtn.view" || capability.startsWith("engagements.")) {
      return Boolean(auth?.hasCapability?.(capability));
    }
    return Boolean(auth?.hasCapability?.("admin.full") || auth?.hasCapability?.(capability));
  }

  function updateCapabilityView() {
    document.querySelectorAll("[data-capability-nav]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityNav);
    });
    document.querySelectorAll("[data-engagements-nav], [data-engagements-panel]").forEach((item) => {
      item.hidden = !canManageEngagements();
    });
    document.querySelectorAll("[data-engagements-admin-nav]").forEach((item) => {
      item.hidden = !canCreateEngagementCompetition();
    });
    document.querySelectorAll("[data-engagements-club-nav]").forEach((item) => {
      item.hidden = !canUse("engagements.club.manage");
    });
    document.querySelectorAll("[data-engagements-national-nav]").forEach((item) => {
      item.hidden = !canDeleteEngagementCompetitionDirectly();
    });
    document.querySelectorAll("[data-engagements-admin-request-nav]").forEach((item) => {
      item.hidden = !canReviewEngagementAccessRequests();
    });
    document.querySelectorAll("[data-access-management-nav], [data-access-management-panel]").forEach((item) => {
      item.hidden = !canManageAccessDirectory();
    });
    if (elements.accessAdd) elements.accessAdd.hidden = !canUse("admin.full");
    if (elements.accessPanel && !canUse("admin.full")) elements.accessPanel.hidden = true;
    if (elements.accessDeletionRequestsPanel) elements.accessDeletionRequestsPanel.hidden = !canDeleteAccessUserDirectly();
    if (!canDeleteEngagementCompetitionDirectly()) updateEngagementDeletionRequestBadge(0);
    if (!canReviewEngagementAccessRequests()) updateEngagementAccessRequestBadge(0);
    setEngagementsTab(activeEngagementsTab);
    document.querySelectorAll(".admin-portal-nav-group").forEach((group) => {
      group.hidden = !Array.from(group.children).some((child) => {
        if (child.tagName === "A") return !child.hidden;
        return child.classList?.contains("admin-portal-nav-nested") && !child.hidden;
      });
    });
    document.querySelectorAll("[data-capability-panel]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityPanel);
    });
    if (elements.performanceMenu) elements.performanceMenu.hidden = !canManagePerformances();
    if (elements.dtnMenu) elements.dtnMenu.hidden = !canUse("dtn.view");
    setEngagementsAdminMenuOpen(true);
    setPerformanceMenuOpen(true);
    setDtnMenuOpen(true);
    updateNavigationView();
  }

  function requestedNavigationView() {
    if (global.location.hash === "#gestion-acces") return "access";
    if (global.location.hash === "#mon-compte") return "account";
    if (global.location.hash === "#demande-acces") return "accessRequest";
    if (global.location.hash === "#records-mpf") return "records";
    if (global.location.hash === "#import-competitions") return "import";
    if (global.location.hash === "#correction-performance") return "correction";
    if (global.location.hash === "#engagements") return "engagements";
    if (["#espace-dtn", "#espace-dtn-france", "#espace-dtn-edf"].includes(global.location.hash)) return "dtn";
    if (canUse("records.manage")) return "records";
    if (canUse("competitions.import")) return "import";
    if (canUse("dtn.view")) return "dtn";
    if (canManageEngagements()) return "engagements";
    if (canManageAccessDirectory()) return "access";
    return "account";
  }

  function updateNavigationView() {
    const requestedView = requestedNavigationView();
    const accessDenied = requestedView === "access" && !canManageAccessDirectory();
    const recordsDenied = requestedView === "records" && !canUse("records.manage");
    const importDenied = requestedView === "import" && !canUse("competitions.import");
    const correctionDenied = requestedView === "correction" && !canUse("competitions.import");
    const dtnDenied = requestedView === "dtn" && !canUse("dtn.view");
    const engagementsDenied = requestedView === "engagements" && !canManageEngagements();
    const activeView = accessDenied || recordsDenied || importDenied || correctionDenied || dtnDenied || engagementsDenied
      ? (canUse("records.manage") ? "records" : canUse("competitions.import") ? "import" : canUse("dtn.view") ? "dtn" : canManageEngagements() ? "engagements" : canManageAccessDirectory() ? "access" : "account")
      : requestedView;
    document.querySelectorAll("[data-admin-view]").forEach((section) => {
      section.hidden = section.dataset.adminView !== activeView;
    });
    document.querySelectorAll("[data-admin-view-link]").forEach((link) => {
      const dtnHash = link.dataset.dtnGridLink ? `#espace-dtn-${link.dataset.dtnGridLink}` : "";
      const legacyDtnFrance = link.dataset.dtnGridLink === "france" && global.location.hash === "#espace-dtn";
      const engagementsEntry = link.dataset.engagementsNavEntry || "";
      const engagementLinkMatches = activeView !== "engagements" || !engagementsEntry || engagementsEntry === activeEngagementsNavEntry;
      const isActive = link.dataset.adminViewLink === activeView &&
        engagementLinkMatches &&
        (!dtnHash || global.location.hash === dtnHash || legacyDtnFrance);
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    const activeLink = document.querySelector("[data-admin-view-link].active");
    if (elements.navCurrent) elements.navCurrent.textContent = activeLink?.textContent?.trim() || "Navigation";
    const recordsActive = activeView === "records";
    const importActive = activeView === "import";
    const correctionActive = activeView === "correction";
    const engagementsActive = activeView === "engagements";
    const importModuleActive = importActive || correctionActive;
    const performanceModuleActive = recordsActive || importModuleActive;
    if (engagementsActive) updateEngagementsModeView();
    if (engagementsActive && activeEngagementsNavEntry.startsWith("admin")) {
      setEngagementsAdminMenuOpen(true);
    } else if (engagementsActive) {
      setEngagementsAdminMenuOpen(false);
    }
    if (elements.performanceStyles) elements.performanceStyles.disabled = !performanceModuleActive;
    if (elements.importStyles) elements.importStyles.disabled = !importModuleActive;
    document.body.classList.toggle("performance-admin-page", performanceModuleActive);
    if (recordsActive) loadRecordModule();
    if (importModuleActive) loadImportModule();
    if (engagementsActive && activeEngagementsTab === "calendar") loadEngagementCompetitions();
    if (engagementsActive && activeEngagementsTab === "accessRequests") loadEngagementAccessRequests();
    if (engagementsActive && activeEngagementsTab === "deletionRequests") {
      loadEngagementDeletionRequests();
      loadEngagementNationalSwimmers();
    }
    if (engagementsActive && activeEngagementsTab === "clubPeople") loadEngagementClubPeople();
    if (engagementsActive && activeEngagementsTab === "clubSwimmers") loadEngagementClubSwimmers();
    if (activeView === "access") {
      loadAccessUsers();
      if (canDeleteAccessUserDirectly()) loadAccessDeletionRequests();
    }
  }

  function loadScriptOnce(src, id) {
    const existing = document.querySelector(`#${id}`);
    if (existing?.dataset.loaded === "true") return Promise.resolve();
    if (existing?.livePalmesLoadPromise) return existing.livePalmesLoadPromise;
    const script = existing || document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    script.livePalmesLoadPromise = new Promise((resolve, reject) => {
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Chargement impossible : ${src}`)), { once: true });
    });
    if (!existing) document.body.appendChild(script);
    return script.livePalmesLoadPromise;
  }

  function watchRecordWorkbench() {
    if (!elements.recordWorkbench || !elements.recordModuleStatus) return;
    const updateStatus = () => {
      if (!elements.recordWorkbench.hidden) {
        elements.recordModuleStatus.hidden = true;
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(updateStatus);
    observer.observe(elements.recordWorkbench, { attributes: true, attributeFilter: ["hidden"] });
    updateStatus();
  }

  function loadRecordModule() {
    if (recordModuleLoadPromise) return recordModuleLoadPromise;
    if (elements.recordModuleStatus) {
      elements.recordModuleStatus.hidden = false;
      elements.recordModuleStatus.textContent = "Chargement du module Records / MPF…";
      elements.recordModuleStatus.dataset.tone = "loading";
    }
    recordModuleLoadPromise = (async () => {
      if (!global.firebase?.firestore) {
        await loadScriptOnce(
          "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js",
          "adminRecordFirestoreScript"
        );
      }
      const scripts = [
        ["performances/public/data/records-data.js?v=records-firestore-20260629060432", "adminRecordDataScript"],
        ["performances/public/record-placeholders.js?v=20260613-mpf-relays-mixed-1", "adminRecordPlaceholdersScript"],
        ["performances/public/data/admin-reference.js?v=20260601-performance-admin-page-1", "adminRecordReferenceScript"],
        ["performances/public/store.js?v=20260613-birth-year-restore-1", "adminRecordStoreScript"],
        ["performances/public/admin-records.js?v=20260721-default-filters-1", "adminRecordModuleScript"]
      ];
      for (const [src, id] of scripts) await loadScriptOnce(src, id);
      watchRecordWorkbench();
    })().catch((error) => {
      recordModuleLoadPromise = null;
      if (elements.recordModuleStatus) {
        elements.recordModuleStatus.hidden = false;
        elements.recordModuleStatus.textContent = `Module Records / MPF indisponible : ${error?.message || error}`;
        elements.recordModuleStatus.dataset.tone = "error";
      }
      return null;
    });
    return recordModuleLoadPromise;
  }

  function watchImportWorkbench() {
    const pairs = [
      [elements.importWorkbench, elements.importModuleStatus],
      [elements.correctionWorkbench, elements.correctionModuleStatus]
    ];
    pairs.forEach(([workbench, status]) => {
      if (!workbench || !status) return;
      const updateStatus = () => {
        if (!workbench.hidden) {
          status.hidden = true;
          observer.disconnect();
        }
      };
      const observer = new MutationObserver(updateStatus);
      observer.observe(workbench, { attributes: true, attributeFilter: ["hidden"] });
      updateStatus();
    });
  }

  function loadImportModule() {
    if (importModuleLoadPromise) return importModuleLoadPromise;
    if (elements.importModuleStatus) {
      elements.importModuleStatus.hidden = false;
      elements.importModuleStatus.textContent = "Chargement du module d’import…";
      elements.importModuleStatus.dataset.tone = "loading";
    }
    if (elements.correctionModuleStatus) {
      elements.correctionModuleStatus.hidden = false;
      elements.correctionModuleStatus.textContent = "Chargement du module de correction…";
      elements.correctionModuleStatus.dataset.tone = "loading";
    }
    importModuleLoadPromise = (async () => {
      const scripts = [
        ["performances/public/data/intranap-summary.js?v=consolidated-20260603140205", "adminImportSummaryScript"],
        ["performances/public/data/performance-public/version.js", "adminImportVersionScript"],
        ["performances/public/vendor/xlsx.full.min.js?v=20260603-international-xlsx-1", "adminImportXlsxScript"],
        ["performances/public/import-competitions.js?v=20260727-portal-name-1", "adminImportModuleScript"]
      ];
      for (const [src, id] of scripts) await loadScriptOnce(src, id);
      watchImportWorkbench();
    })().catch((error) => {
      importModuleLoadPromise = null;
      if (elements.importModuleStatus) {
        elements.importModuleStatus.hidden = false;
        elements.importModuleStatus.textContent = `Module d’import indisponible : ${error?.message || error}`;
        elements.importModuleStatus.dataset.tone = "error";
      }
      if (elements.correctionModuleStatus) {
        elements.correctionModuleStatus.hidden = false;
        elements.correctionModuleStatus.textContent = `Module de correction indisponible : ${error?.message || error}`;
        elements.correctionModuleStatus.dataset.tone = "error";
      }
      return null;
    });
    return importModuleLoadPromise;
  }

  function capabilityLabel(capability) {
    return {
      "admin.full": "Gestion generale",
      "records.manage": "Records / MPF",
      "consoles.access": "Accès aux consoles",
      "consoles.manage": "Consoles compétition",
      "competitions.import": "Import des compétitions",
      "dtn.view": "Espace DTN",
      "engagements.club.manage": "Engagements club",
      "engagements.region.manage": "Engagements région",
      "engagements.national.manage": "Engagements national"
    }[capability] || capability;
  }

  function normalizedRegionKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toLocaleLowerCase("fr");
  }

  function canonicalLivePalmesRegion(value) {
    const key = normalizedRegionKey(value);
    if (!key) return "";
    return LIVEPALMES_REGION_DEFINITIONS.find((region) => normalizedRegionKey(region) === key) || String(value || "").trim();
  }

  function regionDisplayLabel(value) {
    return canonicalLivePalmesRegion(value) || "-";
  }

  function setRegionSelectValue(select, value) {
    if (!select) return;
    const nextValue = canonicalLivePalmesRegion(value);
    if (nextValue && !Array.from(select.options).some((option) => option.value === nextValue)) {
      select.append(new Option(`${nextValue} (ancienne valeur)`, nextValue));
    }
    select.value = nextValue;
  }

  function fillLivePalmesRegionSelect(select, placeholder = "A choisir") {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = "";
    select.append(new Option(placeholder, ""));
    LIVEPALMES_REGION_DEFINITIONS.forEach((region) => {
      select.append(new Option(region, region));
    });
    setRegionSelectValue(select, currentValue);
  }

  function populateLivePalmesRegionSelects() {
    fillLivePalmesRegionSelect(elements.accessRegionId, "A choisir");
    fillLivePalmesRegionSelect(elements.engagementsRegionId, "A choisir");
    fillLivePalmesRegionSelect(elements.engagementsEditRegionId, "A choisir");
    fillLivePalmesRegionSelect(elements.engagementsRegionFilter, "Toutes les regions");
  }

  function accessReferenceRegionLabel(regionId) {
    const value = String(regionId || "").trim();
    if (!value) return "";
    return LIVEPALMES_REFERENCE_REGION_LABELS[value] || `Autre / code ${value}`;
  }

  function normalizeAccessClubReference(row = []) {
    const clubId = String(row[0] || "").trim();
    const clubCode = String(row[1] || "").trim();
    const clubName = String(row[2] || "").trim();
    const referenceRegionId = String(row[3] || "").trim();
    return {
      clubId,
      clubCode,
      clubName,
      referenceRegionId,
      regionId: accessReferenceRegionLabel(referenceRegionId)
    };
  }

  function accessClubLabel(club) {
    if (!club) return "";
    const name = club.clubName || "Club sans nom";
    const code = club.clubCode ? `${club.clubCode} - ` : "";
    return `${code}${name} (${club.clubId})`;
  }

  function populateAccessRegionChoices() {
    const selects = [elements.accessRegionId, elements.accessRequestRegionId, elements.publicAccessRequestRegionId, elements.engagementsAccessRequestEditRegionId].filter(Boolean);
    if (!selects.length) return;
    const knownRegions = new Set(LIVEPALMES_REGION_DEFINITIONS.map(normalizedRegionKey));
    const extraRegions = Array.from(new Set(accessClubReference.map((club) => club.regionId)))
      .filter((region) => region && !knownRegions.has(normalizedRegionKey(region)))
      .sort((a, b) => a.localeCompare(b, "fr"));
    selects.forEach((select) => {
      const currentValue = select.value;
      fillLivePalmesRegionSelect(select, "A choisir");
      extraRegions.forEach((region) => select.append(new Option(region, region)));
      setRegionSelectValue(select, currentValue);
    });
  }

  function syncAccessClubFieldsFromSelect() {
    const selectedClubId = elements.accessClubSelect?.value || "";
    const club = accessClubReference.find((item) => item.clubId === selectedClubId);
    if (elements.accessClubId) elements.accessClubId.value = club?.clubId || "";
    if (elements.accessClubName) elements.accessClubName.value = club?.clubName || "";
  }

  function populateAccessClubSelect(selectedClubId = "", fallbackClubName = "") {
    const select = elements.accessClubSelect;
    if (!select) return;
    const selectedId = String(selectedClubId || "").trim();
    const knownClub = selectedId
      ? accessClubReference.find((club) => club.clubId === selectedId)
      : null;
    if (knownClub && !elements.accessRegionId?.value) {
      setRegionSelectValue(elements.accessRegionId, knownClub.regionId);
    }
    const regionId = canonicalLivePalmesRegion(elements.accessRegionId?.value || "");
    select.innerHTML = "";
    if (!regionId) {
      select.append(new Option("Choisissez d'abord une region", ""));
      select.disabled = true;
      syncAccessClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("A choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(`${label} (${selectedId})`, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouve pour cette region";
    }
    select.value = selectedId;
    if (selectedId && !knownClub) {
      if (elements.accessClubId) elements.accessClubId.value = selectedId;
      if (elements.accessClubName) elements.accessClubName.value = fallbackClubName || "";
      return;
    }
    syncAccessClubFieldsFromSelect();
  }

  function syncAccessRequestClubFieldsFromSelect() {
    const selectedClubId = elements.accessRequestClubSelect?.value || "";
    const club = accessClubReference.find((item) => item.clubId === selectedClubId);
    if (elements.accessRequestClubId) elements.accessRequestClubId.value = club?.clubId || "";
    if (elements.accessRequestClubName) elements.accessRequestClubName.value = club?.clubName || "";
  }

  function populateAccessRequestClubSelect(selectedClubId = "", fallbackClubName = "") {
    const select = elements.accessRequestClubSelect;
    if (!select) return;
    const selectedId = String(selectedClubId || "").trim();
    const knownClub = selectedId
      ? accessClubReference.find((club) => club.clubId === selectedId)
      : null;
    if (knownClub && !elements.accessRequestRegionId?.value) {
      setRegionSelectValue(elements.accessRequestRegionId, knownClub.regionId);
    }
    const regionId = canonicalLivePalmesRegion(elements.accessRequestRegionId?.value || "");
    select.innerHTML = "";
    if (!regionId) {
      select.append(new Option("Choisissez d'abord une region", ""));
      select.disabled = true;
      syncAccessRequestClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("A choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(`${label} (${selectedId})`, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouve pour cette region";
    }
    select.value = selectedId;
    if (selectedId && !knownClub) {
      if (elements.accessRequestClubId) elements.accessRequestClubId.value = selectedId;
      if (elements.accessRequestClubName) elements.accessRequestClubName.value = fallbackClubName || "";
      return;
    }
    syncAccessRequestClubFieldsFromSelect();
  }

  function syncPublicAccessRequestClubFieldsFromSelect() {
    const selectedClubId = elements.publicAccessRequestClubSelect?.value || "";
    const club = accessClubReference.find((item) => item.clubId === selectedClubId);
    if (elements.publicAccessRequestClubId) elements.publicAccessRequestClubId.value = club?.clubId || "";
    if (elements.publicAccessRequestClubName) elements.publicAccessRequestClubName.value = club?.clubName || "";
  }

  function populatePublicAccessRequestClubSelect(selectedClubId = "", fallbackClubName = "") {
    const select = elements.publicAccessRequestClubSelect;
    if (!select) return;
    const selectedId = String(selectedClubId || "").trim();
    const knownClub = selectedId
      ? accessClubReference.find((club) => club.clubId === selectedId)
      : null;
    if (knownClub && !elements.publicAccessRequestRegionId?.value) {
      setRegionSelectValue(elements.publicAccessRequestRegionId, knownClub.regionId);
    }
    const regionId = canonicalLivePalmesRegion(elements.publicAccessRequestRegionId?.value || "");
    select.innerHTML = "";
    if (!regionId) {
      select.append(new Option("Choisissez d'abord une region", ""));
      select.disabled = true;
      syncPublicAccessRequestClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("A choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(`${label} (${selectedId})`, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouve pour cette region";
    }
    select.value = selectedId;
    if (selectedId && !knownClub) {
      if (elements.publicAccessRequestClubId) elements.publicAccessRequestClubId.value = selectedId;
      if (elements.publicAccessRequestClubName) elements.publicAccessRequestClubName.value = fallbackClubName || "";
      return;
    }
    syncPublicAccessRequestClubFieldsFromSelect();
  }

  function syncEngagementAccessRequestEditClubFieldsFromSelect() {
    const selectedClubId = elements.engagementsAccessRequestEditClubSelect?.value || "";
    const club = accessClubReference.find((item) => item.clubId === selectedClubId);
    if (elements.engagementsAccessRequestEditClubId) elements.engagementsAccessRequestEditClubId.value = club?.clubId || "";
    if (elements.engagementsAccessRequestEditClubName) elements.engagementsAccessRequestEditClubName.value = club?.clubName || "";
  }

  function populateEngagementAccessRequestEditClubSelect(selectedClubId = "", fallbackClubName = "") {
    const select = elements.engagementsAccessRequestEditClubSelect;
    if (!select) return;
    const selectedId = String(selectedClubId || "").trim();
    const knownClub = selectedId
      ? accessClubReference.find((club) => club.clubId === selectedId)
      : null;
    if (knownClub && !elements.engagementsAccessRequestEditRegionId?.value) {
      setRegionSelectValue(elements.engagementsAccessRequestEditRegionId, knownClub.regionId);
    }
    const regionId = canonicalLivePalmesRegion(elements.engagementsAccessRequestEditRegionId?.value || "");
    select.innerHTML = "";
    if (!regionId) {
      select.append(new Option("Choisissez d'abord une region", ""));
      select.disabled = true;
      syncEngagementAccessRequestEditClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("A choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(`${label} (${selectedId})`, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouve pour cette region";
    }
    select.value = selectedId;
    if (selectedId && !knownClub) {
      if (elements.engagementsAccessRequestEditClubId) elements.engagementsAccessRequestEditClubId.value = selectedId;
      if (elements.engagementsAccessRequestEditClubName) elements.engagementsAccessRequestEditClubName.value = fallbackClubName || "";
      return;
    }
    syncEngagementAccessRequestEditClubFieldsFromSelect();
  }

  function loadAccessClubReference() {
    if (accessClubReference.length) return Promise.resolve(accessClubReference);
    if (accessClubReferenceLoadPromise) return accessClubReferenceLoadPromise;
    accessClubReferenceLoadPromise = loadScriptOnce(
      "performances/public/data/admin-reference.js?v=20260601-performance-admin-page-1",
      "adminAccessReferenceScript"
    ).then(() => {
      accessClubReference = (global.LIVEPALMES_ADMIN_REFERENCE?.clubs || [])
        .map(normalizeAccessClubReference)
        .filter((club) => club.clubId && club.clubName);
      populateAccessRegionChoices();
      populateAccessClubSelect(elements.accessClubId?.value || "");
      populateAccessRequestClubSelect(elements.accessRequestClubId?.value || "");
      populatePublicAccessRequestClubSelect(elements.publicAccessRequestClubId?.value || "");
      populateEngagementAccessRequestEditClubSelect(elements.engagementsAccessRequestEditClubId?.value || "");
      return accessClubReference;
    }).catch((error) => {
      accessClubReferenceLoadPromise = null;
      setAccessMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
      setAccessRequestMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
      setPublicAccessRequestMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
      return [];
    });
    return accessClubReferenceLoadPromise;
  }

  function currentEngagementSeasonStartYear(date = new Date()) {
    const year = date.getFullYear();
    return date.getMonth() >= 8 ? year : year - 1;
  }

  function engagementSeasonBounds(startYear) {
    const season = Math.trunc(Number(startYear) || currentEngagementSeasonStartYear());
    return {
      startYear: season,
      startDate: `${season}-09-01`,
      endDate: `${season + 1}-08-31`
    };
  }

  function engagementSeasonLabel(startYear) {
    const season = Math.trunc(Number(startYear) || currentEngagementSeasonStartYear());
    return `${season}-${season + 1}`;
  }

  function populateEngagementSeasonFilter() {
    const select = elements.engagementsSeasonFilter;
    if (!select) return;
    const currentSeason = currentEngagementSeasonStartYear();
    const currentValue = select.value || String(currentSeason);
    select.innerHTML = "";
    [currentSeason + 1, currentSeason, currentSeason - 1, currentSeason - 2, currentSeason - 3].forEach((season) => {
      select.append(new Option(engagementSeasonLabel(season), String(season)));
    });
    select.value = Array.from(select.options).some((option) => option.value === currentValue)
      ? currentValue
      : String(currentSeason);
  }

  function initializeEngagementCalendarFilters(user = currentAccessProfile || {}) {
    if (engagementCalendarFiltersInitialized) return;
    const capabilities = new Set(user.capabilities || []);
    const regionId = engagementRegionScope(user);
    if (elements.engagementsSeasonFilter) {
      elements.engagementsSeasonFilter.value = String(currentEngagementSeasonStartYear());
    }
    if (elements.engagementsRegionFilter && capabilities.has("engagements.region.manage") && !capabilities.has("engagements.national.manage") && regionId) {
      setRegionSelectValue(elements.engagementsRegionFilter, regionId);
    }
    engagementCalendarFiltersInitialized = true;
  }

  function resetEngagementCalendarFilters() {
    if (elements.engagementsSeasonFilter) {
      elements.engagementsSeasonFilter.value = String(currentEngagementSeasonStartYear());
    }
    setRegionSelectValue(elements.engagementsRegionFilter, "");
    if (elements.engagementsLevelFilter) elements.engagementsLevelFilter.value = "";
    if (elements.engagementsStatusFilter) elements.engagementsStatusFilter.value = "";
    if (elements.engagementsMineFilter) elements.engagementsMineFilter.checked = false;
  }

  function engagementCalendarFiltersPayload() {
    const season = engagementSeasonBounds(elements.engagementsSeasonFilter?.value);
    return {
      ...season,
      regionId: canonicalLivePalmesRegion(elements.engagementsRegionFilter?.value),
      level: elements.engagementsLevelFilter?.value || "",
      entryStatus: elements.engagementsStatusFilter?.value || "",
      mineOnly: elements.engagementsMineFilter?.checked === true
    };
  }

  function filteredEngagementCompetitions() {
    const filters = engagementCalendarFiltersPayload();
    return engagementCompetitions
      .filter((competition) => !competition.date || (competition.date >= filters.startDate && competition.date <= filters.endDate))
      .filter((competition) => !filters.regionId || canonicalLivePalmesRegion(competition.regionId) === filters.regionId)
      .filter((competition) => !filters.level || competition.level === filters.level)
      .filter((competition) => !filters.entryStatus || competition.entryStatus === filters.entryStatus)
      .filter((competition) => !filters.mineOnly || canEditEngagementCompetition(competition));
  }

  function renderCurrentUser(user = {}) {
    const previousClubId = engagementClubScope(currentAccessProfile || {});
    const nextClubId = engagementClubScope(user || {});
    if (previousClubId && nextClubId && previousClubId !== nextClubId) {
      resetEngagementClubData();
    }
    currentAccessProfile = user;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Profil LivePalmes";
    if (elements.sessionLabel) elements.sessionLabel.textContent = name;
    if (elements.accountEmail && document.activeElement !== elements.accountEmail) {
      elements.accountEmail.value = user.email || ensureAdminAuth()?.status?.().email || "";
    }
    if (elements.accessRequestEmail && !elements.accessRequestEmail.value && document.activeElement !== elements.accessRequestEmail) {
      elements.accessRequestEmail.value = user.email || ensureAdminAuth()?.status?.().email || "";
    }
    renderEngagementsProfile(user);
    initializeEngagementCalendarFilters(user);
    updateEngagementCreateFormAccess(user);
    if (canReviewEngagementAccessRequests()) {
      loadEngagementAccessRequests({ force: true, silent: true });
    }
    if (canDeleteEngagementCompetitionDirectly()) {
      loadEngagementDeletionRequests({ force: true, silent: true });
    }
  }

  function renderEngagementsProfile(user = {}) {
    const capabilities = new Set(user.capabilities || []);
    const scopeFor = (capability) => user.accessScopes?.[capability] || {};
    const clubScope = scopeFor("engagements.club.manage");
    const regionScope = scopeFor("engagements.region.manage");
    const level = capabilities.has("engagements.national.manage")
      ? "National"
      : capabilities.has("engagements.region.manage")
        ? "Region"
        : capabilities.has("engagements.club.manage")
          ? "Club"
          : "-";
    const clubValue = engagementClubScope(user) || "-";
    const regionValue = regionDisplayLabel(regionScope.scopeId || user.regionId);
    if (elements.engagementsAccessLevel) elements.engagementsAccessLevel.textContent = level;
    if (elements.engagementsClubScope) elements.engagementsClubScope.textContent = clubValue;
    if (elements.engagementsRegionScope) elements.engagementsRegionScope.textContent = regionValue;
    if (elements.accountCapabilities) {
      const capabilityValues = Array.from(capabilities).sort();
      elements.accountCapabilities.innerHTML = capabilityValues.length
        ? capabilityValues.map((capability) => `<span>${escapeHtml(capabilityLabel(capability))}</span>`).join("")
        : "-";
    }
    if (elements.engagementsStatus) {
      elements.engagementsStatus.textContent = capabilities.has("engagements.club.manage") ||
        capabilities.has("engagements.region.manage") ||
        capabilities.has("engagements.national.manage")
        ? "Socle engagements actif."
        : "Aucun droit engagements actif.";
      elements.engagementsStatus.dataset.tone = "loading";
    }
  }

  function updateEngagementRegionField({ field, note, levelInput, user = currentAccessProfile || {}, submitButton = null }) {
    const capabilities = new Set(user.capabilities || []);
    const isNational = capabilities.has("engagements.national.manage");
    const isRegional = capabilities.has("engagements.region.manage");
    const regionId = engagementRegionScope(user);
    const level = levelInput?.value || "regional";
    const nationalCompetition = level === "national";
    if (field) {
      if (nationalCompetition) setRegionSelectValue(field, "");
      if (!isNational && isRegional && !nationalCompetition) setRegionSelectValue(field, regionId);
      field.disabled = nationalCompetition || !isNational;
      field.required = !nationalCompetition;
    }
    if (note) {
      if (nationalCompetition) {
        note.textContent = "Non requis pour une competition nationale.";
      } else if (isNational) {
        note.textContent = "Region obligatoire pour une competition departementale ou regionale.";
      } else if (isRegional && regionId) {
        note.textContent = `Region imposee par votre droit regional : ${regionDisplayLabel(regionId)}.`;
      } else if (isRegional) {
        note.textContent = "Region manquante sur votre acces. Mettez a jour le compte avant de creer une competition.";
      } else {
        note.textContent = "Droit regional ou national requis pour creer une competition.";
      }
    }
    if (submitButton) submitButton.disabled = Boolean(!nationalCompetition && isRegional && !isNational && !regionId);
  }

  function updateEngagementCreateFormAccess(user = currentAccessProfile || {}) {
    const capabilities = new Set(user.capabilities || []);
    const isNational = capabilities.has("engagements.national.manage");
    updateEngagementRegionField({
      field: elements.engagementsRegionId,
      note: elements.engagementsRegionNote,
      levelInput: elements.engagementsLevel,
      user,
      submitButton: elements.engagementsCreateForm?.querySelector("button[type='submit']")
    });
    const nationalOption = elements.engagementsLevel?.querySelector("option[value='national']");
    if (nationalOption) nationalOption.disabled = !isNational;
    if (!isNational && elements.engagementsLevel?.value === "national") {
      elements.engagementsLevel.value = "regional";
      updateEngagementRegionField({
        field: elements.engagementsRegionId,
        note: elements.engagementsRegionNote,
        levelInput: elements.engagementsLevel,
        user,
        submitButton: elements.engagementsCreateForm?.querySelector("button[type='submit']")
      });
    }
  }

  function updateEngagementEditFormAccess(user = currentAccessProfile || {}) {
    const capabilities = new Set(user.capabilities || []);
    const isNational = capabilities.has("engagements.national.manage");
    updateEngagementRegionField({
      field: elements.engagementsEditRegionId,
      note: elements.engagementsEditRegionNote,
      levelInput: elements.engagementsEditLevel,
      user,
      submitButton: elements.engagementsEditForm?.querySelector("button[type='submit']")
    });
    const nationalOption = elements.engagementsEditLevel?.querySelector("option[value='national']");
    if (nationalOption) nationalOption.disabled = !isNational;
    if (!isNational && elements.engagementsEditLevel?.value === "national") {
      elements.engagementsEditLevel.value = "regional";
      updateEngagementRegionField({
        field: elements.engagementsEditRegionId,
        note: elements.engagementsEditRegionNote,
        levelInput: elements.engagementsEditLevel,
        user,
        submitButton: elements.engagementsEditForm?.querySelector("button[type='submit']")
      });
    }
  }

  function updateEngagementQualificationFields(prefix = "create") {
    const mode = prefix === "edit" ? elements.engagementsEditQualificationMode : elements.engagementsQualificationMode;
    const start = prefix === "edit" ? elements.engagementsEditQualificationStart : elements.engagementsQualificationStart;
    const end = prefix === "edit" ? elements.engagementsEditQualificationEnd : elements.engagementsQualificationEnd;
    const periodMode = mode?.value === "period";
    [start, end].forEach((field) => {
      if (!field) return;
      field.disabled = !periodMode;
      field.required = periodMode;
      if (!periodMode) field.value = "";
    });
  }

  function fillEngagementEditForm(competition = selectedEngagementCompetition || {}) {
    if (!competition?.id) return;
    if (elements.engagementsEditName) elements.engagementsEditName.value = competition.name || "";
    if (elements.engagementsEditDate) elements.engagementsEditDate.value = competition.date || "";
    if (elements.engagementsEditEndDate) {
      elements.engagementsEditEndDate.value = competition.endDate || competition.date || "";
      elements.engagementsEditEndDate.dataset.autoFromStart = elements.engagementsEditEndDate.value === (competition.date || "") ? "true" : "false";
    }
    if (elements.engagementsEditLocation) elements.engagementsEditLocation.value = competition.location || "";
    if (elements.engagementsEditLevel) elements.engagementsEditLevel.value = competition.level || "regional";
    setRegionSelectValue(elements.engagementsEditRegionId, competition.regionId || "");
    if (elements.engagementsEditDeadline) elements.engagementsEditDeadline.value = isoToDatetimeLocal(competition.entryDeadlineAt);
    if (elements.engagementsEditComputerEmail) elements.engagementsEditComputerEmail.value = competition.computerEmail || "";
    if (elements.engagementsEditPoolLength) elements.engagementsEditPoolLength.value = competition.poolLength || "50";
    if (elements.engagementsEditTimingType) elements.engagementsEditTimingType.value = competition.timingType || "electronic";
    if (elements.engagementsEditQualificationMode) elements.engagementsEditQualificationMode.value = competition.qualificationTimesMode || "all";
    if (elements.engagementsEditQualificationStart) elements.engagementsEditQualificationStart.value = competition.qualificationStartDate || "";
    if (elements.engagementsEditQualificationEnd) elements.engagementsEditQualificationEnd.value = competition.qualificationEndDate || "";
    if (elements.engagementsEditMissingEntryTimeMode) elements.engagementsEditMissingEntryTimeMode.value = competition.missingEntryTimeMode || "manual";
    if (elements.engagementsEditMaxEvents) elements.engagementsEditMaxEvents.value = competition.maxEventsPerSwimmer || "";
    if (elements.engagementsEditEntryStatus) elements.engagementsEditEntryStatus.value = competition.entryStatus || "upcoming";
    if (elements.engagementsEditOfficialsRequired) elements.engagementsEditOfficialsRequired.checked = competition.officialsRequired === true;
    updateEngagementEditFormAccess();
    updateEngagementQualificationFields("edit");
  }

  function setEngagementEditMode(editing) {
    if (!isEngagementAdminMode() || !selectedEngagementCompetition?.id || !canEditEngagementCompetition()) return;
    engagementDetailEditing = Boolean(editing);
    if (editing) {
      fillEngagementEditForm();
    }
    if (elements.engagementsEditForm) elements.engagementsEditForm.hidden = !editing;
    if (elements.engagementsDetailList) elements.engagementsDetailList.hidden = editing;
    if (elements.engagementsEditButton) elements.engagementsEditButton.hidden = editing;
    if (elements.engagementsSaveButton) elements.engagementsSaveButton.hidden = !editing;
    if (elements.engagementsEditCancelTop) elements.engagementsEditCancelTop.hidden = !editing;
    if (elements.engagementsDeleteButton) elements.engagementsDeleteButton.hidden = editing;
    updateEngagementDetailEditState();
    renderEngagementEvents(selectedEngagementCompetition || {});
    renderEngagementFees(selectedEngagementCompetition || {});
  }

  function formatShortDate(value) {
    if (!value) return "-";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function formatDeadline(value) {
    if (!value) return "Limite non definie";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `Limite ${date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  }

  function isoToDatetimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function syncEngagementEndDate(startField, endField) {
    if (!startField || !endField) return;
    const shouldSync = !endField.value || endField.dataset.autoFromStart !== "false";
    if (shouldSync) {
      endField.value = startField.value || "";
      endField.dataset.autoFromStart = "true";
    }
    if (endField.value && startField.value && endField.value < startField.value) {
      endField.value = startField.value;
      endField.dataset.autoFromStart = "true";
    }
  }

  function markEngagementEndDateManual(startField, endField) {
    if (!startField || !endField) return;
    endField.dataset.autoFromStart = !endField.value || endField.value === startField.value ? "true" : "false";
  }

  function engagementLevelLabel(level) {
    return {
      departemental: "Departemental",
      regional: "Regional",
      national: "National"
    }[level] || "Regional";
  }

  function engagementStatusLabel(status) {
    return {
      upcoming: "A venir",
      open: "Ouverts",
      closed: "Fermes"
    }[status] || "A venir";
  }

  function engagementDeadlineTone(competition = {}) {
    const status = competition.entryStatus || "upcoming";
    if (status !== "open" || !competition.entryDeadlineAt) return status;
    const deadline = new Date(competition.entryDeadlineAt);
    if (Number.isNaN(deadline.getTime())) return status;
    const remainingMs = deadline.getTime() - Date.now();
    if (remainingMs < 0) return "deadline-passed";
    if (remainingMs <= 72 * 60 * 60 * 1000) return "closing-soon";
    return status;
  }

  function engagementOperationalStatusLabel(competition = {}) {
    const tone = engagementDeadlineTone(competition);
    if (tone === "deadline-passed") return "Limite depassee";
    if (tone === "closing-soon") return "Fermeture proche";
    return engagementStatusLabel(competition.entryStatus);
  }

  function engagementPoolLengthLabel(value) {
    return ["25", "33", "50"].includes(String(value || "")) ? `${value} m` : "-";
  }

  function engagementTimingTypeLabel(value) {
    return value === "manual" ? "Manuel" : "Electronique";
  }

  function engagementQualificationPeriodLabel(competition = {}) {
    if (competition.qualificationTimesMode !== "period") return "Tous les temps connus";
    const start = formatShortDate(competition.qualificationStartDate);
    const end = formatShortDate(competition.qualificationEndDate);
    return `Du ${start} au ${end}`;
  }

  function engagementMissingEntryTimeModeLabel(value) {
    return {
      manual: "Saisie manuelle autorisee",
      forbidden: "Course impossible",
      default595999: "Temps 59:59.99"
    }[value] || "Saisie manuelle autorisee";
  }

  function engagementMaxEventsLabel(value) {
    const count = Math.trunc(Number(value) || 0);
    return count > 0 ? `${count} epreuve${count > 1 ? "s" : ""}` : "Non limite";
  }

  function engagementFeeAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  function formatEngagementFee(value) {
    const amount = engagementFeeAmount(value);
    return amount
      ? `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
      : "0,00 EUR";
  }

  function engagementFeesSummary(fees = {}) {
    const parts = [
      `nageur ${formatEngagementFee(fees.swimmerFee)}`,
      `course ${formatEngagementFee(fees.individualEventFee)}`,
      `relais ${formatEngagementFee(fees.relayFee)}`
    ];
    const payment = fees.helloAssoUrl ? "HelloAsso publie" : "HelloAsso en attente";
    return `${parts.join(" - ")} - ${payment}`;
  }

  function engagementHelloAssoLabel(fees = {}) {
    return fees.helloAssoUrl ? "Lien publie dans l'onglet Frais" : "En attente de publication du lien";
  }

  function engagementCompetitionProgramOverview(competition = {}) {
    const events = Array.isArray(competition.events) ? competition.events : [];
    const sessions = normalizedEngagementProgramSessions(
      competition.programSessions || [],
      events.map((event) => ({ code: event.code, label: event.shortLabel || event.code }))
    );
    return engagementProgramStatusSummary(events, sessions);
  }

  function selectedEngagementFeesFromForm() {
    return {
      swimmerFee: engagementFeeAmount(elements.engagementsSwimmerFee?.value),
      individualEventFee: engagementFeeAmount(elements.engagementsIndividualEventFee?.value),
      relayFee: engagementFeeAmount(elements.engagementsRelayFee?.value),
      helloAssoUrl: String(elements.engagementsHelloAssoUrl?.value || "").trim(),
      latePaymentSurcharge: 50
    };
  }

  function renderEngagementFees(competition = selectedEngagementCompetition || {}) {
    const fees = competition.fees || {};
    const adminMode = isEngagementAdminMode();
    const canEdit = adminMode && engagementDetailEditing && canEditEngagementCompetition(competition);
    if (elements.engagementsFeesForm) elements.engagementsFeesForm.dataset.readonly = canEdit ? "false" : "true";
    if (elements.engagementsSwimmerFee) elements.engagementsSwimmerFee.value = fees.swimmerFee || "";
    if (elements.engagementsIndividualEventFee) elements.engagementsIndividualEventFee.value = fees.individualEventFee || "";
    if (elements.engagementsRelayFee) elements.engagementsRelayFee.value = fees.relayFee || "";
    if (elements.engagementsHelloAssoUrl) elements.engagementsHelloAssoUrl.value = fees.helloAssoUrl || "";
    if (elements.engagementsSwimmerFeeRead) elements.engagementsSwimmerFeeRead.textContent = formatEngagementFee(fees.swimmerFee);
    if (elements.engagementsIndividualEventFeeRead) elements.engagementsIndividualEventFeeRead.textContent = formatEngagementFee(fees.individualEventFee);
    if (elements.engagementsRelayFeeRead) elements.engagementsRelayFeeRead.textContent = formatEngagementFee(fees.relayFee);
    if (elements.engagementsHelloAssoUrlRead) elements.engagementsHelloAssoUrlRead.textContent = fees.helloAssoUrl || "Lien en attente";
    [elements.engagementsSwimmerFee, elements.engagementsIndividualEventFee, elements.engagementsRelayFee, elements.engagementsHelloAssoUrl].forEach((field) => {
      if (field) field.disabled = !canEdit;
    });
    if (elements.engagementsFeesSummary) elements.engagementsFeesSummary.textContent = engagementFeesSummary(fees);
    renderEngagementClubSummary();
    if (elements.engagementsFeesSaveButton) {
      elements.engagementsFeesSaveButton.hidden = true;
      elements.engagementsFeesSaveButton.disabled = true;
    }
    if (elements.engagementsFeesMessage) {
      elements.engagementsFeesMessage.textContent = !adminMode
        ? ""
        : canEditEngagementCompetition(competition) ? "" : "Frais consultables uniquement avec un droit de gestion sur cette competition.";
      elements.engagementsFeesMessage.dataset.tone = canEdit ? "ok" : "loading";
    }
  }

  function selectedEngagementTeamLeaderFromForm() {
    const mode = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "person";
    if (mode === "renounced") {
      return {
        mode,
        renunciationAccepted: elements.engagementsClubTeamRenunciation?.checked === true
      };
    }
    const externalClub = elements.engagementsClubTeamExternal?.checked === true;
    return {
      mode: "person",
      firstName: String(elements.engagementsClubTeamFirstName?.value || "").trim(),
      lastName: String(elements.engagementsClubTeamLastName?.value || "").trim(),
      licenseNumber: String(elements.engagementsClubTeamLicense?.value || "").trim(),
      externalClub,
      clubId: externalClub ? String(elements.engagementsClubTeamExternalClubId?.value || "").trim() : (currentAccessProfile?.clubId || ""),
      clubName: externalClub ? String(elements.engagementsClubTeamExternalClubName?.value || "").trim() : (currentAccessProfile?.clubName || "")
    };
  }

  function engagementClubTeamLeaderPeople() {
    return engagementClubPeople
      .filter((person) => person.active && person.roles?.teamLeader)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
  }

  function renderEngagementClubTeamPersonOptions(selectedPersonId = "") {
    if (!elements.engagementsClubTeamPersonSelect) return;
    const options = engagementClubTeamLeaderPeople();
    elements.engagementsClubTeamPersonSelect.innerHTML = [
      '<option value="">Saisie manuelle</option>',
      ...options.map((person) => `
        <option value="${escapeHtml(person.id)}">${escapeHtml([person.firstName, person.lastName].filter(Boolean).join(" "))} - licence ${escapeHtml(person.licenseNumber || "-")}</option>
      `)
    ].join("");
    elements.engagementsClubTeamPersonSelect.value = options.some((person) => person.id === selectedPersonId) ? selectedPersonId : "";
  }

  function findEngagementClubTeamPersonFromFields(teamLeader = {}) {
    return engagementClubTeamLeaderPeople().find((person) =>
      person.licenseNumber &&
      person.licenseNumber === teamLeader.licenseNumber &&
      person.firstName === teamLeader.firstName &&
      person.lastName === teamLeader.lastName
    ) || null;
  }

  function applyEngagementClubTeamPerson(personId = "") {
    const person = engagementClubPeople.find((item) => item.id === personId);
    if (!person) return;
    if (elements.engagementsClubTeamFirstName) elements.engagementsClubTeamFirstName.value = person.firstName || "";
    if (elements.engagementsClubTeamLastName) elements.engagementsClubTeamLastName.value = person.lastName || "";
    if (elements.engagementsClubTeamLicense) elements.engagementsClubTeamLicense.value = person.licenseNumber || "";
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = false;
    if (elements.engagementsClubTeamExternalClubId) elements.engagementsClubTeamExternalClubId.value = "";
    if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.value = "";
    updateEngagementClubTeamFormMode();
  }

  function engagementClubOfficialPeople() {
    return engagementClubPeople
      .filter((person) => person.active && person.roles?.official)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
  }

  function selectedEngagementClubOfficialIds() {
    return Array.from(elements.engagementsClubOfficialsList?.querySelectorAll("[data-engagement-club-official-id]:checked") || [])
      .map((input) => input.dataset.engagementClubOfficialId)
      .filter(Boolean);
  }

  function updateEngagementClubOfficialsSummary() {
    if (!elements.engagementsClubOfficialsSummary) return;
    const selectedCount = selectedEngagementClubOfficialIds().length;
    elements.engagementsClubOfficialsSummary.textContent = selectedCount
      ? `${selectedCount} officiel${selectedCount > 1 ? "s" : ""} selectionne${selectedCount > 1 ? "s" : ""}.`
      : "Aucun officiel selectionne.";
    renderEngagementClubSummary();
  }

  function renderEngagementClubOfficials() {
    const mount = elements.engagementsClubOfficialsList;
    if (!mount) return;
    const locked = !engagementClubTeamComplete();
    if (elements.engagementsClubOfficialsForm) elements.engagementsClubOfficialsForm.dataset.locked = locked ? "true" : "false";
    if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.disabled = locked;
    const selectedIds = new Set((selectedEngagementClubEntry?.officials || []).map((official) => official.personId).filter(Boolean));
    const officials = engagementClubOfficialPeople();
    if (locked) {
      mount.innerHTML = '<p class="admin-engagements-empty">Renseignez le chef d\'equipe ou confirmez la renonciation pour activer cette etape.</p>';
      updateEngagementClubOfficialsSummary();
      return;
    }
    if (!officials.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun officiel actif dans Mes officiels.</p>';
      updateEngagementClubOfficialsSummary();
      return;
    }
    mount.innerHTML = officials.map((person) => `
      <label class="admin-engagements-club-official-row">
        <input type="checkbox" data-engagement-club-official-id="${escapeHtml(person.id)}" ${selectedIds.has(person.id) ? "checked" : ""}>
        <span>
          <strong>${escapeHtml([person.firstName, person.lastName].filter(Boolean).join(" ") || "Officiel sans nom")}</strong>
          <small>Licence ${escapeHtml(person.licenseNumber || "-")}</small>
        </span>
      </label>
    `).join("");
    updateEngagementClubOfficialsSummary();
  }

  function normalizedEngagementClubSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function selectedEngagementClubSwimmerRows() {
    return Array.from(elements.engagementsClubSwimmersList?.querySelectorAll("[data-engagement-club-swimmer-row]") || [])
      .map((row) => {
        const checkbox = row.querySelector("[data-engagement-club-swimmer-id]");
        if (!checkbox?.checked) return null;
        const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
        const entriesBySwimmer = selectedEngagementClubEntryRowsBySwimmerId();
        const savedSwimmer = (selectedEngagementClubEntry?.swimmers || []).find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
        const individualEntries = entriesBySwimmer.get(swimmerIndexId) || savedSwimmer.individualEntries || [];
        return {
          swimmerIndexId,
          source: checkbox.dataset.engagementClubSwimmerSource || "performances",
          licenseNumber: String(row.querySelector("[data-engagement-club-swimmer-license]")?.value || "").trim(),
          individualEventCodes: individualEntries.map((entry) => entry.eventCode),
          individualEntries
        };
      })
      .filter((row) => row?.swimmerIndexId);
  }

  function selectedEngagementClubEntryRowsBySwimmerId() {
    const bySwimmerId = new Map();
    Array.from(elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || []).forEach((row) => {
      const swimmerIndexId = row.dataset.engagementClubEntrySwimmerId || "";
      if (!swimmerIndexId) return;
      const individualEntries = Array.from(row.querySelectorAll("[data-engagement-club-swimmer-event]:checked"))
        .map((input) => {
          const eventCode = String(input.dataset.engagementClubSwimmerEvent || "").trim();
          const manualEntryTime = String(Array.from(row.querySelectorAll("[data-engagement-club-swimmer-event-time]"))
            .find((timeInput) => timeInput.dataset.engagementClubSwimmerEventTime === eventCode)?.value || "").trim();
          return eventCode ? { eventCode, manualEntryTime } : null;
        })
        .filter(Boolean);
      bySwimmerId.set(swimmerIndexId, individualEntries);
    });
    return bySwimmerId;
  }

  function engagementClubIndividualEvents() {
    return (selectedEngagementCompetition?.events || [])
      .filter((event) => event?.type === "individual" && ENGAGEMENT_EVENT_BY_CODE.has(event.code));
  }

  function engagementClubSelectedIndividualEventCodes(swimmer = {}) {
    const entries = Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : [];
    const directCodes = Array.isArray(swimmer.individualEventCodes) ? swimmer.individualEventCodes : [];
    return new Set([
      ...entries.map((entry) => entry?.eventCode),
      ...directCodes
    ].map((code) => String(code || "").trim()).filter(Boolean));
  }

  function engagementEntryTimeStatusLabel(entry = {}) {
    const warning = entry.entryTimeWarning ? ` - Alerte : ${entry.entryTimeWarning}` : "";
    if (entry.entryTimeMode === "known") {
      return `Temps connu ${entry.entryTime || "-"}${entry.date ? ` - ${formatShortDate(entry.date)}` : ""}${entry.location ? ` - ${entry.location}` : ""}${warning}`;
    }
    if (entry.entryTimeMode === "manual") return `Temps manuel ${entry.entryTime || "-"}${warning}`;
    if (entry.entryTimeMode === "default595999") return `Aucun temps connu - 59:59.99${warning}`;
    if (entry.entryTimeMode === "missing") return `Aucun temps connu${warning}`;
    return "";
  }

  function renderEngagementClubSwimmerEvents(selected = null, disabled = false) {
    const events = engagementClubIndividualEvents();
    if (!events.length) {
      return '<p class="admin-engagements-club-swimmer-events-empty">Aucune course individuelle ouverte sur cette competition.</p>';
    }
    const selectedCodes = engagementClubSelectedIndividualEventCodes(selected || {});
    const entryByCode = new Map((selected?.individualEntries || []).map((entry) => [entry.eventCode, entry]).filter(([code]) => code));
    const maxEvents = Number(selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
    const missingMode = selectedEngagementCompetition?.missingEntryTimeMode || "manual";
    return `
      <div class="admin-engagements-club-swimmer-events-head">
        <span>Courses individuelles</span>
        <small>${maxEvents > 0 ? `${maxEvents} max` : "Sans limite"}</small>
      </div>
      <div class="admin-engagements-club-swimmer-events-grid">
        ${events.map((event) => {
          const definition = ENGAGEMENT_EVENT_BY_CODE.get(event.code) || event;
          const entry = entryByCode.get(event.code) || {};
          const checked = selectedCodes.has(event.code);
          const manualAllowed = missingMode === "manual";
          const timeStatus = engagementEntryTimeStatusLabel(entry);
          return `
            <div class="admin-engagements-club-swimmer-event-choice" data-event-selected="${checked ? "true" : "false"}">
              <label title="${escapeHtml(definition.label || event.label || event.code)}">
                <input type="checkbox" data-engagement-club-swimmer-event="${escapeHtml(event.code)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
                <span>${escapeHtml(definition.shortLabel || event.shortLabel || event.code)}</span>
              </label>
              <input type="text" maxlength="8" inputmode="numeric" placeholder="Temps manuel" data-engagement-club-swimmer-event-time="${escapeHtml(event.code)}" value="${escapeHtml(entry.manualEntryTime || (entry.entryTimeMode === "manual" ? entry.entryTime : ""))}" ${checked && manualAllowed ? "" : "hidden disabled"}>
              <small>${escapeHtml(timeStatus || (manualAllowed ? "Saisie si aucun temps connu" : missingMode === "default595999" ? "59:59.99 si aucun temps connu" : "Temps connu obligatoire"))}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function updateEngagementClubSwimmersSummary() {
    if (!elements.engagementsClubSwimmersSummary) return;
    const selectedRows = selectedEngagementClubSwimmerRows();
    const selectedCount = selectedRows.length;
    elements.engagementsClubSwimmersSummary.textContent = selectedCount
      ? `${selectedCount} nageur${selectedCount > 1 ? "s" : ""} selectionne${selectedCount > 1 ? "s" : ""}.`
      : "Aucun nageur selectionne.";
    renderEngagementClubSummary();
  }

  function updateEngagementClubEntriesSummary() {
    if (!elements.engagementsClubEntriesSummary) return;
    const selectedRows = selectedEngagementClubSwimmerRows();
    const eventCount = selectedRows.reduce((sum, swimmer) => sum + (swimmer.individualEntries?.length || 0), 0);
    elements.engagementsClubEntriesSummary.textContent = eventCount
      ? `${eventCount} course${eventCount > 1 ? "s" : ""} selectionnee${eventCount > 1 ? "s" : ""}.`
      : "Aucune course selectionnee.";
    renderEngagementClubSummary();
  }

  function engagementClubSwimmerSearchText(swimmer = {}) {
    return normalizedEngagementClubSearch([
      swimmer.name,
      swimmer.firstName,
      swimmer.lastName,
      swimmer.birthDate,
      swimmer.sex,
      swimmer.swimmerId,
      swimmer.licenseNumber,
      swimmer.category,
      swimmer.club,
      swimmer.clubName
    ].filter(Boolean).join(" "));
  }

  function engagementCategoryLabel(category) {
    const code = String(category || "").trim();
    const match = ENGAGEMENT_CATEGORY_DEFINITIONS.find(([itemCode]) => itemCode === code);
    return match ? match[1] : code;
  }

  function engagementSeasonEndYear(date = new Date()) {
    const month = date.getMonth();
    const year = date.getFullYear();
    return month >= 8 ? year + 1 : year;
  }

  function engagementSwimmerCategory(swimmer = {}) {
    if (swimmer.category) return String(swimmer.category);
    const birthYear = Number(String(swimmer.birthDate || "").slice(0, 4));
    if (!Number.isFinite(birthYear) || birthYear < 1900) return "";
    const age = engagementSeasonEndYear() - birthYear;
    if (!Number.isFinite(age) || age < 0 || age > 120) return "";
    if (age <= 9) return "P";
    if (age <= 11) return "B";
    if (age <= 13) return "M";
    if (age <= 15) return "C";
    if (age <= 17) return "J";
    if (age <= 29) return "S";
    if (age <= 39) return "M30+";
    if (age <= 49) return "M40+";
    if (age <= 59) return "M50+";
    if (age <= 69) return "M60+";
    if (age <= 79) return "M70+";
    return "M80+";
  }

  function renderEngagementClubSwimmersDirectory() {
    const mount = elements.engagementsClubSwimmersDirectoryList;
    if (!mount) return;
    const clubLabel = [
      currentAccessProfile?.clubId ? `club ${currentAccessProfile.clubId}` : "",
      currentAccessProfile?.clubName || ""
    ].filter(Boolean).join(" - ") || "votre club";
    if (engagementClubSwimmersLoading) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = `Lecture de la base nageurs pour ${clubLabel}...`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
      }
      return;
    }
    if (!engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Cliquez sur Actualiser pour charger les nageurs du club.</p>';
      if (elements.engagementsClubSwimmersDirectorySummary) {
        elements.engagementsClubSwimmersDirectorySummary.textContent = `Effectif LivePalmes de ${clubLabel}.`;
      }
      return;
    }
    const query = normalizedEngagementClubSearch(elements.engagementsClubSwimmersDirectorySearch?.value || "");
    const swimmers = engagementClubSwimmers
      .filter((swimmer) => !query || engagementClubSwimmerSearchText(swimmer).includes(query))
      .slice(0, 800);
    const hiddenCount = Math.max(0, engagementClubSwimmers.length - swimmers.length);
    if (elements.engagementsClubSwimmersDirectorySummary) {
      elements.engagementsClubSwimmersDirectorySummary.textContent = `${engagementClubSwimmers.length} nageur${engagementClubSwimmers.length > 1 ? "s" : ""} dans l'effectif ${clubLabel}.`;
    }
    if (elements.engagementsClubSwimmersDirectoryStatus) {
      elements.engagementsClubSwimmersDirectoryStatus.textContent = engagementClubSwimmers.length
        ? `${swimmers.length} nageur${swimmers.length > 1 ? "s" : ""} affiche${swimmers.length > 1 ? "s" : ""}.`
        : `Aucun nageur trouve pour ${clubLabel} dans l'effectif LivePalmes.`;
      elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = engagementClubSwimmers.length ? "ok" : "error";
    }
    if (!swimmers.length) {
      mount.innerHTML = engagementClubSwimmers.length
        ? '<p class="admin-engagements-empty">Aucun nageur ne correspond a cette recherche.</p>'
        : "<p class=\"admin-engagements-empty\">Aucun nageur trouve dans l'effectif du club.</p>";
      return;
    }
    mount.innerHTML = `
      <div class="admin-engagements-club-swimmers-directory-table" role="table" aria-label="Mes nageurs">
        <div class="admin-engagements-club-swimmers-directory-row admin-engagements-club-swimmers-directory-head" role="row">
          <span role="columnheader">Nageur</span>
          <span role="columnheader">Naissance</span>
          <span role="columnheader">Sexe</span>
          <span role="columnheader">Cat.</span>
          <span role="columnheader">Licence</span>
        </div>
        ${swimmers.map((swimmer) => {
      const name = swimmer.name || [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || "Nageur sans nom";
      const category = engagementSwimmerCategory(swimmer);
      return `
        <div class="admin-engagements-club-swimmers-directory-row" role="row">
          <span role="cell">
            <strong>${escapeHtml(name)}</strong>
          </span>
          <span role="cell">${escapeHtml(swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "-")}</span>
          <span role="cell">${escapeHtml(swimmer.sex || "-")}</span>
          <span role="cell" title="${escapeHtml(engagementCategoryLabel(category) || "-")}">${escapeHtml(category || "-")}</span>
          <span role="cell">${escapeHtml(swimmer.licenseNumber || "-")}</span>
        </div>
      `;
    }).join("")}
      </div>
      ${hiddenCount ? `<p class="admin-engagements-empty">${hiddenCount} nageur${hiddenCount > 1 ? "s" : ""} masque${hiddenCount > 1 ? "s" : ""} par la recherche ou la limite d'affichage.</p>` : ""}
    `;
  }

  function renderEngagementClubSwimmers() {
    const mount = elements.engagementsClubSwimmersList;
    if (!mount) return;
    const locked = !engagementClubTeamComplete();
    if (elements.engagementsClubSwimmersForm) elements.engagementsClubSwimmersForm.dataset.locked = locked ? "true" : "false";
    if (elements.engagementsClubSwimmersSaveButton) elements.engagementsClubSwimmersSaveButton.disabled = locked || engagementClubSwimmersLoading;
    const selectedById = new Map((selectedEngagementClubEntry?.swimmers || [])
      .map((swimmer) => [swimmer.swimmerIndexId, swimmer])
      .filter(([id]) => id));
    selectedEngagementClubSwimmerRows().forEach((swimmer) => {
      selectedById.set(swimmer.swimmerIndexId, {
        ...(selectedById.get(swimmer.swimmerIndexId) || {}),
        swimmerIndexId: swimmer.swimmerIndexId,
        source: swimmer.source || "performances",
        licenseNumber: swimmer.licenseNumber,
        individualEntries: swimmer.individualEntries || (swimmer.individualEventCodes || []).map((eventCode) => ({ eventCode }))
      });
    });
    if (locked) {
      mount.innerHTML = '<p class="admin-engagements-empty">Renseignez le chef d\'equipe ou confirmez la renonciation pour activer cette etape.</p>';
      updateEngagementClubSwimmersSummary();
      return;
    }
    if (engagementClubSwimmersLoading) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
      updateEngagementClubSwimmersSummary();
      return;
    }
    if (!engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Ouvrez l\'onglet Nageurs pour charger la base du club.</p>';
      updateEngagementClubSwimmersSummary();
      return;
    }
    const query = normalizedEngagementClubSearch(elements.engagementsClubSwimmersSearch?.value || "");
    const selectedIds = new Set(selectedById.keys());
    const swimmers = engagementClubSwimmers
      .filter((swimmer) => !query || selectedIds.has(swimmer.id) || engagementClubSwimmerSearchText(swimmer).includes(query))
      .sort((left, right) => Number(selectedIds.has(right.id)) - Number(selectedIds.has(left.id)))
      .slice(0, 250);
    if (!swimmers.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun nageur trouve pour ce club.</p>';
      updateEngagementClubSwimmersSummary();
      return;
    }
    mount.innerHTML = `
      <div class="admin-engagements-club-swimmers-table" role="table" aria-label="Nageurs du club">
        <div class="admin-engagements-club-swimmers-head" role="row">
          <span role="columnheader">Nageur</span>
          <span role="columnheader">Naissance</span>
          <span role="columnheader">Sexe</span>
          <span role="columnheader">Licence</span>
          <span role="columnheader">Info</span>
        </div>
        ${swimmers.map((swimmer) => {
      const selected = selectedById.get(swimmer.id);
      const licenseNumber = selected?.licenseNumber || swimmer.licenseNumber || "";
      const name = swimmer.name || [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || "Nageur sans nom";
      const info = [
        swimmer.latestDate ? `dernier resultat ${formatShortDate(swimmer.latestDate)}` : "",
        swimmer.swimmerId ? `ID ${swimmer.swimmerId}` : "",
        swimmer.source === "engagement" ? "cree par le club" : "",
        swimmer.source === "reference" ? "dernier club connu LivePalmes" : ""
      ].filter(Boolean).join(" - ");
      return `
        <div class="admin-engagements-club-swimmer-row" role="row" data-engagement-club-swimmer-row data-selected="${selected ? "true" : "false"}">
          <label role="cell">
            <input type="checkbox" data-engagement-club-swimmer-id="${escapeHtml(swimmer.id)}" data-engagement-club-swimmer-source="${escapeHtml(swimmer.source || "performances")}" ${selected ? "checked" : ""}>
            <strong>${escapeHtml(name)}</strong>
          </label>
          <span role="cell">${escapeHtml(swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "-")}</span>
          <span role="cell">${escapeHtml(swimmer.sex || "-")}</span>
          <label role="cell" aria-label="Numero de licence">
            <input type="text" maxlength="60" inputmode="numeric" data-engagement-club-swimmer-license value="${escapeHtml(licenseNumber)}" ${selected ? "required" : ""}>
          </label>
          <small role="cell">${escapeHtml(info || "-")}</small>
        </div>
      `;
        }).join("")}
      </div>
    `;
    updateEngagementClubSwimmersSummary();
    renderEngagementClubEntries();
    renderEngagementClubRelays();
  }

  function renderEngagementClubEntries() {
    const mount = elements.engagementsClubEntriesList;
    if (!mount) return;
    const locked = !engagementClubTeamComplete();
    if (elements.engagementsClubEntriesForm) elements.engagementsClubEntriesForm.dataset.locked = locked ? "true" : "false";
    if (elements.engagementsClubEntriesSaveButton) elements.engagementsClubEntriesSaveButton.disabled = locked || engagementClubSwimmersLoading;
    if (locked) {
      mount.innerHTML = '<p class="admin-engagements-empty">Renseignez le chef d\'equipe ou confirmez la renonciation pour activer cette etape.</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    if (engagementClubSwimmersLoading) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    if (!engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Ouvrez l\'onglet Nageurs pour charger la base du club.</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    const selectedRows = selectedEngagementClubSwimmerRows();
    if (!selectedRows.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Selectionnez d\'abord les nageurs dans l\'onglet Nageurs.</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    const swimmersById = new Map([
      ...engagementClubSwimmers.map((swimmer) => [swimmer.id, swimmer]),
      ...(selectedEngagementClubEntry?.swimmers || []).map((swimmer) => [swimmer.swimmerIndexId, swimmer])
    ].filter(([id]) => id));
    mount.innerHTML = `
      <div class="admin-engagements-club-entries-table" role="table" aria-label="Courses des nageurs">
        ${selectedRows.map((selected) => {
      const swimmer = swimmersById.get(selected.swimmerIndexId) || selected;
      const name = swimmer.name || [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || "Nageur sans nom";
      const meta = [
        swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "",
        swimmer.sex || "",
        selected.licenseNumber ? `licence ${selected.licenseNumber}` : ""
      ].filter(Boolean).join(" - ");
      return `
        <div class="admin-engagements-club-entry-row" role="row" data-engagement-club-entry-row data-engagement-club-entry-swimmer-id="${escapeHtml(selected.swimmerIndexId)}">
          <div class="admin-engagements-club-entry-name">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(meta || "Nageur selectionne")}</small>
          </div>
          <div class="admin-engagements-club-swimmer-events" data-engagement-club-swimmer-events>
            ${renderEngagementClubSwimmerEvents(selected)}
          </div>
        </div>
      `;
        }).join("")}
      </div>
    `;
    updateEngagementClubEntriesSummary();
  }

  function engagementClubRelayEvents() {
    return (selectedEngagementCompetition?.events || []).filter((event) => event.type === "relay");
  }

  function engagementRelayCategoryOptions(event = {}) {
    const restrictions = Array.isArray(event.categoryRestrictions) ? event.categoryRestrictions : [];
    return ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS.filter(([code]) => !restrictions.length || restrictions.includes(code));
  }

  function engagementRelayGenderOptions(event = {}, category = "") {
    if (event.relayMixedRule === "required") return [["mixed", "Mixte"]];
    const base = [["female", "Femmes"], ["male", "Hommes"]];
    if (event.relayMixedRule === "mastersOnly" && event.relayMixedMode === "masters" && String(category || "").startsWith("R")) {
      return [...base, ["mixed", "Mixte"]];
    }
    return base;
  }

  function engagementClubRelaySwimmerOptions() {
    const byId = new Map();
    (selectedEngagementClubEntry?.swimmers || []).forEach((swimmer) => {
      if (swimmer.swimmerIndexId) byId.set(swimmer.swimmerIndexId, swimmer);
    });
    selectedEngagementClubSwimmerRows().forEach((swimmer) => {
      if (swimmer.swimmerIndexId) byId.set(swimmer.swimmerIndexId, swimmer);
    });
    return Array.from(byId.values()).sort((left, right) =>
      String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr") ||
      String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr")
    );
  }

  function selectedEngagementClubRelayRowsFromDom() {
    return Array.from(elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
      .map((row) => {
        const eventCode = row.querySelector("[data-engagement-club-relay-event]")?.value || "";
        const category = row.querySelector("[data-engagement-club-relay-category]")?.value || "";
        const genderMode = row.querySelector("[data-engagement-club-relay-gender]")?.value || "";
        const manualEntryTime = row.querySelector("[data-engagement-club-relay-time]")?.value || "";
        const memberIds = Array.from(row.querySelectorAll("[data-engagement-club-relay-member]"))
          .map((select) => select.value || "")
          .filter(Boolean);
        return eventCode && category
          ? {
              relayId: row.dataset.engagementClubRelayId || "",
              eventCode,
              category,
              genderMode,
              manualEntryTime,
              memberIds
            }
          : null;
      })
      .filter(Boolean);
  }

  function selectedEngagementClubRelayRows() {
    const domRows = selectedEngagementClubRelayRowsFromDom();
    return domRows.length || elements.engagementsClubRelaysList?.querySelector("[data-engagement-club-relay-row]")
      ? domRows
      : engagementClubRelaysDraft;
  }

  function updateEngagementClubRelaysSummary() {
    if (!elements.engagementsClubRelaysSummary) return;
    const count = selectedEngagementClubRelayRows().length;
    elements.engagementsClubRelaysSummary.textContent = count
      ? `${count} relais selectionne${count > 1 ? "s" : ""}.`
      : "Aucun relais selectionne.";
    renderEngagementClubSummary();
  }

  function currentEngagementClubSwimmersForSummary(entry = selectedEngagementClubEntry || {}) {
    const hasRenderedRows = elements.engagementsClubSwimmersList?.querySelector("[data-engagement-club-swimmer-row]");
    if (hasRenderedRows) return selectedEngagementClubSwimmerRows();
    return Array.isArray(entry.swimmers) ? entry.swimmers : [];
  }

  function currentEngagementClubOfficialCount(entry = selectedEngagementClubEntry || {}) {
    const hasRenderedRows = elements.engagementsClubOfficialsList?.querySelector("[data-engagement-club-official-id]");
    return hasRenderedRows
      ? selectedEngagementClubOfficialIds().length
      : Array.isArray(entry.officials) ? entry.officials.length : 0;
  }

  function engagementClubSummaryTeamLeaderLabel(entry = selectedEngagementClubEntry || {}) {
    if (!engagementClubTeamComplete(entry)) return "Non renseigne";
    const teamLeader = entry.teamLeader || {};
    if (teamLeader.mode === "renounced") return "Renonciation au droit de reclamation";
    const name = [teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ") || "Chef d'equipe";
    const details = [
      teamLeader.licenseNumber ? `licence ${teamLeader.licenseNumber}` : "",
      teamLeader.externalClub ? (teamLeader.clubName || teamLeader.clubId || "club externe") : ""
    ].filter(Boolean).join(" - ");
    return details ? `${name} (${details})` : name;
  }

  function engagementClubSummaryRelayLabel(relay = {}) {
    const event = ENGAGEMENT_EVENT_BY_CODE.get(relay.eventCode) || { shortLabel: relay.eventCode || "Relais" };
    const categoryLabel = new Map(ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS).get(relay.category) || relay.category || "-";
    const genderLabel = relay.genderMode === "mixed"
      ? "Mixte"
      : relay.genderMode === "male" ? "Hommes" : "Femmes";
    const memberCount = Array.isArray(relay.memberIds)
      ? relay.memberIds.filter(Boolean).length
      : Array.isArray(relay.members) ? relay.members.length : 0;
    return [
      event.shortLabel || relay.eventCode || "Relais",
      categoryLabel,
      genderLabel,
      relay.manualEntryTime || relay.entryTime || "",
      memberCount ? `${memberCount} relayeur${memberCount > 1 ? "s" : ""}` : "relayeurs non declares"
    ].filter(Boolean).join(" - ");
  }

  function renderEngagementClubSummary(entry = selectedEngagementClubEntry || {}) {
    if (!elements.engagementsClubSummaryList && !elements.engagementsClubSummaryStatus && !elements.engagementsClubSummaryRelays) return;
    const competition = selectedEngagementCompetition || {};
    const fees = competition.fees || {};
    const swimmers = currentEngagementClubSwimmersForSummary(entry);
    const relays = selectedEngagementClubRelayRows();
    const officialsCount = currentEngagementClubOfficialCount(entry);
    const individualCount = swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0);
    const total = swimmers.length * engagementFeeAmount(fees.swimmerFee) +
      individualCount * engagementFeeAmount(fees.individualEventFee) +
      relays.length * engagementFeeAmount(fees.relayFee);
    const rows = [
      ["Chef d'equipe", engagementClubSummaryTeamLeaderLabel(entry)],
      ["Officiels", competition.officialsRequired === false ? "Non requis" : `${officialsCount} officiel${officialsCount > 1 ? "s" : ""}`],
      ["Nageurs", `${swimmers.length} nageur${swimmers.length > 1 ? "s" : ""}`],
      ["Courses individuelles", `${individualCount} course${individualCount > 1 ? "s" : ""}`],
      ["Relais", `${relays.length} relais`],
      ["Total indicatif", formatEngagementFee(total)],
      ["HelloAsso", engagementHelloAssoLabel(fees)]
    ];
    if (elements.engagementsClubSummaryStatus) {
      elements.engagementsClubSummaryStatus.textContent = engagementClubTeamComplete(entry)
        ? "Recapitulatif indicatif de l'inscription du club."
        : "Renseignez le chef d'equipe ou la renonciation pour activer le recapitulatif.";
    }
    if (elements.engagementsClubSummaryList) {
      elements.engagementsClubSummaryList.innerHTML = rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("");
    }
    if (elements.engagementsClubSummaryRelays) {
      elements.engagementsClubSummaryRelays.innerHTML = relays.length
        ? `
          <strong>Relais declares</strong>
          <ul>
            ${relays.map((relay) => `<li>${escapeHtml(engagementClubSummaryRelayLabel(relay))}</li>`).join("")}
          </ul>
        `
        : "";
    }
    if (elements.engagementsClubSummaryPdfButton) {
      elements.engagementsClubSummaryPdfButton.disabled = !selectedEngagementCompetitionId || !engagementClubTeamComplete(entry);
    }
  }

  function renderEngagementClubRelays() {
    const mount = elements.engagementsClubRelaysList;
    if (!mount) return;
    const locked = !engagementClubTeamComplete();
    const relayEvents = engagementClubRelayEvents();
    const swimmerOptions = engagementClubRelaySwimmerOptions();
    if (elements.engagementsClubRelaysForm) elements.engagementsClubRelaysForm.dataset.locked = locked ? "true" : "false";
    if (elements.engagementsClubRelaysSaveButton) elements.engagementsClubRelaysSaveButton.disabled = locked;
    if (elements.engagementsClubRelaysAddButton) elements.engagementsClubRelaysAddButton.disabled = locked || !relayEvents.length;
    if (locked) {
      mount.innerHTML = '<p class="admin-engagements-empty">Renseignez le chef d\'equipe ou confirmez la renonciation pour activer cette etape.</p>';
      updateEngagementClubRelaysSummary();
      return;
    }
    if (!relayEvents.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun relais ouvert sur cette competition.</p>';
      updateEngagementClubRelaysSummary();
      return;
    }
    const rows = engagementClubRelaysDraft;
    if (!rows.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Ajoutez un relais pour commencer.</p>';
      updateEngagementClubRelaysSummary();
      return;
    }
    mount.innerHTML = `
      <div class="admin-engagements-club-relays-table">
        ${rows.map((relay, index) => {
      const relayId = relay.relayId || `relay-${Date.now()}-${index}`;
      const event = relayEvents.find((candidate) => candidate.code === relay.eventCode) || relayEvents[0];
      const categories = engagementRelayCategoryOptions(event);
      const category = categories.some(([code]) => code === relay.category) ? relay.category : categories[0]?.[0] || "";
      const genderOptions = engagementRelayGenderOptions(event, category);
      const genderMode = genderOptions.some(([mode]) => mode === relay.genderMode) ? relay.genderMode : genderOptions[0]?.[0] || "female";
      const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : (relay.members || []).map((member) => member.swimmerIndexId).filter(Boolean);
      return `
        <div class="admin-engagements-club-relay-row" data-engagement-club-relay-row data-engagement-club-relay-id="${escapeHtml(relayId)}">
          <select data-engagement-club-relay-event aria-label="Relais">
            ${relayEvents.map((option) => `<option value="${escapeHtml(option.code)}" ${option.code === event.code ? "selected" : ""}>${escapeHtml(option.shortLabel || option.code)}</option>`).join("")}
          </select>
          <select data-engagement-club-relay-category aria-label="Categorie">
            ${categories.map(([code, label]) => `<option value="${escapeHtml(code)}" ${code === category ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
          <select data-engagement-club-relay-gender aria-label="Sexe ou mixite">
            ${genderOptions.map(([mode, label]) => `<option value="${escapeHtml(mode)}" ${mode === genderMode ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
          <input type="text" maxlength="8" inputmode="numeric" placeholder="Temps" data-engagement-club-relay-time value="${escapeHtml(relay.manualEntryTime || relay.entryTime || "")}" aria-label="Temps d'engagement">
          <div class="admin-engagements-club-relay-members">
            ${[0, 1, 2, 3].map((memberIndex) => `
              <select data-engagement-club-relay-member aria-label="Relayeur ${memberIndex + 1}">
                <option value="">Relayeur ${memberIndex + 1}</option>
                ${swimmerOptions.map((swimmer) => {
                  const name = swimmer.name || [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || "Nageur";
                  return `<option value="${escapeHtml(swimmer.swimmerIndexId)}" ${memberIds[memberIndex] === swimmer.swimmerIndexId ? "selected" : ""}>${escapeHtml(name)}</option>`;
                }).join("")}
              </select>
            `).join("")}
          </div>
          <button type="button" class="ghost-button compact" data-engagement-club-relay-remove aria-label="Supprimer le relais">Supprimer</button>
        </div>
      `;
    }).join("")}
      </div>
    `;
    updateEngagementClubRelaysSummary();
  }

  function updateEngagementClubTeamFormMode() {
    const mode = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "person";
    const renounced = mode === "renounced";
    const externalClub = elements.engagementsClubTeamExternal?.checked === true;
    if (elements.engagementsClubTeamPersonFields) elements.engagementsClubTeamPersonFields.hidden = renounced;
    if (elements.engagementsClubTeamRenunciationLabel) elements.engagementsClubTeamRenunciationLabel.hidden = !renounced;
    [elements.engagementsClubTeamFirstName, elements.engagementsClubTeamLastName, elements.engagementsClubTeamLicense].forEach((field) => {
      if (field) field.required = !renounced;
    });
    if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.required = renounced;
    if (elements.engagementsClubTeamExternalClubIdLabel) elements.engagementsClubTeamExternalClubIdLabel.hidden = renounced || !externalClub;
    if (elements.engagementsClubTeamExternalClubNameLabel) elements.engagementsClubTeamExternalClubNameLabel.hidden = renounced || !externalClub;
    if (elements.engagementsClubTeamExternalClubId) elements.engagementsClubTeamExternalClubId.required = !renounced && externalClub;
  }

  function renderEngagementClubEntry(entry = selectedEngagementClubEntry || {}) {
    selectedEngagementClubEntry = entry || {};
    engagementClubRelaysDraft = Array.isArray(selectedEngagementClubEntry.relays)
      ? selectedEngagementClubEntry.relays.map((relay) => ({ ...relay }))
      : [];
    const teamLeader = selectedEngagementClubEntry.teamLeader || {};
    if (elements.engagementsClubTeamForm) {
      const mode = teamLeader.mode === "renounced" ? "renounced" : "person";
      const radio = elements.engagementsClubTeamForm.querySelector(`input[name="adminEngagementsClubTeamMode"][value="${mode}"]`);
      if (radio) radio.checked = true;
    }
    if (elements.engagementsClubTeamFirstName) elements.engagementsClubTeamFirstName.value = teamLeader.firstName || "";
    if (elements.engagementsClubTeamLastName) elements.engagementsClubTeamLastName.value = teamLeader.lastName || "";
    if (elements.engagementsClubTeamLicense) elements.engagementsClubTeamLicense.value = teamLeader.licenseNumber || "";
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = teamLeader.externalClub === true;
    if (elements.engagementsClubTeamExternalClubId) elements.engagementsClubTeamExternalClubId.value = teamLeader.externalClub ? (teamLeader.clubId || "") : "";
    if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.value = teamLeader.externalClub ? (teamLeader.clubName || "") : "";
    if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.checked = teamLeader.renunciationAccepted === true;
    renderEngagementClubTeamPersonOptions(findEngagementClubTeamPersonFromFields(teamLeader)?.id || "");
    updateEngagementClubTeamFormMode();

    if (elements.engagementsClubTeamSummary) {
      elements.engagementsClubTeamSummary.textContent = engagementClubTeamComplete()
        ? teamLeader.mode === "renounced"
          ? "Renonciation au droit de reclamation confirmee."
          : `Chef d'equipe : ${[teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ")}.`
        : "A renseigner avant de commencer les engagements.";
    }
    document.querySelectorAll("[data-club-step]").forEach((step) => {
      const locked = !engagementClubTeamComplete();
      step.dataset.locked = locked ? "true" : "false";
      if (step.dataset.clubStep === "officials") return;
      const firstParagraph = step.querySelector("p");
      if (firstParagraph) {
        const unlockedTexts = {
          officials: selectedEngagementCompetition?.officialsRequired === false
            ? "Les officiels ne sont pas requis pour cette competition."
            : "Structure prete. La saisie des officiels arrive dans le lot suivant.",
          swimmers: "Selectionnez les nageurs du club pour cette competition.",
          entries: "Choisissez les courses individuelles des nageurs selectionnes.",
          relays: "Ajoutez les relais du club pour cette competition.",
          summary: "Structure prete. Le recapitulatif se remplira avec les prochaines etapes."
        };
        firstParagraph.textContent = locked
          ? "Renseignez le chef d'equipe ou confirmez la renonciation pour activer cette etape."
          : unlockedTexts[step.dataset.clubStep] || "";
      }
    });
    renderEngagementClubOfficials();
    renderEngagementClubSwimmers();
    renderEngagementClubRelays();
    renderEngagementClubSummary();
    if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(activeEngagementsDetailTab) && !canOpenClubEngagementTab(activeEngagementsDetailTab)) {
      setEngagementsDetailTab("team");
    } else {
      setEngagementsDetailTab(activeEngagementsDetailTab);
    }
  }

  function engagementDocumentStatusLabel(status) {
    return {
      pending: "A generer",
      generated: "Genere",
      sent: "Envoye"
    }[status] || "A generer";
  }

  function engagementDocumentStatus(documents = {}, key) {
    const status = String(documents?.[key]?.status || "").trim();
    return ["pending", "generated", "sent"].includes(status) ? status : "pending";
  }

  function engagementDocumentDefinitions(competition = {}) {
    const documents = competition.documents || {};
    return [
      {
        key: "entriesTxt",
        title: "Export TXT engagements",
        description: competition.computerEmail
          ? `Destination : ${competition.computerEmail}`
          : "Email informatique a renseigner avant l'envoi.",
        status: engagementDocumentStatus(documents, "entriesTxt")
      },
      {
        key: "clubRecapPdf",
        title: "Recap PDF clubs",
        description: "Telechargement a la demande pour chaque club engage.",
        status: engagementDocumentStatus(documents, "clubRecapPdf")
      },
      {
        key: "clubRecapEmails",
        title: "Emails clubs",
        description: "Envoi automatique aux adresses admin du club a la fermeture.",
        status: engagementDocumentStatus(documents, "clubRecapEmails")
      },
      {
        key: "computerEmail",
        title: "Email informatique",
        description: competition.computerEmail || "Non renseigne",
        status: competition.computerEmail ? "generated" : "pending"
      }
    ];
  }

  function engagementDocumentProgressLabel(competition = {}) {
    const definitions = engagementDocumentDefinitions(competition);
    const readyCount = definitions.filter((item) => item.status !== "pending").length;
    return `${readyCount}/${definitions.length} element${definitions.length > 1 ? "s" : ""} GED`;
  }

  function renderEngagementClubRecapFiles() {
    const mount = elements.engagementsClubRecapFiles;
    if (!mount) return;
    if (!isEngagementAdminMode()) {
      mount.innerHTML = "";
      return;
    }
    if (engagementClubRecapEntriesLoading) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des recap PDF clubs...</p>';
      return;
    }
    if (!selectedEngagementCompetitionId) {
      mount.innerHTML = '<p class="admin-engagements-empty">Selectionnez une competition pour afficher les recap clubs.</p>';
      return;
    }
    if (!engagementClubRecapEntriesCompetitionId || engagementClubRecapEntriesCompetitionId !== selectedEngagementCompetitionId) {
      mount.innerHTML = '<p class="admin-engagements-empty">Recap PDF clubs a charger.</p>';
      return;
    }
    if (!engagementClubRecapEntries.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun club engage pour le moment.</p>';
      return;
    }
    mount.innerHTML = `
      <div class="admin-engagements-club-recap-head">
        <strong>Recap PDF clubs</strong>
        <small>${engagementClubRecapEntries.length} club${engagementClubRecapEntries.length > 1 ? "s" : ""} engage${engagementClubRecapEntries.length > 1 ? "s" : ""}</small>
      </div>
      <div class="admin-engagements-club-recap-table" role="table" aria-label="Recap PDF clubs">
        <div class="admin-engagements-club-recap-row admin-engagements-club-recap-row-head" role="row">
          <span role="columnheader">Club</span>
          <span role="columnheader">Nageurs</span>
          <span role="columnheader">Courses</span>
          <span role="columnheader">Relais</span>
          <span role="columnheader">Total</span>
          <span role="columnheader">PDF</span>
        </div>
        ${engagementClubRecapEntries.map((entry) => `
          <div class="admin-engagements-club-recap-row" role="row">
            <span role="cell">
              <strong>${escapeHtml(entry.clubName || entry.clubId || "Club")}</strong>
              <small>${escapeHtml([entry.clubId ? `Club ${entry.clubId}` : "", entry.updatedAt ? `MAJ ${formatDeadline(entry.updatedAt).replace(/^Limite /, "")}` : ""].filter(Boolean).join(" - ") || "-")}</small>
            </span>
            <span role="cell">${escapeHtml(String(entry.swimmerCount || 0))}</span>
            <span role="cell">${escapeHtml(String(entry.individualCount || 0))}</span>
            <span role="cell">${escapeHtml(String(entry.relayCount || 0))}</span>
            <span role="cell">${escapeHtml(formatEngagementFee(entry.totalFee))}</span>
            <span role="cell">
              <button class="ghost-button compact" type="button" data-engagement-admin-club-pdf="${escapeHtml(entry.clubId)}" ${entry.teamLeaderComplete ? "" : "disabled"}>Telecharger</button>
            </span>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function loadEngagementClubRecapFiles({ force = false } = {}) {
    if (!isEngagementAdminMode() || !selectedEngagementCompetitionId || engagementClubRecapEntriesLoading) return;
    if (!force && engagementClubRecapEntriesCompetitionId === selectedEngagementCompetitionId) {
      renderEngagementClubRecapFiles();
      return;
    }
    engagementClubRecapEntriesLoading = true;
    renderEngagementClubRecapFiles();
    try {
      const result = await callFunction("listEngagementCompetitionClubRecaps", {
        competitionId: selectedEngagementCompetitionId
      });
      engagementClubRecapEntries = Array.isArray(result.entries) ? result.entries : [];
      engagementClubRecapEntriesCompetitionId = selectedEngagementCompetitionId;
    } catch (error) {
      engagementClubRecapEntries = [];
      engagementClubRecapEntriesCompetitionId = selectedEngagementCompetitionId;
      if (elements.engagementsClubRecapFiles) {
        elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="error">Lecture recap clubs impossible : ${escapeHtml(error?.message || error)}</p>`;
      }
      return;
    } finally {
      engagementClubRecapEntriesLoading = false;
    }
    renderEngagementClubRecapFiles();
  }

  function renderEngagementDocuments(competition = selectedEngagementCompetition || {}) {
    const definitions = engagementDocumentDefinitions(competition);
    const generatedCount = definitions.filter((item) => item.status !== "pending").length;
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = `${generatedCount}/${definitions.length} element${definitions.length > 1 ? "s" : ""} pret${generatedCount > 1 ? "s" : ""}.`;
    }
    if (elements.engagementsComputerEmailLabel) {
      elements.engagementsComputerEmailLabel.textContent = competition.computerEmail
        ? `Informatique : ${competition.computerEmail}`
        : "Email informatique non renseigne";
    }
    if (elements.engagementsDocumentsList) {
      elements.engagementsDocumentsList.innerHTML = definitions.map((item) => `
        <article class="admin-engagements-document-card" data-document-status="${escapeHtml(item.status)}">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.description)}</small>
          </div>
          <span>${escapeHtml(engagementDocumentStatusLabel(item.status))}</span>
        </article>
      `).join("");
    }
    if (elements.engagementsGeneratedFiles) {
      const files = Array.isArray(competition.generatedFiles) ? competition.generatedFiles : [];
      elements.engagementsGeneratedFiles.innerHTML = files.length
        ? files.map((file) => `<a href="${escapeHtml(file.url || "#")}" target="_blank" rel="noopener">${escapeHtml(file.name || "Document")}</a>`).join("")
        : `<p class="admin-engagements-empty">Aucun fichier genere pour le moment.</p>`;
    }
    renderEngagementClubRecapFiles();
  }

  function engagementEventSummary(events = []) {
    const eventList = Array.isArray(events) ? events : [];
    const individualCount = eventList.filter((event) => event.type === "individual").length;
    const relayCount = eventList.filter((event) => event.type === "relay").length;
    if (!eventList.length) return "Aucune epreuve selectionnee";
    const restrictedCount = eventList.filter((event) => Array.isArray(event.categoryRestrictions) && event.categoryRestrictions.length).length;
    const restrictionLabel = restrictedCount ? `, ${restrictedCount} restriction${restrictedCount > 1 ? "s" : ""}` : "";
    return `${individualCount} course${individualCount > 1 ? "s" : ""} individuelle${individualCount > 1 ? "s" : ""}, ${relayCount} relais${restrictionLabel}`;
  }

  function engagementProgramSummary(sessions = []) {
    const sessionList = Array.isArray(sessions) ? sessions : [];
    const itemCount = sessionList.reduce((sum, session) => sum + (Array.isArray(session.items) ? session.items.length : 0), 0);
    if (!itemCount) return "Ordre non renseigne.";
    return `${sessionList.length} session${sessionList.length > 1 ? "s" : ""}, ${itemCount} ligne${itemCount > 1 ? "s" : ""} au programme.`;
  }

  function engagementProgramStatusSummary(events = [], sessions = []) {
    const eventCount = Array.isArray(events) ? events.length : 0;
    const sessionCount = Array.isArray(sessions) ? sessions.length : 0;
    const itemCount = (Array.isArray(sessions) ? sessions : []).reduce((sum, session) => sum + (Array.isArray(session.items) ? session.items.length : 0), 0);
    const missingCount = missingEngagementProgramEventCount(events, sessions);
    const status = !eventCount
      ? "aucune epreuve"
      : missingCount
        ? `${missingCount} epreuve${missingCount > 1 ? "s" : ""} a placer`
        : itemCount
          ? "programme complet"
          : "programme a construire";
    return `${eventCount} epreuve${eventCount > 1 ? "s" : ""} choisie${eventCount > 1 ? "s" : ""} - ${sessionCount} session${sessionCount > 1 ? "s" : ""} - ${status}`;
  }

  function engagementEventsCompactSummary(events = []) {
    const eventList = Array.isArray(events) ? events : [];
    const individualCount = eventList.filter((event) => event.type === "individual").length;
    const relayCount = eventList.filter((event) => event.type === "relay").length;
    if (!individualCount && !relayCount) return "Aucune epreuve selectionnee.";
    const parts = [];
    if (individualCount) parts.push(`${individualCount} course${individualCount > 1 ? "s" : ""} individuelle${individualCount > 1 ? "s" : ""}`);
    if (relayCount) parts.push(`${relayCount} relais`);
    return parts.join(" - ");
  }

  function missingEngagementProgramEventCount(events = selectedEngagementEventsFromForm(), sessions = selectedEngagementProgramSessionsFromForm(events.map((event) => ({ code: event.code, label: event.shortLabel || event.code })))) {
    const placedCodes = new Set();
    (Array.isArray(sessions) ? sessions : []).forEach((session) => {
      (session.items || []).forEach((item) => {
        if (item.eventCode) placedCodes.add(item.eventCode);
      });
    });
    return (Array.isArray(events) ? events : []).filter((event) => event.code && !placedCodes.has(event.code)).length;
  }

  function updateEngagementEventsSectionToggleLabels() {
    elements.engagementsSectionToggles?.forEach((button) => {
      const section = document.querySelector(`#${button.dataset.engagementsSectionToggle}`);
      button.textContent = section?.open ? "Replier" : "Ouvrir";
    });
  }

  function setEngagementEventsSectionOpen(section, open) {
    if (!section) return;
    section.open = Boolean(open);
    updateEngagementEventsSectionToggleLabels();
  }

  function updateEngagementEventsSectionSummaries(events = selectedEngagementEventsFromForm(), sessions = selectedEngagementProgramSessionsFromForm(events.map((event) => ({ code: event.code, label: event.shortLabel || event.code })))) {
    if (elements.engagementsEventsChoiceSummary) {
      elements.engagementsEventsChoiceSummary.textContent = engagementEventsCompactSummary(events);
    }
    if (elements.engagementsEventsSummary) {
      elements.engagementsEventsSummary.textContent = engagementProgramStatusSummary(events, sessions);
    }
    if (elements.engagementsProgramSummary) {
      const missingCount = missingEngagementProgramEventCount(events, sessions);
      const summary = engagementProgramSummary(sessions);
      elements.engagementsProgramSummary.textContent = missingCount
        ? `${summary} ${missingCount} epreuve${missingCount > 1 ? "s" : ""} a placer.`
        : summary;
      if (elements.engagementsProgramSection) {
        elements.engagementsProgramSection.dataset.warning = missingCount ? "true" : "false";
      }
      const coursesTab = document.querySelector('[data-engagements-detail-tab-button="courses"]');
      if (coursesTab) {
        coursesTab.dataset.warning = missingCount ? "true" : "false";
        coursesTab.title = missingCount
          ? `${missingCount} epreuve${missingCount > 1 ? "s" : ""} selectionnee${missingCount > 1 ? "s" : ""} non placee${missingCount > 1 ? "s" : ""} dans le programme.`
          : "";
      }
    }
    updateEngagementEventsSectionToggleLabels();
  }

  function engagementEventCountLabel(competition = {}) {
    const count = Number(competition.eventCount || 0);
    if (!count) return "";
    return `${count} epreuve${count > 1 ? "s" : ""}`;
  }

  function selectedEngagementEventOptions() {
    return selectedEngagementEventsFromForm().map((event) => ({
      code: event.code,
      label: event.shortLabel || event.code,
      type: event.type || "",
      relayMixedRule: event.relayMixedRule || "",
      relayMixedMode: event.relayMixedMode || ""
    }));
  }

  function normalizedEngagementProgramSessions(rawSessions = [], eventOptions = selectedEngagementEventOptions()) {
    const allowedCodes = new Set(eventOptions.map((event) => event.code));
    return (Array.isArray(rawSessions) ? rawSessions : []).map((session, sessionIndex) => {
      const items = (Array.isArray(session.items) ? session.items : [])
        .map((item) => ({
          eventCode: String(item.eventCode || item.code || "").trim().toUpperCase(),
          genderMode: ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS[item.genderMode] ? item.genderMode : "mixed"
        }))
        .filter((item) => allowedCodes.has(item.eventCode));
      return {
        id: session.id || `session-${sessionIndex + 1}`,
        label: `Session ${sessionIndex + 1}`,
        date: session.date || "",
        startTime: session.startTime || "",
        items
      };
    }).filter((session) => session.label || session.date || session.startTime || session.items.length);
  }

  function selectedEngagementProgramSessionsFromForm(eventOptions = selectedEngagementEventOptions()) {
    const allowedCodes = new Set(eventOptions.map((event) => event.code));
    return Array.from(elements.engagementsProgramSessions?.querySelectorAll("[data-engagement-program-session]") || []).map((sessionElement, sessionIndex) => {
      const items = Array.from(sessionElement.querySelectorAll("[data-engagement-program-row]")).map((row) => {
        const eventCode = row.dataset.engagementProgramEvent || "";
        const genderMode = row.dataset.engagementProgramGender || "mixed";
        return {
          eventCode,
          genderMode: ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS[genderMode] ? genderMode : "mixed"
        };
      }).filter((item) => allowedCodes.has(item.eventCode));
      return {
        id: sessionElement.dataset.engagementProgramSession || `session-${sessionIndex + 1}`,
        label: `Session ${sessionIndex + 1}`,
        date: sessionElement.querySelector("[data-engagement-program-session-date]")?.value || sessionElement.dataset.engagementProgramSessionDateValue || "",
        startTime: sessionElement.querySelector("[data-engagement-program-session-time]")?.value || sessionElement.dataset.engagementProgramSessionTimeValue || "",
        items
      };
    }).filter((session) => session.label || session.date || session.startTime || session.items.length);
  }

  function engagementProgramGenderModesForEvent(eventOption) {
    const eventCode = typeof eventOption === "string" ? eventOption : eventOption?.code;
    const definition = ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
    return definition?.relayMixedRule === "required"
      ? [["mixed", "Relais mixte"]]
      : ENGAGEMENT_PROGRAM_GENDER_MODES.map(([mode]) => [mode, engagementProgramGenderModeDisplayLabel(mode, eventCode, eventOption)]);
  }

  function engagementProgramGenderModeShortLabel(mode, eventCode = "", eventOption = null) {
    const definition = ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
    return {
      female: "F",
      male: "H"
    }[mode] || (
      definition?.relayMixedRule === "required" || (definition?.relayMixedRule === "mastersOnly" && eventOption?.relayMixedMode === "masters")
        ? "Mixte"
        : "F/H"
    );
  }

  function engagementProgramGenderModeDisplayLabel(mode, eventCode = "", eventOption = null) {
    const definition = ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
    return {
      female: "Femmes",
      male: "Hommes"
    }[mode] || (
      definition?.relayMixedRule === "required"
        ? "Relais mixte"
        : definition?.relayMixedRule === "mastersOnly" && eventOption?.relayMixedMode === "masters"
          ? "Masters mixte"
          : "F/H ensemble"
    );
  }

  function engagementProgramGenderModeTone(mode, eventCode = "", eventOption = null) {
    const definition = ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
    if (mode === "female") return "female";
    if (mode === "male") return "male";
    if (definition?.relayMixedRule === "required" || (definition?.relayMixedRule === "mastersOnly" && eventOption?.relayMixedMode === "masters")) {
      return "relay-mixed";
    }
    return "combined";
  }

  function engagementProgramSlotConflict(sessions, eventCode, genderMode) {
    const existingModes = new Set();
    sessions.forEach((session) => {
      (session.items || []).forEach((item) => {
        if (item.eventCode === eventCode) existingModes.add(item.genderMode);
      });
    });
    if (genderMode === "mixed") return existingModes.size > 0;
    return existingModes.has("mixed") || existingModes.has(genderMode);
  }

  function renderEngagementProgramSessions(programSessions = [], canEdit = false) {
    const mount = elements.engagementsProgramSessions;
    if (!mount) return;
    const eventOptions = selectedEngagementEventOptions();
    const sessions = normalizedEngagementProgramSessions(programSessions, eventOptions);
    if (!canEdit || !sessions.some((session) => session.id === activeEngagementProgramSessionId)) {
      activeEngagementProgramSessionId = "";
    }
    if (elements.engagementsProgramAddSession) {
      elements.engagementsProgramAddSession.hidden = !canEdit;
      elements.engagementsProgramAddSession.disabled = !canEdit || !eventOptions.length;
    }
    updateEngagementEventsSectionSummaries(selectedEngagementEventsFromForm(), sessions);
    if (!eventOptions.length) {
      mount.innerHTML = `<p class="admin-engagements-empty">${canEdit ? "Selectionnez d'abord les epreuves qui seront nagees." : "Programme de la competition non renseigne."}</p>`;
      return;
    }
    if (!sessions.length) {
      mount.innerHTML = `<p class="admin-engagements-empty">${canEdit ? "Ajoutez une session pour definir l'ordre des epreuves." : "Ordre des epreuves non renseigne."}</p>`;
      return;
    }
    const availableHtml = eventOptions.map((event) => `
      <div class="admin-engagements-program-available-event">
        <strong>${escapeHtml(event.label)}</strong>
        <div>
          ${engagementProgramGenderModesForEvent(event).map(([mode, label]) => {
            const disabled = !canEdit || !activeEngagementProgramSessionId || engagementProgramSlotConflict(sessions, event.code, mode);
            return `<button class="ghost-button" type="button" title="${escapeHtml(label)}" aria-label="${escapeHtml(`${event.label} ${label}`)}" data-engagement-program-action="add-slot" data-engagement-program-event="${escapeHtml(event.code)}" data-engagement-program-gender="${escapeHtml(mode)}" ${disabled ? "disabled" : ""}>${escapeHtml(engagementProgramGenderModeShortLabel(mode, event.code, event))}</button>`;
          }).join("")}
        </div>
      </div>
    `).join("");
    const eventLabelFor = (eventCode) => eventOptions.find((event) => event.code === eventCode)?.label || eventCode;
    const eventOptionFor = (eventCode) => eventOptions.find((event) => event.code === eventCode) || null;
    const sessionHtmlFor = (session, sessionIndex) => {
      const active = canEdit && session.id === activeEngagementProgramSessionId;
      return `
      <div class="admin-engagements-program-builder-row" data-has-palette="${active && canEdit ? "true" : "false"}">
        <div class="admin-engagements-program-available-slot">
          ${active && canEdit ? `
            <div class="admin-engagements-program-available">
              <strong>Epreuves disponibles</strong>
              ${availableHtml}
            </div>
          ` : ""}
        </div>
        <section class="admin-engagements-program-session" data-engagement-program-session="${escapeHtml(session.id || `session-${sessionIndex + 1}`)}" data-engagement-program-session-date-value="${escapeHtml(session.date || "")}" data-engagement-program-session-time-value="${escapeHtml(session.startTime || "")}" data-active="${active ? "true" : "false"}">
        <div class="admin-engagements-program-session-head">
          <div class="admin-engagements-program-session-title">
            <span>Session</span>
            <strong>${escapeHtml(`Session ${sessionIndex + 1}`)}</strong>
          </div>
          <label>
            Date
            ${canEdit
              ? `<input type="date" value="${escapeHtml(session.date || "")}" data-engagement-program-session-date>`
              : `<span class="admin-engagements-program-read-value">${escapeHtml(formatShortDate(session.date) || "-")}</span>`}
          </label>
          <label>
            Debut
            ${canEdit
              ? `<input type="time" value="${escapeHtml(session.startTime || "")}" data-engagement-program-session-time>`
              : `<span class="admin-engagements-program-read-value">${escapeHtml(session.startTime || "-")}</span>`}
          </label>
          <div class="admin-engagements-program-actions">
            <button class="ghost-button" type="button" title="Les epreuves disponibles s'ajoutent dans cette session" aria-label="Choisir cette session comme cible" data-engagement-program-action="select-session" ${canEdit ? "" : "hidden"}>${active ? "Cible" : "Choisir"}</button>
            <button class="ghost-button" type="button" title="Supprimer la session" aria-label="Supprimer la session" data-engagement-program-action="remove-session" ${canEdit ? "" : "hidden"}>&times;</button>
          </div>
        </div>
        <div class="admin-engagements-program-rows">
          ${session.items.length ? session.items.map((item, itemIndex) => `
            <div class="admin-engagements-program-row" data-engagement-program-row data-engagement-program-event="${escapeHtml(item.eventCode)}" data-engagement-program-gender="${escapeHtml(item.genderMode)}">
              <div class="admin-engagements-program-row-main">
                <span>${itemIndex + 1}.</span>
                <strong>${escapeHtml(eventLabelFor(item.eventCode))}</strong>
                <i aria-hidden="true">-</i>
                <em data-gender-mode="${escapeHtml(item.genderMode)}" data-gender-tone="${escapeHtml(engagementProgramGenderModeTone(item.genderMode, item.eventCode, eventOptionFor(item.eventCode)))}" title="${escapeHtml(engagementProgramGenderModeDisplayLabel(item.genderMode, item.eventCode, eventOptionFor(item.eventCode)))}">${escapeHtml(engagementProgramGenderModeDisplayLabel(item.genderMode, item.eventCode, eventOptionFor(item.eventCode)))}</em>
              </div>
              <div class="admin-engagements-program-actions">
                <button class="ghost-button" type="button" title="Monter" aria-label="Monter" data-engagement-program-action="move-up" ${canEdit ? "" : "hidden"}>↑</button>
                <button class="ghost-button" type="button" title="Descendre" aria-label="Descendre" data-engagement-program-action="move-down" ${canEdit ? "" : "hidden"}>↓</button>
                <button class="ghost-button" type="button" title="Retirer" aria-label="Retirer" data-engagement-program-action="remove-row" ${canEdit ? "" : "hidden"}>&times;</button>
              </div>
            </div>
          `).join("") : `<p class="admin-engagements-empty">Aucune ligne dans cette session.</p>`}
        </div>
        </section>
      </div>
    `;
    };
    const sessionGroups = [];
    sessions.forEach((session, sessionIndex) => {
      const dayKey = session.date || `sans-date-${sessionIndex + 1}`;
      const previousGroup = sessionGroups.at(-1);
      if (!previousGroup || previousGroup.dayKey !== dayKey) {
        sessionGroups.push({ dayKey, rows: [] });
      }
      sessionGroups.at(-1).rows.push(sessionHtmlFor(session, sessionIndex));
    });
    const sessionsHtml = sessionGroups.map((group) => `
      <div class="admin-engagements-program-day-group" data-program-day="${escapeHtml(group.dayKey)}">
        ${group.rows.join("")}
      </div>
    `).join("");
    mount.innerHTML = `
      <div class="admin-engagements-program-builder">
        ${sessionsHtml}
      </div>
    `;
  }

  function refreshEngagementProgramEditor(sessions = selectedEngagementProgramSessionsFromForm()) {
    renderEngagementProgramSessions(sessions, isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
  }

  function addEngagementProgramSession() {
    const eventOptions = selectedEngagementEventOptions();
    if (!eventOptions.length) return;
    const sessions = selectedEngagementProgramSessionsFromForm(eventOptions);
    sessions.push({
      id: `session-${Date.now()}`,
      label: `Session ${sessions.length + 1}`,
      date: selectedEngagementCompetition?.date || "",
      startTime: "",
      items: []
    });
    activeEngagementProgramSessionId = sessions.at(-1)?.id || "";
    markEngagementDetailTabDirty("courses");
    renderEngagementProgramSessions(sessions, isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
  }

  function handleEngagementProgramAction(event) {
    const button = event.target.closest("[data-engagement-program-action]");
    if (!isEngagementAdminMode() || !engagementDetailEditing || !canEditEngagementCompetition()) return;
    const eventOptions = selectedEngagementEventOptions();
    if (!eventOptions.length) return;
    const sessions = selectedEngagementProgramSessionsFromForm(eventOptions);
    if (!button) {
      const clickedSession = event.target.closest("[data-engagement-program-session]");
      if (!clickedSession || event.target.closest("input, select, textarea, button, label")) return;
      activeEngagementProgramSessionId = clickedSession.dataset.engagementProgramSession || activeEngagementProgramSessionId;
      renderEngagementProgramSessions(sessions, isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
      return;
    }
    const action = button.dataset.engagementProgramAction;
    const sessionElement = button.closest("[data-engagement-program-session]");
    const sessionIndex = Array.from(elements.engagementsProgramSessions?.querySelectorAll("[data-engagement-program-session]") || []).indexOf(sessionElement);
    if (action === "add-slot") {
      const targetSession = sessions.find((session) => session.id === activeEngagementProgramSessionId);
      const eventCode = button.dataset.engagementProgramEvent || "";
      const genderMode = button.dataset.engagementProgramGender || "mixed";
      if (targetSession && !engagementProgramSlotConflict(sessions, eventCode, genderMode)) {
        targetSession.items.push({ eventCode, genderMode });
        markEngagementDetailTabDirty("courses");
      }
    } else if (action === "select-session" && sessions[sessionIndex]) {
      activeEngagementProgramSessionId = sessions[sessionIndex].id;
    } else if (action === "remove-session" && sessionIndex >= 0) {
      const removedId = sessions[sessionIndex]?.id;
      sessions.splice(sessionIndex, 1);
      if (removedId === activeEngagementProgramSessionId) activeEngagementProgramSessionId = "";
      markEngagementDetailTabDirty("courses");
    } else {
      const rowElement = button.closest("[data-engagement-program-row]");
      const rowIndex = Array.from(sessionElement?.querySelectorAll("[data-engagement-program-row]") || []).indexOf(rowElement);
      const rows = sessions[sessionIndex]?.items || [];
      if (action === "remove-row" && rowIndex >= 0) {
        rows.splice(rowIndex, 1);
        markEngagementDetailTabDirty("courses");
      } else if (action === "move-up" && rowIndex > 0) {
        [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
        markEngagementDetailTabDirty("courses");
      } else if (action === "move-down" && rowIndex >= 0 && rowIndex < rows.length - 1) {
        [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
        markEngagementDetailTabDirty("courses");
      }
    }
    renderEngagementProgramSessions(sessions, isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
  }

  function selectedEngagementEventsFromForm() {
    const checkedInputs = Array.from(elements.engagementsEventsForm?.querySelectorAll("[data-engagement-event-code]:checked") || []);
    return checkedInputs.map((input) => {
      const code = input.dataset.engagementEventCode || "";
      const definition = ENGAGEMENT_EVENT_BY_CODE.get(code);
      if (!definition) return null;
      const allowedCategories = engagementAllowedCategoryCodes(code);
      const checkedCategories = Array.from(input.closest("[data-engagement-event-item]")?.querySelectorAll("[data-engagement-category-code]:checked") || [])
        .map((categoryInput) => categoryInput.dataset.engagementCategoryCode)
        .filter((categoryCode) => allowedCategories.includes(categoryCode))
        .filter(Boolean);
      const categoryRestrictions = checkedCategories.length === allowedCategories.length && !ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]
        ? []
        : checkedCategories;
      const row = input.closest("[data-engagement-event-item]");
      const relayMixedModeField = row?.querySelector("[data-engagement-relay-mixed-mode]");
      const relayMixedMode = definition.relayMixedRule === "required"
        ? "required"
        : definition.relayMixedRule === "mastersOnly"
          ? (relayMixedModeField?.value === "masters" ? "masters" : "none")
          : "";
      const multipleRelaysAllowed = definition.type === "relay" &&
        row?.querySelector("[data-engagement-relay-multiple]")?.checked === true;
      return {
        ...definition,
        categoryRestrictions,
        ...(relayMixedMode ? { relayMixedMode } : {}),
        ...(definition.type === "relay" ? { multipleRelaysAllowed } : {})
      };
    }).filter(Boolean);
  }

  function selectedEngagementEventsCategoryError() {
    const selectedItems = Array.from(elements.engagementsEventsForm?.querySelectorAll("[data-engagement-event-item]") || [])
      .filter((item) => item.querySelector("[data-engagement-event-code]")?.checked === true);
    const invalidItem = selectedItems.find((item) => !item.querySelectorAll("[data-engagement-category-code]:checked").length);
    const label = invalidItem?.querySelector("[data-engagement-event-label]")?.textContent?.trim();
    return invalidItem ? `Au moins une categorie doit rester autorisee pour ${label || "chaque epreuve"}.` : "";
  }

  function selectedEngagementProgramError() {
    const used = new Map();
    const eventLabels = new Map(selectedEngagementEventOptions().map((event) => [event.code, event.label]));
    const sessions = selectedEngagementProgramSessionsFromForm();
    for (const session of sessions) {
      for (const item of session.items || []) {
        const usedModes = used.get(item.eventCode) || new Set();
        const duplicate = item.genderMode === "mixed"
          ? usedModes.size > 0
          : usedModes.has("mixed") || usedModes.has(item.genderMode);
        if (duplicate) {
          return `Doublon dans le programme chrono : ${eventLabels.get(item.eventCode) || item.eventCode}.`;
        }
        usedModes.add(item.genderMode);
        used.set(item.eventCode, usedModes);
      }
    }
    return "";
  }

  function engagementAllowedCategoryCodes(eventCode) {
    const definitions = engagementCategoryDefinitionsForEvent(eventCode);
    const forbidden = ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[eventCode] || new Set();
    return definitions
      .map(([code]) => code)
      .filter((code) => !forbidden.has(code));
  }

  function normalizeEngagementCategoryRestrictions(eventCode, categories = []) {
    const allowedCategories = engagementAllowedCategoryCodes(eventCode);
    const restrictionSet = new Set(Array.from(categories).filter((code) => allowedCategories.includes(code)));
    if (eventCode === "50AP") {
      const legacyDefault = ["C", "J", "S", "M30+", "M40+", "M50+"];
      if (legacyDefault.every((code) => restrictionSet.has(code)) && ["M60+", "M70+", "M80+"].some((code) => !restrictionSet.has(code))) {
        return new Set(allowedCategories);
      }
    }
    return restrictionSet;
  }

  function engagementCategoryDefinitionsForEvent(eventCode) {
    const definition = ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
    return definition?.type === "relay"
      ? ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
      : ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS;
  }

  function updateEngagementEventsSummaryFromForm(event) {
    if (event?.target?.closest?.("[data-engagement-program-sessions]")) {
      const sessions = selectedEngagementProgramSessionsFromForm();
      updateEngagementEventsSectionSummaries(selectedEngagementEventsFromForm(), sessions);
      markEngagementDetailTabDirty("courses");
      return;
    }
    markEngagementDetailTabDirty("courses");
    setEngagementEventsSectionOpen(elements.engagementsProgramSection, true);
    const previousProgramSessions = selectedEngagementProgramSessionsFromForm();
    elements.engagementsEventsForm?.querySelectorAll("[data-engagement-event-item]").forEach((item) => {
      const checked = item.querySelector("[data-engagement-event-code]")?.checked === true;
      const restrictions = item.querySelector("[data-engagement-event-restrictions]");
      const relayMixedModeField = item.querySelector("[data-engagement-relay-mixed-mode]");
      const relayMultipleField = item.querySelector("[data-engagement-relay-multiple]");
      item.dataset.selected = checked ? "true" : "false";
      if (restrictions) restrictions.hidden = !checked;
      if (relayMixedModeField?.dataset.engagementRelayMixedEditable === "true") {
        relayMixedModeField.disabled = !checked;
      }
      if (relayMultipleField) relayMultipleField.disabled = !checked || !isEngagementAdminMode() || !engagementDetailEditing || !canEditEngagementCompetition();
    });
    if (!elements.engagementsEventsSummary) return;
    const selectedEvents = selectedEngagementEventsFromForm();
    elements.engagementsEventsSummary.textContent = engagementEventSummary(selectedEvents);
    updateEngagementEventsSectionSummaries(selectedEvents, previousProgramSessions);
    renderEngagementProgramSessions(previousProgramSessions, isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
  }

  function renderEngagementEventGroup(mount, type, selectedCodes, canEdit) {
    if (!mount) return;
    const events = ENGAGEMENT_EVENT_DEFINITIONS.filter((event) => event.type === type);
    const relayTable = type === "relay";
    const categoryDefinitions = type === "relay"
      ? ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
      : ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS;
    const categoryHead = categoryDefinitions.map(([code, label]) => `
      <span title="${escapeHtml(label)}">${escapeHtml(code)}</span>
    `).join("");
    const rows = events.map((event) => {
      const selectedEvent = selectedCodes.get(event.code) || {};
      const selected = Boolean(selectedEvent.code);
      const restrictedCategories = normalizeEngagementCategoryRestrictions(
        event.code,
        Array.isArray(selectedEvent.categoryRestrictions) ? selectedEvent.categoryRestrictions : []
      );
      const forbiddenCategories = ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set();
      const allCategoriesAllowed = !restrictedCategories.size;
      const mixedRuleLabel = event.relayMixedRule === "required"
        ? " - relais obligatoirement mixte"
        : event.relayMixedRule === "mastersOnly"
          ? " - mixte possible uniquement en Master"
          : "";
      const relayMixedMode = event.relayMixedRule === "required"
        ? "required"
        : event.relayMixedRule === "mastersOnly" && selectedEvent.relayMixedMode === "masters"
          ? "masters"
          : event.relayMixedRule === "mastersOnly"
            ? "none"
            : "";
      const mixedRuleCell = event.relayMixedRule === "required"
        ? `<span class="admin-engagements-mixed-cell" title="Relais obligatoirement mixte">Oui</span>`
        : event.relayMixedRule === "mastersOnly"
          ? `
            <label class="admin-engagements-mixed-cell admin-engagements-mixed-choice" title="Choix admin pour les categories Master">
              <select data-engagement-relay-mixed-mode data-engagement-relay-mixed-editable="true" ${canEdit && selected ? "" : "disabled"}>
                <option value="none" ${relayMixedMode === "none" ? "selected" : ""}>Non</option>
                <option value="masters" ${relayMixedMode === "masters" ? "selected" : ""}>Master</option>
              </select>
            </label>
          `
          : `<span class="admin-engagements-mixed-cell" title="Relais non mixte">-</span>`;
      const multipleRelayCell = relayTable
        ? `
          <label class="admin-engagements-mixed-cell admin-engagements-mixed-choice" title="Autoriser plusieurs relais identiques par club">
            <input type="checkbox" data-engagement-relay-multiple ${selectedEvent.multipleRelaysAllowed === true ? "checked" : ""} ${canEdit && selected ? "" : "disabled"}>
          </label>
        `
        : "";
      return `
        <div class="admin-engagements-event-row" data-engagement-event-item data-selected="${selected ? "true" : "false"}">
          <label class="admin-engagements-event-main">
            <input type="checkbox" data-engagement-event-code="${escapeHtml(event.code)}" ${selected ? "checked" : ""} ${canEdit ? "" : "disabled"}>
            <span>
              <strong data-engagement-event-label title="${escapeHtml(event.label)}${escapeHtml(mixedRuleLabel)}">${escapeHtml(event.shortLabel)}</strong>
            </span>
          </label>
          ${relayTable ? mixedRuleCell : ""}
          ${multipleRelayCell}
          <div class="admin-engagements-event-restrictions" data-engagement-event-restrictions ${selected ? "" : "hidden"}>
            ${categoryDefinitions.map(([code, label]) => forbiddenCategories.has(code)
              ? `<span class="admin-engagements-category-blocked" title="${escapeHtml(label)} - interdit par le reglement"></span>`
              : `
                <label title="${escapeHtml(label)}">
                  <input type="checkbox" aria-label="${escapeHtml(label)}" data-engagement-category-code="${escapeHtml(code)}" ${allCategoriesAllowed || restrictedCategories.has(code) ? "checked" : ""} ${canEdit ? "" : "disabled"}>
                  <span>${escapeHtml(code)}</span>
                </label>
              `).join("")}
          </div>
        </div>
      `;
    }).join("");
    mount.innerHTML = `
      <div class="admin-engagements-events-table ${relayTable ? "admin-engagements-events-table-relay" : "admin-engagements-events-table-individual"}" style="--engagement-category-count: ${categoryDefinitions.length}">
        <div class="admin-engagements-event-row admin-engagements-event-row-head" aria-hidden="true">
          <span>Course</span>
          ${relayTable ? "<span>Mixte</span>" : ""}
          ${relayTable ? "<span>Plusieurs</span>" : ""}
          <div>${categoryHead}</div>
        </div>
        ${rows}
      </div>
    `;
  }

  function renderEngagementEvents(competition = selectedEngagementCompetition || {}) {
    const events = Array.isArray(competition.events) ? competition.events : [];
    const selectedCodes = new Map(events.map((event) => [event.code, event]).filter(([code]) => Boolean(code)));
    const adminMode = isEngagementAdminMode();
    const canEdit = adminMode && engagementDetailEditing && canEditEngagementCompetition(competition);
    const clubProgramView = !adminMode;
    if (elements.engagementsEventsForm) {
      elements.engagementsEventsForm.dataset.clubProgramView = clubProgramView ? "true" : "false";
    }
    if (elements.engagementsEventsChoiceSection) elements.engagementsEventsChoiceSection.hidden = !adminMode;
    if (elements.engagementsProgramSection) elements.engagementsProgramSection.hidden = false;
    renderEngagementEventGroup(elements.engagementsIndividualEvents, "individual", selectedCodes, canEdit);
    renderEngagementEventGroup(elements.engagementsRelayEvents, "relay", selectedCodes, canEdit);
    if (elements.engagementsEventsSummary) {
      elements.engagementsEventsSummary.textContent = engagementEventSummary(events);
    }
    if (elements.engagementsEventsSaveButton) {
      elements.engagementsEventsSaveButton.hidden = true;
      elements.engagementsEventsSaveButton.disabled = true;
    }
    renderEngagementProgramSessions(competition.programSessions || [], canEdit);
    if (clubProgramView) setEngagementEventsSectionOpen(elements.engagementsProgramSection, true);
    updateEngagementEventsSectionSummaries(
      events,
      normalizedEngagementProgramSessions(competition.programSessions || [], events.map((event) => ({ code: event.code, label: event.shortLabel || event.code })))
    );
    if (elements.engagementsEventsMessage) {
      elements.engagementsEventsMessage.textContent = !adminMode
        ? ""
        : canEditEngagementCompetition(competition)
        ? ""
        : "Programme consultable uniquement avec un droit de gestion sur cette competition.";
      elements.engagementsEventsMessage.dataset.tone = canEdit ? "ok" : "loading";
    }
  }

  function renderEngagementCompetitions() {
    const mount = elements.engagementsCalendarList;
    if (!mount) return;
    const visibleCompetitions = filteredEngagementCompetitions();
    if (!visibleCompetitions.length) {
      mount.innerHTML = `<p class="admin-engagements-empty">Aucune competition ne correspond aux filtres.</p>`;
      return;
    }
    mount.innerHTML = visibleCompetitions.map((competition) => `
      <article class="admin-engagements-competition ${competition.id === selectedEngagementCompetitionId ? "selected" : ""}">
        <time datetime="${escapeHtml(competition.date || "")}">${escapeHtml(formatShortDate(competition.date))}</time>
        <div>
          <strong>${escapeHtml(competition.name || "Competition sans nom")}</strong>
          <small>${escapeHtml([competition.location, competition.regionId ? `Region ${regionDisplayLabel(competition.regionId)}` : ""].filter(Boolean).join(" - ") || "Lieu non renseigne")}</small>
        </div>
        <span>${escapeHtml(engagementLevelLabel(competition.level))}</span>
        <span data-entry-status="${escapeHtml(engagementDeadlineTone(competition))}">${escapeHtml(engagementOperationalStatusLabel(competition))}</span>
        <div class="admin-engagements-competition-actions">
          <small>${escapeHtml(formatDeadline(competition.entryDeadlineAt))}</small>
          <button class="ghost-button" type="button" data-engagement-competition-id="${escapeHtml(competition.id)}">${isEngagementAdminMode() && canEditEngagementCompetition(competition) ? "Administrer" : "Voir la fiche"}</button>
        </div>
      </article>
    `).join("");
  }

  function setEngagementCompetitionDetailVisible(visible) {
    if (elements.engagementsCalendarPanel) elements.engagementsCalendarPanel.dataset.detailOpen = visible ? "true" : "false";
    if (elements.engagementsCalendarCard) elements.engagementsCalendarCard.dataset.detailOpen = visible ? "true" : "false";
    if (elements.engagementsCalendarFilters) elements.engagementsCalendarFilters.hidden = visible;
    if (elements.engagementsCalendarList) elements.engagementsCalendarList.hidden = visible;
    if (elements.engagementsRefresh) elements.engagementsRefresh.hidden = visible;
    if (elements.engagementsDetail) elements.engagementsDetail.hidden = !visible;
  }

  function renderEngagementCompetitionDetail(competition = {}) {
    setEngagementCompetitionDetailVisible(true);
    engagementDetailEditing = false;
    setEngagementsDetailTab(activeEngagementsDetailTab);
    if (elements.engagementsEditForm) elements.engagementsEditForm.hidden = true;
    if (elements.engagementsDetailList) elements.engagementsDetailList.hidden = false;
    if (elements.engagementsEditButton) elements.engagementsEditButton.hidden = !isEngagementAdminMode() || !canEditEngagementCompetition(competition);
    if (elements.engagementsSaveButton) elements.engagementsSaveButton.hidden = true;
    if (elements.engagementsEditCancelTop) elements.engagementsEditCancelTop.hidden = true;
    if (elements.engagementsDeleteButton) {
      const canRequestOrDelete = isEngagementAdminMode() && canEditEngagementCompetition(competition);
      const deletionPending = isEngagementAdminMode() && competition.deletionRequestStatus === "pending";
      const directDelete = canDeleteEngagementCompetitionDirectly();
      elements.engagementsDeleteButton.hidden = !canRequestOrDelete;
      elements.engagementsDeleteButton.disabled = deletionPending && !directDelete;
      elements.engagementsDeleteButton.textContent = deletionPending && !directDelete
        ? "Suppression demandee"
        : directDelete
        ? "Supprimer"
        : "Demander la suppression";
    }
    if (elements.engagementsDetailTitle) {
      elements.engagementsDetailTitle.textContent = competition.name || "Competition sans nom";
    }
    if (elements.engagementsDetailSubtitle) {
      elements.engagementsDetailSubtitle.textContent = [
        competition.endDate && competition.endDate !== competition.date
          ? `${formatShortDate(competition.date)} au ${formatShortDate(competition.endDate)}`
          : formatShortDate(competition.date),
        competition.location || "",
        engagementLevelLabel(competition.level),
        competition.regionId ? regionDisplayLabel(competition.regionId) : ""
      ].filter((item) => item && item !== "-").join(" - ");
    }
    if (elements.engagementsDetailMeta) elements.engagementsDetailMeta.innerHTML = "";
    const adminMode = isEngagementAdminMode();
    const sharedRows = [
      ["Date", formatShortDate(competition.date)],
      ["Date de fin", formatShortDate(competition.endDate || competition.date)],
      ["Lieu", competition.location || "-"],
      ["Region", regionDisplayLabel(competition.regionId)],
      ["Niveau", engagementLevelLabel(competition.level)],
      ["Statut engagements", engagementStatusLabel(competition.entryStatus)],
      ["Limite engagements", formatDeadline(competition.entryDeadlineAt)],
      ["Bassin", engagementPoolLengthLabel(competition.poolLength || "50")],
      ["Chronometrage", engagementTimingTypeLabel(competition.timingType)],
      ["Temps engagements", engagementQualificationPeriodLabel(competition)],
      ["Sans temps connu", engagementMissingEntryTimeModeLabel(competition.missingEntryTimeMode)],
      ["Max epreuves nageur", engagementMaxEventsLabel(competition.maxEventsPerSwimmer)],
      ["Officiels", competition.officialsRequired ? "Requis" : "Non requis"],
      ["Programme", engagementEventSummary(competition.events || [])],
      ["Frais", engagementFeesSummary(competition.fees || {})]
    ];
    const clubRows = [
      ["Date", competition.endDate && competition.endDate !== competition.date
        ? `${formatShortDate(competition.date)} au ${formatShortDate(competition.endDate)}`
        : formatShortDate(competition.date)],
      ["Lieu", competition.location || "-"],
      ["Limite engagements", formatDeadline(competition.entryDeadlineAt)],
      ["Statut engagements", engagementStatusLabel(competition.entryStatus)],
      ["Programme", engagementCompetitionProgramOverview(competition)],
      ["Frais d'engagement", engagementFeesSummary(competition.fees || {})],
      ["HelloAsso", engagementHelloAssoLabel(competition.fees || {})],
      ["Niveau", engagementLevelLabel(competition.level)],
      ["Region", regionDisplayLabel(competition.regionId)],
      ["Officiels", competition.officialsRequired ? "A declarer" : "Non requis"],
      ["Bassin", engagementPoolLengthLabel(competition.poolLength || "50")],
      ["Chronometrage", engagementTimingTypeLabel(competition.timingType)]
    ];
    const rows = adminMode ? [
      ["Identifiant", competition.id || "-"],
      ...sharedRows,
      ["Email informatique", competition.computerEmail || "-"],
      ["Creation", competition.createdAt ? formatDeadline(competition.createdAt).replace(/^Limite /, "") : "-"],
      ["Derniere mise a jour", competition.updatedAt ? formatDeadline(competition.updatedAt).replace(/^Limite /, "") : "-"]
    ] : clubRows;
    if (elements.engagementsDetailList) {
      elements.engagementsDetailList.innerHTML = rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("");
    }
    if (elements.engagementsDetailStatus) {
      elements.engagementsDetailStatus.textContent = "Fiche chargee.";
      elements.engagementsDetailStatus.dataset.tone = "ok";
    }
    updateEngagementDetailEditState();
    renderEngagementEvents(competition);
    renderEngagementFees(competition);
    renderEngagementDocuments(competition);
  }

  function closeEngagementCompetitionDetail() {
    if (!confirmLeaveDirtyEngagementTab()) return;
    clearEngagementDetailTabDirty();
    selectedEngagementCompetitionId = "";
    selectedEngagementCompetition = null;
    selectedEngagementClubEntry = null;
    engagementClubRecapEntries = [];
    engagementClubRecapEntriesCompetitionId = "";
    engagementClubRecapEntriesLoading = false;
    setEngagementsDetailTab("general");
    setEngagementCompetitionDetailVisible(false);
    if (elements.engagementsDetailTitle) elements.engagementsDetailTitle.textContent = "Selectionnez une competition";
    if (elements.engagementsDetailSubtitle) elements.engagementsDetailSubtitle.textContent = "";
    if (elements.engagementsEditState) elements.engagementsEditState.hidden = true;
    if (elements.engagementsDetailMeta) elements.engagementsDetailMeta.innerHTML = "";
    if (elements.engagementsDetailList) elements.engagementsDetailList.innerHTML = "";
    if (elements.engagementsEditForm) elements.engagementsEditForm.hidden = true;
    if (elements.engagementsEditButton) elements.engagementsEditButton.hidden = true;
    if (elements.engagementsSaveButton) elements.engagementsSaveButton.hidden = true;
    if (elements.engagementsEditCancelTop) elements.engagementsEditCancelTop.hidden = true;
    if (elements.engagementsDeleteButton) elements.engagementsDeleteButton.hidden = true;
    if (elements.engagementsIndividualEvents) elements.engagementsIndividualEvents.innerHTML = "";
    if (elements.engagementsRelayEvents) elements.engagementsRelayEvents.innerHTML = "";
    if (elements.engagementsEventsSummary) elements.engagementsEventsSummary.textContent = "Aucune epreuve selectionnee.";
    if (elements.engagementsProgramSummary) elements.engagementsProgramSummary.textContent = "Ordre non renseigne.";
    if (elements.engagementsProgramSessions) elements.engagementsProgramSessions.innerHTML = "";
    if (elements.engagementsEventsChoiceSummary) elements.engagementsEventsChoiceSummary.textContent = "Aucune epreuve selectionnee.";
    if (elements.engagementsEventsMessage) elements.engagementsEventsMessage.textContent = "";
    setEngagementEventsSectionOpen(elements.engagementsEventsChoiceSection, false);
    setEngagementEventsSectionOpen(elements.engagementsProgramSection, false);
    if (elements.engagementsFeesForm) elements.engagementsFeesForm.reset();
    if (elements.engagementsFeesSummary) elements.engagementsFeesSummary.textContent = "Aucun frais renseigne.";
    if (elements.engagementsFeesMessage) elements.engagementsFeesMessage.textContent = "";
    if (elements.engagementsClubTeamForm) elements.engagementsClubTeamForm.reset();
    if (elements.engagementsClubTeamSummary) elements.engagementsClubTeamSummary.textContent = "A renseigner avant de commencer les engagements.";
    if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    if (elements.engagementsClubOfficialsSummary) elements.engagementsClubOfficialsSummary.textContent = "Aucun officiel selectionne.";
    if (elements.engagementsClubOfficialsList) elements.engagementsClubOfficialsList.innerHTML = "";
    if (elements.engagementsClubOfficialsMessage) elements.engagementsClubOfficialsMessage.textContent = "";
    if (elements.engagementsClubSwimmersSummary) elements.engagementsClubSwimmersSummary.textContent = "Aucun nageur selectionne.";
    if (elements.engagementsClubSwimmersSearch) elements.engagementsClubSwimmersSearch.value = "";
    if (elements.engagementsClubSwimmersList) elements.engagementsClubSwimmersList.innerHTML = "";
    if (elements.engagementsClubSwimmersMessage) elements.engagementsClubSwimmersMessage.textContent = "";
    if (elements.engagementsClubEntriesSummary) elements.engagementsClubEntriesSummary.textContent = "Aucune course selectionnee.";
    if (elements.engagementsClubEntriesList) elements.engagementsClubEntriesList.innerHTML = "";
    if (elements.engagementsClubEntriesMessage) elements.engagementsClubEntriesMessage.textContent = "";
    engagementClubRelaysDraft = [];
    if (elements.engagementsClubRelaysSummary) elements.engagementsClubRelaysSummary.textContent = "Aucun relais selectionne.";
    if (elements.engagementsClubRelaysList) elements.engagementsClubRelaysList.innerHTML = "";
    if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    if (elements.engagementsClubSummaryStatus) elements.engagementsClubSummaryStatus.textContent = "Recapitulatif a charger.";
    if (elements.engagementsClubSummaryList) elements.engagementsClubSummaryList.innerHTML = "";
    if (elements.engagementsClubSummaryRelays) elements.engagementsClubSummaryRelays.innerHTML = "";
    resetEngagementClubNewSwimmerForm();
    if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
    if (elements.engagementsDocumentsSummary) elements.engagementsDocumentsSummary.textContent = "Documents a preparer.";
    if (elements.engagementsComputerEmailLabel) elements.engagementsComputerEmailLabel.textContent = "Email informatique non renseigne";
    if (elements.engagementsDocumentsList) elements.engagementsDocumentsList.innerHTML = "";
    if (elements.engagementsClubRecapFiles) elements.engagementsClubRecapFiles.innerHTML = "";
    if (elements.engagementsGeneratedFiles) elements.engagementsGeneratedFiles.innerHTML = "";
    if (elements.engagementsDetailStatus) elements.engagementsDetailStatus.textContent = "";
    renderEngagementCompetitions();
  }

  async function loadEngagementCompetitionDetail(competitionId) {
    const cleanId = String(competitionId || "").trim();
    if (!cleanId) return;
    if (selectedEngagementCompetitionId && selectedEngagementCompetitionId !== cleanId && !confirmLeaveDirtyEngagementTab()) return;
    clearEngagementDetailTabDirty();
    selectedEngagementCompetitionId = cleanId;
    engagementClubRecapEntries = [];
    engagementClubRecapEntriesCompetitionId = "";
    engagementClubRecapEntriesLoading = false;
    renderEngagementCompetitions();
    setEngagementCompetitionDetailVisible(true);
    setEngagementsDetailTab("general");
    if (elements.engagementsDetailTitle) elements.engagementsDetailTitle.textContent = "Chargement...";
    if (elements.engagementsDetailSubtitle) elements.engagementsDetailSubtitle.textContent = "";
    if (elements.engagementsDetailMeta) elements.engagementsDetailMeta.innerHTML = "";
    if (elements.engagementsDetailStatus) {
      elements.engagementsDetailStatus.textContent = "Chargement de la fiche...";
      elements.engagementsDetailStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("getEngagementCompetition", { competitionId: cleanId });
      selectedEngagementCompetition = result.competition || null;
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty();
      if (!isEngagementAdminMode() && canUse("engagements.club.manage")) {
        await loadEngagementClubEntry(cleanId);
      } else {
        selectedEngagementClubEntry = null;
        renderEngagementClubEntry({});
      }
    } catch (error) {
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = `Fiche indisponible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
    }
  }

  async function loadEngagementClubEntry(competitionId = selectedEngagementCompetitionId) {
    const cleanId = String(competitionId || "").trim();
    if (!cleanId || !canUse("engagements.club.manage")) return;
    await loadEngagementClubPeople({ silent: true });
    if (elements.engagementsClubTeamMessage) {
      elements.engagementsClubTeamMessage.textContent = "Chargement de votre inscription club...";
      elements.engagementsClubTeamMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("getEngagementClubEntry", { competitionId: cleanId });
      selectedEngagementClubEntry = result.entry || {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = engagementClubTeamComplete() ? "Etape chef d'equipe validee." : "";
        elements.engagementsClubTeamMessage.dataset.tone = "ok";
      }
    } catch (error) {
      selectedEngagementClubEntry = {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = `Inscription club indisponible : ${error?.message || error}`;
        elements.engagementsClubTeamMessage.dataset.tone = "error";
      }
    }
  }

  async function saveEngagementClubTeamLeader(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    updateEngagementClubTeamFormMode();
    if (elements.engagementsClubTeamForm && !elements.engagementsClubTeamForm.checkValidity()) {
      elements.engagementsClubTeamForm.reportValidity?.();
      return;
    }
    if (elements.engagementsClubTeamSaveButton) elements.engagementsClubTeamSaveButton.disabled = true;
    if (elements.engagementsClubTeamMessage) {
      elements.engagementsClubTeamMessage.textContent = "Enregistrement du chef d'equipe...";
      elements.engagementsClubTeamMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("saveEngagementClubTeamLeader", {
        competitionId: selectedEngagementCompetitionId,
        teamLeader: selectedEngagementTeamLeaderFromForm()
      });
      selectedEngagementClubEntry = result.entry || {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = "Etape chef d'equipe enregistree. Vous pouvez continuer les engagements.";
        elements.engagementsClubTeamMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsClubTeamMessage.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsClubTeamSaveButton) elements.engagementsClubTeamSaveButton.disabled = false;
    }
  }

  async function saveEngagementClubOfficials(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    if (!engagementClubTeamComplete()) {
      if (elements.engagementsClubOfficialsMessage) {
        elements.engagementsClubOfficialsMessage.textContent = "Validez le chef d'equipe ou la renonciation avant les officiels.";
        elements.engagementsClubOfficialsMessage.dataset.tone = "error";
      }
      return;
    }
    if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.disabled = true;
    if (elements.engagementsClubOfficialsMessage) {
      elements.engagementsClubOfficialsMessage.textContent = "Enregistrement des officiels...";
      elements.engagementsClubOfficialsMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("saveEngagementClubOfficials", {
        competitionId: selectedEngagementCompetitionId,
        officialPersonIds: selectedEngagementClubOfficialIds()
      });
      selectedEngagementClubEntry = result.entry || selectedEngagementClubEntry || {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubOfficialsMessage) {
        elements.engagementsClubOfficialsMessage.textContent = "Officiels enregistres.";
        elements.engagementsClubOfficialsMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubOfficialsMessage) {
        elements.engagementsClubOfficialsMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsClubOfficialsMessage.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.disabled = !engagementClubTeamComplete();
    }
  }

  async function loadEngagementClubSwimmers({ force = false, silent = false } = {}) {
    if (!canUse("engagements.club.manage") || engagementClubSwimmersLoading) return;
    const expectedClubId = engagementClubScope();
    if (engagementClubSwimmersClubId && expectedClubId && engagementClubSwimmersClubId !== expectedClubId) {
      engagementClubSwimmers = [];
      engagementClubSwimmersLoaded = false;
      engagementClubSwimmersClubId = "";
    }
    if (engagementClubSwimmersLoaded && !force) {
      renderEngagementClubSwimmers();
      renderEngagementClubSwimmersDirectory();
      return;
    }
    engagementClubSwimmersLoading = true;
    if (!silent && elements.engagementsClubSwimmersMessage) {
      elements.engagementsClubSwimmersMessage.textContent = "Chargement des nageurs du club...";
      elements.engagementsClubSwimmersMessage.dataset.tone = "loading";
    }
    renderEngagementClubSwimmers();
    renderEngagementClubSwimmersDirectory();
    try {
      const result = await callFunction("listEngagementClubSwimmers", { limit: 800 });
      const resultClubId = String(result.clubId || "").trim();
      if (expectedClubId && resultClubId && resultClubId !== expectedClubId) {
        throw new Error(`Profil club incoherent : ${resultClubId} retourne au lieu de ${expectedClubId}.`);
      }
      engagementClubSwimmers = Array.isArray(result.swimmers) ? result.swimmers : [];
      engagementClubSwimmersClubId = resultClubId || expectedClubId || "";
      engagementClubSwimmersLoaded = true;
      renderEngagementClubSwimmers();
      renderEngagementClubSwimmersDirectory();
      if (!silent && elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = `${engagementClubSwimmers.length} nageur${engagementClubSwimmers.length > 1 ? "s" : ""} connu${engagementClubSwimmers.length > 1 ? "s" : ""} charge${engagementClubSwimmers.length > 1 ? "s" : ""}.`;
        elements.engagementsClubSwimmersMessage.dataset.tone = "ok";
      }
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = engagementClubSwimmers.length
          ? `${engagementClubSwimmers.length} nageur${engagementClubSwimmers.length > 1 ? "s" : ""} charge${engagementClubSwimmers.length > 1 ? "s" : ""}.`
          : "Aucun nageur trouve pour ce club dans l'index LivePalmes.";
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = engagementClubSwimmers.length ? "ok" : "error";
      }
    } catch (error) {
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.engagementsClubSwimmersMessage.dataset.tone = "error";
      }
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
      }
      renderEngagementClubSwimmers();
      renderEngagementClubSwimmersDirectory();
    } finally {
      engagementClubSwimmersLoading = false;
      renderEngagementClubSwimmers();
      renderEngagementClubSwimmersDirectory();
    }
  }

  async function saveEngagementClubSwimmers(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    const fromEntries = event?.target === elements.engagementsClubEntriesForm;
    const messageElement = fromEntries ? elements.engagementsClubEntriesMessage : elements.engagementsClubSwimmersMessage;
    const saveButton = fromEntries ? elements.engagementsClubEntriesSaveButton : elements.engagementsClubSwimmersSaveButton;
    if (!engagementClubTeamComplete()) {
      if (messageElement) {
        messageElement.textContent = "Validez le chef d'equipe ou la renonciation avant les engagements.";
        messageElement.dataset.tone = "error";
      }
      return;
    }
    if (!engagementClubSwimmersLoaded) await loadEngagementClubSwimmers({ silent: true });
    const selectedSwimmers = selectedEngagementClubSwimmerRows();
    const missingLicense = selectedSwimmers.some((swimmer) => !swimmer.licenseNumber);
    if (missingLicense) {
      if (messageElement) {
        messageElement.textContent = "Numero de licence obligatoire pour chaque nageur selectionne.";
        messageElement.dataset.tone = "error";
      }
      elements.engagementsClubSwimmersForm?.reportValidity?.();
      return;
    }
    if (saveButton) saveButton.disabled = true;
    if (messageElement) {
      messageElement.textContent = fromEntries ? "Enregistrement des courses..." : "Enregistrement des nageurs...";
      messageElement.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("saveEngagementClubSwimmers", {
        competitionId: selectedEngagementCompetitionId,
        swimmers: selectedSwimmers
      });
      selectedEngagementClubEntry = result.entry || selectedEngagementClubEntry || {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (messageElement) {
        messageElement.textContent = fromEntries ? "Courses enregistrees." : "Nageurs enregistres.";
        messageElement.dataset.tone = "ok";
      }
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = `Enregistrement impossible : ${error?.message || error}`;
        messageElement.dataset.tone = "error";
      }
    } finally {
      if (saveButton) saveButton.disabled = !engagementClubTeamComplete();
    }
  }

  async function saveEngagementClubRelays(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    if (!engagementClubTeamComplete()) {
      if (elements.engagementsClubRelaysMessage) {
        elements.engagementsClubRelaysMessage.textContent = "Validez le chef d'equipe ou la renonciation avant les relais.";
        elements.engagementsClubRelaysMessage.dataset.tone = "error";
      }
      return;
    }
    engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom();
    if (elements.engagementsClubRelaysSaveButton) elements.engagementsClubRelaysSaveButton.disabled = true;
    if (elements.engagementsClubRelaysMessage) {
      elements.engagementsClubRelaysMessage.textContent = "Enregistrement des relais...";
      elements.engagementsClubRelaysMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("saveEngagementClubRelays", {
        competitionId: selectedEngagementCompetitionId,
        relays: engagementClubRelaysDraft
      });
      selectedEngagementClubEntry = result.entry || selectedEngagementClubEntry || {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubRelaysMessage) {
        elements.engagementsClubRelaysMessage.textContent = "Relais enregistres.";
        elements.engagementsClubRelaysMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubRelaysMessage) {
        elements.engagementsClubRelaysMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsClubRelaysMessage.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsClubRelaysSaveButton) elements.engagementsClubRelaysSaveButton.disabled = !engagementClubTeamComplete();
    }
  }

  async function downloadEngagementClubSummaryPdf() {
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    if (elements.engagementsClubSummaryPdfButton) elements.engagementsClubSummaryPdfButton.disabled = true;
    if (elements.engagementsClubSummaryStatus) {
      elements.engagementsClubSummaryStatus.textContent = "Generation du PDF en cours...";
      elements.engagementsClubSummaryStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("generateEngagementClubRecapPdf", {
        competitionId: selectedEngagementCompetitionId
      });
      if (!result.pdfBase64) throw new Error("PDF non retourne par le serveur.");
      downloadBase64File(result.pdfBase64, result.fileName || "recap-engagements-livepalmes.pdf", result.contentType || "application/pdf");
      if (elements.engagementsClubSummaryStatus) {
        elements.engagementsClubSummaryStatus.textContent = "PDF genere et telecharge.";
        elements.engagementsClubSummaryStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubSummaryStatus) {
        elements.engagementsClubSummaryStatus.textContent = `Generation PDF impossible : ${error?.message || error}`;
        elements.engagementsClubSummaryStatus.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsClubSummaryPdfButton) {
        elements.engagementsClubSummaryPdfButton.disabled = !engagementClubTeamComplete();
      }
    }
  }

  async function downloadEngagementAdminClubRecapPdf(clubId) {
    const cleanClubId = String(clubId || "").trim();
    if (!selectedEngagementCompetitionId || !cleanClubId || !isEngagementAdminMode()) return;
    const escapedClubId = global.CSS?.escape ? global.CSS.escape(cleanClubId) : cleanClubId.replace(/"/g, "\\\"");
    const button = elements.engagementsClubRecapFiles?.querySelector(`[data-engagement-admin-club-pdf="${escapedClubId}"]`);
    if (button) button.disabled = true;
    try {
      const result = await callFunction("generateEngagementClubRecapPdfForAdmin", {
        competitionId: selectedEngagementCompetitionId,
        clubId: cleanClubId
      });
      if (!result.pdfBase64) throw new Error("PDF non retourne par le serveur.");
      downloadBase64File(result.pdfBase64, result.fileName || "recap-engagements-livepalmes.pdf", result.contentType || "application/pdf");
    } catch (error) {
      if (elements.engagementsClubRecapFiles) {
        elements.engagementsClubRecapFiles.insertAdjacentHTML(
          "afterbegin",
          `<p class="admin-portal-message" data-tone="error">Generation PDF impossible : ${escapeHtml(error?.message || error)}</p>`
        );
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  function selectedEngagementClubNewSwimmerFromForm() {
    return {
      firstName: String(elements.engagementsClubNewSwimmerFirstName?.value || "").trim(),
      lastName: String(elements.engagementsClubNewSwimmerLastName?.value || "").trim(),
      birthDate: String(elements.engagementsClubNewSwimmerBirthDate?.value || "").trim(),
      sex: String(elements.engagementsClubNewSwimmerSex?.value || "").trim(),
      licenseNumber: String(elements.engagementsClubNewSwimmerLicense?.value || "").trim()
    };
  }

  function resetEngagementClubNewSwimmerForm() {
    [
      elements.engagementsClubNewSwimmerFirstName,
      elements.engagementsClubNewSwimmerLastName,
      elements.engagementsClubNewSwimmerBirthDate,
      elements.engagementsClubNewSwimmerSex,
      elements.engagementsClubNewSwimmerLicense
    ].forEach((field) => {
      if (field) field.value = "";
    });
  }

  function renderEngagementClubNewSwimmerAlerts(alerts = [], { confirmed = false } = {}) {
    const mount = elements.engagementsClubNewSwimmerAlerts;
    if (!mount) return;
    if (!alerts.length) {
      mount.innerHTML = '<p class="admin-portal-message" data-tone="ok">Aucune ressemblance forte detectee.</p>';
      return;
    }
    mount.innerHTML = `
      <p class="admin-portal-message" data-tone="error">${confirmed
        ? `Alerte : ${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouve${alerts.length > 1 ? "s" : ""}. Le nageur est cree, l'alerte est tracee comme validee par le club.`
        : `Alerte : ${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouve${alerts.length > 1 ? "s" : ""}. Confirmez la creation uniquement si ce nageur est bien nouveau pour votre club.`}</p>
      <div class="admin-engagements-club-swimmer-alert-list">
        ${alerts.map((alert) => `
          <article>
            <strong>${escapeHtml(alert.message || "Rapprochement possible")}</strong>
            <small>${escapeHtml([
              alert.name,
              alert.birthDate ? formatShortDate(alert.birthDate) : "",
              alert.clubId ? `Club ${alert.clubId}` : "",
              alert.clubName || "",
              alert.latestDate ? `dernier resultat ${formatShortDate(alert.latestDate)}` : ""
            ].filter(Boolean).join(" - "))}</small>
          </article>
        `).join("")}
      </div>
    `;
  }

  function engagementClubNewSwimmerConfirmationMessage(alerts = []) {
    const preview = alerts.slice(0, 3).map((alert) => [
      alert.name || "Nageur rapproche",
      alert.birthDate ? formatShortDate(alert.birthDate) : "",
      alert.clubId ? `club ${alert.clubId}` : "",
      alert.clubName || ""
    ].filter(Boolean).join(" - ")).join("\n");
    return [
      `${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouve${alerts.length > 1 ? "s" : ""}.`,
      preview,
      alerts.length > 3 ? `+ ${alerts.length - 3} autre${alerts.length - 3 > 1 ? "s" : ""} rapprochement${alerts.length - 3 > 1 ? "s" : ""}.` : "",
      "Confirmer la creation de ce nageur ? Cette validation sera tracee."
    ].filter(Boolean).join("\n\n");
  }

  async function createEngagementClubSwimmer() {
    if (!canUse("engagements.club.manage")) return;
    const swimmer = selectedEngagementClubNewSwimmerFromForm();
    if (!swimmer.firstName || !swimmer.lastName || !swimmer.birthDate || !swimmer.sex || !swimmer.licenseNumber) {
      if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "Prenom, nom, date de naissance, sexe et licence sont obligatoires pour creer un nageur.";
        elements.engagementsClubSwimmersMessage.dataset.tone = "error";
      }
      return;
    }
    if (elements.engagementsClubNewSwimmerSaveButton) elements.engagementsClubNewSwimmerSaveButton.disabled = true;
    if (elements.engagementsClubSwimmersMessage) {
      elements.engagementsClubSwimmersMessage.textContent = "Verification des rapprochements...";
      elements.engagementsClubSwimmersMessage.dataset.tone = "loading";
    }
    try {
      const preview = await callFunction("previewEngagementClubSwimmerCreation", {
        swimmer
      });
      const alerts = Array.isArray(preview.alerts) ? preview.alerts : [];
      renderEngagementClubNewSwimmerAlerts(alerts, { confirmed: false });
      if (alerts.length && !global.confirm(engagementClubNewSwimmerConfirmationMessage(alerts))) {
        if (elements.engagementsClubSwimmersMessage) {
          elements.engagementsClubSwimmersMessage.textContent = "Creation annulee : rapprochement a verifier.";
          elements.engagementsClubSwimmersMessage.dataset.tone = "error";
        }
        return;
      }
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "Creation du nageur...";
        elements.engagementsClubSwimmersMessage.dataset.tone = "loading";
      }
      const result = await callFunction("createEngagementClubSwimmer", {
        competitionId: selectedEngagementCompetitionId || "",
        swimmer,
        confirmAlerts: alerts.length > 0
      });
      engagementClubSwimmersLoaded = false;
      await loadEngagementClubSwimmers({ force: true, silent: true });
      renderEngagementClubNewSwimmerAlerts(Array.isArray(result.alerts) ? result.alerts : [], { confirmed: true });
      resetEngagementClubNewSwimmerForm();
      if (elements.engagementsClubSwimmersSearch) {
        elements.engagementsClubSwimmersSearch.value = result.swimmer?.lastName || swimmer.lastName || "";
        renderEngagementClubSwimmers();
      }
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "Nageur cree. Vous pouvez maintenant le selectionner dans la liste.";
        elements.engagementsClubSwimmersMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = `Creation impossible : ${error?.message || error}`;
        elements.engagementsClubSwimmersMessage.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsClubNewSwimmerSaveButton) elements.engagementsClubNewSwimmerSaveButton.disabled = false;
    }
  }

  async function deleteOrRequestEngagementCompetitionDeletion() {
    if (!selectedEngagementCompetition?.id || !canEditEngagementCompetition(selectedEngagementCompetition)) return;
    if (engagementDetailEditing && !confirmLeaveDirtyEngagementTab()) return;

    const competition = selectedEngagementCompetition;
    const directDelete = canDeleteEngagementCompetitionDirectly();
    const actionLabel = directDelete ? "Supprimer definitivement" : "Demander la suppression de";
    const confirmMessage = directDelete
      ? `${actionLabel} la competition "${competition.name || "sans nom"}" ? Cette action est irreversible.`
      : `${actionLabel} la competition "${competition.name || "sans nom"}" ? Un administrateur national devra valider la suppression.`;
    if (!global.confirm(confirmMessage)) return;

    if (elements.engagementsDeleteButton) elements.engagementsDeleteButton.disabled = true;
    if (elements.engagementsDetailStatus) {
      elements.engagementsDetailStatus.textContent = directDelete
        ? "Suppression de la competition..."
        : "Envoi de la demande de suppression...";
      elements.engagementsDetailStatus.dataset.tone = "loading";
    }

    try {
      await callFunction(directDelete ? "deleteEngagementCompetition" : "requestEngagementCompetitionDeletion", {
        competitionId: competition.id
      });
      engagementCompetitionsLoaded = false;
      if (directDelete) {
        clearEngagementDetailTabDirty();
        closeEngagementCompetitionDetail();
        if (elements.engagementsStatus) {
          elements.engagementsStatus.hidden = false;
          elements.engagementsStatus.textContent = "Competition supprimee.";
          elements.engagementsStatus.dataset.tone = "ok";
        }
        await loadEngagementCompetitions({ force: true });
      } else if (elements.engagementsDetailStatus) {
        selectedEngagementCompetition = {
          ...selectedEngagementCompetition,
          deletionRequestStatus: "pending"
        };
        renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
        elements.engagementsDetailStatus.textContent = "Demande de suppression envoyee au niveau national.";
        elements.engagementsDetailStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsDeleteButton) elements.engagementsDeleteButton.disabled = false;
    }
  }

  function updateEngagementAccessRequestBadge(count = engagementAccessRequests.length) {
    if (!elements.engagementsAccessRequestsBadge) return;
    const visible = canReviewEngagementAccessRequests() && Number(count) > 0;
    elements.engagementsAccessRequestsBadge.hidden = !visible;
    elements.engagementsAccessRequestsBadge.textContent = String(Math.min(99, Math.max(0, Number(count) || 0)));
  }

  function renderEngagementAccessRequests() {
    if (!elements.engagementsAccessRequestsList) return;
    if (!canReviewEngagementAccessRequests()) {
      elements.engagementsAccessRequestsList.innerHTML = "";
      return;
    }
    if (!engagementAccessRequests.length) {
      elements.engagementsAccessRequestsList.innerHTML = '<p class="admin-engagements-empty">Aucune demande d\'acces en attente.</p>';
      closeEngagementAccessRequestEditForm();
      return;
    }
    elements.engagementsAccessRequestsList.innerHTML = engagementAccessRequests.map((request) => {
      const name = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "Demande sans nom";
      return `
        <article class="admin-engagements-request-card" data-engagement-access-request-id="${escapeHtml(request.id || "")}">
          <div class="admin-engagements-request-main">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml([request.email, request.licenseNumber ? `Licence ${request.licenseNumber}` : ""].filter(Boolean).join(" - "))}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>${escapeHtml([request.clubId ? `Club ${request.clubId}` : "", request.clubName || ""].filter(Boolean).join(" - ") || "Club non renseigne")}</span>
            <span>${escapeHtml(regionDisplayLabel(request.regionId) || "Region non renseignee")}</span>
            <span>${escapeHtml(request.requestedAt ? formatDeadline(request.requestedAt).replace(/^Limite /, "") : "-")}</span>
          </div>
          <div class="admin-engagements-request-actions">
            <button class="ghost-button" type="button" data-engagement-access-request-action="edit" data-engagement-access-request-id="${escapeHtml(request.id || "")}">Modifier / valider</button>
            <button class="ghost-button" type="button" data-engagement-access-request-action="reject" data-engagement-access-request-id="${escapeHtml(request.id || "")}">Refuser</button>
          </div>
          ${request.message ? `<p class="admin-engagements-request-note">${escapeHtml(request.message)}</p>` : ""}
        </article>
      `;
    }).join("");
  }

  async function loadEngagementAccessRequests({ force = false, silent = false } = {}) {
    if (!canReviewEngagementAccessRequests() || engagementAccessRequestsLoading) return;
    if (engagementAccessRequestsLoaded && !force) return;
    engagementAccessRequestsLoading = true;
    if (elements.engagementsAccessRequestsRefresh) elements.engagementsAccessRequestsRefresh.disabled = true;
    if (elements.engagementsAccessRequestsStatus && !silent) {
      elements.engagementsAccessRequestsStatus.textContent = "Chargement des demandes...";
      elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementAccessRequests", { status: "pending", limit: 120 });
      engagementAccessRequests = Array.isArray(result.requests) ? result.requests : [];
      engagementAccessRequestsLoaded = true;
      updateEngagementAccessRequestBadge(engagementAccessRequests.length);
      renderEngagementAccessRequests();
      if (elements.engagementsAccessRequestsStatus && !silent) {
        elements.engagementsAccessRequestsStatus.textContent = `${engagementAccessRequests.length} demande${engagementAccessRequests.length > 1 ? "s" : ""} en attente.`;
        elements.engagementsAccessRequestsStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsAccessRequestsStatus && !silent) {
        elements.engagementsAccessRequestsStatus.textContent = `Lecture demandes impossible : ${error?.message || error}`;
        elements.engagementsAccessRequestsStatus.dataset.tone = "error";
      }
    } finally {
      engagementAccessRequestsLoading = false;
      if (elements.engagementsAccessRequestsRefresh) elements.engagementsAccessRequestsRefresh.disabled = false;
    }
  }

  function setEngagementAccessRequestEditMessage(message, tone = "error") {
    if (!elements.engagementsAccessRequestEditMessage) return;
    elements.engagementsAccessRequestEditMessage.textContent = message || "";
    elements.engagementsAccessRequestEditMessage.dataset.tone = tone;
  }

  function closeEngagementAccessRequestEditForm() {
    elements.engagementsAccessRequestEditForm?.reset();
    if (elements.engagementsAccessRequestEditForm) elements.engagementsAccessRequestEditForm.hidden = true;
    setEngagementAccessRequestEditMessage("");
  }

  function openEngagementAccessRequestEditForm(requestId) {
    const request = engagementAccessRequests.find((item) => item.id === requestId);
    if (!request || !elements.engagementsAccessRequestEditForm) return;
    if (elements.engagementsAccessRequestEditId) elements.engagementsAccessRequestEditId.value = request.id || "";
    if (elements.engagementsAccessRequestEditFirstName) elements.engagementsAccessRequestEditFirstName.value = request.firstName || "";
    if (elements.engagementsAccessRequestEditLastName) elements.engagementsAccessRequestEditLastName.value = request.lastName || "";
    if (elements.engagementsAccessRequestEditEmail) elements.engagementsAccessRequestEditEmail.value = request.email || "";
    if (elements.engagementsAccessRequestEditLicenseNumber) elements.engagementsAccessRequestEditLicenseNumber.value = request.licenseNumber || "";
    setRegionSelectValue(elements.engagementsAccessRequestEditRegionId, request.regionId || "");
    if (elements.engagementsAccessRequestEditRegionId) {
      elements.engagementsAccessRequestEditRegionId.disabled = !canUse("engagements.national.manage");
    }
    populateEngagementAccessRequestEditClubSelect(request.clubId || "", request.clubName || "");
    elements.engagementsAccessRequestEditForm.hidden = false;
    setEngagementAccessRequestEditMessage("Verifiez les informations avant validation.", "loading");
    elements.engagementsAccessRequestEditForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function correctedEngagementAccessRequestFromEditForm() {
    return {
      firstName: String(elements.engagementsAccessRequestEditFirstName?.value || "").trim(),
      lastName: String(elements.engagementsAccessRequestEditLastName?.value || "").trim(),
      email: String(elements.engagementsAccessRequestEditEmail?.value || "").trim(),
      licenseNumber: String(elements.engagementsAccessRequestEditLicenseNumber?.value || "").trim(),
      regionId: elements.engagementsAccessRequestEditRegionId?.value || "",
      clubId: elements.engagementsAccessRequestEditClubId?.value || "",
      clubName: elements.engagementsAccessRequestEditClubName?.value || ""
    };
  }

  async function resolveEngagementAccessRequest(requestId, decision, correctedRequest = null) {
    const cleanId = String(requestId || "").trim();
    if (!cleanId || !canReviewEngagementAccessRequests()) return;
    const request = engagementAccessRequests.find((item) => item.id === cleanId) || {};
    const approve = decision === "approved";
    const label = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "cette demande";
    const message = approve
      ? `Valider la demande de ${label} et creer l'acces engagements club ?`
      : `Refuser la demande de ${label} ?`;
    if (!global.confirm(message)) return false;
    if (elements.engagementsAccessRequestsStatus) {
      elements.engagementsAccessRequestsStatus.textContent = approve ? "Validation en cours..." : "Refus en cours...";
      elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("resolveEngagementAccessRequest", {
        requestId: cleanId,
        decision: approve ? "approved" : "rejected",
        ...(approve && correctedRequest ? { correctedRequest } : {})
      });
      if (approve && result.access?.email) {
        await global.firebase?.auth?.().sendPasswordResetEmail(result.access.email).catch(() => {});
      }
      engagementAccessRequestsLoaded = false;
      if (canManageAccessDirectory()) loadAccessUsers({ reset: true });
      await loadEngagementAccessRequests({ force: true });
      if (elements.engagementsAccessRequestsStatus) {
        elements.engagementsAccessRequestsStatus.textContent = approve
          ? "Demande validee. L'acces club est actif et un email de mot de passe a ete envoye si possible."
          : "Demande refusee.";
        elements.engagementsAccessRequestsStatus.dataset.tone = "ok";
      }
      return true;
    } catch (error) {
      if (elements.engagementsAccessRequestsStatus) {
        elements.engagementsAccessRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
        elements.engagementsAccessRequestsStatus.dataset.tone = "error";
      }
      setEngagementAccessRequestEditMessage(`Validation impossible : ${error?.message || error}`);
      return false;
    }
  }

  async function submitEngagementAccessRequestEdit(event) {
    event?.preventDefault?.();
    const requestId = elements.engagementsAccessRequestEditId?.value || "";
    if (!requestId) return;
    const button = elements.engagementsAccessRequestEditForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setEngagementAccessRequestEditMessage("Validation en cours...", "loading");
    try {
      const ok = await resolveEngagementAccessRequest(requestId, "approved", correctedEngagementAccessRequestFromEditForm());
      if (ok) closeEngagementAccessRequestEditForm();
    } finally {
      if (button) button.disabled = false;
    }
  }

  function accessRequestPayloadFromForm() {
    return {
      firstName: String(elements.accessRequestFirstName?.value || "").trim(),
      lastName: String(elements.accessRequestLastName?.value || "").trim(),
      email: String(elements.accessRequestEmail?.value || "").trim(),
      licenseNumber: String(elements.accessRequestLicenseNumber?.value || "").trim(),
      regionId: elements.accessRequestRegionId?.value || "",
      clubId: elements.accessRequestClubId?.value || "",
      clubName: elements.accessRequestClubName?.value || "",
      message: String(elements.accessRequestText?.value || "").trim()
    };
  }

  function publicAccessRequestPayloadFromForm() {
    return {
      firstName: String(elements.publicAccessRequestFirstName?.value || "").trim(),
      lastName: String(elements.publicAccessRequestLastName?.value || "").trim(),
      email: String(elements.publicAccessRequestEmail?.value || "").trim(),
      licenseNumber: String(elements.publicAccessRequestLicenseNumber?.value || "").trim(),
      regionId: elements.publicAccessRequestRegionId?.value || "",
      clubId: elements.publicAccessRequestClubId?.value || "",
      clubName: elements.publicAccessRequestClubName?.value || "",
      message: String(elements.publicAccessRequestText?.value || "").trim()
    };
  }

  async function submitEngagementAccessRequest(event) {
    event?.preventDefault?.();
    const button = elements.accessRequestForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setAccessRequestMessage("Envoi de la demande...", "loading");
    try {
      await callFunction("submitEngagementAccessRequest", accessRequestPayloadFromForm());
      elements.accessRequestForm?.reset();
      if (elements.accessRequestEmail) elements.accessRequestEmail.value = ensureAdminAuth()?.status?.().email || "";
      populateAccessRequestClubSelect();
      engagementAccessRequestsLoaded = false;
      setAccessRequestMessage("Demande envoyee. Elle doit maintenant etre validee par la region ou le niveau national.", "ok");
    } catch (error) {
      setAccessRequestMessage(`Demande impossible : ${error?.message || error}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function submitPublicEngagementAccessRequest(event) {
    event?.preventDefault?.();
    const button = elements.publicAccessRequestForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setPublicAccessRequestMessage("Envoi de la demande...", "loading");
    try {
      await callFunction("submitEngagementAccessRequest", publicAccessRequestPayloadFromForm());
      elements.publicAccessRequestForm?.reset();
      populatePublicAccessRequestClubSelect();
      engagementAccessRequestsLoaded = false;
      setPublicAccessRequestMessage("Demande envoyee. Elle doit maintenant etre validee par la region ou le niveau national.", "ok");
    } catch (error) {
      setPublicAccessRequestMessage(`Demande impossible : ${error?.message || error}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderEngagementDeletionRequests() {
    if (!elements.engagementsDeletionRequestsList) return;
    if (!canDeleteEngagementCompetitionDirectly()) {
      elements.engagementsDeletionRequestsList.innerHTML = "";
      return;
    }
    if (!engagementDeletionRequests.length) {
      elements.engagementsDeletionRequestsList.innerHTML = '<p class="admin-engagements-empty">Aucune demande de suppression en attente.</p>';
      return;
    }
    elements.engagementsDeletionRequestsList.innerHTML = engagementDeletionRequests.map((request) => `
      <article class="admin-engagements-request-card" data-engagement-deletion-request-id="${escapeHtml(request.id || request.competitionId || "")}">
        <div class="admin-engagements-request-main">
          <strong>${escapeHtml(request.competitionName || "Competition sans nom")}</strong>
          <small>${escapeHtml([
            request.competitionDate ? formatShortDate(request.competitionDate) : "",
            engagementLevelLabel(request.competitionLevel),
            request.regionId ? regionDisplayLabel(request.regionId) : ""
          ].filter(Boolean).join(" - "))}</small>
        </div>
        <div class="admin-engagements-request-meta">
          <span>Demandee par ${escapeHtml(request.requestedByEmail || request.requestedBy || "-")}</span>
          <span>${escapeHtml(request.requestedAt ? formatDeadline(request.requestedAt).replace(/^Limite /, "") : "-")}</span>
        </div>
        <div class="admin-engagements-request-actions">
          <button class="ghost-button" type="button" data-engagement-deletion-action="view" data-engagement-competition-id="${escapeHtml(request.competitionId || "")}">Voir</button>
          <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-deletion-action="approve" data-engagement-deletion-request-id="${escapeHtml(request.id || request.competitionId || "")}">Approuver</button>
          <button class="ghost-button" type="button" data-engagement-deletion-action="reject" data-engagement-deletion-request-id="${escapeHtml(request.id || request.competitionId || "")}">Refuser</button>
        </div>
      </article>
    `).join("");
  }

  async function loadEngagementDeletionRequests({ force = false, silent = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementDeletionRequestsLoading) return;
    if (engagementDeletionRequestsLoaded && !force) return;
    engagementDeletionRequestsLoading = true;
    if (elements.engagementsDeletionRequestsRefresh) elements.engagementsDeletionRequestsRefresh.disabled = true;
    if (elements.engagementsDeletionRequestsStatus && !silent) {
      elements.engagementsDeletionRequestsStatus.textContent = "Chargement des demandes...";
      elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementCompetitionDeletionRequests", { status: "pending", limit: 50 });
      engagementDeletionRequests = Array.isArray(result.requests) ? result.requests : [];
      engagementDeletionRequestsLoaded = true;
      updateEngagementDeletionRequestBadge(engagementDeletionRequests.length);
      renderEngagementDeletionRequests();
      if (elements.engagementsDeletionRequestsStatus && !silent) {
        elements.engagementsDeletionRequestsStatus.textContent = `${engagementDeletionRequests.length} demande${engagementDeletionRequests.length > 1 ? "s" : ""} en attente.`;
        elements.engagementsDeletionRequestsStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsDeletionRequestsStatus && !silent) {
        elements.engagementsDeletionRequestsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.engagementsDeletionRequestsStatus.dataset.tone = "error";
      }
    } finally {
      engagementDeletionRequestsLoading = false;
      if (elements.engagementsDeletionRequestsRefresh) elements.engagementsDeletionRequestsRefresh.disabled = false;
    }
  }

  function updateEngagementDeletionRequestBadge(count = engagementDeletionRequests.length) {
    if (!elements.engagementsDeletionRequestsBadge) return;
    const visible = canDeleteEngagementCompetitionDirectly() && Number(count) > 0;
    elements.engagementsDeletionRequestsBadge.hidden = !visible;
    elements.engagementsDeletionRequestsBadge.textContent = String(Math.min(99, Math.max(0, Number(count) || 0)));
  }

  async function resolveEngagementDeletionRequest(requestId, decision) {
    const cleanId = String(requestId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const approve = decision === "approved";
    const message = approve
      ? "Approuver cette demande et supprimer definitivement la competition ?"
      : "Refuser cette demande de suppression ?";
    if (!global.confirm(message)) return;
    if (elements.engagementsDeletionRequestsStatus) {
      elements.engagementsDeletionRequestsStatus.textContent = approve ? "Suppression en cours..." : "Refus en cours...";
      elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("resolveEngagementCompetitionDeletionRequest", {
        requestId: cleanId,
        decision: approve ? "approved" : "rejected"
      });
      engagementDeletionRequestsLoaded = false;
      engagementCompetitionsLoaded = false;
      await loadEngagementDeletionRequests({ force: true });
      if (approve) {
        closeEngagementCompetitionDetail();
        await loadEngagementCompetitions({ force: true });
      }
    } catch (error) {
      if (elements.engagementsDeletionRequestsStatus) {
        elements.engagementsDeletionRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
        elements.engagementsDeletionRequestsStatus.dataset.tone = "error";
      }
    }
  }

  function renderEngagementNationalSwimmers() {
    if (!elements.engagementsNationalSwimmersList) return;
    if (!canDeleteEngagementCompetitionDirectly()) {
      elements.engagementsNationalSwimmersList.innerHTML = "";
      return;
    }
    if (!engagementNationalSwimmers.length) {
      elements.engagementsNationalSwimmersList.innerHTML = '<p class="admin-engagements-empty">Aucun nageur cree par un club.</p>';
      return;
    }
    elements.engagementsNationalSwimmersList.innerHTML = engagementNationalSwimmers.map((swimmer) => {
      const active = swimmer.active !== false;
      const name = [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || swimmer.name || "Nageur sans nom";
      const statusLabel = active ? "Actif" : "Desactive";
      return `
        <article class="admin-engagements-request-card admin-engagements-national-swimmer-card" data-engagement-national-swimmer-id="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-active="${active ? "true" : "false"}">
          <div class="admin-engagements-request-main">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml([
              swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "",
              swimmer.sex || "",
              swimmer.licenseNumber ? `Licence ${swimmer.licenseNumber}` : ""
            ].filter(Boolean).join(" - "))}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>${escapeHtml([swimmer.clubId ? `Club ${swimmer.clubId}` : "", swimmer.clubName || ""].filter(Boolean).join(" - ") || "Club non renseigne")}</span>
            <span>${escapeHtml(`${statusLabel} - ${Number(swimmer.alertCount || 0)} alerte${Number(swimmer.alertCount || 0) > 1 ? "s" : ""}`)}</span>
            <span>${escapeHtml(swimmer.updatedAt ? `MAJ ${formatDeadline(swimmer.updatedAt).replace(/^Limite /, "")}` : "")}</span>
          </div>
          <div class="admin-engagements-request-actions">
            <button class="ghost-button" type="button" data-engagement-national-swimmer-action="${active ? "disable" : "enable"}" data-engagement-national-swimmer-id="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}">${active ? "Desactiver" : "Reactiver"}</button>
            <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-national-swimmer-action="delete" data-engagement-national-swimmer-id="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}">Supprimer definitivement</button>
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadEngagementNationalSwimmers({ force = false, silent = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementNationalSwimmersLoading) return;
    if (engagementNationalSwimmersLoaded && !force) return;
    engagementNationalSwimmersLoading = true;
    if (elements.engagementsNationalSwimmersRefresh) elements.engagementsNationalSwimmersRefresh.disabled = true;
    if (elements.engagementsNationalSwimmersStatus && !silent) {
      elements.engagementsNationalSwimmersStatus.textContent = "Chargement des nageurs...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementNationalClubSwimmers", { limit: 120 });
      engagementNationalSwimmers = Array.isArray(result.swimmers) ? result.swimmers : [];
      engagementNationalSwimmersLoaded = true;
      renderEngagementNationalSwimmers();
      if (elements.engagementsNationalSwimmersStatus && !silent) {
        elements.engagementsNationalSwimmersStatus.textContent = `${engagementNationalSwimmers.length} nageur${engagementNationalSwimmers.length > 1 ? "s" : ""} cree${engagementNationalSwimmers.length > 1 ? "s" : ""} par les clubs.`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus && !silent) {
        elements.engagementsNationalSwimmersStatus.textContent = `Lecture nageurs impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    } finally {
      engagementNationalSwimmersLoading = false;
      if (elements.engagementsNationalSwimmersRefresh) elements.engagementsNationalSwimmersRefresh.disabled = false;
    }
  }

  async function setEngagementNationalSwimmerStatus(swimmerId, active) {
    const cleanId = String(swimmerId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const swimmer = engagementNationalSwimmers.find((item) => item.id === cleanId || item.swimmerIndexId === cleanId) || {};
    const name = [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || swimmer.name || "ce nageur";
    const message = active
      ? `Reactiver ${name} ? Il redeviendra utilisable par son club.`
      : `Desactiver ${name} ? Il ne sera plus proposable dans les engagements du club.`;
    if (!global.confirm(message)) return;
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = active ? "Reactivation en cours..." : "Desactivation en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("setEngagementNationalClubSwimmerStatus", {
        swimmerId: cleanId,
        active
      });
      engagementNationalSwimmersLoaded = false;
      engagementClubSwimmersLoaded = false;
      await loadEngagementNationalSwimmers({ force: true });
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Action impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    }
  }

  async function deleteEngagementNationalSwimmer(swimmerId) {
    const cleanId = String(swimmerId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const swimmer = engagementNationalSwimmers.find((item) => item.id === cleanId || item.swimmerIndexId === cleanId) || {};
    const name = [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || swimmer.name || "ce nageur";
    if (!global.confirm(`Supprimer definitivement ${name} de la base des nageurs crees par les clubs ? Cette action est irreversible.`)) return;
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = "Suppression definitive en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("deleteEngagementNationalClubSwimmer", {
        swimmerId: cleanId,
        confirmPermanent: true
      });
      engagementNationalSwimmersLoaded = false;
      engagementClubSwimmersLoaded = false;
      await loadEngagementNationalSwimmers({ force: true });
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    }
  }

  function engagementClubPersonRoleLabel(person = {}) {
    const roles = [];
    if (person.roles?.teamLeader) roles.push("Chef d'equipe");
    if (person.roles?.official) roles.push("Officiel");
    return roles.join(" - ") || "-";
  }

  function resetEngagementClubPersonForm() {
    elements.engagementsClubPersonForm?.reset();
    if (elements.engagementsClubPersonId) elements.engagementsClubPersonId.value = "";
    if (elements.engagementsClubPersonRoleTeamLeader) elements.engagementsClubPersonRoleTeamLeader.checked = true;
    if (elements.engagementsClubPersonRoleOfficial) elements.engagementsClubPersonRoleOfficial.checked = false;
    if (elements.engagementsClubPersonMessage) elements.engagementsClubPersonMessage.textContent = "";
  }

  function openEngagementClubPersonForm(person = null) {
    resetEngagementClubPersonForm();
    if (person) {
      if (elements.engagementsClubPersonId) elements.engagementsClubPersonId.value = person.id || "";
      if (elements.engagementsClubPersonFirstName) elements.engagementsClubPersonFirstName.value = person.firstName || "";
      if (elements.engagementsClubPersonLastName) elements.engagementsClubPersonLastName.value = person.lastName || "";
      if (elements.engagementsClubPersonLicense) elements.engagementsClubPersonLicense.value = person.licenseNumber || "";
      if (elements.engagementsClubPersonRoleTeamLeader) elements.engagementsClubPersonRoleTeamLeader.checked = person.roles?.teamLeader === true;
      if (elements.engagementsClubPersonRoleOfficial) elements.engagementsClubPersonRoleOfficial.checked = person.roles?.official === true;
    }
    if (elements.engagementsClubPersonForm) elements.engagementsClubPersonForm.hidden = false;
    elements.engagementsClubPersonFirstName?.focus?.();
  }

  function selectedEngagementClubPersonFromForm() {
    return {
      firstName: String(elements.engagementsClubPersonFirstName?.value || "").trim(),
      lastName: String(elements.engagementsClubPersonLastName?.value || "").trim(),
      licenseNumber: String(elements.engagementsClubPersonLicense?.value || "").trim(),
      roles: {
        teamLeader: elements.engagementsClubPersonRoleTeamLeader?.checked === true,
        official: elements.engagementsClubPersonRoleOfficial?.checked === true
      }
    };
  }

  function renderEngagementClubPeople() {
    if (!elements.engagementsClubPeopleList) return;
    if (!engagementClubPeople.length) {
      elements.engagementsClubPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ou chef d\'equipe enregistre pour ce club.</p>';
      return;
    }
    elements.engagementsClubPeopleList.innerHTML = engagementClubPeople.map((person) => `
      <article class="admin-engagements-club-person-card" data-engagement-club-person-id="${escapeHtml(person.id)}" data-active="${person.active ? "true" : "false"}">
        <div>
          <strong>${escapeHtml([person.firstName, person.lastName].filter(Boolean).join(" ") || "Personne sans nom")}</strong>
          <small>Licence ${escapeHtml(person.licenseNumber || "-")}</small>
        </div>
        <span>${escapeHtml(engagementClubPersonRoleLabel(person))}</span>
        <div class="admin-engagements-request-actions">
          <button class="ghost-button" type="button" data-engagement-club-person-action="edit" data-engagement-club-person-id="${escapeHtml(person.id)}">Modifier</button>
          <button class="ghost-button" type="button" data-engagement-club-person-action="${person.active ? "disable" : "enable"}" data-engagement-club-person-id="${escapeHtml(person.id)}">${person.active ? "Desactiver" : "Reactiver"}</button>
        </div>
      </article>
    `).join("");
  }

  async function loadEngagementClubPeople({ force = false, silent = false } = {}) {
    if (!canUse("engagements.club.manage") || engagementClubPeopleLoading) return;
    if (engagementClubPeopleLoaded && !force) return;
    engagementClubPeopleLoading = true;
    if (elements.engagementsClubPeopleRefresh) elements.engagementsClubPeopleRefresh.disabled = true;
    if (elements.engagementsClubPeopleStatus && !silent) {
      elements.engagementsClubPeopleStatus.textContent = "Chargement de Mes officiels...";
      elements.engagementsClubPeopleStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementClubPeople", { includeInactive: true });
      engagementClubPeople = Array.isArray(result.people) ? result.people : [];
      engagementClubPeopleLoaded = true;
      renderEngagementClubPeople();
      renderEngagementClubTeamPersonOptions(elements.engagementsClubTeamPersonSelect?.value || "");
      renderEngagementClubOfficials();
      if (elements.engagementsClubPeopleStatus && !silent) {
        const activeCount = engagementClubPeople.filter((person) => person.active).length;
        elements.engagementsClubPeopleStatus.textContent = `${activeCount} personne${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""}.`;
        elements.engagementsClubPeopleStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubPeopleStatus && !silent) {
        elements.engagementsClubPeopleStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.engagementsClubPeopleStatus.dataset.tone = "error";
      }
    } finally {
      engagementClubPeopleLoading = false;
      if (elements.engagementsClubPeopleRefresh) elements.engagementsClubPeopleRefresh.disabled = false;
    }
  }

  async function saveEngagementClubPerson(event) {
    event?.preventDefault?.();
    if (!canUse("engagements.club.manage")) return;
    if (!elements.engagementsClubPersonRoleTeamLeader?.checked && !elements.engagementsClubPersonRoleOfficial?.checked) {
      if (elements.engagementsClubPersonMessage) {
        elements.engagementsClubPersonMessage.textContent = "Selectionnez au moins un role.";
        elements.engagementsClubPersonMessage.dataset.tone = "error";
      }
      return;
    }
    if (elements.engagementsClubPersonForm && !elements.engagementsClubPersonForm.checkValidity()) {
      elements.engagementsClubPersonForm.reportValidity?.();
      return;
    }
    const button = elements.engagementsClubPersonForm?.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    if (elements.engagementsClubPersonMessage) {
      elements.engagementsClubPersonMessage.textContent = "Enregistrement...";
      elements.engagementsClubPersonMessage.dataset.tone = "loading";
    }
    try {
      await callFunction("saveEngagementClubPerson", {
        personId: elements.engagementsClubPersonId?.value || "",
        person: selectedEngagementClubPersonFromForm()
      });
      resetEngagementClubPersonForm();
      if (elements.engagementsClubPersonForm) elements.engagementsClubPersonForm.hidden = true;
      engagementClubPeopleLoaded = false;
      await loadEngagementClubPeople({ force: true });
      renderEngagementClubTeamPersonOptions(elements.engagementsClubTeamPersonSelect?.value || "");
    } catch (error) {
      if (elements.engagementsClubPersonMessage) {
        elements.engagementsClubPersonMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsClubPersonMessage.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function setEngagementClubPersonStatus(personId, active) {
    const person = engagementClubPeople.find((item) => item.id === personId);
    if (!person) return;
    const label = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.licenseNumber;
    if (!global.confirm(`${active ? "Reactiver" : "Desactiver"} ${label} ?`)) return;
    try {
      await callFunction("setEngagementClubPersonStatus", { personId, active });
      engagementClubPeopleLoaded = false;
      await loadEngagementClubPeople({ force: true });
    } catch (error) {
      if (elements.engagementsClubPeopleStatus) {
        elements.engagementsClubPeopleStatus.textContent = `Changement impossible : ${error?.message || error}`;
        elements.engagementsClubPeopleStatus.dataset.tone = "error";
      }
    }
  }

  async function loadEngagementCompetitions({ force = false } = {}) {
    if (!canManageEngagements() || engagementCompetitionsLoading) return;
    if (engagementCompetitionsLoaded && !force) return;
    engagementCompetitionsLoading = true;
    if (elements.engagementsRefresh) elements.engagementsRefresh.disabled = true;
    if (elements.engagementsStatus) {
      elements.engagementsStatus.hidden = false;
      elements.engagementsStatus.textContent = "Chargement du calendrier...";
      elements.engagementsStatus.dataset.tone = "loading";
    }
    try {
      const filters = engagementCalendarFiltersPayload();
      const result = await callFunction("listEngagementCompetitions", {
        fromDate: filters.startDate,
        limit: 100
      });
      engagementCompetitions = Array.isArray(result.competitions) ? result.competitions : [];
      engagementCompetitionsLoaded = true;
      renderEngagementCompetitions();
      if (elements.engagementsStatus) {
        elements.engagementsStatus.textContent = "";
        elements.engagementsStatus.dataset.tone = "ok";
        elements.engagementsStatus.hidden = true;
      }
    } catch (error) {
      if (elements.engagementsStatus) {
        elements.engagementsStatus.textContent = `Calendrier indisponible : ${error?.message || error}`;
        elements.engagementsStatus.dataset.tone = "error";
      }
    } finally {
      engagementCompetitionsLoading = false;
      if (elements.engagementsRefresh) elements.engagementsRefresh.disabled = false;
    }
  }

  function engagementCompetitionPayloadFromFields(fields = {}) {
    const deadlineValue = fields.deadline?.value || "";
    const deadlineDate = deadlineValue ? new Date(deadlineValue) : null;
    const level = fields.level?.value || "regional";
    const qualificationTimesMode = fields.qualificationMode?.value || "all";
    const missingEntryTimeMode = fields.missingEntryTimeMode?.value || "manual";
    const maxEventsPerSwimmer = Math.max(0, Math.trunc(Number(fields.maxEvents?.value) || 0));
    return {
      name: fields.name?.value || "",
      date: fields.date?.value || "",
      endDate: fields.endDate?.value || fields.date?.value || "",
      location: fields.location?.value || "",
      level,
      regionId: level === "national" ? "" : fields.regionId?.value || "",
      entryDeadlineAt: deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate.toISOString() : "",
      computerEmail: fields.computerEmail?.value || "",
      entryStatus: fields.entryStatus?.value || "upcoming",
      officialsRequired: fields.officialsRequired?.checked === true,
      poolLength: fields.poolLength?.value || "50",
      timingType: fields.timingType?.value || "electronic",
      qualificationTimesMode,
      qualificationStartDate: qualificationTimesMode === "period" ? fields.qualificationStart?.value || "" : "",
      qualificationEndDate: qualificationTimesMode === "period" ? fields.qualificationEnd?.value || "" : "",
      missingEntryTimeMode,
      maxEventsPerSwimmer
    };
  }

  function createCompetitionFields() {
    return {
      name: elements.engagementsName,
      date: elements.engagementsDate,
      endDate: elements.engagementsEndDate,
      location: elements.engagementsLocation,
      level: elements.engagementsLevel,
      regionId: elements.engagementsRegionId,
      deadline: elements.engagementsDeadline,
      computerEmail: elements.engagementsComputerEmail,
      poolLength: elements.engagementsPoolLength,
      timingType: elements.engagementsTimingType,
      qualificationMode: elements.engagementsQualificationMode,
      qualificationStart: elements.engagementsQualificationStart,
      qualificationEnd: elements.engagementsQualificationEnd,
      missingEntryTimeMode: elements.engagementsMissingEntryTimeMode,
      maxEvents: elements.engagementsMaxEvents,
      entryStatus: elements.engagementsEntryStatus,
      officialsRequired: elements.engagementsOfficialsRequired
    };
  }

  function editCompetitionFields() {
    return {
      name: elements.engagementsEditName,
      date: elements.engagementsEditDate,
      endDate: elements.engagementsEditEndDate,
      location: elements.engagementsEditLocation,
      level: elements.engagementsEditLevel,
      regionId: elements.engagementsEditRegionId,
      deadline: elements.engagementsEditDeadline,
      computerEmail: elements.engagementsEditComputerEmail,
      poolLength: elements.engagementsEditPoolLength,
      timingType: elements.engagementsEditTimingType,
      qualificationMode: elements.engagementsEditQualificationMode,
      qualificationStart: elements.engagementsEditQualificationStart,
      qualificationEnd: elements.engagementsEditQualificationEnd,
      missingEntryTimeMode: elements.engagementsEditMissingEntryTimeMode,
      maxEvents: elements.engagementsEditMaxEvents,
      entryStatus: elements.engagementsEditEntryStatus,
      officialsRequired: elements.engagementsEditOfficialsRequired
    };
  }

  function engagementCompetitionPayloadFromForm() {
    return engagementCompetitionPayloadFromFields(createCompetitionFields());
  }

  function engagementCompetitionPayloadFromEditForm() {
    return engagementCompetitionPayloadFromFields(editCompetitionFields());
  }

  async function createEngagementCompetition(event) {
    event?.preventDefault?.();
    if (!canCreateEngagementCompetition()) {
      if (elements.engagementsCreateMessage) {
        elements.engagementsCreateMessage.textContent = "Droit creation competition engagements requis.";
        elements.engagementsCreateMessage.dataset.tone = "error";
      }
      return;
    }
    const button = elements.engagementsCreateForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    if (elements.engagementsCreateMessage) {
      elements.engagementsCreateMessage.textContent = "Creation en cours...";
      elements.engagementsCreateMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("createEngagementCompetition", engagementCompetitionPayloadFromForm());
      elements.engagementsCreateForm?.reset();
      updateEngagementCreateFormAccess();
      engagementCompetitionsLoaded = false;
      setEngagementsTab("calendar");
      await loadEngagementCompetitions({ force: true });
      if (result.competition?.id) await loadEngagementCompetitionDetail(result.competition.id);
      if (elements.engagementsCreateMessage) {
        elements.engagementsCreateMessage.textContent = `Competition creee : ${result.competition?.name || "engagements"}.`;
        elements.engagementsCreateMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsCreateMessage) {
        elements.engagementsCreateMessage.textContent = `Creation impossible : ${error?.message || error}`;
        elements.engagementsCreateMessage.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = false;
      updateEngagementCreateFormAccess();
    }
  }

  async function updateEngagementCompetition(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetition?.id || !canEditEngagementCompetition()) return;
    const button = elements.engagementsEditForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    if (elements.engagementsDetailStatus) {
      elements.engagementsDetailStatus.textContent = "Enregistrement en cours...";
      elements.engagementsDetailStatus.dataset.tone = "loading";
    }
    try {
      const payload = {
        competitionId: selectedEngagementCompetition.id,
        ...engagementCompetitionPayloadFromEditForm()
      };
      const result = await callFunction("updateEngagementCompetition", payload);
      selectedEngagementCompetition = result.competition || null;
      engagementCompetitionsLoaded = false;
      await loadEngagementCompetitions({ force: true });
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty("general");
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = "Parametres enregistres.";
        elements.engagementsDetailStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = false;
      updateEngagementEditFormAccess();
    }
  }

  async function saveEngagementCompetitionDetail(event) {
    event?.preventDefault?.();
    if (!engagementDetailEditing || !selectedEngagementCompetition?.id || !canEditEngagementCompetition()) return;
    if (elements.engagementsEditForm && !elements.engagementsEditForm.checkValidity()) {
      setEngagementsDetailTab("general");
      elements.engagementsEditForm.reportValidity();
      return;
    }
    const categoryError = selectedEngagementEventsCategoryError();
    if (categoryError) {
      setEngagementsDetailTab("courses");
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = categoryError;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
      return;
    }
    const programError = selectedEngagementProgramError();
    if (programError) {
      setEngagementsDetailTab("courses");
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = programError;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
      return;
    }
    const button = elements.engagementsSaveButton;
    if (button) button.disabled = true;
    if (elements.engagementsDetailStatus) {
      elements.engagementsDetailStatus.textContent = "Enregistrement de la fiche...";
      elements.engagementsDetailStatus.dataset.tone = "loading";
    }
    try {
      const payload = {
        competitionId: selectedEngagementCompetition.id,
        ...engagementCompetitionPayloadFromEditForm(),
        events: selectedEngagementEventsFromForm(),
        programSessions: selectedEngagementProgramSessionsFromForm(),
        fees: selectedEngagementFeesFromForm()
      };
      const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
      const result = await callFunction("updateEngagementCompetition", payload);
      const returnedCompetition = result.competition || {};
      const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
      selectedEngagementCompetition = {
        ...returnedCompetition,
        ...(expectedProgramItemCount && !returnedProgramItemCount ? { programSessions: payload.programSessions } : {})
      };
      engagementCompetitionsLoaded = false;
      await loadEngagementCompetitions({ force: true });
      activeEngagementProgramSessionId = "";
      engagementDetailEditing = false;
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty();
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = "Fiche competition enregistree.";
        elements.engagementsDetailStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  function engagementCompetitionPayloadFromSelection(extra = {}) {
    return {
      competitionId: selectedEngagementCompetition.id,
      name: selectedEngagementCompetition.name || "",
      date: selectedEngagementCompetition.date || "",
      location: selectedEngagementCompetition.location || "",
      level: selectedEngagementCompetition.level || "regional",
      regionId: selectedEngagementCompetition.regionId || "",
      entryDeadlineAt: selectedEngagementCompetition.entryDeadlineAt || "",
      endDate: selectedEngagementCompetition.endDate || selectedEngagementCompetition.date || "",
      computerEmail: selectedEngagementCompetition.computerEmail || "",
      entryStatus: selectedEngagementCompetition.entryStatus || "upcoming",
      officialsRequired: selectedEngagementCompetition.officialsRequired === true,
      poolLength: selectedEngagementCompetition.poolLength || "50",
      timingType: selectedEngagementCompetition.timingType || "electronic",
      qualificationTimesMode: selectedEngagementCompetition.qualificationTimesMode || "all",
      qualificationStartDate: selectedEngagementCompetition.qualificationStartDate || "",
      qualificationEndDate: selectedEngagementCompetition.qualificationEndDate || "",
      missingEntryTimeMode: selectedEngagementCompetition.missingEntryTimeMode || "manual",
      maxEventsPerSwimmer: selectedEngagementCompetition.maxEventsPerSwimmer || 0,
      ...extra
    };
  }

  async function updateEngagementCompetitionEvents(event) {
    event?.preventDefault?.();
    if (!isEngagementAdminMode() || !selectedEngagementCompetition?.id || !canEditEngagementCompetition()) return;
    const button = elements.engagementsEventsSaveButton;
    const categoryError = selectedEngagementEventsCategoryError();
    if (categoryError) {
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = categoryError;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
      return;
    }
    const programError = selectedEngagementProgramError();
    if (programError) {
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = programError;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
      return;
    }
    if (button) button.disabled = true;
    if (elements.engagementsEventsMessage) {
      elements.engagementsEventsMessage.textContent = "Enregistrement du programme...";
      elements.engagementsEventsMessage.dataset.tone = "loading";
    }
    try {
      const payload = engagementCompetitionPayloadFromSelection({
        events: selectedEngagementEventsFromForm(),
        programSessions: selectedEngagementProgramSessionsFromForm()
      });
      const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
      const result = await callFunction("updateEngagementCompetition", payload);
      const returnedCompetition = result.competition || {};
      const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
      const programConfirmed = expectedProgramItemCount === 0 || returnedProgramItemCount > 0;
      selectedEngagementCompetition = {
        ...returnedCompetition,
        ...(!programConfirmed ? { programSessions: payload.programSessions } : {})
      };
      engagementCompetitionsLoaded = false;
      await loadEngagementCompetitions({ force: true });
      activeEngagementProgramSessionId = "";
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty("courses");
      setEngagementsDetailTab("courses");
      setEngagementEventsSectionOpen(elements.engagementsEventsChoiceSection, false);
      setEngagementEventsSectionOpen(elements.engagementsProgramSection, true);
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = programConfirmed
          ? "Programme enregistre."
          : "Programme conserve a l'ecran, mais non confirme par le serveur. Redeploie les Functions avant de tester l'enregistrement reel.";
        elements.engagementsEventsMessage.dataset.tone = programConfirmed ? "ok" : "error";
      }
    } catch (error) {
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = !isEngagementAdminMode() || !canEditEngagementCompetition();
    }
  }

  async function updateEngagementCompetitionFees(event) {
    event?.preventDefault?.();
    if (!isEngagementAdminMode() || !selectedEngagementCompetition?.id || !canEditEngagementCompetition()) return;
    const button = elements.engagementsFeesSaveButton;
    if (button) button.disabled = true;
    if (elements.engagementsFeesMessage) {
      elements.engagementsFeesMessage.textContent = "Enregistrement des frais...";
      elements.engagementsFeesMessage.dataset.tone = "loading";
    }
    try {
      const payload = engagementCompetitionPayloadFromSelection({
        fees: selectedEngagementFeesFromForm()
      });
      const result = await callFunction("updateEngagementCompetition", payload);
      selectedEngagementCompetition = result.competition || null;
      engagementCompetitionsLoaded = false;
      await loadEngagementCompetitions({ force: true });
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty("fees");
      setEngagementsDetailTab("fees");
      if (elements.engagementsFeesMessage) {
        elements.engagementsFeesMessage.textContent = "Frais enregistres.";
        elements.engagementsFeesMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsFeesMessage) {
        elements.engagementsFeesMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsFeesMessage.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = !canEditEngagementCompetition();
    }
  }

  async function loadCurrentUser() {
    if (currentUserLoading) return;
    currentUserLoading = true;
    try {
      const result = await callFunction("getCurrentAccessUser", {});
      renderCurrentUser(result);
    } catch {
      renderCurrentUser({ email: ensureAdminAuth()?.status?.().email || "" });
    } finally {
      currentUserLoading = false;
    }
  }

  function updateView(status = {}) {
    const signedIn = Boolean(status.signedIn);
    const authUid = global.firebase?.auth?.().currentUser?.uid || "";
    if (activeAuthUid && activeAuthUid !== authUid) {
      currentAccessProfile = null;
      resetEngagementClubData();
      engagementCompetitionsLoaded = false;
      engagementAccessRequestsLoaded = false;
      engagementDeletionRequestsLoaded = false;
      accessUsers = [];
      accessCurrentCursor = null;
      accessNextCursor = null;
      accessPreviousCursors = [];
      accessPage = 1;
      accessDeletionRequestsLoaded = false;
    }
    activeAuthUid = signedIn ? authUid : "";
    if (!signedIn) {
      currentAccessProfile = null;
      resetEngagementClubData();
    }
    document.body.dataset.adminAuth = signedIn ? "unlocked" : "locked";
    if (elements.dashboard) elements.dashboard.hidden = !signedIn;
    if (elements.accountControl) elements.accountControl.hidden = !signedIn;
    if (elements.sessionLabel) elements.sessionLabel.textContent = "Profil LivePalmes";
    if (signedIn) {
      updateCapabilityView();
      loadCurrentUser();
      if (canManageAccessDirectory()) loadAccessUsers();
    }
    if (!status.available) {
      setMessage("Firebase Authentication n'est pas disponible.");
    } else if (!status.configured) {
      setMessage("Aucun administrateur Firebase n'est configure.");
    } else if (!signedIn) {
      closeAccountMenu();
      setMessage("");
    }
  }

  async function signIn(event) {
    event?.preventDefault?.();
    const auth = ensureAdminAuth();
    if (!auth) {
      setMessage("Connexion Firebase indisponible.");
      return;
    }
    setMessage("");
    try {
      await auth.signIn(elements.email?.value, elements.password?.value);
    } catch (error) {
      setMessage(`Connexion impossible : ${error?.message || error}`);
    }
  }

  async function sendPasswordReset() {
    const auth = ensureAdminAuth();
    if (!auth) {
      setMessage("Connexion Firebase indisponible.");
      return;
    }
    try {
      await auth.sendPasswordReset(elements.email?.value);
      setMessage("Email de reinitialisation envoye.", "ok");
    } catch (error) {
      setMessage(`Reinitialisation impossible : ${error?.message || error}`);
    }
  }

  async function signOut() {
    try {
      await ensureAdminAuth()?.signOut?.();
    } catch (error) {
      setMessage(`Deconnexion impossible : ${error?.message || error}`);
    }
  }

  async function updateAccountEmail(event) {
    event?.preventDefault?.();
    const nextEmail = String(elements.accountEmail?.value || "").trim().toLowerCase();
    const currentPassword = elements.accountEmailPassword?.value || "";
    const currentEmail = String(global.firebase?.auth?.().currentUser?.email || "").trim().toLowerCase();
    if (!nextEmail || !currentPassword) return;
    if (nextEmail === currentEmail) {
      setAccountMessage(elements.accountEmailMessage, "Cette adresse est déjà celle de votre compte.");
      return;
    }
    const button = elements.accountEmailForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setAccountMessage(elements.accountEmailMessage, "Mise à jour en cours…", "loading");
    try {
      const user = await reauthenticateCurrentUser(currentPassword);
      await callFunction("updateCurrentAccountEmail", { email: nextEmail });
      await user.reload?.();
      await user.getIdToken?.(true);
      let verificationSent = false;
      try {
        await user.sendEmailVerification?.();
        verificationSent = true;
      } catch (error) {
        console.warn("Envoi de la vérification email impossible", error);
      }
      elements.accountEmailPassword.value = "";
      renderCurrentUser({ ...(ensureAdminAuth()?.status?.().profile || {}), email: nextEmail });
      await loadCurrentUser();
      setAccountMessage(
        elements.accountEmailMessage,
        verificationSent
          ? "Adresse mise à jour. Un email de vérification vient de vous être envoyé."
          : "Adresse mise à jour.",
        "ok"
      );
    } catch (error) {
      setAccountMessage(elements.accountEmailMessage, `Modification impossible : ${firebaseAccountError(error)}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function updateAccountPassword(event) {
    event?.preventDefault?.();
    const currentPassword = elements.accountCurrentPassword?.value || "";
    const nextPassword = elements.accountNewPassword?.value || "";
    const confirmation = elements.accountConfirmPassword?.value || "";
    if (nextPassword.length < 8) {
      setAccountMessage(elements.accountPasswordMessage, "Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (nextPassword !== confirmation) {
      setAccountMessage(elements.accountPasswordMessage, "La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (currentPassword === nextPassword) {
      setAccountMessage(elements.accountPasswordMessage, "Le nouveau mot de passe doit être différent de l’ancien.");
      return;
    }
    const button = elements.accountPasswordForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setAccountMessage(elements.accountPasswordMessage, "Mise à jour en cours…", "loading");
    try {
      const user = await reauthenticateCurrentUser(currentPassword);
      await user.updatePassword(nextPassword);
      await user.getIdToken?.(true);
      elements.accountPasswordForm.reset();
      setAccountMessage(elements.accountPasswordMessage, "Mot de passe modifié.", "ok");
    } catch (error) {
      setAccountMessage(elements.accountPasswordMessage, `Modification impossible : ${firebaseAccountError(error)}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function accessPayloadFromForm() {
    const form = elements.accessForm;
    const capabilities = [...form.querySelectorAll("input[name='capability']:checked")]
      .map((input) => input.value);
    return {
      uid: editingUid,
      firstName: form.querySelector("#adminAccessFirstName")?.value || "",
      lastName: form.querySelector("#adminAccessLastName")?.value || "",
      email: form.querySelector("#adminAccessEmail")?.value || "",
      clubId: elements.accessClubId?.value || "",
      clubName: elements.accessClubName?.value || "",
      regionId: elements.accessRegionId?.value || "",
      licenseNumber: form.querySelector("#adminAccessLicenseNumber")?.value || "",
      capabilities
    };
  }

  function fillAccessForm(user = {}) {
    const form = elements.accessForm;
    if (!form) return;
    editingUid = user.uid || "";
    form.querySelector("#adminAccessFirstName").value = user.firstName || "";
    form.querySelector("#adminAccessLastName").value = user.lastName || "";
    form.querySelector("#adminAccessEmail").value = user.email || "";
    if (elements.accessClubId) elements.accessClubId.value = user.clubId || "";
    if (elements.accessClubName) elements.accessClubName.value = user.clubName || "";
    setRegionSelectValue(elements.accessRegionId, user.regionId || "");
    populateAccessClubSelect(user.clubId || "", user.clubName || "");
    form.querySelector("#adminAccessLicenseNumber").value = user.licenseNumber || "";
    form.querySelectorAll("input[name='capability']").forEach((input) => {
      input.checked = (user.capabilities || []).includes(input.value);
    });
    form.querySelector("#adminAccessSendReset").checked = false;
    if (elements.cancelEdit) elements.cancelEdit.hidden = !editingUid;
    if (elements.accessPanel) elements.accessPanel.hidden = false;
    elements.accessAdd?.setAttribute("aria-expanded", "true");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetAccessForm(close = false) {
    editingUid = "";
    elements.accessForm?.reset();
    populateAccessClubSelect();
    if (elements.cancelEdit) elements.cancelEdit.hidden = true;
    if (close && elements.accessPanel) elements.accessPanel.hidden = true;
    if (close) elements.accessAdd?.setAttribute("aria-expanded", "false");
  }

  function formatAccessDateTime(value) {
    if (!value) return "jamais";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderAccessUsers() {
    const mount = elements.accessList;
    if (!mount) return;
    if (elements.accessCount) {
      elements.accessCount.textContent = accessUsers.length
        ? `${accessUsers.length} compte${accessUsers.length > 1 ? "s" : ""} sur cette page`
        : "Aucun compte trouvé";
    }
    if (!accessUsers.length) {
      mount.innerHTML = `<p class="admin-access-empty">Aucun compte ne correspond à cette recherche.</p>`;
      renderAccessPagination();
      return;
    }
    const rows = accessUsers.map((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Compte LivePalmes";
      const rights = (user.capabilities || []).map(capabilityLabel);
      const visibleRights = rights.slice(0, 2).join(", ") || "Aucun droit actif";
      const rightsSummary = rights.length > 2 ? `${visibleRights} +${rights.length - 2}` : visibleRights;
      const inactive = user.status !== "active";
      const clubLine = user.clubId ? `Club ${user.clubId}` : "Club non renseigne";
      const regionLine = user.regionId ? `Region ${regionDisplayLabel(user.regionId)}` : "Region non renseignee";
      const currentUid = global.firebase?.auth?.().currentUser?.uid || "";
      const isCurrentUser = user.uid && user.uid === currentUid;
      const actions = [];
      if (canUse("admin.full")) {
        actions.push(`<button class="ghost-button" type="button" data-access-edit="${user.uid}">Modifier</button>`);
        actions.push(`<button class="ghost-button" type="button" data-access-status="${inactive ? "active" : "inactive"}" data-access-uid="${user.uid}" ${isCurrentUser ? "disabled" : ""}>
          ${inactive ? "Reactiver" : "Desactiver"}
        </button>`);
      }
      if (canDeleteAccessUserDirectly()) {
        actions.push(`<button class="ghost-button danger-button" type="button" data-access-delete="${user.uid}" ${isCurrentUser ? "disabled" : ""}>Supprimer definitivement</button>`);
      } else if (canUse("engagements.region.manage")) {
        actions.push(`<button class="ghost-button danger-button" type="button" data-access-delete-request="${user.uid}" ${isCurrentUser ? "disabled" : ""}>Demander suppression</button>`);
      }
      return `
        <article class="admin-access-row ${inactive ? "inactive" : ""}" data-access-uid="${user.uid}" role="row">
          <div class="admin-access-user" role="cell" data-label="Utilisateur">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(user.email || user.uid)}</small>
          </div>
          <div role="cell" data-label="Club / licence">
            <small>${escapeHtml(`${clubLine} - ${regionLine}`)}</small>
            <strong>${escapeHtml(user.clubName || "—")}</strong>
            <small>${escapeHtml(user.licenseNumber ? `Licence ${user.licenseNumber}` : "Licence non renseignée")}</small>
          </div>
          <div class="admin-access-rights-summary" role="cell" data-label="Habilitations" title="${escapeHtml(rights.join(", ") || "Aucun droit actif")}">
            ${escapeHtml(rightsSummary)}
          </div>
          <div role="cell" data-label="Statut">
            <span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span>
          </div>
          <div role="cell" data-label="Dernière connexion">
            <small class="admin-access-login">${escapeHtml(user.lastLoginAt ? formatAccessDateTime(user.lastLoginAt) : "Non disponible")}</small>
          </div>
          <div class="admin-access-row-actions" role="cell" data-label="Actions">
            ${actions.join("") || "<small>Aucune action disponible</small>"}
          </div>
        </article>
      `;
    }).join("");
    mount.innerHTML = `
      <div class="admin-access-table" role="table" aria-label="Utilisateurs du portail">
        <div class="admin-access-table-head" role="row">
          <span role="columnheader">Utilisateur</span>
          <span role="columnheader">Club / licence</span>
          <span role="columnheader">Habilitations</span>
          <span role="columnheader">Statut</span>
          <span role="columnheader">Dernière connexion</span>
          <span role="columnheader">Actions</span>
        </div>
        ${rows}
      </div>`;
    renderAccessPagination();
  }

  function renderAccessPagination() {
    if (!elements.accessPagination) return;
    const hasPrevious = accessPreviousCursors.length > 0;
    const hasNext = Boolean(accessNextCursor);
    elements.accessPagination.hidden = !hasPrevious && !hasNext;
    if (elements.accessPreviousPage) elements.accessPreviousPage.disabled = !hasPrevious || accessUsersLoading;
    if (elements.accessNextPage) elements.accessNextPage.disabled = !hasNext || accessUsersLoading;
    if (elements.accessPageLabel) elements.accessPageLabel.textContent = `Page ${accessPage}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function accessFiltersPayload() {
    return {
      search: elements.accessSearch?.value || "",
      status: elements.accessStatusFilter?.value || "",
      capability: elements.accessCapabilityFilter?.value || ""
    };
  }

  function normalizedAccessSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");
  }

  function legacyFilteredAccessUsers(users, filters) {
    const searchTerms = normalizedAccessSearch(filters.search).split(/\s+/).filter(Boolean);
    return users.filter((user) => {
      if (filters.status && user.status !== filters.status) return false;
      if (filters.capability && !(user.capabilities || []).includes(filters.capability)) return false;
      if (!searchTerms.length) return true;
      const haystack = normalizedAccessSearch([
        user.firstName,
        user.lastName,
        user.email,
        user.clubId,
        user.clubName,
        user.regionId,
        user.licenseNumber
      ].join(" "));
      return searchTerms.every((term) => haystack.includes(term));
    });
  }

  async function loadAccessUsers({ reset = false } = {}) {
    if (!canManageAccessDirectory()) return;
    const loadSequence = ++accessLoadSequence;
    if (reset) {
      accessCurrentCursor = null;
      accessNextCursor = null;
      accessPreviousCursors = [];
      accessPage = 1;
    }
    accessUsersLoading = true;
    renderAccessPagination();
    if (elements.accessCount) elements.accessCount.textContent = "Chargement…";
    try {
      const filters = accessFiltersPayload();
      const result = await callFunction("listAccessUsers", {
        pageSize: 25,
        cursor: accessCurrentCursor,
        ...filters
      });
      if (loadSequence !== accessLoadSequence) return;
      const returnedUsers = Array.isArray(result.users) ? result.users : [];
      if (result.directoryVersion === 2) {
        accessUsers = returnedUsers;
        accessNextCursor = result.nextCursor || null;
      } else {
        const filteredUsers = legacyFilteredAccessUsers(returnedUsers, filters);
        const offset = Math.max(0, Math.trunc(Number(accessCurrentCursor?.offset) || 0));
        accessUsers = filteredUsers.slice(offset, offset + 25);
        accessNextCursor = offset + 25 < filteredUsers.length ? { offset: offset + 25 } : null;
      }
      renderAccessUsers();
    } catch (error) {
      if (loadSequence !== accessLoadSequence) return;
      if (elements.accessList) {
        elements.accessList.innerHTML = `<p class="admin-access-empty">Lecture des accès impossible : ${escapeHtml(error?.message || error)}</p>`;
      }
    } finally {
      if (loadSequence !== accessLoadSequence) return;
      accessUsersLoading = false;
      renderAccessPagination();
    }
  }

  async function showNextAccessPage() {
    if (!accessNextCursor || accessUsersLoading) return;
    accessPreviousCursors.push(accessCurrentCursor);
    accessCurrentCursor = accessNextCursor;
    accessPage += 1;
    await loadAccessUsers();
  }

  async function showPreviousAccessPage() {
    if (!accessPreviousCursors.length || accessUsersLoading) return;
    accessCurrentCursor = accessPreviousCursors.pop() || null;
    accessPage = Math.max(1, accessPage - 1);
    await loadAccessUsers();
  }

  async function setAccessStatus(uid, status) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    const verb = status === "active" ? "reactiver" : "desactiver";
    if (!window.confirm(`Confirmer : ${verb} ${label} ?`)) return;
    try {
      await callFunction("setAccessUserStatus", { uid, status });
      await loadAccessUsers();
      setAccessMessage(`Acces ${status === "active" ? "reactive" : "desactive"}.`, "ok");
    } catch (error) {
      setAccessMessage(`Changement de statut impossible : ${error?.message || error}`);
    }
  }

  function renderAccessDeletionRequests() {
    if (!elements.accessDeletionRequestsPanel || !elements.accessDeletionRequestsList) return;
    elements.accessDeletionRequestsPanel.hidden = !canDeleteAccessUserDirectly();
    if (!canDeleteAccessUserDirectly()) return;
    if (!accessDeletionRequests.length) {
      elements.accessDeletionRequestsList.innerHTML = `<p class="admin-access-empty">Aucune demande de suppression en attente.</p>`;
      if (elements.accessDeletionRequestsStatus) elements.accessDeletionRequestsStatus.textContent = "Aucune demande en attente.";
      return;
    }
    elements.accessDeletionRequestsList.innerHTML = accessDeletionRequests.map((request) => {
      const name = [request.targetFirstName, request.targetLastName].filter(Boolean).join(" ") || request.targetEmail || "Compte LivePalmes";
      const region = request.targetRegionId ? regionDisplayLabel(request.targetRegionId) : "Region non renseignee";
      const rights = (request.targetCapabilities || []).map(capabilityLabel).join(", ") || "Aucun droit actif";
      return `
        <article class="admin-engagements-request-card" data-access-deletion-request-id="${request.id}">
          <div class="admin-engagements-request-main">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(request.targetEmail || request.targetUid)}</small>
            <small>${escapeHtml(`Region ${region} - ${rights}`)}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>Demande par ${escapeHtml(request.requestedByEmail || request.requestedBy || "admin regional")}</span>
            <span>${escapeHtml(request.requestedAt ? formatAccessDateTime(request.requestedAt) : "")}</span>
          </div>
          <div class="admin-engagements-request-actions">
            <button type="button" data-access-deletion-decision="approved" data-access-deletion-request-id="${request.id}">Accepter</button>
            <button class="ghost-button" type="button" data-access-deletion-decision="rejected" data-access-deletion-request-id="${request.id}">Refuser</button>
          </div>
        </article>
      `;
    }).join("");
    if (elements.accessDeletionRequestsStatus) {
      elements.accessDeletionRequestsStatus.textContent = `${accessDeletionRequests.length} demande${accessDeletionRequests.length > 1 ? "s" : ""} en attente.`;
    }
  }

  async function loadAccessDeletionRequests({ force = false } = {}) {
    if (!canDeleteAccessUserDirectly() || accessDeletionRequestsLoading) return;
    if (accessDeletionRequestsLoaded && !force) return;
    accessDeletionRequestsLoading = true;
    if (elements.accessDeletionRequestsStatus) {
      elements.accessDeletionRequestsStatus.textContent = "Chargement...";
      elements.accessDeletionRequestsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listAccessUserDeletionRequests", {});
      accessDeletionRequests = Array.isArray(result.requests) ? result.requests : [];
      accessDeletionRequestsLoaded = true;
      renderAccessDeletionRequests();
      if (elements.accessDeletionRequestsStatus) elements.accessDeletionRequestsStatus.dataset.tone = "ok";
    } catch (error) {
      if (elements.accessDeletionRequestsStatus) {
        elements.accessDeletionRequestsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.accessDeletionRequestsStatus.dataset.tone = "error";
      }
    } finally {
      accessDeletionRequestsLoading = false;
    }
  }

  async function deleteAccessUser(uid) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    if (!global.confirm(`Suppression definitive du compte ${label} ? Cette action supprime le compte Firebase et ses droits LivePalmes.`)) return;
    try {
      await callFunction("deleteAccessUser", { uid, confirmPermanent: true });
      accessDeletionRequestsLoaded = false;
      await loadAccessUsers({ reset: true });
      if (canDeleteAccessUserDirectly()) await loadAccessDeletionRequests({ force: true });
      setAccessMessage("Compte supprime definitivement.", "ok");
    } catch (error) {
      setAccessMessage(`Suppression impossible : ${error?.message || error}`);
    }
  }

  async function requestAccessUserDeletion(uid) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    if (!global.confirm(`Demander a un admin national de supprimer le compte ${label} ?`)) return;
    try {
      await callFunction("requestAccessUserDeletion", { uid });
      setAccessMessage("Demande de suppression envoyee a l'administration nationale.", "ok");
    } catch (error) {
      setAccessMessage(`Demande impossible : ${error?.message || error}`);
    }
  }

  async function resolveAccessDeletionRequest(requestId, decision) {
    const request = accessDeletionRequests.find((item) => item.id === requestId);
    const label = request?.targetEmail || request?.targetUid || "ce compte";
    const approve = decision === "approved";
    const message = approve
      ? `Accepter la demande et supprimer definitivement ${label} ?`
      : `Refuser la demande de suppression de ${label} ?`;
    if (!global.confirm(message)) return;
    if (elements.accessDeletionRequestsStatus) {
      elements.accessDeletionRequestsStatus.textContent = approve ? "Suppression en cours..." : "Refus en cours...";
      elements.accessDeletionRequestsStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("resolveAccessUserDeletionRequest", { requestId, decision: approve ? "approved" : "rejected" });
      accessDeletionRequestsLoaded = false;
      await loadAccessUsers({ reset: true });
      await loadAccessDeletionRequests({ force: true });
      if (elements.accessDeletionRequestsStatus) {
        elements.accessDeletionRequestsStatus.textContent = approve ? "Demande acceptee et compte supprime." : "Demande refusee.";
        elements.accessDeletionRequestsStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.accessDeletionRequestsStatus) {
        elements.accessDeletionRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
        elements.accessDeletionRequestsStatus.dataset.tone = "error";
      }
    }
  }

  async function saveAccessUser(event) {
    event?.preventDefault?.();
    if (!canUse("admin.full")) {
      setAccessMessage("Droit admin general requis.");
      return;
    }
    const payload = accessPayloadFromForm();
    setAccessMessage("");
    try {
      const result = await callFunction("createOrUpdateAccessUser", payload);
      const sendReset = elements.accessForm.querySelector("#adminAccessSendReset")?.checked;
      if (sendReset) {
        await global.firebase.auth().sendPasswordResetEmail(result.email || payload.email);
      }
      resetAccessForm(true);
      await loadAccessUsers({ reset: true });
      setAccessMessage(
        `${result.created ? "Compte cree" : "Compte mis a jour"} : ${result.email}. ${sendReset ? "Email de mot de passe envoye." : ""}`,
        "ok"
      );
    } catch (error) {
      setAccessMessage(`Enregistrement impossible : ${error?.message || error}`);
    }
  }

    function init() {
    populateLivePalmesRegionSelects();
    populateAccessClubSelect();
    loadAccessClubReference();
    populateEngagementSeasonFilter();
    const auth = ensureAdminAuth();
    updateView(auth?.status?.() || {});
    elements.form?.addEventListener("submit", signIn);
    elements.reset?.addEventListener("click", sendPasswordReset);
    elements.publicAccessRequestForm?.addEventListener("submit", submitPublicEngagementAccessRequest);
    elements.publicAccessRequestRegionId?.addEventListener("change", () => populatePublicAccessRequestClubSelect());
    elements.publicAccessRequestClubSelect?.addEventListener("change", syncPublicAccessRequestClubFieldsFromSelect);
    elements.signOut?.addEventListener("click", signOut);
    elements.engagementsRefresh?.addEventListener("click", () => loadEngagementCompetitions({ force: true }));
    elements.engagementsAccessRequestsRefresh?.addEventListener("click", () => loadEngagementAccessRequests({ force: true }));
    elements.engagementsDeletionRequestsRefresh?.addEventListener("click", () => loadEngagementDeletionRequests({ force: true }));
    elements.engagementsNationalSwimmersRefresh?.addEventListener("click", () => loadEngagementNationalSwimmers({ force: true }));
    elements.engagementsCalendarFilters?.addEventListener("submit", (event) => event.preventDefault());
    [
      elements.engagementsSeasonFilter,
      elements.engagementsRegionFilter,
      elements.engagementsLevelFilter,
      elements.engagementsStatusFilter,
      elements.engagementsMineFilter
    ].forEach((filter) => {
      filter?.addEventListener("change", () => loadEngagementCompetitions({ force: true }));
    });
    elements.engagementsFiltersReset?.addEventListener("click", () => {
      resetEngagementCalendarFilters();
      loadEngagementCompetitions({ force: true });
    });
    elements.engagementsTabButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        setEngagementsTab(button.dataset.engagementsTabButton);
        if (activeEngagementsTab === "calendar") loadEngagementCompetitions();
        if (activeEngagementsTab === "accessRequests") loadEngagementAccessRequests();
        if (activeEngagementsTab === "deletionRequests") {
          loadEngagementDeletionRequests();
          loadEngagementNationalSwimmers();
        }
        if (activeEngagementsTab === "clubPeople") loadEngagementClubPeople();
        if (activeEngagementsTab === "clubSwimmers") loadEngagementClubSwimmers();
        updateNavigationView();
      });
    });
    elements.engagementsDetailTabButtons?.forEach((button) => {
      button.addEventListener("click", () => requestEngagementDetailTab(button.dataset.engagementsDetailTabButton));
    });
    elements.engagementsCalendarList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-competition-id]");
      if (!button) return;
      loadEngagementCompetitionDetail(button.dataset.engagementCompetitionId);
    });
    elements.engagementsDeletionRequestsList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-deletion-action]");
      if (!button) return;
      const action = button.dataset.engagementDeletionAction;
      if (action === "view") {
        setEngagementsTab("calendar");
        loadEngagementCompetitionDetail(button.dataset.engagementCompetitionId);
        updateNavigationView();
        return;
      }
      const decision = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
      if (decision) resolveEngagementDeletionRequest(button.dataset.engagementDeletionRequestId, decision);
    });
    elements.engagementsAccessRequestsList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-access-request-action]");
      if (!button) return;
      if (button.dataset.engagementAccessRequestAction === "edit") {
        openEngagementAccessRequestEditForm(button.dataset.engagementAccessRequestId || "");
        return;
      }
      const decision = button.dataset.engagementAccessRequestAction === "approve"
        ? "approved"
        : button.dataset.engagementAccessRequestAction === "reject"
          ? "rejected"
          : "";
      if (decision) resolveEngagementAccessRequest(button.dataset.engagementAccessRequestId, decision);
    });
    elements.engagementsAccessRequestEditForm?.addEventListener("submit", submitEngagementAccessRequestEdit);
    elements.engagementsAccessRequestEditCancel?.addEventListener("click", closeEngagementAccessRequestEditForm);
    elements.engagementsAccessRequestEditRegionId?.addEventListener("change", () => populateEngagementAccessRequestEditClubSelect());
    elements.engagementsAccessRequestEditClubSelect?.addEventListener("change", syncEngagementAccessRequestEditClubFieldsFromSelect);
    elements.engagementsNationalSwimmersList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-national-swimmer-action]");
      if (!button) return;
      const action = button.dataset.engagementNationalSwimmerAction;
      const swimmerId = button.dataset.engagementNationalSwimmerId || "";
      if (action === "disable" || action === "enable") {
        setEngagementNationalSwimmerStatus(swimmerId, action === "enable");
      } else if (action === "delete") {
        deleteEngagementNationalSwimmer(swimmerId);
      }
    });
    elements.engagementsClubPeopleRefresh?.addEventListener("click", () => loadEngagementClubPeople({ force: true }));
    elements.engagementsClubSwimmersDirectoryRefresh?.addEventListener("click", () => loadEngagementClubSwimmers({ force: true }));
    elements.engagementsClubSwimmersDirectorySearch?.addEventListener("input", renderEngagementClubSwimmersDirectory);
    elements.engagementsClubPeopleAddButton?.addEventListener("click", () => openEngagementClubPersonForm());
    elements.engagementsClubPersonCancel?.addEventListener("click", () => {
      resetEngagementClubPersonForm();
      if (elements.engagementsClubPersonForm) elements.engagementsClubPersonForm.hidden = true;
    });
    elements.engagementsClubPersonForm?.addEventListener("submit", saveEngagementClubPerson);
    elements.engagementsClubPeopleList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-club-person-action]");
      if (!button) return;
      const personId = button.dataset.engagementClubPersonId || "";
      const action = button.dataset.engagementClubPersonAction;
      if (action === "edit") {
        openEngagementClubPersonForm(engagementClubPeople.find((person) => person.id === personId));
      } else if (action === "disable" || action === "enable") {
        setEngagementClubPersonStatus(personId, action === "enable");
      }
    });
    elements.engagementsDetailClose?.addEventListener("click", closeEngagementCompetitionDetail);
    elements.engagementsEditButton?.addEventListener("click", () => setEngagementEditMode(true));
    elements.engagementsSaveButton?.addEventListener("click", saveEngagementCompetitionDetail);
    elements.engagementsDeleteButton?.addEventListener("click", deleteOrRequestEngagementCompetitionDeletion);
    elements.engagementsEditCancelTop?.addEventListener("click", () => {
      clearEngagementDetailTabDirty();
      activeEngagementProgramSessionId = "";
      engagementDetailEditing = false;
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
    });
    elements.engagementsEditCancel?.addEventListener("click", () => {
      clearEngagementDetailTabDirty("general");
      setEngagementEditMode(false);
    });
    elements.engagementsCreateForm?.addEventListener("submit", createEngagementCompetition);
    elements.engagementsEditForm?.addEventListener("submit", saveEngagementCompetitionDetail);
    elements.engagementsEditForm?.addEventListener("input", () => markEngagementDetailTabDirty("general"));
    elements.engagementsEditForm?.addEventListener("change", () => markEngagementDetailTabDirty("general"));
    elements.engagementsEventsForm?.addEventListener("submit", saveEngagementCompetitionDetail);
    elements.engagementsEventsForm?.addEventListener("input", updateEngagementEventsSummaryFromForm);
    elements.engagementsEventsForm?.addEventListener("change", updateEngagementEventsSummaryFromForm);
    elements.engagementsProgramAddSession?.addEventListener("click", addEngagementProgramSession);
    elements.engagementsProgramSessions?.addEventListener("click", handleEngagementProgramAction);
    elements.engagementsProgramSessions?.addEventListener("change", () => {
      updateEngagementEventsSectionSummaries(selectedEngagementEventsFromForm(), selectedEngagementProgramSessionsFromForm());
    });
    elements.engagementsSectionToggles?.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const section = document.querySelector(`#${button.dataset.engagementsSectionToggle}`);
        if (!section) return;
        section.open = !section.open;
        updateEngagementEventsSectionToggleLabels();
      });
    });
    [elements.engagementsEventsChoiceSection, elements.engagementsProgramSection].forEach((section) => {
      section?.addEventListener("toggle", () => {
        if (section === elements.engagementsProgramSection && elements.engagementsEventsForm?.dataset.clubProgramView === "true" && !section.open) {
          section.open = true;
        }
        updateEngagementEventsSectionToggleLabels();
      });
    });
    elements.engagementsDate?.addEventListener("change", () => syncEngagementEndDate(elements.engagementsDate, elements.engagementsEndDate));
    elements.engagementsEndDate?.addEventListener("change", () => markEngagementEndDateManual(elements.engagementsDate, elements.engagementsEndDate));
    elements.engagementsEditDate?.addEventListener("change", () => syncEngagementEndDate(elements.engagementsEditDate, elements.engagementsEditEndDate));
    elements.engagementsEditEndDate?.addEventListener("change", () => markEngagementEndDateManual(elements.engagementsEditDate, elements.engagementsEditEndDate));
    elements.engagementsFeesForm?.addEventListener("submit", saveEngagementCompetitionDetail);
    elements.engagementsFeesForm?.addEventListener("input", () => markEngagementDetailTabDirty("fees"));
    elements.engagementsFeesForm?.addEventListener("change", () => markEngagementDetailTabDirty("fees"));
    elements.engagementsClubTeamForm?.addEventListener("submit", saveEngagementClubTeamLeader);
    elements.engagementsClubTeamForm?.addEventListener("change", () => {
      updateEngagementClubTeamFormMode();
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    });
    elements.engagementsClubTeamPersonSelect?.addEventListener("change", () => {
      const radio = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="person"]');
      if (radio) radio.checked = true;
      applyEngagementClubTeamPerson(elements.engagementsClubTeamPersonSelect.value);
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    });
    elements.engagementsClubTeamForm?.addEventListener("input", (event) => {
      if (
        elements.engagementsClubTeamPersonSelect &&
        [
          elements.engagementsClubTeamFirstName,
          elements.engagementsClubTeamLastName,
          elements.engagementsClubTeamLicense
        ].includes(event.target)
      ) {
        elements.engagementsClubTeamPersonSelect.value = "";
      }
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    });
    elements.engagementsClubOfficialsForm?.addEventListener("submit", saveEngagementClubOfficials);
    elements.engagementsClubOfficialsList?.addEventListener("change", () => {
      updateEngagementClubOfficialsSummary();
      if (elements.engagementsClubOfficialsMessage) elements.engagementsClubOfficialsMessage.textContent = "";
    });
    elements.engagementsClubSwimmersForm?.addEventListener("submit", saveEngagementClubSwimmers);
    elements.engagementsClubEntriesForm?.addEventListener("submit", saveEngagementClubSwimmers);
    elements.engagementsClubRelaysForm?.addEventListener("submit", saveEngagementClubRelays);
    elements.engagementsClubSummaryPdfButton?.addEventListener("click", downloadEngagementClubSummaryPdf);
    elements.engagementsClubRecapFiles?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-admin-club-pdf]");
      if (!button) return;
      downloadEngagementAdminClubRecapPdf(button.dataset.engagementAdminClubPdf);
    });
    elements.engagementsClubRelaysAddButton?.addEventListener("click", () => {
      const relayEvents = engagementClubRelayEvents();
      const firstEvent = relayEvents[0];
      if (!firstEvent) return;
      engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom();
      const firstCategory = engagementRelayCategoryOptions(firstEvent)[0]?.[0] || "";
      engagementClubRelaysDraft.push({
        relayId: `relay-${Date.now()}`,
        eventCode: firstEvent.code,
        category: firstCategory,
        genderMode: engagementRelayGenderOptions(firstEvent, firstCategory)[0]?.[0] || "female",
        manualEntryTime: "",
        memberIds: []
      });
      renderEngagementClubRelays();
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubSwimmersSearch?.addEventListener("input", renderEngagementClubSwimmers);
    elements.engagementsClubNewSwimmerSaveButton?.addEventListener("click", createEngagementClubSwimmer);
    elements.engagementsClubSwimmersList?.addEventListener("change", (event) => {
      const row = event.target.closest("[data-engagement-club-swimmer-row]");
      const checkbox = row?.querySelector("[data-engagement-club-swimmer-id]");
      const license = row?.querySelector("[data-engagement-club-swimmer-license]");
      if (row && checkbox && license) {
        row.dataset.selected = checkbox.checked ? "true" : "false";
        license.required = checkbox.checked;
      }
      updateEngagementClubSwimmersSummary();
      renderEngagementClubEntries();
      renderEngagementClubRelays();
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "";
      }
    });
    elements.engagementsClubEntriesList?.addEventListener("change", (event) => {
      const row = event.target.closest("[data-engagement-club-entry-row]");
      if (event.target.matches("[data-engagement-club-swimmer-event]") && event.target.checked) {
        const maxEvents = Number(selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
        const checkedEvents = Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked") || []);
        if (maxEvents > 0 && checkedEvents.length > maxEvents) {
          event.target.checked = false;
          if (elements.engagementsClubEntriesMessage) {
            elements.engagementsClubEntriesMessage.textContent = `Maximum ${maxEvents} course${maxEvents > 1 ? "s" : ""} individuelle${maxEvents > 1 ? "s" : ""} par nageur.`;
            elements.engagementsClubEntriesMessage.dataset.tone = "error";
          }
        }
      }
      if (event.target.matches("[data-engagement-club-swimmer-event]")) {
        const eventCode = event.target.dataset.engagementClubSwimmerEvent || "";
        const choice = event.target.closest("[data-event-selected]");
        const timeInput = Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event-time]") || [])
          .find((input) => input.dataset.engagementClubSwimmerEventTime === eventCode);
        const checked = event.target.checked;
        const manualAllowed = (selectedEngagementCompetition?.missingEntryTimeMode || "manual") === "manual";
        if (choice) choice.dataset.eventSelected = checked ? "true" : "false";
        if (timeInput) {
          timeInput.hidden = !checked || !manualAllowed;
          timeInput.disabled = !checked || !manualAllowed;
        }
      }
      updateEngagementClubEntriesSummary();
      if (elements.engagementsClubEntriesMessage && !event.target.matches("[data-engagement-club-swimmer-event]")) {
        elements.engagementsClubEntriesMessage.textContent = "";
      }
    });
    elements.engagementsClubRelaysList?.addEventListener("change", () => {
      engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom();
      renderEngagementClubRelays();
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubRelaysList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-club-relay-remove]");
      if (!button) return;
      const row = button.closest("[data-engagement-club-relay-row]");
      const relayId = row?.dataset.engagementClubRelayId || "";
      engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom()
        .filter((relay) => relay.relayId !== relayId);
      renderEngagementClubRelays();
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubEntriesList?.addEventListener("input", () => {
      if (elements.engagementsClubEntriesMessage) elements.engagementsClubEntriesMessage.textContent = "";
    });
    elements.engagementsLevel?.addEventListener("change", () => updateEngagementCreateFormAccess());
    elements.engagementsEditLevel?.addEventListener("change", () => updateEngagementEditFormAccess());
    elements.engagementsQualificationMode?.addEventListener("change", () => updateEngagementQualificationFields("create"));
    elements.engagementsEditQualificationMode?.addEventListener("change", () => updateEngagementQualificationFields("edit"));
    updateEngagementQualificationFields("create");
    updateEngagementQualificationFields("edit");
    elements.accountToggle?.addEventListener("click", () => {
      const open = elements.accountToggle.getAttribute("aria-expanded") !== "true";
      elements.accountToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (elements.accountActions) elements.accountActions.hidden = !open;
    });
    elements.accountActions?.addEventListener("click", closeAccountMenu);
    document.addEventListener("click", (event) => {
      if (!elements.accountControl?.contains(event.target)) closeAccountMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAccountMenu();
    });
    elements.navToggle?.addEventListener("click", () => {
      const open = elements.navToggle.getAttribute("aria-expanded") !== "true";
      elements.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.querySelector(".admin-portal-sidebar")?.classList.toggle("is-open", open);
    });
    elements.performanceToggle?.addEventListener("click", () => {
      setPerformanceMenuOpen(elements.performanceToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.engagementsAdminToggle?.addEventListener("click", () => {
      setEngagementsAdminMenuOpen(elements.engagementsAdminToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.dtnToggle?.addEventListener("click", () => {
      setDtnMenuOpen(elements.dtnToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.navigation?.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      if (link.dataset.adminViewLink === "engagements") {
        activeEngagementsNavEntry = link.dataset.engagementsNavEntry || "club";
        if (link.dataset.engagementsNavTab) {
          setEngagementsTab(link.dataset.engagementsNavTab);
        }
        if (activeEngagementsTab === "calendar") {
          closeEngagementCompetitionDetail();
          loadEngagementCompetitions();
        }
        if (activeEngagementsTab === "accessRequests") {
          closeEngagementCompetitionDetail();
          loadEngagementAccessRequests();
        }
        if (activeEngagementsTab === "deletionRequests") {
          closeEngagementCompetitionDetail();
          loadEngagementDeletionRequests();
        }
        if (activeEngagementsTab === "clubPeople") {
          closeEngagementCompetitionDetail();
          loadEngagementClubPeople();
        }
        if (activeEngagementsTab === "clubSwimmers") {
          closeEngagementCompetitionDetail();
          loadEngagementClubSwimmers();
        }
        updateNavigationView();
      }
      elements.navToggle?.setAttribute("aria-expanded", "false");
      document.querySelector(".admin-portal-sidebar")?.classList.remove("is-open");
    });
    elements.accountEmailForm?.addEventListener("submit", updateAccountEmail);
    elements.accountPasswordForm?.addEventListener("submit", updateAccountPassword);
    elements.accessRequestForm?.addEventListener("submit", submitEngagementAccessRequest);
    elements.accessRequestRegionId?.addEventListener("change", () => populateAccessRequestClubSelect());
    elements.accessRequestClubSelect?.addEventListener("change", syncAccessRequestClubFieldsFromSelect);
    elements.accessForm?.addEventListener("submit", saveAccessUser);
    elements.accessRegionId?.addEventListener("change", () => populateAccessClubSelect());
    elements.accessClubSelect?.addEventListener("change", syncAccessClubFieldsFromSelect);
    elements.accessRefresh?.addEventListener("click", () => loadAccessUsers());
    elements.accessDeletionRequestsRefresh?.addEventListener("click", () => loadAccessDeletionRequests({ force: true }));
    elements.accessAdd?.addEventListener("click", () => {
      if (!canUse("admin.full")) return;
      const open = elements.accessAdd.getAttribute("aria-expanded") === "true";
      if (open) {
        resetAccessForm(true);
      } else {
        resetAccessForm();
        if (elements.accessPanel) elements.accessPanel.hidden = false;
        elements.accessAdd.setAttribute("aria-expanded", "true");
        elements.accessPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    elements.cancelEdit?.addEventListener("click", () => resetAccessForm(true));
    elements.accessFilters?.addEventListener("submit", (event) => {
      event.preventDefault();
      loadAccessUsers({ reset: true });
    });
    elements.accessStatusFilter?.addEventListener("change", () => loadAccessUsers({ reset: true }));
    elements.accessCapabilityFilter?.addEventListener("change", () => loadAccessUsers({ reset: true }));
    elements.accessClearFilters?.addEventListener("click", () => {
      elements.accessFilters?.reset();
      loadAccessUsers({ reset: true });
    });
    elements.accessPreviousPage?.addEventListener("click", showPreviousAccessPage);
    elements.accessNextPage?.addEventListener("click", showNextAccessPage);
    global.addEventListener("hashchange", updateNavigationView);
    elements.accessList?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-access-edit]");
      if (edit) {
        const user = accessUsers.find((item) => item.uid === edit.dataset.accessEdit);
        if (user) fillAccessForm(user);
        return;
      }
      const statusButton = event.target.closest("[data-access-status]");
      if (statusButton) {
        setAccessStatus(statusButton.dataset.accessUid, statusButton.dataset.accessStatus);
        return;
      }
      const deleteButton = event.target.closest("[data-access-delete]");
      if (deleteButton) {
        deleteAccessUser(deleteButton.dataset.accessDelete);
        return;
      }
      const deleteRequestButton = event.target.closest("[data-access-delete-request]");
      if (deleteRequestButton) {
        requestAccessUserDeletion(deleteRequestButton.dataset.accessDeleteRequest);
      }
    });
    elements.accessDeletionRequestsList?.addEventListener("click", (event) => {
      const decisionButton = event.target.closest("[data-access-deletion-decision]");
      if (!decisionButton) return;
      resolveAccessDeletionRequest(decisionButton.dataset.accessDeletionRequestId, decisionButton.dataset.accessDeletionDecision);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
