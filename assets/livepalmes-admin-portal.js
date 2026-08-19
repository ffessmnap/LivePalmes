(function attachLivePalmesAdminPortal(global) {
  const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false;
  const ENGAGEMENT_SWIMMER_LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;
  const PORTAL_NAV_PIN_STORAGE_KEY = "livepalmes.portal.navPinned";
  const PORTAL_ACTIVE_CLUB_SESSION_KEY = "livepalmes.portal.activeClubId";
  const ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY = "livepalmes.portal.nationalClubs.v1";
  const ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementCalendar.v1.";
  const ENGAGEMENT_CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;
  const ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementWorkspace.v1.";
  const ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000;
  const ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT = 4;
  const ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementSwimmers.v1.";
  const ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS = 5 * 60 * 1000;
  const ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE = 48;
  const ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION = "20260812-national-swimmers-firestore-2";
  const PERFORMANCE_PUBLIC_SEARCH_BASE = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore";
  const publicPerformanceSwimmerSearchShards = new Map();
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
  const ENGAGEMENT_OPEN_WATER_RELAY_EVENT = {
    code: "OW4X1000SB",
    type: "relay",
    label: "4 x 1000 m Surface/Bi-palmes mixte",
    shortLabel: "4 x 1000 SB",
    discipline: "SB",
    distance: 1000,
    relayLegs: 4,
    relayMixedRule: "required"
  };
  const ENGAGEMENT_OPEN_WATER_DISCIPLINES = [
    ["SF", "Surface"],
    ["BI", "Bi-palmes"],
    ["SUP", "Support"]
  ];
  const ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES = [
    { id: "150-elimination-SF", distance: 150, discipline: "SF", label: "150 m élimination Surface", format: "elimination", active: true },
    { id: "150-elimination-BI", distance: 150, discipline: "BI", label: "150 m élimination Bi-palmes", format: "elimination", active: true },
    { id: "1000-SF", distance: 1000, discipline: "SF", label: "1000 m Surface", format: "standard", active: true },
    { id: "1000-BI", distance: 1000, discipline: "BI", label: "1000 m Bi-palmes", format: "standard", active: true },
    { id: "1000-SUP", distance: 1000, discipline: "SUP", label: "1000 m Support", format: "standard", active: true },
    { id: "3000-SF", distance: 3000, discipline: "SF", label: "3000 m Surface", format: "standard", active: true },
    { id: "3000-BI", distance: 3000, discipline: "BI", label: "3000 m Bi-palmes", format: "standard", active: true },
    { id: "3000-SUP", distance: 3000, discipline: "SUP", label: "3000 m Support", format: "standard", active: true },
    { id: "5000-SF", distance: 5000, discipline: "SF", label: "5000 m Surface", format: "standard", active: true },
    { id: "5000-BI", distance: 5000, discipline: "BI", label: "5000 m Bi-palmes", format: "standard", active: true },
    { id: "5000-SUP", distance: 5000, discipline: "SUP", label: "5000 m Support", format: "standard", active: true }
  ];
  const ENGAGEMENT_EVENT_BY_CODE = new Map(
    [...ENGAGEMENT_EVENT_DEFINITIONS, ENGAGEMENT_OPEN_WATER_RELAY_EVENT].map((event) => [event.code, event])
  );
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
    ["P", "Poussin"],
    ["B", "Benjamin"],
    ["M", "Minime"],
    ["C", "Cadet"],
    ["J", "Junior"],
    ["S", "Senior"],
    ["R140", "Relais R140"],
    ["R180", "Relais R180"],
    ["R220", "Relais R220"],
    ["R260", "Relais R260"]
  ];
  const ENGAGEMENT_RELAY_AGE_CATEGORY_RANK = {
    P: 0,
    B: 1,
    M: 2,
    C: 3,
    J: 4,
    S: 5
  };
  const ENGAGEMENT_CATEGORY_DEFINITIONS = Array.from(new Map([
    ...ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS,
    ...ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
  ]));
  const ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = {
    "50AP": new Set(["P", "B", "M"])
  };

  function engagementCompetitionType(competition = {}) {
    if (competition?.sourceType === "calendarEvent") return String(competition.eventType || "other");
    return competition?.competitionType === "openWater" ? "openWater" : "pool";
  }

  function engagementCompetitionTypeLabel(value) {
    return {
      pool: "Piscine",
      openWater: "Eau libre",
      training: "Formation",
      stage: "Stage",
      meeting: "Réunion",
      other: "Autre"
    }[value] || "Autre";
  }

  function publicCalendarPublicationLabel(value) {
    return value === "published" ? "Publié" : "Brouillon";
  }

  function engagementWaterBodyTypeLabel(value) {
    return { sea: "Mer", lake: "Lac", river: "Rivière", other: "Autre" }[value] || "Non renseigné";
  }

  function engagementOpenWaterEventCode(course = {}) {
    return `OW${Math.trunc(Number(course.distance) || 0)}${course.format === "elimination" ? "ELIM" : ""}${course.discipline || ""}`;
  }

  function engagementOpenWaterEventDefinitions(competition = selectedEngagementCompetition || {}) {
    const selectedCourseIds = new Set((competition.events || []).map((event) => event.openWaterCourseId).filter(Boolean));
    const coursesById = new Map(engagementOpenWaterCourses.map((course) => [course.id, course]));
    (competition.events || []).filter((event) => event.openWaterCourseId && event.distance).forEach((event) => {
      if (coursesById.has(event.openWaterCourseId)) return;
      coursesById.set(event.openWaterCourseId, {
        id: event.openWaterCourseId,
        distance: Number(event.distance),
        discipline: event.discipline,
        label: event.label || event.shortLabel,
        format: event.openWaterFormat || "standard",
        active: false
      });
    });
    return Array.from(coursesById.values())
      .filter((course) => course.active !== false || selectedCourseIds.has(course.id))
      .sort((left, right) => Number(left.distance || 0) - Number(right.distance || 0) || left.label.localeCompare(right.label, "fr"))
      .map((course) => ({
      code: engagementOpenWaterEventCode(course),
      type: "individual",
      label: course.label,
      shortLabel: course.label,
      discipline: course.discipline,
      distance: Number(course.distance),
      openWaterCourseId: course.id,
      openWaterFormat: course.format || "standard"
    }));
  }

  function engagementEventDefinitionsForCompetition(competition = selectedEngagementCompetition || {}) {
    return engagementCompetitionType(competition) === "openWater"
      ? [...engagementOpenWaterEventDefinitions(competition), ENGAGEMENT_OPEN_WATER_RELAY_EVENT]
      : ENGAGEMENT_EVENT_DEFINITIONS;
  }

  function engagementEventDefinition(eventCode = "", competition = selectedEngagementCompetition || {}) {
    const openWaterMatch = String(eventCode || "").match(/^OW(\d+)(ELIM)?(SF|BI|SUP)$/);
    const openWaterDefinition = openWaterMatch ? (() => {
      const distanceValue = Number(openWaterMatch[1]);
      const format = openWaterMatch[2] ? "elimination" : "standard";
      const discipline = openWaterMatch[3];
      const disciplineLabel = Object.fromEntries(ENGAGEMENT_OPEN_WATER_DISCIPLINES)[discipline];
      const course = engagementOpenWaterCourses.find((item) =>
        Number(item.distance) === distanceValue && (item.format || "standard") === format && item.discipline === discipline
      ) || {
        id: `${format === "elimination" ? `${distanceValue}-elimination` : distanceValue}-${discipline}`,
        distance: distanceValue,
        discipline,
        label: `${format === "elimination" ? `${distanceValue} m élimination` : `${distanceValue} m`} ${disciplineLabel}`,
        format
      };
      return {
        code: eventCode,
        type: "individual",
        label: course.label,
        shortLabel: course.label,
        discipline,
        distance: distanceValue,
        openWaterCourseId: course.id,
        openWaterFormat: format
      };
    })() : null;
    return engagementEventDefinitionsForCompetition(competition).find((event) => event.code === eventCode) ||
      (competition.events || []).find((event) => event.code === eventCode) ||
      openWaterDefinition ||
      ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
  }
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
  const ENGAGEMENT_ROUTE_BY_HASH = Object.freeze({
    "#club-competitions": { entry: "club", tab: "calendar" },
    "#club-nageurs": { entry: "clubSwimmers", tab: "clubSwimmers" },
    "#club-officiels": { entry: "clubPeople", tab: "clubPeople" },
    "#competitions-calendrier": { entry: "adminCalendar", tab: "calendar" },
    "#competitions-creation": { entry: "adminCalendar", tab: "calendar" },
    "#competitions-demandes-acces": { entry: "adminAccessRequests", tab: "accessRequests" },
    "#gestion-demandes-acces": { entry: "adminAccessRequests", tab: "accessRequests" },
    "#administration-suppressions": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "deletions" },
    "#administration-clubs": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "clubs" },
    "#administration-doublons-nageurs": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "swimmers" },
    "#administration-officiels": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "people" },
    "#administration-comptes": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "deletions" },
    "#administration-historique": { entry: "adminAudit", tab: "deletionRequests", nationalTab: "audit" }
  });
  const ENGAGEMENT_NATIONAL_HASH_BY_TAB = Object.freeze({
    deletions: "#administration-suppressions",
    clubs: "#administration-clubs",
    swimmers: "#administration-doublons-nageurs",
    people: "#administration-officiels",
    audit: "#administration-historique"
  });

  const elements = {
    dashboard: document.querySelector("#adminPortalDashboard"),
    email: document.querySelector("#adminPortalEmail"),
    form: document.querySelector("#adminPortalLoginForm"),
    message: document.querySelector("#adminPortalMessage"),
    password: document.querySelector("#adminPortalPassword"),
    passwordToggle: document.querySelector("#adminPortalPasswordToggle"),
    reset: document.querySelector("#adminPortalResetButton"),
    publicAccessRequestForm: document.querySelector("#adminPublicAccessRequestForm"),
    publicAccessRequestFirstName: document.querySelector("#adminPublicAccessRequestFirstName"),
    publicAccessRequestLastName: document.querySelector("#adminPublicAccessRequestLastName"),
    publicAccessRequestEmail: document.querySelector("#adminPublicAccessRequestEmail"),
    publicAccessRequestLicenseNumber: document.querySelector("#adminPublicAccessRequestLicenseNumber"),
    publicAccessRequestWebsite: document.querySelector("#adminPublicAccessRequestWebsite"),
    publicAccessRequestRegionId: document.querySelector("#adminPublicAccessRequestRegionId"),
    publicAccessRequestClubSelect: document.querySelector("#adminPublicAccessRequestClubSelect"),
    publicAccessRequestClubName: document.querySelector("#adminPublicAccessRequestClubName"),
    publicAccessRequestClubId: document.querySelector("#adminPublicAccessRequestClubId"),
    publicAccessRequestNewClub: document.querySelector("#adminPublicAccessRequestNewClub"),
    publicAccessRequestNewClubFields: document.querySelector("#adminPublicAccessRequestNewClubFields"),
    publicAccessRequestNewClubName: document.querySelector("#adminPublicAccessRequestNewClubName"),
    publicAccessRequestNewClubCode: document.querySelector("#adminPublicAccessRequestNewClubCode"),
    publicAccessRequestNewClubFederalNumber: document.querySelector("#adminPublicAccessRequestNewClubFederalNumber"),
    publicAccessRequestNewClubCity: document.querySelector("#adminPublicAccessRequestNewClubCity"),
    publicAccessRequestNewClubPostalCode: document.querySelector("#adminPublicAccessRequestNewClubPostalCode"),
    publicAccessRequestNewClubMatch: document.querySelector("#adminPublicAccessRequestNewClubMatch"),
    scopeContext: document.querySelector("#adminPortalScopeContext"),
    scopeClubButton: document.querySelector("#adminPortalScopeClubButton"),
    scopeClubPrefix: document.querySelector("#adminPortalScopeClubPrefix"),
    scopeClubCode: document.querySelector("#adminPortalScopeClubCode"),
    scopeRole: document.querySelector("#adminPortalScopeRole"),
    scopeRoleLong: document.querySelector("#adminPortalScopeRoleLong"),
    clubSwitchDialog: document.querySelector("#adminPortalClubSwitchDialog"),
    clubSwitchClose: document.querySelector("#adminPortalClubSwitchClose"),
    clubSwitchSearch: document.querySelector("#adminPortalClubSwitchSearch"),
    clubSwitchResults: document.querySelector("#adminPortalClubSwitchResults"),
    clubSwitchStatus: document.querySelector("#adminPortalClubSwitchStatus"),
    clubSwitchReset: document.querySelector("#adminPortalClubSwitchReset"),
    accountClubCode: document.querySelector("#adminPortalAccountClubCode"),
    publicAccessRequestText: document.querySelector("#adminPublicAccessRequestText"),
    publicAccessRequestMessage: document.querySelector("#adminPublicAccessRequestMessage"),
    sessionLabel: document.querySelector("#adminPortalSessionLabel"),
    signOut: document.querySelector("#adminPortalSignOutButton"),
    accountControl: document.querySelector("#adminPortalAccount"),
    accountToggle: document.querySelector("#adminPortalAccountToggle"),
    accountActions: document.querySelector("#adminPortalAccountActions"),
    accountClubSwitch: document.querySelector("#adminPortalAccountClubSwitch"),
    navToggle: document.querySelector("#adminPortalNavToggle"),
    navCurrent: document.querySelector("#adminPortalNavCurrent"),
    homeLink: document.querySelector("#adminPortalHomeLink"),
    homeLabel: document.querySelector("#adminPortalHomeLabel"),
    navigation: document.querySelector("#adminPortalNavigation"),
    sidebar: document.querySelector(".admin-portal-sidebar"),
    navPin: document.querySelector("#adminPortalNavPin"),
    clubMenu: document.querySelector("[data-engagements-club-menu]"),
    clubToggle: document.querySelector("#adminPortalClubToggle"),
    clubSubmenu: document.querySelector("#adminPortalClubSubmenu"),
    performanceMenu: document.querySelector("[data-admin-performance-menu]"),
    performanceToggle: document.querySelector("#adminPortalPerformanceToggle"),
    performanceSubmenu: document.querySelector("#adminPortalPerformanceSubmenu"),
    engagementsAdminMenu: document.querySelector("[data-engagements-admin-nav]"),
    engagementsAdminToggle: document.querySelector("#adminPortalEngagementsToggle"),
    engagementsAdminSubmenu: document.querySelector("#adminPortalEngagementsSubmenu"),
    dtnMenu: document.querySelector("[data-admin-dtn-menu]"),
    dtnToggle: document.querySelector("#adminPortalDtnToggle"),
    dtnSubmenu: document.querySelector("#adminPortalDtnSubmenu"),
    nationalMenu: document.querySelector("[data-engagements-national-menu]"),
    nationalToggle: document.querySelector("#adminPortalNationalToggle"),
    nationalSubmenu: document.querySelector("#adminPortalNationalSubmenu"),
    accessMenu: document.querySelector("[data-access-management-nav]"),
    accessToggle: document.querySelector("#adminPortalAccessToggle"),
    accessSubmenu: document.querySelector("#adminPortalAccessSubmenu"),
    nationalPendingBadges: document.querySelectorAll("#adminPortalNationalPendingBadge, #adminOverviewNationalPendingBadge, #adminEngagementsDeletionRequestsBadge"),
    accessPendingBadges: document.querySelectorAll("#adminPortalAccessPendingBadge, #adminOverviewAccessPendingBadge, #adminAccessHomePendingBadge, #adminEngagementsAccessRequestsBadge"),
    engagementsHomeLinks: document.querySelectorAll("[data-engagements-home-entry]"),
    nationalOverviewCounts: document.querySelector("#adminNationalOverviewCounts"),
    nationalOverviewPendingCount: document.querySelector("#adminNationalOverviewPendingCount"),
    nationalOverviewPendingBreakdown: document.querySelector("#adminNationalOverviewPendingBreakdown"),
    overviewSpaceToggles: document.querySelectorAll(".admin-overview-space-toggle"),
    accessForm: document.querySelector("#adminAccessForm"),
    accessMessage: document.querySelector("#adminAccessMessage"),
    accessList: document.querySelector("#adminAccessList"),
    accessCount: document.querySelector("#adminAccessCount"),
    accessPanel: document.querySelector("#adminAccessPanel"),
    accessDialogTitle: document.querySelector("#adminAccessDialogTitle"),
    accessDialogClose: document.querySelector("#adminAccessDialogClose"),
    accessAdd: document.querySelector("#adminAccessAddButton"),
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
    accountEmailForm: document.querySelector("#adminAccountEmailForm"),
    accountEmail: document.querySelector("#adminAccountEmail"),
    accountEmailPassword: document.querySelector("#adminAccountEmailPassword"),
    accountEmailMessage: document.querySelector("#adminAccountEmailMessage"),
    accountNotificationsForm: document.querySelector("#adminAccountNotificationsForm"),
    accountCompetitionNotifications: document.querySelector("#adminAccountCompetitionNotifications"),
    accountCompetitionNotificationsState: document.querySelector("#adminAccountCompetitionNotificationsState"),
    accountNotificationsSummary: document.querySelector("#adminAccountNotificationsSummary"),
    accountNotificationsMessage: document.querySelector("#adminAccountNotificationsMessage"),
    accountPasswordForm: document.querySelector("#adminAccountPasswordForm"),
    accountEmailDetails: document.querySelector("#adminAccountEmailDetails"),
    accountNotificationsDetails: document.querySelector("#adminAccountNotificationsDetails"),
    accountPasswordDetails: document.querySelector("#adminAccountPasswordDetails"),
    accountCurrentPassword: document.querySelector("#adminAccountCurrentPassword"),
    accountNewPassword: document.querySelector("#adminAccountNewPassword"),
    accountConfirmPassword: document.querySelector("#adminAccountConfirmPassword"),
    accountPasswordMessage: document.querySelector("#adminAccountPasswordMessage"),
    accountFullName: document.querySelector("#adminAccountFullName"),
    accountIdentityEmail: document.querySelector("#adminAccountIdentityEmail"),
    accountEmailSummary: document.querySelector("#adminAccountEmailSummary"),
    accountLicenseMeta: document.querySelector("#adminAccountLicenseMeta"),
    accountLicenseNumber: document.querySelector("#adminAccountLicenseNumber"),
    accountScopeSentence: document.querySelector("#adminAccountScopeSentence"),
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
    engagementsViewTitle: document.querySelector("#adminEngagementsViewTitle"),
    engagementsClubContext: document.querySelector("#adminEngagementsClubContext"),
    engagementsClubContextName: document.querySelector("#adminEngagementsClubContextName"),
    engagementsTabButtons: document.querySelectorAll("[data-engagements-tab-button]"),
    engagementsTabPanels: document.querySelectorAll("[data-engagements-tab-panel]"),
    engagementsDetailTabButtons: document.querySelectorAll("[data-engagements-detail-tab-button]"),
    engagementsDetailTabPanels: document.querySelectorAll("[data-engagements-detail-tab-panel]"),
    engagementsDetailStepButtons: document.querySelectorAll("[data-engagement-step-button]"),
    engagementsDetailTabGroups: document.querySelectorAll("[data-engagement-step-group]"),
    engagementsSaveState: document.querySelector("#adminEngagementsSaveState"),
    engagementsStatus: document.querySelector("#adminEngagementsStatus"),
    engagementsCalendarActions: document.querySelector("#adminEngagementsCalendarActions"),
    engagementsCreateOpen: document.querySelector("#adminEngagementsCreateOpen"),
    engagementsCreateDialog: document.querySelector("#adminEngagementsCreateDialog"),
    engagementsCreateDialogClose: document.querySelector("#adminEngagementsCreateDialogClose"),
    engagementsCalendarPanel: document.querySelector("#adminEngagementsCalendarPanel"),
    engagementsCalendarCard: document.querySelector("#adminEngagementsCalendarCard"),
    engagementsCalendarFilters: document.querySelector("#adminEngagementsCalendarFilters"),
    engagementsSeasonFilter: document.querySelector("#adminEngagementsSeasonFilter"),
    engagementsRegionFilter: document.querySelector("#adminEngagementsRegionFilter"),
    engagementsLevelFilter: document.querySelector("#adminEngagementsLevelFilter"),
    engagementsTypeFilter: document.querySelector("#adminEngagementsTypeFilter"),
    engagementsStatusFilter: document.querySelector("#adminEngagementsStatusFilter"),
    engagementsStatusFilterLabel: document.querySelector("#adminEngagementsStatusFilterLabel"),
    engagementsStatusSegments: document.querySelector("#adminEngagementsStatusSegments"),
    engagementsStatusSegmentButtons: document.querySelectorAll("[data-engagement-status]"),
    engagementsAdvancedFilters: document.querySelector("#adminEngagementsAdvancedFilters"),
    engagementsMineFilterLabel: document.querySelector("#adminEngagementsMineFilterLabel"),
    engagementsMineFilter: document.querySelector("#adminEngagementsMineFilter"),
    engagementsFiltersReset: document.querySelector("#adminEngagementsFiltersReset"),
    engagementsCalendarList: document.querySelector("#adminEngagementsCalendarList"),
    engagementsClubPeoplePanel: document.querySelector("#adminEngagementsClubPeoplePanel"),
    engagementsClubPeopleActions: document.querySelector("#adminEngagementsClubPeopleActions"),
    engagementsClubPeopleAddButton: document.querySelector("#adminEngagementsClubPeopleAddButton"),
    engagementsClubPeopleStatus: document.querySelector("#adminEngagementsClubPeopleStatus"),
    engagementsClubPersonForm: document.querySelector("#adminEngagementsClubPersonForm"),
    engagementsClubPersonId: document.querySelector("#adminEngagementsClubPersonId"),
    engagementsClubPersonSwimmerId: document.querySelector("#adminEngagementsClubPersonSwimmerId"),
    engagementsClubPersonSwimmerSource: document.querySelector("#adminEngagementsClubPersonSwimmerSource"),
    engagementsClubPersonSwimmerSearch: document.querySelector("#adminEngagementsClubPersonSwimmerSearch"),
    engagementsClubPersonSwimmerResults: document.querySelector("#adminEngagementsClubPersonSwimmerResults"),
    engagementsClubPersonFirstName: document.querySelector("#adminEngagementsClubPersonFirstName"),
    engagementsClubPersonLastName: document.querySelector("#adminEngagementsClubPersonLastName"),
    engagementsClubPersonBirthDate: document.querySelector("#adminEngagementsClubPersonBirthDate"),
    engagementsClubPersonSex: document.querySelector("#adminEngagementsClubPersonSex"),
    engagementsClubPersonLicense: document.querySelector("#adminEngagementsClubPersonLicense"),
    engagementsClubPersonRoleTeamLeader: document.querySelector("#adminEngagementsClubPersonRoleTeamLeader"),
    engagementsClubPersonRoleOfficial: document.querySelector("#adminEngagementsClubPersonRoleOfficial"),
    engagementsClubPersonCancel: document.querySelector("#adminEngagementsClubPersonCancel"),
    engagementsClubPersonMessage: document.querySelector("#adminEngagementsClubPersonMessage"),
    engagementsClubPeopleList: document.querySelector("#adminEngagementsClubPeopleList"),
    engagementsClubSwimmersPanel: document.querySelector("#adminEngagementsClubSwimmersPanel"),
    engagementsClubSwimmersDirectorySearch: document.querySelector("#adminEngagementsClubSwimmersDirectorySearch"),
    engagementsClubSwimmersDirectorySearchClear: document.querySelector("#adminEngagementsClubSwimmersDirectorySearchClear"),
    engagementsClubSwimmersDirectorySexFilter: document.querySelector("#adminEngagementsClubSwimmersDirectorySexFilter"),
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
    engagementsAccessRequestEditNewClubFields: document.querySelector("#adminEngagementsAccessRequestEditNewClubFields"),
    engagementsAccessRequestEditNewClubName: document.querySelector("#adminEngagementsAccessRequestEditNewClubName"),
    engagementsAccessRequestEditNewClubCode: document.querySelector("#adminEngagementsAccessRequestEditNewClubCode"),
    engagementsAccessRequestEditNewClubFederalNumber: document.querySelector("#adminEngagementsAccessRequestEditNewClubFederalNumber"),
    engagementsAccessRequestEditNewClubCity: document.querySelector("#adminEngagementsAccessRequestEditNewClubCity"),
    engagementsAccessRequestEditNewClubPostalCode: document.querySelector("#adminEngagementsAccessRequestEditNewClubPostalCode"),
    engagementsAccessRequestEditCancel: document.querySelector("#adminEngagementsAccessRequestEditCancel"),
    engagementsAccessRequestEditMessage: document.querySelector("#adminEngagementsAccessRequestEditMessage"),
    engagementsAccessRequestRejectDialog: document.querySelector("#adminEngagementsAccessRequestRejectDialog"),
    engagementsAccessRequestRejectForm: document.querySelector("#adminEngagementsAccessRequestRejectForm"),
    engagementsAccessRequestRejectId: document.querySelector("#adminEngagementsAccessRequestRejectId"),
    engagementsAccessRequestRejectReason: document.querySelector("#adminEngagementsAccessRequestRejectReason"),
    engagementsAccessRequestRejectCancel: document.querySelector("#adminEngagementsAccessRequestRejectCancel"),
    engagementsAccessRequestRejectMessage: document.querySelector("#adminEngagementsAccessRequestRejectMessage"),
    engagementsDeletionRequestsPanel: document.querySelector("#adminEngagementsDeletionRequestsPanel"),
    engagementsNationalTabButtons: document.querySelectorAll("[data-engagements-national-tab-button]"),
    engagementsNationalPanels: document.querySelectorAll("[data-engagements-national-panel]"),
    engagementsNationalClubsSearch: document.querySelector("#adminEngagementsNationalClubsSearch"),
    engagementsNationalClubsStatusFilter: document.querySelector("#adminEngagementsNationalClubsStatusFilter"),
    engagementsNationalClubsRegionFilter: document.querySelector("#adminEngagementsNationalClubsRegionFilter"),
    engagementsNationalClubsCreate: document.querySelector("#adminEngagementsNationalClubsCreate"),
    engagementsNationalClubsReset: document.querySelector("#adminEngagementsNationalClubsReset"),
    engagementsNationalClubsStatus: document.querySelector("#adminEngagementsNationalClubsStatus"),
    engagementsNationalClubsList: document.querySelector("#adminEngagementsNationalClubsList"),
    engagementsNationalClubDialog: document.querySelector("#adminEngagementsNationalClubDialog"),
    engagementsNationalClubForm: document.querySelector("#adminEngagementsNationalClubForm"),
    engagementsNationalClubDialogTitle: document.querySelector("#adminEngagementsNationalClubDialogTitle"),
    engagementsNationalClubClose: document.querySelector("#adminEngagementsNationalClubClose"),
    engagementsNationalClubCancel: document.querySelector("#adminEngagementsNationalClubCancel"),
    engagementsNationalClubDelete: document.querySelector("#adminEngagementsNationalClubDelete"),
    engagementsNationalClubId: document.querySelector("#adminEngagementsNationalClubId"),
    engagementsNationalClubFederalNumber: document.querySelector("#adminEngagementsNationalClubFederalNumber"),
    engagementsNationalClubCode: document.querySelector("#adminEngagementsNationalClubCode"),
    engagementsNationalClubName: document.querySelector("#adminEngagementsNationalClubName"),
    engagementsNationalClubRegion: document.querySelector("#adminEngagementsNationalClubRegion"),
    engagementsNationalClubCity: document.querySelector("#adminEngagementsNationalClubCity"),
    engagementsNationalClubPostalCode: document.querySelector("#adminEngagementsNationalClubPostalCode"),
    engagementsNationalClubActive: document.querySelector("#adminEngagementsNationalClubActive"),
    engagementsNationalClubMessage: document.querySelector("#adminEngagementsNationalClubMessage"),
    engagementsDeletionRequestsRefresh: document.querySelector("#adminEngagementsDeletionRequestsRefresh"),
    engagementsDeletionRequestsGroup: document.querySelector("#adminEngagementsDeletionRequestsGroup"),
    engagementsDeletionRequestsCount: document.querySelector("#adminEngagementsDeletionRequestsCount"),
    nationalRequestsEmpty: document.querySelector("#adminNationalRequestsEmpty"),
    engagementsDeletionRequestsStatus: document.querySelector("#adminEngagementsDeletionRequestsStatus"),
    engagementsDeletionRequestsList: document.querySelector("#adminEngagementsDeletionRequestsList"),
    engagementsNationalSwimmersRefresh: document.querySelector("#adminEngagementsNationalSwimmersRefresh"),
    engagementsNationalSwimmersStatus: document.querySelector("#adminEngagementsNationalSwimmersStatus"),
    engagementsNationalSwimmersSearch: document.querySelector("#adminEngagementsNationalSwimmersSearch"),
    engagementsNationalSwimmersStatusFilter: document.querySelector("#adminEngagementsNationalSwimmersStatusFilter"),
    engagementsNationalSwimmersReset: document.querySelector("#adminEngagementsNationalSwimmersReset"),
    engagementsNationalSwimmersMergeMode: document.querySelector("#adminEngagementsNationalSwimmersMergeMode"),
    engagementsNationalSwimmersBulk: document.querySelector("[data-engagement-national-swimmer-bulk]"),
    engagementsNationalSwimmersBulkMerge: document.querySelector("#adminEngagementsNationalSwimmersBulkMerge"),
    engagementsNationalSwimmersSelectionSummary: document.querySelector("#adminEngagementsNationalSwimmersSelectionSummary"),
    engagementsNationalSwimmersList: document.querySelector("#adminEngagementsNationalSwimmersList"),
    engagementsSwimmerChangeRequestsBadge: document.querySelector("#adminEngagementsSwimmerChangeRequestsBadge"),
    engagementsSwimmerChangeRequests: document.querySelector("#adminEngagementsSwimmerChangeRequests"),
    engagementsSwimmerChangeRequestsCount: document.querySelector("#adminEngagementsSwimmerChangeRequestsCount"),
    engagementsSwimmerChangeRequestsStatus: document.querySelector("#adminEngagementsSwimmerChangeRequestsStatus"),
    engagementsSwimmerChangeRequestsList: document.querySelector("#adminEngagementsSwimmerChangeRequestsList"),
    engagementsSwimmerCorrectionDialog: document.querySelector("#adminEngagementsSwimmerCorrectionDialog"),
    engagementsSwimmerCorrectionForm: document.querySelector("#adminEngagementsSwimmerCorrectionForm"),
    engagementsSwimmerCorrectionTitle: document.querySelector("#adminEngagementsSwimmerCorrectionTitle"),
    engagementsSwimmerCorrectionContext: document.querySelector("#adminEngagementsSwimmerCorrectionContext"),
    engagementsSwimmerCorrectionClose: document.querySelector("#adminEngagementsSwimmerCorrectionClose"),
    engagementsSwimmerCorrectionCancel: document.querySelector("#adminEngagementsSwimmerCorrectionCancel"),
    engagementsSwimmerCorrectionSubmit: document.querySelector("#adminEngagementsSwimmerCorrectionSubmit"),
    engagementsSwimmerCorrectionMode: document.querySelector("#adminEngagementsSwimmerCorrectionMode"),
    engagementsSwimmerCorrectionSource: document.querySelector("#adminEngagementsSwimmerCorrectionSource"),
    engagementsSwimmerCorrectionId: document.querySelector("#adminEngagementsSwimmerCorrectionId"),
    engagementsSwimmerCorrectionIdentityKey: document.querySelector("#adminEngagementsSwimmerCorrectionIdentityKey"),
    engagementsSwimmerCorrectionLastName: document.querySelector("#adminEngagementsSwimmerCorrectionLastName"),
    engagementsSwimmerCorrectionFirstName: document.querySelector("#adminEngagementsSwimmerCorrectionFirstName"),
    engagementsSwimmerCorrectionBirthDate: document.querySelector("#adminEngagementsSwimmerCorrectionBirthDate"),
    engagementsSwimmerCorrectionSex: document.querySelector("#adminEngagementsSwimmerCorrectionSex"),
    engagementsSwimmerCorrectionLicense: document.querySelector("#adminEngagementsSwimmerCorrectionLicense"),
    engagementsSwimmerCorrectionReasonLabel: document.querySelector("#adminEngagementsSwimmerCorrectionReasonLabel"),
    engagementsSwimmerCorrectionReason: document.querySelector("#adminEngagementsSwimmerCorrectionReason"),
    engagementsSwimmerCorrectionMessage: document.querySelector("#adminEngagementsSwimmerCorrectionMessage"),
    engagementsNationalPeopleRefresh: document.querySelector("#adminEngagementsNationalPeopleRefresh"),
    engagementsNationalPeopleStatus: document.querySelector("#adminEngagementsNationalPeopleStatus"),
    engagementsNationalPeopleSearch: document.querySelector("#adminEngagementsNationalPeopleSearch"),
    engagementsNationalPeopleStatusFilter: document.querySelector("#adminEngagementsNationalPeopleStatusFilter"),
    engagementsNationalPeopleReset: document.querySelector("#adminEngagementsNationalPeopleReset"),
    engagementsNationalPeopleMergeMode: document.querySelector("#adminEngagementsNationalPeopleMergeMode"),
    engagementsNationalPeopleBulk: document.querySelector("[data-engagement-national-people-bulk]"),
    engagementsNationalPeopleBulkMerge: document.querySelector("#adminEngagementsNationalPeopleBulkMerge"),
    engagementsNationalPeopleSelectionSummary: document.querySelector("#adminEngagementsNationalPeopleSelectionSummary"),
    engagementsNationalPeopleList: document.querySelector("#adminEngagementsNationalPeopleList"),
    engagementsNationalAccountsRefresh: document.querySelector("#adminEngagementsNationalAccountsRefresh"),
    engagementsNationalAccountsGroup: document.querySelector("#adminEngagementsNationalAccountsGroup"),
    engagementsNationalAccountsCount: document.querySelector("#adminEngagementsNationalAccountsCount"),
    engagementsNationalAccountsStatus: document.querySelector("#adminEngagementsNationalAccountsStatus"),
    engagementsNationalAccountsList: document.querySelector("#adminEngagementsNationalAccountsList"),
    engagementsNationalAuditRefresh: document.querySelector("#adminEngagementsNationalAuditRefresh"),
    engagementsNationalAuditSearch: document.querySelector("#adminEngagementsNationalAuditSearch"),
    engagementsNationalAuditPeriod: document.querySelector("#adminEngagementsNationalAuditPeriod"),
    engagementsNationalAuditClub: document.querySelector("#adminEngagementsNationalAuditClub"),
    engagementsNationalAuditActor: document.querySelector("#adminEngagementsNationalAuditActor"),
    engagementsNationalAuditActorSearch: document.querySelector("#adminEngagementsNationalAuditActorSearch"),
    engagementsNationalAuditActorSelected: document.querySelector("#adminEngagementsNationalAuditActorSelected"),
    engagementsNationalAuditActorOptions: document.querySelector("#adminEngagementsNationalAuditActorOptions"),
    engagementsNationalAuditType: document.querySelector("#adminEngagementsNationalAuditType"),
    engagementsNationalAuditOrigin: document.querySelector("#adminEngagementsNationalAuditOrigin"),
    engagementsNationalAuditReset: document.querySelector("#adminEngagementsNationalAuditReset"),
    engagementsNationalAuditStatus: document.querySelector("#adminEngagementsNationalAuditStatus"),
    engagementsNationalAuditList: document.querySelector("#adminEngagementsNationalAuditList"),
    engagementsNationalAuditLoadMore: document.querySelector("#adminEngagementsNationalAuditLoadMore"),
    engagementsDetail: document.querySelector("#adminEngagementsDetail"),
    engagementsDetailEyebrow: document.querySelector("#adminEngagementsDetailEyebrow"),
    engagementsDetailTitle: document.querySelector("#adminEngagementsDetailTitle"),
    engagementsDetailSubtitle: document.querySelector("#adminEngagementsDetailSubtitle"),
    engagementsEditState: document.querySelector("#adminEngagementsEditState"),
    engagementsDetailEntryStatus: document.querySelector("#adminEngagementsDetailEntryStatus"),
    engagementsDetailLevel: document.querySelector("#adminEngagementsDetailLevel"),
    engagementsDetailMeta: document.querySelector("#adminEngagementsDetailMeta"),
    engagementsDetailList: document.querySelector("#adminEngagementsDetailList"),
    engagementsDetailStatus: document.querySelector("#adminEngagementsDetailStatus"),
    engagementsDetailClose: document.querySelector("#adminEngagementsDetailClose"),
    engagementsUnsavedDialog: document.querySelector("#adminEngagementsUnsavedDialog"),
    engagementsUnsavedSave: document.querySelector("#adminEngagementsUnsavedSave"),
    engagementsUnsavedDiscard: document.querySelector("#adminEngagementsUnsavedDiscard"),
    engagementsUnsavedStay: document.querySelector("#adminEngagementsUnsavedStay"),
    engagementsEventsForm: document.querySelector("#adminEngagementsEventsForm"),
    engagementsEventsSummary: document.querySelector("#adminEngagementsEventsSummary"),
    engagementsEventsChoiceSection: document.querySelector("#adminEngagementsEventsChoiceSection"),
    engagementsEventsChoiceSummary: document.querySelector("#adminEngagementsEventsChoiceSummary"),
    engagementsProgramSection: document.querySelector("#adminEngagementsProgramSection"),
    engagementsSectionToggles: document.querySelectorAll("[data-engagements-section-toggle]"),
    engagementsIndividualEvents: document.querySelector("#adminEngagementsIndividualEvents"),
    engagementsRelayEvents: document.querySelector("#adminEngagementsRelayEvents"),
    engagementsOpenWaterLibrary: document.querySelector("#adminEngagementsOpenWaterLibrary"),
    engagementsOpenWaterCourseCreator: document.querySelector("#adminEngagementsOpenWaterCourseCreator"),
    engagementsOpenWaterDistance: document.querySelector("#adminEngagementsOpenWaterDistance"),
    engagementsOpenWaterDiscipline: document.querySelector("#adminEngagementsOpenWaterDiscipline"),
    engagementsOpenWaterCourseAdd: document.querySelector("#adminEngagementsOpenWaterCourseAdd"),
    engagementsOpenWaterCourseList: document.querySelector("#adminEngagementsOpenWaterCourseList"),
    engagementsOpenWaterCourseMessage: document.querySelector("#adminEngagementsOpenWaterCourseMessage"),
    engagementsProgramSummary: document.querySelector("#adminEngagementsProgramSummary"),
    engagementsProgramAddSession: document.querySelector("#adminEngagementsProgramAddSession"),
    engagementsProgramSessions: document.querySelector("#adminEngagementsProgramSessions"),
    engagementsEventsSaveButton: document.querySelector("#adminEngagementsEventsSaveButton"),
    engagementsEventsMessage: document.querySelector("#adminEngagementsEventsMessage"),
    engagementsFeesForm: document.querySelector("#adminEngagementsFeesForm"),
    engagementsFeesSummary: document.querySelector("#adminEngagementsFeesSummary"),
    engagementsNoFees: document.querySelector("#adminEngagementsNoFees"),
    engagementsFeesGrid: document.querySelector("#adminEngagementsFeesGrid"),
    engagementsPaymentNote: document.querySelector("#adminEngagementsPaymentNote"),
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
    engagementsClubTeamChoices: document.querySelector("#adminEngagementsClubTeamChoices"),
    engagementsClubTeamModifyButton: document.querySelector("#adminEngagementsClubTeamModifyButton"),
    engagementsClubTeamRenunciationButton: document.querySelector("#adminEngagementsClubTeamRenunciationButton"),
    engagementsClubTeamRenunciationDialog: document.querySelector("#adminEngagementsClubTeamRenunciationDialog"),
    engagementsClubTeamRenunciationDialogForm: document.querySelector("#adminEngagementsClubTeamRenunciationDialogForm"),
    engagementsClubTeamRenunciationDialogClose: document.querySelector("#adminEngagementsClubTeamRenunciationDialogClose"),
    engagementsClubTeamRenunciationDialogCancel: document.querySelector("#adminEngagementsClubTeamRenunciationDialogCancel"),
    engagementsClubTeamPersonFields: document.querySelector("#adminEngagementsClubTeamPersonFields"),
    engagementsClubTeamPersonSearch: document.querySelector("#adminEngagementsClubTeamPersonSearch"),
    engagementsClubTeamPersonSelect: document.querySelector("#adminEngagementsClubTeamPersonSelect"),
    engagementsClubTeamPersonResults: document.querySelector("#adminEngagementsClubTeamPersonResults"),
    engagementsClubTeamPersonCreate: document.querySelector("#adminEngagementsClubTeamPersonCreate"),
    engagementsClubTeamFirstName: document.querySelector("#adminEngagementsClubTeamFirstName"),
    engagementsClubTeamFirstNameLabel: document.querySelector("#adminEngagementsClubTeamFirstNameLabel"),
    engagementsClubTeamLastName: document.querySelector("#adminEngagementsClubTeamLastName"),
    engagementsClubTeamLastNameLabel: document.querySelector("#adminEngagementsClubTeamLastNameLabel"),
    engagementsClubTeamBirthDateLabel: document.querySelector("#adminEngagementsClubTeamBirthDateLabel"),
    engagementsClubTeamBirthDate: document.querySelector("#adminEngagementsClubTeamBirthDate"),
    engagementsClubTeamSexLabel: document.querySelector("#adminEngagementsClubTeamSexLabel"),
    engagementsClubTeamSex: document.querySelector("#adminEngagementsClubTeamSex"),
    engagementsClubTeamLicenseLabel: document.querySelector("#adminEngagementsClubTeamLicenseLabel"),
    engagementsClubTeamLicense: document.querySelector("#adminEngagementsClubTeamLicense"),
    engagementsClubTeamExternal: document.querySelector("#adminEngagementsClubTeamExternal"),
    engagementsClubTeamExternalOpen: document.querySelector("#adminEngagementsClubTeamExternalOpen"),
    engagementsClubTeamExternalClubIdLabel: document.querySelector("#adminEngagementsClubTeamExternalClubIdLabel"),
    engagementsClubTeamExternalClubNameLabel: document.querySelector("#adminEngagementsClubTeamExternalClubNameLabel"),
    engagementsClubTeamExternalClubId: document.querySelector("#adminEngagementsClubTeamExternalClubId"),
    engagementsClubTeamExternalClubName: document.querySelector("#adminEngagementsClubTeamExternalClubName"),
    engagementsClubTeamExternalNote: document.querySelector("#adminEngagementsClubTeamExternalNote"),
    engagementsClubTeamExternalDialog: document.querySelector("#adminEngagementsClubTeamExternalDialog"),
    engagementsClubTeamExternalDialogForm: document.querySelector("#adminEngagementsClubTeamExternalDialogForm"),
    engagementsClubTeamExternalLastName: document.querySelector("#adminEngagementsClubTeamExternalLastName"),
    engagementsClubTeamExternalFirstName: document.querySelector("#adminEngagementsClubTeamExternalFirstName"),
    engagementsClubTeamExternalDialogClubName: document.querySelector("#adminEngagementsClubTeamExternalDialogClubName"),
    engagementsClubTeamExternalDialogMessage: document.querySelector("#adminEngagementsClubTeamExternalDialogMessage"),
    engagementsClubTeamExternalDialogClose: document.querySelector("#adminEngagementsClubTeamExternalDialogClose"),
    engagementsClubTeamExternalDialogCancel: document.querySelector("#adminEngagementsClubTeamExternalDialogCancel"),
    engagementsClubTeamExternalDialogApply: document.querySelector("#adminEngagementsClubTeamExternalDialogApply"),
    engagementsClubTeamRenunciationLabel: document.querySelector("#adminEngagementsClubTeamRenunciationLabel"),
    engagementsClubTeamRenunciation: document.querySelector("#adminEngagementsClubTeamRenunciation"),
    engagementsClubTeamSaveButton: document.querySelector("#adminEngagementsClubTeamSaveButton"),
    engagementsClubTeamRemoveButton: document.querySelector("#adminEngagementsClubTeamRemoveButton"),
    engagementsClubTeamMessage: document.querySelector("#adminEngagementsClubTeamMessage"),
    engagementsClubOfficialsForm: document.querySelector("#adminEngagementsClubOfficialsForm"),
    engagementsClubOfficialsSummary: document.querySelector("#adminEngagementsClubOfficialsSummary"),
    engagementsClubSelectedOfficialsList: document.querySelector("#adminEngagementsClubSelectedOfficialsList"),
    engagementsClubOfficialsSearch: document.querySelector("#adminEngagementsClubOfficialsSearch"),
    engagementsClubOfficialsList: document.querySelector("#adminEngagementsClubOfficialsList"),
    engagementsClubOfficialsSaveButton: document.querySelector("#adminEngagementsClubOfficialsSaveButton"),
    engagementsClubOfficialsMessage: document.querySelector("#adminEngagementsClubOfficialsMessage"),
    engagementsClubSwimmersForm: document.querySelector("#adminEngagementsClubSwimmersForm"),
    engagementsClubSwimmersSummary: document.querySelector("#adminEngagementsClubSwimmersSummary"),
    engagementsClubSwimmersSearch: document.querySelector("#adminEngagementsClubSwimmersSearch"),
    engagementsClubSelectedSwimmersList: document.querySelector("#adminEngagementsClubSelectedSwimmersList"),
    engagementsClubSwimmersList: document.querySelector("#adminEngagementsClubSwimmersList"),
    engagementsClubSwimmersSaveButton: document.querySelector("#adminEngagementsClubSwimmersSaveButton"),
    engagementsClubSwimmersMessage: document.querySelector("#adminEngagementsClubSwimmersMessage"),
    engagementsClubEntriesForm: document.querySelector("#adminEngagementsClubEntriesForm"),
    engagementsClubEntriesList: document.querySelector("#adminEngagementsClubEntriesList"),
    engagementsClubEntriesSaveBar: document.querySelector("#adminEngagementsClubEntriesSaveBar"),
    engagementsClubEntriesSaveButton: document.querySelector("#adminEngagementsClubEntriesSaveButton"),
    engagementsClubEntriesMessage: document.querySelector("#adminEngagementsClubEntriesMessage"),
    engagementsClubTimesDialog: document.querySelector("#adminEngagementsClubTimesDialog"),
    engagementsClubTimesDialogTitle: document.querySelector("#adminEngagementsClubTimesDialogTitle"),
    engagementsClubTimesDialogMeta: document.querySelector("#adminEngagementsClubTimesDialogMeta"),
    engagementsClubTimesDialogList: document.querySelector("#adminEngagementsClubTimesDialogList"),
    engagementsClubTimesDialogMessage: document.querySelector("#adminEngagementsClubTimesDialogMessage"),
    engagementsClubTimesDialogClose: document.querySelector("#adminEngagementsClubTimesDialogClose"),
    engagementsClubTimesDialogCancel: document.querySelector("#adminEngagementsClubTimesDialogCancel"),
    engagementsClubTimesDialogApply: document.querySelector("#adminEngagementsClubTimesDialogApply"),
    engagementsClubRelaysForm: document.querySelector("#adminEngagementsClubRelaysForm"),
    engagementsClubRelaysSummary: document.querySelector("#adminEngagementsClubRelaysSummary"),
    engagementsClubRelaysList: document.querySelector("#adminEngagementsClubRelaysList"),
    engagementsClubRelaysAddButton: document.querySelector("#adminEngagementsClubRelaysAddButton"),
    engagementsClubRelaysMessage: document.querySelector("#adminEngagementsClubRelaysMessage"),
    engagementsClubRelayDialog: document.querySelector("#adminEngagementsClubRelayDialog"),
    engagementsClubRelayDialogTitle: document.querySelector("#adminEngagementsClubRelayDialogTitle"),
    engagementsClubRelayDialogMeta: document.querySelector("#adminEngagementsClubRelayDialogMeta"),
    engagementsClubRelayDialogEvent: document.querySelector("#adminEngagementsClubRelayDialogEvent"),
    engagementsClubRelayDialogCategory: document.querySelector("#adminEngagementsClubRelayDialogCategory"),
    engagementsClubRelayDialogGender: document.querySelector("#adminEngagementsClubRelayDialogGender"),
    engagementsClubRelayDialogTime: document.querySelector("#adminEngagementsClubRelayDialogTime"),
    engagementsClubRelayDialogMembers: document.querySelector("#adminEngagementsClubRelayDialogMembers"),
    engagementsClubRelayDialogMembersSummary: document.querySelector("#adminEngagementsClubRelayDialogMembersSummary"),
    engagementsClubRelayDialogMembersHelp: document.querySelector("#adminEngagementsClubRelayDialogMembersHelp"),
    engagementsClubRelayDialogList: document.querySelector("#adminEngagementsClubRelayDialogList"),
    engagementsClubRelayDialogMessage: document.querySelector("#adminEngagementsClubRelayDialogMessage"),
    engagementsClubRelayDialogClose: document.querySelector("#adminEngagementsClubRelayDialogClose"),
    engagementsClubRelayDialogReset: document.querySelector("#adminEngagementsClubRelayDialogReset"),
    engagementsClubRelayDialogCancel: document.querySelector("#adminEngagementsClubRelayDialogCancel"),
    engagementsClubRelayDialogApply: document.querySelector("#adminEngagementsClubRelayDialogApply"),
    engagementsClubSummaryStatus: document.querySelector("#adminEngagementsClubSummaryStatus"),
    engagementsClubSummaryList: document.querySelector("#adminEngagementsClubSummaryList"),
    engagementsClubSummaryPdfButton: document.querySelector("#adminEngagementsClubSummaryPdfButton"),
    engagementsClubNewSwimmerFirstName: document.querySelector("#adminEngagementsClubNewSwimmerFirstName"),
    engagementsClubNewSwimmerLastName: document.querySelector("#adminEngagementsClubNewSwimmerLastName"),
    engagementsClubNewSwimmerBirthDate: document.querySelector("#adminEngagementsClubNewSwimmerBirthDate"),
    engagementsClubNewSwimmerSex: document.querySelector("#adminEngagementsClubNewSwimmerSex"),
    engagementsClubNewSwimmerLicense: document.querySelector("#adminEngagementsClubNewSwimmerLicense"),
    engagementsClubNewSwimmerDialog: document.querySelector("#adminEngagementsClubNewSwimmerDialog"),
    engagementsClubNewSwimmerDialogOpen: document.querySelector("#adminEngagementsClubNewSwimmerDialogOpen"),
    engagementsClubNewSwimmerMessage: document.querySelector("#adminEngagementsClubNewSwimmerMessage"),
    engagementsClubNewSwimmerResetButton: document.querySelector("#adminEngagementsClubNewSwimmerResetButton"),
    engagementsClubNewSwimmerSaveButton: document.querySelector("#adminEngagementsClubNewSwimmerSaveButton"),
    engagementsClubRecoverSwimmerButton: document.querySelector("#adminEngagementsClubRecoverSwimmerButton"),
    engagementsClubNewSwimmerAlerts: document.querySelector("#adminEngagementsClubNewSwimmerAlerts"),
    engagementsDocumentsSummary: document.querySelector("#adminEngagementsDocumentsSummary"),
    engagementsLongOperation: document.querySelector("#adminEngagementsLongOperation"),
    engagementsDocumentsTitle: document.querySelector("#adminEngagementsDocumentsTitle"),
    engagementsSharedDocumentsCount: document.querySelector("#adminEngagementsSharedDocumentsCount"),
    engagementsSharedDocumentsList: document.querySelector("#adminEngagementsSharedDocumentsList"),
    engagementsDocumentAddButton: document.querySelector("#adminEngagementsDocumentAddButton"),
    engagementsDocumentForm: document.querySelector("#adminEngagementsDocumentForm"),
    engagementsDocumentFiles: document.querySelector("#adminEngagementsDocumentFiles"),
    engagementsDocumentDrafts: document.querySelector("#adminEngagementsDocumentDrafts"),
    engagementsDocumentNotify: document.querySelector("#adminEngagementsDocumentNotify"),
    engagementsDocumentNotifyLabel: document.querySelector("#adminEngagementsDocumentNotifyLabel"),
    engagementsDocumentFormMessage: document.querySelector("#adminEngagementsDocumentFormMessage"),
    engagementsDocumentCancelButton: document.querySelector("#adminEngagementsDocumentCancelButton"),
    engagementsDocumentSubmitButton: document.querySelector("#adminEngagementsDocumentSubmitButton"),
    engagementsTechnicalFollowup: document.querySelector("#adminEngagementsTechnicalFollowup"),
    engagementsComputerEmailLabel: document.querySelector("#adminEngagementsComputerEmailLabel"),
    engagementsGenerateTxtExportButton: document.querySelector("#adminEngagementsGenerateTxtExportButton"),
    engagementsPrepareOpeningEmailsButton: document.querySelector("#adminEngagementsPrepareOpeningEmailsButton"),
    engagementsGenerateClubRecapsButton: document.querySelector("#adminEngagementsGenerateClubRecapsButton"),
    engagementsPrepareClubRecapEmailsButton: document.querySelector("#adminEngagementsPrepareClubRecapEmailsButton"),
    engagementsSendOpeningEmailsButton: document.querySelector("#adminEngagementsSendOpeningEmailsButton"),
    engagementsSendClubRecapEmailsButton: document.querySelector("#adminEngagementsSendClubRecapEmailsButton"),
    engagementsDocumentsList: document.querySelector("#adminEngagementsDocumentsList"),
    engagementsClubRecapFiles: document.querySelector("#adminEngagementsClubRecapFiles"),
    engagementsClubPdfSelect: document.querySelector("#adminEngagementsClubPdfSelect"),
    engagementsClubPdfDownloadButton: document.querySelector("#adminEngagementsClubPdfDownloadButton"),
    engagementsMailJobsList: document.querySelector("#adminEngagementsMailJobsList"),
    engagementsGeneratedFiles: document.querySelector("#adminEngagementsGeneratedFiles"),
    engagementsStatisticsRefreshButton: document.querySelector("#adminEngagementsStatisticsRefreshButton"),
    engagementsStatisticsUpdatedAt: document.querySelector("#adminEngagementsStatisticsUpdatedAt"),
    engagementsStatisticsSummary: document.querySelector("#adminEngagementsStatisticsSummary"),
    engagementsStatisticsAlerts: document.querySelector("#adminEngagementsStatisticsAlerts"),
    engagementsStatisticsEventSelect: document.querySelector("#adminEngagementsStatisticsEventSelect"),
    engagementsStatisticsEventRows: document.querySelector("#adminEngagementsStatisticsEventRows"),
    engagementsStatisticsClubRows: document.querySelector("#adminEngagementsStatisticsClubRows"),
    engagementsEditButton: document.querySelector("#adminEngagementsEditButton"),
    engagementsSaveButton: document.querySelector("#adminEngagementsSaveButton"),
    engagementsEditCancelTop: document.querySelector("#adminEngagementsEditCancelTop"),
    engagementsDeleteButton: document.querySelector("#adminEngagementsDeleteButton"),
    engagementsEditForm: document.querySelector("#adminEngagementsEditForm"),
    engagementsEditCancel: document.querySelector("#adminEngagementsEditCancel"),
    engagementsEditName: document.querySelector("#adminEngagementsEditName"),
    engagementsEditCompetitionType: document.querySelector("#adminEngagementsEditCompetitionType"),
    engagementsEditWaterBodyType: document.querySelector("#adminEngagementsEditWaterBodyType"),
    engagementsEditDate: document.querySelector("#adminEngagementsEditDate"),
    engagementsEditEndDate: document.querySelector("#adminEngagementsEditEndDate"),
    engagementsEditLocation: document.querySelector("#adminEngagementsEditLocation"),
    engagementsEditCity: document.querySelector("#adminEngagementsEditCity"),
    engagementsEditAddress: document.querySelector("#adminEngagementsEditAddress"),
    engagementsEditOrganizer: document.querySelector("#adminEngagementsEditOrganizer"),
    engagementsEditPublicDescription: document.querySelector("#adminEngagementsEditPublicDescription"),
    engagementsEditPublicationStatus: document.querySelector("#adminEngagementsEditPublicationStatus"),
    engagementsEditCanceled: document.querySelector("#adminEngagementsEditCanceled"),
    engagementsEditLevel: document.querySelector("#adminEngagementsEditLevel"),
    engagementsEditRegionId: document.querySelector("#adminEngagementsEditRegionId"),
    engagementsEditRegionNote: document.querySelector("#adminEngagementsEditRegionNote"),
    engagementsEditInvitedRegionIds: document.querySelector("#adminEngagementsEditInvitedRegionIds"),
    engagementsEditInvitedRegionChoices: document.querySelector("#adminEngagementsEditInvitedRegionChoices"),
    engagementsEditDeadline: document.querySelector("#adminEngagementsEditDeadline"),
    engagementsEditComputerEmail: document.querySelector("#adminEngagementsEditComputerEmail"),
    engagementsEditOfficialsManagerEmail: document.querySelector("#adminEngagementsEditOfficialsManagerEmail"),
    engagementsEditPoolLength: document.querySelector("#adminEngagementsEditPoolLength"),
    engagementsEditPoolLaneCount: document.querySelector("#adminEngagementsEditPoolLaneCount"),
    engagementsEditTimingType: document.querySelector("#adminEngagementsEditTimingType"),
    engagementsEditQualificationMode: document.querySelector("#adminEngagementsEditQualificationMode"),
    engagementsEditQualificationStart: document.querySelector("#adminEngagementsEditQualificationStart"),
    engagementsEditQualificationEnd: document.querySelector("#adminEngagementsEditQualificationEnd"),
    engagementsEditMissingEntryTimeMode: document.querySelector("#adminEngagementsEditMissingEntryTimeMode"),
    engagementsEditMaxEvents: document.querySelector("#adminEngagementsEditMaxEvents"),
    engagementsEditMaxEventsUnlimited: document.querySelector("#adminEngagementsEditMaxEventsUnlimited"),
    engagementsEditEntryStatus: document.querySelector("#adminEngagementsEditEntryStatus"),
    engagementsEditOfficialsRequired: document.querySelector("#adminEngagementsEditOfficialsRequired"),
    engagementsCreateForm: document.querySelector("#adminEngagementsCreateForm"),
    engagementsCompetitionType: document.querySelector("#adminEngagementsCompetitionType"),
    engagementsName: document.querySelector("#adminEngagementsName"),
    engagementsDate: document.querySelector("#adminEngagementsDate"),
    engagementsEndDate: document.querySelector("#adminEngagementsEndDate"),
    engagementsLocation: document.querySelector("#adminEngagementsLocation"),
    engagementsLevel: document.querySelector("#adminEngagementsLevel"),
    engagementsRegionId: document.querySelector("#adminEngagementsRegionId"),
    engagementsRegionNote: document.querySelector("#adminEngagementsRegionNote"),
    engagementsInvitedRegionIds: document.querySelector("#adminEngagementsInvitedRegionIds"),
    engagementsInvitedRegionChoices: document.querySelector("#adminEngagementsInvitedRegionChoices"),
    engagementsInvitedRegionDialog: document.querySelector("#adminEngagementsInvitedRegionDialog"),
    engagementsInvitedRegionDialogOpen: document.querySelector("#adminEngagementsInvitedRegionDialogOpen"),
    engagementsInvitedRegionSummary: document.querySelector("#adminEngagementsInvitedRegionSummary"),
    engagementsDeadline: document.querySelector("#adminEngagementsDeadline"),
    engagementsComputerEmail: document.querySelector("#adminEngagementsComputerEmail"),
    engagementsOfficialsManagerEmail: document.querySelector("#adminEngagementsOfficialsManagerEmail"),
    engagementsCreateFeesEnabled: document.querySelector("#adminEngagementsCreateFeesEnabled"),
    engagementsCreateFeesGrid: document.querySelector("#adminEngagementsCreateFeesGrid"),
    engagementsCreateSwimmerFee: document.querySelector("#adminEngagementsCreateSwimmerFee"),
    engagementsCreateIndividualEventFee: document.querySelector("#adminEngagementsCreateIndividualEventFee"),
    engagementsCreateRelayFee: document.querySelector("#adminEngagementsCreateRelayFee"),
    engagementsCreateHelloAssoUrl: document.querySelector("#adminEngagementsCreateHelloAssoUrl"),
    engagementsPoolLength: document.querySelector("#adminEngagementsPoolLength"),
    engagementsPoolLaneCount: document.querySelector("#adminEngagementsPoolLaneCount"),
    engagementsTimingType: document.querySelector("#adminEngagementsTimingType"),
    engagementsQualificationMode: document.querySelector("#adminEngagementsQualificationMode"),
    engagementsQualificationStart: document.querySelector("#adminEngagementsQualificationStart"),
    engagementsQualificationEnd: document.querySelector("#adminEngagementsQualificationEnd"),
    engagementsMissingEntryTimeMode: document.querySelector("#adminEngagementsMissingEntryTimeMode"),
    engagementsMaxEvents: document.querySelector("#adminEngagementsMaxEvents"),
    engagementsMaxEventsUnlimited: document.querySelector("#adminEngagementsMaxEventsUnlimited"),
    engagementsEntryStatus: document.querySelector("#adminEngagementsEntryStatus"),
    engagementsOfficialsRequired: document.querySelector("#adminEngagementsOfficialsRequired"),
    engagementsCreateMessage: document.querySelector("#adminEngagementsCreateMessage"),
    engagementsCreateChecklist: document.querySelector("#adminEngagementsCreateChecklist"),
    engagementsCreateCompleteNow: document.querySelector("#adminEngagementsCreateCompleteNow")
  };

  let adminAuth = null;
  let engagementLongOperation = null;
  const engagementLongOperationControlStates = new Map();

  function ensureEngagementLongOperation() {
    if (!engagementLongOperation && global.LivePalmesLongOperation?.create) {
      engagementLongOperation = global.LivePalmesLongOperation.create({
        element: elements.engagementsLongOperation,
        busyTargets: [elements.engagementsView]
      });
    }
    return engagementLongOperation;
  }

  function startEngagementLongOperation(title, detail) {
    [
      elements.engagementsGenerateClubRecapsButton,
      elements.engagementsPrepareOpeningEmailsButton,
      elements.engagementsPrepareClubRecapEmailsButton,
      elements.engagementsSendOpeningEmailsButton,
      elements.engagementsSendClubRecapEmailsButton
    ].filter(Boolean).forEach((control) => {
      if (!engagementLongOperationControlStates.has(control)) engagementLongOperationControlStates.set(control, control.disabled);
      control.disabled = true;
    });
    ensureEngagementLongOperation()?.start({ title, detail });
  }

  function updateEngagementLongOperation(title, detail) {
    ensureEngagementLongOperation()?.update({ title, detail });
  }

  function finishEngagementLongOperation(state, title, detail) {
    ensureEngagementLongOperation()?.finish({ state, title, detail });
    engagementLongOperationControlStates.forEach((disabled, control) => { control.disabled = disabled; });
    engagementLongOperationControlStates.clear();
  }
  let accessUsers = [];
  let invitedRegionsBeforeDialog = [];
  let editingUid = "";
  let accessCurrentCursor = null;
  let accessNextCursor = null;
  let accessPreviousCursors = [];
  let accessPage = 1;
  let accessUsersLoading = false;
  let accessUsersLoaded = false;
  let accessDirectoryTruncated = false;
  let accessLoadSequence = 0;
  let accessDeletionRequests = [];
  let accessDeletionRequestsLoaded = false;
  let accessDeletionRequestsLoading = false;
  let currentUserLoading = false;
  let engagementCompetitions = [];
  let engagementCompetitionsLoaded = false;
  let engagementCompetitionsLoadedRange = "";
  let engagementCompetitionsLoadedCacheKey = "";
  let engagementCompetitionsCachedAt = 0;
  let engagementPublicDeepLinkHandled = false;
  let engagementCalendarCacheRevision = 0;
  const engagementCompetitionCalendarMemoryCache = new Map();
  const engagementCompetitionCalendarRequests = new Map();
  let engagementCompetitionsVisibleLimit = 24;
  let newlyCreatedEngagementCompetitionId = "";
  let engagementOpenWaterCourses = ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES.map((course) => ({ ...course }));
  let engagementOpenWaterCoursesLoaded = false;
  let engagementOpenWaterCoursesLoading = false;
  let engagementDeadlineCountdownTimer = null;
  let engagementDeletionRequests = [];
  let engagementDeletionRequestsLoaded = false;
  let engagementDeletionRequestsLoading = false;
  let portalPendingOverviewLoaded = false;
  let portalPendingOverviewLoading = false;
  let engagementAccessRequests = [];
  let engagementAccessRequestsLoaded = false;
  let engagementAccessRequestsLoading = false;
  let activeEngagementNationalTab = "deletions";
  let engagementNationalClubs = [];
  let engagementNationalClubsLoaded = false;
  let engagementNationalClubsLoading = false;
  let engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
  let engagementNationalClubAdministratorsByClub = new Map();
  let engagementNationalClubAdministratorsLoaded = false;
  let engagementNationalClubAdministratorsAvailable = false;
  let engagementNationalSwimmers = [];
  let engagementNationalSwimmersLoaded = false;
  let engagementNationalSwimmersLoading = false;
  let engagementNationalSwimmerMergeSourceId = "";
  let engagementNationalSwimmerMergeTargets = [];
  let engagementNationalSwimmerMergeQuery = "";
  let engagementNationalSwimmerMergeLoading = false;
  let engagementNationalSwimmerMergeMode = false;
  let engagementSwimmerChangeRequests = [];
  let engagementSwimmerChangeRequestsLoaded = false;
  let engagementSwimmerChangeRequestsLoading = false;
  let engagementSwimmerCorrectionOpener = null;
  let engagementSwimmerCorrectionReview = null;
  let engagementNationalPeople = [];
  let engagementNationalPeopleLoaded = false;
  let engagementNationalPeopleLoading = false;
  let engagementNationalPersonMergeSourceId = "";
  let engagementNationalPeopleMergeMode = false;
  let engagementNationalAuditLogs = [];
  let engagementNationalAuditLogsLoaded = false;
  let engagementNationalAuditLogsLoading = false;
  let engagementNationalAuditNextCursor = null;
  let engagementNationalAuditHasMore = false;
  let engagementNationalAuditVisibleFrom = "";
  let engagementNationalAuditAppliedActorUid = "";
  let engagementNationalAuditActorSearchTimer = 0;
  let engagementNationalAuditActorSearchSequence = 0;
  let engagementNationalAuditActorSuggestions = [];
  const engagementNationalAuditActors = new Map();
  const engagementNationalAuditClubs = new Map();
  const engagementNationalAuditCompetitions = new Map();
  const engagementNationalAuditPeople = new Map();
  let engagementClubPeople = [];
  let engagementClubPeopleLoaded = false;
  let engagementClubPeopleLoading = false;
  let engagementClubSwimmers = [];
  let engagementClubSwimmersLoaded = false;
  let engagementClubSwimmersLoading = false;
  let engagementClubSwimmersClubId = "";
  let engagementClubSwimmersCachedAt = 0;
  let engagementClubSwimmersLoadPromise = null;
  let engagementClubSwimmersDirectorySexFilter = "all";
  let engagementClubInactiveSwimmersDirectoryExpanded = false;
  let engagementClubAvailableSwimmersSexFilter = "all";
  let engagementClubInactiveSwimmersExpanded = false;
  let engagementClubSwimmerRecovery = null;
  let engagementClubSwimmersRenderedCompetitionId = "";
  let engagementClubEntriesRenderedCompetitionId = "";
  let engagementClubRelaysRenderedCompetitionId = "";
  let engagementClubRecapEntries = [];
  let engagementClubRecapEntriesCompetitionId = "";
  let engagementClubRecapEntriesLoading = false;
  let engagementMailJobs = [];
  let engagementMailJobsCompetitionId = "";
  let engagementMailJobsLoading = false;
  let engagementMailJobsCursor = null;
  let engagementMailJobsHasMore = false;
  let engagementMailJobsTotalCount = 0;
  let engagementCompetitionDocumentFiles = [];
  let engagementCompetitionDocumentEditingId = "";
  let engagementCompetitionDocumentSaving = false;
  let engagementCompetitionStatistics = null;
  let engagementCompetitionStatisticsCompetitionId = "";
  let engagementCompetitionStatisticsLoading = false;
  let engagementCalendarFiltersInitialized = false;
  let activeEngagementsTab = "calendar";
  let activeEngagementsNavEntry = "club";
  let activeEngagementsDetailTab = "general";
  let engagementClubTeamEditing = true;
  let engagementClubTeamRenunciationSaving = false;
  let activeEngagementProgramSessionId = "";
  let engagementClubRelaysDraft = [];
  let dirtyEngagementDetailTabs = new Set();
  let engagementUnsavedDecisionResolver = null;
  let engagementDetailEditing = false;
  let selectedEngagementCompetitionId = "";
  let selectedEngagementCompetition = null;
  let selectedEngagementClubEntry = null;
  let currentAccessProfile = null;
  let recordModuleLoadPromise = null;
  let importModuleLoadPromise = null;
  let dtnModuleLoadPromise = null;
  let importSpreadsheetLoadPromise = null;
  let accessClubReferenceLoadPromise = null;
  let publicClubDirectoryLoadPromise = null;
  let accessClubReference = [];
  let accessClubReferenceById = new Map();
  let activeEngagementClubId = "";
  let activeAuthUid = "";
  let engagementClubEntriesDirty = false;
  const engagementClubEntriesDirtySwimmerIds = new Set();
  let engagementClubPersistedSwimmerIds = new Set();
  let engagementClubEntryMutationQueue = Promise.resolve();
  let engagementClubEntryMutationRevision = 0;
  let engagementClubLastPersistedEntry = null;
  const engagementClubWorkspaceCache = new Map();
  const engagementClubWorkspaceRequests = new Map();
  const engagementClubEntriesAutosaveSwimmers = new Map();
  const engagementClubSelectionChanges = new Map();
  let engagementClubSelectionTimer = null;
  let engagementClubSelectionCompetitionId = "";
  let engagementClubEntriesAutosaveTimer = null;
  let engagementClubEntriesAutosaveCompetitionId = "";
  let engagementSaveStateTimer = null;
  const engagementCourseScrollHintSeen = new Set();
  let engagementClubTimesDialogSwimmerId = "";
  let engagementClubTimesDialogLoading = false;
  let engagementClubTimesDialogOpener = null;
  let engagementClubRelayDialogRelayId = "";
  let engagementClubRelayDialogDraft = null;
  let engagementClubRelayDialogOpener = null;
  let engagementClubRelayDialogSaving = false;
  const engagementClubEntryTimeHistoryCache = new Map();
  const engagementClubEntryTimeHistoryRequests = new Map();
  const engagementClubSwimmerEventTimesCache = new Map();
  const engagementClubSwimmerEventTimesRequests = new Map();
  const engagementClubSwimmerEventTimesBatch = new Map();
  let engagementClubSwimmerEventTimesBatchTimer = null;

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
    global.LivePalmesPortalAuth = adminAuth;
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

  const PORTAL_FRENCH_ERROR_REPLACEMENTS = [
    [/\bAcces\b/g, "Accès"],
    [/\bacces\b/g, "accès"],
    [/\bCompetition\b/g, "Compétition"],
    [/\bcompetition\b/g, "compétition"],
    [/\bEpreuve\b/g, "Épreuve"],
    [/\bepreuve\b/g, "épreuve"],
    [/\bRegion\b/g, "Région"],
    [/\bregion\b/g, "région"],
    [/\bNumero\b/g, "Numéro"],
    [/\bnumero\b/g, "numéro"],
    [/\bPrenom\b/g, "Prénom"],
    [/\bprenom\b/g, "prénom"],
    [/\bSelectionnez\b/g, "Sélectionnez"],
    [/\bselectionne(e|es|s)?\b/g, "sélectionné$1"],
    [/\bequipe\b/g, "équipe"],
    [/\bperimetre\b/g, "périmètre"],
    [/\bdesactive(e|es|s)?\b/g, "désactivé$1"],
    [/\breactive(e|es|s)?\b/g, "réactivé$1"],
    [/\bcree(e|es|s)?\b/g, "créé$1"],
    [/\bsupprime(e|es|s)?\b/g, "supprimé$1"],
    [/\benregistre(e|es|s)?\b/g, "enregistré$1"],
    [/\butilise(e|es|s)?\b/g, "utilisé$1"],
    [/\breserve(e|es|s)?\b/g, "réservé$1"],
    [/\blimite(e|es|s)?\b/g, "limité$1"],
    [/\bdedie(e|es|s)?\b/g, "dédié$1"],
    [/\bnecessaire\b/g, "nécessaire"],
    [/\bdefinitive\b/g, "définitive"],
    [/\birreversible\b/g, "irréversible"],
    [/\bDecision\b/g, "Décision"],
    [/\bdeja\b/g, "déjà"],
    [/\bmeme\b/g, "même"],
    [/\betre\b/g, "être"],
    [/\bete\b/g, "été"],
    [/\bcreer\b/g, "créer"],
    [/\bCompletez\b/g, "Complétez"],
    [/\bperiode\b/g, "période"],
    [/\bdebut\b/g, "début"],
    [/\bcloture\b/g, "clôture"],
    [/\bdepassee\b/g, "dépassée"],
    [/\bposterieur(e|es|s)?\b/g, "postérieur$1"],
    [/\begale\b/g, "égale"],
    [/\brecapitulatif\b/g, "récapitulatif"],
    [/\bderogation\b/g, "dérogation"],
    [/\bidentite\b/g, "identité"],
    [/\bplutot\b/g, "plutôt"],
    [/\blie(e|es|s)?\b/g, "lié$1"],
    [/\belement\b/g, "élément"],
    [/\breferentiel\b/g, "référentiel"],
    [/\bfederal\b/g, "fédéral"],
    [/\bprevisualisation\b/g, "prévisualisation"],
    [/\bimportee\b/g, "importée"]
  ];

  function normalizePortalFrenchError(error) {
    const source = String(error?.message || "");
    const message = PORTAL_FRENCH_ERROR_REPLACEMENTS.reduce(
      (value, [pattern, replacement]) => value.replace(pattern, replacement),
      source
    );
    if (!message || message === source) return error;
    try {
      error.message = message;
      return error;
    } catch {
      const normalizedError = new Error(message);
      normalizedError.code = error?.code;
      normalizedError.details = error?.details;
      return normalizedError;
    }
  }

  const portalCallSamples = new Map();

  function recordPortalCall(name, startedAt, data, ok) {
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    let responseBytes = 0;
    try {
      responseBytes = new TextEncoder().encode(JSON.stringify(data || {})).length;
    } catch {}
    const samples = portalCallSamples.get(name) || [];
    samples.push({ durationMs, responseBytes, ok, measuredAt: new Date().toISOString() });
    if (samples.length > 100) samples.splice(0, samples.length - 100);
    portalCallSamples.set(name, samples);
  }

  function portalCallMetrics() {
    return Object.fromEntries([...portalCallSamples.entries()].map(([name, samples]) => {
      const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right);
      const percentile = (ratio) => durations[Math.min(durations.length - 1, Math.max(0, Math.ceil(durations.length * ratio) - 1))] || 0;
      return [name, {
        count: samples.length,
        errorCount: samples.filter((sample) => !sample.ok).length,
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        lastResponseBytes: samples.at(-1)?.responseBytes || 0
      }];
    }));
  }

  if (typeof globalThis !== "undefined") globalThis.LivePalmesPortalMetrics = portalCallMetrics;

  async function callFunction(name, payload) {
    const functions = functionsService();
    if (!functions?.httpsCallable) throw new Error("Cloud Functions LivePalmes indisponibles.");
    const activeClubId = activeEngagementClubIdForProfile(currentAccessProfile);
    const startedAt = performance.now();
    try {
      const result = await functions.httpsCallable(name)({
        ...(payload || {}),
        ...(activeClubId ? { activeClubId } : {})
      });
      const data = result.data || {};
      recordPortalCall(name, startedAt, data, true);
      return data;
    } catch (error) {
      recordPortalCall(name, startedAt, null, false);
      throw normalizePortalFrenchError(error);
    }
  }

  async function callFunctionWithTimeout(name, payload, timeoutMs = 30000) {
    let timeoutId = null;
    try {
      return await Promise.race([
        callFunction(name, payload),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Délai de lecture dépassé. Réessayez dans quelques instants.")), timeoutMs);
        })
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
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

  function markLastRefresh(element) {
    if (element) element.dataset.lastRefreshAt = new Date().toISOString();
  }

  function lastRefreshTime(element) {
    const value = element?.dataset.lastRefreshAt || "";
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function lastRefreshSuffix(element) {
    const time = lastRefreshTime(element);
    return time ? ` Dernière actualisation à ${time}.` : "";
  }

  function toggleLoginPasswordVisibility() {
    if (!elements.password || !elements.passwordToggle) return;
    const visible = elements.password.type === "password";
    elements.password.type = visible ? "text" : "password";
    elements.passwordToggle.textContent = visible ? "Masquer" : "Afficher";
    elements.passwordToggle.setAttribute("aria-pressed", visible ? "true" : "false");
  }

  function closeAccountMenu() {
    elements.accountToggle?.setAttribute("aria-expanded", "false");
    if (elements.accountActions) elements.accountActions.hidden = true;
  }

  function canManagePerformances() {
    return canUse("records.manage") || canUse("competitions.import");
  }

  function setPortalNavigationPinned(pinned, { persist = true } = {}) {
    const nextPinned = Boolean(pinned);
    if (nextPinned) elements.sidebar?.classList.remove("is-collapsed-after-navigation");
    elements.sidebar?.classList.toggle("is-pinned", nextPinned);
    elements.navPin?.setAttribute("aria-pressed", nextPinned ? "true" : "false");
    const label = nextPinned ? "Libérer la navigation" : "Épingler la navigation ouverte";
    elements.navPin?.setAttribute("aria-label", label);
    if (elements.navPin) elements.navPin.title = label;
    if (!persist) return;
    try {
      global.localStorage?.setItem(PORTAL_NAV_PIN_STORAGE_KEY, nextPinned ? "true" : "false");
    } catch {}
  }

  function restorePortalNavigationPinned() {
    let pinned = false;
    try {
      pinned = global.localStorage?.getItem(PORTAL_NAV_PIN_STORAGE_KEY) === "true";
    } catch {}
    setPortalNavigationPinned(pinned, { persist: false });
  }

  function initializePortalNavigationLabels() {
    elements.navigation?.querySelectorAll("a, .admin-portal-nav-parent").forEach((item) => {
      if (item.title) return;
      const label = item.querySelector(":scope > span:not(.admin-portal-nav-icon)")?.textContent?.trim() || item.textContent?.trim();
      if (label) item.title = label;
    });
  }

  function setMobilePortalNavigationOpen(open) {
    const expanded = Boolean(open);
    elements.navToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    elements.sidebar?.classList.toggle("is-open", expanded);
    const label = `${expanded ? "Fermer" : "Ouvrir"} le menu de navigation`;
    elements.navToggle?.setAttribute("aria-label", label);
    if (elements.navToggle) elements.navToggle.title = label;
  }

  function collapsePortalNavigationAfterSelection() {
    const mobileNavigation = global.matchMedia?.("(max-width: 1080px)")?.matches;
    if (mobileNavigation) {
      setMobilePortalNavigationOpen(false);
      return;
    }
    const compactDesktop = global.matchMedia?.("(min-width: 1081px) and (max-width: 1439px)")?.matches;
    if (!compactDesktop || elements.sidebar?.classList.contains("is-pinned")) return;
    elements.sidebar?.classList.add("is-collapsed-after-navigation");
    if (document.activeElement instanceof HTMLElement && elements.navigation?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  function canManageEngagements() {
    return canUse("engagements.club.manage") ||
      canUse("engagements.region.manage") ||
      canUse("engagements.national.manage");
  }

  function canViewActivityLog() {
    return canUse("admin.full");
  }

  function canAccessEngagementsView() {
    return canManageEngagements() || canViewActivityLog();
  }

  function canCreateEngagementCompetition() {
    return canUse("engagements.region.manage") || canUse("engagements.national.manage");
  }

  function canDeleteEngagementCompetitionDirectly() {
    return canUse("engagements.national.manage");
  }

  function canDeleteEngagementCompetitionImmediately(competition = {}) {
    return canDeleteEngagementCompetitionDirectly() || (
      canEditEngagementCompetition(competition) && (competition.entryStatus || "upcoming") === "upcoming"
    );
  }

  function canReviewEngagementAccessRequests() {
    return canUse("engagements.region.manage") || canUse("engagements.national.manage");
  }

  function canAccessEngagementRoute(entry) {
    if (["club", "clubSwimmers", "clubPeople"].includes(entry)) {
      return canUse("engagements.club.manage");
    }
    if (entry === "adminDeletionRequests") return canDeleteEngagementCompetitionDirectly();
    if (entry === "adminAudit") return canViewActivityLog();
    if (entry === "adminAccessRequests") return canReviewEngagementAccessRequests();
    if (entry === "adminCalendar" || entry === "adminCreate") return canCreateEngagementCompetition();
    return false;
  }

  function preferredEngagementRouteHash() {
    if (canUse("engagements.club.manage")) return "#club-competitions";
    if (canCreateEngagementCompetition()) return "#competitions-calendrier";
    if (canViewActivityLog()) return "#administration-historique";
    return "#accueil";
  }

  function canManageAccessDirectory() {
    return canUse("admin.full") || canUse("engagements.region.manage") || canUse("engagements.national.manage");
  }

  function canDeleteAccessUserDirectly() {
    return canUse("engagements.national.manage") || canUse("admin.full");
  }

  function engagementClubScope(user = currentAccessProfile || {}) {
    const activeClubId = activeEngagementClubIdForProfile(user);
    if (activeClubId) return activeClubId;
    const clubScope = user.accessScopes?.["engagements.club.manage"] || {};
    return clubScope.scopeId || user.clubId || "";
  }

  function canSwitchEngagementClub(user = currentAccessProfile || {}) {
    const capabilities = new Set(user?.capabilities || []);
    return capabilities.has("engagements.club.manage") && capabilities.has("engagements.club.switch");
  }

  function activeEngagementClubIdForProfile(user = currentAccessProfile || {}) {
    if (!activeEngagementClubId || !canSwitchEngagementClub(user)) return "";
    return accessClubReferenceById.has(activeEngagementClubId) ? activeEngagementClubId : "";
  }

  function activeEngagementClubProfile(user = currentAccessProfile || {}) {
    const activeClubId = activeEngagementClubIdForProfile(user);
    const activeClub = accessClubFromId(activeClubId);
    if (!activeClub) return user;
    return {
      ...user,
      clubId: activeClub.clubId,
      clubName: activeClub.clubName,
      regionId: activeClub.regionId || user.regionId || "",
      accessScopes: {
        ...(user.accessScopes || {}),
        "engagements.club.manage": {
          ...(user.accessScopes?.["engagements.club.manage"] || {}),
          scopeType: "club",
          scopeId: activeClub.clubId,
          scopeName: activeClub.clubName
        }
      }
    };
  }

  function restoreActiveEngagementClubFromSession() {
    try {
      activeEngagementClubId = String(global.sessionStorage?.getItem(PORTAL_ACTIVE_CLUB_SESSION_KEY) || "").trim();
    } catch {
      activeEngagementClubId = "";
    }
  }

  function clearActiveEngagementClub() {
    activeEngagementClubId = "";
    try {
      global.sessionStorage?.removeItem(PORTAL_ACTIVE_CLUB_SESSION_KEY);
    } catch {}
  }

  function setActiveEngagementClub(clubId = "") {
    const nextClubId = String(clubId || "").trim();
    const homeClubId = currentAccessProfile?.accessScopes?.["engagements.club.manage"]?.scopeId || currentAccessProfile?.clubId || "";
    if (!nextClubId || nextClubId === homeClubId) {
      clearActiveEngagementClub();
    } else {
      activeEngagementClubId = nextClubId;
      try {
        global.sessionStorage?.setItem(PORTAL_ACTIVE_CLUB_SESSION_KEY, nextClubId);
      } catch {}
    }
    resetEngagementClubData();
    renderCurrentUser(currentAccessProfile || {});
    updateNavigationView();
  }

  function resetEngagementClubData() {
    if (elements.engagementsClubNewSwimmerDialog?.open) elements.engagementsClubNewSwimmerDialog.close();
    if (elements.engagementsClubTimesDialog?.open) elements.engagementsClubTimesDialog.close();
    if (elements.engagementsClubRelayDialog?.open) elements.engagementsClubRelayDialog.close();
    if (elements.engagementsSwimmerCorrectionDialog?.open) elements.engagementsSwimmerCorrectionDialog.close();
    engagementClubTimesDialogSwimmerId = "";
    engagementClubTimesDialogLoading = false;
    engagementClubTimesDialogOpener = null;
    engagementClubRelayDialogRelayId = "";
    engagementClubRelayDialogDraft = null;
    engagementClubRelayDialogOpener = null;
    engagementClubRelayDialogSaving = false;
    engagementClubEntryTimeHistoryCache.clear();
    engagementClubEntryTimeHistoryRequests.clear();
    engagementClubEntryMutationRevision += 1;
    engagementClubLastPersistedEntry = null;
    resetEngagementClubEntriesAutosave();
    engagementClubPersistedSwimmerIds.clear();
    setEngagementClubEntriesDirty(false);
    engagementClubPeople = [];
    engagementClubPeopleLoaded = false;
    engagementClubSwimmers = [];
    engagementClubSwimmersLoaded = false;
    engagementClubSwimmersLoading = false;
    engagementClubSwimmersClubId = "";
    engagementClubSwimmersCachedAt = 0;
    engagementClubSwimmersLoadPromise = null;
    engagementClubSwimmersRenderedCompetitionId = "";
    engagementClubEntriesRenderedCompetitionId = "";
    engagementClubRelaysRenderedCompetitionId = "";
    engagementClubRecapEntries = [];
    engagementClubRecapEntriesCompetitionId = "";
    engagementMailJobs = [];
    engagementMailJobsCompetitionId = "";
    engagementCompetitionDocumentFiles = [];
    engagementCompetitionDocumentEditingId = "";
    engagementCompetitionDocumentSaving = false;
    selectedEngagementClubEntry = null;
    engagementClubWorkspaceCache.clear();
    engagementClubWorkspaceRequests.clear();
    engagementSwimmerCorrectionOpener = null;
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
    const expanded = Boolean(open) && canManagePerformances();
    elements.performanceToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.performanceSubmenu) elements.performanceSubmenu.hidden = !expanded;
  }

  function setClubMenuOpen(open) {
    const expanded = Boolean(open) && canUse("engagements.club.manage");
    elements.clubToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.clubSubmenu) elements.clubSubmenu.hidden = !expanded;
  }

  function setDtnMenuOpen(open) {
    const expanded = Boolean(open) && canUse("dtn.view");
    elements.dtnToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.dtnSubmenu) elements.dtnSubmenu.hidden = !expanded;
  }

  function setEngagementsAdminMenuOpen(open) {
    const expanded = Boolean(open) && canCreateEngagementCompetition();
    elements.engagementsAdminToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.engagementsAdminSubmenu) elements.engagementsAdminSubmenu.hidden = !expanded;
  }

  function setNationalMenuOpen(open) {
    const expanded = Boolean(open) && (canDeleteEngagementCompetitionDirectly() || canViewActivityLog());
    elements.nationalToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.nationalSubmenu) elements.nationalSubmenu.hidden = !expanded;
  }

  function setAccessMenuOpen(open) {
    const expanded = Boolean(open) && canManageAccessDirectory();
    elements.accessToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.accessSubmenu) elements.accessSubmenu.hidden = !expanded;
  }

  function setExclusivePortalMenu(menu, open = true) {
    setClubMenuOpen(Boolean(open) && menu === "club");
    setPerformanceMenuOpen(Boolean(open) && menu === "performance");
    setDtnMenuOpen(Boolean(open) && menu === "dtn");
    setEngagementsAdminMenuOpen(Boolean(open) && menu === "engagementsAdmin");
    setNationalMenuOpen(Boolean(open) && menu === "national");
    setAccessMenuOpen(Boolean(open) && menu === "access");
  }

  function togglePortalSpace(menu, homeView, hash, toggle) {
    const onHome = requestedNavigationView() === homeView;
    const open = onHome ? toggle?.getAttribute("aria-expanded") !== "true" : true;
    setExclusivePortalMenu(menu, open);
    if (!onHome) global.location.hash = `#${hash}`;
  }

  function setOverviewSpaceExpanded(card, expanded) {
    if (!card) return;
    const toggle = card.querySelector(".admin-overview-space-toggle");
    const label = toggle?.querySelector("span:first-child");
    const toolCount = Number(card.dataset.overviewToolCount || 0);
    card.classList.toggle("is-expanded", Boolean(expanded));
    toggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (label) {
      label.textContent = expanded
        ? "Masquer les outils"
        : `Voir ${toolCount > 1 ? `les ${toolCount} outils` : "l’outil"}`;
    }
  }

  function updateOverviewSpaceTools() {
    document.querySelectorAll("[data-overview-space]").forEach((card) => {
      const visibleTools = Array.from(card.querySelectorAll("[data-overview-tool]")).filter((tool) => !tool.hidden);
      card.dataset.overviewToolCount = String(visibleTools.length);
      const toggle = card.querySelector(".admin-overview-space-toggle");
      if (toggle) toggle.hidden = visibleTools.length === 0;
      setOverviewSpaceExpanded(card, card.classList.contains("is-expanded") && visibleTools.length > 0);
    });
  }

  function isEngagementAdminMode() {
    return activeEngagementsNavEntry.startsWith("admin");
  }

  function engagementNavigationMode(entry = activeEngagementsNavEntry) {
    return String(entry || "").startsWith("admin") ? "admin" : "club";
  }

  function engagementNationalPageTitle(tab = activeEngagementNationalTab) {
    return {
      deletions: "Demandes à traiter",
      swimmers: "Nageurs",
      people: "Officiels",
      audit: "Journal d'activité"
    }[tab] || "Administration nationale";
  }

  function renderEngagementClubContext(user = currentAccessProfile || {}) {
    if (!elements.engagementsClubContext) return;
    user = activeEngagementClubProfile(user);
    const clubId = engagementClubScope(user);
    const clubLabel = clubId ? clubDisplayCode({ clubId, clubName: user.clubName }, "") : "";
    const visible = !isEngagementAdminMode() && canUse("engagements.club.manage") && Boolean(clubLabel);
    elements.engagementsClubContext.hidden = !visible;
    if (elements.engagementsClubContextName) elements.engagementsClubContextName.textContent = clubLabel || "Votre club";
  }

  function updateEngagementsModeView() {
    const adminMode = isEngagementAdminMode();
    const nextMode = adminMode ? "admin" : "club";
    const previousMode = elements.engagementsView?.dataset.engagementsMode || "";
    const peopleMode = activeEngagementsTab === "clubPeople";
    const swimmersMode = activeEngagementsTab === "clubSwimmers";
    const accessRequestsMode = activeEngagementsTab === "accessRequests";
    const adminCalendarMode = adminMode && activeEngagementsTab === "calendar";
    const createMode = activeEngagementsTab === "create";
    const nationalMode = activeEngagementsTab === "deletionRequests";
    if (elements.engagementsView) {
      elements.engagementsView.dataset.engagementsMode = nextMode;
      elements.engagementsView.dataset.engagementsTab = activeEngagementsTab;
    }
    renderEngagementClubContext();
    if (elements.engagementsViewTitle) {
      elements.engagementsViewTitle.textContent = accessRequestsMode
        ? "Demandes d'accès"
        : adminCalendarMode
          ? "Comp\u00e9titions \u00e0 administrer"
          : createMode
            ? "Cr\u00e9er une comp\u00e9tition"
            : nationalMode
              ? engagementNationalPageTitle()
              : peopleMode
                ? "Mes officiels"
                : swimmersMode
                  ? "Mes nageurs"
                  : "Engagements en comp\u00e9tition";
    }
    if (elements.engagementsCalendarActions) {
      elements.engagementsCalendarActions.hidden = !adminCalendarMode || elements.engagementsCalendarCard?.dataset.detailOpen === "true";
    }
    if (elements.engagementsClubPeopleActions) elements.engagementsClubPeopleActions.hidden = !peopleMode;
    if (elements.engagementsNationalAuditRefresh) {
      elements.engagementsNationalAuditRefresh.hidden = !nationalMode || activeEngagementNationalTab !== "audit";
    }
    if (elements.engagementsDetailEyebrow) elements.engagementsDetailEyebrow.hidden = true;
    if (elements.engagementsMineFilterLabel) elements.engagementsMineFilterLabel.hidden = true;
    if (elements.engagementsMineFilter) elements.engagementsMineFilter.checked = false;
    if (elements.engagementsStatusFilterLabel) elements.engagementsStatusFilterLabel.hidden = !adminMode;
    if (elements.engagementsStatusSegments) elements.engagementsStatusSegments.hidden = adminMode;
    if (elements.engagementsAdvancedFilters && previousMode !== nextMode) elements.engagementsAdvancedFilters.open = false;
    if (previousMode && previousMode !== nextMode && elements.engagementsStatusFilter) {
      elements.engagementsStatusFilter.value = "";
      engagementCompetitionsVisibleLimit = 24;
    }
    const staleInitialCalendar = !previousMode && engagementCompetitionsLoaded;
    if ((previousMode && previousMode !== nextMode) || staleInitialCalendar) {
      applyEngagementCalendarRegionScope(currentAccessProfile, nextMode);
      engagementCompetitions = [];
      engagementCompetitionsLoaded = false;
      engagementCompetitionsLoadedRange = "";
      engagementCompetitionsLoadedCacheKey = "";
      engagementCompetitionsCachedAt = 0;
    }
    syncEngagementStatusSegments();
    updateEngagementDetailStepLabels();
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

  function loadActiveEngagementNationalTab() {
    if (activeEngagementNationalTab === "audit") {
      if (canViewActivityLog()) loadEngagementNationalAuditLogs();
      return;
    }
    if (!canDeleteEngagementCompetitionDirectly()) return;
    if (activeEngagementNationalTab === "clubs") {
      loadEngagementNationalClubs();
    } else if (activeEngagementNationalTab === "swimmers") {
      loadEngagementNationalSwimmers();
    } else if (activeEngagementNationalTab === "people") {
      loadEngagementNationalPeople();
    } else {
      loadEngagementDeletionRequests();
      loadEngagementSwimmerChangeRequests();
      loadAccessDeletionRequests();
    }
  }

  function setEngagementNationalTab(tab = "deletions") {
    const allowedTabs = new Set(["deletions", "clubs", "swimmers", "people", "audit"]);
    const requestedTab = allowedTabs.has(tab) ? tab : "deletions";
    const nextTab = requestedTab === "audit"
      ? (canViewActivityLog() ? "audit" : "deletions")
      : (canDeleteEngagementCompetitionDirectly() ? requestedTab : "audit");
    activeEngagementNationalTab = nextTab;
    elements.engagementsNationalTabButtons?.forEach((button) => {
      const selected = button.dataset.engagementsNationalTabButton === nextTab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    elements.engagementsNationalPanels?.forEach((panel) => {
      panel.hidden = panel.dataset.engagementsNationalPanel !== nextTab;
    });
    updateEngagementsModeView();
    if (activeEngagementsTab === "deletionRequests" && requestedNavigationView() === "engagements") {
      loadActiveEngagementNationalTab();
    }
  }

  function renderEngagementNationalOverview(counts = null) {
    const safeCounts = counts && typeof counts === "object" ? counts : null;
    const total = safeCounts ? Math.max(0, Number(safeCounts.total) || 0) : 0;
    if (elements.nationalOverviewCounts) elements.nationalOverviewCounts.hidden = total === 0;
    if (elements.nationalOverviewPendingCount) {
      elements.nationalOverviewPendingCount.hidden = total === 0;
      elements.nationalOverviewPendingCount.textContent = total > 99 ? "99+" : String(total);
      elements.nationalOverviewPendingCount.setAttribute("aria-label", `${total} demande${total > 1 ? "s" : ""} en attente`);
    }
    if (elements.nationalOverviewPendingBreakdown) {
      elements.nationalOverviewPendingBreakdown.textContent = safeCounts
        ? [
            `${Math.max(0, Number(safeCounts.swimmerChanges) || 0)} correction${Number(safeCounts.swimmerChanges) === 1 ? "" : "s"}`,
            `${Math.max(0, Number(safeCounts.dataDeletions) || 0)} suppression${Number(safeCounts.dataDeletions) === 1 ? "" : "s"} de données`,
            `${Math.max(0, Number(safeCounts.accountDeletions) || 0)} suppression${Number(safeCounts.accountDeletions) === 1 ? "" : "s"} de comptes`
          ].join(" · ")
        : portalPendingOverviewLoading ? "Comptage en cours..." : "Comptage indisponible";
    }
  }

  function renderPendingBadgeCollection(
    badges,
    count = 0,
    singularLabel = "demande en attente",
    pluralLabel = "demandes en attente"
  ) {
    const safeCount = Math.max(0, Number(count) || 0);
    const accessibleLabel = safeCount === 1
      ? `1 ${singularLabel}`
      : `${safeCount} ${pluralLabel}`;
    badges?.forEach((badge) => {
      badge.hidden = safeCount === 0;
      badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
      badge.setAttribute("aria-label", accessibleLabel);
      badge.title = accessibleLabel;
    });
  }

  function renderPortalPendingOverview(overview = null) {
    const accessCount = Math.max(0, Number(overview?.accessRequests?.pending) || 0);
    const nationalCounts = overview?.nationalRequests && typeof overview.nationalRequests === "object"
      ? overview.nationalRequests
      : null;
    const nationalCount = Math.max(0, Number(nationalCounts?.total) || 0);
    renderPendingBadgeCollection(
      elements.accessPendingBadges,
      accessCount,
      "demande d'accès en attente",
      "demandes d'accès en attente"
    );
    renderPendingBadgeCollection(
      elements.nationalPendingBadges,
      nationalCount,
      "demande nationale en attente",
      "demandes nationales en attente"
    );
    renderEngagementNationalOverview(nationalCounts);
  }

  async function loadPortalPendingOverview({ force = false } = {}) {
    if (!canManageAccessDirectory() || portalPendingOverviewLoading) return;
    if (portalPendingOverviewLoaded && !force) return;
    portalPendingOverviewLoading = true;
    if (!portalPendingOverviewLoaded) renderPortalPendingOverview();
    try {
      const result = await callFunction("getPortalPendingRequestOverview", {});
      portalPendingOverviewLoaded = true;
      renderPortalPendingOverview(result);
    } catch (error) {
      portalPendingOverviewLoaded = false;
    } finally {
      portalPendingOverviewLoading = false;
      if (!portalPendingOverviewLoaded) renderPortalPendingOverview();
    }
  }

  async function loadEngagementNationalOverview({ force = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly()) return;
    await loadPortalPendingOverview({ force });
  }

  function updateEngagementDetailEditState() {
    if (!elements.engagementsEditState) return;
    if (!selectedEngagementCompetition?.id || !isEngagementAdminMode()) {
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
      ? "Suppression demandée"
      : hasDirty
        ? "Modifications non enregistrées"
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
    return global.confirm("Des modifications n'ont pas été enregistrées sur cet onglet. Changer d'onglet sans enregistrer ?");
  }

  function resolveEngagementUnsavedDecision(decision = "stay") {
    elements.engagementsUnsavedDialog?.close(decision);
    const resolve = engagementUnsavedDecisionResolver;
    engagementUnsavedDecisionResolver = null;
    if (resolve) resolve(decision);
  }

  function requestEngagementUnsavedDecision() {
    if (!elements.engagementsUnsavedDialog?.showModal) {
      return Promise.resolve(confirmLeaveDirtyEngagementTab() ? "discard" : "stay");
    }
    if (engagementUnsavedDecisionResolver) return Promise.resolve("stay");
    elements.engagementsUnsavedDialog.showModal();
    return new Promise((resolve) => { engagementUnsavedDecisionResolver = resolve; });
  }

  function discardEngagementDetailTabChanges(tab = activeEngagementsDetailTab) {
    if (tab === "general") fillEngagementEditForm(selectedEngagementCompetition || {});
    if (tab === "courses") renderEngagementEvents(selectedEngagementCompetition || {});
    if (tab === "fees") renderEngagementFees(selectedEngagementCompetition || {});
    clearEngagementDetailTabDirty(tab);
  }

  function isClubEngagementWorkflowTab(tab = "") {
    return ["documents", "team", "officials", "swimmers", "entries", "relays", "summary"].includes(tab);
  }

  function engagementClubTeamComplete(entry = selectedEngagementClubEntry || {}) {
    return entry.teamLeaderComplete === true;
  }

  function engagementClubEntryHasParticipants(entry = selectedEngagementClubEntry || {}) {
    return (Array.isArray(entry.swimmers) && entry.swimmers.length > 0) ||
      (Array.isArray(entry.officials) && entry.officials.length > 0) ||
      (Array.isArray(entry.relays) && entry.relays.length > 0);
  }

  function updateEngagementClubTeamLeaderActions(entry = selectedEngagementClubEntry || {}) {
    const teamLeader = entry.teamLeader || {};
    const writeLockReason = engagementClubWriteLockReason();
    const teamLeaderComplete = engagementClubTeamComplete(entry);
    const editorVisible = !teamLeaderComplete || engagementClubTeamEditing;
    if (elements.engagementsClubTeamChoices) elements.engagementsClubTeamChoices.hidden = !editorVisible;
    if (elements.engagementsClubTeamModifyButton) {
      elements.engagementsClubTeamModifyButton.hidden = !teamLeaderComplete || editorVisible;
      elements.engagementsClubTeamModifyButton.disabled = Boolean(writeLockReason);
    }
    if (elements.engagementsClubTeamExternalOpen) {
      elements.engagementsClubTeamExternalOpen.textContent = teamLeaderComplete && teamLeader.externalClub
        ? "Modifier le chef d’équipe hors du club"
        : "Déclarer exceptionnellement un chef d’équipe hors du club";
    }
    if (elements.engagementsClubTeamSaveButton) {
      elements.engagementsClubTeamSaveButton.disabled = Boolean(writeLockReason);
      elements.engagementsClubTeamSaveButton.textContent = teamLeader.mode === "person" && teamLeaderComplete
        ? "Remplacer le chef d'équipe"
        : "Valider le chef d'équipe";
    }
    if (elements.engagementsClubTeamRemoveButton) {
      const canRemoveTeamLeader = teamLeader.mode === "person" && teamLeaderComplete;
      const hasParticipants = engagementClubEntryHasParticipants(entry);
      elements.engagementsClubTeamRemoveButton.hidden = !canRemoveTeamLeader || editorVisible;
      elements.engagementsClubTeamRemoveButton.disabled = Boolean(writeLockReason || hasParticipants);
      elements.engagementsClubTeamRemoveButton.title = hasParticipants
        ? "Le dossier contient des nageurs, des officiels ou des relais : remplacez le chef d'équipe."
        : "Retirer le chef d'équipe et supprimer ce dossier vide.";
    }
  }

  function engagementClubWriteLockReason(competition = selectedEngagementCompetition || {}) {
    const status = competition.entryStatus || "upcoming";
    if (status === "closed") return "Les engagements sont fermes.";
    if (status !== "open") return "Les engagements ne sont pas ouverts.";
    if (!competition.entryDeadlineAt) return "";
    const deadline = new Date(competition.entryDeadlineAt);
    if (Number.isNaN(deadline.getTime())) return "";
    return deadline.getTime() < Date.now()
      ? "La date limite des engagements est depassee."
      : "";
  }

  function engagementClubWriteLocked() {
    return Boolean(engagementClubWriteLockReason());
  }

  function engagementClubInformationOnly(competition = selectedEngagementCompetition || {}) {
    return !isEngagementAdminMode() && (competition.entryStatus || "upcoming") === "upcoming";
  }

  function setEngagementClubFormControlsLocked(form, locked) {
    form?.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = locked;
    });
  }

  function setEngagementClubCompetitionFormsLocked(locked) {
    [
      elements.engagementsClubTeamForm,
      elements.engagementsClubOfficialsForm,
      elements.engagementsClubSwimmersForm,
      elements.engagementsClubEntriesForm,
      elements.engagementsClubRelaysForm
    ].forEach((form) => setEngagementClubFormControlsLocked(form, locked));
  }

  function showEngagementClubWriteLock(messageElement) {
    const reason = engagementClubWriteLockReason();
    if (!reason) return false;
    if (messageElement) {
      messageElement.textContent = reason;
      messageElement.dataset.tone = "error";
    }
    return true;
  }

  function canOpenClubEngagementTab(tab = "") {
    if (tab === "documents") return true;
    if (tab === "summary" && engagementClubWriteLocked()) return true;
    return tab === "team" || engagementClubTeamComplete();
  }

  function clubEngagementTabHiddenWhenWriteLocked(tab = "") {
    return ["officials", "swimmers", "entries", "relays"].includes(tab);
  }

  const ENGAGEMENT_DETAIL_TAB_LABELS = Object.freeze({
    general: "Général", courses: "Programme", fees: "Frais", team: "Chef d'équipe",
    officials: "Officiels", swimmers: "Nageurs", entries: "Courses individuelles", relays: "Relais",
    summary: "Récapitulatif", statistics: "Statistiques", documents: "GED", delivery: "Diffusion"
  });

  const ENGAGEMENT_DETAIL_TAB_GROUPS = Object.freeze({
    information: ["general", "courses"],
    participants: ["team", "officials", "swimmers"],
    entries: ["entries", "relays"],
    summary: ["summary"],
    statistics: ["statistics"],
    documents: ["documents"],
    delivery: ["delivery"]
  });

  function engagementDetailTabLabel(tab = "") {
    if (tab === "documents" && !isEngagementAdminMode()) return "Documents";
    return ENGAGEMENT_DETAIL_TAB_LABELS[tab] || tab;
  }

  function engagementDetailTabsForGroup(group = "") {
    const tabs = ENGAGEMENT_DETAIL_TAB_GROUPS[group] || [];
    if (isEngagementAdminMode()) return tabs;
    if (group === "information") return [...tabs, "documents"];
    if (group === "documents") return [];
    return tabs;
  }

  function visibleEngagementDetailTabs() {
    return Array.from(elements.engagementsDetailTabButtons || [])
      .filter((button) => !button.hidden)
      .map((button) => button.dataset.engagementsDetailTabButton)
      .filter(Boolean);
  }

  function engagementLastTabStorageKey(competitionId = selectedEngagementCompetitionId) {
    const clubId = String(engagementClubScope(currentAccessProfile || {}) || "club").trim();
    return `livepalmes.engagement.lastTab.${clubId}.${String(competitionId || "").trim()}`;
  }

  function storedEngagementDetailTab(competitionId = "") {
    if (!competitionId) return "";
    try {
      const tab = global.localStorage?.getItem(engagementLastTabStorageKey(competitionId)) || "";
      return isClubEngagementWorkflowTab(tab) ? tab : "";
    } catch (_) {
      return "";
    }
  }

  function rememberEngagementDetailTab(tab = "") {
    if (isEngagementAdminMode() || !selectedEngagementCompetitionId || !isClubEngagementWorkflowTab(tab)) return;
    try {
      global.localStorage?.setItem(engagementLastTabStorageKey(), tab);
    } catch (_) {
      // La navigation reste fonctionnelle si le stockage local est indisponible.
    }
  }

  function setEngagementSaveState(state = "", message = "") {
    if (engagementSaveStateTimer) global.clearTimeout(engagementSaveStateTimer);
    engagementSaveStateTimer = null;
    const node = elements.engagementsSaveState;
    if (!node) return;
    node.hidden = !state;
    node.dataset.state = state;
    node.textContent = message || (state === "saving" ? "Enregistrement…" : state === "saved" ? "Enregistré ✓" : state === "error" ? "Échec de l’enregistrement" : "");
    if (state === "saved") {
      engagementSaveStateTimer = global.setTimeout(() => {
        if (node.dataset.state === "saved") node.hidden = true;
      }, 1800);
    }
  }

  function engagementDetailTabGroup(tab = "") {
    if (tab === "documents" && !isEngagementAdminMode()) return "information";
    return Object.entries(ENGAGEMENT_DETAIL_TAB_GROUPS).find(([, tabs]) => tabs.includes(tab))?.[0] || "information";
  }

  function updateEngagementStepNavigation() {
    const tabs = visibleEngagementDetailTabs();
    const activeGroup = engagementDetailTabGroup(activeEngagementsDetailTab);
    const visibleTabs = new Set(tabs);
    let visibleStepIndex = 0;
    elements.engagementsDetailStepButtons?.forEach((button) => {
      const group = button.dataset.engagementStepButton || "";
      const groupVisible = engagementDetailTabsForGroup(group).some((tab) => visibleTabs.has(tab));
      button.hidden = !groupVisible;
      const number = button.querySelector("span");
      if (groupVisible) visibleStepIndex += 1;
      if (number && groupVisible) number.textContent = String(visibleStepIndex);
      button.setAttribute("aria-pressed", group === activeGroup ? "true" : "false");
    });
    elements.engagementsDetailTabGroups?.forEach((group) => {
      const groupName = group.dataset.engagementStepGroup || "";
      const visibleGroupTabCount = engagementDetailTabsForGroup(groupName).filter((tab) => visibleTabs.has(tab)).length;
      group.hidden = groupName !== activeGroup || visibleGroupTabCount < 2;
    });
  }

  async function requestEngagementDetailTab(tab) {
    if (tab === activeEngagementsDetailTab) return;
    if (dirtyEngagementDetailTabs.has(activeEngagementsDetailTab)) {
      const decision = await requestEngagementUnsavedDecision();
      if (decision === "stay") return;
      if (decision === "save") {
        const saved = await saveEngagementCompetitionDetail(null, { continueEditing: true });
        if (!saved) return;
      } else {
        discardEngagementDetailTabChanges(activeEngagementsDetailTab);
      }
    }
    if (!isEngagementAdminMode() && engagementClubWriteLocked() && clubEngagementTabHiddenWhenWriteLocked(tab)) {
      setEngagementsDetailTab("summary");
      return;
    }
    if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(tab) && !canOpenClubEngagementTab(tab)) {
      setEngagementsDetailTab("team");
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = "Renseignez le chef d'équipe ou confirmez la renonciation avant de commencer les engagements.";
        elements.engagementsClubTeamMessage.dataset.tone = "error";
      }
      return;
    }
    setEngagementsDetailTab(tab);
  }

  function setEngagementsTab(tab) {
    const canCreate = canCreateEngagementCompetition();
    const canNationalRequests = canDeleteEngagementCompetitionDirectly();
    const canAudit = canViewActivityLog();
    const canAccessRequests = canReviewEngagementAccessRequests();
    const canClubPeople = canUse("engagements.club.manage");
    const canClubSwimmers = canUse("engagements.club.manage");
    const allowedTabs = new Set(["calendar"]);
    if (canNationalRequests || canAudit) allowedTabs.add("deletionRequests");
    if (canAccessRequests) allowedTabs.add("accessRequests");
    if (canClubPeople) allowedTabs.add("clubPeople");
    if (canClubSwimmers) allowedTabs.add("clubSwimmers");
    const nextTab = allowedTabs.has(tab) ? tab : "calendar";
    activeEngagementsTab = nextTab;
    if (nextTab === "accessRequests") {
      activeEngagementsNavEntry = "adminAccessRequests";
    } else if (nextTab === "deletionRequests") {
      activeEngagementsNavEntry = activeEngagementsNavEntry === "adminAudit" ? "adminAudit" : "adminDeletionRequests";
    } else if (nextTab === "clubPeople") {
      activeEngagementsNavEntry = "clubPeople";
    } else if (nextTab === "clubSwimmers") {
      activeEngagementsNavEntry = "clubSwimmers";
    } else if (activeEngagementsNavEntry === "adminCreate" || activeEngagementsNavEntry === "adminAccessRequests" || activeEngagementsNavEntry === "adminDeletionRequests" || activeEngagementsNavEntry === "adminAudit" || activeEngagementsNavEntry === "clubPeople" || activeEngagementsNavEntry === "clubSwimmers") {
      activeEngagementsNavEntry = canCreate ? "adminCalendar" : "club";
    }
    elements.engagementsTabButtons?.forEach((button) => {
      const buttonTab = button.dataset.engagementsTabButton;
      const nationalOnly = buttonTab === "deletionRequests";
      const accessRequestsOnly = buttonTab === "accessRequests";
      const clubOnly = buttonTab === "clubPeople";
      const clubSwimmersOnly = buttonTab === "clubSwimmers";
      button.hidden = buttonTab === "create" || (nationalOnly && !canNationalRequests && !canAudit) || (accessRequestsOnly && !canAccessRequests) || (clubOnly && !canClubPeople) || (clubSwimmersOnly && !canClubSwimmers);
      const selected = buttonTab === nextTab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    elements.engagementsTabPanels?.forEach((panel) => {
      const panelTab = panel.dataset.engagementsTabPanel;
      const nationalOnly = panelTab === "deletionRequests";
      const accessRequestsOnly = panelTab === "accessRequests";
      const clubOnly = panelTab === "clubPeople";
      const clubSwimmersOnly = panelTab === "clubSwimmers";
      panel.hidden = panelTab === "create" || panelTab !== nextTab || (nationalOnly && !canNationalRequests && !canAudit) || (accessRequestsOnly && !canAccessRequests) || (clubOnly && !canClubPeople) || (clubSwimmersOnly && !canClubSwimmers);
    });
    if (nextTab === "deletionRequests") setEngagementNationalTab(activeEngagementNationalTab);
  }

  function setEngagementsDetailTab(tab) {
    const allowedTabs = new Set(["general", "courses", "team", "officials", "swimmers", "entries", "relays", "summary", "statistics", "documents", "delivery"]);
    const adminOnlyTabs = new Set(["statistics", "delivery"]);
    const clubOnlyTabs = new Set(["team", "officials", "swimmers", "entries", "relays", "summary"]);
    const requestedTab = allowedTabs.has(tab) ? tab : "general";
    const clubWriteLocked = !isEngagementAdminMode() && engagementClubWriteLocked();
    const clubInformationOnly = engagementClubInformationOnly();
    const clubOfficialsNotRequired = !isEngagementAdminMode() && selectedEngagementCompetition?.officialsRequired === false;
    const requestedTabHiddenByClubLock = clubWriteLocked && clubEngagementTabHiddenWhenWriteLocked(requestedTab);
    const nextTab = clubInformationOnly && clubOnlyTabs.has(requestedTab)
      ? "general"
      : requestedTabHiddenByClubLock
      ? "summary"
      : clubOfficialsNotRequired && requestedTab === "officials"
      ? (engagementClubTeamComplete() ? "swimmers" : "team")
      : !isEngagementAdminMode() && adminOnlyTabs.has(requestedTab)
      ? "general"
      : isEngagementAdminMode() && clubOnlyTabs.has(requestedTab)
        ? "general"
        : requestedTab;
    activeEngagementsDetailTab = nextTab;
    if (!isEngagementAdminMode() && nextTab === "team") updateEngagementClubTeamLeaderActions();
    elements.engagementsDetailTabButtons?.forEach((button) => {
      const buttonTab = button.dataset.engagementsDetailTabButton;
      const adminOnly = adminOnlyTabs.has(buttonTab);
      const clubOnly = clubOnlyTabs.has(buttonTab);
      const hiddenByClubLock = clubWriteLocked && clubEngagementTabHiddenWhenWriteLocked(buttonTab);
      const hiddenBecauseOfficialsNotRequired = clubOfficialsNotRequired && buttonTab === "officials";
      const lockedClubStep = !isEngagementAdminMode() && isClubEngagementWorkflowTab(buttonTab) && !canOpenClubEngagementTab(buttonTab);
      const hiddenForMode = (button.hasAttribute("data-engagements-club-documents-tab") && isEngagementAdminMode())
        || (button.hasAttribute("data-engagements-admin-documents-tab") && !isEngagementAdminMode());
      button.hidden = hiddenForMode || (adminOnly && !isEngagementAdminMode()) || (clubOnly && (isEngagementAdminMode() || clubInformationOnly)) || hiddenByClubLock || hiddenBecauseOfficialsNotRequired;
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
      const hiddenByClubLock = clubWriteLocked && clubEngagementTabHiddenWhenWriteLocked(panelTab);
      const hiddenBecauseOfficialsNotRequired = clubOfficialsNotRequired && panelTab === "officials";
      panel.hidden = panelTab !== nextTab || (adminOnly && !isEngagementAdminMode()) || (clubOnly && (isEngagementAdminMode() || clubInformationOnly)) || hiddenByClubLock || hiddenBecauseOfficialsNotRequired;
    });
    if (!isEngagementAdminMode() && (nextTab === "team" || nextTab === "officials") && canUse("engagements.club.manage") && !engagementClubPeopleLoaded) {
      void loadEngagementClubPeople({ silent: true });
    }
    if (!isEngagementAdminMode() && (nextTab === "team" || nextTab === "officials" || nextTab === "swimmers" || nextTab === "entries" || nextTab === "relays") && canUse("engagements.club.manage")) {
      if (!engagementClubSwimmersLoaded) {
        void loadEngagementClubSwimmers({ silent: engagementClubSwimmersLoaded });
      } else if (nextTab === "officials") {
        renderEngagementClubOfficials();
      } else if (nextTab === "swimmers" && engagementClubSwimmersRenderedCompetitionId !== selectedEngagementCompetitionId) {
        renderEngagementClubSwimmers();
      } else if (nextTab === "entries" && engagementClubEntriesRenderedCompetitionId !== selectedEngagementCompetitionId) {
        renderEngagementClubEntries();
      } else if (nextTab === "relays" && engagementClubRelaysRenderedCompetitionId !== selectedEngagementCompetitionId) {
        renderEngagementClubRelays();
      }
    }
    if (!isEngagementAdminMode() && nextTab === "summary" && canUse("engagements.club.manage")) {
      renderEngagementClubSummary();
    }
    if (isEngagementAdminMode() && nextTab === "statistics") {
      loadEngagementCompetitionStatistics();
    }
    if (isEngagementAdminMode() && nextTab === "documents") {
      loadEngagementClubRecapFiles();
    }
    if (isEngagementAdminMode() && nextTab === "delivery") {
      loadEngagementMailJobs();
    }
    rememberEngagementDetailTab(nextTab);
    updateEngagementStepNavigation();
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

  function isClubOnlyPortalProfile() {
    if (!canUse("engagements.club.manage")) return false;
    return ![
      "admin.full",
      "engagements.region.manage",
      "engagements.national.manage",
      "records.manage",
      "competitions.import",
      "dtn.view"
    ].some((capability) => canUse(capability));
  }

  function applyPortalHomeForProfile() {
    const clubOnly = isClubOnlyPortalProfile();
    document.body.dataset.portalHome = clubOnly ? "club" : "overview";
    if (elements.homeLink) {
      elements.homeLink.href = clubOnly ? "#espace-club" : "#accueil";
      elements.homeLink.dataset.adminViewLink = clubOnly ? "clubHome" : "dashboard";
    }
    if (elements.homeLabel) elements.homeLabel.textContent = clubOnly ? "Accueil club" : "Vue d’ensemble";
    document.dispatchEvent(new CustomEvent("livepalmes:portal-home-change"));
    const removedAccessRequestRoute = global.location.hash === "#demande-acces";
    if (removedAccessRequestRoute || (clubOnly && (!global.location.hash || global.location.hash === "#accueil"))) {
      global.location.hash = clubOnly ? "#espace-club" : "#accueil";
    }
  }

  function updateCapabilityView() {
    document.querySelectorAll("[data-capability-nav]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityNav);
    });
    document.querySelectorAll("[data-engagements-nav], [data-engagements-panel]").forEach((item) => {
      item.hidden = !canAccessEngagementsView();
    });
    document.querySelectorAll("[data-engagements-admin-nav]").forEach((item) => {
      item.hidden = !canCreateEngagementCompetition();
    });
    document.querySelectorAll("[data-engagements-admin-home]").forEach((item) => {
      item.hidden = !canCreateEngagementCompetition();
    });
    document.querySelectorAll("[data-engagements-club-nav]").forEach((item) => {
      item.hidden = !canUse("engagements.club.manage");
    });
    document.querySelectorAll("[data-engagements-club-home]").forEach((item) => {
      item.hidden = !canUse("engagements.club.manage");
    });
    document.querySelectorAll("[data-engagements-national-nav]").forEach((item) => {
      item.hidden = !canDeleteEngagementCompetitionDirectly();
    });
    document.querySelectorAll('[data-engagements-national-target]:not([data-engagements-national-target="audit"])').forEach((item) => {
      item.hidden = !canDeleteEngagementCompetitionDirectly();
    });
    document.querySelectorAll('[data-engagements-national-target="audit"]').forEach((item) => {
      item.hidden = !canViewActivityLog();
    });
    document.querySelectorAll("[data-engagements-national-home]").forEach((item) => {
      item.hidden = !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
    });
    document.querySelectorAll("[data-overview-club]").forEach((item) => {
      item.hidden = !canUse("engagements.club.manage");
    });
    document.querySelectorAll("[data-overview-competition]").forEach((item) => {
      item.hidden = !canCreateEngagementCompetition();
    });
    document.querySelectorAll("[data-overview-performance]").forEach((item) => {
      item.hidden = !canManagePerformances();
    });
    document.querySelectorAll("[data-overview-national]").forEach((item) => {
      item.hidden = !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
    });
    document.querySelectorAll("[data-engagements-admin-request-nav]").forEach((item) => {
      item.hidden = !canReviewEngagementAccessRequests();
    });
    document.querySelectorAll("[data-access-management-nav], [data-access-management-panel]").forEach((item) => {
      item.hidden = !canManageAccessDirectory();
    });
    if (elements.clubMenu) elements.clubMenu.hidden = !canUse("engagements.club.manage");
    if (elements.nationalMenu) elements.nationalMenu.hidden = !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
    if (elements.accessAdd) elements.accessAdd.hidden = !canUse("admin.full");
    if (elements.accessPanel && !canUse("admin.full")) elements.accessPanel.hidden = true;
    if (elements.accessDeletionRequestsPanel) elements.accessDeletionRequestsPanel.hidden = !canDeleteAccessUserDirectly();
    if (!canDeleteEngagementCompetitionDirectly()) {
      renderPendingBadgeCollection(elements.nationalPendingBadges, 0);
      renderEngagementNationalOverview();
    }
    document.querySelectorAll(".admin-national-home-group").forEach((group) => {
      group.hidden = !Array.from(group.querySelectorAll("a")).some((link) => !link.hidden);
    });
    if (!canReviewEngagementAccessRequests()) renderPendingBadgeCollection(elements.accessPendingBadges, 0);
    setEngagementsTab(activeEngagementsTab);
    if (elements.performanceMenu) elements.performanceMenu.hidden = !canManagePerformances();
    if (elements.dtnMenu) elements.dtnMenu.hidden = !canUse("dtn.view");
    document.querySelectorAll(".admin-portal-nav-group").forEach((group) => {
      group.hidden = !Array.from(group.children).some((child) => {
        if (child.tagName === "A") return !child.hidden;
        return child.classList?.contains("admin-portal-nav-nested") && !child.hidden;
      });
    });
    document.querySelectorAll("[data-capability-panel]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityPanel);
    });
    updateOverviewSpaceTools();
    setExclusivePortalMenu("", false);
    updateNavigationView();
  }

  function syncEngagementRouteFromHash() {
    let route = ENGAGEMENT_ROUTE_BY_HASH[global.location.hash];
    if (global.location.hash === "#engagements" || (route && !canAccessEngagementRoute(route.entry))) {
      const fallbackHash = preferredEngagementRouteHash();
      if (global.location.hash !== fallbackHash) global.history.replaceState(null, "", fallbackHash);
      route = ENGAGEMENT_ROUTE_BY_HASH[fallbackHash];
    }
    if (!route) return false;
    const previousMode = elements.engagementsView?.dataset.engagementsMode || "";
    const nextMode = engagementNavigationMode(route.entry);
    const contextChanged = Boolean(previousMode && previousMode !== nextMode);
    if (contextChanged && selectedEngagementCompetitionId && !confirmLeaveDirtyEngagementTab()) {
      activeEngagementsNavEntry = previousMode === "admin" ? "adminCalendar" : "club";
      setEngagementsTab("calendar");
      const previousHash = previousMode === "admin" ? "#competitions-calendrier" : "#club-competitions";
      if (global.location.hash !== previousHash) global.history.replaceState(null, "", previousHash);
      return false;
    }
    activeEngagementsNavEntry = route.entry;
    setEngagementsTab(route.tab);
    if (route.nationalTab) setEngagementNationalTab(route.nationalTab);
    if (contextChanged) closeEngagementCompetitionDetail({ skipConfirmation: true });
    return true;
  }

  function requestedNavigationView() {
    if (!global.location.hash || global.location.hash === "#accueil") return "dashboard";
    if (global.location.hash === "#espace-club") return "clubHome";
    if (global.location.hash === "#gestion-performances") return "performanceHome";
    if (global.location.hash === "#gestion-acces") return "accessHome";
    if (global.location.hash === "#gestion-utilisateurs") return "access";
    if (global.location.hash === "#mon-compte") return "account";
    if (global.location.hash === "#records-mpf") return "records";
    if (global.location.hash === "#import-competitions") return "import";
    if (global.location.hash === "#correction-performance") return "correction";
    if (["#organisation-competitions", "#administration-competitions"].includes(global.location.hash)) return "engagementsAdminHome";
    if (global.location.hash === "#administration-nationale") return "nationalHome";
    if (global.location.hash === "#engagements" || ENGAGEMENT_ROUTE_BY_HASH[global.location.hash]) return "engagements";
    if (global.location.hash === "#espace-dtn") return "dtnHome";
    if (["#espace-dtn-france", "#espace-dtn-edf", "#espace-dtn-listes"].includes(global.location.hash)) return "dtn";
    return "dashboard";
  }

  function updateNavigationView() {
    syncEngagementRouteFromHash();
    const requestedView = requestedNavigationView();
    const accessDenied = (requestedView === "access" || requestedView === "accessHome") && !canManageAccessDirectory();
    const recordsDenied = requestedView === "records" && !canUse("records.manage");
    const importDenied = requestedView === "import" && !canUse("competitions.import");
    const correctionDenied = requestedView === "correction" && !canUse("competitions.import");
    const performanceHomeDenied = requestedView === "performanceHome" && !canManagePerformances();
    const clubHomeDenied = requestedView === "clubHome" && !canUse("engagements.club.manage");
    const dtnDenied = (requestedView === "dtn" || requestedView === "dtnHome") && !canUse("dtn.view");
    const engagementsAdminHomeDenied = requestedView === "engagementsAdminHome" && !canCreateEngagementCompetition();
    const nationalHomeDenied = requestedView === "nationalHome" && !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
    const engagementsDenied = requestedView === "engagements" && !canAccessEngagementsView();
    const activeView = accessDenied || recordsDenied || importDenied || correctionDenied || performanceHomeDenied || clubHomeDenied || dtnDenied || engagementsAdminHomeDenied || nationalHomeDenied || engagementsDenied
      ? "dashboard"
      : requestedView;
    document.querySelectorAll("[data-admin-view]").forEach((section) => {
      section.hidden = section.dataset.adminView !== activeView;
    });
    document.querySelectorAll("[data-admin-view-link]").forEach((link) => {
      const dtnHash = link.dataset.dtnGridLink ? `#espace-dtn-${link.dataset.dtnGridLink}` : "";
      const engagementsEntry = link.dataset.engagementsNavEntry || "";
      const engagementLinkMatches = activeView !== "engagements" || !engagementsEntry || engagementsEntry === activeEngagementsNavEntry;
      const nationalTarget = link.dataset.engagementsNationalTarget || "";
      const nationalLinkMatches = !nationalTarget || nationalTarget === activeEngagementNationalTab;
      const isActive = link.dataset.adminViewLink === activeView &&
        engagementLinkMatches &&
        nationalLinkMatches &&
        (!dtnHash || global.location.hash === dtnHash);
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    const performanceSpaceActive = ["performanceHome", "records", "import", "correction"].includes(activeView);
    const dtnSpaceActive = ["dtnHome", "dtn"].includes(activeView);
    const clubSpaceActive = activeView === "clubHome" || (activeView === "engagements" && ["club", "clubSwimmers", "clubPeople"].includes(activeEngagementsNavEntry));
    const nationalSpaceActive = activeView === "nationalHome" || (activeView === "engagements" && ["adminDeletionRequests", "adminAudit"].includes(activeEngagementsNavEntry));
    const accessSpaceActive = activeView === "accessHome" || activeView === "access" || (activeView === "engagements" && activeEngagementsNavEntry === "adminAccessRequests");
    const engagementsAdminSpaceActive = activeView === "engagementsAdminHome" || (activeView === "engagements" && activeEngagementsNavEntry.startsWith("admin") && !["adminAccessRequests", "adminDeletionRequests", "adminAudit"].includes(activeEngagementsNavEntry));
    const activeMenu = clubSpaceActive ? "club" : performanceSpaceActive ? "performance" : dtnSpaceActive ? "dtn" : nationalSpaceActive ? "national" : accessSpaceActive ? "access" : engagementsAdminSpaceActive ? "engagementsAdmin" : "";
    setExclusivePortalMenu(activeMenu, Boolean(activeMenu));
    [
      [elements.clubToggle, activeView === "clubHome" && document.body.dataset.portalHome !== "club"],
      [elements.performanceToggle, activeView === "performanceHome"],
      [elements.dtnToggle, activeView === "dtnHome"],
      [elements.engagementsAdminToggle, activeView === "engagementsAdminHome"],
      [elements.nationalToggle, activeView === "nationalHome"],
      [elements.accessToggle, activeView === "accessHome"]
    ].forEach(([toggle, active]) => {
      toggle?.classList.toggle("active", active);
      if (active) toggle?.setAttribute("aria-current", "page");
      else toggle?.removeAttribute("aria-current");
    });
    const activeLink = document.querySelector("[data-admin-view-link].active");
    const activeParent = document.querySelector(".admin-portal-nav-parent.active");
    const activeParentLabel = activeParent?.children?.[1]?.textContent?.trim();
    if (elements.navCurrent) elements.navCurrent.textContent = activeLink?.textContent?.trim() || activeParentLabel || "Navigation";
    const recordsActive = activeView === "records";
    const importActive = activeView === "import";
    const correctionActive = activeView === "correction";
    const engagementsActive = activeView === "engagements";
    const importModuleActive = importActive || correctionActive;
    const performanceModuleActive = recordsActive || importModuleActive;
    if (engagementsActive) updateEngagementsModeView();
    if (elements.performanceStyles) elements.performanceStyles.disabled = !performanceModuleActive;
    if (elements.importStyles) elements.importStyles.disabled = !importModuleActive;
    document.body.classList.toggle("performance-admin-page", performanceModuleActive);
    if (recordsActive) loadRecordModule();
    if (importModuleActive) loadImportModule();
    if (dtnSpaceActive && activeView === "dtn") loadDtnModule();
    if (activeView === "nationalHome") loadEngagementNationalOverview();
    if (engagementsActive && activeEngagementsTab === "calendar") loadEngagementCompetitions();
    if (engagementsActive && activeEngagementsTab === "accessRequests") loadEngagementAccessRequests();
    if (engagementsActive && activeEngagementsTab === "deletionRequests") loadActiveEngagementNationalTab();
    if (engagementsActive && activeEngagementsTab === "clubPeople") {
      loadEngagementClubPeople();
      loadEngagementClubSwimmers({ silent: true });
    }
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

  function loadDtnModule() {
    if (dtnModuleLoadPromise) return dtnModuleLoadPromise;
    dtnModuleLoadPromise = loadScriptOnce(
      "assets/livepalmes-dtn-qualifications.js?v=20260818-long-operations-1",
      "livepalmes-dtn-qualifications-script"
    ).then(() => global.LivePalmesDtnQualifications?.init?.()).catch((error) => {
      dtnModuleLoadPromise = null;
      console.error("Chargement du module DTN impossible", error);
    });
    return dtnModuleLoadPromise;
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
        ["performances/public/record-placeholders.js?v=20260613-mpf-relays-mixed-1", "adminRecordPlaceholdersScript"],
        ["performances/public/data/club-reference.js?v=20260813-national-clubs-3", "adminRecordReferenceScript"],
        ["performances/public/data/performance-public/version.js", "adminRecordVersionScript"],
        ["performances/public/store.js?v=20260819-activity-log-1", "adminRecordStoreScript"]
      ];
      await Promise.all(scripts.map(([src, id]) => loadScriptOnce(src, id)));
      await loadScriptOnce("performances/public/admin-records.js?v=20260817-records-source-1", "adminRecordModuleScript");
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

  function loadImportSpreadsheet() {
    if (!importSpreadsheetLoadPromise) {
      importSpreadsheetLoadPromise = loadScriptOnce(
        "performances/public/vendor/xlsx.full.min.js?v=20260603-international-xlsx-1",
        "adminImportXlsxScript"
      ).catch((error) => {
        importSpreadsheetLoadPromise = null;
        throw error;
      });
    }
    return importSpreadsheetLoadPromise;
  }

  global.LivePalmesLoadImportSpreadsheet = loadImportSpreadsheet;

  function loadImportModule({ includeSpreadsheet = false } = {}) {
    if (importModuleLoadPromise) {
      return includeSpreadsheet
        ? Promise.all([importModuleLoadPromise, loadImportSpreadsheet()]).then(() => undefined)
        : importModuleLoadPromise;
    }
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
        ["performances/public/data/performance-public/version.js", "adminImportVersionScript"]
      ];
      await Promise.all(scripts.map(([src, id]) => loadScriptOnce(src, id)));
      await loadScriptOnce("performances/public/import-competitions.js?v=20260818-import-progress-1", "adminImportModuleScript");
      if (includeSpreadsheet) await loadImportSpreadsheet();
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
      "engagements.club.switch": "Changement de club national",
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

  function fillLivePalmesRegionSelect(select, placeholder = "À choisir") {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = "";
    select.append(new Option(placeholder, ""));
    LIVEPALMES_REGION_DEFINITIONS.forEach((region) => {
      select.append(new Option(region, region));
    });
    setRegionSelectValue(select, currentValue);
  }

  function selectedRegionMultiSelectValues(select) {
    if (!select) return [];
    const seen = new Set();
    return Array.from(select.selectedOptions || [])
      .map((option) => canonicalLivePalmesRegion(option.value))
      .filter(Boolean)
      .filter((region) => {
        const key = normalizedRegionKey(region);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function setRegionMultiSelectValues(select, values = [], excludedRegion = "") {
    if (!select) return;
    const selectedKeys = new Set((Array.isArray(values) ? values : [])
      .map(canonicalLivePalmesRegion)
      .filter(Boolean)
      .filter((region) => normalizedRegionKey(region) !== normalizedRegionKey(excludedRegion))
      .map(normalizedRegionKey));
    Array.from(select.options).forEach((option) => {
      option.selected = selectedKeys.has(normalizedRegionKey(option.value));
    });
  }

  function renderInvitedRegionChoices(select, container) {
    if (!select || !container) return;
    container.innerHTML = Array.from(select.options).map((option) => `
      <label><input type="checkbox" value="${escapeHtml(option.value)}" ${option.selected ? "checked" : ""} ${option.disabled ? "disabled" : ""}><span>${escapeHtml(option.textContent)}</span></label>
    `).join("");
    container.hidden = select.disabled;
    if (select === elements.engagementsInvitedRegionIds && elements.engagementsInvitedRegionSummary) {
      const selected = selectedRegionMultiSelectValues(select).map(regionDisplayLabel);
      elements.engagementsInvitedRegionSummary.textContent = selected.length
        ? selected.join(", ")
        : "Aucune région invitée";
    }
  }

  function fillLivePalmesRegionMultiSelect(select) {
    if (!select) return;
    const currentValues = selectedRegionMultiSelectValues(select);
    select.innerHTML = "";
    LIVEPALMES_REGION_DEFINITIONS.forEach((region) => {
      select.append(new Option(region, region));
    });
    setRegionMultiSelectValues(select, currentValues);
  }

  function populateLivePalmesRegionSelects() {
    fillLivePalmesRegionSelect(elements.accessRegionId, "À choisir");
    fillLivePalmesRegionSelect(elements.publicAccessRequestRegionId, "À choisir");
    fillLivePalmesRegionSelect(elements.engagementsRegionId, "À choisir");
    fillLivePalmesRegionSelect(elements.engagementsEditRegionId, "À choisir");
    fillLivePalmesRegionSelect(elements.engagementsRegionFilter, "Toutes les régions");
    fillLivePalmesRegionMultiSelect(elements.engagementsInvitedRegionIds);
    fillLivePalmesRegionMultiSelect(elements.engagementsEditInvitedRegionIds);
    renderInvitedRegionChoices(elements.engagementsInvitedRegionIds, elements.engagementsInvitedRegionChoices);
    renderInvitedRegionChoices(elements.engagementsEditInvitedRegionIds, elements.engagementsEditInvitedRegionChoices);
  }

  function accessReferenceRegionLabel(regionId) {
    const value = String(regionId || "").trim();
    if (!value) return "";
    const namedRegion = LIVEPALMES_REGION_DEFINITIONS.find((region) => normalizedRegionKey(region) === normalizedRegionKey(value));
    if (namedRegion) return namedRegion;
    return LIVEPALMES_REFERENCE_REGION_LABELS[value] || `Autre / code ${value}`;
  }

  function normalizeAccessClubReference(row = []) {
    if (row && !Array.isArray(row) && typeof row === "object") {
      const referenceRegionId = String(row.referenceRegionId || row.regionId || "").trim();
      return {
        ...row,
        clubId: String(row.clubId || row.id || "").trim(),
        clubCode: String(row.clubCode || "").trim(),
        clubName: String(row.clubName || "").trim(),
        federalNumber: String(row.federalNumber || "").trim(),
        referenceRegionId,
        regionId: accessReferenceRegionLabel(referenceRegionId)
      };
    }
    const clubId = String(row[0] || "").trim();
    const clubCode = String(row[1] || "").trim();
    const clubName = String(row[2] || "").trim();
    const referenceRegionId = String(row[3] || "").trim();
    return {
      clubId,
      clubCode,
      clubName,
      federalNumber: String(row[4] || "").trim(),
      referenceRegionId,
      regionId: accessReferenceRegionLabel(referenceRegionId),
      city: String(row[5] || "").trim(),
      postalCode: String(row[6] || "").trim(),
      active: row[7] !== false
    };
  }

  function accessClubLabel(club) {
    if (!club) return "";
    const name = club.clubName || "Club sans nom";
    return club.clubCode ? `${club.clubCode} — ${name}` : name;
  }

  function accessClubFromId(clubId) {
    const cleanClubId = String(clubId || "").trim();
    return cleanClubId ? accessClubReferenceById.get(cleanClubId) || null : null;
  }

  function clubDisplayCode(club = {}, fallback = "Club non renseigné") {
    const data = club && typeof club === "object" ? club : { clubId: club };
    const reference = accessClubFromId(data.clubId);
    return String(data.clubCode || reference?.clubCode || data.clubName || reference?.clubName || fallback).trim();
  }

  function clubDisplayLabel(club = {}, { includeName = true, fallback = "Club non renseigné" } = {}) {
    const data = club && typeof club === "object" ? club : { clubId: club };
    const reference = accessClubFromId(data.clubId);
    const code = String(data.clubCode || reference?.clubCode || "").trim();
    const name = String(data.clubName || reference?.clubName || "").trim();
    if (includeName && code && name && normalizedAccessSearch(code) !== normalizedAccessSearch(name)) return `${code} — ${name}`;
    return code || name || fallback;
  }

  function populateAccessRegionChoices() {
    const selects = [elements.accessRegionId, elements.publicAccessRequestRegionId, elements.engagementsAccessRequestEditRegionId].filter(Boolean);
    if (!selects.length) return;
    const knownRegions = new Set(LIVEPALMES_REGION_DEFINITIONS.map(normalizedRegionKey));
    const extraRegions = Array.from(new Set(accessClubReference.map((club) => club.regionId)))
      .filter((region) => region && !knownRegions.has(normalizedRegionKey(region)))
      .sort((a, b) => a.localeCompare(b, "fr"));
    selects.forEach((select) => {
      const currentValue = select.value;
      fillLivePalmesRegionSelect(select, "À choisir");
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
      select.append(new Option("Choisissez d'abord une région", ""));
      select.disabled = true;
      syncAccessClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => club.active !== false && normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("À choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(label, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouvé pour cette région";
    }
    select.value = selectedId;
    if (selectedId && !knownClub) {
      if (elements.accessClubId) elements.accessClubId.value = selectedId;
      if (elements.accessClubName) elements.accessClubName.value = fallbackClubName || "";
      return;
    }
    syncAccessClubFieldsFromSelect();
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
      select.append(new Option("Choisissez d'abord une région", ""));
      select.disabled = true;
      syncPublicAccessRequestClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("À choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(label, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouvé pour cette région";
    }
    select.value = selectedId;
    if (selectedId && !knownClub) {
      if (elements.publicAccessRequestClubId) elements.publicAccessRequestClubId.value = selectedId;
      if (elements.publicAccessRequestClubName) elements.publicAccessRequestClubName.value = fallbackClubName || "";
      return;
    }
    syncPublicAccessRequestClubFieldsFromSelect();
  }

  function normalizedClubFederalNumber(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function publicAccessRequestNewClubInputs() {
    return [
      elements.publicAccessRequestNewClubName,
      elements.publicAccessRequestNewClubCode,
      elements.publicAccessRequestNewClubFederalNumber,
      elements.publicAccessRequestNewClubCity,
      elements.publicAccessRequestNewClubPostalCode
    ].filter(Boolean);
  }

  function updatePublicAccessRequestNewClubMode({ preserveMessage = false } = {}) {
    const newClub = elements.publicAccessRequestNewClub?.checked === true;
    if (elements.publicAccessRequestNewClubFields) elements.publicAccessRequestNewClubFields.hidden = !newClub;
    publicAccessRequestNewClubInputs().forEach((input) => { input.required = newClub; });
    if (elements.publicAccessRequestClubSelect) {
      elements.publicAccessRequestClubSelect.required = !newClub;
      if (newClub) elements.publicAccessRequestClubSelect.disabled = true;
      else populatePublicAccessRequestClubSelect(elements.publicAccessRequestClubId?.value || "");
    }
    if (newClub) {
      if (elements.publicAccessRequestClubId) elements.publicAccessRequestClubId.value = "";
      if (elements.publicAccessRequestClubName) elements.publicAccessRequestClubName.value = "";
    }
    if (!preserveMessage && elements.publicAccessRequestNewClubMatch) {
      elements.publicAccessRequestNewClubMatch.textContent = "";
      delete elements.publicAccessRequestNewClubMatch.dataset.tone;
    }
  }

  async function matchPublicAccessRequestClubByFederalNumber() {
    if (elements.publicAccessRequestNewClub?.checked !== true) return null;
    let federalNumber = normalizedClubFederalNumber(elements.publicAccessRequestNewClubFederalNumber?.value || "");
    if (!federalNumber) return null;
    if (!accessClubReference.length) {
      if (elements.publicAccessRequestNewClubMatch) {
        elements.publicAccessRequestNewClubMatch.textContent = "Vérification du numéro fédéral...";
        elements.publicAccessRequestNewClubMatch.dataset.tone = "loading";
      }
      await loadAccessClubReference();
      if (elements.publicAccessRequestNewClub?.checked !== true) return null;
      federalNumber = normalizedClubFederalNumber(elements.publicAccessRequestNewClubFederalNumber?.value || "");
      if (!federalNumber) return null;
    }
    if (!accessClubReference.length) {
      if (elements.publicAccessRequestNewClubMatch) {
        elements.publicAccessRequestNewClubMatch.textContent = "Le référentiel des clubs est temporairement indisponible. Réessayez dans quelques instants.";
        elements.publicAccessRequestNewClubMatch.dataset.tone = "error";
      }
      return null;
    }
    const club = accessClubReference.find((candidate) =>
      normalizedClubFederalNumber(candidate.federalNumber) === federalNumber
    );
    if (!club) {
      if (elements.publicAccessRequestNewClubMatch) {
        elements.publicAccessRequestNewClubMatch.textContent = "Aucun club existant ne porte ce numéro fédéral.";
        elements.publicAccessRequestNewClubMatch.dataset.tone = "loading";
      }
      return null;
    }
    setRegionSelectValue(elements.publicAccessRequestRegionId, club.regionId || "");
    if (elements.publicAccessRequestNewClub) elements.publicAccessRequestNewClub.checked = false;
    if (elements.publicAccessRequestClubId) elements.publicAccessRequestClubId.value = club.clubId || "";
    populatePublicAccessRequestClubSelect(club.clubId || "", club.clubName || "");
    updatePublicAccessRequestNewClubMode({ preserveMessage: true });
    if (elements.publicAccessRequestNewClubMatch) {
      elements.publicAccessRequestNewClubMatch.textContent = `Ce numéro correspond à ${accessClubLabel(club)}. Le club existant a été sélectionné.`;
      elements.publicAccessRequestNewClubMatch.dataset.tone = "ok";
    }
    setPublicAccessRequestMessage(`Club existant trouvé : ${accessClubLabel(club)}.`, "ok");
    return club;
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
      select.append(new Option("Choisissez d'abord une région", ""));
      select.disabled = true;
      syncEngagementAccessRequestEditClubFieldsFromSelect();
      return;
    }
    const regionKey = normalizedRegionKey(regionId);
    const clubs = accessClubReference
      .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
      .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
    select.append(new Option("À choisir", ""));
    clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
    if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
      const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
      select.append(new Option(label, selectedId));
    }
    select.disabled = clubs.length === 0 && !selectedId;
    if (!clubs.length && !selectedId) {
      select.options[0].textContent = "Aucun club trouvé pour cette région";
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
      "performances/public/data/club-reference.js?v=20260813-national-clubs-3",
      "adminAccessReferenceScript"
    ).then(async () => {
      accessClubReference = (global.LIVEPALMES_CLUB_REFERENCE?.clubs || [])
        .map(normalizeAccessClubReference)
        .filter((club) => club.clubId && club.clubName);
      if (!publicClubDirectoryLoadPromise) {
        publicClubDirectoryLoadPromise = callFunction("getPublicEngagementClubDirectory", {})
          .then((result) => Array.isArray(result?.clubs) ? result.clubs : [])
          .catch(() => []);
      }
      mergeNationalClubsIntoAccessReference(await publicClubDirectoryLoadPromise);
      accessClubReferenceById = new Map(accessClubReference.map((club) => [club.clubId, club]));
      populateAccessRegionChoices();
      populateAccessClubSelect(elements.accessClubId?.value || "");
      populatePublicAccessRequestClubSelect(elements.publicAccessRequestClubId?.value || "");
      populateEngagementAccessRequestEditClubSelect(elements.engagementsAccessRequestEditClubId?.value || "");
      if (currentAccessProfile) {
        renderPortalScopeContext(currentAccessProfile);
        renderEngagementsProfile(currentAccessProfile);
      }
      return accessClubReference;
    }).catch((error) => {
      accessClubReferenceLoadPromise = null;
      setAccessMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
      setPublicAccessRequestMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
      return [];
    });
    return accessClubReferenceLoadPromise;
  }

  function renderClubSwitchResults() {
    const results = elements.clubSwitchResults;
    if (!results) return;
    const query = normalizedAccessSearch(elements.clubSwitchSearch?.value || "");
    const clubs = accessClubReference
      .filter((club) => Boolean(LIVEPALMES_REFERENCE_REGION_LABELS[club.referenceRegionId]))
      .filter((club) => !query || normalizedAccessSearch([club.clubCode, club.clubName].join(" ")).includes(query))
      .sort((left, right) => accessClubLabel(left).localeCompare(accessClubLabel(right), "fr", { numeric: true }))
      .slice(0, 80);
    if (!accessClubReference.length) {
      results.innerHTML = '<p class="admin-engagements-empty">Référentiel des clubs indisponible.</p>';
      return;
    }
    if (!clubs.length) {
      results.innerHTML = '<p class="admin-engagements-empty">Aucun club ne correspond à cette recherche.</p>';
      return;
    }
    const activeClubId = engagementClubScope(currentAccessProfile || {});
    results.innerHTML = clubs.map((club) => {
      const active = club.clubId === activeClubId;
      return `<button class="admin-portal-club-switch-result" type="button" data-portal-active-club-id="${escapeHtml(club.clubId)}" aria-pressed="${active ? "true" : "false"}"><strong>${escapeHtml(club.clubCode || club.clubName)}</strong><span>${escapeHtml(club.clubName)}</span>${active ? '<small>Club actif</small>' : ""}</button>`;
    }).join("");
  }

  function openClubSwitchDialog() {
    if (!canSwitchEngagementClub(currentAccessProfile || {})) return;
    if (!accessClubReference.length) {
      void loadAccessClubReference().then(openClubSwitchDialog);
      return;
    }
    if (elements.clubSwitchStatus) {
      elements.clubSwitchStatus.textContent = "";
      delete elements.clubSwitchStatus.dataset.tone;
    }
    if (elements.clubSwitchSearch) elements.clubSwitchSearch.value = "";
    renderClubSwitchResults();
    if (!elements.clubSwitchDialog?.open) elements.clubSwitchDialog?.showModal();
    elements.clubSwitchSearch?.focus();
  }

  function changeActiveEngagementClub(clubId = "") {
    if (!canSwitchEngagementClub(currentAccessProfile || {})) return;
    if (selectedEngagementCompetitionId && !confirmLeaveDirtyEngagementTab()) return;
    setActiveEngagementClub(clubId);
    closeEngagementCompetitionDetail({ skipConfirmation: true });
    if (elements.clubSwitchStatus) {
      const activeClub = activeEngagementClubProfile(currentAccessProfile || {});
      elements.clubSwitchStatus.textContent = clubId
        ? `${clubDisplayLabel(activeClub)} est maintenant le club actif de cette session.`
        : "Votre club d’appartenance est de nouveau actif.";
      elements.clubSwitchStatus.dataset.tone = "ok";
    }
    renderClubSwitchResults();
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

  function syncEngagementStatusSegments() {
    const activeStatus = elements.engagementsStatusFilter?.value || "";
    elements.engagementsStatusSegmentButtons?.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.engagementStatus === activeStatus ? "true" : "false");
    });
  }

  function updateEngagementDetailStepLabels() {
    const adminMode = isEngagementAdminMode();
    const labels = adminMode
      ? {
          information: "Paramétrage",
          participants: "Participants",
          entries: "Engagements",
          summary: "Récapitulatif",
          statistics: "Statistiques",
          documents: "GED",
          delivery: "Diffusion"
        }
      : {
          information: "Informations",
          participants: "Participants",
          entries: "Engagements",
          summary: "Récapitulatif",
          statistics: "Statistiques",
          documents: "Documents",
          delivery: "Diffusion"
        };
    document.querySelectorAll("[data-engagement-step-label]").forEach((label) => {
      label.textContent = labels[label.dataset.engagementStepLabel] || "";
    });
    const navigation = document.querySelector(".admin-engagements-detail-step-bar");
    if (navigation) navigation.setAttribute("aria-label", adminMode ? "Rubriques de la compétition" : "Étapes");
  }

  function initializeEngagementCalendarFilters(user = currentAccessProfile || {}) {
    if (engagementCalendarFiltersInitialized) return;
    if (elements.engagementsSeasonFilter) {
      elements.engagementsSeasonFilter.value = String(currentEngagementSeasonStartYear());
    }
    if (elements.engagementsStatusFilter) {
      elements.engagementsStatusFilter.value = "";
    }
    applyEngagementCalendarRegionScope(user, engagementNavigationMode());
    engagementCalendarFiltersInitialized = true;
    syncEngagementStatusSegments();
  }

  function applyEngagementCalendarRegionScope(user = currentAccessProfile || {}, mode = engagementNavigationMode()) {
    if (!elements.engagementsRegionFilter) return;
    const capabilities = new Set(user.capabilities || []);
    const regionalAdministration = mode === "admin" &&
      capabilities.has("engagements.region.manage") &&
      !capabilities.has("engagements.national.manage");
    setRegionSelectValue(elements.engagementsRegionFilter, regionalAdministration ? engagementRegionScope(user) : "");
  }

  function resetEngagementCalendarFilters() {
    if (elements.engagementsSeasonFilter) {
      elements.engagementsSeasonFilter.value = String(currentEngagementSeasonStartYear());
    }
    setRegionSelectValue(elements.engagementsRegionFilter, "");
    if (elements.engagementsLevelFilter) elements.engagementsLevelFilter.value = "";
    if (elements.engagementsTypeFilter) elements.engagementsTypeFilter.value = "";
    if (elements.engagementsStatusFilter) elements.engagementsStatusFilter.value = "";
    if (elements.engagementsMineFilter) elements.engagementsMineFilter.checked = false;
    engagementCompetitionsVisibleLimit = 24;
    syncEngagementStatusSegments();
  }

  function engagementCalendarFiltersPayload() {
    const season = engagementSeasonBounds(elements.engagementsSeasonFilter?.value);
    return {
      ...season,
      regionId: canonicalLivePalmesRegion(elements.engagementsRegionFilter?.value),
      level: elements.engagementsLevelFilter?.value || "",
      competitionType: elements.engagementsTypeFilter?.value || "",
      entryStatus: elements.engagementsStatusFilter?.value || "",
      mineOnly: elements.engagementsMineFilter?.checked === true
    };
  }

  function engagementCalendarSeptemberPreview(filters = {}, date = new Date()) {
    const currentSeason = currentEngagementSeasonStartYear(date);
    if (date.getMonth() !== 7 || Number(filters.startYear) !== currentSeason) return null;
    const septemberYear = currentSeason + 1;
    return {
      startYear: septemberYear,
      startDate: `${septemberYear}-09-01`,
      endDate: `${septemberYear}-09-30`
    };
  }

  function engagementCalendarRequestedRange(filters = {}, date = new Date()) {
    const preview = engagementCalendarSeptemberPreview(filters, date);
    return [filters.startDate, filters.endDate, preview?.startDate, preview?.endDate]
      .filter(Boolean)
      .join("|");
  }

  function engagementCalendarScopeKey(mode = engagementNavigationMode()) {
    if (mode === "admin") {
      return canUse("engagements.national.manage")
        ? "national"
        : `region:${engagementRegionScope(currentAccessProfile || {}) || "none"}`;
    }
    const profile = activeEngagementClubProfile(currentAccessProfile || {});
    return `club:${engagementClubScope(profile) || "none"}`;
  }

  function engagementCalendarCacheKey(mode, requestedRange) {
    const uid = currentAccessProfile?.uid || activeAuthUid || global.firebase?.auth?.().currentUser?.uid || "anonymous";
    return [uid, mode, engagementCalendarScopeKey(mode), requestedRange]
      .map((part) => encodeURIComponent(String(part || "")))
      .join(".");
  }

  function engagementCalendarCacheCompetition(competition = {}) {
    return {
      id: String(competition.id || ""),
      sourceType: competition.sourceType === "calendarEvent" ? "calendarEvent" : "competition",
      eventType: String(competition.eventType || ""),
      name: String(competition.name || ""),
      date: String(competition.date || ""),
      endDate: String(competition.endDate || competition.date || ""),
      location: String(competition.location || ""),
      regionId: String(competition.regionId || ""),
      invitedRegionIds: Array.isArray(competition.invitedRegionIds) ? competition.invitedRegionIds.map(String) : [],
      level: String(competition.level || ""),
      competitionType: engagementCompetitionType(competition),
      waterBodyType: String(competition.waterBodyType || ""),
      entryDeadlineAt: String(competition.entryDeadlineAt || ""),
      entryStatus: String(competition.entryStatus || "upcoming"),
      publicationStatus: String(competition.publicationStatus || "draft"),
      canceled: competition.canceled === true,
      documentCount: Math.max(0, Number(competition.documentCount) || 0),
      clubEntryExists: competition.clubEntryExists === true,
      updatedAt: String(competition.updatedAt || "")
    };
  }

  function readEngagementCalendarCache(cacheKey) {
    const memoryEntry = engagementCompetitionCalendarMemoryCache.get(cacheKey);
    if (memoryEntry) return memoryEntry;
    try {
      const stored = JSON.parse(global.sessionStorage?.getItem(`${ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
      if (!stored || stored.version !== 1 || !Array.isArray(stored.competitions) || !Number(stored.cachedAt)) return null;
      const entry = {
        competitions: stored.competitions.map(engagementCalendarCacheCompetition).filter((competition) => competition.id),
        cachedAt: Number(stored.cachedAt)
      };
      engagementCompetitionCalendarMemoryCache.set(cacheKey, entry);
      return entry;
    } catch (_) {
      return null;
    }
  }

  function writeEngagementCalendarCache(cacheKey, competitions = [], cachedAt = Date.now()) {
    const entry = {
      competitions: competitions.map(engagementCalendarCacheCompetition).filter((competition) => competition.id),
      cachedAt
    };
    engagementCompetitionCalendarMemoryCache.set(cacheKey, entry);
    try {
      global.sessionStorage?.setItem(`${ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX}${cacheKey}`, JSON.stringify({
        version: 1,
        cachedAt,
        competitions: entry.competitions
      }));
    } catch (_) {
      // Le cache reste facultatif si le stockage de session est indisponible.
    }
    return entry;
  }

  function activateEngagementCalendarCache(cacheKey, requestedRange, entry) {
    engagementCompetitions = entry.competitions.map((competition) => ({ ...competition }));
    engagementCompetitionsLoaded = true;
    engagementCompetitionsLoadedRange = requestedRange;
    engagementCompetitionsLoadedCacheKey = cacheKey;
    engagementCompetitionsCachedAt = entry.cachedAt;
    renderEngagementCompetitions();
  }

  function persistActiveEngagementCalendarCache() {
    if (!engagementCompetitionsLoadedCacheKey || !engagementCompetitionsLoadedRange) return;
    const entry = writeEngagementCalendarCache(engagementCompetitionsLoadedCacheKey, engagementCompetitions);
    engagementCompetitionsCachedAt = entry.cachedAt;
  }

  function upsertEngagementCalendarItemFromServer(item = {}, sourceType = "competition") {
    if (!item?.id) return;
    const cachedItem = engagementCalendarCacheCompetition({ ...item, sourceType });
    const index = engagementCompetitions.findIndex((competition) => (
      competition.id === cachedItem.id
      && (competition.sourceType || "competition") === cachedItem.sourceType
    ));
    if (index >= 0) engagementCompetitions[index] = { ...engagementCompetitions[index], ...cachedItem };
    else engagementCompetitions.push(cachedItem);
    persistActiveEngagementCalendarCache();
    renderEngagementCompetitions();
  }

  function removeEngagementCalendarItemFromCache(itemId, sourceType = "calendarEvent") {
    const cleanId = String(itemId || "");
    if (!cleanId) return;
    engagementCompetitions = engagementCompetitions.filter((competition) => !(
      competition.id === cleanId
      && (competition.sourceType || "competition") === sourceType
    ));
    persistActiveEngagementCalendarCache();
    renderEngagementCompetitions();
  }

  function invalidateEngagementCalendarCaches() {
    engagementCalendarCacheRevision += 1;
    engagementCompetitionCalendarMemoryCache.clear();
    engagementCompetitionCalendarRequests.clear();
    try {
      const keys = [];
      for (let index = 0; index < (global.sessionStorage?.length || 0); index += 1) {
        const key = global.sessionStorage?.key(index) || "";
        if (key.startsWith(ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => global.sessionStorage?.removeItem(key));
    } catch (_) {}
    engagementCompetitionsLoaded = false;
    engagementCompetitionsLoadedRange = "";
    engagementCompetitionsLoadedCacheKey = "";
    engagementCompetitionsCachedAt = 0;
  }

  function engagementCompetitionIsInSeptemberPreview(competition = {}, filters = {}, date = new Date()) {
    const preview = engagementCalendarSeptemberPreview(filters, date);
    return Boolean(competition.date && preview && competition.date >= preview.startDate && competition.date <= preview.endDate);
  }

  function filteredEngagementCompetitions() {
    const filters = engagementCalendarFiltersPayload();
    const septemberPreview = engagementCalendarSeptemberPreview(filters);
    return engagementCompetitions
      .filter((competition) => !competition.date ||
        (competition.date >= filters.startDate && competition.date <= filters.endDate) ||
        (septemberPreview && competition.date >= septemberPreview.startDate && competition.date <= septemberPreview.endDate))
      .filter((competition) => !filters.regionId || canonicalLivePalmesRegion(competition.regionId) === filters.regionId)
      .filter((competition) => !filters.level || competition.level === filters.level)
      .filter((competition) => !filters.competitionType || engagementCompetitionType(competition) === filters.competitionType)
      .filter((competition) => !filters.entryStatus || competition.entryStatus === filters.entryStatus)
      .filter((competition) => !filters.mineOnly || canEditEngagementCompetition(competition))
      .sort((left, right) => {
        const previewDifference = Number(engagementCompetitionIsInSeptemberPreview(left, filters)) -
          Number(engagementCompetitionIsInSeptemberPreview(right, filters));
        if (previewDifference) return previewDifference;
        const statusRank = (competition) => competition.entryStatus === "open" ? 0 : competition.entryStatus === "upcoming" ? 1 : competition.entryStatus === "closed" ? 2 : 1;
        const rankDifference = statusRank(left) - statusRank(right);
        if (rankDifference) return rankDifference;
        if (left.entryStatus === "open" && right.entryStatus === "open") {
          const deadlineDifference = String(left.entryDeadlineAt || left.date || "9999-12-31")
            .localeCompare(String(right.entryDeadlineAt || right.date || "9999-12-31"));
          if (deadlineDifference) return deadlineDifference;
        }
        if (left.entryStatus === "closed" && right.entryStatus === "closed") {
          const recentFirst = String(right.date || "0000-01-01").localeCompare(String(left.date || "0000-01-01"));
          if (recentFirst) return recentFirst;
        }
        return String(left.date || "9999-12-31").localeCompare(String(right.date || "9999-12-31")) ||
          String(left.name || "").localeCompare(String(right.name || ""), "fr");
      });
  }

  function renderCurrentUser(user = {}) {
    const previousClubId = engagementClubScope(currentAccessProfile || {});
    const nextClubId = engagementClubScope(user || {});
    if (previousClubId && nextClubId && previousClubId !== nextClubId) {
      resetEngagementClubData();
    }
    currentAccessProfile = user;
    applyPortalHomeForProfile();
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Profil LivePalmes";
    const accountEmail = user.email || ensureAdminAuth()?.status?.().email || "";
    if (elements.sessionLabel) elements.sessionLabel.textContent = name;
    if (elements.accountFullName) elements.accountFullName.textContent = name;
    if (elements.accountIdentityEmail) elements.accountIdentityEmail.textContent = accountEmail || "Email non renseigné";
    if (elements.accountEmailSummary) elements.accountEmailSummary.textContent = accountEmail ? `Adresse actuelle : ${accountEmail}` : "Adresse actuelle non renseignée";
    if (elements.accountLicenseMeta) elements.accountLicenseMeta.hidden = !user.licenseNumber;
    if (elements.accountLicenseNumber) elements.accountLicenseNumber.textContent = user.licenseNumber || "";
    if (elements.accountEmail && document.activeElement !== elements.accountEmail) {
      elements.accountEmail.value = accountEmail;
    }
    const competitionNotificationsEnabled = user.competitionNotificationsEnabled !== false;
    if (elements.accountCompetitionNotifications) {
      elements.accountCompetitionNotifications.setAttribute("aria-checked", String(competitionNotificationsEnabled));
      elements.accountCompetitionNotifications.setAttribute(
        "aria-label",
        `Notifications de compétition ${competitionNotificationsEnabled ? "activées" : "désactivées"}`
      );
      elements.accountCompetitionNotifications.dataset.enabled = String(competitionNotificationsEnabled);
    }
    if (elements.accountCompetitionNotificationsState) {
      elements.accountCompetitionNotificationsState.textContent = competitionNotificationsEnabled ? "ON" : "OFF";
    }
    if (elements.accountNotificationsSummary) {
      elements.accountNotificationsSummary.textContent = competitionNotificationsEnabled
        ? "Notifications de compétition activées."
        : "Notifications de compétition désactivées.";
    }
    renderPortalScopeContext(user);
    renderEngagementsProfile(user);
    initializeEngagementCalendarFilters(user);
    updateEngagementCreateFormAccess(user);
    void loadPortalPendingOverview();
    if (canUse("engagements.club.manage")) {
      void loadEngagementCompetitions({ mode: "club", activate: false, silent: true });
      void loadEngagementClubSwimmers({ silent: true });
    }
  }

  function renderPortalScopeContext(user = {}) {
    if (!elements.scopeContext) return;
    user = activeEngagementClubProfile(user);
    const clubScope = user.accessScopes?.["engagements.club.manage"] || {};
    const clubId = engagementClubScope(user);
    const referencedClub = accessClubFromId(clubId);
    const clubName = user.clubName || clubScope.scopeName || referencedClub?.clubName || "";
    const clubCode = clubDisplayCode({ clubId, clubName }, "");
    const clubLabel = clubCode || clubName;

    elements.scopeContext.hidden = !clubLabel;
    elements.scopeContext.title = clubName
      ? `Club : ${clubCode ? `${clubCode} — ` : ""}${clubName}`
      : clubLabel;
    if (elements.scopeClubPrefix) elements.scopeClubPrefix.hidden = !clubLabel;
    if (elements.scopeClubCode) {
      elements.scopeClubCode.hidden = !clubLabel;
      elements.scopeClubCode.textContent = clubLabel;
    }
    const switchEnabled = Boolean(clubLabel) && canSwitchEngagementClub(currentAccessProfile || user);
    if (elements.scopeClubButton) {
      elements.scopeClubButton.hidden = !clubLabel;
      elements.scopeClubButton.disabled = !switchEnabled;
      elements.scopeClubButton.title = switchEnabled ? "Changer de club pour cette session" : "Club de la session";
      elements.scopeClubButton.setAttribute("aria-label", switchEnabled
        ? `Changer de club pour cette session. Club actif : ${clubLabel}`
        : `Club de la session : ${clubLabel}`);
    }
    if (elements.accountClubSwitch) elements.accountClubSwitch.hidden = !switchEnabled;
    if (elements.scopeRole) elements.scopeRole.hidden = true;
    if (elements.scopeRoleLong) elements.scopeRoleLong.textContent = "";
    if (elements.accountClubCode) {
      elements.accountClubCode.textContent = clubLabel || "Profil";
      elements.accountClubCode.title = clubName ? `Club : ${clubName}` : clubLabel || "Profil";
    }
  }

  function renderEngagementsProfile(user = {}) {
    user = activeEngagementClubProfile(user);
    const capabilities = new Set(user.capabilities || []);
    const scopeFor = (capability) => user.accessScopes?.[capability] || {};
    const clubScope = scopeFor("engagements.club.manage");
    const regionScope = scopeFor("engagements.region.manage");
    const clubId = engagementClubScope(user);
    const referencedClub = accessClubFromId(clubId);
    const clubValue = clubDisplayLabel({ clubId, clubName: user.clubName || clubScope.scopeName }, { fallback: "Club indisponible" });
    const regionValue = regionDisplayLabel(regionScope.scopeId || user.regionId || referencedClub?.regionId);
    renderEngagementClubContext(user);
    if (elements.accountScopeSentence) {
      if (capabilities.has("engagements.national.manage")) {
        elements.accountScopeSentence.innerHTML = `Vos droits LivePalmes sont de niveau national. Votre club pour les engagements est <strong>${escapeHtml(clubValue)}</strong>.`;
      } else if (capabilities.has("engagements.region.manage")) {
        elements.accountScopeSentence.innerHTML = `Vos droits LivePalmes sont de niveau régional${regionValue && regionValue !== "-" ? ` (<strong>${escapeHtml(regionValue)}</strong>)` : ""}. Votre club pour les engagements est <strong>${escapeHtml(clubValue)}</strong>.`;
      } else if (capabilities.has("engagements.club.manage")) {
        const regionSuffix = regionValue && regionValue !== "-"
          ? `, région <strong>${escapeHtml(regionValue)}</strong>`
          : "";
        elements.accountScopeSentence.innerHTML = `Vous gérez les engagements du club <strong>${escapeHtml(clubValue)}</strong>${regionSuffix}.`;
      } else {
        elements.accountScopeSentence.textContent = "Aucun périmètre d’engagement n’est associé à ce compte.";
      }
    }
    if (elements.accountCapabilities) {
      const capabilityValues = Array.from(capabilities).sort();
      elements.accountCapabilities.innerHTML = capabilityValues.length
        ? capabilityValues.map((capability) => `<span>${escapeHtml(capabilityLabel(capability))}</span>`).join("")
        : "-";
    }
    if (elements.engagementsStatus) {
      elements.engagementsStatus.textContent = "";
      elements.engagementsStatus.hidden = true;
      delete elements.engagementsStatus.dataset.tone;
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
        note.textContent = "Non requis pour une compétition nationale.";
      } else if (isNational) {
        note.textContent = "Région obligatoire pour une compétition départementale ou régionale.";
      } else if (isRegional && regionId) {
        note.textContent = `Région imposée par votre droit régional : ${regionDisplayLabel(regionId)}.`;
      } else if (isRegional) {
        note.textContent = "Région manquante sur votre accès. Mettez à jour le compte avant de créer une compétition.";
      } else {
        note.textContent = "Droit régional ou national requis pour créer une compétition.";
      }
    }
    if (submitButton) submitButton.disabled = Boolean(!nationalCompetition && isRegional && !isNational && !regionId);
  }

  function updateEngagementInvitedRegionField({ field, levelInput, primaryRegionField }) {
    if (!field) return;
    const nationalCompetition = (levelInput?.value || "regional") === "national";
    field.disabled = nationalCompetition || !canCreateEngagementCompetition();
    const primaryRegion = primaryRegionField?.value || "";
    Array.from(field.options).forEach((option) => {
      const sameAsPrimary = normalizedRegionKey(option.value) === normalizedRegionKey(primaryRegion);
      option.disabled = sameAsPrimary;
      if (sameAsPrimary) option.selected = false;
    });
    if (nationalCompetition) {
      Array.from(field.options).forEach((option) => {
        option.selected = false;
      });
    }
    renderInvitedRegionChoices(field, field === elements.engagementsEditInvitedRegionIds
      ? elements.engagementsEditInvitedRegionChoices
      : elements.engagementsInvitedRegionChoices);
    if (field === elements.engagementsInvitedRegionIds && elements.engagementsInvitedRegionDialogOpen) {
      elements.engagementsInvitedRegionDialogOpen.disabled = field.disabled;
    }
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
    updateEngagementInvitedRegionField({
      field: elements.engagementsEditInvitedRegionIds,
      levelInput: elements.engagementsEditLevel,
      primaryRegionField: elements.engagementsEditRegionId
    });
    const nationalOption = elements.engagementsEditLevel?.querySelector("option[value='national']");
    if (nationalOption) nationalOption.disabled = !isNational;
    const closedStatusOption = elements.engagementsEditEntryStatus?.querySelector("option[value='closed']");
    if (closedStatusOption) closedStatusOption.disabled = true;
    if (elements.engagementsEditEntryStatus) {
      elements.engagementsEditEntryStatus.disabled = !isNational && elements.engagementsEditEntryStatus.value === "closed";
    }
    if (!isNational && elements.engagementsEditLevel?.value === "national") {
      elements.engagementsEditLevel.value = "regional";
      updateEngagementRegionField({
        field: elements.engagementsEditRegionId,
        note: elements.engagementsEditRegionNote,
        levelInput: elements.engagementsEditLevel,
        user,
        submitButton: elements.engagementsEditForm?.querySelector("button[type='submit']")
      });
      updateEngagementInvitedRegionField({
        field: elements.engagementsEditInvitedRegionIds,
        levelInput: elements.engagementsEditLevel,
        primaryRegionField: elements.engagementsEditRegionId
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

  function updateEngagementMaxEventsFields(prefix = "create") {
    const unlimited = prefix === "edit" ? elements.engagementsEditMaxEventsUnlimited : elements.engagementsMaxEventsUnlimited;
    const input = prefix === "edit" ? elements.engagementsEditMaxEvents : elements.engagementsMaxEvents;
    if (!unlimited || !input) return;
    input.disabled = unlimited.checked;
    input.required = !unlimited.checked;
    if (unlimited.checked) input.value = "";
  }

  function setDefaultEngagementOfficialsRequired(prefix = "create") {
    const level = prefix === "edit" ? elements.engagementsEditLevel : elements.engagementsLevel;
    const officialsRequired = prefix === "edit" ? elements.engagementsEditOfficialsRequired : elements.engagementsOfficialsRequired;
    if (level && officialsRequired) officialsRequired.value = level.value === "national" ? "false" : "true";
  }

  function moveEngagementStatusField() {
    [[elements.engagementsEditLevel, elements.engagementsEditEntryStatus]].forEach(([level, status]) => {
      const levelField = level?.closest("label");
      const statusField = status?.closest("label");
      if (levelField && statusField) levelField.insertAdjacentElement("afterend", statusField);
    });
  }

  function prepareCreateCompetitionDialog() {
    const dialog = elements.engagementsCreateDialog;
    const form = elements.engagementsCreateForm;
    if (!dialog || !form) return;
    [elements.engagementsCreateChecklist].forEach((modal) => {
      if (modal && modal.parentElement !== dialog.parentElement) dialog.insertAdjacentElement("afterend", modal);
    });
    if (dialog.contains(form)) return;
    dialog.append(form);
  }

  function resetCreateCompetitionDialog() {
    const form = elements.engagementsCreateForm;
    if (!form) return;
    form.reset();
    if (elements.engagementsEndDate) {
      elements.engagementsEndDate.value = "";
      elements.engagementsEndDate.dataset.autoFromStart = "true";
    }
    if (elements.engagementsCreateMessage) {
      elements.engagementsCreateMessage.textContent = "";
      delete elements.engagementsCreateMessage.dataset.tone;
    }
    updateEngagementCreateFormAccess();
  }

  function openCreateCompetitionDialog() {
    if (!canCreateEngagementCompetition()) return;
    prepareCreateCompetitionDialog();
    resetCreateCompetitionDialog();
    elements.engagementsCreateDialog?.showModal();
  }

  function moveEngagementFeesToGeneral() {
    const generalPanel = document.querySelector("#adminEngagementsDetailGeneralPanel");
    const feesPanel = document.querySelector("#adminEngagementsDetailFeesPanel");
    if (generalPanel && feesPanel) generalPanel.append(feesPanel);
  }

  function syncInvitedRegionChoice(event, select) {
    const input = event.target.closest("input[type='checkbox']");
    if (!input || !select) return;
    const option = Array.from(select.options).find((item) => item.value === input.value);
    if (option) option.selected = input.checked;
  }

  function openInvitedRegionsDialog() {
    if (!elements.engagementsInvitedRegionDialog || !elements.engagementsInvitedRegionIds) return;
    invitedRegionsBeforeDialog = selectedRegionMultiSelectValues(elements.engagementsInvitedRegionIds);
    renderInvitedRegionChoices(elements.engagementsInvitedRegionIds, elements.engagementsInvitedRegionChoices);
    elements.engagementsInvitedRegionDialog.showModal();
  }

  function closeInvitedRegionsDialog() {
    if (elements.engagementsInvitedRegionDialog?.returnValue === "confirm") {
      renderInvitedRegionChoices(elements.engagementsInvitedRegionIds, elements.engagementsInvitedRegionChoices);
      return;
    }
    setRegionMultiSelectValues(elements.engagementsInvitedRegionIds, invitedRegionsBeforeDialog, elements.engagementsRegionId?.value || "");
    renderInvitedRegionChoices(elements.engagementsInvitedRegionIds, elements.engagementsInvitedRegionChoices);
  }

  function fillEngagementEditForm(competition = selectedEngagementCompetition || {}) {
    if (!competition?.id) return;
    if (elements.engagementsEditName) elements.engagementsEditName.value = competition.name || "";
    if (elements.engagementsEditCompetitionType) {
      elements.engagementsEditCompetitionType.value = engagementCompetitionTypeLabel(engagementCompetitionType(competition));
      elements.engagementsEditCompetitionType.dataset.value = engagementCompetitionType(competition);
    }
    if (elements.engagementsEditWaterBodyType) elements.engagementsEditWaterBodyType.value = competition.waterBodyType || "";
    if (elements.engagementsEditDate) elements.engagementsEditDate.value = competition.date || "";
    if (elements.engagementsEditEndDate) {
      elements.engagementsEditEndDate.value = competition.endDate || competition.date || "";
      elements.engagementsEditEndDate.dataset.autoFromStart = elements.engagementsEditEndDate.value === (competition.date || "") ? "true" : "false";
    }
    if (elements.engagementsEditLocation) elements.engagementsEditLocation.value = competition.location || "";
    if (elements.engagementsEditCity) elements.engagementsEditCity.value = competition.city || competition.location || "";
    if (elements.engagementsEditAddress) elements.engagementsEditAddress.value = competition.address || "";
    if (elements.engagementsEditOrganizer) elements.engagementsEditOrganizer.value = competition.organizer || "";
    if (elements.engagementsEditPublicDescription) elements.engagementsEditPublicDescription.value = competition.publicDescription || "";
    if (elements.engagementsEditPublicationStatus) elements.engagementsEditPublicationStatus.value = competition.publicationStatus === "published" ? "published" : "draft";
    if (elements.engagementsEditCanceled) elements.engagementsEditCanceled.checked = competition.canceled === true;
    if (elements.engagementsEditLevel) elements.engagementsEditLevel.value = competition.level || "regional";
    setRegionSelectValue(elements.engagementsEditRegionId, competition.regionId || "");
    setRegionMultiSelectValues(elements.engagementsEditInvitedRegionIds, competition.invitedRegionIds || [], competition.regionId || "");
    if (elements.engagementsEditDeadline) elements.engagementsEditDeadline.value = isoToDatetimeLocal(competition.entryDeadlineAt);
    if (elements.engagementsEditComputerEmail) elements.engagementsEditComputerEmail.value = competition.computerEmail || "";
    if (elements.engagementsEditOfficialsManagerEmail) elements.engagementsEditOfficialsManagerEmail.value = competition.officialsManagerEmail || "";
    if (elements.engagementsEditPoolLength) elements.engagementsEditPoolLength.value = competition.poolLength || "";
    if (elements.engagementsEditPoolLaneCount) elements.engagementsEditPoolLaneCount.value = competition.poolLaneCount || "";
    if (elements.engagementsEditTimingType) elements.engagementsEditTimingType.value = competition.timingType || "";
    if (elements.engagementsEditQualificationMode) elements.engagementsEditQualificationMode.value = competition.qualificationTimesMode || "all";
    if (elements.engagementsEditQualificationStart) elements.engagementsEditQualificationStart.value = competition.qualificationStartDate || "";
    if (elements.engagementsEditQualificationEnd) elements.engagementsEditQualificationEnd.value = competition.qualificationEndDate || "";
    if (elements.engagementsEditMissingEntryTimeMode) elements.engagementsEditMissingEntryTimeMode.value = competition.missingEntryTimeMode || "manual";
    const maxEventsPerSwimmer = Math.max(0, Math.trunc(Number(competition.maxEventsPerSwimmer) || 0));
    if (elements.engagementsEditMaxEvents) elements.engagementsEditMaxEvents.value = String(Math.min(5, maxEventsPerSwimmer));
    if (elements.engagementsEditEntryStatus) elements.engagementsEditEntryStatus.value = competition.entryStatus || "upcoming";
    if (elements.engagementsEditOfficialsRequired) elements.engagementsEditOfficialsRequired.value = competition.officialsRequired === true ? "true" : "false";
    updateEngagementSportFields(competition);
    updateEngagementEditFormAccess();
    updateEngagementQualificationFields("edit");
    updateEngagementMaxEventsFields("edit");
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

  function normalizeEngagementDeadlineField(field) {
    if (!field?.value) return "";
    const date = new Date(field.value);
    if (Number.isNaN(date.getTime())) return field.value;
    date.setMinutes(0, 0, 0);
    const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    field.value = normalized;
    return normalized;
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
      departemental: "Départemental",
      regional: "Régional",
      national: "National"
    }[level] || "Régional";
  }

  function engagementStatusLabel(status) {
    return {
      upcoming: "À venir",
      open: "Ouverts",
      closed: "Fermés"
    }[status] || "À venir";
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

  function formatEngagementCompetitionDate(competition = {}) {
    const start = formatShortDate(competition.date);
    const end = formatShortDate(competition.endDate || competition.date);
    return competition.endDate && competition.endDate !== competition.date
      ? `${start} au ${end}`
      : start;
  }

  function engagementDeadlineDisplay(competition = {}) {
    const status = competition.entryStatus || "upcoming";
    if (status !== "open") return "";
    if (!competition.entryDeadlineAt) return "Engagements ouverts";
    const deadline = new Date(competition.entryDeadlineAt);
    if (Number.isNaN(deadline.getTime())) return "Engagements ouverts";
    const remainingMs = deadline.getTime() - Date.now();
    if (remainingMs <= 0) return "Date limite dépassée";
    const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days} j`);
    if (days || hours) parts.push(`${hours} h`);
    parts.push(`${minutes} min`);
    return `Ferme dans ${parts.join(" ")}`;
  }

  function refreshEngagementDeadlineCountdowns() {
    document.querySelectorAll("[data-engagement-deadline-competition-id]").forEach((node) => {
      const competition = engagementCompetitions.find((item) => item.id === node.dataset.engagementDeadlineCompetitionId);
      if (!competition) return;
      node.textContent = engagementDeadlineDisplay(competition);
      node.dataset.entryStatus = engagementDeadlineTone(competition);
    });
  }

  function engagementCompetitionMonthLabel(competition = {}) {
    if (!competition.date) return "Date à confirmer";
    const date = new Date(`${competition.date}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "Date à confirmer";
    const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const monthLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return engagementCompetitionIsInSeptemberPreview(competition, engagementCalendarFiltersPayload())
      ? `${monthLabel} — saison suivante`
      : monthLabel;
  }

  function engagementCompetitionAction(competition = {}) {
    if (isEngagementAdminMode()) {
      return {
        label: "Administrer",
        tab: "general"
      };
    }
    if (competition.entryStatus === "open" && engagementDeadlineTone(competition) !== "deadline-passed") {
      const rememberedTab = storedEngagementDetailTab(competition.id);
      const hasClubEntry = competition.clubEntryExists === true;
      return hasClubEntry
        ? { label: "Mes engagements", tab: rememberedTab || "team" }
        : { label: "S’engager", tab: "team" };
    }
    if (competition.entryStatus === "closed" || engagementDeadlineTone(competition) === "deadline-passed") {
      return { label: "Consulter le récapitulatif", tab: "summary" };
    }
    return { label: "Voir les informations", tab: "general" };
  }

  function updateEngagementSportFields(competition = selectedEngagementCompetition || {}) {
    const openWater = engagementCompetitionType(competition) === "openWater";
    document.querySelectorAll("[data-engagements-pool-field], [data-engagements-pool-time-field]").forEach((field) => {
      field.hidden = openWater;
    });
    document.querySelectorAll("[data-engagements-open-water-field]").forEach((field) => {
      field.hidden = !openWater;
    });
    if (elements.engagementsEditPoolLength) elements.engagementsEditPoolLength.required = !openWater;
    if (elements.engagementsEditPoolLaneCount) elements.engagementsEditPoolLaneCount.required = !openWater;
  }

  function mergeNationalClubsIntoAccessReference(clubs = []) {
    if (!Array.isArray(clubs) || !clubs.length) return;
    const byId = new Map(accessClubReference.map((club) => [club.clubId, club]));
    clubs.map(normalizeAccessClubReference).filter((club) => club.clubId && club.clubName).forEach((club) => byId.set(club.clubId, club));
    accessClubReference = Array.from(byId.values());
    accessClubReferenceById = new Map(accessClubReference.map((club) => [club.clubId, club]));
  }

  function setSelectedEngagementCompetitionClubEntryExists(entryExists) {
    if (!selectedEngagementCompetitionId) return;
    const nextValue = entryExists === true;
    selectedEngagementCompetition = {
      ...(selectedEngagementCompetition || {}),
      clubEntryExists: nextValue
    };
    engagementCompetitions = engagementCompetitions.map((competition) => competition.id === selectedEngagementCompetitionId
      ? { ...competition, clubEntryExists: nextValue }
      : competition);
    persistActiveEngagementCalendarCache();
  }

  function engagementPoolLengthLabel(value) {
    return ["25", "33", "50"].includes(String(value || "")) ? `${value} m` : "-";
  }

  function engagementPoolLabel(competition = {}) {
    const length = engagementPoolLengthLabel(competition.poolLength);
    const laneCount = Math.trunc(Number(competition.poolLaneCount) || 0);
    if (length === "-" && !laneCount) return "Non renseigné";
    return laneCount >= 4 && laneCount <= 10
      ? `${length} · ${laneCount} lignes d'eau`
      : `${length} · nombre de lignes non renseigné`;
  }

  function engagementTimingTypeLabel(value) {
    return value === "manual" ? "Manuel" : value === "electronic" ? "Electronique" : "Non renseigné";
  }

  function engagementQualificationPeriodLabel(competition = {}) {
    if (competition.qualificationTimesMode !== "period") return "Meilleur temps parmi tous les temps connus";
    const start = formatShortDate(competition.qualificationStartDate);
    const end = formatShortDate(competition.qualificationEndDate);
    return `Meilleur temps connu réalisé du ${start} au ${end} inclus`;
  }

  function engagementMissingEntryTimeModeLabel(value) {
    return {
      manual: "Saisie manuelle autorisée",
      forbidden: "Saisie manuelle non autorisée",
      default595999: "Temps par défaut : 59:59.99"
    }[value] || "Saisie manuelle autorisée";
  }

  function engagementEntryTimeRulesLabel(competition = {}) {
    const manualLabel = competition.missingEntryTimeMode === "manual"
      ? "saisie manuelle autorisée"
      : "saisie manuelle non autorisée";
    return `${engagementQualificationPeriodLabel(competition)} · ${manualLabel}`;
  }

  function engagementMaxEventsLabel(value) {
    const count = Math.trunc(Number(value) || 0);
    return count > 0 ? `${count} épreuve${count > 1 ? "s" : ""}` : "Non limité";
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
    if (fees.enabled === false) return "Aucun frais d'engagement";
    const parts = [
      `nageur ${formatEngagementFee(fees.swimmerFee)}`,
      `course ${formatEngagementFee(fees.individualEventFee)}`,
      `relais ${formatEngagementFee(fees.relayFee)}`
    ];
    return parts.join(" - ");
  }

  function engagementHelloAssoLabel(fees = {}) {
    if (fees.enabled === false) return "Aucun paiement requis";
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
    const enabled = elements.engagementsNoFees?.checked !== true;
    return {
      enabled,
      swimmerFee: enabled ? engagementFeeAmount(elements.engagementsSwimmerFee?.value) : 0,
      individualEventFee: enabled ? engagementFeeAmount(elements.engagementsIndividualEventFee?.value) : 0,
      relayFee: enabled ? engagementFeeAmount(elements.engagementsRelayFee?.value) : 0,
      helloAssoUrl: enabled ? String(elements.engagementsHelloAssoUrl?.value || "").trim() : "",
      latePaymentSurcharge: 50
    };
  }

  function selectedCreateEngagementFeesFromForm() {
    const enabled = elements.engagementsCreateFeesEnabled?.value === "true";
    return {
      enabled,
      swimmerFee: enabled ? engagementFeeAmount(elements.engagementsCreateSwimmerFee?.value) : 0,
      individualEventFee: enabled ? engagementFeeAmount(elements.engagementsCreateIndividualEventFee?.value) : 0,
      relayFee: enabled ? engagementFeeAmount(elements.engagementsCreateRelayFee?.value) : 0,
      helloAssoUrl: enabled ? String(elements.engagementsCreateHelloAssoUrl?.value || "").trim() : "",
      latePaymentSurcharge: 50
    };
  }

  function updateCreateEngagementFeesMode() {
    const enabled = elements.engagementsCreateFeesEnabled?.value === "true";
    if (elements.engagementsCreateFeesGrid) elements.engagementsCreateFeesGrid.hidden = !enabled;
  }

  function updateEngagementFeesFormMode(canEdit = false) {
    const noFees = elements.engagementsNoFees?.checked === true;
    if (elements.engagementsFeesGrid) elements.engagementsFeesGrid.hidden = noFees;
    if (elements.engagementsPaymentNote) elements.engagementsPaymentNote.hidden = noFees;
    [elements.engagementsSwimmerFee, elements.engagementsIndividualEventFee, elements.engagementsRelayFee, elements.engagementsHelloAssoUrl].forEach((field) => {
      if (field) field.disabled = !canEdit || noFees;
    });
  }

  function renderEngagementFees(competition = selectedEngagementCompetition || {}) {
    const fees = competition.fees || {};
    const adminMode = isEngagementAdminMode();
    const canEdit = adminMode && engagementDetailEditing && canEditEngagementCompetition(competition);
    const noFees = fees.enabled === false;
    if (elements.engagementsFeesForm?.parentElement) elements.engagementsFeesForm.parentElement.hidden = !canEdit;
    if (elements.engagementsFeesForm) elements.engagementsFeesForm.dataset.readonly = canEdit ? "false" : "true";
    if (elements.engagementsNoFees) {
      elements.engagementsNoFees.checked = noFees;
      elements.engagementsNoFees.disabled = !canEdit;
    }
    if (elements.engagementsSwimmerFee) elements.engagementsSwimmerFee.value = fees.swimmerFee || "";
    if (elements.engagementsIndividualEventFee) elements.engagementsIndividualEventFee.value = fees.individualEventFee || "";
    if (elements.engagementsRelayFee) elements.engagementsRelayFee.value = fees.relayFee || "";
    if (elements.engagementsHelloAssoUrl) elements.engagementsHelloAssoUrl.value = fees.helloAssoUrl || "";
    if (elements.engagementsSwimmerFeeRead) elements.engagementsSwimmerFeeRead.textContent = formatEngagementFee(fees.swimmerFee);
    if (elements.engagementsIndividualEventFeeRead) elements.engagementsIndividualEventFeeRead.textContent = formatEngagementFee(fees.individualEventFee);
    if (elements.engagementsRelayFeeRead) elements.engagementsRelayFeeRead.textContent = formatEngagementFee(fees.relayFee);
    if (elements.engagementsHelloAssoUrlRead) elements.engagementsHelloAssoUrlRead.textContent = fees.helloAssoUrl || "Lien en attente";
    updateEngagementFeesFormMode(canEdit);
    if (elements.engagementsFeesSummary) elements.engagementsFeesSummary.textContent = engagementFeesSummary(fees);
    renderEngagementClubSummary();
    if (elements.engagementsFeesSaveButton) {
      elements.engagementsFeesSaveButton.hidden = true;
      elements.engagementsFeesSaveButton.disabled = true;
    }
    if (elements.engagementsFeesMessage) {
      elements.engagementsFeesMessage.textContent = !adminMode
        ? ""
        : canEditEngagementCompetition(competition) ? "" : "Frais consultables uniquement avec un droit de gestion sur cette compétition.";
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
    const activeClubProfile = activeEngagementClubProfile(currentAccessProfile || {});
    return {
      mode: "person",
      personId: externalClub ? "" : String(elements.engagementsClubTeamPersonSelect?.value || "").trim(),
      firstName: String(elements.engagementsClubTeamFirstName?.value || "").trim(),
      lastName: String(elements.engagementsClubTeamLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
      birthDate: externalClub ? "" : String(elements.engagementsClubTeamBirthDate?.value || "").trim(),
      sex: externalClub ? "" : String(elements.engagementsClubTeamSex?.value || "").trim(),
      licenseNumber: formatEngagementSwimmerLicense(elements.engagementsClubTeamLicense?.value || ""),
      externalClub,
      clubId: externalClub ? String(elements.engagementsClubTeamExternalClubId?.value || "").trim() : (activeClubProfile.clubId || ""),
      clubName: externalClub ? String(elements.engagementsClubTeamExternalClubName?.value || "").trim() : (activeClubProfile.clubName || "")
    };
  }

  function engagementClubTeamLeaderPeople(query = "") {
    const terms = normalizedEngagementClubSearch(query).split(/\s+/).filter(Boolean);
    const peopleBySwimmer = new Map();
    const peopleByLicense = new Map();
    engagementClubPeople.forEach((person) => {
      if (!person.active) return;
      const swimmerKey = [person.swimmerSource || "performances", person.swimmerIndexId].filter(Boolean).join(":");
      if (swimmerKey) peopleBySwimmer.set(swimmerKey, person);
      const licenseKey = engagementClubPersonLicenseKey(person.licenseNumber);
      if (licenseKey) peopleByLicense.set(licenseKey, person);
    });
    const candidates = [
      ...engagementClubPeople
        .filter((person) => person.active)
        .map((person) => ({ ...person, selectionId: person.id, candidateType: "person" })),
      ...engagementClubSwimmers
        .filter((swimmer) => swimmer.active !== false)
        .filter((swimmer) => {
          const swimmerKey = [swimmer.source || "performances", swimmer.swimmerIndexId || swimmer.id].filter(Boolean).join(":");
          return !peopleBySwimmer.has(swimmerKey) && !peopleByLicense.has(engagementClubPersonLicenseKey(swimmer.licenseNumber));
        })
        .map((swimmer) => ({
          ...swimmer,
          selectionId: `swimmer:${swimmer.source || "performances"}:${swimmer.swimmerIndexId || swimmer.id}`,
          candidateType: "swimmer",
          roles: { swimmer: true, teamLeader: false }
        }))
    ];
    return candidates
      .filter((person) => {
        if (!person.active) return false;
        if (!terms.length) return true;
        const haystack = normalizedEngagementClubSearch([
          person.lastName,
          person.firstName,
          person.licenseNumber
        ].filter(Boolean).join(" "));
        return terms.every((term) => haystack.includes(term));
      })
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
  }

  function renderEngagementClubTeamPersonOptions(selectedPersonId = "") {
    if (!elements.engagementsClubTeamPersonSelect) return;
    const query = elements.engagementsClubTeamPersonSearch?.value || "";
    const options = engagementClubTeamLeaderPeople(query);
    elements.engagementsClubTeamPersonSelect.innerHTML = [
      `<option value="">${options.length ? "Choisir un membre ou saisir manuellement" : "Aucun membre correspondant — saisie manuelle"}</option>`,
      ...options.map((person) => `
        <option value="${escapeHtml(person.selectionId || person.id)}">${escapeHtml([person.lastName, person.firstName].filter(Boolean).join(" "))} - licence ${escapeHtml(person.licenseNumber || "-")}</option>
      `)
    ].join("");
    elements.engagementsClubTeamPersonSelect.value = options.some((person) => (person.selectionId || person.id) === selectedPersonId) ? selectedPersonId : "";
    if (elements.engagementsClubTeamPersonResults) {
      const hasQuery = Boolean(String(query).trim());
      const visiblePeople = options.slice(0, 12);
      elements.engagementsClubTeamPersonResults.hidden = !hasQuery;
      elements.engagementsClubTeamPersonResults.innerHTML = !hasQuery
        ? ""
        : visiblePeople.length
        ? visiblePeople.map((person) => {
          const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Membre sans nom";
          const role = person.roles?.teamLeader ? "chef d'équipe" : person.candidateType === "swimmer" ? "nageur du club" : "membre du club";
          const details = [person.licenseNumber ? `licence ${person.licenseNumber}` : "licence non renseignée", role];
          return `<button type="button" data-engagement-club-team-person-result="${escapeHtml(person.selectionId || person.id)}"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(details.join(" · "))}</small></button>`;
        }).join("")
        : `<p class="admin-engagements-empty">Aucun membre trouvé.</p>`;
    }
  }

  function setEngagementClubTeamManualFieldsVisible(visible) {
    if (elements.engagementsClubTeamPersonFields) elements.engagementsClubTeamPersonFields.dataset.manualEntry = visible ? "true" : "false";
    const pickerLabel = elements.engagementsClubTeamPersonSelect?.closest("label");
    if (pickerLabel) pickerLabel.hidden = true;
    [
      elements.engagementsClubTeamFirstName,
      elements.engagementsClubTeamLastName,
      elements.engagementsClubTeamBirthDate,
      elements.engagementsClubTeamSex,
      elements.engagementsClubTeamLicense,
      elements.engagementsClubTeamExternal
    ].forEach((field) => {
      const label = field?.closest("label");
      if (label) label.hidden = !visible;
    });
    if (!visible) {
      if (elements.engagementsClubTeamExternalClubIdLabel) elements.engagementsClubTeamExternalClubIdLabel.hidden = true;
      if (elements.engagementsClubTeamExternalClubNameLabel) elements.engagementsClubTeamExternalClubNameLabel.hidden = true;
    }
    if (elements.engagementsClubTeamPersonCreate) elements.engagementsClubTeamPersonCreate.hidden = visible;
  }

  function findEngagementClubTeamPersonFromFields(teamLeader = {}) {
    if (teamLeader.personId) {
      return engagementClubPeople.find((person) => person.id === teamLeader.personId) || null;
    }
    return engagementClubTeamLeaderPeople().find((person) =>
      engagementClubPersonLicenseKey(person.licenseNumber) &&
      engagementClubPersonLicenseKey(person.licenseNumber) === engagementClubPersonLicenseKey(teamLeader.licenseNumber) &&
      engagementClubPersonIdentityKey(person) === engagementClubPersonIdentityKey(teamLeader)
    ) || null;
  }

  function applyEngagementClubTeamPerson(personId = "") {
    const person = engagementClubPeople.find((item) => item.id === personId);
    if (!person) {
      if (elements.engagementsClubTeamFirstName) elements.engagementsClubTeamFirstName.value = "";
      if (elements.engagementsClubTeamLastName) elements.engagementsClubTeamLastName.value = "";
      if (elements.engagementsClubTeamBirthDate) elements.engagementsClubTeamBirthDate.value = "";
      if (elements.engagementsClubTeamSex) elements.engagementsClubTeamSex.value = "";
      if (elements.engagementsClubTeamLicense) elements.engagementsClubTeamLicense.value = "";
      if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = false;
      if (elements.engagementsClubTeamExternalClubId) elements.engagementsClubTeamExternalClubId.value = "";
      if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.value = "";
      updateEngagementClubTeamFormMode();
      return false;
    }
    if (elements.engagementsClubTeamFirstName) elements.engagementsClubTeamFirstName.value = person.firstName || "";
    if (elements.engagementsClubTeamLastName) elements.engagementsClubTeamLastName.value = person.lastName || "";
    if (elements.engagementsClubTeamBirthDate) elements.engagementsClubTeamBirthDate.value = person.birthDate || "";
    if (elements.engagementsClubTeamSex) elements.engagementsClubTeamSex.value = person.sex || "";
    if (elements.engagementsClubTeamLicense) elements.engagementsClubTeamLicense.value = person.licenseNumber || "";
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = false;
    if (elements.engagementsClubTeamExternalClubId) elements.engagementsClubTeamExternalClubId.value = "";
    if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.value = "";
    updateEngagementClubTeamFormMode();
    return true;
  }

  async function confirmEngagementClubTeamLeaderCandidate(candidate = {}) {
    if (!candidate?.selectionId) return null;
    const conflict = engagementClubMemberRoleConflict(candidate, "teamLeader");
    if (conflict) {
      global.alert(conflict);
      throw new Error(conflict);
    }
    if (candidate.roles?.teamLeader === true) return candidate;
    const name = engagementClubPersonDisplayName(candidate);
    if (!global.confirm(`${name} n'est pas encore déclaré comme chef d'équipe. Voulez-vous lui attribuer ce rôle ?`)) {
      return null;
    }
    if (candidate.candidateType !== "swimmer") return candidate;
    const result = await callFunction("saveEngagementClubPerson", {
      person: engagementClubPersonPayloadWithRole(candidate, "teamLeader")
    });
    const person = result.person || null;
    if (!person?.id) throw new Error("Membre non retourné après l'ajout du rôle chef d'équipe.");
    engagementClubPeople = [
      ...engagementClubPeople.filter((item) => item.id !== person.id),
      person
    ];
    return { ...person, selectionId: person.id, candidateType: "person" };
  }

  function restoreEngagementClubTeamLeaderChoice() {
    const teamLeader = selectedEngagementClubEntry?.teamLeader || {};
    elements.engagementsClubTeamForm?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
      .forEach((radio) => {
        radio.checked = teamLeader.mode === "renounced"
          ? radio.value === "renounced"
          : teamLeader.mode === "person" && !teamLeader.externalClub && radio.value === "person";
      });
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = teamLeader.mode === "person" && teamLeader.externalClub === true;
    if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.checked = teamLeader.renunciationAccepted === true;
    updateEngagementClubTeamFormMode();
  }

  async function selectEngagementClubTeamRenunciation(event) {
    event?.preventDefault?.();
    if (engagementClubTeamRenunciationSaving) return;
    if (elements.engagementsClubTeamRenunciationDialog?.open) elements.engagementsClubTeamRenunciationDialog.close();
    const radio = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="renounced"]');
    if (radio) radio.checked = true;
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = false;
    if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.checked = true;
    updateEngagementClubTeamFormMode();
    engagementClubTeamRenunciationSaving = true;
    try {
      const saved = await saveEngagementClubTeamLeader();
      if (!saved) restoreEngagementClubTeamLeaderChoice();
    } finally {
      engagementClubTeamRenunciationSaving = false;
    }
  }

  function openEngagementClubTeamRenunciationDialog() {
    if (!elements.engagementsClubTeamRenunciationDialog?.open) {
      elements.engagementsClubTeamRenunciationDialog?.showModal();
    }
  }

  function closeEngagementClubTeamRenunciationDialog() {
    if (elements.engagementsClubTeamRenunciationDialog?.open) elements.engagementsClubTeamRenunciationDialog.close();
    restoreEngagementClubTeamLeaderChoice();
  }

  function closeEngagementClubExternalTeamDialog({ reset = false } = {}) {
    if (elements.engagementsClubTeamExternalDialog?.open) elements.engagementsClubTeamExternalDialog.close();
    if (reset) restoreEngagementClubTeamLeaderChoice();
  }

  function openEngagementClubExternalTeamDialog() {
    const dialog = elements.engagementsClubTeamExternalDialog;
    if (!dialog) return;
    if (elements.engagementsClubTeamExternalLastName) elements.engagementsClubTeamExternalLastName.value = elements.engagementsClubTeamLastName?.value || "";
    if (elements.engagementsClubTeamExternalFirstName) elements.engagementsClubTeamExternalFirstName.value = elements.engagementsClubTeamFirstName?.value || "";
    if (elements.engagementsClubTeamExternalDialogClubName) elements.engagementsClubTeamExternalDialogClubName.value = elements.engagementsClubTeamExternalClubName?.value || "";
    if (elements.engagementsClubTeamExternalDialogMessage) elements.engagementsClubTeamExternalDialogMessage.textContent = "";
    if (!dialog.open) dialog.showModal();
    elements.engagementsClubTeamExternalLastName?.focus();
  }

  async function saveEngagementClubExternalTeamLeader(event) {
    event?.preventDefault?.();
    if (elements.engagementsClubTeamExternalDialogForm && !elements.engagementsClubTeamExternalDialogForm.checkValidity()) {
      elements.engagementsClubTeamExternalDialogForm.reportValidity?.();
      return;
    }
    if (elements.engagementsClubTeamLastName) elements.engagementsClubTeamLastName.value = elements.engagementsClubTeamExternalLastName?.value.trim().toLocaleUpperCase("fr-FR") || "";
    if (elements.engagementsClubTeamFirstName) elements.engagementsClubTeamFirstName.value = elements.engagementsClubTeamExternalFirstName?.value.trim() || "";
    if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.value = elements.engagementsClubTeamExternalDialogClubName?.value.trim() || "";
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = true;
    updateEngagementClubTeamFormMode();
    if (elements.engagementsClubTeamExternalDialogApply) elements.engagementsClubTeamExternalDialogApply.disabled = true;
    const saved = await saveEngagementClubTeamLeader();
    if (elements.engagementsClubTeamExternalDialogApply) elements.engagementsClubTeamExternalDialogApply.disabled = false;
    if (saved) {
      closeEngagementClubExternalTeamDialog();
    } else if (elements.engagementsClubTeamExternalDialogMessage) {
      elements.engagementsClubTeamExternalDialogMessage.textContent = elements.engagementsClubTeamMessage?.textContent || "Enregistrement impossible.";
      elements.engagementsClubTeamExternalDialogMessage.dataset.tone = "error";
    }
  }

  function engagementClubOfficialPeople() {
    const candidates = engagementClubPeople
      .filter((person) => person.active)
      .map((person) => ({ ...person, candidateType: "person", selectionId: person.id }));
    engagementClubSwimmers
      .filter((swimmer) => swimmer.active !== false && !engagementClubPersonForSwimmer(swimmer))
      .forEach((swimmer) => candidates.push({
        ...swimmer,
        candidateType: "swimmer",
        selectionId: `swimmer:${engagementClubSwimmerReferenceValue(swimmer)}`,
        roles: { swimmer: true, official: false, teamLeader: false }
      }));
    return candidates
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
  }

  function engagementClubSwimmerReferenceValue(swimmer = {}) {
    const source = String(swimmer.source || "performances").trim() || "performances";
    const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
    return source && swimmerIndexId ? `${encodeURIComponent(source)}:${encodeURIComponent(swimmerIndexId)}` : "";
  }

  function engagementClubSwimmerFromReferenceValue(value = "") {
    const [rawSource = "", rawId = ""] = String(value || "").split(":");
    if (!rawSource || !rawId) return null;
    const source = decodeURIComponent(rawSource);
    const swimmerIndexId = decodeURIComponent(rawId);
    return engagementClubSwimmers.find((swimmer) =>
      String(swimmer.source || "performances") === source && String(swimmer.swimmerIndexId || swimmer.id || "") === swimmerIndexId
    ) || null;
  }

  function engagementClubPersonForSwimmer(swimmer = {}) {
    const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "");
    const swimmerSource = String(swimmer.source || "performances");
    return engagementClubPeople.find((person) =>
      (person.swimmerIndexId === swimmerIndexId && String(person.swimmerSource || "performances") === swimmerSource) ||
      (person.licenseNumber && swimmer.licenseNumber && person.licenseNumber === swimmer.licenseNumber)
    ) || null;
  }

  function renderEngagementClubPersonSwimmerOptions() {
    const availableSwimmers = engagementClubSwimmers
      .filter((swimmer) => swimmer.active !== false)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
    if (elements.engagementsClubPersonSwimmerResults) {
      const query = normalizedEngagementClubSearch(elements.engagementsClubPersonSwimmerSearch?.value || "");
      const terms = query.split(/\s+/).filter(Boolean);
      const matchingSwimmers = query
        ? availableSwimmers.filter((swimmer) => {
          const haystack = engagementClubSwimmerSearchText(swimmer);
          return terms.every((term) => haystack.includes(term));
        })
        : [];
      if (!query) {
        elements.engagementsClubPersonSwimmerResults.hidden = true;
        elements.engagementsClubPersonSwimmerResults.innerHTML = "";
        elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "false");
      } else if (!matchingSwimmers.length) {
        elements.engagementsClubPersonSwimmerResults.hidden = false;
        elements.engagementsClubPersonSwimmerResults.innerHTML = '<p class="admin-engagements-club-person-swimmer-empty">Aucun nageur trouvé. Vous pouvez saisir la personne manuellement.</p>';
        elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "true");
      } else {
        const visibleSwimmers = matchingSwimmers.slice(0, 8);
        elements.engagementsClubPersonSwimmerResults.hidden = false;
        elements.engagementsClubPersonSwimmerResults.innerHTML = [
          ...visibleSwimmers.map((swimmer) => {
            const value = engagementClubSwimmerReferenceValue(swimmer);
            const name = [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ") || swimmer.name || "Nageur sans nom";
            const license = swimmer.licenseNumber || "Licence à renseigner";
            return `<button type="button" data-engagement-club-person-swimmer-result="${escapeHtml(value)}" ${swimmer.licenseNumber ? "" : "disabled"}>
              <strong>${escapeHtml(name)}</strong>
              <small>${escapeHtml(license)}</small>
            </button>`;
          }),
          matchingSwimmers.length > visibleSwimmers.length
            ? `<small class="admin-engagements-club-person-swimmer-more">${matchingSwimmers.length - visibleSwimmers.length} autre${matchingSwimmers.length - visibleSwimmers.length > 1 ? "s" : ""} résultat${matchingSwimmers.length - visibleSwimmers.length > 1 ? "s" : ""} · précisez la recherche</small>`
            : ""
        ].join("");
        elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "true");
      }
    }
  }

  function applyEngagementClubPersonSwimmer(value = "") {
    const swimmer = engagementClubSwimmerFromReferenceValue(value);
    if (value && !swimmer) return;
    const previouslyLinked = Boolean(elements.engagementsClubPersonSwimmerId?.value);
    const linked = Boolean(swimmer);
    if (elements.engagementsClubPersonSwimmerId) elements.engagementsClubPersonSwimmerId.value = swimmer?.swimmerIndexId || swimmer?.id || "";
    if (elements.engagementsClubPersonSwimmerSource) elements.engagementsClubPersonSwimmerSource.value = swimmer?.source || "";
    if (linked) {
      if (elements.engagementsClubPersonSwimmerSearch) {
        elements.engagementsClubPersonSwimmerSearch.value = [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ");
        elements.engagementsClubPersonSwimmerSearch.setAttribute("aria-expanded", "false");
      }
      if (elements.engagementsClubPersonSwimmerResults) {
        elements.engagementsClubPersonSwimmerResults.hidden = true;
        elements.engagementsClubPersonSwimmerResults.innerHTML = "";
      }
      if (elements.engagementsClubPersonFirstName) elements.engagementsClubPersonFirstName.value = swimmer.firstName || "";
      if (elements.engagementsClubPersonLastName) elements.engagementsClubPersonLastName.value = swimmer.lastName || "";
      if (elements.engagementsClubPersonBirthDate) elements.engagementsClubPersonBirthDate.value = swimmer.birthDate || "";
      if (elements.engagementsClubPersonSex) elements.engagementsClubPersonSex.value = swimmer.sex || "";
      if (elements.engagementsClubPersonLicense) elements.engagementsClubPersonLicense.value = swimmer.licenseNumber || "";
    } else if (previouslyLinked) {
      if (elements.engagementsClubPersonFirstName) elements.engagementsClubPersonFirstName.value = "";
      if (elements.engagementsClubPersonLastName) elements.engagementsClubPersonLastName.value = "";
      if (elements.engagementsClubPersonBirthDate) elements.engagementsClubPersonBirthDate.value = "";
      if (elements.engagementsClubPersonSex) elements.engagementsClubPersonSex.value = "";
      if (elements.engagementsClubPersonLicense) elements.engagementsClubPersonLicense.value = "";
    }
    [elements.engagementsClubPersonFirstName, elements.engagementsClubPersonLastName, elements.engagementsClubPersonBirthDate, elements.engagementsClubPersonSex, elements.engagementsClubPersonLicense]
      .forEach((field) => {
        if (!field) return;
        if (field.matches("select")) field.disabled = linked;
        else field.readOnly = linked;
      });
  }

  function selectedEngagementClubOfficialIds() {
    return Array.from(elements.engagementsClubOfficialsForm?.querySelectorAll("[data-engagement-club-official-id]:checked") || [])
      .map((input) => input.dataset.engagementClubOfficialId)
      .filter(Boolean);
  }

  function updateEngagementClubOfficialsSummary() {
    if (!elements.engagementsClubOfficialsSummary) return;
    const selectedCount = selectedEngagementClubOfficialIds().length;
    elements.engagementsClubOfficialsSummary.textContent = selectedCount
      ? `${selectedCount} officiel${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}.`
      : "Aucun officiel sélectionné.";
    renderEngagementClubSummary();
  }

  function renderEngagementClubOfficials() {
    const mount = elements.engagementsClubOfficialsList;
    const selectedMount = elements.engagementsClubSelectedOfficialsList;
    if (!mount) return;
    const writeLockReason = engagementClubWriteLockReason();
    const locked = Boolean(writeLockReason || !engagementClubTeamComplete());
    const candidateListsReady = engagementClubPeopleLoaded && engagementClubSwimmersLoaded;
    const candidateListsLoading = (!engagementClubPeopleLoaded && engagementClubPeopleLoading) ||
      (!engagementClubSwimmersLoaded && engagementClubSwimmersLoading);
    if (elements.engagementsClubOfficialsForm) elements.engagementsClubOfficialsForm.dataset.locked = locked ? "true" : "false";
    if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.disabled = locked || !candidateListsReady;
    if (elements.engagementsClubOfficialsSearch) elements.engagementsClubOfficialsSearch.disabled = locked || !candidateListsReady;
    const selectedIds = new Set((selectedEngagementClubEntry?.officials || []).map((official) => official.personId).filter(Boolean));
    const members = engagementClubOfficialPeople();
    if (locked) {
      if (selectedMount) selectedMount.innerHTML = "";
      mount.innerHTML = `<p class="admin-engagements-empty">${escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
      updateEngagementClubOfficialsSummary();
      return;
    }
    if (!candidateListsReady) {
      if (selectedMount) selectedMount.innerHTML = candidateListsLoading
        ? '<p class="admin-engagements-empty">Préparation des officiels engagés…</p>'
        : '<p class="admin-engagements-empty">La liste des membres du club est indisponible.</p>';
      mount.innerHTML = "";
      if (elements.engagementsClubOfficialsSummary) {
        elements.engagementsClubOfficialsSummary.textContent = candidateListsLoading
          ? "Préparation des sélections enregistrées…"
          : "Officiels indisponibles.";
      }
      return;
    }
    if (!members.length) {
      if (selectedMount) selectedMount.innerHTML = "";
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun membre actif trouvé pour ce club.</p>';
      updateEngagementClubOfficialsSummary();
      return;
    }
    const renderOfficialRow = (person) => {
      const selected = selectedIds.has(person.id);
      const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Membre sans nom";
      return `
        <label class="admin-engagements-club-official-row" role="row" data-selected="${selected ? "true" : "false"}" data-engagement-club-official-candidate="${escapeHtml(person.selectionId || person.id)}">
          <span role="cell">
            <input type="checkbox" data-engagement-club-official-id="${escapeHtml(person.id || "")}" data-engagement-club-official-selection="${escapeHtml(person.selectionId || person.id)}" ${selected ? "checked" : ""}>
            <strong>${escapeHtml(name)}</strong>
          </span>
          <span role="cell">${escapeHtml(person.birthDate ? formatShortDate(person.birthDate) : "-")}</span>
          <span role="cell">${escapeHtml(person.licenseNumber || "-")}</span>
        </label>
      `;
    };
    const renderOfficialTable = (rows, label) => `
      <section class="admin-engagements-club-officials-section">
        <h5>${escapeHtml(label)} <span>${rows.length}</span></h5>
        <div class="admin-engagements-club-officials-table" role="table" aria-label="${escapeHtml(label)}">
          <div class="admin-engagements-club-officials-head" role="row">
            <span role="columnheader">Membre</span>
            <span role="columnheader">Naissance</span>
            <span role="columnheader">Licence</span>
          </div>
          ${rows.map(renderOfficialRow).join("")}
        </div>
      </section>
    `;
    const selectedOfficials = members.filter((person) => selectedIds.has(person.id));
    const availableOfficials = members.filter((person) => !selectedIds.has(person.id));
    const availableClubOfficials = availableOfficials.filter((person) => person.roles?.official === true);
    const search = normalizedEngagementClubSearch(elements.engagementsClubOfficialsSearch?.value || "");
    const matchingOfficials = availableOfficials.filter((person) => normalizedEngagementClubSearch([
      person.firstName,
      person.lastName,
      person.birthDate,
      person.licenseNumber
    ].filter(Boolean).join(" ")).includes(search));
    if (selectedMount) {
      selectedMount.innerHTML = selectedOfficials.length
        ? renderOfficialTable(selectedOfficials, "Officiels engagés")
        : "";
    }
    mount.innerHTML = !search
      ? availableClubOfficials.length
        ? renderOfficialTable(availableClubOfficials, "Officiels du club")
        : '<p class="admin-engagements-empty">Aucun autre officiel actif dans ce club.</p>'
      : matchingOfficials.length
        ? renderOfficialTable(matchingOfficials, "Résultats de recherche")
        : '<p class="admin-engagements-empty">Aucun membre ne correspond à cette recherche.</p>';
    setEngagementClubFormControlsLocked(elements.engagementsClubOfficialsForm, false);
    updateEngagementClubOfficialsSummary();
  }

  function engagementClubMemberRoleConflict(person = {}, targetRole = "") {
    const entry = selectedEngagementClubEntry || {};
    const personId = String(person.id || "");
    const swimmerIndexId = String(person.swimmerIndexId || person.id || "");
    const licenseKey = engagementClubPersonLicenseKey(person.licenseNumber);
    const teamLeader = entry.teamLeader || {};
    const isTeamLeader = teamLeader.mode === "person" && (
      (personId && teamLeader.personId === personId) ||
      (licenseKey && engagementClubPersonLicenseKey(teamLeader.licenseNumber) === licenseKey)
    );
    const isOfficial = (entry.officials || []).some((official) =>
      (personId && official.personId === personId) ||
      (licenseKey && engagementClubPersonLicenseKey(official.licenseNumber) === licenseKey)
    );
    const isSwimmer = (entry.swimmers || []).some((swimmer) =>
      (swimmerIndexId && swimmer.swimmerIndexId === swimmerIndexId) ||
      (licenseKey && engagementClubPersonLicenseKey(swimmer.licenseNumber) === licenseKey)
    );
    if (targetRole === "official") {
      if (isTeamLeader) return "Cette personne est déjà chef d'équipe sur cette compétition et ne peut pas être ajoutée comme officiel.";
      if (isSwimmer) return "Cette personne est déjà engagée comme nageur sur cette compétition et ne peut pas être ajoutée comme officiel.";
    }
    if (targetRole === "swimmer") {
      if (isTeamLeader) return "Cette personne est déjà chef d'équipe sur cette compétition et ne peut pas être engagée comme nageur.";
      if (isOfficial) return "Cette personne est déjà officielle sur cette compétition et ne peut pas être engagée comme nageur.";
    }
    if (targetRole === "teamLeader") {
      if (isOfficial) return "Cette personne est déjà officielle sur cette compétition et ne peut pas être choisie comme chef d'équipe.";
      if (isSwimmer) return "Cette personne est déjà engagée comme nageur sur cette compétition et ne peut pas être choisie comme chef d'équipe.";
    }
    return "";
  }

  async function handleEngagementClubOfficialSelection(event) {
    const checkbox = event.target.closest("[data-engagement-club-official-selection]");
    if (!checkbox) return;
    const selectionId = checkbox.dataset.engagementClubOfficialSelection || "";
    let candidate = engagementClubOfficialPeople().find((person) => (person.selectionId || person.id) === selectionId) || null;
    if (!candidate) return;
    const previousOfficials = cloneEngagementClubEntry(selectedEngagementClubEntry?.officials || []);
    if (!checkbox.checked) {
      selectedEngagementClubEntry = {
        ...(selectedEngagementClubEntry || {}),
        officials: (selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id)
      };
      renderEngagementClubOfficials();
      const saved = await saveEngagementClubOfficials();
      if (!saved) {
        selectedEngagementClubEntry = { ...(selectedEngagementClubEntry || {}), officials: previousOfficials };
        renderEngagementClubOfficials();
      }
      return;
    }
    const conflict = engagementClubMemberRoleConflict(candidate, "official");
    if (conflict) {
      checkbox.checked = false;
      global.alert(conflict);
      if (elements.engagementsClubOfficialsMessage) {
        elements.engagementsClubOfficialsMessage.textContent = conflict;
        elements.engagementsClubOfficialsMessage.dataset.tone = "error";
      }
      return;
    }
    try {
      if (candidate.roles?.official !== true) {
        const name = engagementClubPersonDisplayName(candidate);
        if (!global.confirm(`${name} n'est pas encore déclaré comme officiel. Voulez-vous lui attribuer ce rôle ?`)) {
          checkbox.checked = false;
          return;
        }
        const existingPerson = candidate.candidateType === "swimmer" ? engagementClubPersonForSwimmer(candidate) : candidate;
        const personResult = await callFunction("saveEngagementClubPerson", {
          personId: existingPerson?.id || "",
          person: engagementClubPersonPayloadWithRole({ ...candidate, ...(existingPerson || {}) }, "official")
        });
        const person = personResult.person || null;
        if (!person?.id) throw new Error("Personne non retournée après l'ajout du rôle officiel.");
        engagementClubPeople = [...engagementClubPeople.filter((item) => item.id !== person.id), person];
        candidate = { ...person, candidateType: "person", selectionId: person.id };
      }
      selectedEngagementClubEntry = {
        ...(selectedEngagementClubEntry || {}),
        officials: [
          ...(selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id),
          {
            personId: candidate.id,
            firstName: candidate.firstName || "",
            lastName: candidate.lastName || "",
            licenseNumber: candidate.licenseNumber || ""
          }
        ]
      };
      renderEngagementClubOfficials();
      const saved = await saveEngagementClubOfficials();
      if (!saved) {
        selectedEngagementClubEntry = { ...(selectedEngagementClubEntry || {}), officials: previousOfficials };
        renderEngagementClubOfficials();
      }
    } catch (error) {
      checkbox.checked = false;
      if (elements.engagementsClubOfficialsMessage) {
        elements.engagementsClubOfficialsMessage.textContent = `Ajout impossible : ${error?.message || error}`;
        elements.engagementsClubOfficialsMessage.dataset.tone = "error";
      }
    }
  }

  function normalizedEngagementClubSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizedEngagementClubIdentityPart(value) {
    return normalizedEngagementClubSearch(value)
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function engagementClubPersonLicenseKey(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function engagementClubPersonIdentityKey(person = {}, inverted = false) {
    const firstName = normalizedEngagementClubIdentityPart(inverted ? person.lastName : person.firstName);
    const lastName = normalizedEngagementClubIdentityPart(inverted ? person.firstName : person.lastName);
    const birthDate = String(person.birthDate || "").trim();
    return firstName && lastName && birthDate ? `${lastName}|${firstName}|${birthDate}` : "";
  }

  function engagementClubIdentityEditDistance(left = "", right = "") {
    const a = normalizedEngagementClubIdentityPart(left);
    const b = normalizedEngagementClubIdentityPart(right);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= b.length; column += 1) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + Number(a[row - 1] !== b[column - 1])
        );
      }
      previous = current;
    }
    return previous[b.length];
  }

  function engagementClubIdentityPartSimilar(left = "", right = "") {
    const a = normalizedEngagementClubIdentityPart(left);
    const b = normalizedEngagementClubIdentityPart(right);
    if (!a || !b) return false;
    if (a === b) return true;
    if (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))) return true;
    const maximumDistance = Math.min(a.length, b.length) >= 7 ? 2 : 1;
    return engagementClubIdentityEditDistance(a, b) <= maximumDistance;
  }

  function engagementClubPersonIdentityMatch(person = {}, ignoredPersonId = "") {
    const candidates = engagementClubPeople.filter((candidate) => candidate.id && candidate.id !== ignoredPersonId);
    const licenseKey = engagementClubPersonLicenseKey(person.licenseNumber);
    const sameLicense = licenseKey && candidates.find((candidate) =>
      engagementClubPersonLicenseKey(candidate.licenseNumber) === licenseKey
    );
    if (sameLicense) return { type: "license", person: sameLicense };
    const identityKey = engagementClubPersonIdentityKey(person);
    const invertedIdentityKey = engagementClubPersonIdentityKey(person, true);
    const exact = identityKey && candidates.find((candidate) => engagementClubPersonIdentityKey(candidate) === identityKey);
    if (exact) return { type: "exact", person: exact };
    const inverted = invertedIdentityKey && invertedIdentityKey !== identityKey
      ? candidates.find((candidate) => engagementClubPersonIdentityKey(candidate) === invertedIdentityKey)
      : null;
    if (inverted) return { type: "inverted", person: inverted };
    const similar = person.birthDate ? candidates.find((candidate) => {
      if (candidate.birthDate !== person.birthDate) return false;
      const normalOrder = engagementClubIdentityPartSimilar(candidate.lastName, person.lastName) &&
        engagementClubIdentityPartSimilar(candidate.firstName, person.firstName);
      const invertedOrder = engagementClubIdentityPartSimilar(candidate.lastName, person.firstName) &&
        engagementClubIdentityPartSimilar(candidate.firstName, person.lastName);
      return normalOrder || invertedOrder;
    }) : null;
    return similar ? { type: "similar", person: similar } : null;
  }

  function engagementClubPersonDisplayName(person = {}) {
    return [person.lastName, person.firstName].filter(Boolean).join(" ") || person.licenseNumber || "ce membre";
  }

  function engagementClubPersonPayloadWithRole(person = {}, role = "") {
    return {
      firstName: String(person.firstName || "").trim(),
      lastName: String(person.lastName || "").trim().toLocaleUpperCase("fr-FR"),
      birthDate: String(person.birthDate || "").trim(),
      sex: String(person.sex || "").trim().toUpperCase(),
      licenseNumber: formatEngagementSwimmerLicense(person.licenseNumber || ""),
      swimmerIndexId: String(person.swimmerIndexId || "").trim(),
      swimmerSource: String(person.swimmerSource || person.source || "").trim(),
      roles: {
        teamLeader: person.roles?.teamLeader === true || role === "teamLeader",
        official: person.roles?.official === true || role === "official"
      }
    };
  }

  function resolveEngagementClubPersonIdentity(person = {}, roleLabel = "membre", ignoredPersonId = "") {
    const match = engagementClubPersonIdentityMatch(person, ignoredPersonId);
    if (!match) return { person: null, cancelled: false };
    const name = engagementClubPersonDisplayName(match.person);
    if (match.type === "similar") {
      if (global.confirm(`Une personne similaire existe peut-être : ${name}. L'utiliser comme ${roleLabel} ?`)) {
        return { person: match.person, cancelled: false };
      }
      const createAnyway = global.confirm(`Créer une nouvelle personne malgré la ressemblance avec ${name} ?`);
      return { person: null, cancelled: !createAnyway };
    }
    const reason = match.type === "inverted"
      ? "avec le nom et le prénom inversés"
      : match.type === "license"
        ? "avec le même numéro de licence"
        : "avec la même identité";
    const reuse = global.confirm(`Cette création est impossible : ${name} existe déjà ${reason}. L'utiliser comme ${roleLabel} ?`);
    return { person: reuse ? match.person : null, cancelled: !reuse };
  }

  function engagementAdminPublicSwimmerSearchTokens(value) {
    return normalizedEngagementClubSearch(value)
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2);
  }

  function engagementAdminPublicSwimmerSearchShard(value) {
    const token = engagementAdminPublicSwimmerSearchTokens(value)[0] || "";
    return token.slice(0, 2);
  }

  async function loadEngagementAdminPublicSwimmerSearchShard(shard = "") {
    const cleanShard = String(shard || "").trim();
    if (!cleanShard) return [];
    if (publicPerformanceSwimmerSearchShards.has(cleanShard)) {
      return publicPerformanceSwimmerSearchShards.get(cleanShard);
    }
    const promise = fetch(`${PERFORMANCE_PUBLIC_SEARCH_BASE}/search/${encodeURIComponent(cleanShard)}.json?v=${ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION}`, {
      cache: "no-cache"
    })
      .then((response) => {
        if (response.status === 404) return [];
        if (!response.ok) throw new Error("Index public nageurs indisponible.");
        return response.json();
      })
      .then((rows) => Array.isArray(rows) ? rows : [])
      .catch(() => []);
    publicPerformanceSwimmerSearchShards.set(cleanShard, promise);
    return promise;
  }

  function engagementAdminPublicSwimmerScore(swimmer = {}, terms = []) {
    const name = normalizedEngagementClubSearch([swimmer.firstName, swimmer.lastName].filter(Boolean).join(" "));
    const reverseName = normalizedEngagementClubSearch([swimmer.lastName, swimmer.firstName].filter(Boolean).join(" "));
    const searchText = normalizedEngagementClubSearch(swimmer.searchText || "");
    if (terms.length && (name === terms.join(" ") || reverseName === terms.join(" "))) return 0;
    if (terms.length && (name.startsWith(terms.join(" ")) || reverseName.startsWith(terms.join(" ")))) return 1;
    if (terms.some((term) => normalizedEngagementClubSearch(swimmer.lastName).startsWith(term))) return 2;
    if (terms.every((term) => searchText.includes(term))) return 3;
    return 4;
  }

  function engagementAdminPublicSwimmerItem(row = {}) {
    return {
      ...row,
      id: String(row.id || row.swimmerIndexId || "").trim(),
      swimmerIndexId: String(row.swimmerIndexId || row.id || "").trim(),
      source: row.source || "performances",
      active: row.active !== false,
      status: row.status || "active",
      clubName: row.clubName || row.club || "",
      updatedAt: row.updatedAt || row.latestDate || ""
    };
  }

  async function searchEngagementAdminPublicSwimmers(query = "", limit = 80) {
    const terms = engagementAdminPublicSwimmerSearchTokens(query).slice(0, 5);
    if (!terms.length) return [];
    const shard = engagementAdminPublicSwimmerSearchShard(query);
    const rows = await loadEngagementAdminPublicSwimmerSearchShard(shard);
    const results = rows
      .map(engagementAdminPublicSwimmerItem)
      .filter((swimmer) => {
        const haystack = normalizedEngagementClubSearch(swimmer.searchText || [
          swimmer.firstName,
          swimmer.lastName,
          swimmer.name,
          swimmer.birthDate,
          swimmer.sex,
          swimmer.clubId,
          swimmer.clubName,
          ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
          ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
        ].filter(Boolean).join(" "));
        return terms.every((term) => haystack.includes(term));
      })
      .sort((left, right) =>
        engagementAdminPublicSwimmerScore(left, terms) - engagementAdminPublicSwimmerScore(right, terms) ||
        String(right.latestDate || "").localeCompare(String(left.latestDate || "")) ||
        String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR") ||
        String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR")
      );
    return results.slice(0, limit);
  }

  function mergeEngagementNationalSwimmerResults(rows = []) {
    const byKey = new Map();
    rows.forEach((raw) => {
      const swimmer = engagementAdminPublicSwimmerItem(raw);
      const source = swimmer.source || "performances";
      const stablePerformanceId = Array.isArray(swimmer.sourceIds)
        ? swimmer.sourceIds.find(Boolean)
        : "";
      const key = source === "performances"
        ? `${source}:${stablePerformanceId || swimmer.swimmerId || swimmer.identityKey || swimmer.id || swimmer.swimmerIndexId}`
        : `${source}:${swimmer.id || swimmer.swimmerIndexId}`;
      if (!key.endsWith(":")) {
        const existing = byKey.get(key) || {};
        const merged = { ...existing, ...swimmer };
        ["clubId", "club", "clubName", "latestDate"].forEach((field) => {
          if (!merged[field] && existing[field]) merged[field] = existing[field];
        });
        if (Number(existing.performanceCount || 0) > Number(swimmer.performanceCount || 0)) {
          merged.performanceCount = existing.performanceCount;
        }
        byKey.set(key, merged);
      }
    });
    return Array.from(byKey.values());
  }

  function engagementNationalSwimmerKey(swimmer = {}) {
    return `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId || ""}`;
  }

  function engagementNationalSwimmerByKey(key = "") {
    return engagementNationalSwimmers.find((swimmer) => engagementNationalSwimmerKey(swimmer) === key) || null;
  }

  function engagementNationalSwimmerIdentityKey(swimmer = {}) {
    return String(swimmer.identityKey || [
      normalizedEngagementClubSearch(swimmer.lastName || swimmer.name || ""),
      normalizedEngagementClubSearch(swimmer.firstName || ""),
      swimmer.birthDate || ""
    ].filter(Boolean).join("|")).trim();
  }

  function engagementNationalSwimmerDuplicateAlertLabel(swimmer = {}, swimmers = []) {
    const key = engagementNationalSwimmerKey(swimmer);
    const license = String(swimmer.licenseNumber || "").trim();
    const identity = engagementNationalSwimmerIdentityKey(swimmer);
    const normalizedName = normalizedEngagementClubSearch([swimmer.lastName, swimmer.firstName].filter(Boolean).join(" "));
    const sameLicense = license && swimmers.some((candidate) =>
      engagementNationalSwimmerKey(candidate) !== key &&
      String(candidate.licenseNumber || "").trim() === license
    );
    if (sameLicense) return { score: "high", label: "Même licence" };
    const sameIdentity = identity && swimmers.some((candidate) =>
      engagementNationalSwimmerKey(candidate) !== key &&
      engagementNationalSwimmerIdentityKey(candidate) === identity
    );
    if (sameIdentity) return { score: "high", label: "Même identité" };
    const sameBirthNearName = swimmer.birthDate && normalizedName && swimmers.some((candidate) => {
      if (engagementNationalSwimmerKey(candidate) === key || candidate.birthDate !== swimmer.birthDate) return false;
      const candidateName = normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" "));
      return candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName) ||
        candidateName.split(/\s+/).some((part) => part.length >= 4 && normalizedName.includes(part)));
    });
    if (sameBirthNearName) return { score: "medium", label: "A verifier" };
    return { score: "low", label: "Simple" };
  }

  function selectedEngagementNationalSwimmerMergeKeys() {
    return Array.from(elements.engagementsNationalSwimmersList?.querySelectorAll("[data-engagement-national-swimmer-merge-check]:checked") || [])
      .map((item) => item.value)
      .filter(Boolean);
  }

  function selectedEngagementNationalSwimmerKeepKey() {
    return elements.engagementsNationalSwimmersList?.querySelector("[data-engagement-national-swimmer-keep]:checked")?.value || "";
  }

  function updateEngagementNationalSwimmerSelectionState() {
    if (elements.engagementsNationalSwimmersBulk) elements.engagementsNationalSwimmersBulk.hidden = !engagementNationalSwimmerMergeMode;
    if (elements.engagementsNationalSwimmersMergeMode) {
      elements.engagementsNationalSwimmersMergeMode.setAttribute("aria-pressed", engagementNationalSwimmerMergeMode ? "true" : "false");
      elements.engagementsNationalSwimmersMergeMode.textContent = engagementNationalSwimmerMergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
    }
    const keepKey = selectedEngagementNationalSwimmerKeepKey();
    const mergeKeys = selectedEngagementNationalSwimmerMergeKeys().filter((key) => key !== keepKey);
    if (elements.engagementsNationalSwimmersBulkMerge) {
      elements.engagementsNationalSwimmersBulkMerge.disabled = !keepKey || !mergeKeys.length || engagementNationalSwimmerMergeLoading;
    }
    if (elements.engagementsNationalSwimmersSelectionSummary) {
      const keep = engagementNationalSwimmerByKey(keepKey);
      const keepName = keep ? ([keep.firstName, keep.lastName].filter(Boolean).join(" ") || keep.name || keepKey) : "";
      elements.engagementsNationalSwimmersSelectionSummary.textContent = keepKey && mergeKeys.length
        ? `${mergeKeys.length} fiche${mergeKeys.length > 1 ? "s" : ""} à fusionner vers ${keepName}.`
        : "Choisissez une fiche à conserver et au moins une fiche à fusionner.";
    }
  }

  function setEngagementNationalSwimmerMergeMode(enabled) {
    engagementNationalSwimmerMergeMode = enabled === true;
    if (!engagementNationalSwimmerMergeMode) {
      engagementNationalSwimmerMergeSourceId = "";
      engagementNationalSwimmerMergeTargets = [];
      engagementNationalSwimmerMergeQuery = "";
    }
    renderEngagementNationalSwimmers();
  }

  function selectedEngagementClubSwimmerRows() {
    const swimmerFormRows = Array.from(elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-row]") || []);
    if (!swimmerFormRows.length) {
      const entriesBySwimmer = selectedEngagementClubEntryRowsBySwimmerId();
      return (Array.isArray(selectedEngagementClubEntry?.swimmers) ? selectedEngagementClubEntry.swimmers : [])
        .map((swimmer) => ({
          ...cloneEngagementClubEntry(swimmer),
          individualEntries: entriesBySwimmer.get(swimmer.swimmerIndexId) || cloneEngagementClubEntry(swimmer.individualEntries || []),
          individualEventCodes: (entriesBySwimmer.get(swimmer.swimmerIndexId) || swimmer.individualEntries || [])
            .map((entry) => entry?.eventCode)
            .filter(Boolean)
        }))
        .filter((swimmer) => swimmer.swimmerIndexId);
    }
    return swimmerFormRows
      .map((row) => {
        const checkbox = row.querySelector("[data-engagement-club-swimmer-id]");
        if (!checkbox?.checked) return null;
        const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
        const entriesBySwimmer = selectedEngagementClubEntryRowsBySwimmerId();
        const savedSwimmer = (selectedEngagementClubEntry?.swimmers || []).find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
        const individualEntries = entriesBySwimmer.get(swimmerIndexId) || savedSwimmer.individualEntries || [];
        const licenseField = row.querySelector("[data-engagement-club-swimmer-license]");
        return {
          swimmerIndexId,
          source: checkbox.dataset.engagementClubSwimmerSource || "performances",
          swimmerId: checkbox.dataset.engagementClubSwimmerLivepalmesId || "",
          name: checkbox.dataset.engagementClubSwimmerName || "",
          firstName: checkbox.dataset.engagementClubSwimmerFirstName || "",
          lastName: checkbox.dataset.engagementClubSwimmerLastName || "",
          birthDate: checkbox.dataset.engagementClubSwimmerBirthDate || "",
          sex: checkbox.dataset.engagementClubSwimmerSex || "",
          category: checkbox.dataset.engagementClubSwimmerCategory || "",
          licenseNumber: String(licenseField?.value || licenseField?.dataset.engagementClubSwimmerLicense || "").trim().toUpperCase(),
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
      const savedSwimmer = (selectedEngagementClubEntry?.swimmers || [])
        .find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
      const savedEntryByCode = new Map((savedSwimmer.individualEntries || [])
        .map((entry) => [entry.eventCode, entry])
        .filter(([code]) => code));
      const individualEntries = Array.from(row.querySelectorAll("[data-engagement-club-swimmer-event]:checked"))
        .map((input) => {
          const eventCode = String(input.dataset.engagementClubSwimmerEvent || "").trim();
          const timeInput = Array.from(row.querySelectorAll("[data-engagement-club-swimmer-event-time]"))
            .find((item) => item.dataset.engagementClubSwimmerEventTime === eventCode);
          const manualEntryTime = timeInput && !timeInput.disabled ? String(timeInput.value || "").trim() : "";
          return eventCode ? { ...(savedEntryByCode.get(eventCode) || {}), eventCode, manualEntryTime } : null;
        })
        .filter(Boolean);
      bySwimmerId.set(swimmerIndexId, individualEntries);
    });
    return bySwimmerId;
  }

  function engagementClubIndividualEvents() {
    return (selectedEngagementCompetition?.events || [])
      .filter((event) => event?.type === "individual" && engagementEventDefinition(event.code));
  }

  function engagementClubSelectedIndividualEventCodes(swimmer = {}) {
    const entries = Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : [];
    const directCodes = Array.isArray(swimmer.individualEventCodes) ? swimmer.individualEventCodes : [];
    return new Set([
      ...entries.map((entry) => entry?.eventCode),
      ...directCodes
    ].map((code) => String(code || "").trim()).filter(Boolean));
  }

  function formatEngagementEntryTimeInput(value = "") {
    const text = String(value || "").trim().replace(",", ".").replace(/\s+/g, "");
    if (!text) return "";
    let minutes = 0;
    let seconds = 0;
    let hundredths = 0;
    if (/^\d{1,6}$/.test(text)) {
      const padded = text.padStart(text.length <= 4 ? 4 : 6, "0");
      hundredths = Number(padded.slice(-2));
      seconds = Number(padded.slice(-4, -2));
      minutes = Number(padded.slice(0, -4) || 0);
    } else {
      const match = text.match(/^(?:(\d{1,2}):)?(\d{1,2})\.(\d{1,2})$/);
      if (!match) return "";
      minutes = Number(match[1] || 0);
      seconds = Number(match[2]);
      hundredths = Number(match[3].padEnd(2, "0").slice(0, 2));
    }
    if (seconds >= 60 || minutes > 99 || (minutes === 0 && seconds === 0 && hundredths === 0)) return "";
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  }

  function normalizeEngagementEntryTimeInput(input) {
    if (!input) return true;
    const rawValue = String(input.value || "").trim();
    if (!rawValue) {
      input.setCustomValidity?.("");
      return true;
    }
    const formattedValue = formatEngagementEntryTimeInput(rawValue);
    if (!formattedValue) {
      input.setCustomValidity?.("Saisissez un temps au format MM:SS.CC, par exemple 00:59.12, ou uniquement les chiffres 5912.");
      return false;
    }
    input.value = formattedValue;
    input.setCustomValidity?.("");
    return true;
  }

  function engagementEntryTimeDisplayLabel(entry = {}) {
    if (entry.entryTime) return formatEngagementEntryTimeInput(entry.entryTime) || entry.entryTime;
    return entry.entryTimeMode === "default595999" ? "59:59.99" : "Calcul...";
  }

  function engagementClubSwimmerEventTimesCacheKey(swimmer = {}) {
    return [
      selectedEngagementCompetitionId,
      swimmer.source || "performances",
      swimmer.swimmerIndexId || swimmer.id || ""
    ].join(":");
  }

  function mergeEngagementClubSwimmerEventTimes(swimmerIndexId = "", entries = []) {
    const previewByCode = new Map((Array.isArray(entries) ? entries : [])
      .map((entry) => [entry?.eventCode, entry])
      .filter(([eventCode]) => eventCode));
    if (!swimmerIndexId || !previewByCode.size) return;
    let updatedSwimmer = null;
    const swimmers = selectedEngagementClubSwimmerRows().map((swimmer) => {
      if (swimmer.swimmerIndexId !== swimmerIndexId) return swimmer;
      updatedSwimmer = {
        ...swimmer,
        individualEntries: (swimmer.individualEntries || []).map((entry) => {
          if (entry.entryTimeMode === "manual" && entry.manualEntryTime) return entry;
          const preview = previewByCode.get(entry.eventCode);
          return preview ? { ...entry, ...preview, manualEntryTime: "" } : entry;
        })
      };
      return updatedSwimmer;
    });
    selectedEngagementClubEntry = {
      ...(selectedEngagementClubEntry || {}),
      swimmers
    };
    const entryRow = Array.from(elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
      .find((row) => row.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
    const updatedByCode = new Map((updatedSwimmer?.individualEntries || []).map((entry) => [entry.eventCode, entry]));
    Array.from(entryRow?.querySelectorAll("[data-engagement-club-swimmer-event]:checked") || []).forEach((checkbox) => {
      const eventCode = checkbox.dataset.engagementClubSwimmerEvent || "";
      const choice = checkbox.closest("[data-event-selected]");
      const entry = updatedByCode.get(eventCode);
      const timeValue = choice?.querySelector("[data-engagement-club-entry-cell-time]");
      const editButton = choice?.querySelector("[data-engagement-club-time-edit]");
      if (!entry || !timeValue) return;
      timeValue.textContent = engagementEntryTimeDisplayLabel(entry);
      timeValue.dataset.entryTimeMode = entry.entryTimeMode || "pending";
      timeValue.title = engagementEntryTimeHelpLabel(entry, selectedEngagementCompetition?.missingEntryTimeMode === "manual");
      if (editButton) editButton.dataset.engagementClubTimeAuto = entry.entryTime || "59:59.99";
    });
    updateEngagementClubEntriesSummary();
    renderEngagementClubSummary();
  }

  function markEngagementClubSwimmerEventTimesError(swimmerIndexId = "") {
    const entryRow = Array.from(elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
      .find((row) => row.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
    Array.from(entryRow?.querySelectorAll('[data-engagement-club-entry-cell-time][data-entry-time-mode="pending"]') || [])
      .forEach((timeValue) => {
        timeValue.textContent = "Indisponible";
        timeValue.dataset.entryTimeMode = "error";
      });
  }

  async function flushEngagementClubSwimmerEventTimesBatch() {
    if (engagementClubSwimmerEventTimesBatchTimer) global.clearTimeout(engagementClubSwimmerEventTimesBatchTimer);
    engagementClubSwimmerEventTimesBatchTimer = null;
    const competitionId = selectedEngagementCompetitionId;
    const pending = Array.from(engagementClubSwimmerEventTimesBatch.values());
    engagementClubSwimmerEventTimesBatch.clear();
    if (!competitionId || !pending.length) return;
    try {
      if (engagementClubSelectionChanges.size) await flushEngagementClubSwimmerSelections();
      await engagementClubEntryMutationQueue;
      const result = await callFunction("previewEngagementClubSwimmerEventTimesBatch", {
        competitionId,
        swimmerIndexIds: pending.map((item) => item.swimmerIndexId)
      });
      const resultsById = new Map((Array.isArray(result.swimmers) ? result.swimmers : [])
        .map((item) => [item.swimmerIndexId, Array.isArray(item.individualEntries) ? item.individualEntries : []]));
      pending.forEach((item) => {
        const previewEntries = resultsById.get(item.swimmerIndexId) || [];
        if (selectedEngagementCompetitionId === competitionId) {
          engagementClubSwimmerEventTimesCache.set(item.cacheKey, previewEntries);
          mergeEngagementClubSwimmerEventTimes(item.swimmerIndexId, previewEntries);
        }
        item.resolve();
      });
    } catch (error) {
      pending.forEach((item) => {
        markEngagementClubSwimmerEventTimesError(item.swimmerIndexId);
        item.resolve();
      });
      if (elements.engagementsClubEntriesMessage) {
        elements.engagementsClubEntriesMessage.textContent = `Le temps d'engagement n'a pas pu être calculé : ${error?.message || error}`;
        elements.engagementsClubEntriesMessage.dataset.tone = "error";
      }
    } finally {
      pending.forEach((item) => engagementClubSwimmerEventTimesRequests.delete(item.cacheKey));
    }
  }

  async function ensureEngagementClubSwimmerEventTimes(swimmer = {}) {
    if (engagementCompetitionType(selectedEngagementCompetition) === "openWater") return;
    const swimmerIndexId = swimmer.swimmerIndexId || swimmer.id || "";
    const requestCompetitionId = selectedEngagementCompetitionId;
    const cacheKey = engagementClubSwimmerEventTimesCacheKey(swimmer);
    if (!swimmerIndexId || !selectedEngagementCompetitionId) return;
    if (engagementClubSwimmerEventTimesCache.has(cacheKey)) {
      mergeEngagementClubSwimmerEventTimes(swimmerIndexId, engagementClubSwimmerEventTimesCache.get(cacheKey));
      return;
    }
    if (engagementClubSwimmerEventTimesRequests.has(cacheKey)) {
      await engagementClubSwimmerEventTimesRequests.get(cacheKey);
      return;
    }
    const request = new Promise((resolve) => {
      engagementClubSwimmerEventTimesBatch.set(cacheKey, { cacheKey, swimmerIndexId, resolve });
      if (engagementClubSwimmerEventTimesBatchTimer) global.clearTimeout(engagementClubSwimmerEventTimesBatchTimer);
      engagementClubSwimmerEventTimesBatchTimer = global.setTimeout(() => void flushEngagementClubSwimmerEventTimesBatch(), 80);
    });
    engagementClubSwimmerEventTimesRequests.set(cacheKey, request);
    await request;
  }

  function engagementEntryTimeHelpLabel(entry = {}, manualAllowed = false) {
    const warning = entry.entryTimeWarning ? ` - Alerte : ${entry.entryTimeWarning}` : "";
    if (entry.entryTimeMode === "known") {
      return `${[
        entry.date ? formatShortDate(entry.date) : "",
        entry.location || ""
      ].filter(Boolean).join(" · ")}${warning}`;
    }
    if (entry.entryTimeMode === "manual") return `Temps saisi manuellement${warning}`;
    if (entry.entryTimeMode === "default595999") return `Aucun temps connu${warning}`;
    return "Temps en cours de calcul";
  }

  function engagementClubProgramSessionsForEntries() {
    const events = engagementClubIndividualEvents();
    const eventOptions = events.map((event) => ({
      code: event.code,
      label: event.shortLabel || event.label || event.code,
      type: event.type || "individual"
    }));
    const sessions = normalizedEngagementProgramSessions(selectedEngagementCompetition?.programSessions || [], eventOptions)
      .map((session) => ({
        ...session,
        items: (session.items || []).filter((item) => engagementEventDefinition(item.eventCode)?.type === "individual")
      }))
      .filter((session) => session.items.length);
    if (sessions.length) return sessions;
    return events.length ? [{
      id: "individual-program",
      label: "Programme",
      date: selectedEngagementCompetition?.date || "",
      startTime: "",
      items: events.map((event) => ({ eventCode: event.code, genderMode: "mixed" }))
    }] : [];
  }

  function engagementClubProgramItemAllowsSwimmer(item = {}, swimmer = {}) {
    if (item.genderMode === "female" && swimmer.sex === "M") return false;
    if (item.genderMode === "male" && swimmer.sex === "F") return false;
    const event = engagementClubIndividualEvents().find((candidate) => candidate.code === item.eventCode) || {};
    const restrictions = Array.isArray(event.categoryRestrictions) ? event.categoryRestrictions : [];
    const category = engagementSwimmerCategory(swimmer, selectedEngagementCompetition?.date || "");
    const knownCategory = ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS.some(([code]) => code === category);
    return !restrictions.length || !knownCategory || restrictions.includes(category);
  }

  function engagementClubProgramSessionsForSex(sessions = [], sex = "") {
    return sessions
      .map((session) => ({
        ...session,
        items: (session.items || []).filter((item) => {
          if (sex === "F") return item.genderMode !== "male";
          if (sex === "M") return item.genderMode !== "female";
          return true;
        })
      }))
      .filter((session) => session.items.length);
  }

  function engagementClubProgramItemLabel(item = {}) {
    const event = engagementEventDefinition(item.eventCode) || {};
    const eventOption = engagementClubIndividualEvents().find((candidate) => candidate.code === item.eventCode) || event;
    return {
      short: event.shortLabel || eventOption.shortLabel || item.eventCode,
      gender: engagementProgramGenderModeShortLabel(item.genderMode, item.eventCode, eventOption),
      full: `${event.label || eventOption.label || item.eventCode} - ${engagementProgramGenderModeDisplayLabel(item.genderMode, item.eventCode, eventOption)}`
    };
  }

  function engagementClubEntryRowCountLabel(row) {
    const count = row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length || 0;
    const maxEvents = Number(selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
    return maxEvents > 0 ? `${count}/${maxEvents}` : String(count);
  }

  function updateEngagementClubEntryRowCount(row) {
    const button = row?.querySelector("[data-engagement-club-times-open]");
    if (!button) return;
    const countLabel = engagementClubEntryRowCountLabel(row);
    const count = row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length || 0;
    button.querySelector("span")?.replaceChildren(countLabel);
    button.setAttribute("aria-label", engagementCompetitionType(selectedEngagementCompetition) === "openWater"
      ? `${count} course${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""}`
      : `Voir ou modifier les temps d'engagement, ${count} course${count > 1 ? "s" : ""}`);
  }

  function updateEngagementClubSwimmersSummary() {
    if (!elements.engagementsClubSwimmersSummary) return;
    const selectedRows = currentEngagementClubSwimmersForSummary();
    const selectedCount = selectedRows.length;
    elements.engagementsClubSwimmersSummary.textContent = selectedCount
      ? `${selectedCount} nageur${selectedCount > 1 ? "s" : ""} engagé${selectedCount > 1 ? "s" : ""}.`
      : "Aucun nageur engagé.";
    renderEngagementClubSummary();
  }

  function syncEngagementClubEntriesSaveBar() {
    if (elements.engagementsClubEntriesForm) {
      elements.engagementsClubEntriesForm.dataset.dirty = engagementClubEntriesDirty ? "true" : "false";
    }
    if (elements.engagementsClubEntriesSaveBar) {
      elements.engagementsClubEntriesSaveBar.hidden = !engagementClubEntriesDirty;
    }
    if (elements.engagementsClubEntriesSaveButton) {
      elements.engagementsClubEntriesSaveButton.disabled = !engagementClubEntriesDirty || (engagementClubSwimmersLoading && !engagementClubSwimmersLoaded) || engagementClubWriteLocked();
    }
  }

  function setEngagementClubEntriesDirty(dirty) {
    engagementClubEntriesDirty = Boolean(dirty);
    if (!engagementClubEntriesDirty) engagementClubEntriesDirtySwimmerIds.clear();
    syncEngagementClubEntriesSaveBar();
  }

  function markEngagementClubEntrySwimmerDirty(swimmerIndexId = "") {
    const cleanId = String(swimmerIndexId || "").trim();
    if (cleanId) engagementClubEntriesDirtySwimmerIds.add(cleanId);
    setEngagementClubEntriesDirty(true);
  }

  function setEngagementClubPersistedSwimmers(entry = {}) {
    engagementClubPersistedSwimmerIds = new Set((entry.swimmers || [])
      .map((swimmer) => String(swimmer?.swimmerIndexId || "").trim())
      .filter(Boolean));
  }

  function cloneEngagementClubEntry(entry = {}) {
    return JSON.parse(JSON.stringify(entry || {}));
  }

  function engagementClubWorkspaceScopeKey() {
    const uid = currentAccessProfile?.uid || activeAuthUid || global.firebase?.auth?.().currentUser?.uid || "anonymous";
    const clubId = engagementClubScope(activeEngagementClubProfile(currentAccessProfile || {})) || "none";
    return [uid, clubId].map((part) => encodeURIComponent(String(part || ""))).join(".");
  }

  function engagementClubWorkspaceCacheKey(competitionId, scopeKey = engagementClubWorkspaceScopeKey()) {
    return `${scopeKey}.${encodeURIComponent(String(competitionId || "").trim())}`;
  }

  function readEngagementClubWorkspaceCache(competitionId) {
    const cacheKey = engagementClubWorkspaceCacheKey(competitionId);
    const memoryEntry = engagementClubWorkspaceCache.get(cacheKey);
    if (memoryEntry) return memoryEntry;
    try {
      const stored = JSON.parse(global.sessionStorage?.getItem(`${ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
      if (!stored || stored.version !== 1 || !stored.competition || !stored.entry || !Number(stored.cachedAt)) return null;
      const entry = {
        competition: cloneEngagementClubEntry(stored.competition),
        entry: cloneEngagementClubEntry(stored.entry),
        cachedAt: Number(stored.cachedAt)
      };
      engagementClubWorkspaceCache.set(cacheKey, entry);
      return entry;
    } catch (_) {
      return null;
    }
  }

  function writeEngagementClubWorkspaceCache(competitionId, workspace = {}, cachedAt = Date.now()) {
    const cleanId = String(competitionId || workspace.competition?.id || "").trim();
    if (!cleanId) return null;
    const cacheKey = engagementClubWorkspaceCacheKey(cleanId);
    const current = engagementClubWorkspaceCache.get(cacheKey);
    if (current?.cachedAt && current.cachedAt > cachedAt) return current;
    const entry = {
      competition: cloneEngagementClubEntry(workspace.competition || {}),
      entry: cloneEngagementClubEntry(workspace.entry || {}),
      cachedAt
    };
    engagementClubWorkspaceCache.set(cacheKey, entry);
    try {
      global.sessionStorage?.setItem(`${ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX}${cacheKey}`, JSON.stringify({
        version: 1,
        ...entry
      }));
    } catch (_) {
      // Le cache reste facultatif si le stockage de session est indisponible.
    }
    return entry;
  }

  function clearEngagementClubWorkspaceSessionCaches() {
    engagementClubWorkspaceCache.clear();
    engagementClubWorkspaceRequests.clear();
    try {
      const keys = [];
      for (let index = 0; index < (global.sessionStorage?.length || 0); index += 1) {
        const key = global.sessionStorage?.key(index) || "";
        if (key.startsWith(ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => global.sessionStorage?.removeItem(key));
    } catch (_) {}
  }

  function engagementClubSwimmersCacheKey() {
    return engagementClubWorkspaceScopeKey();
  }

  function readEngagementClubSwimmersCache() {
    try {
      const cacheKey = engagementClubSwimmersCacheKey();
      const stored = JSON.parse(global.sessionStorage?.getItem(`${ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
      if (!stored || stored.version !== 1 || !Array.isArray(stored.swimmers) || !Number(stored.cachedAt)) return null;
      const expectedClubId = engagementClubScope();
      if (expectedClubId && stored.clubId && String(stored.clubId) !== expectedClubId) return null;
      return {
        clubId: String(stored.clubId || expectedClubId || ""),
        swimmers: stored.swimmers.map((swimmer) => ({ ...swimmer })),
        cachedAt: Number(stored.cachedAt)
      };
    } catch (_) {
      return null;
    }
  }

  function writeEngagementClubSwimmersCache(swimmers = engagementClubSwimmers, clubId = engagementClubSwimmersClubId, cachedAt = Date.now()) {
    engagementClubSwimmersCachedAt = cachedAt;
    try {
      global.sessionStorage?.setItem(`${ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${engagementClubSwimmersCacheKey()}`, JSON.stringify({
        version: 1,
        clubId: String(clubId || engagementClubScope() || ""),
        cachedAt,
        swimmers
      }));
    } catch (_) {
      // Le cache reste facultatif si le stockage de session est indisponible.
    }
  }

  function invalidateEngagementClubSwimmersCache() {
    engagementClubSwimmersLoaded = false;
    engagementClubSwimmersCachedAt = 0;
    try {
      global.sessionStorage?.removeItem(`${ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${engagementClubSwimmersCacheKey()}`);
    } catch (_) {}
  }

  function clearEngagementClubSwimmersSessionCaches() {
    engagementClubSwimmersCachedAt = 0;
    engagementClubSwimmersLoadPromise = null;
    try {
      const keys = [];
      for (let index = 0; index < (global.sessionStorage?.length || 0); index += 1) {
        const key = global.sessionStorage?.key(index) || "";
        if (key.startsWith(ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => global.sessionStorage?.removeItem(key));
    } catch (_) {}
  }

  function pendingEngagementClubWorkspaceRequest(competitionId) {
    return engagementClubWorkspaceRequests.get(engagementClubWorkspaceCacheKey(competitionId)) || null;
  }

  function preloadEngagementClubWorkspaces(competitions = []) {
    if (!canUse("engagements.club.manage")) return Promise.resolve([]);
    const candidates = competitions
      .filter((competition) => competition?.id && competition.clubEntryExists === true)
      .sort((left, right) => {
        const priority = (competition) => competition.entryStatus === "open" ? 0 : competition.entryStatus === "upcoming" ? 1 : 2;
        return priority(left) - priority(right) || String(left.date || "").localeCompare(String(right.date || ""));
      })
      .slice(0, ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT);
    const competitionIds = candidates
      .filter((competition) => {
        const cached = readEngagementClubWorkspaceCache(competition.id);
        return !cached?.cachedAt || Date.now() - cached.cachedAt >= ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS;
      })
      .map((competition) => competition.id)
      .filter((competitionId) => !pendingEngagementClubWorkspaceRequest(competitionId));
    if (!competitionIds.length) return Promise.resolve([]);
    const scopeKey = engagementClubWorkspaceScopeKey();
    const requestedAt = Date.now();
    const requestPromise = callFunction("preloadEngagementClubWorkspaces", { competitionIds })
      .then((result) => {
        if (scopeKey !== engagementClubWorkspaceScopeKey()) return [];
        const workspaces = Array.isArray(result.workspaces) ? result.workspaces : [];
        workspaces.forEach((workspace) => {
          writeEngagementClubWorkspaceCache(workspace.competitionId, workspace, requestedAt);
        });
        return workspaces;
      })
      .catch(() => [])
      .finally(() => {
        competitionIds.forEach((competitionId) => {
          const cacheKey = engagementClubWorkspaceCacheKey(competitionId, scopeKey);
          if (engagementClubWorkspaceRequests.get(cacheKey) === requestPromise) {
            engagementClubWorkspaceRequests.delete(cacheKey);
          }
        });
      });
    competitionIds.forEach((competitionId) => {
      engagementClubWorkspaceRequests.set(engagementClubWorkspaceCacheKey(competitionId, scopeKey), requestPromise);
    });
    return requestPromise;
  }

  function scheduleEngagementClubWorkspacePreload(competitions = []) {
    global.setTimeout(() => { void preloadEngagementClubWorkspaces(competitions); }, 0);
  }

  function resetEngagementClubTransientMessages() {
    [
      elements.engagementsClubTeamMessage,
      elements.engagementsClubOfficialsMessage,
      elements.engagementsClubSwimmersMessage,
      elements.engagementsClubEntriesMessage,
      elements.engagementsClubRelaysMessage
    ].filter(Boolean).forEach((message) => {
      message.textContent = "";
      delete message.dataset.tone;
    });
  }

  function rememberEngagementClubPersistedEntry(entry = {}) {
    engagementClubLastPersistedEntry = cloneEngagementClubEntry(entry);
    setEngagementClubPersistedSwimmers(entry);
    if (selectedEngagementCompetitionId && !isEngagementAdminMode() && canUse("engagements.club.manage")) {
      const cached = readEngagementClubWorkspaceCache(selectedEngagementCompetitionId) || {};
      writeEngagementClubWorkspaceCache(selectedEngagementCompetitionId, {
        competition: cloneEngagementClubEntry(selectedEngagementCompetition || cached.competition || {}),
        entry: cloneEngagementClubEntry(entry)
      });
    }
  }

  function captureEngagementClubEntriesViewport() {
    const active = document.activeElement;
    const shell = active?.closest?.(".admin-engagements-club-entries-table-shell")
      || elements.engagementsClubEntriesList?.querySelector(".admin-engagements-club-entries-table-shell");
    if (!shell) return null;
    const row = active?.closest?.("[data-engagement-club-entry-row]");
    return {
      scrollLeft: shell.scrollLeft,
      scrollTop: shell.scrollTop,
      sex: shell.dataset.engagementClubEntriesSex || "",
      swimmerIndexId: row?.dataset.engagementClubEntrySwimmerId || "",
      eventCode: active?.dataset?.engagementClubSwimmerEvent || "",
      timesButton: active?.matches?.("[data-engagement-club-times-open]") === true,
      shellFocused: active === shell
    };
  }

  function restoreEngagementClubEntriesViewport(state = null) {
    if (!state) return;
    const shells = Array.from(elements.engagementsClubEntriesList?.querySelectorAll(".admin-engagements-club-entries-table-shell") || []);
    const shell = shells.find((candidate) => candidate.dataset.engagementClubEntriesSex === state.sex) || shells[0];
    if (!shell) return;
    const row = Array.from(shell.querySelectorAll("[data-engagement-club-entry-row]"))
      .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === state.swimmerIndexId);
    const target = state.eventCode
      ? Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event]") || [])
        .find((candidate) => candidate.dataset.engagementClubSwimmerEvent === state.eventCode)
      : state.timesButton
        ? row?.querySelector("[data-engagement-club-times-open]")
        : state.shellFocused ? shell : null;
    target?.focus?.({ preventScroll: true });
    shell.scrollLeft = state.scrollLeft;
    shell.scrollTop = state.scrollTop;
  }

  function renderEngagementClubMutationResult(entry = {}, renderScope = "all") {
    selectedEngagementClubEntry = entry || {};
    if (renderScope === "entries") {
      const viewport = captureEngagementClubEntriesViewport();
      engagementClubEntriesRenderedCompetitionId = "";
      renderEngagementClubEntries();
      renderEngagementClubSummary();
      restoreEngagementClubEntriesViewport(viewport);
      return;
    }
    renderEngagementClubEntry(selectedEngagementClubEntry);
  }

  function mergeEngagementClubEntryWithLocalSwimmerSelections(entry = {}) {
    const localSelectedSwimmers = selectedEngagementClubSwimmerRows();
    if (!localSelectedSwimmers.length) return entry;
    const swimmers = Array.isArray(entry.swimmers) ? [...entry.swimmers] : [];
    const savedIds = new Set(swimmers.map((swimmer) => swimmer?.swimmerIndexId).filter(Boolean));
    localSelectedSwimmers.forEach((swimmer) => {
      if (!swimmer.swimmerIndexId || savedIds.has(swimmer.swimmerIndexId)) return;
      swimmers.push(swimmer);
      savedIds.add(swimmer.swimmerIndexId);
    });
    return { ...entry, swimmers };
  }

  function queueEngagementClubEntryMutation({ execute, messageElement, loadingMessage, errorPrefix = "Enregistrement impossible", competitionId = selectedEngagementCompetitionId, renderScope = "all", preserveLocalSwimmerSelections = false } = {}) {
    const revision = ++engagementClubEntryMutationRevision;
    setEngagementSaveState("saving");
    if (messageElement) {
      messageElement.textContent = loadingMessage || "Enregistrement...";
      messageElement.dataset.tone = "loading";
    }
    const task = engagementClubEntryMutationQueue.then(async () => {
      try {
        const result = await execute?.();
        if (result?.entry && competitionId === selectedEngagementCompetitionId) rememberEngagementClubPersistedEntry(result.entry);
        if (revision === engagementClubEntryMutationRevision && competitionId === selectedEngagementCompetitionId && result?.entry) {
          setEngagementClubEntriesDirty(false);
          const entryToRender = preserveLocalSwimmerSelections
            ? mergeEngagementClubEntryWithLocalSwimmerSelections(result.entry)
            : result.entry;
          renderEngagementClubMutationResult(entryToRender, renderScope);
        }
        if (messageElement && revision === engagementClubEntryMutationRevision && competitionId === selectedEngagementCompetitionId) {
          messageElement.textContent = "";
          messageElement.dataset.tone = "";
        }
        if (revision === engagementClubEntryMutationRevision && competitionId === selectedEngagementCompetitionId) setEngagementSaveState("saved");
        return true;
      } catch (error) {
        if (revision === engagementClubEntryMutationRevision && competitionId === selectedEngagementCompetitionId && engagementClubLastPersistedEntry) {
          setEngagementClubEntriesDirty(false);
          renderEngagementClubMutationResult(cloneEngagementClubEntry(engagementClubLastPersistedEntry), renderScope);
        }
        if (messageElement && competitionId === selectedEngagementCompetitionId) {
          messageElement.textContent = `${errorPrefix} : ${error?.message || error}`;
          messageElement.dataset.tone = "error";
        }
        if (revision === engagementClubEntryMutationRevision && competitionId === selectedEngagementCompetitionId) setEngagementSaveState("error");
        return false;
      }
    });
    engagementClubEntryMutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  function flushEngagementClubSwimmerSelections() {
    if (engagementClubSelectionTimer) global.clearTimeout(engagementClubSelectionTimer);
    engagementClubSelectionTimer = null;
    const competitionId = engagementClubSelectionCompetitionId;
    const changes = Array.from(engagementClubSelectionChanges.values());
    engagementClubSelectionChanges.clear();
    engagementClubSelectionCompetitionId = "";
    if (!competitionId || !changes.length) return Promise.resolve(false);
    return queueEngagementClubEntryMutation({
      competitionId,
      messageElement: elements.engagementsClubSwimmersMessage,
      loadingMessage: changes.length > 1 ? `Enregistrement de ${changes.length} modifications...` : "Enregistrement du nageur...",
      preserveLocalSwimmerSelections: true,
      execute: () => callFunction("saveEngagementClubSwimmerSelections", { competitionId, changes })
    });
  }

  function persistEngagementClubSwimmerSelection(swimmer = {}, selected = true) {
    const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
    const competitionId = selectedEngagementCompetitionId;
    if (!swimmerIndexId) return Promise.resolve(false);
    setEngagementSaveState("saving");
    if (engagementClubSelectionCompetitionId && engagementClubSelectionCompetitionId !== competitionId) {
      void flushEngagementClubSwimmerSelections();
    }
    engagementClubSelectionCompetitionId = competitionId;
    engagementClubSelectionChanges.set(swimmerIndexId, {
      swimmerIndexId,
      selected,
      swimmer: selected ? swimmer : undefined
    });
    if (engagementClubSelectionTimer) global.clearTimeout(engagementClubSelectionTimer);
    engagementClubSelectionTimer = global.setTimeout(() => void flushEngagementClubSwimmerSelections(), 400);
    return Promise.resolve(true);
  }

  function resetEngagementClubEntriesAutosave() {
    if (engagementClubEntriesAutosaveTimer) global.clearTimeout(engagementClubEntriesAutosaveTimer);
    engagementClubEntriesAutosaveTimer = null;
    engagementClubEntriesAutosaveSwimmers.clear();
    engagementClubEntriesAutosaveCompetitionId = "";
  }

  function discardPendingEngagementClubIndividualEntries(swimmerIndexId = "") {
    const cleanId = String(swimmerIndexId || "").trim();
    if (!cleanId) return;
    engagementClubEntriesAutosaveSwimmers.delete(cleanId);
    if (engagementClubEntriesAutosaveSwimmers.size || !engagementClubEntriesAutosaveTimer) return;
    global.clearTimeout(engagementClubEntriesAutosaveTimer);
    engagementClubEntriesAutosaveTimer = null;
    engagementClubEntriesAutosaveCompetitionId = "";
  }

  function flushEngagementClubIndividualEntriesAutosave() {
    if (engagementClubEntriesAutosaveTimer) global.clearTimeout(engagementClubEntriesAutosaveTimer);
    engagementClubEntriesAutosaveTimer = null;
    const competitionId = engagementClubEntriesAutosaveCompetitionId;
    const swimmers = Array.from(engagementClubEntriesAutosaveSwimmers.values());
    engagementClubEntriesAutosaveSwimmers.clear();
    engagementClubEntriesAutosaveCompetitionId = "";
    if (!competitionId || !swimmers.length || competitionId !== selectedEngagementCompetitionId) return Promise.resolve(false);
    return queueEngagementClubEntryMutation({
      competitionId,
      renderScope: "entries",
      messageElement: elements.engagementsClubEntriesMessage,
      loadingMessage: swimmers.length > 1 ? "Enregistrement des courses..." : "Enregistrement de la course...",
      execute: () => callFunction("saveEngagementClubIndividualEntries", {
        competitionId,
        swimmers
      })
    });
  }

  function persistEngagementClubIndividualEntries(swimmer = {}) {
    const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
    const competitionId = selectedEngagementCompetitionId;
    if (!swimmerIndexId || !competitionId) return Promise.resolve(false);
    setEngagementSaveState("saving");
    if (engagementClubEntriesAutosaveCompetitionId && engagementClubEntriesAutosaveCompetitionId !== competitionId) {
      resetEngagementClubEntriesAutosave();
    }
    markEngagementClubEntrySwimmerDirty(swimmerIndexId);
    engagementClubEntriesAutosaveCompetitionId = competitionId;
    engagementClubEntriesAutosaveSwimmers.set(swimmerIndexId, {
      swimmerIndexId,
      individualEntries: cloneEngagementClubEntry(swimmer.individualEntries || [])
    });
    engagementClubEntryMutationRevision += 1;
    if (elements.engagementsClubEntriesMessage) {
      elements.engagementsClubEntriesMessage.textContent = "Enregistrement des courses...";
      elements.engagementsClubEntriesMessage.dataset.tone = "loading";
    }
    if (engagementClubEntriesAutosaveTimer) global.clearTimeout(engagementClubEntriesAutosaveTimer);
    engagementClubEntriesAutosaveTimer = global.setTimeout(() => {
      void flushEngagementClubIndividualEntriesAutosave();
    }, 500);
    return Promise.resolve(true);
  }

  function engagementClubHasPendingWrites() {
    return Boolean(
      engagementClubSelectionChanges.size ||
      engagementClubEntriesAutosaveSwimmers.size ||
      engagementClubSelectionTimer ||
      engagementClubEntriesAutosaveTimer ||
      engagementClubRelayDialogSaving ||
      elements.engagementsSaveState?.dataset.state === "saving"
    );
  }

  function flushPendingEngagementClubWrites() {
    if (engagementClubSelectionChanges.size) void flushEngagementClubSwimmerSelections();
    if (engagementClubEntriesAutosaveSwimmers.size) void flushEngagementClubIndividualEntriesAutosave();
  }

  function updateEngagementClubEntriesSummary() {
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

  function engagementSeasonEndYearFromDate(dateValue = "") {
    const value = String(dateValue || "").trim();
    const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (!match) return engagementSeasonEndYear();
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return engagementSeasonEndYear();
    return month >= 9 ? year + 1 : year;
  }

  function engagementSwimmerCategory(swimmer = {}, competitionDate = "") {
    if (swimmer.category) return String(swimmer.category);
    const birthYear = Number(String(swimmer.birthDate || "").slice(0, 4));
    if (!Number.isFinite(birthYear) || birthYear < 1900) return "";
    const age = engagementSeasonEndYearFromDate(competitionDate) - birthYear;
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

  function engagementSwimmerLicenseStatusLabel(swimmer = {}, selected = {}) {
    const licenseNumber = selected.licenseNumber || swimmer.licenseNumber || "";
    if (!licenseNumber) return "";
    const verificationStatus = swimmer.licenseVerificationStatus || selected.licenseVerificationStatus || "";
    const seasonStatus = swimmer.licenseSeasonStatus || selected.licenseSeasonStatus || "";
    const verificationLabel = {
      verified: "",
      pending: "À vérifier",
      rejected: "Rejetée",
      conflict: "Conflit"
    }[verificationStatus] || "";
    const seasonLabel = {
      to_check: "Saison à contrôler",
      valid: "Saison valide",
      invalid: "Saison invalide"
    }[seasonStatus] || "";
    return [verificationLabel, seasonLabel].filter(Boolean).join(" · ");
  }

  function engagementSwimmerLicenseStatusIndicator(swimmer = {}, selected = {}) {
    const licenseNumber = selected.licenseNumber || swimmer.licenseNumber || "";
    if (!licenseNumber) return "";
    const verificationStatus = swimmer.licenseVerificationStatus || selected.licenseVerificationStatus || "";
    const seasonStatus = swimmer.licenseSeasonStatus || selected.licenseSeasonStatus || "";
    const requiresAttention = ["pending", "rejected", "conflict"].includes(verificationStatus) || ["to_check", "invalid"].includes(seasonStatus);
    const label = requiresAttention
      ? engagementSwimmerLicenseStatusLabel(swimmer, selected)
      : "Licence et saison vérifiées";
    return `<span class="admin-engagements-club-swimmer-license-status" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${requiresAttention ? "!" : "✓"}</span>`;
  }

  function setEngagementClubSwimmerRowExpanded(row, expanded) {
    if (!row) return;
    const open = expanded === true;
    row.dataset.expanded = open ? "true" : "false";
    const button = row.querySelector("[data-engagement-club-swimmer-details-toggle]");
    if (button) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.setAttribute("aria-label", `${open ? "Masquer" : "Afficher"} le détail de ${button.dataset.engagementClubSwimmerDetailsName || "ce nageur"}`);
      button.textContent = open ? "−" : "+";
    }
  }

  function engagementSwimmerDisplayName(swimmer = {}, fallback = "Nageur") {
    return [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ") || swimmer.name || fallback;
  }

  function compareEngagementSwimmersByName(left = {}, right = {}) {
    return String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr", { sensitivity: "base", numeric: true }) ||
      String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr", { sensitivity: "base", numeric: true });
  }

  function compareEngagementSwimmersBySexAndName(left = {}, right = {}) {
    const sexRank = (value) => String(value || "").toUpperCase() === "F" ? 0 : String(value || "").toUpperCase() === "M" ? 1 : 2;
    return sexRank(left.sex) - sexRank(right.sex) ||
      compareEngagementSwimmersByName(left, right);
  }

  function engagementPublicSwimmerProfileUrl(swimmer = {}, name = engagementSwimmerDisplayName(swimmer)) {
    const params = new URLSearchParams();
    const swimmerId = String(swimmer.swimmerId || swimmer.id || swimmer.swimmerIndexId || "").trim();
    if (swimmerId) {
      params.set("id", swimmerId);
    } else {
      params.set("name", name);
      if (swimmer.birthDate) params.set("birth", swimmer.birthDate);
      if (swimmer.sex) params.set("sex", swimmer.sex);
    }
    return `performances/nageur.html?${params.toString()}`;
  }

  function engagementClubSwimmerIsActive(swimmer = {}) {
    return String(swimmer.clubActivityStatus || "active").trim().toLowerCase() !== "inactive";
  }

  function renderEngagementClubSwimmersDirectory() {
    const mount = elements.engagementsClubSwimmersDirectoryList;
    if (!mount) return;
    elements.engagementsClubSwimmersDirectorySexFilter?.querySelectorAll("[data-engagement-club-swimmer-sex-filter]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.engagementClubSwimmerSexFilter === engagementClubSwimmersDirectorySexFilter));
    });
    const clubLabel = clubDisplayLabel(currentAccessProfile || {}, { fallback: "votre club" });
    if (engagementClubSwimmersLoading && !engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = `Lecture de la base nageurs pour ${clubLabel}...`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
      }
      return;
    }
    if (!engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Les nageurs seront chargés à l’ouverture de cette page.</p>';
      return;
    }
    const query = normalizedEngagementClubSearch(elements.engagementsClubSwimmersDirectorySearch?.value || "");
    if (elements.engagementsClubSwimmersDirectorySearchClear) {
      elements.engagementsClubSwimmersDirectorySearchClear.hidden = !String(elements.engagementsClubSwimmersDirectorySearch?.value || "").length;
    }
    const swimmers = engagementClubSwimmers
      .filter((swimmer) =>
        (!query || engagementClubSwimmerSearchText(swimmer).includes(query)) &&
        (engagementClubSwimmersDirectorySexFilter === "all" || String(swimmer.sex || "").trim().toUpperCase() === engagementClubSwimmersDirectorySexFilter)
      )
      .sort((left, right) =>
        Number(engagementClubSwimmerIsActive(right)) - Number(engagementClubSwimmerIsActive(left)) ||
        String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr", { sensitivity: "base" }) ||
        String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr", { sensitivity: "base" })
      )
      .slice(0, 800);
    const activeCount = swimmers.filter(engagementClubSwimmerIsActive).length;
    const inactiveCount = swimmers.length - activeCount;
    const hiddenCount = Math.max(0, engagementClubSwimmers.length - swimmers.length);
    if (elements.engagementsClubSwimmersDirectoryStatus) {
      elements.engagementsClubSwimmersDirectoryStatus.textContent = "";
      elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "neutral";
    }
    if (!swimmers.length) {
      mount.innerHTML = engagementClubSwimmers.length
        ? '<p class="admin-engagements-empty">Aucun nageur ne correspond aux filtres.</p>'
        : "<p class=\"admin-engagements-empty\">Aucun nageur trouvé dans l'effectif du club.</p>";
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
          <span role="columnheader">Action</span>
        </div>
        ${swimmers.map((swimmer, index) => {
      const name = engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
      const category = engagementSwimmerCategory(swimmer);
      const sex = String(swimmer.sex || "").trim().toUpperCase();
      const sexLabel = sex === "F" ? "Femme" : (sex === "M" ? "Homme" : "Sexe non renseigné");
      const sexDisplay = sex === "M" ? "H" : (sex || "-");
      const detailsId = `adminEngagementsClubSwimmerDirectoryDetails${index}`;
      const publicProfileUrl = engagementPublicSwimmerProfileUrl(swimmer, name);
      const changePending = swimmer.changeRequestStatus === "pending";
      const profileButton = `
        <button class="admin-engagements-club-swimmers-directory-name-button" type="button" title="Voir la fiche publique de ${escapeHtml(name)}" aria-label="Voir la fiche publique de ${escapeHtml(name)}" data-engagement-club-swimmer-public-profile="${escapeHtml(publicProfileUrl)}" data-engagement-club-swimmer-public-name="${escapeHtml(name)}">
          <strong>${escapeHtml(name)}</strong>
          <svg class="admin-engagements-club-swimmers-directory-profile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-7 7"></path><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"></path></svg>
        </button>`;
      const correctionAction = changePending
        ? '<span class="admin-engagements-club-swimmers-directory-change-pending" aria-label="Correction en attente"><span class="admin-engagements-club-swimmers-directory-change-pending-long">Correction en attente</span><span class="admin-engagements-club-swimmers-directory-change-pending-short" aria-hidden="true">En attente</span></span>'
        : `<button class="admin-engagements-club-swimmers-directory-edit-button" type="button" title="Demander une correction pour ${escapeHtml(name)}" aria-label="Demander une correction pour ${escapeHtml(name)}" data-engagement-club-swimmer-change="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-change-source="${escapeHtml(swimmer.source || "performances")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4"></path></svg></button>`;
      const deletionAction = swimmer.source === "engagement"
        ? `<button class="admin-engagements-club-swimmers-directory-delete-button" type="button" title="Demander la suppression de ${escapeHtml(name)}" aria-label="Demander la suppression de ${escapeHtml(name)}" data-engagement-club-swimmer-delete="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-delete-name="${escapeHtml(name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"></path></svg></button>`
        : "";
      const isActive = engagementClubSwimmerIsActive(swimmer);
      const nextActivityStatus = isActive ? "inactive" : "active";
      const activityAction = `<button class="admin-engagements-club-swimmers-directory-activity-button" type="button" title="Profil ${isActive ? "actif — cliquer pour rendre inactif" : "inactif — cliquer pour rendre actif"} : ${escapeHtml(name)}" aria-label="Profil ${isActive ? "actif" : "inactif"} de ${escapeHtml(name)}, ${isActive ? "rendre inactif" : "rendre actif"}" data-engagement-club-swimmer-activity="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-activity-source="${escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-activity-status="${nextActivityStatus}" data-engagement-club-swimmer-activity-name="${escapeHtml(name)}" data-engagement-club-swimmer-activity-sex="${escapeHtml(sex)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9"></path><path d="M6.7 5.7a8 8 0 1 0 10.6 0"></path></svg><span>${isActive ? "Actif" : "Inactif"}</span></button>`;
      const activitySeparator = index === 0 && activeCount
        ? `<div class="admin-engagements-club-swimmers-directory-activity-separator" role="row"><strong>Actifs</strong><span>${activeCount}</span></div>`
        : index === activeCount && inactiveCount
          ? `<button class="admin-engagements-club-swimmers-directory-activity-separator admin-engagements-club-inactive-toggle" type="button" role="row" data-engagement-club-directory-inactive-toggle aria-expanded="${engagementClubInactiveSwimmersDirectoryExpanded}"><strong>Nageurs inactifs</strong><span>${inactiveCount}</span><i aria-hidden="true"></i></button>`
          : "";
      return `
        ${activitySeparator}
        <div class="admin-engagements-club-swimmers-directory-row" role="row" data-sex="${escapeHtml(sex)}" data-activity-status="${isActive ? "active" : "inactive"}" data-expanded="false" ${!isActive && !engagementClubInactiveSwimmersDirectoryExpanded ? "hidden" : ""}>
          <div class="admin-engagements-club-swimmers-directory-toggle">
            ${profileButton}
            <span class="admin-engagements-club-swimmers-directory-toggle-meta">
              <span class="admin-engagements-club-swimmers-directory-sex-category" aria-label="${escapeHtml(sexLabel)}, catégorie ${escapeHtml(category || "non renseignée")}"><span class="admin-engagements-club-swimmers-directory-sex">${escapeHtml(sexDisplay)}</span><span aria-hidden="true">·</span><span class="admin-engagements-club-swimmers-directory-category">${escapeHtml(category || "-")}</span></span>
              <span class="admin-engagements-club-swimmers-directory-mobile-actions">${activityAction}${correctionAction}${deletionAction}</span>
              <button class="admin-engagements-club-swimmers-directory-details-button" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${escapeHtml(name)}" data-engagement-club-swimmer-directory-toggle>
                <span class="admin-engagements-club-swimmers-directory-chevron" aria-hidden="true">›</span>
              </button>
            </span>
          </div>
          <div id="${detailsId}" class="admin-engagements-club-swimmers-directory-details">
            <span role="cell">${profileButton}</span>
            <span role="cell">${escapeHtml(swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "-")}</span>
            <span role="cell">${escapeHtml(swimmer.sex || "-")}</span>
            <span role="cell" title="${escapeHtml(engagementCategoryLabel(category) || "-")}">${escapeHtml(category || "-")}</span>
            <span role="cell">${swimmer.licenseNumber
              ? escapeHtml(swimmer.licenseNumber)
              : '<span class="admin-engagements-club-swimmers-directory-license-missing">Licence à renseigner</span>'}</span>
            <span role="cell" class="admin-engagements-club-swimmers-directory-actions">
              ${activityAction}${correctionAction}${deletionAction}
            </span>
          </div>
        </div>
      `;
    }).join("")}
      </div>
      ${hiddenCount ? `<p class="admin-engagements-empty">${hiddenCount} nageur${hiddenCount > 1 ? "s" : ""} masque${hiddenCount > 1 ? "s" : ""} par les filtres ou la limite d'affichage.</p>` : ""}
    `;
  }

  async function setEngagementClubSwimmerActivityStatus(swimmerId, source, status, swimmerName = "ce nageur", swimmerSex = "") {
    const cleanId = String(swimmerId || "").trim();
    const cleanStatus = status === "inactive" ? "inactive" : "active";
    if (!cleanId || !canUse("engagements.club.manage")) return;
    const subject = String(swimmerSex || "").toUpperCase() === "F"
      ? "Elle"
      : String(swimmerSex || "").toUpperCase() === "M" ? "Il" : "Cette personne";
    if (cleanStatus === "inactive" && !global.confirm(`Rendre ${swimmerName} inactif ? ${subject} n'apparaîtra plus spontanément dans les sélections d'engagement.`)) return;
    if (elements.engagementsClubSwimmersDirectoryStatus) {
      elements.engagementsClubSwimmersDirectoryStatus.textContent = `Mise à jour du statut de ${swimmerName}...`;
      elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("setEngagementClubSwimmerActivityStatus", {
        swimmerIndexId: cleanId,
        source: source || "performances",
        status: cleanStatus
      });
      const swimmerIndex = engagementClubSwimmers.findIndex((item) =>
        (item.source || "performances") === (source || "performances") &&
        (item.id === cleanId || item.swimmerIndexId === cleanId)
      );
      if (swimmerIndex >= 0) {
        engagementClubSwimmers[swimmerIndex] = {
          ...engagementClubSwimmers[swimmerIndex],
          ...(result.swimmer || {}),
          clubActivityStatus: cleanStatus
        };
        writeEngagementClubSwimmersCache();
      }
      renderEngagementClubSwimmersDirectory();
      renderEngagementClubSwimmers();
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = `${swimmerName} est maintenant ${cleanStatus === "active" ? "actif" : "inactif"}.`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = `Mise à jour impossible : ${error?.message || error}`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
      }
    }
  }

  async function requestEngagementClubSwimmerDeletion(swimmerId, swimmerName = "ce nageur") {
    const cleanId = String(swimmerId || "").trim();
    if (!cleanId || !canUse("engagements.club.manage")) return;
    if (!global.confirm(`Demander la suppression de ${swimmerName} ? La fiche sera supprimée immédiatement si elle n'est utilisée nulle part. Sinon, elle sera désactivée et transmise au niveau national.`)) return;
    if (elements.engagementsClubSwimmersDirectoryStatus) {
      elements.engagementsClubSwimmersDirectoryStatus.textContent = "Vérification des performances et engagements...";
      elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("requestEngagementClubSwimmerDeletion", { swimmerId: cleanId });
      invalidateEngagementClubSwimmersCache();
      await loadEngagementClubSwimmers({ force: true, silent: true });
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = result.deleted
          ? `${swimmerName} a été supprimé définitivement : aucune performance ni inscription ne le référençait.`
          : `${swimmerName} a été désactivé. Une demande avec le détail des utilisations a été transmise au niveau national.`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubSwimmersDirectoryStatus) {
        elements.engagementsClubSwimmersDirectoryStatus.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
      }
    }
  }

  function renderEngagementClubSelectedSwimmersPreview(mount, selectedById) {
    const swimmers = Array.from(selectedById.entries())
      .map(([id, swimmer]) => ({ ...swimmer, id, swimmerIndexId: id }))
      .sort(compareEngagementSwimmersBySexAndName);
    if (!swimmers.length) {
      mount.innerHTML = "";
      return;
    }
    mount.innerHTML = `
      <section class="admin-engagements-club-swimmers-section">
        <h5>Nageurs engagés <span>${swimmers.length}</span></h5>
        <div class="admin-engagements-club-swimmers-table" role="table" aria-label="Nageurs engagés">
          <div class="admin-engagements-club-swimmers-head" role="row">
            <span role="columnheader">Nageur</span><span role="columnheader">Naissance</span><span role="columnheader">Sexe</span><span role="columnheader">Cat.</span><span role="columnheader">Licence</span>
          </div>
          ${swimmers.map((swimmer, index) => {
            const name = engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
            const licenseNumber = swimmer.licenseNumber || "";
            const category = engagementSwimmerCategory(swimmer, selectedEngagementCompetition?.date || "");
            const detailsId = `adminEngagementsClubSelectedSwimmerDetails${index}`;
            return `
              <div class="admin-engagements-club-swimmer-row" role="row" data-engagement-club-swimmer-row data-selected="true" data-expanded="false" data-sex="${escapeHtml(swimmer.sex || "")}">
                <label role="cell">
                  <input type="checkbox" data-engagement-club-swimmer-id="${escapeHtml(swimmer.id)}" data-engagement-club-swimmer-source="${escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-livepalmes-id="${escapeHtml(swimmer.swimmerId || "")}" data-engagement-club-swimmer-name="${escapeHtml(name)}" data-engagement-club-swimmer-first-name="${escapeHtml(swimmer.firstName || "")}" data-engagement-club-swimmer-last-name="${escapeHtml(swimmer.lastName || "")}" data-engagement-club-swimmer-birth-date="${escapeHtml(swimmer.birthDate || "")}" data-engagement-club-swimmer-sex="${escapeHtml(swimmer.sex || "")}" data-engagement-club-swimmer-category="${escapeHtml(category)}" checked>
                  <strong>${escapeHtml(name)}</strong>
                </label>
                <span class="admin-engagements-club-swimmer-mobile-meta" aria-hidden="true"><b>${escapeHtml(swimmer.sex || "-")}</b><b>${escapeHtml(category || "-")}</b></span>
                <button class="admin-engagements-club-swimmer-details-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${escapeHtml(name)}" data-engagement-club-swimmer-details-toggle data-engagement-club-swimmer-details-name="${escapeHtml(name)}">+</button>
                <div id="${detailsId}" class="admin-engagements-club-swimmer-details">
                  <span role="cell" data-label="Naissance">${escapeHtml(swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "-")}</span>
                  <span role="cell" data-label="Sexe">${escapeHtml(swimmer.sex || "-")}</span>
                  <span role="cell" data-label="Catégorie">${escapeHtml(category || "-")}</span>
                  <div class="admin-engagements-club-swimmer-license-cell" role="cell" data-label="Licence" aria-label="Numéro de licence">
                    ${licenseNumber ? `<span class="admin-engagements-club-swimmer-license-value" data-engagement-club-swimmer-license="${escapeHtml(licenseNumber)}">${escapeHtml(licenseNumber)}</span>` : `<input type="text" maxlength="60" pattern="[A-Za-z]-[0-9]{2}-[0-9]+" placeholder="A-12-34567" aria-label="Numéro de licence, format A-12-34567" data-engagement-club-swimmer-license>`}
                    ${engagementSwimmerLicenseStatusIndicator(swimmer, swimmer)}
                  </div>
                </div>
              </div>`;
          }).join("")}
        </div>
      </section>`;
  }

  function renderEngagementClubSwimmers() {
    const mount = elements.engagementsClubSwimmersList;
    const selectedMount = elements.engagementsClubSelectedSwimmersList;
    if (!mount || !selectedMount) return;
    const canPreserveDraft = engagementClubSwimmersRenderedCompetitionId === selectedEngagementCompetitionId;
    const writeLockReason = engagementClubWriteLockReason();
    const locked = Boolean(writeLockReason || !engagementClubTeamComplete());
    if (elements.engagementsClubSwimmersForm) elements.engagementsClubSwimmersForm.dataset.locked = locked ? "true" : "false";
    if (elements.engagementsClubSwimmersSaveButton) elements.engagementsClubSwimmersSaveButton.disabled = locked || (engagementClubSwimmersLoading && !engagementClubSwimmersLoaded);
    if (elements.engagementsClubNewSwimmerSaveButton) elements.engagementsClubNewSwimmerSaveButton.disabled = Boolean(writeLockReason);
    if (elements.engagementsClubNewSwimmerDialogOpen) elements.engagementsClubNewSwimmerDialogOpen.disabled = Boolean(writeLockReason);
    const selectedById = new Map((selectedEngagementClubEntry?.swimmers || [])
      .map((swimmer) => [swimmer.swimmerIndexId, swimmer])
      .filter(([id]) => id));
    (canPreserveDraft ? selectedEngagementClubSwimmerRows() : []).forEach((swimmer) => {
      selectedById.set(swimmer.swimmerIndexId, {
        ...(selectedById.get(swimmer.swimmerIndexId) || {}),
        swimmerIndexId: swimmer.swimmerIndexId,
        source: swimmer.source || "performances",
        licenseNumber: swimmer.licenseNumber,
        individualEntries: swimmer.individualEntries || (swimmer.individualEventCodes || []).map((eventCode) => ({ eventCode }))
      });
    });
    if (locked) {
      selectedMount.innerHTML = "";
      mount.innerHTML = `<p class="admin-engagements-empty">${escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
      engagementClubSwimmersRenderedCompetitionId = selectedEngagementCompetitionId;
      updateEngagementClubSwimmersSummary();
      return;
    }
    if (engagementClubSwimmersLoading && !engagementClubSwimmersLoaded) {
      renderEngagementClubSelectedSwimmersPreview(selectedMount, selectedById);
      mount.innerHTML = '<p class="admin-engagements-empty">Préparation de la recherche des nageurs...</p>';
      engagementClubSwimmersRenderedCompetitionId = selectedEngagementCompetitionId;
      updateEngagementClubSwimmersSummary();
      return;
    }
    if (!engagementClubSwimmersLoaded) {
      renderEngagementClubSelectedSwimmersPreview(selectedMount, selectedById);
      mount.innerHTML = '<p class="admin-engagements-empty">Ouvrez l\'onglet Nageurs pour charger la base du club.</p>';
      engagementClubSwimmersRenderedCompetitionId = selectedEngagementCompetitionId;
      updateEngagementClubSwimmersSummary();
      return;
    }
    const renderedSwimmerIds = new Set(Array.from(canPreserveDraft ? elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]") || [] : [])
      .map((input) => input.dataset.engagementClubSwimmerId || "")
      .filter(Boolean));
    const currentSelectedRows = canPreserveDraft ? selectedEngagementClubSwimmerRows() : [];
    const currentSelectedIds = new Set(currentSelectedRows.map((swimmer) => swimmer.swimmerIndexId).filter(Boolean));
    const query = normalizedEngagementClubSearch(elements.engagementsClubSwimmersSearch?.value || "");
    renderedSwimmerIds.forEach((id) => {
      if (!currentSelectedIds.has(id)) selectedById.delete(id);
    });
    currentSelectedRows.forEach((swimmer) => {
      selectedById.set(swimmer.swimmerIndexId, {
        ...(selectedById.get(swimmer.swimmerIndexId) || {}),
        swimmerIndexId: swimmer.swimmerIndexId,
        source: swimmer.source || "performances",
        licenseNumber: swimmer.licenseNumber,
        individualEntries: swimmer.individualEntries || (swimmer.individualEventCodes || []).map((eventCode) => ({ eventCode }))
      });
    });
    const selectedIds = new Set(selectedById.keys());
    const visibleAvailableLimit = query ? 50 : 800;
    const availableSexMatches = (swimmer) =>
      engagementClubAvailableSwimmersSexFilter === "all" ||
      String(swimmer.sex || "").trim().toUpperCase() === engagementClubAvailableSwimmersSexFilter;
    const compareAvailableSwimmers = engagementClubAvailableSwimmersSexFilter === "all"
      ? compareEngagementSwimmersByName
      : compareEngagementSwimmersBySexAndName;
    const swimmers = engagementClubSwimmers
      .filter((swimmer) => selectedIds.has(swimmer.id) || (availableSexMatches(swimmer) && (query
        ? engagementClubSwimmerSearchText(swimmer).includes(query)
        : engagementClubSwimmerIsActive(swimmer))))
      .sort((left, right) =>
        Number(selectedIds.has(right.id)) - Number(selectedIds.has(left.id)) ||
        compareAvailableSwimmers(left, right)
      )
      .slice(0, visibleAvailableLimit + selectedIds.size);
    const renderSwimmerRow = (swimmer, index) => {
      const selected = selectedById.get(swimmer.id);
      const licenseNumber = selected?.licenseNumber || swimmer.licenseNumber || "";
      const licenseLocked = Boolean(swimmer.licenseNumber || swimmer.licenseLocked);
      const name = engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
      const category = engagementSwimmerCategory({
        ...swimmer,
        ...(selected || {}),
        category: selected?.category || swimmer.category || "",
        birthDate: selected?.birthDate || swimmer.birthDate || ""
      }, selectedEngagementCompetition?.date || "");
      const detailsId = `adminEngagementsClubSwimmerDetails${String(swimmer.id || index).replace(/[^A-Za-z0-9_-]/g, "")}`;
      return `
        <div class="admin-engagements-club-swimmer-row" role="row" data-engagement-club-swimmer-row data-selected="${selected ? "true" : "false"}" data-expanded="false" data-sex="${escapeHtml(swimmer.sex || "")}">
          <label role="cell">
            <input type="checkbox" data-engagement-club-swimmer-id="${escapeHtml(swimmer.id)}" data-engagement-club-swimmer-source="${escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-livepalmes-id="${escapeHtml(swimmer.swimmerId || "")}" data-engagement-club-swimmer-name="${escapeHtml(name)}" data-engagement-club-swimmer-first-name="${escapeHtml(swimmer.firstName || "")}" data-engagement-club-swimmer-last-name="${escapeHtml(swimmer.lastName || "")}" data-engagement-club-swimmer-birth-date="${escapeHtml(swimmer.birthDate || "")}" data-engagement-club-swimmer-sex="${escapeHtml(swimmer.sex || "")}" data-engagement-club-swimmer-category="${escapeHtml(category)}" ${selected ? "checked" : ""}>
            <strong>${escapeHtml(name)}</strong>
          </label>
          <span class="admin-engagements-club-swimmer-mobile-meta" aria-hidden="true"><b>${escapeHtml(swimmer.sex || "-")}</b><b>${escapeHtml(category || "-")}</b></span>
          <button class="admin-engagements-club-swimmer-details-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${escapeHtml(name)}" data-engagement-club-swimmer-details-toggle data-engagement-club-swimmer-details-name="${escapeHtml(name)}">+</button>
          <div id="${detailsId}" class="admin-engagements-club-swimmer-details">
            <span role="cell" data-label="Naissance">${escapeHtml(swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "-")}</span>
            <span role="cell" data-label="Sexe">${escapeHtml(swimmer.sex || "-")}</span>
            <span role="cell" data-label="Catégorie">${escapeHtml(category || "-")}</span>
              <div class="admin-engagements-club-swimmer-license-cell" role="cell" data-label="Licence" aria-label="Numéro de licence">
              ${licenseLocked
                ? `<span class="admin-engagements-club-swimmer-license-value" data-engagement-club-swimmer-license="${escapeHtml(licenseNumber)}">${escapeHtml(licenseNumber)}</span>`
                  : `<input type="text" maxlength="60" inputmode="text" autocapitalize="characters" autocomplete="off" pattern="[A-Za-z]-[0-9]{2}-[0-9]+" placeholder="A-12-34567" title="Une lettre, un tiret, deux chiffres, un tiret, puis des chiffres" aria-label="Numéro de licence, format A-12-34567" data-engagement-club-swimmer-license value="${escapeHtml(licenseNumber)}" ${selected && ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE ? "required" : ""}>`}
              ${engagementSwimmerLicenseStatusIndicator(swimmer, selected || {})}
            </div>
          </div>
        </div>
      `;
    };
    const renderSwimmerSectionHead = (rows, label, { showCount = false, showSexFilter = false } = {}) => `
      <div class="admin-engagements-club-swimmers-section-head">
        <h5>${escapeHtml(label)}${showCount ? ` <span>${rows.length}</span>` : ""}</h5>
        ${showSexFilter ? `<div class="admin-engagements-club-swimmers-sex-filter" role="group" aria-label="Filtrer les nageurs actifs par sexe">
          <button type="button" data-engagement-club-available-swimmer-sex-filter="all" aria-pressed="${engagementClubAvailableSwimmersSexFilter === "all"}">Tous</button>
          <button type="button" data-engagement-club-available-swimmer-sex-filter="F" aria-pressed="${engagementClubAvailableSwimmersSexFilter === "F"}">Femmes</button>
          <button type="button" data-engagement-club-available-swimmer-sex-filter="M" aria-pressed="${engagementClubAvailableSwimmersSexFilter === "M"}">Hommes</button>
        </div>` : ""}
      </div>`;
    const renderSwimmerTable = (rows, label, options = {}) => `
      <section class="admin-engagements-club-swimmers-section">
        ${options.hideSectionHead ? "" : renderSwimmerSectionHead(rows, label, options)}
        <div class="admin-engagements-club-swimmers-table" role="table" aria-label="${escapeHtml(label)}">
          <div class="admin-engagements-club-swimmers-head" role="row">
            <span role="columnheader">Nageur</span>
            <span role="columnheader">Naissance</span>
            <span role="columnheader">Sexe</span>
            <span role="columnheader">Cat.</span>
            <span role="columnheader">Licence</span>
          </div>
          ${rows.map(renderSwimmerRow).join("")}
        </div>
      </section>
    `;
    const selectedSwimmers = [
      ...swimmers.filter((swimmer) => selectedIds.has(swimmer.id)),
      ...Array.from(selectedById.entries())
        .filter(([id]) => !swimmers.some((swimmer) => swimmer.id === id))
        .map(([id, swimmer]) => ({ ...swimmer, id, swimmerIndexId: id }))
    ].sort(compareEngagementSwimmersBySexAndName);
    const availableMatches = engagementClubSwimmers
      .filter((swimmer) => !selectedIds.has(swimmer.id))
      .filter(availableSexMatches)
      .filter((swimmer) => !query || engagementClubSwimmerSearchText(swimmer).includes(query));
    const activeAvailableMatches = availableMatches.filter(engagementClubSwimmerIsActive);
    const inactiveAvailableMatches = availableMatches.filter((swimmer) => !engagementClubSwimmerIsActive(swimmer));
    const availableSwimmers = (query ? availableMatches : activeAvailableMatches)
      .sort(compareAvailableSwimmers)
      .slice(0, visibleAvailableLimit);
    const inactiveAvailableSwimmers = !query && engagementClubInactiveSwimmersExpanded
      ? inactiveAvailableMatches.sort(compareAvailableSwimmers).slice(0, visibleAvailableLimit)
      : [];
    const hiddenAvailableCount = Math.max(0, (query ? availableMatches : activeAvailableMatches).length - availableSwimmers.length);
    const hiddenInactiveCount = Math.max(0, inactiveAvailableMatches.length - inactiveAvailableSwimmers.length);
    selectedMount.innerHTML = selectedSwimmers.length
      ? renderSwimmerTable(selectedSwimmers, "Nageurs engagés", { showCount: true })
      : "";
    const inactiveAccordion = !query && inactiveAvailableMatches.length
      ? `<section class="admin-engagements-club-swimmers-inactive">
          <button type="button" class="admin-engagements-club-inactive-toggle" data-engagement-club-inactive-swimmers-toggle aria-expanded="${engagementClubInactiveSwimmersExpanded}" aria-controls="adminEngagementsClubInactiveSwimmers">
            <strong>Nageurs inactifs</strong><span>${inactiveAvailableMatches.length}</span><i aria-hidden="true"></i>
          </button>
          <div id="adminEngagementsClubInactiveSwimmers" ${engagementClubInactiveSwimmersExpanded ? "" : "hidden"}>
            ${renderSwimmerTable(inactiveAvailableSwimmers, "Nageurs inactifs", { hideSectionHead: true })}
            ${hiddenInactiveCount ? '<p class="admin-engagements-empty">Affinez votre recherche pour afficher les autres nageurs inactifs.</p>' : ""}
          </div>
        </section>`
      : "";
    mount.innerHTML = availableSwimmers.length
      ? `${renderSwimmerTable(availableSwimmers, query ? "Résultats de recherche" : "Nageurs actifs", { showCount: !query, showSexFilter: true })}
          ${hiddenAvailableCount ? '<p class="admin-engagements-empty">Affinez votre recherche pour afficher les autres résultats.</p>' : ""}
          ${inactiveAccordion}`
      : `<section class="admin-engagements-club-swimmers-section admin-engagements-club-swimmers-section-empty">
          ${renderSwimmerSectionHead([], query ? "Résultats de recherche" : "Nageurs actifs", { showCount: !query, showSexFilter: true })}
          <p class="admin-engagements-empty">${query ? "Aucun nageur ne correspond à la recherche et au filtre." : "Aucun nageur actif ne correspond au filtre."}</p>
        </section>${inactiveAccordion}`;
    engagementClubSwimmersRenderedCompetitionId = selectedEngagementCompetitionId;
    setEngagementClubFormControlsLocked(elements.engagementsClubSwimmersForm, false);
    updateEngagementClubSwimmersSummary();
  }

  function renderEngagementClubEntriesTable({ sex = "", label = "Nageurs", rows = [], swimmersById, sessions = [] } = {}) {
    if (!rows.length) return "";
    const visibleSessions = engagementClubProgramSessionsForSex(sessions, sex);
    const identityColumnLabel = sex === "F" ? "Nageuse" : "Nageur";
    const swimmerLabel = sex === "F"
      ? `${rows.length} nageuse${rows.length > 1 ? "s" : ""}`
      : `${rows.length} nageur${rows.length > 1 ? "s" : ""}`;
    const openWater = engagementCompetitionType(selectedEngagementCompetition) === "openWater";
    if (!visibleSessions.length) {
      return `
        <section class="admin-engagements-club-entry-group" data-entry-sex="${escapeHtml(sex || "unknown")}">
          <div class="admin-engagements-club-entry-group-head"><h4>${escapeHtml(label)}</h4><span>${escapeHtml(swimmerLabel)}</span></div>
          <p class="admin-engagements-empty">Aucune course individuelle ouverte pour ce groupe.</p>
        </section>
      `;
    }
    const columns = visibleSessions.flatMap((session, sessionIndex) => (session.items || []).map((item, itemIndex) => ({
      ...item,
      session,
      sessionIndex,
      sessionStart: itemIndex === 0
    })));
    return `
      <section class="admin-engagements-club-entry-group" data-entry-sex="${escapeHtml(sex || "unknown")}">
        <div class="admin-engagements-club-entry-group-head">
          <h4>${escapeHtml(label)}</h4>
          <span>${escapeHtml(swimmerLabel)}</span>
        </div>
        <p class="admin-engagements-club-entries-scroll-hint" data-engagement-club-entries-scroll-hint>↔ Faites glisser pour voir les autres courses</p>
        <div class="admin-engagements-club-entries-table-shell" data-engagement-club-entries-sex="${escapeHtml(sex)}" tabindex="0" aria-label="Courses ${escapeHtml(label.toLowerCase())}, faire défiler horizontalement si nécessaire">
          <table class="admin-engagements-club-entries-table" aria-label="Courses ${escapeHtml(label.toLowerCase())}">
            <thead>
              <tr class="admin-engagements-club-entry-session-head">
                <th class="admin-engagements-club-entry-identity admin-engagements-club-entry-last-name" rowspan="2" scope="col">${identityColumnLabel}</th>
                <th class="admin-engagements-club-entry-identity" rowspan="2" scope="col">Naissance</th>
                <th class="admin-engagements-club-entry-identity" rowspan="2" scope="col">Cat.</th>
                ${visibleSessions.map((session, sessionIndex) => {
                  const meta = [formatShortDate(session.date), session.startTime].filter(Boolean).join(" · ");
                  return `<th class="admin-engagements-club-entry-session${sessionIndex ? " is-session-start" : ""}" colspan="${session.items.length}" scope="colgroup"><span>${escapeHtml(session.label || `Session ${sessionIndex + 1}`)}</span>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</th>`;
                }).join("")}
                <th class="admin-engagements-club-entry-action" rowspan="2" scope="col">${openWater ? "Courses" : "Temps"}</th>
              </tr>
              <tr class="admin-engagements-club-entry-course-head">
                ${columns.map((item) => {
                  const itemLabel = engagementClubProgramItemLabel(item);
                  return `<th class="${item.sessionStart ? "is-session-start" : ""}" scope="col" title="${escapeHtml(itemLabel.full)}"><span>${escapeHtml(itemLabel.short)}</span><small>${escapeHtml(itemLabel.gender)}</small></th>`;
                }).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((selected) => {
                const swimmer = swimmersById.get(selected.swimmerIndexId) || selected;
                const selectedCodes = engagementClubSelectedIndividualEventCodes(selected);
                const entryByCode = new Map((selected.individualEntries || []).map((entry) => [entry.eventCode, entry]).filter(([code]) => code));
                const lastName = swimmer.lastName || selected.lastName || swimmer.name || "Nageur sans nom";
                const firstName = swimmer.firstName || selected.firstName || "";
                const category = engagementSwimmerCategory({
                  ...swimmer,
                  ...selected,
                  category: selected.category || swimmer.category || "",
                  birthDate: selected.birthDate || swimmer.birthDate || ""
                }, selectedEngagementCompetition?.date || "") || "-";
                const selectedCount = selectedCodes.size;
                const maxEvents = Number(selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
                const countLabel = maxEvents > 0 ? `${selectedCount}/${maxEvents}` : String(selectedCount);
                return `
                  <tr class="admin-engagements-club-entry-row" data-engagement-club-entry-row data-engagement-club-entry-swimmer-id="${escapeHtml(selected.swimmerIndexId)}" data-sex="${escapeHtml(swimmer.sex || "")}">
                    <th class="admin-engagements-club-entry-last-name admin-engagements-club-entry-swimmer" scope="row" title="${escapeHtml(`${lastName} ${firstName}`.trim())}"><strong>${escapeHtml(lastName)}</strong><span>${escapeHtml(firstName || "-")}</span></th>
                    <td>${escapeHtml(formatShortDate(swimmer.birthDate || selected.birthDate) || "-")}</td>
                    <td>${escapeHtml(category)}</td>
                    ${columns.map((item) => {
                      const allowed = engagementClubProgramItemAllowsSwimmer(item, swimmer);
                      const checked = allowed && selectedCodes.has(item.eventCode);
                      const entry = entryByCode.get(item.eventCode) || {};
                      const manualValue = entry.entryTimeMode === "manual" ? (entry.manualEntryTime || entry.entryTime || "") : "";
                      const timeLabel = checked ? engagementEntryTimeDisplayLabel(entry) : "";
                      const timeMode = checked ? (entry.entryTimeMode || "pending") : "";
                      const itemLabel = engagementClubProgramItemLabel(item);
                      return `
                        <td class="admin-engagements-club-entry-course${item.sessionStart ? " is-session-start" : ""}${allowed ? "" : " is-unavailable"}">
                          ${allowed ? `
                            <label data-event-selected title="${escapeHtml(itemLabel.full)} pour ${escapeHtml(`${lastName} ${firstName}`.trim())}">
                              <input type="checkbox" data-engagement-club-swimmer-event="${escapeHtml(item.eventCode)}" ${checked ? "checked" : ""} aria-label="${escapeHtml(itemLabel.full)}">
                              ${openWater ? "" : `<small data-engagement-club-entry-cell-time data-entry-time-mode="${escapeHtml(timeMode)}" ${checked ? "" : "hidden"} title="${escapeHtml(engagementEntryTimeHelpLabel(entry, selectedEngagementCompetition?.missingEntryTimeMode === "manual"))}">${escapeHtml(timeLabel)}</small>`}
                            </label>
                            ${openWater ? "" : `<input type="hidden" data-engagement-club-swimmer-event-time="${escapeHtml(item.eventCode)}" value="${escapeHtml(manualValue)}" ${manualValue ? "" : "disabled"}>`}
                          ` : '<span aria-label="Course non ouverte pour ce nageur">—</span>'}
                        </td>
                      `;
                    }).join("")}
                    <td class="admin-engagements-club-entry-action">
                      ${openWater
                        ? `<span class="admin-engagements-club-entry-count" aria-label="${selectedCount} course${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}">${escapeHtml(countLabel)}</span>`
                        : `<button class="ghost-button compact admin-engagements-club-times-open" type="button" data-engagement-club-times-open="${escapeHtml(selected.swimmerIndexId)}" aria-label="Voir ou modifier les temps d'engagement, ${selectedCount} course${selectedCount > 1 ? "s" : ""}"><span>${escapeHtml(countLabel)}</span><b aria-hidden="true">✎</b></button>`}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function initializeEngagementCourseScrollHints() {
    const mount = elements.engagementsClubEntriesList;
    if (!mount) return;
    const competitionId = selectedEngagementCompetitionId;
    const dismissHints = () => {
      engagementCourseScrollHintSeen.add(competitionId);
      mount.querySelectorAll("[data-engagement-club-entries-scroll-hint]").forEach((hint) => { hint.hidden = true; });
    };
    mount.querySelectorAll(".admin-engagements-club-entries-table-shell").forEach((shell) => {
      const update = () => {
        const scrollable = shell.scrollWidth > shell.clientWidth + 2;
        shell.dataset.scrollable = scrollable ? "true" : "false";
        shell.dataset.atEnd = !scrollable || shell.scrollLeft + shell.clientWidth >= shell.scrollWidth - 2 ? "true" : "false";
        const hint = shell.previousElementSibling;
        if (hint?.matches?.("[data-engagement-club-entries-scroll-hint]")) {
          hint.hidden = !scrollable || engagementCourseScrollHintSeen.has(competitionId);
        }
      };
      update();
      shell.addEventListener("scroll", () => {
        update();
        if (Math.abs(shell.scrollLeft) > 6) dismissHints();
      }, { passive: true });
    });
  }

  function renderEngagementClubEntries() {
    const mount = elements.engagementsClubEntriesList;
    if (!mount) return;
    engagementClubEntriesRenderedCompetitionId = selectedEngagementCompetitionId;
    const writeLockReason = engagementClubWriteLockReason();
    const locked = Boolean(writeLockReason || !engagementClubTeamComplete());
    if (elements.engagementsClubEntriesForm) elements.engagementsClubEntriesForm.dataset.locked = locked ? "true" : "false";
    syncEngagementClubEntriesSaveBar();
    if (locked) {
      mount.innerHTML = `<p class="admin-engagements-empty">${escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
      updateEngagementClubEntriesSummary();
      return;
    }
    if (engagementClubSwimmersLoading && !engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    if (!engagementClubSwimmersLoaded) {
      mount.innerHTML = '<p class="admin-engagements-empty">Ouvrez l\'onglet Nageurs pour charger la base du club.</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    const selectedRows = currentEngagementClubSwimmersForSummary();
    if (!selectedRows.length) {
        mount.innerHTML = '<p class="admin-engagements-empty">Sélectionnez d\'abord les nageurs dans l\'onglet Nageurs.</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    const swimmersById = new Map([
      ...engagementClubSwimmers.map((swimmer) => [swimmer.id, swimmer]),
      ...(selectedEngagementClubEntry?.swimmers || []).map((swimmer) => [swimmer.swimmerIndexId, swimmer])
    ].filter(([id]) => id));
    const sortedSelectedRows = [...selectedRows].sort((left, right) => {
      const leftSwimmer = swimmersById.get(left.swimmerIndexId) || left;
      const rightSwimmer = swimmersById.get(right.swimmerIndexId) || right;
      const leftLastName = leftSwimmer.lastName || left.lastName || leftSwimmer.name || left.name || "";
      const rightLastName = rightSwimmer.lastName || right.lastName || rightSwimmer.name || right.name || "";
      const lastNameDifference = String(leftLastName).localeCompare(String(rightLastName), "fr", { sensitivity: "base", numeric: true });
      if (lastNameDifference) return lastNameDifference;
      return String(leftSwimmer.firstName || left.firstName || "")
        .localeCompare(String(rightSwimmer.firstName || right.firstName || ""), "fr", { sensitivity: "base", numeric: true });
    });
    const sessions = engagementClubProgramSessionsForEntries();
    if (!sessions.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucune course individuelle dans le programme.</p>';
      updateEngagementClubEntriesSummary();
      return;
    }
    const sexFor = (selected) => {
      const swimmer = swimmersById.get(selected.swimmerIndexId) || selected;
      return String(swimmer.sex || selected.sex || "").toUpperCase();
    };
    const groups = [
      { sex: "F", label: "Femmes", rows: sortedSelectedRows.filter((selected) => sexFor(selected) === "F") },
      { sex: "M", label: "Hommes", rows: sortedSelectedRows.filter((selected) => sexFor(selected) === "M") },
      { sex: "", label: "Sexe à vérifier", rows: sortedSelectedRows.filter((selected) => !["F", "M"].includes(sexFor(selected))) }
    ];
    mount.innerHTML = groups
      .map((group) => renderEngagementClubEntriesTable({ ...group, swimmersById, sessions }))
      .join("");
    global.requestAnimationFrame?.(initializeEngagementCourseScrollHints);
    updateEngagementClubEntriesSummary();
  }

  function engagementClubTimesDialogSwimmer() {
    if (!engagementClubTimesDialogSwimmerId) return null;
    return selectedEngagementClubSwimmerRows()
      .find((swimmer) => swimmer.swimmerIndexId === engagementClubTimesDialogSwimmerId) || null;
  }

  function engagementClubTimesDialogEventCodes(swimmer = {}) {
    const selectedCodes = engagementClubSelectedIndividualEventCodes(swimmer);
    const orderedCodes = engagementClubProgramSessionsForEntries()
      .flatMap((session) => session.items || [])
      .map((item) => item.eventCode)
      .filter((code, index, codes) => selectedCodes.has(code) && codes.indexOf(code) === index);
    selectedCodes.forEach((code) => {
      if (!orderedCodes.includes(code)) orderedCodes.push(code);
    });
    return orderedCodes;
  }

  function engagementClubEntryTimeHistoryLabel(item = {}) {
    return formatEngagementEntryTimeInput(item.entryTime) || item.entryTime || "Temps inconnu";
  }

  function updateEngagementClubTimeDialogHelp(select) {
    const row = select?.closest("[data-engagement-club-time-dialog-row]");
    const help = row?.querySelector("[data-engagement-club-time-dialog-help]");
    const option = select?.selectedOptions?.[0];
    if (!help || !option) return;
    const mode = option.dataset.entryTimeMode || select.dataset.entryTimeMode || "";
    help.textContent = mode === "manual"
      ? "Temps saisi manuellement"
      : mode === "default595999"
      ? "Aucun temps connu"
      : [option.dataset.historyDate || "", option.dataset.historyLocation || ""].filter(Boolean).join(" · ");
  }

  function populateEngagementClubEntryTimeHistory(swimmer = {}) {
    const cacheKey = engagementClubSwimmerEventTimesCacheKey(swimmer);
    const historyByEvent = engagementClubEntryTimeHistoryCache.get(cacheKey);
    if (!historyByEvent || engagementClubTimesDialogSwimmerId !== swimmer.swimmerIndexId) return;
    Array.from(elements.engagementsClubTimesDialogList?.querySelectorAll("[data-engagement-club-time-history-select]") || [])
      .forEach((select) => {
        const eventCode = select.dataset.engagementClubTimeHistorySelect || "";
        const originalTime = select.dataset.originalTime || "";
        const selectedTime = select.value;
        const seen = new Set([originalTime]);
        select.querySelectorAll("option[data-history-option]").forEach((option) => option.remove());
        (historyByEvent.get(eventCode) || []).forEach((item) => {
          const value = formatEngagementEntryTimeInput(item.entryTime) || item.entryTime || "";
          if (!value || seen.has(value)) return;
          seen.add(value);
          const option = document.createElement("option");
          option.value = value;
          option.textContent = engagementClubEntryTimeHistoryLabel(item);
          option.dataset.historyOption = "true";
          option.dataset.entryTimeMode = "known";
          option.dataset.historyDate = item.date ? formatShortDate(item.date) : "";
          option.dataset.historyLocation = item.location || "";
          select.append(option);
        });
        select.value = Array.from(select.options).some((option) => option.value === selectedTime)
          ? selectedTime
          : originalTime;
        const hasAlternatives = select.querySelectorAll("option[data-history-option]").length > 0;
        select.disabled = !hasAlternatives;
        select.dataset.hasAlternatives = hasAlternatives ? "true" : "false";
        updateEngagementClubTimeDialogHelp(select);
      });
  }

  async function loadEngagementClubEntryTimeHistory(swimmer = {}) {
    const eventCodes = engagementClubTimesDialogEventCodes(swimmer);
    const cacheKey = engagementClubSwimmerEventTimesCacheKey(swimmer);
    if (!cacheKey || !eventCodes.length || selectedEngagementCompetition?.missingEntryTimeMode !== "manual") return;
    if (engagementClubEntryTimeHistoryCache.has(cacheKey)) {
      populateEngagementClubEntryTimeHistory(swimmer);
      return;
    }
    if (engagementClubEntryTimeHistoryRequests.has(cacheKey)) {
      await engagementClubEntryTimeHistoryRequests.get(cacheKey);
      populateEngagementClubEntryTimeHistory(swimmer);
      return;
    }
    const request = (async () => {
      if (engagementClubSelectionChanges.size) await flushEngagementClubSwimmerSelections();
      if (engagementClubEntriesAutosaveTimer) await flushEngagementClubIndividualEntriesAutosave();
      await engagementClubEntryMutationQueue;
      const result = await callFunction("getEngagementClubEntryTimeHistory", {
        competitionId: selectedEngagementCompetitionId,
        swimmerIndexId: swimmer.swimmerIndexId,
        eventCodes
      });
      engagementClubEntryTimeHistoryCache.set(cacheKey, new Map(
        (Array.isArray(result.events) ? result.events : []).map((event) => [event.eventCode, event.times || []])
      ));
    })();
    engagementClubEntryTimeHistoryRequests.set(cacheKey, request);
    if (elements.engagementsClubTimesDialogMessage && engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
      elements.engagementsClubTimesDialogMessage.textContent = "Chargement des autres temps connus...";
      elements.engagementsClubTimesDialogMessage.dataset.tone = "loading";
    }
    try {
      await request;
      populateEngagementClubEntryTimeHistory(swimmer);
      if (elements.engagementsClubTimesDialogMessage && engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
        elements.engagementsClubTimesDialogMessage.textContent = "";
        elements.engagementsClubTimesDialogMessage.dataset.tone = "";
      }
    } catch (error) {
      if (elements.engagementsClubTimesDialogMessage && engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
        elements.engagementsClubTimesDialogMessage.textContent = `Historique indisponible : ${error?.message || error}`;
        elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
      }
    } finally {
      engagementClubEntryTimeHistoryRequests.delete(cacheKey);
    }
  }

  function renderEngagementClubTimesDialog() {
    const swimmer = engagementClubTimesDialogSwimmer();
    const mount = elements.engagementsClubTimesDialogList;
    if (!swimmer || !mount) return;
    const name = engagementSwimmerDisplayName(swimmer, "Nageur");
    const meta = [
      swimmer.birthDate ? `né(e) le ${formatShortDate(swimmer.birthDate)}` : "",
      swimmer.category ? `catégorie ${swimmer.category}` : "",
      swimmer.licenseNumber ? `licence ${swimmer.licenseNumber}` : ""
    ].filter(Boolean).join(" · ");
    if (elements.engagementsClubTimesDialogTitle) elements.engagementsClubTimesDialogTitle.textContent = name;
    if (elements.engagementsClubTimesDialogMeta) elements.engagementsClubTimesDialogMeta.textContent = meta;
    if (elements.engagementsClubTimesDialogApply) elements.engagementsClubTimesDialogApply.disabled = engagementClubTimesDialogLoading;
    if (elements.engagementsClubTimesDialogMessage) {
      elements.engagementsClubTimesDialogMessage.textContent = engagementClubTimesDialogLoading ? "Recherche des temps d'engagement..." : "";
      elements.engagementsClubTimesDialogMessage.dataset.tone = engagementClubTimesDialogLoading ? "loading" : "";
    }
    const eventCodes = engagementClubTimesDialogEventCodes(swimmer);
    if (!eventCodes.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucune course cochée pour ce nageur.</p>';
      return;
    }
    const entryByCode = new Map((swimmer.individualEntries || []).map((entry) => [entry.eventCode, entry]));
    const cacheKey = engagementClubSwimmerEventTimesCacheKey(swimmer);
    const previewByCode = new Map((engagementClubSwimmerEventTimesCache.get(cacheKey) || []).map((entry) => [entry.eventCode, entry]));
    const manualAllowed = selectedEngagementCompetition?.missingEntryTimeMode === "manual";
    mount.innerHTML = eventCodes.map((eventCode) => {
      const event = engagementEventDefinition(eventCode) || { code: eventCode, shortLabel: eventCode, label: eventCode };
      const entry = entryByCode.get(eventCode) || {};
      const preview = previewByCode.get(eventCode) || (entry.entryTimeMode !== "manual" ? entry : {});
      const manualEditing = manualAllowed && entry.entryTimeMode === "manual" && Boolean(entry.manualEntryTime || entry.entryTime);
      const manualValueRaw = manualEditing ? (entry.manualEntryTime || entry.entryTime || "") : "";
      const manualValue = formatEngagementEntryTimeInput(manualValueRaw) || manualValueRaw;
      const automaticValueRaw = preview.entryTime || "59:59.99";
      const automaticValue = formatEngagementEntryTimeInput(automaticValueRaw) || automaticValueRaw;
      const displayedEntry = manualEditing ? entry : preview;
      const displayLabel = engagementEntryTimeDisplayLabel(displayedEntry);
      const help = engagementEntryTimeHelpLabel(displayedEntry, manualAllowed);
      const automaticLabel = engagementEntryTimeDisplayLabel(preview);
      return `
        <div class="admin-engagements-club-time-dialog-row" data-engagement-club-time-dialog-row="${escapeHtml(eventCode)}">
          <div class="admin-engagements-club-time-dialog-course">
            <strong>${escapeHtml(event.shortLabel || eventCode)}</strong>
            <small>${escapeHtml(event.label || eventCode)}</small>
          </div>
          <div class="admin-engagements-club-time-dialog-value">
            ${manualAllowed ? `
              <select class="admin-engagements-club-time-history-select" data-engagement-club-time-history-select="${escapeHtml(eventCode)}" data-original-time="${escapeHtml(displayLabel)}" data-entry-time-mode="${escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-has-alternatives="false" aria-label="Temps d'engagement ${escapeHtml(event.shortLabel || eventCode)}" disabled>
                <option value="${escapeHtml(displayLabel)}" data-entry-time-mode="${escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-history-date="${escapeHtml(displayedEntry.date ? formatShortDate(displayedEntry.date) : "")}" data-history-location="${escapeHtml(displayedEntry.location || "")}">${escapeHtml(displayLabel)}</option>
              </select>
            ` : `
              <span data-engagement-club-time-dialog-display data-entry-time-mode="${escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-automatic-label="${escapeHtml(automaticLabel)}">${escapeHtml(displayLabel)}</span>
            `}
            ${manualAllowed ? `
              <button class="ghost-button compact" type="button" data-engagement-club-time-toggle data-automatic-time="${escapeHtml(automaticValue)}">${manualEditing ? "Rétablir auto" : "Saisie libre"}</button>
              <input type="text" maxlength="8" inputmode="numeric" placeholder="00:00.00" aria-label="Temps manuel ${escapeHtml(event.shortLabel || eventCode)}" data-engagement-club-time-dialog-input value="${escapeHtml(manualValue)}" ${manualEditing ? "" : "hidden disabled"}>
            ` : ""}
          </div>
          <small class="admin-engagements-club-time-dialog-help" data-engagement-club-time-dialog-help>${escapeHtml(help)}</small>
        </div>
      `;
    }).join("");
  }

  async function openEngagementClubTimesDialog(swimmerIndexId = "", opener = null) {
    const row = Array.from(elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
      .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
    if (!row) return;
    engagementClubTimesDialogSwimmerId = swimmerIndexId;
    engagementClubTimesDialogOpener = opener;
    const swimmer = engagementClubTimesDialogSwimmer();
    engagementClubTimesDialogLoading = Boolean(swimmer && (swimmer.individualEntries || [])
      .some((entry) => !entry.entryTimeMode || entry.entryTimeMode === "pending"));
    if (elements.engagementsClubTimesDialog && !elements.engagementsClubTimesDialog.open) {
      elements.engagementsClubTimesDialog.showModal();
    }
    renderEngagementClubTimesDialog();
    if (!swimmer) return;
    if (engagementClubTimesDialogLoading) {
      if (engagementClubEntriesAutosaveTimer) await flushEngagementClubIndividualEntriesAutosave();
      else await engagementClubEntryMutationQueue;
      if (engagementClubTimesDialogSwimmerId !== swimmerIndexId) return;
      const refreshedSwimmer = engagementClubTimesDialogSwimmer() || swimmer;
      const stillPending = (refreshedSwimmer.individualEntries || [])
        .some((entry) => !entry.entryTimeMode || entry.entryTimeMode === "pending");
      if (stillPending) await ensureEngagementClubSwimmerEventTimes(refreshedSwimmer);
      if (engagementClubTimesDialogSwimmerId !== swimmerIndexId) return;
      engagementClubTimesDialogLoading = false;
      renderEngagementClubTimesDialog();
    }
    void loadEngagementClubEntryTimeHistory(engagementClubTimesDialogSwimmer() || swimmer);
  }

  function closeEngagementClubTimesDialog(restoreFocus = true) {
    if (elements.engagementsClubTimesDialog?.open) elements.engagementsClubTimesDialog.close();
    const opener = engagementClubTimesDialogOpener;
    engagementClubTimesDialogSwimmerId = "";
    engagementClubTimesDialogLoading = false;
    engagementClubTimesDialogOpener = null;
    if (restoreFocus) opener?.focus?.();
  }

  function applyEngagementClubTimesDialog() {
    const swimmer = engagementClubTimesDialogSwimmer();
    if (!swimmer) return;
    const overrides = new Map();
    const dialogRows = Array.from(elements.engagementsClubTimesDialogList?.querySelectorAll("[data-engagement-club-time-dialog-row]") || []);
    for (const dialogRow of dialogRows) {
      const eventCode = dialogRow.dataset.engagementClubTimeDialogRow || "";
      const input = dialogRow.querySelector("[data-engagement-club-time-dialog-input]");
      const historySelect = dialogRow.querySelector("[data-engagement-club-time-history-select]");
      if (!input) continue;
      const historyValue = String(historySelect?.value || "").trim();
      const historyChanged = Boolean(historySelect && historyValue && historyValue !== historySelect.dataset.originalTime);
      const manual = historyChanged || !input.disabled;
      const validTime = !manual || (historyChanged
        ? Boolean(formatEngagementEntryTimeInput(historyValue))
        : normalizeEngagementEntryTimeInput(input));
      const value = historyChanged ? historyValue : manual ? String(input.value || "").trim() : "";
      if (manual && !value) {
        if (elements.engagementsClubTimesDialogMessage) {
          elements.engagementsClubTimesDialogMessage.textContent = "Renseignez le temps modifié ou rétablissez le temps automatique.";
          elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
        }
        input.focus?.();
        return;
      }
      if (!validTime) {
        if (elements.engagementsClubTimesDialogMessage) {
          elements.engagementsClubTimesDialogMessage.textContent = "Temps invalide : utilisez MM:SS.CC ou saisissez uniquement les chiffres.";
          elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
        }
        input.reportValidity?.();
        input.focus?.();
        return;
      }
      overrides.set(eventCode, { manual, value });
    }
    const matrixRow = Array.from(elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
      .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === swimmer.swimmerIndexId);
    overrides.forEach((override, eventCode) => {
      const timeInput = Array.from(matrixRow?.querySelectorAll("[data-engagement-club-swimmer-event-time]") || [])
        .find((input) => input.dataset.engagementClubSwimmerEventTime === eventCode);
      if (!timeInput) return;
      timeInput.value = override.value;
      timeInput.disabled = !override.manual;
    });
    const previewByCode = new Map((engagementClubSwimmerEventTimesCache.get(engagementClubSwimmerEventTimesCacheKey(swimmer)) || [])
      .map((entry) => [entry.eventCode, entry]));
    const swimmers = selectedEngagementClubSwimmerRows().map((candidate) => {
      if (candidate.swimmerIndexId !== swimmer.swimmerIndexId) return candidate;
      return {
        ...candidate,
        individualEntries: (candidate.individualEntries || []).map((entry) => {
          const override = overrides.get(entry.eventCode);
          if (!override) return entry;
          if (override.manual) {
            return { ...entry, entryTimeMode: "manual", entryTime: override.value, manualEntryTime: override.value };
          }
          const preview = previewByCode.get(entry.eventCode);
          return preview ? { ...entry, ...preview, manualEntryTime: "" } : { ...entry, manualEntryTime: "" };
        })
      };
    });
    const swimmerIndexId = swimmer.swimmerIndexId;
    const changedSwimmer = swimmers.find((candidate) => candidate.swimmerIndexId === swimmerIndexId);
    selectedEngagementClubEntry = { ...(selectedEngagementClubEntry || {}), swimmers };
    closeEngagementClubTimesDialog(false);
    renderEngagementClubEntries();
    Array.from(elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-times-open]") || [])
      .find((button) => button.dataset.engagementClubTimesOpen === swimmerIndexId)?.focus?.();
    if (changedSwimmer) void persistEngagementClubIndividualEntries(changedSwimmer);
  }

  function engagementClubRelayEvents() {
    return (selectedEngagementCompetition?.events || []).filter((event) => event.type === "relay");
  }

  function engagementClubRelaySessionLabel(eventCode = "", genderMode = "") {
    const events = Array.isArray(selectedEngagementCompetition?.events) ? selectedEngagementCompetition.events : [];
    const eventOptions = events.map((event) => ({ code: event.code, label: event.shortLabel || event.code }));
    const sessions = normalizedEngagementProgramSessions(selectedEngagementCompetition?.programSessions || [], eventOptions);
    let matches = sessions.filter((session) => (session.items || []).some((item) =>
      item.eventCode === eventCode && (!genderMode || item.genderMode === genderMode)
    ));
    if (!matches.length && genderMode) {
      matches = sessions.filter((session) => (session.items || []).some((item) => item.eventCode === eventCode));
    }
    return matches.map((session) => [
      session.label,
      session.date ? formatShortDate(session.date) : "",
      session.startTime || ""
    ].filter(Boolean).join(" · ")).join(" / ");
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

  function engagementRelayLegCount(event = {}) {
    return Math.max(1, Math.trunc(Number(event.relayLegs || 4) || 4));
  }

  function engagementRelayLegPlaceholder(genderMode = "", index = 0) {
    if (genderMode === "female") return `Relayeuse ${index + 1}`;
    if (genderMode === "mixed") return `${index % 2 === 0 ? "Relayeur" : "Relayeuse"} ${index + 1} (${index % 2 === 0 ? "Homme" : "Femme"})`;
    return `Relayeur ${index + 1}`;
  }

  function engagementRelayLegChoiceLabel(genderMode = "", index = 0) {
    const expectedSex = engagementRelayExpectedMemberSex(genderMode, index);
    return `${expectedSex === "F" ? "Relayeuse" : "Relayeur"} ${index + 1}`;
  }

  function engagementRelayPeopleWording(genderMode = "") {
    return genderMode === "female"
      ? { plural: "relayeuses", empty: "Relayeuses non renseignées" }
      : { plural: "relayeurs", empty: "Relayeurs non renseignés" };
  }

  function engagementRelayMemberShortLabel(swimmer = {}) {
    const lastName = String(swimmer.lastName || "").trim().toLocaleUpperCase("fr-FR");
    const firstName = String(swimmer.firstName || "").trim();
    if (lastName) return `${lastName}${firstName ? ` ${firstName.slice(0, 1).toLocaleUpperCase("fr-FR")}.` : ""}`;
    return String(swimmer.name || "").trim();
  }

  function engagementRelayMemberShortLabels(memberIds = []) {
    const swimmers = new Map(engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    return memberIds
      .filter(Boolean)
      .map((memberId) => engagementRelayMemberShortLabel(swimmers.get(memberId) || {}))
      .filter(Boolean);
  }

  function engagementRelayMemberSummary(memberIds = []) {
    return engagementRelayMemberShortLabels(memberIds).join(" · ");
  }

  function engagementRelayExpectedMemberSex(genderMode = "", index = 0) {
    if (genderMode === "female") return "F";
    if (genderMode === "male") return "M";
    if (genderMode === "mixed") return index % 2 === 0 ? "M" : "F";
    return "";
  }

  function engagementRelaySwimmerAllowedForCategory(swimmer = {}, relayCategory = "", competitionDate = "") {
    const category = engagementSwimmerCategory(swimmer, competitionDate);
    if (!category) return false;
    if (String(relayCategory || "").startsWith("R")) return /^M\d/.test(category);
    if (relayCategory === "S") return true;
    const swimmerRank = ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[category];
    const relayRank = ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[relayCategory];
    return Number.isFinite(swimmerRank) && Number.isFinite(relayRank) && swimmerRank <= relayRank;
  }

  function engagementRelayMemberOptionLabel(swimmer = {}, competitionDate = "") {
    const name = engagementSwimmerDisplayName(swimmer);
    const category = engagementSwimmerCategory(swimmer, competitionDate);
    return category ? `${name} (${category})` : name;
  }

  function engagementRelaySameDistanceNature(event = {}, candidate = {}) {
    return String(event.distance || "") === String(candidate.distance || "") &&
      String(event.discipline || "") === String(candidate.discipline || "");
  }

  function engagementRelayMemberAlreadyUsed(swimmerIndexId = "", rows = [], rowIndex = -1, memberIndex = -1, event = {}) {
    if (!swimmerIndexId) return false;
    const relayEvents = new Map(engagementClubRelayEvents().map((item) => [item.code, item]));
    return rows.some((relay, relayIndex) => {
      const relayEvent = relayEvents.get(relay.eventCode);
      if (!relayEvent || !engagementRelaySameDistanceNature(event, relayEvent)) return false;
      const memberIds = Array.isArray(relay.memberIds)
        ? relay.memberIds
        : (relay.members || []).map((member) => member.swimmerIndexId).filter(Boolean);
      return memberIds.some((memberId, currentMemberIndex) =>
        memberId === swimmerIndexId && (relayIndex !== rowIndex || currentMemberIndex !== memberIndex)
      );
    });
  }

  function selectedEngagementClubRelayRowsFromDom() {
    return Array.from(elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
      .map((row) => {
        const relayId = row.dataset.engagementClubRelayId || "";
        const existingRelay = engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
        if (row.dataset.engagementClubRelayReadonly === "true") {
          return {
            ...existingRelay,
            relayId,
            draftPending: false,
            persisted: true
          };
        }
        const eventCode = row.querySelector("[data-engagement-club-relay-event]")?.value || "";
        const category = row.querySelector("[data-engagement-club-relay-category]")?.value || "";
        const genderMode = row.querySelector("[data-engagement-club-relay-gender]")?.value || "";
        const manualEntryTime = row.querySelector("[data-engagement-club-relay-time]")?.value || "";
        const memberControls = Array.from(row.querySelectorAll("[data-engagement-club-relay-member]"));
        const memberIds = memberControls.length
          ? memberControls.map((select) => select.value || "")
          : Array.isArray(existingRelay.memberIds) ? existingRelay.memberIds : [];
        return {
          ...existingRelay,
          relayId,
          eventCode,
          category,
          genderMode,
          manualEntryTime,
          memberIds,
          draftNotice: row.dataset.engagementClubRelayNotice || "",
          draftPending: existingRelay.draftPending === true || row.dataset.engagementClubRelayPending === "true",
          persisted: existingRelay.persisted === true || row.dataset.engagementClubRelayPersisted === "true"
        };
      });
  }

  function selectedEngagementClubRelayRows() {
    const domRows = selectedEngagementClubRelayRowsFromDom();
    return domRows.length || elements.engagementsClubRelaysList?.querySelector("[data-engagement-club-relay-row]")
      ? domRows
      : engagementClubRelaysDraft;
  }

  function engagementClubRelayNeedsCompletion(relay = {}) {
    const event = engagementClubRelayEvents().find((item) => item.code === relay.eventCode);
    if (!event || !relay.category || !relay.genderMode) return true;
    if (engagementCompetitionType(selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()) return true;
    const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : [];
    const selectedMemberCount = memberIds.filter(Boolean).length;
    return selectedMemberCount > 0 && selectedMemberCount !== engagementRelayLegCount(event);
  }

  function reconcileEngagementClubRelayDraft(relay = {}, previousRelay = {}, changedField = "") {
    const event = engagementClubRelayEvents().find((item) => item.code === relay.eventCode) || {};
    const categories = engagementRelayCategoryOptions(event);
    const category = categories.some(([code]) => code === relay.category) ? relay.category : "";
    const genderOptions = engagementRelayGenderOptions(event, category);
    const genderMode = genderOptions.length === 1
      ? genderOptions[0][0]
      : genderOptions.some(([mode]) => mode === relay.genderMode) ? relay.genderMode : "";
    const eventChanged = changedField === "event" && previousRelay.eventCode && previousRelay.eventCode !== relay.eventCode;
    if (eventChanged) {
      return {
        ...relay,
        category,
        genderMode,
        manualEntryTime: "",
        memberIds: Array.from({ length: engagementRelayLegCount(event) }, () => ""),
        draftNotice: "Épreuve modifiée : vérifiez le temps et les relayeurs."
      };
    }
    const competitionDate = selectedEngagementCompetition?.date || "";
    const swimmers = new Map(engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const memberIds = Array.from({ length: engagementRelayLegCount(event) }, (_, memberIndex) => {
      const swimmerId = Array.isArray(relay.memberIds) ? relay.memberIds[memberIndex] || "" : "";
      const swimmer = swimmers.get(swimmerId);
      const expectedSex = engagementRelayExpectedMemberSex(genderMode, memberIndex);
      if (!swimmer || !category || !genderMode) return "";
      if (expectedSex && swimmer.sex !== expectedSex) return "";
      return engagementRelaySwimmerAllowedForCategory(swimmer, category, competitionDate) ? swimmerId : "";
    });
    return {
      ...relay,
      category,
      genderMode,
      memberIds
    };
  }

  function focusEngagementClubRelayControl(relayId = "", selector = "", memberIndex = -1) {
    global.requestAnimationFrame?.(() => {
      const row = Array.from(elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
        .find((item) => item.dataset.engagementClubRelayId === relayId);
      if (!row) return;
      const controls = selector ? Array.from(row.querySelectorAll(selector)) : [];
      const control = memberIndex >= 0 ? controls[memberIndex] : controls[0];
      control?.focus?.();
      row.scrollIntoView?.({ block: "nearest" });
    });
  }

  function focusFirstIncompleteEngagementClubRelay() {
    global.requestAnimationFrame?.(() => {
      const rows = Array.from(elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || []);
      const row = rows.find((item) => engagementClubRelayNeedsCompletion(selectedEngagementClubRelayRowsFromElement(item)));
      if (!row) return;
      const relay = selectedEngagementClubRelayRowsFromElement(row);
      const control = !relay.eventCode
        ? row.querySelector("[data-engagement-club-relay-event]")
        : !relay.category
          ? row.querySelector("[data-engagement-club-relay-category]")
          : !relay.genderMode
            ? row.querySelector("[data-engagement-club-relay-gender]")
            : engagementCompetitionType(selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()
              ? row.querySelector("[data-engagement-club-relay-time]")
              : Array.from(row.querySelectorAll("[data-engagement-club-relay-member]")).find((item) => !item.value);
      control?.focus?.();
      row.scrollIntoView?.({ block: "nearest" });
    });
  }

  function selectedEngagementClubRelayRowsFromElement(row) {
    if (!row) return {};
    const relayId = row.dataset.engagementClubRelayId || "";
    const existingRelay = engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
    return {
      ...existingRelay,
      relayId,
      eventCode: row.querySelector("[data-engagement-club-relay-event]")?.value || "",
      category: row.querySelector("[data-engagement-club-relay-category]")?.value || "",
      genderMode: row.querySelector("[data-engagement-club-relay-gender]")?.value || "",
      manualEntryTime: row.querySelector("[data-engagement-club-relay-time]")?.value || "",
      memberIds: Array.isArray(existingRelay.memberIds) ? existingRelay.memberIds : [],
      draftPending: existingRelay.draftPending === true || row.dataset.engagementClubRelayPending === "true",
      persisted: existingRelay.persisted === true || row.dataset.engagementClubRelayPersisted === "true"
    };
  }

  function engagementClubRelayDialogRelay() {
    return engagementClubRelayDialogDraft;
  }

  function readEngagementClubRelayDialogDraft() {
    const relay = engagementClubRelayDialogRelay();
    if (!relay) return null;
    return {
      ...relay,
      eventCode: elements.engagementsClubRelayDialogEvent?.value || "",
      category: elements.engagementsClubRelayDialogCategory?.value || "",
      genderMode: elements.engagementsClubRelayDialogGender?.value || "",
      manualEntryTime: elements.engagementsClubRelayDialogTime?.value || "",
      memberIds: Array.from(elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || [])
        .map((select) => select.value || "")
    };
  }

  function syncEngagementClubRelayDialogMemberOptions() {
    const selects = Array.from(elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || []);
    const selectedIds = selects.map((select) => select.value).filter(Boolean);
    selects.forEach((select) => {
      Array.from(select.options).forEach((option) => {
        if (!option.value) return;
        const selectedElsewhere = option.value !== select.value && selectedIds.includes(option.value);
        option.hidden = selectedElsewhere;
        option.disabled = selectedElsewhere;
      });
    });
  }

  function renderEngagementClubRelayDialog() {
    const relay = engagementClubRelayDialogRelay();
    const mount = elements.engagementsClubRelayDialogList;
    if (!relay || !mount) return;
    const membersWereOpen = elements.engagementsClubRelayDialogMembers?.open === true;
    const relayEvents = engagementClubRelayEvents();
    const event = relayEvents.find((candidate) => candidate.code === relay.eventCode) || {};
    const relayIndex = engagementClubRelaysDraft.findIndex((candidate) => candidate.relayId === relay.relayId);
    const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : [];
    const dialogRelayIndex = relayIndex >= 0 ? relayIndex : engagementClubRelaysDraft.length;
    const relaysWithDialogDraft = relayIndex >= 0
      ? engagementClubRelaysDraft.map((candidate, candidateIndex) => candidateIndex === relayIndex ? relay : candidate)
      : [...engagementClubRelaysDraft, relay];
    const relaysWithoutCurrentMembers = relaysWithDialogDraft.map((candidate, candidateIndex) => candidateIndex === dialogRelayIndex
      ? { ...candidate, memberIds: [] }
      : candidate);
    const relayLegs = engagementRelayLegCount(event);
    const competitionDate = selectedEngagementCompetition?.date || "";
    const swimmerOptions = engagementClubRelaySwimmerOptions();
    const sessionLabel = engagementClubRelaySessionLabel(relay.eventCode, relay.genderMode);
    const peopleWording = engagementRelayPeopleWording(relay.genderMode);
    const categories = engagementRelayCategoryOptions(event);
    const genderOptions = engagementRelayGenderOptions(event, relay.category);
    const selectedMemberCount = memberIds.filter(Boolean).length;
    if (elements.engagementsClubRelayDialogTitle) {
      elements.engagementsClubRelayDialogTitle.textContent = relay.persisted ? "Modifier le relais" : "Nouveau relais";
    }
    if (elements.engagementsClubRelayDialogMeta) {
      elements.engagementsClubRelayDialogMeta.textContent = sessionLabel || "Renseignez les informations puis validez.";
    }
    if (elements.engagementsClubRelayDialogEvent) {
      elements.engagementsClubRelayDialogEvent.innerHTML = `
        <option value="" ${event.code ? "" : "selected"} disabled>Choisir</option>
        ${relayEvents.map((option) => `<option value="${escapeHtml(option.code)}" ${option.code === event.code ? "selected" : ""}>${escapeHtml(option.shortLabel || option.code)}</option>`).join("")}
      `;
      elements.engagementsClubRelayDialogEvent.disabled = engagementClubRelayDialogSaving;
    }
    if (elements.engagementsClubRelayDialogCategory) {
      elements.engagementsClubRelayDialogCategory.innerHTML = `
        <option value="" ${relay.category ? "" : "selected"} disabled>Choisir</option>
        ${categories.map(([code, label]) => `<option value="${escapeHtml(code)}" ${code === relay.category ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      `;
      elements.engagementsClubRelayDialogCategory.disabled = engagementClubRelayDialogSaving || !event.code;
    }
    if (elements.engagementsClubRelayDialogGender) {
      elements.engagementsClubRelayDialogGender.innerHTML = `
        <option value="" ${relay.genderMode ? "" : "selected"} disabled>Choisir</option>
        ${genderOptions.map(([mode, label]) => `<option value="${escapeHtml(mode)}" ${mode === relay.genderMode ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      `;
      elements.engagementsClubRelayDialogGender.dataset.gender = relay.genderMode || "";
      elements.engagementsClubRelayDialogGender.disabled = engagementClubRelayDialogSaving || !relay.category || genderOptions.length === 1;
    }
    if (elements.engagementsClubRelayDialogTime) {
      const openWater = engagementCompetitionType(selectedEngagementCompetition) === "openWater";
      const timeField = elements.engagementsClubRelayDialogTime.closest("[data-engagements-relay-time-field]");
      if (timeField) timeField.hidden = openWater;
      elements.engagementsClubRelayDialogTime.required = !openWater;
      elements.engagementsClubRelayDialogTime.value = formatEngagementEntryTimeInput(relay.manualEntryTime || "") || relay.manualEntryTime || "";
      elements.engagementsClubRelayDialogTime.disabled = engagementClubRelayDialogSaving;
    }
    if (elements.engagementsClubRelayDialogMembersSummary) {
      elements.engagementsClubRelayDialogMembersSummary.textContent = selectedMemberCount
        ? `Participants · ${selectedMemberCount}/${relayLegs}`
        : `Choisir les ${peopleWording.plural}`;
    }
    if (elements.engagementsClubRelayDialogMembersHelp) {
      elements.engagementsClubRelayDialogMembersHelp.textContent = event.code && relay.category && relay.genderMode
        ? `Sélectionnez les ${relayLegs} ${peopleWording.plural}, ou laissez la composition vide.`
        : "Choisissez d'abord la distance, la catégorie et le sexe.";
    }
    mount.innerHTML = event.code && relay.category && relay.genderMode ? `
      <div class="admin-engagements-club-relay-dialog-grid">
        ${Array.from({ length: relayLegs }, (_, memberIndex) => {
          const expectedSex = engagementRelayExpectedMemberSex(relay.genderMode, memberIndex);
          const currentMemberId = memberIds[memberIndex] || "";
          const options = swimmerOptions.filter((swimmer) => {
            if (expectedSex && swimmer.sex !== expectedSex) return false;
            if (!engagementRelaySwimmerAllowedForCategory(swimmer, relay.category, competitionDate)) return false;
            return !engagementRelayMemberAlreadyUsed(swimmer.swimmerIndexId, relaysWithoutCurrentMembers, dialogRelayIndex, memberIndex, event);
          });
          const label = engagementRelayLegPlaceholder(relay.genderMode, memberIndex);
          const choiceLabel = engagementRelayLegChoiceLabel(relay.genderMode, memberIndex);
          return `
            <label data-expected-sex="${escapeHtml(expectedSex)}">
              <span aria-hidden="true">${memberIndex + 1}</span>
              <select data-engagement-club-relay-dialog-member aria-label="${escapeHtml(label)}" ${engagementClubRelayDialogSaving ? "disabled" : ""}>
                <option value="">${escapeHtml(choiceLabel)}</option>
                ${options.map((swimmer) => `<option value="${escapeHtml(swimmer.swimmerIndexId)}" ${currentMemberId === swimmer.swimmerIndexId ? "selected" : ""}>${escapeHtml(engagementRelayMemberOptionLabel(swimmer, competitionDate))}</option>`).join("")}
              </select>
            </label>
          `;
        }).join("")}
      </div>
    ` : "";
    if (elements.engagementsClubRelayDialogMembers) {
      elements.engagementsClubRelayDialogMembers.open = membersWereOpen;
      elements.engagementsClubRelayDialogMembers.classList.toggle("is-unavailable", !event.code || !relay.category || !relay.genderMode);
    }
    syncEngagementClubRelayDialogMemberOptions();
    if (elements.engagementsClubRelayDialogApply) {
      elements.engagementsClubRelayDialogApply.textContent = engagementClubRelayDialogSaving ? "Enregistrement..." : "Valider le relais";
      elements.engagementsClubRelayDialogApply.disabled = engagementClubRelayDialogSaving;
    }
    if (elements.engagementsClubRelayDialogReset) elements.engagementsClubRelayDialogReset.disabled = engagementClubRelayDialogSaving;
    if (elements.engagementsClubRelayDialogCancel) elements.engagementsClubRelayDialogCancel.disabled = engagementClubRelayDialogSaving;
    if (elements.engagementsClubRelayDialogClose) elements.engagementsClubRelayDialogClose.disabled = engagementClubRelayDialogSaving;
  }

  function openEngagementClubRelayDialog(relayId = "", opener = null) {
    engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom();
    const savedRelay = relayId ? engagementClubRelaysDraft.find((candidate) => candidate.relayId === relayId) : null;
    if (relayId && !savedRelay) return;
    const relay = savedRelay
      ? {
          ...savedRelay,
          memberIds: Array.isArray(savedRelay.memberIds)
            ? [...savedRelay.memberIds]
            : (savedRelay.members || []).map((member) => member.swimmerIndexId).filter(Boolean)
        }
      : {
          relayId: `relay-${Date.now()}`,
          eventCode: "",
          category: "",
          genderMode: "",
          manualEntryTime: "",
          memberIds: [],
          persisted: false
        };
    engagementClubRelayDialogRelayId = relayId;
    engagementClubRelayDialogDraft = relay;
    engagementClubRelayDialogOpener = opener;
    engagementClubRelayDialogSaving = false;
    if (elements.engagementsClubRelayDialogMessage) {
      elements.engagementsClubRelayDialogMessage.textContent = "";
      elements.engagementsClubRelayDialogMessage.dataset.tone = "";
    }
    renderEngagementClubRelayDialog();
    if (elements.engagementsClubRelayDialog && !elements.engagementsClubRelayDialog.open) {
      elements.engagementsClubRelayDialog.showModal();
    }
    global.requestAnimationFrame?.(() => elements.engagementsClubRelayDialogEvent?.focus?.());
  }

  function closeEngagementClubRelayDialog(restoreFocus = true) {
    if (engagementClubRelayDialogSaving) return;
    if (elements.engagementsClubRelayDialog?.open) elements.engagementsClubRelayDialog.close();
    const opener = engagementClubRelayDialogOpener;
    engagementClubRelayDialogRelayId = "";
    engagementClubRelayDialogDraft = null;
    engagementClubRelayDialogOpener = null;
    if (restoreFocus) opener?.focus?.();
  }

  async function applyEngagementClubRelayDialog() {
    let relay = readEngagementClubRelayDialogDraft();
    if (!relay || engagementClubRelayDialogSaving) return;
    const timeInput = elements.engagementsClubRelayDialogTime;
    const openWater = engagementCompetitionType(selectedEngagementCompetition) === "openWater";
    if (!openWater && timeInput && !normalizeEngagementEntryTimeInput(timeInput)) {
      timeInput.reportValidity?.();
      timeInput.focus?.();
      return;
    }
    relay = { ...relay, manualEntryTime: openWater ? "" : timeInput?.value || "", draftPending: false };
    engagementClubRelayDialogDraft = relay;
    const relayIndex = engagementClubRelaysDraft.findIndex((candidate) => candidate.relayId === relay.relayId);
    const nextRows = relayIndex >= 0
      ? engagementClubRelaysDraft.map((candidate, index) => index === relayIndex ? relay : candidate)
      : [...engagementClubRelaysDraft, relay];
    const validationIssues = engagementClubRelayValidationIssues(nextRows);
    if (validationIssues.length) {
      if (elements.engagementsClubRelayDialogMessage) {
        elements.engagementsClubRelayDialogMessage.textContent = validationIssues[0];
        elements.engagementsClubRelayDialogMessage.dataset.tone = "error";
      }
      const firstMissingControl = !relay.eventCode
        ? elements.engagementsClubRelayDialogEvent
        : !relay.category
          ? elements.engagementsClubRelayDialogCategory
          : !relay.genderMode
            ? elements.engagementsClubRelayDialogGender
            : !openWater && !relay.manualEntryTime ? elements.engagementsClubRelayDialogTime : null;
      firstMissingControl?.focus?.();
      return;
    }
    const previousRows = engagementClubRelaysDraft;
    engagementClubRelaysDraft = nextRows;
    engagementClubRelayDialogSaving = true;
    renderEngagementClubRelayDialog();
    if (elements.engagementsClubRelayDialogMessage) {
      elements.engagementsClubRelayDialogMessage.textContent = "Enregistrement du relais...";
      elements.engagementsClubRelayDialogMessage.dataset.tone = "loading";
    }
    const saved = await saveEngagementClubRelays(null, elements.engagementsClubRelayDialogMessage, nextRows);
    engagementClubRelayDialogSaving = false;
    if (!saved) {
      engagementClubRelaysDraft = previousRows;
      renderEngagementClubRelayDialog();
      return;
    }
    const relayId = relay.relayId;
    closeEngagementClubRelayDialog(false);
    global.requestAnimationFrame?.(() => {
      const savedRow = Array.from(elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
        .find((row) => row.dataset.engagementClubRelayId === relayId);
      (savedRow?.querySelector("[data-engagement-club-relay-edit]") || savedRow?.querySelector("[data-engagement-club-relay-compose]"))?.focus?.();
    });
  }

  function resetEngagementClubRelayDialogMembers() {
    if (engagementClubRelayDialogSaving) return;
    Array.from(elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || [])
      .forEach((select) => { select.value = ""; });
    syncEngagementClubRelayDialogMemberOptions();
    engagementClubRelayDialogDraft = readEngagementClubRelayDialogDraft();
    if (elements.engagementsClubRelayDialogMembersSummary) {
      elements.engagementsClubRelayDialogMembersSummary.textContent = `Choisir les ${engagementRelayPeopleWording(engagementClubRelayDialogDraft?.genderMode).plural}`;
    }
    if (elements.engagementsClubRelayDialogMessage) {
      elements.engagementsClubRelayDialogMessage.textContent = "Sélection des participants réinitialisée.";
      elements.engagementsClubRelayDialogMessage.dataset.tone = "";
    }
    elements.engagementsClubRelayDialogList?.querySelector("[data-engagement-club-relay-dialog-member]")?.focus?.();
  }

  function engagementRelayMemberAge(swimmer = {}, competitionDate = "") {
    const birthYear = Number(String(swimmer.birthDate || "").slice(0, 4));
    if (!Number.isFinite(birthYear) || birthYear < 1900) return 0;
    return engagementSeasonEndYearFromDate(competitionDate) - birthYear;
  }

  function engagementClubRelayValidationIssues(relays = selectedEngagementClubRelayRows()) {
    const issues = [];
    const relayEvents = new Map(engagementClubRelayEvents().map((event) => [event.code, event]));
    const swimmers = new Map(engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const seenRelays = new Set();
    const memberSlots = new Set();
    const competitionDate = selectedEngagementCompetition?.date || "";
    relays.forEach((relay, index) => {
      const rowLabel = `Relais ${index + 1}`;
      const event = relayEvents.get(relay.eventCode);
      if (!relay.eventCode) {
        issues.push(`${rowLabel} : choisissez une distance.`);
        return;
      }
      if (!event) {
        issues.push(`${rowLabel} : distance de relais non ouverte sur cette compétition.`);
        return;
      }
      if (!relay.category) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : choisissez une categorie.`);
      }
      if (!relay.genderMode) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : choisissez Femmes, Hommes ou Mixte.`);
      }
      if (engagementCompetitionType(selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : temps d'engagement obligatoire.`);
      }
      if (relay.category && relay.genderMode) {
        const duplicateKey = [relay.eventCode, relay.category, relay.genderMode].join("|");
        if (!event.multipleRelaysAllowed && seenRelays.has(duplicateKey)) {
      issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relais identique existe déjà pour ce club.`);
        }
        seenRelays.add(duplicateKey);
      }
      const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds.filter(Boolean) : [];
      const uniqueMemberIds = Array.from(new Set(memberIds));
      if (uniqueMemberIds.length !== memberIds.length) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relayeur est sélectionné plusieurs fois dans le même relais.`);
      }
      const expectedLegs = engagementRelayLegCount(event);
      if (memberIds.length > 0 && memberIds.length !== expectedLegs) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : indiquez ${expectedLegs} relayeurs ou laissez la composition vide.`);
      }
      if (!memberIds.length || memberIds.length !== expectedLegs) return;
      const members = memberIds.map((id) => swimmers.get(id)).filter(Boolean);
      if (members.length !== memberIds.length) {
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relayeur n'est plus dans les nageurs de la compétition.`);
        return;
      }
      if (relay.genderMode === "female" && members.some((member) => member.sex !== "F")) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relais Femmes ne peut contenir que des nageuses.`);
      }
      if (relay.genderMode === "male" && members.some((member) => member.sex !== "M")) {
        issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relais Hommes ne peut contenir que des nageurs.`);
      }
      if (relay.genderMode === "mixed") {
        const invalidOrderIndex = members.findIndex((member, memberIndex) => member.sex !== (memberIndex % 2 === 0 ? "M" : "F"));
        if (invalidOrderIndex >= 0) {
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : ordre mixte attendu Homme - Femme - Homme - Femme.`);
        }
      }
      if (String(relay.category || "").startsWith("R")) {
        const nonMaster = members.find((member) => !/^M\d/.test(engagementSwimmerCategory(member, competitionDate)));
        if (nonMaster) {
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : la categorie ${relay.category} est reservee aux Masters.`);
        }
        const minimumAge = Number(String(relay.category || "").replace(/\D/g, "")) || 0;
        const totalAge = members.reduce((sum, member) => sum + engagementRelayMemberAge(member, competitionDate), 0);
        if (minimumAge && totalAge < minimumAge) {
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : total d'age ${totalAge}, minimum ${minimumAge}.`);
        }
      } else {
        const invalidMember = members.find((member) => !engagementRelaySwimmerAllowedForCategory(member, relay.category, competitionDate));
        if (invalidMember) {
          const name = invalidMember.name || [invalidMember.firstName, invalidMember.lastName].filter(Boolean).join(" ") || "un relayeur";
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : ${name} n'est pas autorise en relais ${engagementCategoryLabel(relay.category)}.`);
        }
      }
      members.forEach((member) => {
        const slotKey = [member.swimmerIndexId, event.distance, event.discipline].join("|");
        if (memberSlots.has(slotKey)) {
          const name = member.name || [member.firstName, member.lastName].filter(Boolean).join(" ") || "Un relayeur";
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : ${name} est déjà dans un relais de même distance et même nature.`);
        }
        memberSlots.add(slotKey);
      });
    });
    return issues;
  }

  function updateEngagementClubRelaysSummary() {
    const rows = selectedEngagementClubRelayRows();
    const count = rows.length;
    const incompleteCount = rows.filter(engagementClubRelayNeedsCompletion).length;
    const pendingCount = rows.filter((relay) => relay.draftPending === true).length;
    const issues = engagementClubRelayValidationIssues(rows.filter((relay) => relay.draftPending !== true));
    if (elements.engagementsClubRelaysSummary) {
      elements.engagementsClubRelaysSummary.textContent = incompleteCount
        ? `${count} relais - ${incompleteCount} à compléter.`
        : pendingCount
          ? `${count} relais - ${pendingCount} à valider.`
          : issues.length
            ? `${count} relais - ${issues.length} point${issues.length > 1 ? "s" : ""} a corriger.`
            : count
              ? `${count} relais.`
      : "Aucun relais sélectionné.";
    }
    renderEngagementClubSummary();
  }

  function currentEngagementClubSwimmersForSummary(entry = selectedEngagementClubEntry || {}) {
    const hasRenderedRows = elements.engagementsClubSwimmersList?.querySelector("[data-engagement-club-swimmer-row]");
    if (hasRenderedRows) return selectedEngagementClubSwimmerRows();
    return Array.isArray(entry.swimmers) ? entry.swimmers : [];
  }

  function currentEngagementClubOfficialCount(entry = selectedEngagementClubEntry || {}) {
    const hasRenderedRows = elements.engagementsClubOfficialsForm?.querySelector("[data-engagement-club-official-id]");
    return hasRenderedRows
      ? selectedEngagementClubOfficialIds().length
      : Array.isArray(entry.officials) ? entry.officials.length : 0;
  }

  function engagementClubSummaryTeamLeaderLabel(entry = selectedEngagementClubEntry || {}) {
    if (!engagementClubTeamComplete(entry)) return "Non renseigne";
    const teamLeader = entry.teamLeader || {};
    if (teamLeader.mode === "renounced") return "Renonciation au droit de réclamation";
    const name = [teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ") || "Chef d'équipe";
    const details = [
      teamLeader.licenseNumber ? `licence ${teamLeader.licenseNumber}` : "",
      teamLeader.externalClub ? clubDisplayLabel(teamLeader, { fallback: "club externe" }) : ""
    ].filter(Boolean).join(" - ");
    return details ? `${name} (${details})` : name;
  }

  function renderEngagementClubSummary(entry = selectedEngagementClubEntry || {}) {
    if (!elements.engagementsClubSummaryList && !elements.engagementsClubSummaryStatus) return;
    const competition = selectedEngagementCompetition || {};
    const fees = competition.fees || {};
    const noFees = fees.enabled === false;
    const swimmers = currentEngagementClubSwimmersForSummary(entry);
    const relays = selectedEngagementClubRelayRows().filter((relay) => !engagementClubRelayNeedsCompletion(relay));
    const officialsCount = currentEngagementClubOfficialCount(entry);
    const individualCount = swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0);
    const total = swimmers.length * engagementFeeAmount(fees.swimmerFee) +
      individualCount * engagementFeeAmount(fees.individualEventFee) +
      relays.length * engagementFeeAmount(fees.relayFee);
    const rows = [
      ["Chef d'équipe", engagementClubSummaryTeamLeaderLabel(entry)],
      ["Officiels", competition.officialsRequired === false ? "Non requis" : `${officialsCount} officiel${officialsCount > 1 ? "s" : ""}`],
      ["Nageurs", `${swimmers.length} nageur${swimmers.length > 1 ? "s" : ""}`],
      ["Courses individuelles", `${individualCount} course${individualCount > 1 ? "s" : ""}`],
      ["Relais", `${relays.length} relais`],
      ["Frais d'engagement", noFees ? "Aucun frais d'engagement" : formatEngagementFee(total)],
      ...(!noFees ? [["HelloAsso", engagementHelloAssoLabel(fees)]] : [])
    ];
    if (elements.engagementsClubSummaryStatus) {
      elements.engagementsClubSummaryStatus.textContent = "";
      elements.engagementsClubSummaryStatus.dataset.tone = "";
      elements.engagementsClubSummaryStatus.hidden = true;
    }
    if (elements.engagementsClubSummaryList) {
      elements.engagementsClubSummaryList.innerHTML = rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("");
    }
    if (elements.engagementsClubSummaryPdfButton) {
      const canGenerateRecap = Boolean(selectedEngagementCompetitionId && engagementClubTeamComplete(entry) && engagementClubEntryHasParticipants(entry));
      elements.engagementsClubSummaryPdfButton.disabled = !canGenerateRecap;
      elements.engagementsClubSummaryPdfButton.title = canGenerateRecap
        ? "Télécharger le récapitulatif PDF"
        : "Ajoutez au moins un nageur, un officiel ou un relais pour générer le récapitulatif.";
    }
  }

  function renderEngagementClubRelays() {
    const mount = elements.engagementsClubRelaysList;
    if (!mount) return;
    engagementClubRelaysRenderedCompetitionId = selectedEngagementCompetitionId;
    const writeLockReason = engagementClubWriteLockReason();
    const locked = Boolean(writeLockReason || !engagementClubTeamComplete());
    const relayEvents = engagementClubRelayEvents();
    const openWater = engagementCompetitionType(selectedEngagementCompetition) === "openWater";
    if (elements.engagementsClubRelaysForm) elements.engagementsClubRelaysForm.dataset.locked = locked ? "true" : "false";
    const pendingRelay = engagementClubRelaysDraft.some((relay) => relay.draftPending === true);
    if (elements.engagementsClubRelaysAddButton) {
      elements.engagementsClubRelaysAddButton.disabled = locked || !relayEvents.length || pendingRelay;
      elements.engagementsClubRelaysAddButton.title = pendingRelay ? "Validez le relais en cours avant d'en ajouter un autre." : "";
    }
    if (locked) {
      mount.innerHTML = `<p class="admin-engagements-empty">${escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
      updateEngagementClubRelaysSummary();
      return;
    }
    if (!relayEvents.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun relais ouvert sur cette compétition.</p>';
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
      const event = relayEvents.find((candidate) => candidate.code === relay.eventCode) || {};
      const categories = engagementRelayCategoryOptions(event);
      const category = categories.some(([code]) => code === relay.category) ? relay.category : "";
      const genderOptions = engagementRelayGenderOptions(event, category);
      const genderMode = genderOptions.length === 1
        ? genderOptions[0][0]
        : genderOptions.some(([mode]) => mode === relay.genderMode) ? relay.genderMode : "";
      const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : (relay.members || []).map((member) => member.swimmerIndexId).filter(Boolean);
      const relayLegs = engagementRelayLegCount(event);
      const memberCount = memberIds.filter(Boolean).length;
      const memberLabels = engagementRelayMemberShortLabels(memberIds);
      const memberSummary = engagementRelayMemberSummary(memberIds);
      const peopleWording = engagementRelayPeopleWording(genderMode);
      const sessionLabel = event.code ? engagementClubRelaySessionLabel(event.code, genderMode) : "";
      const relayPending = relay.draftPending === true;
      const relayReadonly = relay.persisted === true && !relayPending;
      const categoryLabel = engagementCategoryLabel(category) || category || "Non renseignée";
      const genderLabel = genderMode === "female" ? "Femmes" : genderMode === "male" ? "Hommes" : genderMode === "mixed" ? "Mixte" : "Non renseigné";
      const relayTimeRaw = relay.manualEntryTime || relay.entryTime || "";
      const relayTime = formatEngagementEntryTimeInput(relayTimeRaw) || relayTimeRaw;
      if (relayReadonly) {
        return `
          <div class="admin-engagements-club-relay-row admin-engagements-club-relay-row-readonly" data-engagement-club-relay-row data-engagement-club-relay-id="${escapeHtml(relayId)}" data-engagement-club-relay-readonly="true" data-engagement-club-relay-persisted="true" data-gender="${escapeHtml(genderMode)}">
            <div class="admin-engagements-club-relay-event">
              <strong>${escapeHtml(event.shortLabel || event.code || "Distance non renseignée")}</strong>
              ${sessionLabel ? `<small>${escapeHtml(sessionLabel)}</small>` : ""}
            </div>
            <span class="admin-engagements-club-relay-read-value"><small>Catégorie</small><strong>${escapeHtml(categoryLabel)}</strong></span>
            <span class="admin-engagements-club-relay-read-value"><small>Sexe</small><strong>${escapeHtml(genderLabel)}</strong></span>
            ${openWater ? "" : `<span class="admin-engagements-club-relay-read-value"><small>Temps</small><strong>${escapeHtml(relayTime || "-")}</strong></span>`}
            <div class="admin-engagements-club-relay-compose admin-engagements-club-relay-compose-readonly">
              <small>${escapeHtml(peopleWording.plural.slice(0, 1).toLocaleUpperCase("fr-FR") + peopleWording.plural.slice(1))}</small>
              ${memberLabels.length
                ? `<ul class="admin-engagements-club-relay-member-list">${memberLabels.map((label) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>`
                : `<strong>${escapeHtml(peopleWording.empty)}</strong>`}
            </div>
            <div class="admin-engagements-club-relay-row-actions">
              <button type="button" class="ghost-button compact admin-engagements-club-relay-edit" data-engagement-club-relay-edit aria-label="Modifier le relais" title="Modifier le relais">✎</button>
              <button type="button" class="ghost-button compact admin-engagements-club-relay-remove" data-engagement-club-relay-remove aria-label="Supprimer le relais" title="Supprimer le relais"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg></button>
            </div>
          </div>
        `;
      }
      return `
        <div class="admin-engagements-club-relay-row" data-engagement-club-relay-row data-engagement-club-relay-id="${escapeHtml(relayId)}" data-engagement-club-relay-notice="${escapeHtml(relay.draftNotice || "")}" data-engagement-club-relay-pending="${relayPending ? "true" : "false"}" data-engagement-club-relay-persisted="${relay.persisted === true ? "true" : "false"}" data-gender="${escapeHtml(genderMode)}">
          <div class="admin-engagements-club-relay-event">
            <select data-engagement-club-relay-event aria-label="Distance" required>
              <option value="" ${event.code ? "" : "selected"} disabled>Choisir une distance</option>
              ${relayEvents.map((option) => `<option value="${escapeHtml(option.code)}" ${option.code === event.code ? "selected" : ""}>${escapeHtml(option.shortLabel || option.code)}</option>`).join("")}
            </select>
            ${sessionLabel ? `<small>${escapeHtml(sessionLabel)}</small>` : ""}
          </div>
          <select data-engagement-club-relay-category aria-label="Categorie" required>
            <option value="" ${category ? "" : "selected"} disabled>Choisir une categorie</option>
            ${categories.map(([code, label]) => `<option value="${escapeHtml(code)}" ${code === category ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
          <select data-engagement-club-relay-gender aria-label="Sexe" data-gender="${escapeHtml(genderMode)}" required ${genderOptions.length === 1 ? "disabled data-relay-gender-locked=true" : ""}>
            <option value="" ${genderMode ? "" : "selected"} disabled>Choisir un sexe</option>
            ${genderOptions.map(([mode, label]) => `<option value="${escapeHtml(mode)}" ${mode === genderMode ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
          ${openWater ? "" : `<input type="text" maxlength="8" inputmode="numeric" placeholder="00:00.00" data-engagement-club-relay-time value="${escapeHtml(relayTime)}" aria-label="Temps d'engagement au format MM:SS.CC">`}
          <div class="admin-engagements-club-relay-compose">
            ${memberSummary ? `<small title="${escapeHtml(memberSummary)}">${escapeHtml(memberSummary)}${relayPending ? " · À valider" : ""}</small>` : ""}
            <button type="button" class="ghost-button compact" data-engagement-club-relay-compose="${escapeHtml(relayId)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>${memberCount ? `Modifier les ${peopleWording.plural}` : `Choisir les ${peopleWording.plural}`}</span>
            </button>
          </div>
          ${relay.persisted === true
            ? '<button type="button" class="ghost-button compact admin-engagements-club-relay-cancel-edit" data-engagement-club-relay-cancel-edit aria-label="Annuler les modifications" title="Annuler les modifications">×</button>'
            : '<button type="button" class="ghost-button compact admin-engagements-club-relay-remove" data-engagement-club-relay-remove aria-label="Supprimer le relais" title="Supprimer le relais"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg></button>'}
          ${relay.draftNotice ? `<small class="admin-engagements-club-relay-draft-notice" role="status">${escapeHtml(relay.draftNotice)}</small>` : ""}
        </div>
      `;
    }).join("")}
      </div>
    `;
    const issues = engagementClubRelayValidationIssues(rows.filter((relay) => relay.draftPending !== true));
    if (issues.length) {
      mount.insertAdjacentHTML("beforeend", `
        <div class="admin-engagements-club-relay-issues" role="status">
          <strong>Points à corriger avant enregistrement</strong>
          <ul>${issues.slice(0, 8).map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>
          ${issues.length > 8 ? `<small>+ ${issues.length - 8} autre${issues.length - 8 > 1 ? "s" : ""} point${issues.length - 8 > 1 ? "s" : ""}.</small>` : ""}
        </div>
      `);
    }
    setEngagementClubFormControlsLocked(elements.engagementsClubRelaysForm, false);
    mount.querySelectorAll("[data-relay-gender-locked=true]").forEach((control) => { control.disabled = true; });
    updateEngagementClubRelaysSummary();
  }

  function updateEngagementClubTeamFormMode() {
    const mode = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "";
    const declaringPerson = mode === "person";
    const renounced = mode === "renounced";
    const externalClub = elements.engagementsClubTeamExternal?.checked === true;
    if (elements.engagementsClubTeamPersonFields) elements.engagementsClubTeamPersonFields.hidden = !declaringPerson;
    if (elements.engagementsClubTeamRenunciationLabel) elements.engagementsClubTeamRenunciationLabel.hidden = !renounced;
    const knownPerson = engagementClubPeople.find((person) => person.id === elements.engagementsClubTeamPersonSelect?.value);
    const knownPersonReady = Boolean(knownPerson?.birthDate && knownPerson?.sex);
    const manualEntry = elements.engagementsClubTeamPersonFields?.dataset.manualEntry === "true";
    const showManualFields = declaringPerson && (Boolean(knownPerson) ? !knownPersonReady : manualEntry);
    setEngagementClubTeamManualFieldsVisible(showManualFields);
    const teamSearchLabel = elements.engagementsClubTeamPersonSearch?.closest("label");
    if (teamSearchLabel) teamSearchLabel.hidden = !declaringPerson || externalClub;
    if (elements.engagementsClubTeamPersonResults) elements.engagementsClubTeamPersonResults.hidden = !declaringPerson || externalClub || !String(elements.engagementsClubTeamPersonSearch?.value || "").trim();
    if (elements.engagementsClubTeamPersonCreate) elements.engagementsClubTeamPersonCreate.hidden = !declaringPerson || externalClub;
    if (elements.engagementsClubTeamSaveButton) {
      elements.engagementsClubTeamSaveButton.hidden = externalClub || !declaringPerson || (Boolean(knownPerson) && knownPersonReady) || (!knownPerson && !manualEntry);
      const validation = elements.engagementsClubTeamSaveButton.closest(".admin-engagements-club-team-validation");
      if (validation) validation.hidden = elements.engagementsClubTeamSaveButton.hidden;
    }
    [elements.engagementsClubTeamFirstName, elements.engagementsClubTeamLastName].forEach((field) => {
      if (field) field.required = showManualFields;
    });
    if (elements.engagementsClubTeamLicense) elements.engagementsClubTeamLicense.required = showManualFields && !externalClub;
    if (elements.engagementsClubTeamFirstNameLabel) elements.engagementsClubTeamFirstNameLabel.hidden = !showManualFields || externalClub;
    if (elements.engagementsClubTeamLastNameLabel) elements.engagementsClubTeamLastNameLabel.hidden = !showManualFields || externalClub;
    if (elements.engagementsClubTeamLicenseLabel) elements.engagementsClubTeamLicenseLabel.hidden = !showManualFields || externalClub;
    if (elements.engagementsClubTeamBirthDateLabel) elements.engagementsClubTeamBirthDateLabel.hidden = !showManualFields || externalClub;
    if (elements.engagementsClubTeamSexLabel) elements.engagementsClubTeamSexLabel.hidden = !showManualFields || externalClub;
    if (elements.engagementsClubTeamBirthDate) elements.engagementsClubTeamBirthDate.required = showManualFields && !externalClub;
    if (elements.engagementsClubTeamSex) elements.engagementsClubTeamSex.required = showManualFields && !externalClub;
    if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.required = renounced;
    if (elements.engagementsClubTeamExternalClubNameLabel) elements.engagementsClubTeamExternalClubNameLabel.hidden = true;
    if (elements.engagementsClubTeamExternalNote) elements.engagementsClubTeamExternalNote.hidden = true;
    if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.required = showManualFields && externalClub;
  }

  function renderEngagementClubEntry(entry = selectedEngagementClubEntry || {}) {
    selectedEngagementClubEntry = entry || {};
    engagementClubTeamEditing = !engagementClubTeamComplete(selectedEngagementClubEntry);
    rememberEngagementClubPersistedEntry(selectedEngagementClubEntry);
    engagementClubSwimmersRenderedCompetitionId = "";
    engagementClubEntriesRenderedCompetitionId = "";
    engagementClubRelaysRenderedCompetitionId = "";
    const writeLockReason = engagementClubWriteLockReason();
    engagementClubRelaysDraft = Array.isArray(selectedEngagementClubEntry.relays)
      ? selectedEngagementClubEntry.relays.map((relay) => ({ ...relay, persisted: true, draftPending: false, draftNotice: "" }))
      : [];
    const teamLeader = selectedEngagementClubEntry.teamLeader || {};
    if (elements.engagementsClubTeamForm) {
      const mode = teamLeader.mode === "renounced"
        ? "renounced"
        : engagementClubTeamComplete() && !teamLeader.externalClub ? "person" : "";
      elements.engagementsClubTeamForm.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
        .forEach((radio) => { radio.checked = radio.value === mode; });
    }
    if (elements.engagementsClubTeamFirstName) elements.engagementsClubTeamFirstName.value = teamLeader.firstName || "";
    if (elements.engagementsClubTeamLastName) elements.engagementsClubTeamLastName.value = teamLeader.lastName || "";
    if (elements.engagementsClubTeamBirthDate) elements.engagementsClubTeamBirthDate.value = teamLeader.birthDate || "";
    if (elements.engagementsClubTeamSex) elements.engagementsClubTeamSex.value = teamLeader.sex || "";
    if (elements.engagementsClubTeamLicense) elements.engagementsClubTeamLicense.value = teamLeader.licenseNumber || "";
    if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = teamLeader.externalClub === true;
    if (elements.engagementsClubTeamExternalClubId) elements.engagementsClubTeamExternalClubId.value = teamLeader.externalClub ? (teamLeader.clubId || "") : "";
    if (elements.engagementsClubTeamExternalClubName) elements.engagementsClubTeamExternalClubName.value = teamLeader.externalClub ? (teamLeader.clubName || "") : "";
    if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.checked = teamLeader.renunciationAccepted === true;
    if (elements.engagementsClubTeamPersonSearch) elements.engagementsClubTeamPersonSearch.value = "";
    renderEngagementClubTeamPersonOptions(findEngagementClubTeamPersonFromFields(teamLeader)?.id || "");
    updateEngagementClubTeamFormMode();
    setEngagementClubCompetitionFormsLocked(Boolean(writeLockReason));
    updateEngagementClubTeamLeaderActions(selectedEngagementClubEntry);

    if (elements.engagementsClubTeamSummary) {
      elements.engagementsClubTeamSummary.textContent = engagementClubTeamComplete()
        ? teamLeader.mode === "renounced"
          ? "Renonciation au droit de réclamation confirmée."
          : `Chef d'équipe : ${[teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ")}${teamLeader.externalClub ? ` · ${teamLeader.clubName || "hors du club"}` : ""}.`
        : "À renseigner avant de commencer les engagements.";
      elements.engagementsClubTeamSummary.dataset.complete = engagementClubTeamComplete() ? "true" : "false";
    }
    if (writeLockReason && elements.engagementsClubTeamMessage) {
      elements.engagementsClubTeamMessage.textContent = writeLockReason;
      elements.engagementsClubTeamMessage.dataset.tone = "error";
    }
    document.querySelectorAll("[data-club-step]").forEach((step) => {
      const locked = Boolean(writeLockReason || !engagementClubTeamComplete());
      step.dataset.locked = locked ? "true" : "false";
      if (step.dataset.clubStep === "officials") return;
      const firstParagraph = step.querySelector("p");
      if (firstParagraph) {
        const unlockedTexts = {
          officials: selectedEngagementCompetition?.officialsRequired === false
        ? "Les officiels ne sont pas requis pour cette compétition."
            : "Structure prete. La saisie des officiels arrive dans le lot suivant.",
        swimmers: "Sélectionnez les nageurs du club pour cette compétition.",
          entries: "Choisissez les courses individuelles des nageurs engagés.",
        relays: "Ajoutez les relais du club pour cette compétition.",
        summary: "Structure prête. Le récapitulatif se remplira avec les prochaines étapes."
        };
        firstParagraph.textContent = locked
        ? writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape."
          : unlockedTexts[step.dataset.clubStep] || "";
      }
    });
    if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(activeEngagementsDetailTab) && !canOpenClubEngagementTab(activeEngagementsDetailTab)) {
      setEngagementsDetailTab("team");
    } else {
      setEngagementsDetailTab(activeEngagementsDetailTab);
    }
  }

  function engagementClosureAutomationStatusLabel(status) {
    return {
      processing: "En cours",
      completed: "Terminée",
      completed_with_errors: "Terminée avec erreurs",
      failed: "Erreur"
    }[String(status || "")] || "En attente";
  }

  function engagementClosureAutomationStatusTone(status) {
    return {
      processing: "processing",
      completed: "sent",
      completed_with_errors: "warning",
      failed: "failed"
    }[String(status || "")] || "pending";
  }

  function formatEngagementAutomationDate(value) {
    return value ? formatDeadline(value).replace(/^Limite /, "") : "-";
  }

  function renderEngagementClosureAutomation(competition = {}) {
    const status = String(competition.closureAutomationStatus || "").trim();
    const summary = competition.closureAutomationSummary || {};
    const shouldShow = status || competition.entryStatus === "closed" || competition.closureRecapEmailsPreparedAt || competition.closureRecapEmailsSentAt;
    if (!shouldShow) return "";
    const updatedAt = summary.updatedAt || competition.closureAutomationCompletedAt || competition.closureAutomationFailedAt || competition.closureAutomationStartedAt;
    const rows = [
      ["Dernière exécution", formatEngagementAutomationDate(updatedAt)],
      ["Clubs traites", `${Number(summary.clubEntryCount || 0)}${Number(summary.skippedClubCount || 0) ? ` - ${Number(summary.skippedClubCount || 0)} ignore${Number(summary.skippedClubCount || 0) > 1 ? "s" : ""}` : ""}`],
      ["PDF", `${Number(summary.pdfGeneratedCount || 0)} généré${Number(summary.pdfGeneratedCount || 0) > 1 ? "s" : ""} - ${Number(summary.pdfReusedCount || 0)} déjà à jour`],
      ["TXT", `${Number(summary.txtGeneratedCount || 0)} généré - ${Number(summary.txtSentMailCount || 0)}/${Number(summary.txtAttemptedMailCount || 0)} envoyé${Number(summary.txtSentMailCount || 0) > 1 ? "s" : ""}`],
      ["E-mails", `${Number(summary.sentMailCount || 0)}/${Number(summary.attemptedMailCount || 0)} envoyé${Number(summary.sentMailCount || 0) > 1 ? "s" : ""}`]
    ];
    const errorCount = Number(summary.prepareErrorCount || 0) + Number(summary.sendErrorCount || 0);
    if (errorCount || competition.closureAutomationReason) {
      rows.push(["Erreurs", competition.closureAutomationReason || String(errorCount)]);
    }
    return `
      <article class="admin-engagements-closure-card" data-closure-status="${escapeHtml(engagementClosureAutomationStatusTone(status))}">
        <div class="admin-engagements-closure-card-head">
          <strong>Fermeture automatique</strong>
          <span>${escapeHtml(engagementClosureAutomationStatusLabel(status))}</span>
        </div>
        <dl>
          ${rows.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      </article>
    `;
  }

  async function loadEngagementClubRecapFiles({ force = false } = {}) {
    if (!isEngagementAdminMode() || !selectedEngagementCompetitionId || engagementClubRecapEntriesLoading) return;
    if (!force && engagementClubRecapEntriesCompetitionId === selectedEngagementCompetitionId) {
      renderEngagementClubRecapSelector();
      return;
    }
    engagementClubRecapEntriesLoading = true;
    renderEngagementClubRecapSelector();
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
    renderEngagementClubRecapSelector();
  }

  function renderEngagementClubRecapSelector() {
    const select = elements.engagementsClubPdfSelect;
    const button = elements.engagementsClubPdfDownloadButton;
    const status = elements.engagementsClubRecapFiles;
    if (!select || !button || !status) return;
    const previousValue = select.value;
    select.innerHTML = "";
    if (engagementClubRecapEntriesLoading) {
      select.append(new Option("Chargement des clubs…", ""));
      button.disabled = true;
      status.innerHTML = '<p class="admin-engagements-empty">Chargement des dossiers clubs…</p>';
      return;
    }
    if (!engagementClubRecapEntries.length) {
      select.append(new Option("Aucun club engagé", ""));
      button.disabled = true;
      status.innerHTML = '<p class="admin-engagements-empty">Aucun dossier club n’est disponible pour le moment.</p>';
      return;
    }
    engagementClubRecapEntries.forEach((entry) => {
      select.append(new Option(clubDisplayLabel(entry, { fallback: "Club" }), entry.clubId || ""));
    });
    select.value = Array.from(select.options).some((option) => option.value === previousValue)
      ? previousValue
      : select.options[0]?.value || "";
    button.disabled = !select.value;
    const selectedEntry = engagementClubRecapEntries.find((entry) => entry.clubId === select.value) || engagementClubRecapEntries[0];
    status.innerHTML = selectedEntry
      ? `<small>${escapeHtml(`${selectedEntry.swimmerCount || 0} nageur${Number(selectedEntry.swimmerCount || 0) > 1 ? "s" : ""} · ${selectedEntry.individualCount || 0} course${Number(selectedEntry.individualCount || 0) > 1 ? "s" : ""} · ${selectedEntry.relayCount || 0} relais`)}</small>`
      : "";
  }

  function engagementStatisticsTimeModeLabel(mode = "") {
    return {
      known: "Temps connu",
      manual: "Saisie manuelle",
      default595999: "Temps par défaut"
    }[String(mode || "")] || "";
  }

  function renderEngagementCompetitionStatistics() {
    const summary = elements.engagementsStatisticsSummary;
    const alerts = elements.engagementsStatisticsAlerts;
    const select = elements.engagementsStatisticsEventSelect;
    const eventRows = elements.engagementsStatisticsEventRows;
    const clubRows = elements.engagementsStatisticsClubRows;
    if (!summary || !alerts || !select || !eventRows || !clubRows) return;
    if (engagementCompetitionStatisticsLoading) {
      summary.innerHTML = '<p class="admin-engagements-empty">Calcul des statistiques en cours…</p>';
      alerts.innerHTML = "";
      eventRows.innerHTML = "";
      clubRows.innerHTML = "";
      if (elements.engagementsStatisticsRefreshButton) elements.engagementsStatisticsRefreshButton.disabled = true;
      return;
    }
    if (elements.engagementsStatisticsRefreshButton) elements.engagementsStatisticsRefreshButton.disabled = false;
    const statistics = engagementCompetitionStatistics;
    if (!statistics) {
      summary.innerHTML = '<p class="admin-engagements-empty">Ouvrez cet onglet pour calculer les statistiques.</p>';
      alerts.innerHTML = "";
      eventRows.innerHTML = "";
      clubRows.innerHTML = "";
      return;
    }
    if (statistics.error) {
      summary.innerHTML = `<p class="admin-portal-message" data-tone="error">Calcul impossible : ${escapeHtml(statistics.error)}</p>`;
      alerts.innerHTML = "";
      eventRows.innerHTML = "";
      clubRows.innerHTML = "";
      return;
    }
    const counts = statistics.counts || {};
    const openWater = engagementCompetitionType(selectedEngagementCompetition) === "openWater";
    const cards = [
      ["Participants", counts.swimmerCount || 0, `${counts.femaleCount || 0} F · ${counts.maleCount || 0} H`],
      ["Clubs", counts.clubCount || 0, "dossiers engagés"],
      ["Courses", counts.individualEntryCount || 0, "engagements individuels"],
      ["Relais", counts.relayCount || 0, "équipes engagées"],
      ["Officiels", counts.officialCount || 0, "déclarés"]
    ];
    summary.innerHTML = cards.map(([label, value, detail]) => `
      <article><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(detail)}</span></article>
    `).join("");
    const warningParts = [
      counts.incompleteClubCount ? `${counts.incompleteClubCount} dossier${counts.incompleteClubCount > 1 ? "s" : ""} à vérifier` : "",
      !openWater && counts.manualTimeCount ? `${counts.manualTimeCount} temps saisi${counts.manualTimeCount > 1 ? "s" : ""} manuellement` : "",
      !openWater && counts.defaultTimeCount ? `${counts.defaultTimeCount} temps par défaut 59:59.99` : "",
      counts.unknownSexCount ? `${counts.unknownSexCount} sexe${counts.unknownSexCount > 1 ? "s" : ""} non renseigné${counts.unknownSexCount > 1 ? "s" : ""}` : "",
      statistics.truncated ? "Liste détaillée limitée aux 10 000 premiers engagements" : ""
    ].filter(Boolean);
    alerts.innerHTML = warningParts.length
      ? `<div class="admin-engagements-statistics-warning"><strong>Points de contrôle</strong><span>${escapeHtml(warningParts.join(" · "))}</span></div>`
      : '<div class="admin-engagements-statistics-ok">Aucun point de contrôle détecté.</div>';

    const events = Array.isArray(statistics.events) ? statistics.events : [];
    const selectedEventCode = select.value;
    select.innerHTML = "";
    events.forEach((event) => {
      const suffix = event.type === "relay" ? `${event.entryCount || 0} relais` : `${event.entryCount || 0} engagé${Number(event.entryCount || 0) > 1 ? "s" : ""}`;
      select.append(new Option(`${event.label || event.eventCode} — ${suffix}`, event.eventCode || ""));
    });
    if (events.some((event) => event.eventCode === selectedEventCode)) select.value = selectedEventCode;
    const selectedEvent = events.find((event) => event.eventCode === select.value) || events[0];
    if (!selectedEvent) {
      select.append(new Option("Aucune course au programme", ""));
      eventRows.innerHTML = '<p class="admin-engagements-empty">Aucune course n’est disponible.</p>';
    } else if (!selectedEvent.rows?.length) {
      eventRows.innerHTML = '<p class="admin-engagements-empty">Aucun engagement pour cette course.</p>';
    } else if (selectedEvent.type === "relay") {
      eventRows.innerHTML = `
        <div class="admin-engagements-statistics-row admin-engagements-statistics-row-head" role="row"><span>Ordre</span><span>Club</span><span>Catégorie</span><span>Composition</span><span>${openWater ? "Inscription" : "Temps"}</span></div>
        ${selectedEvent.rows.map((row, index) => `
          <div class="admin-engagements-statistics-row" role="row">
            <span data-label="Ordre">${index + 1}</span><span data-label="Club"><strong>${escapeHtml(clubDisplayCode(row, "-"))}</strong></span>
            <span data-label="Catégorie">${escapeHtml([row.category, engagementProgramGenderModeDisplayLabel(row.genderMode, row.eventCode)].filter(Boolean).join(" · ") || "-")}</span>
            <span data-label="Composition">${escapeHtml((row.members || []).map((member) => [member.lastName, member.firstName].filter(Boolean).join(" ")).join(", ") || "-")}</span>
            <span data-label="${openWater ? "Inscription" : "Temps"}"><strong>${openWater ? "Oui" : escapeHtml(row.entryTime || "-")}</strong></span>
          </div>`).join("")}`;
    } else {
      const individualRows = selectedEvent.rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const sexOrder = { F: 0, M: 1 };
          return (sexOrder[String(left.row.sex || "").toUpperCase()] ?? 2) - (sexOrder[String(right.row.sex || "").toUpperCase()] ?? 2)
            || left.index - right.index;
        })
        .map(({ row }) => row);
      const groupedIndividualRows = [
        { sex: "F", label: "Femmes", tone: "female" },
        { sex: "M", label: "Hommes", tone: "male" },
        { sex: "", label: "Sexe à vérifier", tone: "unknown" }
      ].map((group) => ({
        ...group,
        rows: individualRows.filter((row) => String(row.sex || "").toUpperCase() === group.sex)
      })).filter((group) => group.rows.length);
      eventRows.innerHTML = `
        <div class="admin-engagements-statistics-row admin-engagements-statistics-row-head admin-engagements-statistics-individual-row" role="row"><span>Ordre</span><span>Nageur</span><span>Club</span><span>Catégorie</span><span>${openWater ? "Inscription" : "Temps"}</span></div>
        ${groupedIndividualRows.map((group) => `
          <div class="admin-engagements-statistics-gender-heading is-${escapeHtml(group.tone)}" role="row"><strong>${escapeHtml(group.label)}</strong><span>${group.rows.length} engagé${group.rows.length > 1 ? "s" : ""}</span></div>
          ${group.rows.map((row, index) => `
          <div class="admin-engagements-statistics-row admin-engagements-statistics-individual-row" role="row" data-sex="${escapeHtml(group.sex || "unknown")}">
            <span data-label="Ordre">${index + 1}</span>
            <span data-label="Nageur"><strong>${escapeHtml([row.lastName, row.firstName].filter(Boolean).join(" ") || "-")}</strong></span>
            <span data-label="Club"><strong>${escapeHtml(clubDisplayCode(row, "-"))}</strong></span>
            <span data-label="Catégorie">${escapeHtml(row.category || "-")}</span>
            <span data-label="${openWater ? "Inscription" : "Temps"}" ${openWater ? "" : `title="${escapeHtml(engagementStatisticsTimeModeLabel(row.entryTimeMode))}"`}><strong>${openWater ? "Oui" : escapeHtml(row.entryTime || "-")}</strong></span>
          </div>`).join("")}`).join("")}`;
    }
    const clubs = Array.isArray(statistics.clubs) ? statistics.clubs : [];
    clubRows.innerHTML = clubs.length ? `
      <div class="admin-engagements-statistics-club-row admin-engagements-statistics-row-head" role="row"><span>Club</span><span>Nageurs</span><span>Courses</span><span>Relais</span><span>Officiels</span><span>Dernière modification</span></div>
      ${clubs.map((club) => `
        <div class="admin-engagements-statistics-club-row" role="row">
          <span data-label="Club"><strong>${escapeHtml(clubDisplayCode(club, "-"))}</strong><small>${escapeHtml(club.clubName || accessClubFromId(club.clubId)?.clubName || "")}</small></span>
          <span data-label="Nageurs">${escapeHtml(`${club.swimmerCount || 0} (${club.femaleCount || 0} F · ${club.maleCount || 0} H)`)}</span>
          <span data-label="Courses">${escapeHtml(String(club.individualCount || 0))}</span><span data-label="Relais">${escapeHtml(String(club.relayCount || 0))}</span>
          <span data-label="Officiels">${escapeHtml(String(club.officialCount || 0))}</span>
          <span data-label="Dernière modification">${escapeHtml(club.updatedAt ? formatDeadline(club.updatedAt).replace(/^Limite /, "") : "-")}</span>
        </div>`).join("")}` : '<p class="admin-engagements-empty">Aucun club engagé pour le moment.</p>';
  }

  async function loadEngagementCompetitionStatistics({ force = false } = {}) {
    if (!isEngagementAdminMode() || !selectedEngagementCompetitionId || engagementCompetitionStatisticsLoading) return;
    if (!force && engagementCompetitionStatisticsCompetitionId === selectedEngagementCompetitionId && engagementCompetitionStatistics) {
      renderEngagementCompetitionStatistics();
      return;
    }
    engagementCompetitionStatisticsLoading = true;
    renderEngagementCompetitionStatistics();
    try {
      engagementCompetitionStatistics = await callFunction("getEngagementCompetitionStatistics", {
        competitionId: selectedEngagementCompetitionId,
        force
      });
      engagementCompetitionStatisticsCompetitionId = selectedEngagementCompetitionId;
      if (elements.engagementsStatisticsUpdatedAt) {
        elements.engagementsStatisticsUpdatedAt.textContent = `Actualisé ${formatDeadline(engagementCompetitionStatistics.generatedAt).replace(/^Limite /, "")}`;
      }
    } catch (error) {
      engagementCompetitionStatistics = { error: error?.message || String(error) };
      engagementCompetitionStatisticsCompetitionId = selectedEngagementCompetitionId;
    } finally {
      engagementCompetitionStatisticsLoading = false;
    }
    renderEngagementCompetitionStatistics();
  }

  function engagementMailJobTypeLabel(type) {
    return {
      opening_notification: "Ouverture",
      entries_txt: "TXT informatique",
      club_recap_pdf: "PDF club",
      competition_documents: "Documents"
    }[String(type || "")] || "Mail";
  }

  function renderEngagementMailJobs() {
    const mount = elements.engagementsMailJobsList;
    if (!mount) return;
    if (!isEngagementAdminMode()) {
      mount.innerHTML = "";
      return;
    }
    if (engagementMailJobsLoading && !engagementMailJobs.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement du suivi des envois…</p>';
      return;
    }
    if (!selectedEngagementCompetitionId) {
      mount.innerHTML = "";
      return;
    }
    if (!engagementMailJobsCompetitionId || engagementMailJobsCompetitionId !== selectedEngagementCompetitionId) {
      mount.innerHTML = '<p class="admin-engagements-empty">Suivi des envois à charger.</p>';
      return;
    }
    if (!engagementMailJobs.length) {
      mount.innerHTML = '<p class="admin-engagements-empty">Aucun courriel envoyé pour le moment.</p>';
      return;
    }
    const sentCount = engagementMailJobs.filter((job) => job.status === "sent").length;
    const readyCount = engagementMailJobs.filter((job) => job.status === "ready").length;
    const failedCount = engagementMailJobs.filter((job) => job.status === "failed").length;
    const blockedCount = engagementMailJobs.filter((job) => job.status === "blocked_missing_config").length;
    const statusParts = [
      readyCount ? `${readyCount} en attente d'envoi` : "",
          sentCount ? `${sentCount} envoyé${sentCount > 1 ? "s" : ""}` : "",
      failedCount ? `${failedCount} erreur${failedCount > 1 ? "s" : ""}` : "",
      blockedCount ? `${blockedCount} configuration manquante` : ""
    ].filter(Boolean);
    mount.innerHTML = `
      <div class="admin-engagements-mail-jobs-head">
        <strong>Courriels</strong>
        <small>${engagementMailJobs.length}${engagementMailJobsTotalCount > engagementMailJobs.length ? ` sur ${engagementMailJobsTotalCount}` : ""} courriel${engagementMailJobsTotalCount > 1 || engagementMailJobs.length > 1 ? "s" : ""}${statusParts.length ? ` · ${statusParts.join(" · ")}` : ""}</small>
      </div>
      <div class="admin-engagements-mail-jobs-table" role="table" aria-label="Suivi des envois">
        <div class="admin-engagements-mail-jobs-row admin-engagements-mail-jobs-row-head" role="row">
          <span role="columnheader">Type</span>
          <span role="columnheader">Destinataire</span>
          <span role="columnheader">Club</span>
          <span role="columnheader">Statut</span>
        </div>
        ${engagementMailJobs.map((job) => `
          <div class="admin-engagements-mail-jobs-row" role="row" data-mail-status="${escapeHtml(job.status || "")}">
            <span role="cell">${escapeHtml(engagementMailJobTypeLabel(job.type))}</span>
            <span role="cell">
              <strong>${escapeHtml(job.toEmail || "-")}</strong>
              <small>${escapeHtml(job.subject || "-")}</small>
            </span>
            <span role="cell">${escapeHtml(clubDisplayLabel(job, { fallback: "-" }))}</span>
            <span role="cell">
              <span class="admin-engagements-mail-status">${escapeHtml({ ready: "En attente d'envoi", sent: "Envoyé", failed: "En erreur", blocked_missing_config: "Configuration manquante", cancelled_no_participants: "Annulé — aucun participant" }[job.status] || job.statusLabel || job.status || "Non envoyé")}</span>
              <small>${escapeHtml(job.updatedAt ? formatDeadline(job.updatedAt).replace(/^Limite /, "") : "")}</small>
            </span>
          </div>
        `).join("")}
      </div>
      ${engagementMailJobsHasMore ? `<button class="ghost-button" type="button" data-engagement-mail-jobs-more ${engagementMailJobsLoading ? "disabled" : ""}>${engagementMailJobsLoading ? "Chargement…" : "Afficher plus de courriels"}</button>` : ""}
    `;
  }

  async function loadEngagementMailJobs({ force = false, append = false } = {}) {
    if (!isEngagementAdminMode() || !selectedEngagementCompetitionId || engagementMailJobsLoading) return;
    if (!force && !append && engagementMailJobsCompetitionId === selectedEngagementCompetitionId) {
      renderEngagementMailJobs();
      return;
    }
    engagementMailJobsLoading = true;
    if (force || engagementMailJobsCompetitionId !== selectedEngagementCompetitionId) {
      engagementMailJobs = [];
      engagementMailJobsCursor = null;
      engagementMailJobsHasMore = false;
      engagementMailJobsTotalCount = 0;
    }
    renderEngagementMailJobs();
    try {
      const result = await callFunction("listEngagementCompetitionMailJobs", {
        competitionId: selectedEngagementCompetitionId,
        pageSize: 100,
        ...(append && engagementMailJobsCursor ? { cursor: engagementMailJobsCursor } : {})
      });
      const nextJobs = Array.isArray(result.jobs) ? result.jobs : [];
      engagementMailJobs = append ? [...engagementMailJobs, ...nextJobs] : nextJobs;
      engagementMailJobsCursor = result.nextCursor || null;
      engagementMailJobsHasMore = result.hasMore === true;
      if (result.totalCount !== null && result.totalCount !== undefined && Number.isFinite(Number(result.totalCount))) {
        engagementMailJobsTotalCount = Number(result.totalCount);
      }
      engagementMailJobsCompetitionId = selectedEngagementCompetitionId;
    } catch (error) {
      if (!append) {
        engagementMailJobs = [];
        engagementMailJobsCompetitionId = selectedEngagementCompetitionId;
        if (elements.engagementsMailJobsList) {
          elements.engagementsMailJobsList.innerHTML = `<p class="admin-portal-message" data-tone="error">Lecture des e-mails préparés impossible : ${escapeHtml(error?.message || error)}</p>`;
        }
        return;
      }
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Lecture de la page suivante impossible : ${error?.message || error}`;
      }
    } finally {
      engagementMailJobsLoading = false;
    }
    renderEngagementMailJobs();
  }

  const ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
  const ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT = 20;
  const ENGAGEMENT_COMPETITION_DOCUMENT_EXTENSION_PATTERN = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp|jpe?g|png|zip)$/i;

  function engagementCompetitionDocumentCategoryLabel(category = "") {
    return {
      poster: "Affiche",
      circular: "Circulaire",
      rules: "Règlement",
      information: "Note d'information",
      access: "Plan / accès",
      other: "Autre"
    }[String(category || "")] || "Autre";
  }

  function engagementCompetitionDocumentCategoryOptions(selected = "other") {
    return Object.entries({
      poster: "Affiche",
      circular: "Circulaire",
      rules: "Règlement",
      information: "Note d'information",
      access: "Plan / accès",
      other: "Autre"
    }).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
  }

  function engagementCompetitionDocumentFileSize(size = 0) {
    const bytes = Math.max(0, Number(size) || 0);
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  }

  function engagementCompetitionDocumentTypeLabel(fileName = "") {
    return String(fileName || "").split(".").pop()?.toUpperCase() || "FICHIER";
  }

  function renderEngagementCompetitionDocumentDrafts() {
    const mount = elements.engagementsDocumentDrafts;
    if (!mount) return;
    const documents = Array.isArray(selectedEngagementCompetition?.clubDocuments) ? selectedEngagementCompetition.clubDocuments : [];
    const editing = documents.find((document) => document.id === engagementCompetitionDocumentEditingId) || null;
    const drafts = editing
      ? [{
          file: engagementCompetitionDocumentFiles[0] || null,
          title: editing.title || "",
          category: editing.category || "other",
          description: editing.description || "",
          fileName: engagementCompetitionDocumentFiles[0]?.name || editing.fileName || ""
        }]
      : engagementCompetitionDocumentFiles.map((file) => ({
          file,
          title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
          category: "other",
          description: "",
          fileName: file.name
        }));
    mount.innerHTML = drafts.map((draft, index) => `
      <div class="admin-engagements-document-draft" data-engagement-document-draft="${index}">
        <small class="admin-engagements-document-draft-file">${escapeHtml(draft.fileName)}${draft.file ? ` · ${escapeHtml(engagementCompetitionDocumentFileSize(draft.file.size))}` : " · fichier actuel conservé"}</small>
        <label>Titre<input type="text" maxlength="160" required data-engagement-document-title value="${escapeHtml(draft.title)}"></label>
        <label>Catégorie<select data-engagement-document-category>${engagementCompetitionDocumentCategoryOptions(draft.category)}</select></label>
        <label>Description facultative<textarea maxlength="500" rows="2" data-engagement-document-description>${escapeHtml(draft.description)}</textarea></label>
      </div>
    `).join("");
    if (elements.engagementsDocumentNotifyLabel) {
      elements.engagementsDocumentNotifyLabel.hidden = Boolean(editing && !engagementCompetitionDocumentFiles.length);
    }
    if (elements.engagementsDocumentSubmitButton) {
      elements.engagementsDocumentSubmitButton.textContent = editing
        ? (engagementCompetitionDocumentFiles.length ? "Remplacer le document" : "Enregistrer")
        : `Mettre en ligne${drafts.length > 1 ? ` (${drafts.length})` : ""}`;
    }
  }

  function openEngagementCompetitionDocumentForm(documentId = "") {
    if (!isEngagementAdminMode() || engagementCompetitionDocumentSaving) return;
    engagementCompetitionDocumentEditingId = String(documentId || "");
    engagementCompetitionDocumentFiles = [];
    if (elements.engagementsDocumentFiles) {
      elements.engagementsDocumentFiles.value = "";
      elements.engagementsDocumentFiles.multiple = !engagementCompetitionDocumentEditingId;
      elements.engagementsDocumentFiles.required = !engagementCompetitionDocumentEditingId;
    }
    if (elements.engagementsDocumentNotify) elements.engagementsDocumentNotify.checked = false;
    if (elements.engagementsDocumentFormMessage) {
      elements.engagementsDocumentFormMessage.textContent = "";
      elements.engagementsDocumentFormMessage.dataset.tone = "";
    }
    if (elements.engagementsDocumentForm) elements.engagementsDocumentForm.hidden = false;
    if (elements.engagementsDocumentAddButton) elements.engagementsDocumentAddButton.hidden = true;
    renderEngagementCompetitionDocumentDrafts();
    elements.engagementsDocumentFiles?.focus();
  }

  function closeEngagementCompetitionDocumentForm() {
    engagementCompetitionDocumentEditingId = "";
    engagementCompetitionDocumentFiles = [];
    if (elements.engagementsDocumentFiles) elements.engagementsDocumentFiles.value = "";
    if (elements.engagementsDocumentDrafts) elements.engagementsDocumentDrafts.innerHTML = "";
    if (elements.engagementsDocumentNotify) elements.engagementsDocumentNotify.checked = false;
    if (elements.engagementsDocumentForm) elements.engagementsDocumentForm.hidden = true;
    if (elements.engagementsDocumentAddButton) elements.engagementsDocumentAddButton.hidden = false;
  }

  function engagementCompetitionDocumentDraftValues() {
    return Array.from(elements.engagementsDocumentDrafts?.querySelectorAll("[data-engagement-document-draft]") || []).map((row) => ({
      title: row.querySelector("[data-engagement-document-title]")?.value.trim() || "",
      category: row.querySelector("[data-engagement-document-category]")?.value || "other",
      description: row.querySelector("[data-engagement-document-description]")?.value.trim() || ""
    }));
  }

  function readEngagementCompetitionDocumentFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
      reader.addEventListener("error", () => reject(reader.error || new Error("Lecture du fichier impossible.")), { once: true });
      reader.readAsDataURL(file);
    });
  }

  function handleEngagementCompetitionDocumentFiles() {
    const files = Array.from(elements.engagementsDocumentFiles?.files || []);
    const invalid = files.find((file) => !ENGAGEMENT_COMPETITION_DOCUMENT_EXTENSION_PATTERN.test(file.name) || file.size <= 0 || file.size > ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES);
    const currentCount = Array.isArray(selectedEngagementCompetition?.clubDocuments) ? selectedEngagementCompetition.clubDocuments.length : 0;
    const tooMany = !engagementCompetitionDocumentEditingId && currentCount + files.length > ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT;
    if (invalid || tooMany) {
      engagementCompetitionDocumentFiles = [];
      if (elements.engagementsDocumentFiles) elements.engagementsDocumentFiles.value = "";
      if (elements.engagementsDocumentFormMessage) {
        elements.engagementsDocumentFormMessage.textContent = tooMany
          ? `La compétition est limitée à ${ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT} documents actifs.`
          : `${invalid?.name || "Ce fichier"} est vide, dépasse 10 Mo ou utilise un format non autorisé.`;
        elements.engagementsDocumentFormMessage.dataset.tone = "error";
      }
      renderEngagementCompetitionDocumentDrafts();
      return;
    }
    engagementCompetitionDocumentFiles = engagementCompetitionDocumentEditingId ? files.slice(0, 1) : files;
    if (elements.engagementsDocumentFormMessage) elements.engagementsDocumentFormMessage.textContent = "";
    renderEngagementCompetitionDocumentDrafts();
  }

  function updateSelectedEngagementCompetitionDocuments(documents = []) {
    selectedEngagementCompetition = {
      ...(selectedEngagementCompetition || {}),
      clubDocuments: Array.isArray(documents) ? documents : []
    };
    renderEngagementDocuments(selectedEngagementCompetition);
  }

  async function saveEngagementCompetitionDocuments(event) {
    event?.preventDefault();
    if (!selectedEngagementCompetitionId || !isEngagementAdminMode() || engagementCompetitionDocumentSaving) return;
    const editingDocument = (selectedEngagementCompetition?.clubDocuments || [])
      .find((document) => document.id === engagementCompetitionDocumentEditingId) || null;
    const values = engagementCompetitionDocumentDraftValues();
    if (!values.length || values.some((draft) => !draft.title)) {
      if (elements.engagementsDocumentFormMessage) {
        elements.engagementsDocumentFormMessage.textContent = engagementCompetitionDocumentEditingId
          ? "Renseignez le titre du document."
          : "Choisissez au moins un fichier et renseignez chaque titre.";
        elements.engagementsDocumentFormMessage.dataset.tone = "error";
      }
      return;
    }
    const publishesFile = engagementCompetitionDocumentFiles.length > 0;
    const notify = publishesFile && elements.engagementsDocumentNotify?.checked === true;
    if (notify) {
      try {
        if (elements.engagementsDocumentFormMessage) elements.engagementsDocumentFormMessage.textContent = "Calcul des destinataires…";
        const audience = await callFunction("previewEngagementCompetitionDocumentNotification", {
          competitionId: selectedEngagementCompetitionId
        });
        const confirmed = global.confirm(
          `Mettre en ligne ${engagementCompetitionDocumentFiles.length} document${engagementCompetitionDocumentFiles.length > 1 ? "s" : ""} et envoyer un e-mail à ${Number(audience.recipientCount || 0)} administrateur${Number(audience.recipientCount || 0) > 1 ? "s" : ""} de ${Number(audience.clubCount || 0)} club${Number(audience.clubCount || 0) > 1 ? "s" : ""} ?`
        );
        if (!confirmed) {
          if (elements.engagementsDocumentFormMessage) elements.engagementsDocumentFormMessage.textContent = "Mise en ligne annulée.";
          return;
        }
      } catch (error) {
        if (elements.engagementsDocumentFormMessage) {
          elements.engagementsDocumentFormMessage.textContent = `Calcul des destinataires impossible : ${error?.message || error}`;
          elements.engagementsDocumentFormMessage.dataset.tone = "error";
        }
        return;
      }
    }
    engagementCompetitionDocumentSaving = true;
    if (elements.engagementsDocumentSubmitButton) elements.engagementsDocumentSubmitButton.disabled = true;
    if (elements.engagementsDocumentCancelButton) elements.engagementsDocumentCancelButton.disabled = true;
    if (elements.engagementsDocumentFiles) elements.engagementsDocumentFiles.disabled = true;
    const publishedIds = [];
    const errors = [];
    try {
      if (editingDocument && !publishesFile) {
        if (elements.engagementsDocumentFormMessage) elements.engagementsDocumentFormMessage.textContent = "Enregistrement…";
        const result = await callFunction("updateEngagementCompetitionDocument", {
          competitionId: selectedEngagementCompetitionId,
          documentId: editingDocument.id,
          ...values[0]
        });
        updateSelectedEngagementCompetitionDocuments(result.documents || []);
      } else {
        for (let index = 0; index < engagementCompetitionDocumentFiles.length; index += 1) {
          const file = engagementCompetitionDocumentFiles[index];
          const draft = values[editingDocument ? 0 : index];
          if (elements.engagementsDocumentFormMessage) {
            elements.engagementsDocumentFormMessage.textContent = `Mise en ligne ${index + 1}/${engagementCompetitionDocumentFiles.length} : ${file.name}`;
          }
          try {
            const fileDataUrl = await readEngagementCompetitionDocumentFile(file);
            const result = await callFunction("uploadEngagementCompetitionDocument", {
              competitionId: selectedEngagementCompetitionId,
              ...(editingDocument ? { documentId: editingDocument.id } : {}),
              ...draft,
              fileName: file.name,
              fileDataUrl
            });
            publishedIds.push(result.documentId);
            updateSelectedEngagementCompetitionDocuments(result.documents || []);
          } catch (error) {
            errors.push(`${file.name} : ${error?.message || error}`);
          }
        }
      }
      let notification = null;
      if (notify && publishedIds.length) {
        if (elements.engagementsDocumentFormMessage) elements.engagementsDocumentFormMessage.textContent = "Envoi de la notification aux clubs…";
        try {
          notification = await callFunction("notifyEngagementCompetitionDocuments", {
            competitionId: selectedEngagementCompetitionId,
            documentIds: publishedIds
          });
          engagementMailJobsCompetitionId = "";
        } catch (error) {
          errors.push(`Notification : ${error?.message || error}`);
        }
      }
      if (!errors.length) {
        closeEngagementCompetitionDocumentForm();
      } else if (elements.engagementsDocumentFormMessage) {
        elements.engagementsDocumentFormMessage.textContent = errors.join(" · ");
        elements.engagementsDocumentFormMessage.dataset.tone = "error";
      }
      renderEngagementDocuments(selectedEngagementCompetition || {});
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = errors.length
          ? `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne. ${errors.join(" · ")}`
          : notification
            ? `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne · ${Number(notification.sentCount || 0)} e-mail${Number(notification.sentCount || 0) > 1 ? "s" : ""} envoyé${Number(notification.sentCount || 0) > 1 ? "s" : ""}${notification.configurationMissing ? " · configuration e-mail manquante" : Number(notification.errorCount || 0) ? ` · ${notification.errorCount} en erreur` : ""}.`
            : editingDocument && !publishesFile
              ? "Informations du document enregistrées."
              : `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne.`;
        elements.engagementsDocumentsSummary.dataset.tone = errors.length || notification?.configurationMissing || Number(notification?.errorCount || 0) ? "warning" : "success";
      }
    } finally {
      engagementCompetitionDocumentSaving = false;
      if (elements.engagementsDocumentSubmitButton) elements.engagementsDocumentSubmitButton.disabled = false;
      if (elements.engagementsDocumentCancelButton) elements.engagementsDocumentCancelButton.disabled = false;
      if (elements.engagementsDocumentFiles) elements.engagementsDocumentFiles.disabled = false;
    }
  }

  async function deleteEngagementCompetitionDocument(documentId = "") {
    const document = (selectedEngagementCompetition?.clubDocuments || []).find((item) => item.id === documentId);
    if (!document || engagementCompetitionDocumentSaving) return;
    if (!global.confirm(`Supprimer définitivement « ${document.title || document.fileName} » ? Les clubs ne seront pas informés.`)) return;
    engagementCompetitionDocumentSaving = true;
    try {
      const result = await callFunction("deleteEngagementCompetitionDocument", {
        competitionId: selectedEngagementCompetitionId,
        documentId
      });
      updateSelectedEngagementCompetitionDocuments(result.documents || []);
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = result.storageDeleted === false
          ? "Document retiré de la compétition. Le nettoyage du fichier de stockage devra être vérifié."
          : "Document supprimé.";
        elements.engagementsDocumentsSummary.dataset.tone = result.storageDeleted === false ? "warning" : "success";
      }
    } catch (error) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsDocumentsSummary.dataset.tone = "error";
      }
    } finally {
      engagementCompetitionDocumentSaving = false;
    }
  }

  function renderEngagementSharedDocuments(competition = {}) {
    const documents = Array.isArray(competition.clubDocuments) ? competition.clubDocuments : [];
    const adminMode = isEngagementAdminMode();
    if (elements.engagementsSharedDocumentsTitle) {
      elements.engagementsSharedDocumentsTitle.textContent = adminMode ? "Documents de la compétition" : "Documents disponibles";
    }
    if (elements.engagementsSharedDocumentsCount) {
      elements.engagementsSharedDocumentsCount.textContent = documents.length
        ? adminMode
          ? `${documents.length} document${documents.length > 1 ? "s" : ""} disponible${documents.length > 1 ? "s" : ""} · maximum ${ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT}`
          : `${documents.length} document${documents.length > 1 ? "s" : ""}`
        : "Affiches, circulaires, règlements et informations utiles.";
    }
    if (elements.engagementsDocumentAddButton) {
      elements.engagementsDocumentAddButton.disabled = documents.length >= ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT;
      elements.engagementsDocumentAddButton.title = documents.length >= ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT
        ? `La limite de ${ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT} documents est atteinte.`
        : "";
    }
    if (!elements.engagementsSharedDocumentsList) return;
    elements.engagementsSharedDocumentsList.innerHTML = documents.length ? documents.map((document) => {
      const uploader = adminMode && document.uploadedBy
        ? [document.uploadedBy.name || document.uploadedBy.email, document.uploadedBy.name && document.uploadedBy.email ? document.uploadedBy.email : ""].filter(Boolean).join(" · ")
        : "";
      return `
        <article class="admin-engagements-shared-document-card">
          <div class="admin-engagements-shared-document-main">
            <div class="admin-engagements-shared-document-badges">
              <span>${escapeHtml(engagementCompetitionDocumentCategoryLabel(document.category))}</span>
              <span>${escapeHtml(engagementCompetitionDocumentTypeLabel(document.fileName))}</span>
              <span>${escapeHtml(engagementCompetitionDocumentFileSize(document.size))}</span>
            </div>
            <a href="${escapeHtml(document.url || "#")}" target="_blank" rel="noopener">${escapeHtml(document.title || document.fileName || "Document")}</a>
            ${document.description ? `<p>${escapeHtml(document.description)}</p>` : ""}
            <small class="admin-engagements-shared-document-meta">Mis en ligne ${escapeHtml(document.updatedAt ? formatDeadline(document.updatedAt).replace(/^Limite /, "") : "")}${uploader ? ` · par ${escapeHtml(uploader)}` : ""}</small>
          </div>
          ${adminMode ? `
            <div class="admin-engagements-shared-document-actions">
              <a class="ghost-button compact" href="${escapeHtml(document.url || "#")}" target="_blank" rel="noopener">Télécharger</a>
              <button class="ghost-button compact" type="button" data-engagement-document-edit="${escapeHtml(document.id)}">Modifier / remplacer</button>
              <button class="ghost-button compact admin-engagements-danger-button" type="button" data-engagement-document-delete="${escapeHtml(document.id)}">Supprimer</button>
            </div>` : ""}
        </article>`;
    }).join("") : '<p class="admin-engagements-empty">Aucun document mis en ligne pour cette compétition.</p>';
  }

  function renderEngagementDocuments(competition = selectedEngagementCompetition || {}) {
    const adminMode = isEngagementAdminMode();
    const openWater = engagementCompetitionType(competition) === "openWater";
    const documentsHead = elements.engagementsDocumentsTitle?.closest(".admin-engagements-documents-head");
    if (documentsHead) documentsHead.hidden = !adminMode;
    if (elements.engagementsGenerateTxtExportButton) {
      elements.engagementsGenerateTxtExportButton.disabled = openWater;
      elements.engagementsGenerateTxtExportButton.title = openWater
        ? "Export eau libre en attente de validation du format TXT."
        : "";
    }
    if (elements.engagementsDocumentsTitle) elements.engagementsDocumentsTitle.textContent = adminMode ? "GED" : "Documents";
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = adminMode
        ? openWater
          ? "Gérez les documents destinés aux clubs. L’export TXT eau libre sera ajouté après validation de son format."
          : "Gérez les documents destinés aux clubs et téléchargez les fichiers techniques."
        : "Consultez et téléchargez les documents utiles de la compétition.";
      elements.engagementsDocumentsSummary.dataset.tone = "";
    }
    if (elements.engagementsComputerEmailLabel) {
      elements.engagementsComputerEmailLabel.textContent = competition.computerEmail
        ? `Informatique : ${competition.computerEmail}`
        : "Email du responsable informatique non renseigne";
      elements.engagementsComputerEmailLabel.hidden = !adminMode || !competition.computerEmail;
    }
    if (elements.engagementsDocumentsList) {
      elements.engagementsDocumentsList.innerHTML = renderEngagementClosureAutomation(competition);
    }
    if (elements.engagementsGeneratedFiles) {
      const files = Array.isArray(competition.generatedFiles) ? competition.generatedFiles : [];
      elements.engagementsGeneratedFiles.innerHTML = files.length
        ? files.map((file) => `<a href="${escapeHtml(file.url || "#")}" target="_blank" rel="noopener">${escapeHtml(file.name || "Document")}</a>`).join("")
        : `<p class="admin-engagements-empty">Aucun fichier disponible pour le moment.</p>`;
    }
    renderEngagementSharedDocuments(competition);
    renderEngagementClubRecapSelector();
    renderEngagementMailJobs();
  }

  function updateSelectedEngagementDocumentStatus(key, status, generatedAt = new Date().toISOString()) {
    if (!key || !selectedEngagementCompetition) return;
    selectedEngagementCompetition = {
      ...selectedEngagementCompetition,
      documents: {
        ...(selectedEngagementCompetition.documents || {}),
        [key]: {
          ...((selectedEngagementCompetition.documents || {})[key] || {}),
          status,
          generatedAt
        }
      }
    };
    renderEngagementDocuments(selectedEngagementCompetition);
  }

  function engagementEventSummary(events = []) {
    const eventList = Array.isArray(events) ? events : [];
    const individualCount = eventList.filter((event) => event.type === "individual").length;
    const relayCount = eventList.filter((event) => event.type === "relay").length;
    if (!eventList.length) return "Aucune épreuve sélectionnée";
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
    return `${eventCount} épreuve${eventCount > 1 ? "s" : ""} - ${sessionCount} session${sessionCount > 1 ? "s" : ""}`;
  }

  function engagementEventsCompactSummary(events = []) {
    const eventList = Array.isArray(events) ? events : [];
    const individualCount = eventList.filter((event) => event.type === "individual").length;
    const relayCount = eventList.filter((event) => event.type === "relay").length;
    if (!individualCount && !relayCount) return "Aucune épreuve sélectionnée.";
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
      ? `${summary} ${missingCount} épreuve${missingCount > 1 ? "s" : ""} à placer.`
        : summary;
      if (elements.engagementsProgramSection) {
        elements.engagementsProgramSection.dataset.warning = missingCount ? "true" : "false";
      }
      const coursesTab = document.querySelector('[data-engagements-detail-tab-button="courses"]');
      if (coursesTab) {
        coursesTab.dataset.warning = missingCount ? "true" : "false";
        coursesTab.title = missingCount
      ? `${missingCount} épreuve${missingCount > 1 ? "s" : ""} sélectionnée${missingCount > 1 ? "s" : ""} non placée${missingCount > 1 ? "s" : ""} dans le programme.`
          : "";
      }
    }
    updateEngagementEventsSectionToggleLabels();
  }

  function engagementEventCountLabel(competition = {}) {
    const count = Number(competition.eventCount || 0);
    if (!count) return "";
    return `${count} épreuve${count > 1 ? "s" : ""}`;
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
    const definition = engagementEventDefinition(eventCode);
    return definition?.relayMixedRule === "required"
      ? [["mixed", "Relais mixte"]]
      : ENGAGEMENT_PROGRAM_GENDER_MODES.map(([mode]) => [mode, engagementProgramGenderModeDisplayLabel(mode, eventCode, eventOption)]);
  }

  function engagementProgramGenderModeShortLabel(mode, eventCode = "", eventOption = null) {
    const definition = engagementEventDefinition(eventCode);
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
    const definition = engagementEventDefinition(eventCode);
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
    const definition = engagementEventDefinition(eventCode);
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
      mount.innerHTML = `<p class="admin-engagements-empty">${canEdit ? "Sélectionnez d'abord les épreuves qui seront nagées." : "Programme en préparation."}</p>`;
      return;
    }
    if (!sessions.length) {
      mount.innerHTML = `<p class="admin-engagements-empty">${canEdit ? "Ajoutez une session pour définir l'ordre des épreuves." : "Ordre des épreuves non renseigné."}</p>`;
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
            <button class="ghost-button" type="button" title="Les épreuves disponibles s'ajoutent dans cette session" aria-label="Choisir cette session comme cible" data-engagement-program-action="select-session" ${canEdit ? "" : "hidden"}>${active ? "Cible" : "Choisir"}</button>
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
      const definition = engagementEventDefinition(code);
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
    return invalidItem ? `Au moins une catégorie doit rester autorisée pour ${label || "chaque épreuve"}.` : "";
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
    const definition = engagementEventDefinition(eventCode);
    return definition?.type === "relay"
      ? ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
      : ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS;
  }

  function updateEngagementEventsSummaryFromForm(event) {
    if (event?.type === "input" && event.target?.matches?.("[data-engagement-category-column]")) return;
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
    updateEngagementCategoryColumnControls(elements.engagementsIndividualEvents);
    updateEngagementCategoryColumnControls(elements.engagementsRelayEvents);
    if (!elements.engagementsEventsSummary) return;
    const selectedEvents = selectedEngagementEventsFromForm();
    elements.engagementsEventsSummary.textContent = engagementEventSummary(selectedEvents);
    updateEngagementEventsSectionSummaries(selectedEvents, previousProgramSessions);
    renderEngagementProgramSessions(previousProgramSessions, isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
  }

  function engagementCategoryColumnInputs(mount, categoryCode = "") {
    return Array.from(mount?.querySelectorAll(`[data-engagement-category-code="${categoryCode}"]`) || [])
      .filter((input) => !input.disabled && input.closest("[data-engagement-event-item]")?.dataset.selected === "true");
  }

  function updateEngagementCategoryColumnControls(mount) {
    Array.from(mount?.querySelectorAll("[data-engagement-category-column]") || []).forEach((control) => {
      const inputs = engagementCategoryColumnInputs(mount, control.dataset.engagementCategoryColumn || "");
      const checkedCount = inputs.filter((input) => input.checked).length;
      control.disabled = inputs.length === 0;
      control.checked = inputs.length > 0 && checkedCount === inputs.length;
      control.indeterminate = checkedCount > 0 && checkedCount < inputs.length;
    });
  }

  function applyEngagementCategoryColumnControl(control) {
    const mount = control?.closest("[data-engagement-event-group]");
    if (!mount) return;
    const inputs = engagementCategoryColumnInputs(mount, control.dataset.engagementCategoryColumn || "");
    inputs.forEach((input) => { input.checked = control.checked; });
    control.indeterminate = false;
    updateEngagementCategoryColumnControls(mount);
  }

  function renderEngagementOpenWaterCourseLibrary() {
    if (!elements.engagementsOpenWaterCourseList) return;
    const canEdit = engagementDetailEditing && canEditEngagementCompetition();
    const selectedCodes = new Set(selectedEngagementEventsFromForm().map((event) => event.code));
    const disciplineColumns = [
      { code: "SF", label: "Surface", shortLabel: "SF" },
      { code: "BI", label: "Bi-palmes", shortLabel: "BI" },
      { code: "SUP", label: "Support", shortLabel: "SP" }
    ];
    const courseRows = Array.from(engagementOpenWaterCourses.reduce((rows, course) => {
      const format = course.format || "standard";
      const key = `${Math.trunc(Number(course.distance) || 0)}-${format}`;
      if (!rows.has(key)) rows.set(key, {
        distance: Math.trunc(Number(course.distance) || 0),
        format,
        courses: new Map()
      });
      rows.get(key).courses.set(course.discipline, course);
      return rows;
    }, new Map()).values()).sort((left, right) =>
      left.distance - right.distance || left.format.localeCompare(right.format, "fr")
    );
    const renderCourseCell = (course) => {
      if (!course) return '<span class="admin-engagements-open-water-unavailable" aria-label="Course non disponible">—</span>';
      const selected = selectedCodes.has(engagementOpenWaterEventCode(course));
      const active = course.active !== false;
      const actionLabel = selected ? `${course.label} déjà ajoutée` : active ? `Ajouter ${course.label}` : `Réactiver ${course.label}`;
      const action = active
        ? `<button class="admin-engagements-open-water-course-add" type="button" data-open-water-course-select="${escapeHtml(course.id)}" data-open-water-course-selected="${selected ? "true" : "false"}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}" ${!canEdit || selected ? "disabled" : ""}>${selected ? "✓" : "+"}</button>`
        : `<button class="admin-engagements-open-water-course-status" type="button" data-open-water-course-id="${escapeHtml(course.id)}" data-open-water-course-next-active="true" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}" ${!canEdit ? "disabled" : ""}>↻</button>`;
      const deactivate = canEdit && active
        ? `<button class="admin-engagements-open-water-course-status" type="button" data-open-water-course-id="${escapeHtml(course.id)}" data-open-water-course-next-active="false" aria-label="Désactiver ${escapeHtml(course.label)}" title="Désactiver ${escapeHtml(course.label)}">×</button>`
        : "";
      return `<span class="admin-engagements-open-water-course-actions" data-open-water-course-active="${active ? "true" : "false"}">${action}${deactivate}</span>`;
    };
    elements.engagementsOpenWaterCourseList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th scope="col">Distance</th>
            ${disciplineColumns.map((discipline) => `<th scope="col"><span class="admin-engagements-open-water-label-full">${discipline.label}</span><span class="admin-engagements-open-water-label-short">${discipline.shortLabel}</span></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${courseRows.map((row) => `
            <tr>
              <th scope="row">${row.distance} m${row.format === "elimination" ? " élimination" : ""}</th>
              ${disciplineColumns.map((discipline) => `<td>${renderCourseCell(row.courses.get(discipline.code))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    if (elements.engagementsOpenWaterCourseCreator) elements.engagementsOpenWaterCourseCreator.hidden = !canEdit;
  }

  async function loadEngagementOpenWaterCourses({ force = false } = {}) {
    if (engagementOpenWaterCoursesLoading || (engagementOpenWaterCoursesLoaded && !force)) return;
    engagementOpenWaterCoursesLoading = true;
    if (elements.engagementsOpenWaterCourseMessage) {
      elements.engagementsOpenWaterCourseMessage.textContent = "Chargement de la bibliothèque...";
      elements.engagementsOpenWaterCourseMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementOpenWaterCourses", {});
      engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : engagementOpenWaterCourses;
      engagementOpenWaterCoursesLoaded = true;
      renderEngagementOpenWaterCourseLibrary();
      if (engagementCompetitionType(selectedEngagementCompetition) === "openWater") renderEngagementEvents(selectedEngagementCompetition);
      if (elements.engagementsOpenWaterCourseMessage) elements.engagementsOpenWaterCourseMessage.textContent = "";
    } catch (error) {
      if (elements.engagementsOpenWaterCourseMessage) {
        elements.engagementsOpenWaterCourseMessage.textContent = `Bibliothèque indisponible : ${error?.message || error}`;
        elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
      }
    } finally {
      engagementOpenWaterCoursesLoading = false;
    }
  }

  function addEngagementOpenWaterCourseToProgram(courseId = "") {
    const course = engagementOpenWaterCourses.find((item) => item.id === courseId && item.active !== false);
    if (!course) return;
    const preservedEvents = selectedEngagementEventsFromForm();
    const definition = engagementOpenWaterEventDefinitions({ events: preservedEvents }).find((event) => event.openWaterCourseId === course.id);
    if (!definition || preservedEvents.some((event) => event.code === definition.code)) return;
    const preservedSessions = selectedEngagementProgramSessionsFromForm();
    renderEngagementEvents({
      ...selectedEngagementCompetition,
      events: [...preservedEvents, { ...definition, categoryRestrictions: [] }],
      programSessions: preservedSessions
    });
    markEngagementDetailTabDirty("courses");
    if (elements.engagementsOpenWaterCourseMessage) {
      elements.engagementsOpenWaterCourseMessage.textContent = `${course.label} ajoutée au tableau.`;
      elements.engagementsOpenWaterCourseMessage.dataset.tone = "ok";
    }
  }

  async function addEngagementOpenWaterCourse(event) {
    event?.preventDefault?.();
    const distance = Math.trunc(Number(elements.engagementsOpenWaterDistance?.value));
    const discipline = elements.engagementsOpenWaterDiscipline?.value || "";
    if (!distance || !discipline) {
      if (elements.engagementsOpenWaterCourseMessage) {
        elements.engagementsOpenWaterCourseMessage.textContent = "Renseignez la distance et la spécialité.";
        elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
      }
      return;
    }
    if (distance === 150 && discipline === "SUP") {
      elements.engagementsOpenWaterCourseMessage.textContent = "Le 150 m élimination est disponible uniquement en Surface et Bi-palmes.";
      elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
      return;
    }
    const preservedEvents = selectedEngagementEventsFromForm();
    const preservedSessions = selectedEngagementProgramSessionsFromForm();
    try {
      const result = await callFunction("addEngagementOpenWaterCourse", { distance, discipline });
      engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : engagementOpenWaterCourses;
      engagementOpenWaterCoursesLoaded = true;
      if (elements.engagementsOpenWaterDistance) elements.engagementsOpenWaterDistance.value = "";
      if (elements.engagementsOpenWaterDiscipline) elements.engagementsOpenWaterDiscipline.value = "";
      const definition = engagementOpenWaterEventDefinitions({ events: preservedEvents }).find((event) => event.openWaterCourseId === result.course?.id);
      renderEngagementEvents({
        ...selectedEngagementCompetition,
        events: definition && !preservedEvents.some((item) => item.code === definition.code)
          ? [...preservedEvents, { ...definition, categoryRestrictions: [] }]
          : preservedEvents,
        programSessions: preservedSessions
      });
      markEngagementDetailTabDirty("courses");
      if (elements.engagementsOpenWaterCourseMessage) {
        elements.engagementsOpenWaterCourseMessage.textContent = `${result.course?.label || `${distance} m`} ajoutée au tableau.`;
        elements.engagementsOpenWaterCourseMessage.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsOpenWaterCourseMessage) {
        elements.engagementsOpenWaterCourseMessage.textContent = `Ajout impossible : ${error?.message || error}`;
        elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
      }
    }
  }

  async function setEngagementOpenWaterCourseStatus(button) {
    const courseId = button?.dataset.openWaterCourseId || "";
    const active = button?.dataset.openWaterCourseNextActive === "true";
    if (!courseId) return;
    const preservedEvents = selectedEngagementEventsFromForm();
    const preservedSessions = selectedEngagementProgramSessionsFromForm();
    try {
      const result = await callFunction("setEngagementOpenWaterCourseStatus", { courseId, active });
      engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : engagementOpenWaterCourses;
      renderEngagementEvents({ ...selectedEngagementCompetition, events: preservedEvents, programSessions: preservedSessions });
    } catch (error) {
      if (elements.engagementsOpenWaterCourseMessage) {
        elements.engagementsOpenWaterCourseMessage.textContent = `Modification impossible : ${error?.message || error}`;
        elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
      }
    }
  }

  function renderEngagementEventGroup(mount, type, selectedCodes, canEdit, competition = selectedEngagementCompetition || {}) {
    if (!mount) return;
    let events = engagementEventDefinitionsForCompetition(competition).filter((event) => event.type === type);
    if (engagementCompetitionType(competition) === "openWater" && type === "individual") {
      events = events.filter((event) => selectedCodes.has(event.code));
    }
    const relayTable = type === "relay";
    const categoryDefinitions = type === "relay"
      ? ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
      : ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS;
    const categoryHead = categoryDefinitions.map(([code, label]) => `
      <label class="admin-engagements-category-column-control" title="${escapeHtml(label)} : appliquer à toutes les courses sélectionnées">
        <input type="checkbox" data-engagement-category-column="${escapeHtml(code)}" aria-label="${escapeHtml(label)} pour toutes les courses" ${canEdit ? "" : "disabled"}>
        <span>${escapeHtml(code)}</span>
      </label>
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
        <div class="admin-engagements-event-row admin-engagements-event-row-head" role="row">
          <span role="columnheader">Course</span>
          ${relayTable ? '<span role="columnheader">Mixte</span>' : ""}
          ${relayTable ? '<span role="columnheader">Plusieurs</span>' : ""}
          <div role="presentation">${categoryHead}</div>
        </div>
        ${rows || '<p class="admin-engagements-open-water-empty">Cliquez sur une course de la bibliothèque pour l’ajouter.</p>'}
      </div>
    `;
    mount.dataset.engagementEventGroup = type;
    updateEngagementCategoryColumnControls(mount);
  }

  function renderEngagementEvents(competition = selectedEngagementCompetition || {}) {
    const events = Array.isArray(competition.events) ? competition.events : [];
    const selectedCodes = new Map(events.map((event) => [event.code, event]).filter(([code]) => Boolean(code)));
    const adminMode = isEngagementAdminMode();
    const canEdit = adminMode && engagementDetailEditing && canEditEngagementCompetition(competition);
    const clubProgramView = !adminMode;
    const openWater = engagementCompetitionType(competition) === "openWater";
    if (elements.engagementsOpenWaterLibrary) elements.engagementsOpenWaterLibrary.hidden = !openWater || !adminMode;
    if (elements.engagementsEventsForm) {
      elements.engagementsEventsForm.dataset.clubProgramView = clubProgramView ? "true" : "false";
    }
    if (elements.engagementsEventsChoiceSection) elements.engagementsEventsChoiceSection.hidden = !adminMode;
    if (elements.engagementsProgramSection) elements.engagementsProgramSection.hidden = false;
    renderEngagementEventGroup(elements.engagementsIndividualEvents, "individual", selectedCodes, canEdit, competition);
    renderEngagementEventGroup(elements.engagementsRelayEvents, "relay", selectedCodes, canEdit, competition);
    if (openWater && adminMode) {
      renderEngagementOpenWaterCourseLibrary();
      void loadEngagementOpenWaterCourses();
    }
    if (elements.engagementsEventsSummary) {
      elements.engagementsEventsSummary.textContent = clubProgramView && !events.length ? "Programme en préparation." : engagementEventSummary(events);
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
      : "Programme consultable uniquement avec un droit de gestion sur cette compétition.";
      elements.engagementsEventsMessage.dataset.tone = canEdit ? "ok" : "loading";
    }
  }

  function renderEngagementCompetitions() {
    const mount = elements.engagementsCalendarList;
    if (!mount) return;
    const visibleCompetitions = filteredEngagementCompetitions();
    const renderedCompetitions = visibleCompetitions.slice(0, engagementCompetitionsVisibleLimit);
    if (!visibleCompetitions.length) {
      mount.innerHTML = `
        <div class="admin-engagements-empty admin-engagements-calendar-empty">
          <strong>Aucune compétition dans cette vue.</strong>
          <span>Modifiez le statut ou retirez les filtres secondaires.</span>
          <button class="ghost-button" type="button" data-engagement-filters-reset>Réinitialiser les filtres</button>
        </div>
      `;
      return;
    }
    const groupedCompetitions = [];
    renderedCompetitions.forEach((competition) => {
      const groupLabel = engagementCompetitionMonthLabel(competition);
      let group = groupedCompetitions.at(-1);
      if (!group || group.label !== groupLabel) {
        group = { label: groupLabel, competitions: [] };
        groupedCompetitions.push(group);
      }
      group.competitions.push(competition);
    });
    mount.innerHTML = `
      <div class="admin-engagements-competitions-table" role="table" aria-label="${isEngagementAdminMode() ? "Compétitions à administrer" : "Engagements en compétition"}">
        <div class="admin-engagements-competitions-table-head" role="row">
          <span role="columnheader">Date</span>
          <span role="columnheader">Compétition</span>
          <span role="columnheader">Niveau / région</span>
          <span role="columnheader">${isEngagementAdminMode() ? "Publication" : "Engagements"}</span>
          <span role="columnheader">Action</span>
        </div>
        ${groupedCompetitions.map((group, groupIndex) => `
          <section class="admin-engagements-competition-group" role="rowgroup" aria-labelledby="engagement-competition-group-${groupIndex}">
            <h4 id="engagement-competition-group-${groupIndex}">${escapeHtml(group.label)}</h4>
            ${group.competitions.map((competition) => {
              const action = engagementCompetitionAction(competition);
              const entryStatus = competition.entryStatus || "upcoming";
              const deadlineLabel = engagementDeadlineDisplay(competition);
              const showStatusBadge = entryStatus !== "open";
              const calendarEvent = competition.sourceType === "calendarEvent";
              return `
                <article class="admin-engagements-competition ${competition.id === selectedEngagementCompetitionId ? "selected" : ""}" role="row" data-competition-type="${escapeHtml(engagementCompetitionType(competition))}" data-engagement-competition-card-id="${escapeHtml(competition.id)}" data-engagement-open-tab="${escapeHtml(action.tab)}">
                  <time class="admin-engagements-competition-date" role="cell" data-label="Date" datetime="${escapeHtml(competition.date || "")}">${escapeHtml(formatEngagementCompetitionDate(competition))}</time>
                  <div class="admin-engagements-competition-main" role="cell" data-label="Compétition">
                    <strong>${escapeHtml(competition.name || "Compétition sans nom")}</strong>
                    <small class="admin-engagements-competition-type">${escapeHtml(engagementCompetitionTypeLabel(engagementCompetitionType(competition)))}</small>
                    <small class="admin-engagements-competition-location">${escapeHtml(competition.location || "Lieu non renseigné")}</small>
                    <small class="admin-engagements-competition-mobile-meta">${escapeHtml([
                      competition.location || "Lieu non renseigné",
                      engagementLevelLabel(competition.level),
                      competition.regionId ? regionDisplayLabel(competition.regionId) : ""
                    ].filter(Boolean).join(" · "))}</small>
                  </div>
                  <div class="admin-engagements-competition-scope" role="cell" data-label="Niveau / région">
                    <span>${escapeHtml(engagementLevelLabel(competition.level))}</span>
                    ${competition.regionId ? `<small>${escapeHtml(regionDisplayLabel(competition.regionId))}</small>` : ""}
                  </div>
                  <div class="admin-engagements-competition-status" role="cell" data-label="${isEngagementAdminMode() ? "Publication" : "Engagements"}">
                    ${calendarEvent || isEngagementAdminMode()
                      ? `<span class="admin-engagements-competition-entry-badge" data-entry-state="${competition.publicationStatus === "published" ? "open" : "upcoming"}">${escapeHtml(publicCalendarPublicationLabel(competition.publicationStatus))}</span>${competition.canceled ? "<small>Événement annulé</small>" : ""}`
                      : `${showStatusBadge ? `<span class="admin-engagements-competition-entry-badge" data-entry-state="${escapeHtml(entryStatus)}">${escapeHtml(engagementStatusLabel(entryStatus))}</span>` : ""}${deadlineLabel ? `<small data-entry-status="${escapeHtml(engagementDeadlineTone(competition))}" data-engagement-deadline-competition-id="${escapeHtml(competition.id)}">${escapeHtml(deadlineLabel)}</small>` : ""}`}
                  </div>
                  <div class="admin-engagements-competition-actions" role="cell" data-label="Action">
                    <button class="ghost-button" type="button" aria-label="${escapeHtml(`${action.label} — ${competition.name || "Compétition sans nom"}`)}" data-engagement-competition-id="${escapeHtml(competition.id)}" data-engagement-open-tab="${escapeHtml(action.tab)}">
                      ${action.tab === "team"
                        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><circle cx="17" cy="9" r="3"></circle><path d="M2 21a6 6 0 0 1 12 0M12 21a5 5 0 0 1 10 0"></path></svg>'
                        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'}
                      <span>${escapeHtml(action.label)}</span>
                    </button>
                  </div>
                </article>
              `;
            }).join("")}
          </section>
        `).join("")}
      </div>
    ` + (renderedCompetitions.length < visibleCompetitions.length
      ? `<button class="ghost-button admin-engagements-show-more" type="button" data-engagement-show-more>Afficher plus de compétitions</button>`
      : "");
  }

  function setEngagementCompetitionDetailVisible(visible) {
    if (elements.engagementsCalendarPanel) elements.engagementsCalendarPanel.dataset.detailOpen = visible ? "true" : "false";
    if (elements.engagementsCalendarCard) elements.engagementsCalendarCard.dataset.detailOpen = visible ? "true" : "false";
    if (elements.engagementsCalendarFilters) elements.engagementsCalendarFilters.hidden = visible;
    if (elements.engagementsCalendarList) elements.engagementsCalendarList.hidden = visible;
    if (elements.engagementsCalendarActions) {
      const calendarActionsVisible = !visible && isEngagementAdminMode() && activeEngagementsTab === "calendar";
      elements.engagementsCalendarActions.hidden = !calendarActionsVisible;
    }
    if (elements.engagementsDetail) elements.engagementsDetail.hidden = !visible;
    if (elements.engagementsDetailClose) elements.engagementsDetailClose.hidden = !visible;
    if (!visible) setEngagementSaveState("");
  }

  function setEngagementClubEntryLoadingState(state = "") {
    if (!elements.engagementsDetail) return;
    if (state) {
      elements.engagementsDetail.dataset.clubEntryLoading = state;
      elements.engagementsDetail.setAttribute("aria-busy", state === "loading" ? "true" : "false");
      return;
    }
    delete elements.engagementsDetail.dataset.clubEntryLoading;
    elements.engagementsDetail.removeAttribute("aria-busy");
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
      const directDelete = canDeleteEngagementCompetitionImmediately(competition);
      elements.engagementsDeleteButton.hidden = !canRequestOrDelete;
      elements.engagementsDeleteButton.disabled = deletionPending && !directDelete;
      elements.engagementsDeleteButton.textContent = deletionPending && !directDelete
        ? "Suppression demandée"
        : directDelete
        ? "Supprimer"
        : "Demander la suppression";
    }
    if (elements.engagementsDetailTitle) {
    elements.engagementsDetailTitle.textContent = competition.name || "Compétition sans nom";
    }
    if (elements.engagementsDetailSubtitle) {
      elements.engagementsDetailSubtitle.textContent = [
        competition.endDate && competition.endDate !== competition.date
          ? `${formatShortDate(competition.date)} au ${formatShortDate(competition.endDate)}`
          : formatShortDate(competition.date),
        competition.location || ""
      ].filter((item) => item && item !== "-").join(" · ");
    }
    if (elements.engagementsDetailMeta) elements.engagementsDetailMeta.innerHTML = "";
    const adminMode = isEngagementAdminMode();
    if (elements.engagementsDetailLevel) {
      elements.engagementsDetailLevel.textContent = engagementLevelLabel(competition.level);
      elements.engagementsDetailLevel.dataset.level = competition.level || "";
      elements.engagementsDetailLevel.hidden = false;
    }
    if (elements.engagementsDetailEntryStatus) {
      const statusLabel = engagementStatusLabel(competition.entryStatus).toLocaleLowerCase("fr-FR");
      elements.engagementsDetailEntryStatus.textContent = `Engagements ${statusLabel}`;
      elements.engagementsDetailEntryStatus.dataset.entryStatus = competition.entryStatus || "upcoming";
      elements.engagementsDetailEntryStatus.hidden = false;
      elements.engagementsDetailEntryStatus.setAttribute("aria-label", `Statut : engagements ${statusLabel}`);
    }
    const noFees = competition.fees?.enabled === false;
    const openWater = engagementCompetitionType(competition) === "openWater";
    const sharedRows = [
      ["Type", engagementCompetitionTypeLabel(engagementCompetitionType(competition))],
      ["Date", formatShortDate(competition.date)],
      ["Date de fin", formatShortDate(competition.endDate || competition.date)],
      ["Lieu", competition.location || "-"],
      ["Région", regionDisplayLabel(competition.regionId)],
      ["Régions invitées", (competition.invitedRegionIds || []).map(regionDisplayLabel).filter((region) => region && region !== "-").join(", ") || "-"],
      ["Niveau", engagementLevelLabel(competition.level)],
      ["Statut engagements", engagementStatusLabel(competition.entryStatus)],
      ["Limite engagements", formatDeadline(competition.entryDeadlineAt)],
      ...(openWater ? [["Plan d’eau", engagementWaterBodyTypeLabel(competition.waterBodyType)]] : [["Bassin", engagementPoolLabel(competition)]]),
      ["Chronometrage", engagementTimingTypeLabel(competition.timingType)],
      ...(!openWater ? [
        ["Temps engagements", engagementQualificationPeriodLabel(competition)],
        ["Sans temps connu", engagementMissingEntryTimeModeLabel(competition.missingEntryTimeMode)]
      ] : []),
      ["Max épreuves nageur", engagementMaxEventsLabel(competition.maxEventsPerSwimmer)],
      ["Officiels", competition.officialsRequired ? "Requis" : "Non requis"],
      ["Programme", engagementEventSummary(competition.events || [])],
      ["Frais", engagementFeesSummary(competition.fees || {})]
    ];
    const clubRows = [
      ["Type", engagementCompetitionTypeLabel(engagementCompetitionType(competition))],
      ["Date", competition.endDate && competition.endDate !== competition.date
        ? `${formatShortDate(competition.date)} au ${formatShortDate(competition.endDate)}`
        : formatShortDate(competition.date)],
      ["Lieu", competition.location || "-"],
      ["Limite engagements", formatDeadline(competition.entryDeadlineAt)],
      ["Programme", engagementCompetitionProgramOverview(competition)],
      ...(!openWater ? [["Temps d'engagement", engagementEntryTimeRulesLabel(competition)]] : []),
      ["Frais d'engagement", engagementFeesSummary(competition.fees || {})],
      ...(!noFees ? [["HelloAsso", engagementHelloAssoLabel(competition.fees || {})]] : []),
      ["Niveau", engagementLevelLabel(competition.level)],
      ["Région", regionDisplayLabel(competition.regionId)],
      ["Officiels", competition.officialsRequired ? "À déclarer" : "Non requis"],
      ...(openWater ? [["Plan d’eau", engagementWaterBodyTypeLabel(competition.waterBodyType)]] : [["Bassin", engagementPoolLabel(competition)]]),
      ["Chronometrage", engagementTimingTypeLabel(competition.timingType)]
    ];
    const rows = adminMode ? [
      ["Identifiant", competition.id || "-"],
      ...sharedRows,
      ["Email du responsable informatique", competition.computerEmail || "-"],
      ["Création", competition.createdAt ? formatDeadline(competition.createdAt).replace(/^Limite /, "") : "-"],
      ["Dernière mise à jour", competition.updatedAt ? formatDeadline(competition.updatedAt).replace(/^Limite /, "") : "-"]
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
      elements.engagementsDetailStatus.textContent = "";
      elements.engagementsDetailStatus.dataset.tone = "";
    }
    updateEngagementDetailEditState();
    renderEngagementEvents(competition);
    renderEngagementFees(competition);
    renderEngagementDocuments(competition);
  }

  function closeEngagementCompetitionDetail({ skipConfirmation = false } = {}) {
    if (!skipConfirmation && !confirmLeaveDirtyEngagementTab()) return false;
    if (engagementClubEntriesAutosaveSwimmers.size) {
      void flushEngagementClubIndividualEntriesAutosave();
    }
    if (engagementClubSelectionChanges.size) void flushEngagementClubSwimmerSelections();
    clearEngagementDetailTabDirty();
    selectedEngagementCompetitionId = "";
    selectedEngagementCompetition = null;
    selectedEngagementClubEntry = null;
    engagementClubEntryMutationRevision += 1;
    engagementClubLastPersistedEntry = null;
    resetEngagementClubEntriesAutosave();
    engagementClubPersistedSwimmerIds.clear();
    setEngagementClubEntriesDirty(false);
    setEngagementClubEntryLoadingState("");
    engagementClubRecapEntries = [];
    engagementClubRecapEntriesCompetitionId = "";
    engagementClubRecapEntriesLoading = false;
    engagementMailJobs = [];
    engagementMailJobsCompetitionId = "";
    engagementMailJobsLoading = false;
    engagementCompetitionDocumentFiles = [];
    engagementCompetitionDocumentEditingId = "";
    engagementCompetitionDocumentSaving = false;
    engagementCompetitionStatistics = null;
    engagementCompetitionStatisticsCompetitionId = "";
    engagementCompetitionStatisticsLoading = false;
    setEngagementsDetailTab("general");
    setEngagementCompetitionDetailVisible(false);
    if (elements.engagementsDetailTitle) elements.engagementsDetailTitle.textContent = "Sélectionnez une compétition";
    if (elements.engagementsDetailSubtitle) elements.engagementsDetailSubtitle.textContent = "";
    if (elements.engagementsEditState) elements.engagementsEditState.hidden = true;
    if (elements.engagementsDetailEntryStatus) elements.engagementsDetailEntryStatus.hidden = true;
    if (elements.engagementsDetailLevel) elements.engagementsDetailLevel.hidden = true;
    if (elements.engagementsDetailMeta) elements.engagementsDetailMeta.innerHTML = "";
    if (elements.engagementsDetailList) elements.engagementsDetailList.innerHTML = "";
    if (elements.engagementsEditForm) elements.engagementsEditForm.hidden = true;
    if (elements.engagementsEditButton) elements.engagementsEditButton.hidden = true;
    if (elements.engagementsSaveButton) elements.engagementsSaveButton.hidden = true;
    if (elements.engagementsEditCancelTop) elements.engagementsEditCancelTop.hidden = true;
    if (elements.engagementsDeleteButton) elements.engagementsDeleteButton.hidden = true;
    if (elements.engagementsIndividualEvents) elements.engagementsIndividualEvents.innerHTML = "";
    if (elements.engagementsRelayEvents) elements.engagementsRelayEvents.innerHTML = "";
    if (elements.engagementsEventsSummary) elements.engagementsEventsSummary.textContent = "Aucune épreuve sélectionnée.";
    if (elements.engagementsProgramSummary) elements.engagementsProgramSummary.textContent = "Ordre non renseigné.";
    if (elements.engagementsProgramSessions) elements.engagementsProgramSessions.innerHTML = "";
    if (elements.engagementsEventsChoiceSummary) elements.engagementsEventsChoiceSummary.textContent = "Aucune épreuve sélectionnée.";
    if (elements.engagementsEventsMessage) elements.engagementsEventsMessage.textContent = "";
    setEngagementEventsSectionOpen(elements.engagementsEventsChoiceSection, false);
    setEngagementEventsSectionOpen(elements.engagementsProgramSection, false);
    if (elements.engagementsFeesForm) elements.engagementsFeesForm.reset();
    if (elements.engagementsFeesSummary) elements.engagementsFeesSummary.textContent = "Aucun frais renseigne.";
    if (elements.engagementsFeesMessage) elements.engagementsFeesMessage.textContent = "";
    if (elements.engagementsClubTeamForm) elements.engagementsClubTeamForm.reset();
    if (elements.engagementsClubTeamSummary) elements.engagementsClubTeamSummary.textContent = "À renseigner avant de commencer les engagements.";
    if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    if (elements.engagementsClubOfficialsSummary) elements.engagementsClubOfficialsSummary.textContent = "Aucun officiel sélectionné.";
    if (elements.engagementsClubOfficialsList) elements.engagementsClubOfficialsList.innerHTML = "";
    if (elements.engagementsClubOfficialsMessage) elements.engagementsClubOfficialsMessage.textContent = "";
    if (elements.engagementsClubSwimmersSummary) elements.engagementsClubSwimmersSummary.textContent = "Aucun nageur engagé.";
    if (elements.engagementsClubSwimmersSearch) elements.engagementsClubSwimmersSearch.value = "";
    engagementClubAvailableSwimmersSexFilter = "all";
    engagementClubInactiveSwimmersDirectoryExpanded = false;
    engagementClubInactiveSwimmersExpanded = false;
    if (elements.engagementsClubSelectedSwimmersList) elements.engagementsClubSelectedSwimmersList.innerHTML = "";
    if (elements.engagementsClubSwimmersList) elements.engagementsClubSwimmersList.innerHTML = "";
    if (elements.engagementsClubSwimmersMessage) elements.engagementsClubSwimmersMessage.textContent = "";
    if (elements.engagementsClubEntriesList) elements.engagementsClubEntriesList.innerHTML = "";
    if (elements.engagementsClubEntriesMessage) elements.engagementsClubEntriesMessage.textContent = "";
    engagementClubRelaysDraft = [];
    if (elements.engagementsClubRelaysSummary) elements.engagementsClubRelaysSummary.textContent = "Aucun relais sélectionné.";
    if (elements.engagementsClubRelaysList) elements.engagementsClubRelaysList.innerHTML = "";
    if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    if (elements.engagementsClubSummaryStatus) {
      elements.engagementsClubSummaryStatus.textContent = "";
      elements.engagementsClubSummaryStatus.hidden = true;
    }
    if (elements.engagementsClubSummaryList) elements.engagementsClubSummaryList.innerHTML = "";
    resetEngagementClubNewSwimmerForm();
    if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
    if (elements.engagementsDocumentsSummary) elements.engagementsDocumentsSummary.textContent = "Documents à préparer.";
    if (elements.engagementsComputerEmailLabel) elements.engagementsComputerEmailLabel.textContent = "Email du responsable informatique non renseigne";
    if (elements.engagementsDocumentsList) elements.engagementsDocumentsList.innerHTML = "";
    if (elements.engagementsClubRecapFiles) elements.engagementsClubRecapFiles.innerHTML = "";
    if (elements.engagementsMailJobsList) elements.engagementsMailJobsList.innerHTML = "";
    if (elements.engagementsStatisticsSummary) elements.engagementsStatisticsSummary.innerHTML = "";
    if (elements.engagementsStatisticsAlerts) elements.engagementsStatisticsAlerts.innerHTML = "";
    if (elements.engagementsStatisticsEventRows) elements.engagementsStatisticsEventRows.innerHTML = "";
    if (elements.engagementsStatisticsClubRows) elements.engagementsStatisticsClubRows.innerHTML = "";
    if (elements.engagementsStatisticsEventSelect) elements.engagementsStatisticsEventSelect.innerHTML = "";
    if (elements.engagementsStatisticsUpdatedAt) elements.engagementsStatisticsUpdatedAt.textContent = "Les statistiques sont calculées à la demande.";
    if (elements.engagementsGeneratedFiles) elements.engagementsGeneratedFiles.innerHTML = "";
    if (elements.engagementsSharedDocumentsList) elements.engagementsSharedDocumentsList.innerHTML = "";
    closeEngagementCompetitionDocumentForm();
    if (elements.engagementsDetailStatus) elements.engagementsDetailStatus.textContent = "";
    renderEngagementCompetitions();
    return true;
  }

  async function loadEngagementCompetitionDetail(competitionId, initialTab = "general") {
    const cleanId = String(competitionId || "").trim();
    if (!cleanId) return;
    if (selectedEngagementCompetitionId && selectedEngagementCompetitionId !== cleanId && !confirmLeaveDirtyEngagementTab()) return;
    closeEngagementCompetitionDocumentForm();
    if (engagementClubSelectionChanges.size) void flushEngagementClubSwimmerSelections();
    const clubMode = !isEngagementAdminMode() && canUse("engagements.club.manage");
    const cachedWorkspace = clubMode ? readEngagementClubWorkspaceCache(cleanId) : null;
    const cachedWorkspaceFresh = Boolean(cachedWorkspace?.cachedAt && Date.now() - cachedWorkspace.cachedAt < ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS);
    clearEngagementDetailTabDirty();
    selectedEngagementCompetitionId = cleanId;
    engagementClubEntryMutationRevision += 1;
    engagementClubLastPersistedEntry = null;
    resetEngagementClubEntriesAutosave();
    engagementClubSwimmersRenderedCompetitionId = "";
    engagementClubEntriesRenderedCompetitionId = "";
    engagementClubRelaysRenderedCompetitionId = "";
    engagementClubPersistedSwimmerIds.clear();
    setEngagementClubEntriesDirty(false);
    engagementClubEntryTimeHistoryCache.clear();
    engagementClubEntryTimeHistoryRequests.clear();
    engagementClubSwimmerEventTimesCache.clear();
    engagementClubSwimmerEventTimesRequests.clear();
    engagementClubRecapEntries = [];
    engagementClubRecapEntriesCompetitionId = "";
    engagementClubRecapEntriesLoading = false;
    engagementMailJobs = [];
    engagementMailJobsCompetitionId = "";
    engagementMailJobsLoading = false;
    engagementCompetitionStatistics = null;
    engagementCompetitionStatisticsCompetitionId = "";
    engagementCompetitionStatisticsLoading = false;
    resetEngagementClubTransientMessages();
    renderEngagementCompetitions();
    setEngagementCompetitionDetailVisible(true);
    if (cachedWorkspace) {
      setEngagementClubEntryLoadingState("");
      selectedEngagementCompetition = cloneEngagementClubEntry(cachedWorkspace.competition);
      selectedEngagementClubEntry = cloneEngagementClubEntry(cachedWorkspace.entry);
      setEngagementsDetailTab(initialTab);
      renderEngagementCompetitionDetail(selectedEngagementCompetition);
      setEngagementClubPersistedSwimmers(selectedEngagementClubEntry);
      renderEngagementClubEntry(selectedEngagementClubEntry);
      clearEngagementDetailTabDirty();
      if (cachedWorkspaceFresh) return;
    } else {
      const calendarCompetition = engagementCompetitions.find((competition) => competition.id === cleanId) || null;
      if (calendarCompetition) {
        selectedEngagementCompetition = cloneEngagementClubEntry(calendarCompetition);
        setEngagementsDetailTab(initialTab);
        renderEngagementCompetitionDetail(selectedEngagementCompetition);
      } else {
        selectedEngagementCompetition = null;
        setEngagementsDetailTab("general");
        if (elements.engagementsDetailTitle) elements.engagementsDetailTitle.textContent = "Chargement...";
        if (elements.engagementsDetailSubtitle) elements.engagementsDetailSubtitle.textContent = "";
        if (elements.engagementsDetailMeta) elements.engagementsDetailMeta.innerHTML = "";
      }
      if (clubMode) setEngagementClubEntryLoadingState("loading");
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = clubMode
          ? "Chargement de vos engagements enregistrés..."
          : "Chargement de la fiche...";
        elements.engagementsDetailStatus.dataset.tone = "loading";
      }
    }
    const pendingEntryMutations = engagementClubEntryMutationQueue;
    try {
      const result = await (clubMode
        ? pendingEntryMutations.then(async () => {
            const preloadRequest = pendingEngagementClubWorkspaceRequest(cleanId);
            if (preloadRequest) await preloadRequest;
            const prefetchedWorkspace = readEngagementClubWorkspaceCache(cleanId);
            if (prefetchedWorkspace?.cachedAt && Date.now() - prefetchedWorkspace.cachedAt < ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS) {
              return prefetchedWorkspace;
            }
            return callFunction("getEngagementClubEntry", { competitionId: cleanId });
          })
        : callFunction("getEngagementCompetition", { competitionId: cleanId }));
      if (selectedEngagementCompetitionId !== cleanId) return;
      selectedEngagementCompetition = result.competition || null;
      setEngagementClubEntryLoadingState("");
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty();
      if (clubMode) {
        selectedEngagementClubEntry = result.entry || {};
        setEngagementClubPersistedSwimmers(selectedEngagementClubEntry);
        renderEngagementClubEntry(selectedEngagementClubEntry);
        writeEngagementClubWorkspaceCache(cleanId, {
          competition: cloneEngagementClubEntry(selectedEngagementCompetition || {}),
          entry: cloneEngagementClubEntry(selectedEngagementClubEntry)
        });
        if (elements.engagementsClubTeamMessage) {
          const writeLockReason = engagementClubWriteLockReason();
          elements.engagementsClubTeamMessage.textContent = writeLockReason || (engagementClubTeamComplete() ? "Étape chef d'équipe validée." : "");
          elements.engagementsClubTeamMessage.dataset.tone = writeLockReason ? "error" : "ok";
        }
      } else {
        selectedEngagementClubEntry = null;
        renderEngagementClubEntry({});
      }
    } catch (error) {
      if (selectedEngagementCompetitionId !== cleanId) return;
      setEngagementClubEntryLoadingState(clubMode && !cachedWorkspace ? "error" : "");
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = cachedWorkspace
          ? `Actualisation impossible, derniere version affichee : ${error?.message || error}`
          : `Fiche indisponible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
    }
  }

  async function saveEngagementClubTeamLeader(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return false;
    if (showEngagementClubWriteLock(elements.engagementsClubTeamMessage)) return false;
    updateEngagementClubTeamFormMode();
    if (elements.engagementsClubTeamForm && !elements.engagementsClubTeamForm.checkValidity()) {
      elements.engagementsClubTeamForm.reportValidity?.();
      return false;
    }
    if (elements.engagementsClubTeamSaveButton) elements.engagementsClubTeamSaveButton.disabled = true;
    setEngagementSaveState("saving");
    if (elements.engagementsClubTeamMessage) {
      elements.engagementsClubTeamMessage.textContent = "Enregistrement du chef d'équipe...";
      elements.engagementsClubTeamMessage.dataset.tone = "loading";
    }
    try {
      let teamLeader = selectedEngagementTeamLeaderFromForm();
      if (teamLeader.mode === "person" && !teamLeader.externalClub) {
        let person = engagementClubPeople.find((candidate) => candidate.id === teamLeader.personId) || null;
        if (person && (person.active === false || !person.birthDate || !person.sex)) {
          const personResult = await callFunction("saveEngagementClubPerson", {
            personId: person.id,
            person: {
              ...engagementClubPersonPayloadWithRole(person, "teamLeader"),
              ...engagementClubPersonPayloadWithRole(teamLeader, "teamLeader"),
              roles: {
                teamLeader: true,
                official: person.roles?.official === true
              }
            }
          });
          person = personResult.person || null;
          if (!person?.id) throw new Error("Membre non retourné après la mise à jour de son identité.");
          engagementClubPeople = [
            ...engagementClubPeople.filter((candidate) => candidate.id !== person.id),
            person
          ];
        }
        if (!person) {
          const resolution = resolveEngagementClubPersonIdentity(teamLeader, "chef d'équipe");
          if (resolution.cancelled) {
            if (elements.engagementsClubTeamMessage) {
              elements.engagementsClubTeamMessage.textContent = "Création annulée : choisissez le membre existant ou corrigez l'identité.";
              elements.engagementsClubTeamMessage.dataset.tone = "warning";
            }
            setEngagementSaveState("");
            return false;
          }
          person = resolution.person;
        }
        if (!person) {
          const personResult = await callFunction("saveEngagementClubPerson", {
            person: engagementClubPersonPayloadWithRole(teamLeader, "teamLeader")
          });
          person = personResult.person || null;
          if (!person?.id) throw new Error("Membre non retourné après sa création.");
          engagementClubPeople = [
            ...engagementClubPeople.filter((candidate) => candidate.id !== person.id),
            person
          ];
        }
        teamLeader = {
          ...teamLeader,
          ...engagementClubPersonPayloadWithRole(person, "teamLeader"),
          personId: person.id,
          externalClub: false,
          clubId: currentAccessProfile?.clubId || "",
          clubName: currentAccessProfile?.clubName || ""
        };
      }
      const result = await callFunction("saveEngagementClubTeamLeader", {
        competitionId: selectedEngagementCompetitionId,
        teamLeader
      });
      selectedEngagementClubEntry = result.entry || {};
      setSelectedEngagementCompetitionClubEntryExists(true);
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = "Étape chef d'équipe enregistrée. Vous pouvez continuer les engagements.";
        elements.engagementsClubTeamMessage.dataset.tone = "ok";
      }
      setEngagementSaveState("saved");
      return true;
    } catch (error) {
      if (error?.details?.outsideClubExistingPerson === true) {
        if (elements.engagementsClubTeamMessage) {
          elements.engagementsClubTeamMessage.textContent = "Cette personne existe déjà dans un autre club. Déclarez-la comme chef d'équipe hors club.";
          elements.engagementsClubTeamMessage.dataset.tone = "warning";
        }
        openEngagementClubExternalTeamDialog();
        return false;
      }
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsClubTeamMessage.dataset.tone = "error";
      }
      setEngagementSaveState("error");
      return false;
    } finally {
      if (elements.engagementsClubTeamSaveButton) elements.engagementsClubTeamSaveButton.disabled = engagementClubWriteLocked();
    }
  }

  async function removeEngagementClubTeamLeader() {
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return false;
    if (showEngagementClubWriteLock(elements.engagementsClubTeamMessage)) return false;
    const entry = selectedEngagementClubEntry || {};
    const teamLeader = entry.teamLeader || {};
    if (teamLeader.mode !== "person" || !engagementClubTeamComplete(entry)) return false;
    if (engagementClubEntryHasParticipants(entry)) {
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = "Ce dossier contient déjà des nageurs, des officiels ou des relais : remplacez le chef d'équipe au lieu de le retirer.";
        elements.engagementsClubTeamMessage.dataset.tone = "warning";
      }
      return false;
    }
    const name = [teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ") || "ce chef d'équipe";
    if (!global.confirm(`Retirer ${name} ? Le dossier vide de ce club ne sera plus compté comme un engagement.`)) return false;
    if (elements.engagementsClubTeamRemoveButton) elements.engagementsClubTeamRemoveButton.disabled = true;
    setEngagementSaveState("saving");
    if (elements.engagementsClubTeamMessage) {
      elements.engagementsClubTeamMessage.textContent = "Retrait du chef d'équipe...";
      elements.engagementsClubTeamMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("removeEngagementClubTeamLeader", {
        competitionId: selectedEngagementCompetitionId
      });
      selectedEngagementClubEntry = result.entry || {};
      setSelectedEngagementCompetitionClubEntryExists(false);
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = "Chef d'équipe retiré. Le dossier vide n'est plus compté dans les engagements.";
        elements.engagementsClubTeamMessage.dataset.tone = "ok";
      }
      setEngagementSaveState("saved");
      return true;
    } catch (error) {
      if (elements.engagementsClubTeamMessage) {
        elements.engagementsClubTeamMessage.textContent = `Retrait impossible : ${error?.message || error}`;
        elements.engagementsClubTeamMessage.dataset.tone = "error";
      }
      setEngagementSaveState("error");
      return false;
    } finally {
      if (elements.engagementsClubTeamRemoveButton && !elements.engagementsClubTeamRemoveButton.hidden) {
        elements.engagementsClubTeamRemoveButton.disabled = Boolean(engagementClubWriteLocked() || engagementClubEntryHasParticipants());
      }
    }
  }

  async function saveEngagementClubOfficials(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return false;
    if (showEngagementClubWriteLock(elements.engagementsClubOfficialsMessage)) return false;
    if (!engagementClubTeamComplete()) {
      if (elements.engagementsClubOfficialsMessage) {
      elements.engagementsClubOfficialsMessage.textContent = "Validez le chef d'équipe ou la renonciation avant les officiels.";
        elements.engagementsClubOfficialsMessage.dataset.tone = "error";
      }
      return false;
    }
    if (elements.engagementsClubOfficialsSaveButton) {
      elements.engagementsClubOfficialsSaveButton.hidden = true;
      elements.engagementsClubOfficialsSaveButton.disabled = true;
    }
    setEngagementSaveState("saving");
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
      elements.engagementsClubOfficialsMessage.textContent = "Officiels enregistrés.";
        elements.engagementsClubOfficialsMessage.dataset.tone = "ok";
      }
      setEngagementSaveState("saved");
      if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.hidden = true;
      return true;
    } catch (error) {
      if (elements.engagementsClubOfficialsMessage) {
        elements.engagementsClubOfficialsMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsClubOfficialsMessage.dataset.tone = "error";
      }
      setEngagementSaveState("error");
      if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.hidden = false;
      return false;
    } finally {
      if (elements.engagementsClubOfficialsSaveButton) elements.engagementsClubOfficialsSaveButton.disabled = !engagementClubTeamComplete() || engagementClubWriteLocked();
    }
  }

  function renderActiveEngagementClubSwimmerConsumer() {
    if (activeEngagementsTab === "clubSwimmers") {
      renderEngagementClubSwimmersDirectory();
      return;
    }
    if (activeEngagementsTab === "clubPeople") {
      renderEngagementClubPersonSwimmerOptions();
      return;
    }
    if (!selectedEngagementCompetitionId) return;
    if (activeEngagementsDetailTab === "team") {
      renderEngagementClubTeamPersonOptions(elements.engagementsClubTeamPersonSelect?.value || "");
      return;
    }
    if (activeEngagementsDetailTab === "officials") renderEngagementClubOfficials();
    if (activeEngagementsDetailTab === "swimmers") renderEngagementClubSwimmers();
    if (activeEngagementsDetailTab === "entries") renderEngagementClubEntries();
    if (activeEngagementsDetailTab === "relays") renderEngagementClubRelays();
  }

  async function loadEngagementClubSwimmers({ force = false, silent = false } = {}) {
    if (!canUse("engagements.club.manage")) return [];
    if (engagementClubSwimmersLoadPromise) {
      return force
        ? engagementClubSwimmersLoadPromise.then(() => loadEngagementClubSwimmers({ force: true, silent }))
        : engagementClubSwimmersLoadPromise;
    }
    const expectedClubId = engagementClubScope();
    if (engagementClubSwimmersClubId && expectedClubId && engagementClubSwimmersClubId !== expectedClubId) {
      engagementClubSwimmers = [];
      engagementClubSwimmersLoaded = false;
      engagementClubSwimmersClubId = "";
      engagementClubSwimmersCachedAt = 0;
    }
    if (!engagementClubSwimmersLoaded && !force) {
      const cached = readEngagementClubSwimmersCache();
      if (cached) {
        engagementClubSwimmers = cached.swimmers;
        engagementClubSwimmersClubId = cached.clubId || expectedClubId || "";
        engagementClubSwimmersCachedAt = cached.cachedAt;
        engagementClubSwimmersLoaded = true;
      }
    }
    const cacheFresh = Boolean(engagementClubSwimmersLoaded && engagementClubSwimmersCachedAt && Date.now() - engagementClubSwimmersCachedAt < ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS);
    if (!force && cacheFresh) {
      renderActiveEngagementClubSwimmerConsumer();
      return engagementClubSwimmers;
    }
    const cachedListVisible = engagementClubSwimmersLoaded;
    engagementClubSwimmersLoading = true;
    if (!silent && !cachedListVisible && elements.engagementsClubSwimmersMessage) {
      elements.engagementsClubSwimmersMessage.textContent = "Chargement des nageurs du club...";
      elements.engagementsClubSwimmersMessage.dataset.tone = "loading";
    }
    renderActiveEngagementClubSwimmerConsumer();
    const requestPromise = (async () => {
      try {
        const result = await callFunctionWithTimeout("listEngagementClubSwimmers", { limit: 800 }, 30000);
        if (expectedClubId && engagementClubScope() !== expectedClubId) return [];
        const resultClubId = String(result.clubId || "").trim();
        if (expectedClubId && resultClubId && resultClubId !== expectedClubId) {
          throw new Error(`Profil club incoherent : ${resultClubId} retourne au lieu de ${expectedClubId}.`);
        }
        engagementClubSwimmers = Array.isArray(result.swimmers) ? result.swimmers : [];
        engagementClubSwimmersClubId = resultClubId || expectedClubId || "";
        engagementClubSwimmersLoaded = true;
        writeEngagementClubSwimmersCache();
        if (!silent && elements.engagementsClubSwimmersMessage) {
          elements.engagementsClubSwimmersMessage.textContent = "";
          elements.engagementsClubSwimmersMessage.dataset.tone = "neutral";
        }
        return engagementClubSwimmers;
      } catch (error) {
        if (!silent && elements.engagementsClubSwimmersMessage) {
          elements.engagementsClubSwimmersMessage.textContent = cachedListVisible
            ? `Effectif affiché depuis le cache ; actualisation impossible : ${error?.message || error}`
            : `Lecture impossible : ${error?.message || error}`;
          elements.engagementsClubSwimmersMessage.dataset.tone = cachedListVisible ? "warning" : "error";
        }
        if (!silent && elements.engagementsClubSwimmersDirectoryStatus) {
          elements.engagementsClubSwimmersDirectoryStatus.textContent = cachedListVisible
            ? "Effectif affiché depuis le cache ; actualisation momentanément indisponible."
            : `Lecture impossible : ${error?.message || error}`;
          elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = cachedListVisible ? "warning" : "error";
        }
        return cachedListVisible ? engagementClubSwimmers : [];
      } finally {
        engagementClubSwimmersLoading = false;
        if (engagementClubSwimmersLoadPromise === requestPromise) engagementClubSwimmersLoadPromise = null;
        try {
          renderActiveEngagementClubSwimmerConsumer();
        } catch (renderError) {
          if (elements.engagementsClubSwimmersDirectoryStatus) {
            elements.engagementsClubSwimmersDirectoryStatus.textContent = `Affichage nageurs impossible : ${renderError?.message || renderError}`;
            elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
          }
        }
      }
    })();
    engagementClubSwimmersLoadPromise = requestPromise;
    return requestPromise;
  }

  async function saveEngagementClubSwimmers(event) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    const fromEntries = event?.target === elements.engagementsClubEntriesForm;
    const messageElement = fromEntries ? elements.engagementsClubEntriesMessage : elements.engagementsClubSwimmersMessage;
    const saveButton = fromEntries ? elements.engagementsClubEntriesSaveButton : elements.engagementsClubSwimmersSaveButton;
    if (showEngagementClubWriteLock(messageElement)) return;
    if (!engagementClubTeamComplete()) {
      if (messageElement) {
      messageElement.textContent = "Validez le chef d'équipe ou la renonciation avant les engagements.";
        messageElement.dataset.tone = "error";
      }
      return;
    }
    if (!engagementClubSwimmersLoaded) await loadEngagementClubSwimmers({ silent: true });
    const selectedSwimmers = selectedEngagementClubSwimmerRows();
    const missingLicense = ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE && selectedSwimmers.some((swimmer) => !swimmer.licenseNumber);
    if (missingLicense) {
      if (messageElement) {
        messageElement.textContent = "Numéro de licence obligatoire pour chaque nageur engagé.";
        messageElement.dataset.tone = "error";
      }
      const missingLicenseInput = Array.from(elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]:checked") || [])
        .map((checkbox) => checkbox.closest("[data-engagement-club-swimmer-row]")?.querySelector("input[data-engagement-club-swimmer-license]:invalid"))
        .find(Boolean);
      setEngagementClubSwimmerRowExpanded(missingLicenseInput?.closest("[data-engagement-club-swimmer-row]"), true);
      elements.engagementsClubSwimmersForm?.reportValidity?.();
      missingLicenseInput?.focus?.();
      return;
    }
    const invalidLicense = selectedSwimmers.some((swimmer) => swimmer.licenseNumber && !ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(swimmer.licenseNumber));
    if (invalidLicense) {
      if (messageElement) {
        messageElement.textContent = "Chaque licence doit respecter le format A-12-34567.";
        messageElement.dataset.tone = "error";
      }
      const invalidLicenseInput = Array.from(elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]:checked") || [])
        .map((checkbox) => checkbox.closest("[data-engagement-club-swimmer-row]")?.querySelector("input[data-engagement-club-swimmer-license]:invalid"))
        .find(Boolean);
      setEngagementClubSwimmerRowExpanded(invalidLicenseInput?.closest("[data-engagement-club-swimmer-row]"), true);
      elements.engagementsClubSwimmersForm?.reportValidity?.();
      invalidLicenseInput?.focus?.();
      return;
    }
    if (saveButton) saveButton.disabled = true;
    setEngagementSaveState("saving");
    if (messageElement) {
      messageElement.textContent = fromEntries ? "Enregistrement des courses..." : "Enregistrement des nageurs...";
      messageElement.dataset.tone = "loading";
    }
    try {
      const dirtySwimmerIds = new Set(engagementClubEntriesDirtySwimmerIds);
      const useIndividualEntriesSave = fromEntries && dirtySwimmerIds.size > 0 &&
        Array.from(dirtySwimmerIds).every((swimmerIndexId) => engagementClubPersistedSwimmerIds.has(swimmerIndexId));
      const swimmersForRequest = useIndividualEntriesSave
        ? selectedSwimmers
          .filter((swimmer) => dirtySwimmerIds.has(swimmer.swimmerIndexId))
          .map((swimmer) => ({
            swimmerIndexId: swimmer.swimmerIndexId,
            individualEntries: swimmer.individualEntries || []
          }))
        : selectedSwimmers;
      const result = await callFunction(useIndividualEntriesSave ? "saveEngagementClubIndividualEntries" : "saveEngagementClubSwimmers", {
        competitionId: selectedEngagementCompetitionId,
        swimmers: swimmersForRequest
      });
      selectedEngagementClubEntry = result.entry || selectedEngagementClubEntry || {};
      setEngagementClubPersistedSwimmers(selectedEngagementClubEntry);
      setEngagementClubEntriesDirty(false);
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (messageElement) {
      messageElement.textContent = fromEntries ? "Courses enregistrées." : "Nageurs enregistrés.";
        messageElement.dataset.tone = "ok";
      }
      setEngagementSaveState("saved");
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = `Enregistrement impossible : ${error?.message || error}`;
        messageElement.dataset.tone = "error";
      }
      setEngagementSaveState("error");
    } finally {
      if (fromEntries) syncEngagementClubEntriesSaveBar();
      else if (saveButton) saveButton.disabled = !engagementClubTeamComplete() || engagementClubWriteLocked();
    }
  }

  async function saveEngagementClubRelays(event, messageElement = elements.engagementsClubRelaysMessage, relayRowsOverride = null) {
    event?.preventDefault?.();
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return false;
    if (showEngagementClubWriteLock(messageElement)) return false;
    if (!engagementClubTeamComplete()) {
      if (messageElement) {
      messageElement.textContent = "Validez le chef d'équipe ou la renonciation avant les relais.";
        messageElement.dataset.tone = "error";
      }
      return false;
    }
    engagementClubRelaysDraft = Array.isArray(relayRowsOverride)
      ? relayRowsOverride
      : selectedEngagementClubRelayRowsFromDom();
    const validationIssues = engagementClubRelayValidationIssues(engagementClubRelaysDraft);
    if (validationIssues.length) {
      if (messageElement) {
        messageElement.textContent = validationIssues[0];
        messageElement.dataset.tone = "error";
      }
      if (messageElement === elements.engagementsClubRelaysMessage) {
        renderEngagementClubRelays();
        focusFirstIncompleteEngagementClubRelay();
      }
      return false;
    }
    if (messageElement) {
      messageElement.textContent = "Enregistrement du relais...";
      messageElement.dataset.tone = "loading";
    }
    setEngagementSaveState("saving");
    try {
      const result = await callFunction("saveEngagementClubRelays", {
        competitionId: selectedEngagementCompetitionId,
        relays: engagementClubRelaysDraft.map((relay) => ({
          relayId: relay.relayId || "",
          eventCode: relay.eventCode || "",
          category: relay.category || "",
          genderMode: relay.genderMode || "",
          manualEntryTime: relay.manualEntryTime || "",
          memberIds: Array.isArray(relay.memberIds)
            ? relay.memberIds
            : (Array.isArray(relay.members) ? relay.members.map((member) => member.swimmerIndexId).filter(Boolean) : [])
        }))
      });
      selectedEngagementClubEntry = result.entry || selectedEngagementClubEntry || {};
      renderEngagementClubEntry(selectedEngagementClubEntry);
      if (elements.engagementsClubRelaysMessage) {
        elements.engagementsClubRelaysMessage.textContent = "Relais enregistré.";
        elements.engagementsClubRelaysMessage.dataset.tone = "ok";
      }
      setEngagementSaveState("saved");
      return true;
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = `Enregistrement impossible : ${error?.message || error}`;
        messageElement.dataset.tone = "error";
      }
      setEngagementSaveState("error");
      return false;
    }
  }

  async function downloadEngagementClubSummaryPdf() {
    if (!selectedEngagementCompetitionId || !canUse("engagements.club.manage")) return;
    if (elements.engagementsClubSummaryPdfButton) elements.engagementsClubSummaryPdfButton.disabled = true;
    if (elements.engagementsClubSummaryStatus) {
      elements.engagementsClubSummaryStatus.hidden = false;
      elements.engagementsClubSummaryStatus.textContent = "Generation du PDF en cours...";
      elements.engagementsClubSummaryStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("generateEngagementClubRecapPdf", {
        competitionId: selectedEngagementCompetitionId
      });
      if (!result.pdfBase64) throw new Error("PDF non retourne par le serveur.");
      downloadBase64File(result.pdfBase64, result.fileName || "recap-engagements-livepalmes.pdf", result.contentType || "application/pdf");
      if (result.document) {
        selectedEngagementClubEntry = {
          ...(selectedEngagementClubEntry || {}),
          documents: {
            ...(selectedEngagementClubEntry?.documents || {}),
            clubRecapPdf: result.document
          }
        };
        selectedEngagementCompetition = {
          ...(selectedEngagementCompetition || {}),
          documents: {
            ...(selectedEngagementCompetition?.documents || {}),
            clubRecapPdf: {
              status: "generated",
              generatedAt: result.document.generatedAt || new Date().toISOString()
            }
          }
        };
      }
      if (elements.engagementsClubSummaryStatus) {
        elements.engagementsClubSummaryStatus.textContent = result.fromStorage ? "PDF téléchargé depuis la GED." : "PDF généré et téléchargé.";
        elements.engagementsClubSummaryStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsClubSummaryStatus) {
        elements.engagementsClubSummaryStatus.textContent = `Generation PDF impossible : ${error?.message || error}`;
        elements.engagementsClubSummaryStatus.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsClubSummaryPdfButton) {
        elements.engagementsClubSummaryPdfButton.disabled = !engagementClubTeamComplete() || !engagementClubEntryHasParticipants();
      }
    }
  }

  async function downloadEngagementAdminClubRecapPdf(clubId) {
    const cleanClubId = String(clubId || "").trim();
    if (!selectedEngagementCompetitionId || !cleanClubId || !isEngagementAdminMode()) return;
    const button = elements.engagementsClubPdfDownloadButton;
    if (button) button.disabled = true;
    if (elements.engagementsClubRecapFiles) elements.engagementsClubRecapFiles.innerHTML = '<p class="admin-engagements-empty">Préparation du PDF…</p>';
    try {
      const result = await callFunction("generateEngagementClubRecapPdfForAdmin", {
        competitionId: selectedEngagementCompetitionId,
        clubId: cleanClubId
      });
      if (!result.pdfBase64) throw new Error("PDF non retourne par le serveur.");
      downloadBase64File(result.pdfBase64, result.fileName || "recap-engagements-livepalmes.pdf", result.contentType || "application/pdf");
      if (result.document) {
        engagementClubRecapEntries = engagementClubRecapEntries.map((entry) =>
          entry.clubId === cleanClubId
            ? { ...entry, recapPdf: result.document }
            : entry
        );
        selectedEngagementCompetition = {
          ...(selectedEngagementCompetition || {}),
          documents: {
            ...(selectedEngagementCompetition?.documents || {}),
            clubRecapPdf: {
              status: "generated",
              generatedAt: result.document.generatedAt || new Date().toISOString()
            }
          }
        };
        renderEngagementDocuments(selectedEngagementCompetition);
        renderEngagementClubRecapSelector();
      }
      if (elements.engagementsClubRecapFiles) {
        elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="ok">PDF ${escapeHtml(result.fromStorage ? "téléchargé" : "préparé et téléchargé")}.</p>`;
      }
    } catch (error) {
      if (elements.engagementsClubRecapFiles) {
        elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="error">Téléchargement PDF impossible : ${escapeHtml(error?.message || error)}</p>`;
      }
    } finally {
      if (button) button.disabled = !elements.engagementsClubPdfSelect?.value;
    }
  }

  async function generateEngagementAdminClubRecapPdfs() {
    if (!selectedEngagementCompetitionId || !isEngagementAdminMode()) return;
    const button = elements.engagementsGenerateClubRecapsButton;
    if (button) button.disabled = true;
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = "Generation des PDF clubs en cours...";
    }
    startEngagementLongOperation(
      "Génération des PDF clubs en cours...",
      "Les récapitulatifs de tous les clubs engagés sont générés ou réutilisés s'ils sont déjà à jour."
    );
    try {
      const result = await callFunction("generateEngagementCompetitionClubRecapPdfs", {
        competitionId: selectedEngagementCompetitionId
      });
      if (Array.isArray(result.entries) && result.entries.length) {
        const byClubId = new Map(result.entries.map((entry) => [entry.clubId, entry]));
        engagementClubRecapEntries = engagementClubRecapEntries.map((entry) =>
          byClubId.has(entry.clubId) ? { ...entry, ...byClubId.get(entry.clubId) } : entry
        );
        const knownClubIds = new Set(engagementClubRecapEntries.map((entry) => entry.clubId));
        result.entries.forEach((entry) => {
          if (entry.clubId && !knownClubIds.has(entry.clubId)) engagementClubRecapEntries.push(entry);
        });
      }
      const hasReadyPdf = Number(result.generatedCount || 0) + Number(result.reusedCount || 0) > 0;
      if (hasReadyPdf) {
        selectedEngagementCompetition = {
          ...(selectedEngagementCompetition || {}),
          documents: {
            ...(selectedEngagementCompetition?.documents || {}),
            clubRecapPdf: {
              status: "generated",
              generatedAt: new Date().toISOString()
            }
          }
        };
      }
      renderEngagementDocuments(selectedEngagementCompetition);
      renderEngagementClubRecapSelector();
      if (elements.engagementsDocumentsSummary) {
        const generatedCount = Number(result.generatedCount || 0);
        const reusedCount = Number(result.reusedCount || 0);
        const skippedCount = Number(result.skippedCount || 0);
        const errorCount = Number(result.errorCount || 0);
        elements.engagementsDocumentsSummary.textContent = [
          `${generatedCount} PDF généré${generatedCount > 1 ? "s" : ""}`,
        `${reusedCount} déjà à jour`,
          skippedCount ? `${skippedCount} ignore${skippedCount > 1 ? "s" : ""}` : "",
          errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""
        ].filter(Boolean).join(" - ");
        finishEngagementLongOperation(
          errorCount ? "error" : "success",
          errorCount ? "Génération terminée avec des erreurs" : "PDF clubs prêts",
          elements.engagementsDocumentsSummary.textContent
        );
      }
      if (Array.isArray(result.errors) && result.errors.length && elements.engagementsClubRecapFiles) {
        const details = result.errors.slice(0, 5).map((item) =>
          `${clubDisplayLabel(item, { fallback: "Club" })} : ${item.message || "erreur inconnue"}`
        ).join(" | ");
        elements.engagementsClubRecapFiles.insertAdjacentHTML(
          "afterbegin",
          `<p class="admin-portal-message" data-tone="error">PDF non générés : ${escapeHtml(details)}</p>`
        );
      }
    } catch (error) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Generation PDF clubs impossible : ${error?.message || error}`;
      }
      finishEngagementLongOperation("error", "Génération des PDF impossible", error?.message || String(error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function generateEngagementAdminTxtExport() {
    if (!selectedEngagementCompetitionId || !isEngagementAdminMode()) return;
    if (engagementCompetitionType(selectedEngagementCompetition) === "openWater") {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = "L’export TXT eau libre sera disponible après validation de son format.";
      }
      return;
    }
    const button = elements.engagementsGenerateTxtExportButton;
    if (button) button.disabled = true;
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = "Préparation de l'export WinPalme…";
    }
    try {
      const result = await callFunction("generateEngagementCompetitionTxtExport", {
        competitionId: selectedEngagementCompetitionId
      });
      if (!result.txtBase64) throw new Error("TXT WinPalme non retourne par le serveur.");
      downloadBase64File(result.txtBase64, result.fileName || "export-engagements-livepalmes.txt", result.contentType || "text/plain");
      const generatedAt = result.generatedAt || new Date().toISOString();
      selectedEngagementCompetition = {
        ...(selectedEngagementCompetition || {}),
        documents: {
          ...(selectedEngagementCompetition?.documents || {}),
          entriesTxt: {
            status: "generated",
            generatedAt
          }
        },
        generatedFiles: Array.isArray(result.generatedFiles)
          ? result.generatedFiles
          : (result.file ? [
              result.file,
              ...((selectedEngagementCompetition?.generatedFiles || []).filter((file) => file.type !== "entriesTxt"))
            ] : selectedEngagementCompetition?.generatedFiles || [])
      };
      renderEngagementDocuments(selectedEngagementCompetition);
      if (elements.engagementsDocumentsSummary) {
        const entryCount = Number(result.entryCount || 0);
        elements.engagementsDocumentsSummary.textContent = `Export WinPalme téléchargé pour ${entryCount} club${entryCount > 1 ? "s" : ""}.`;
      }
    } catch (error) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Téléchargement TXT impossible : ${error?.message || error}`;
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function prepareEngagementOpeningEmails() {
    if (!selectedEngagementCompetitionId || !isEngagementAdminMode()) return;
    const button = elements.engagementsPrepareOpeningEmailsButton;
    if (button) button.disabled = true;
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = "Preparation des mails d'ouverture...";
    }
    startEngagementLongOperation(
      "Préparation des courriels d'ouverture en cours...",
      "Les destinataires autorisés sont regroupés et les courriels sont préparés sans être envoyés."
    );
    try {
      const result = await callFunction("prepareEngagementOpeningNotificationEmails", {
        competitionId: selectedEngagementCompetitionId
      });
      await loadEngagementMailJobs({ force: true });
      if (elements.engagementsDocumentsSummary) {
        const count = Number(result.jobCount || 0);
        elements.engagementsDocumentsSummary.textContent = `${count} e-mail${count > 1 ? "s" : ""} d'ouverture préparé${count > 1 ? "s" : ""}, non envoyé${count > 1 ? "s" : ""}.`;
        finishEngagementLongOperation("success", "Courriels d'ouverture préparés", elements.engagementsDocumentsSummary.textContent);
      }
    } catch (error) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Preparation mails ouverture impossible : ${error?.message || error}`;
      }
      finishEngagementLongOperation("error", "Préparation des courriels impossible", error?.message || String(error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function prepareEngagementClubRecapEmails() {
    if (!selectedEngagementCompetitionId || !isEngagementAdminMode()) return;
    const button = elements.engagementsPrepareClubRecapEmailsButton;
    if (button) button.disabled = true;
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = "Preparation des mails PDF clubs...";
    }
    startEngagementLongOperation(
      "Préparation des courriels PDF clubs en cours...",
      "Les récapitulatifs disponibles et les administrateurs de chaque club sont contrôlés avant l'envoi."
    );
    try {
      const result = await callFunction("prepareEngagementClubRecapEmails", {
        competitionId: selectedEngagementCompetitionId
      });
      if (Number(result.jobCount || 0)) {
        updateSelectedEngagementDocumentStatus("clubRecapEmails", "generated");
      }
      await loadEngagementMailJobs({ force: true });
      if (elements.engagementsDocumentsSummary) {
        const jobCount = Number(result.jobCount || 0);
        const skippedCount = Number(result.skippedClubCount || 0);
        const errorCount = Number(result.errorCount || 0);
        elements.engagementsDocumentsSummary.textContent = [
          `${jobCount} e-mail${jobCount > 1 ? "s" : ""} PDF préparé${jobCount > 1 ? "s" : ""}, non envoyé${jobCount > 1 ? "s" : ""}`,
          skippedCount ? `${skippedCount} club${skippedCount > 1 ? "s" : ""} ignoré${skippedCount > 1 ? "s" : ""}` : "",
          errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""
        ].filter(Boolean).join(" - ");
        finishEngagementLongOperation(
          errorCount ? "error" : "success",
          errorCount ? "Préparation terminée avec des erreurs" : "Courriels PDF clubs préparés",
          elements.engagementsDocumentsSummary.textContent
        );
      }
      if (Array.isArray(result.errors) && result.errors.length && elements.engagementsMailJobsList) {
        const details = result.errors.slice(0, 5).map((item) =>
          `${clubDisplayLabel(item, { fallback: "Club" })} : ${item.message || "erreur inconnue"}`
        ).join(" | ");
        elements.engagementsMailJobsList.insertAdjacentHTML(
          "afterbegin",
          `<p class="admin-portal-message" data-tone="error">E-mails PDF non préparés : ${escapeHtml(details)}</p>`
        );
      }
    } catch (error) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Préparation des e-mails PDF impossible : ${error?.message || error}`;
      }
      finishEngagementLongOperation("error", "Préparation des courriels impossible", error?.message || String(error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  function engagementMailSendButton(type) {
    return type === "club_recap_pdf"
      ? elements.engagementsSendClubRecapEmailsButton
      : elements.engagementsSendOpeningEmailsButton;
  }

  function engagementMailSendActionLabel(type) {
    if (type === "entries_txt") return "TXT informatique";
    return type === "club_recap_pdf" ? "PDF clubs" : "d'ouverture";
  }

  async function sendEngagementPreparedEmails(type = "opening_notification") {
    if (!selectedEngagementCompetitionId || !isEngagementAdminMode()) return;
    if (engagementMailJobsCompetitionId !== selectedEngagementCompetitionId) {
      await loadEngagementMailJobs({ force: true });
    }
    const matchingJobs = engagementMailJobs.filter((job) => job.type === type);
    const pendingJobs = matchingJobs.filter((job) => job.status !== "sent");
    const pendingCount = pendingJobs.length;
    const actionLabel = engagementMailSendActionLabel(type);
    if (!pendingCount && !engagementMailJobsHasMore) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Aucun e-mail ${actionLabel} à envoyer.`;
      }
      return;
    }
    const sampleRecipients = pendingJobs.slice(0, 6).map((job) => job.toEmail).filter(Boolean);
    const confirmed = global.confirm(
      [
        engagementMailJobsHasMore
          ? `${pendingCount ? `Envoyer au moins ${pendingCount} e-mail${pendingCount > 1 ? "s" : ""}` : "Envoyer les e-mails non affichés"} ${actionLabel} ?`
          : `Envoyer ${pendingCount} e-mail${pendingCount > 1 ? "s" : ""} ${actionLabel} ?`,
        sampleRecipients.length ? `Destinataires : ${sampleRecipients.join(", ")}${pendingCount > sampleRecipients.length ? ", ..." : ""}` : "",
        engagementMailJobsHasMore ? "La liste affichée est paginée ; l'envoi inclura aussi les courriels suivants." : "",
        "Seuls les e-mails préparés, bloqués ou en erreur seront envoyés."
      ].filter(Boolean).join("\n\n")
    );
    if (!confirmed) return;
    const button = engagementMailSendButton(type);
    if (button) button.disabled = true;
    if (elements.engagementsDocumentsSummary) {
      elements.engagementsDocumentsSummary.textContent = `Envoi des e-mails ${actionLabel}...`;
    }
    startEngagementLongOperation(
      `Envoi des courriels ${actionLabel} en cours...`,
      "Les courriels préparés sont transmis. Ne relancez pas l'action pendant l'envoi."
    );
    try {
      const result = await callFunction("sendEngagementPreparedEmails", {
        competitionId: selectedEngagementCompetitionId,
        type,
        limit: 500
      });
      if ((type === "club_recap_pdf" || type === "entries_txt") && Number(result.attemptedCount || 0)) {
        updateSelectedEngagementDocumentStatus(
          type === "entries_txt" ? "entriesTxt" : "clubRecapEmails",
          Number(result.errorCount || 0) ? "generated" : "sent"
        );
      }
      await loadEngagementMailJobs({ force: true });
      if (elements.engagementsDocumentsSummary) {
        const sentCount = Number(result.sentCount || 0);
        const errorCount = Number(result.errorCount || 0);
        const attemptedCount = Number(result.attemptedCount || 0);
        elements.engagementsDocumentsSummary.textContent = [
          `${sentCount}/${attemptedCount} e-mail${attemptedCount > 1 ? "s" : ""} ${actionLabel} envoyé${sentCount > 1 ? "s" : ""}`,
          errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""
        ].filter(Boolean).join(" - ");
        finishEngagementLongOperation(
          errorCount ? "error" : "success",
          errorCount ? "Envoi terminé avec des erreurs" : "Courriels envoyés",
          elements.engagementsDocumentsSummary.textContent
        );
      }
    } catch (error) {
      if (elements.engagementsDocumentsSummary) {
        elements.engagementsDocumentsSummary.textContent = `Envoi des e-mails impossible : ${error?.message || error}`;
      }
      finishEngagementLongOperation("error", "Envoi des courriels impossible", error?.message || String(error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  function selectedEngagementClubNewSwimmerFromForm() {
    return {
      firstName: String(elements.engagementsClubNewSwimmerFirstName?.value || "").trim(),
      lastName: String(elements.engagementsClubNewSwimmerLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
      birthDate: String(elements.engagementsClubNewSwimmerBirthDate?.value || "").trim(),
      sex: String(elements.engagementsClubNewSwimmerSex?.value || "").trim(),
      licenseNumber: formatEngagementSwimmerLicense(elements.engagementsClubNewSwimmerLicense?.value || "")
    };
  }

  function formatEngagementSwimmerLicense(value = "") {
    const source = String(value || "").toUpperCase();
    const letterIndex = source.search(/[A-Z]/);
    if (letterIndex < 0) return "";
    const letter = source[letterIndex];
    const digits = source.slice(letterIndex + 1).replace(/\D/g, "").slice(0, 57);
    const federation = digits.slice(0, 2);
    const number = digits.slice(2);
    return `${letter}-${federation}${federation.length === 2 ? `-${number}` : ""}`;
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
    engagementClubSwimmerRecovery = null;
    if (elements.engagementsClubRecoverSwimmerButton) elements.engagementsClubRecoverSwimmerButton.hidden = true;
  }

  function setEngagementClubNewSwimmerMessage(message = "", tone = "") {
    if (!elements.engagementsClubNewSwimmerMessage) return;
    elements.engagementsClubNewSwimmerMessage.textContent = message;
    if (tone) elements.engagementsClubNewSwimmerMessage.dataset.tone = tone;
    else delete elements.engagementsClubNewSwimmerMessage.dataset.tone;
  }

  function engagementClubNewSwimmerFormHasValues() {
    return Object.values(selectedEngagementClubNewSwimmerFromForm()).some(Boolean);
  }

  function openEngagementClubNewSwimmerDialog() {
    const dialog = elements.engagementsClubNewSwimmerDialog;
    if (!dialog || dialog.open) return;
    setEngagementClubNewSwimmerMessage();
    dialog.showModal();
    global.requestAnimationFrame?.(() => elements.engagementsClubNewSwimmerLastName?.focus?.());
  }

  function closeEngagementClubNewSwimmerDialog({ force = false, restoreFocus = true } = {}) {
    const dialog = elements.engagementsClubNewSwimmerDialog;
    if (!dialog?.open) return true;
    if (!force && engagementClubNewSwimmerFormHasValues() && !global.confirm("Abandonner les informations saisies pour ce nageur ?")) return false;
    resetEngagementClubNewSwimmerForm();
    if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
    setEngagementClubNewSwimmerMessage();
    dialog.close();
    if (restoreFocus) elements.engagementsClubNewSwimmerDialogOpen?.focus?.();
    return true;
  }

  function resetEngagementClubNewSwimmerFormFromButton() {
    resetEngagementClubNewSwimmerForm();
    if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
    setEngagementClubNewSwimmerMessage();
    if (elements.engagementsClubSwimmersMessage) {
      elements.engagementsClubSwimmersMessage.textContent = "";
      delete elements.engagementsClubSwimmersMessage.dataset.tone;
    }
    elements.engagementsClubNewSwimmerLastName?.focus();
  }

  function renderEngagementClubNewSwimmerAlerts(alerts = [], { confirmed = false } = {}) {
    const mount = elements.engagementsClubNewSwimmerAlerts;
    if (!mount) return;
    if (!alerts.length) {
      mount.innerHTML = '<p class="admin-portal-message" data-tone="ok">Aucune ressemblance forte détectée.</p>';
      return;
    }
    const blocksCreation = alerts.some((alert) => alert.type === "inverted-identity");
    mount.innerHTML = `
      <p class="admin-portal-message" data-tone="error">${blocksCreation
        ? "Création impossible : une fiche avec la même date de naissance utilise déjà ce nom et ce prénom dans l'ordre inverse."
        : confirmed
        ? `Alerte : ${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouvé${alerts.length > 1 ? "s" : ""}. Le nageur est créé, l'alerte est tracée comme validée par le club.`
        : `Alerte : ${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouvé${alerts.length > 1 ? "s" : ""}. Confirmez la création uniquement si ce nageur est bien nouveau pour votre club.`}</p>
      <div class="admin-engagements-club-swimmer-alert-list">
        ${alerts.map((alert) => `
          <article>
            <strong>${escapeHtml(alert.message || "Rapprochement possible")}</strong>
            <small>${escapeHtml([
              alert.name,
              alert.birthDate ? formatShortDate(alert.birthDate) : "",
              alert.clubId || alert.clubName ? clubDisplayLabel(alert) : "",
              alert.latestDate ? `dernier résultat ${formatShortDate(alert.latestDate)}` : ""
            ].filter(Boolean).join(" - "))}</small>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderEngagementClubSwimmerRecovery(recovery = {}) {
    const swimmer = recovery.swimmer || {};
    const name = engagementSwimmerDisplayName(swimmer, "Ce nageur");
    const club = clubDisplayLabel(swimmer, { fallback: "un autre club" });
    if (elements.engagementsClubNewSwimmerAlerts) {
      const message = recovery.sameClub
        ? `${name} est déjà connu dans votre club. Recherchez-le dans la liste ci-dessus.`
        : recovery.eligible
        ? `${name} est rattaché à ${club}. Il peut être récupéré pour sa première compétition de la saison.`
        : `${name} a déjà un résultat publié cette saison pour ${club}. Son changement de club nécessite une dérogation nationale.`;
      elements.engagementsClubNewSwimmerAlerts.innerHTML = `<p class="admin-portal-message" data-tone="${recovery.eligible ? "warning" : recovery.sameClub ? "ok" : "error"}">${escapeHtml(message)}</p>`;
    }
    if (elements.engagementsClubRecoverSwimmerButton) {
      elements.engagementsClubRecoverSwimmerButton.hidden = !recovery.eligible;
      elements.engagementsClubRecoverSwimmerButton.disabled = !recovery.eligible;
    }
  }

  function engagementClubNewSwimmerConfirmationMessage(alerts = []) {
    const preview = alerts.slice(0, 3).map((alert) => [
      alert.name || "Nageur rapproché",
      alert.birthDate ? formatShortDate(alert.birthDate) : "",
      alert.clubId || alert.clubName ? clubDisplayLabel(alert) : ""
    ].filter(Boolean).join(" - ")).join("\n");
    return [
      `${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouvé${alerts.length > 1 ? "s" : ""}.`,
      preview,
      alerts.length > 3 ? `+ ${alerts.length - 3} autre${alerts.length - 3 > 1 ? "s" : ""} rapprochement${alerts.length - 3 > 1 ? "s" : ""}.` : "",
      "Confirmer la création de ce nageur ? Cette validation sera tracée."
    ].filter(Boolean).join("\n\n");
  }

  async function createEngagementClubSwimmer() {
    if (!canUse("engagements.club.manage")) return;
    const swimmer = selectedEngagementClubNewSwimmerFromForm();
    if (!swimmer.licenseNumber) {
      if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
      setEngagementClubNewSwimmerMessage("Le numéro de licence est obligatoire pour vérifier ou créer un nageur.", "error");
      return;
    }
    if (!ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(swimmer.licenseNumber)) {
      if (elements.engagementsClubNewSwimmerLicense) {
        elements.engagementsClubNewSwimmerLicense.value = swimmer.licenseNumber;
        elements.engagementsClubNewSwimmerLicense.reportValidity?.();
      }
      setEngagementClubNewSwimmerMessage("Le numéro de licence doit respecter le format A-12-34567.", "error");
      return;
    }
    engagementClubSwimmerRecovery = null;
    if (elements.engagementsClubRecoverSwimmerButton) elements.engagementsClubRecoverSwimmerButton.hidden = true;
    if (elements.engagementsClubNewSwimmerSaveButton) elements.engagementsClubNewSwimmerSaveButton.disabled = true;
    setEngagementClubNewSwimmerMessage("Vérification des rapprochements...", "loading");
    try {
      const recovery = await callFunction("previewEngagementClubSwimmerRecovery", {
        licenseNumber: swimmer.licenseNumber
      });
      if (recovery.found) {
        engagementClubSwimmerRecovery = recovery;
        renderEngagementClubSwimmerRecovery(recovery);
        setEngagementClubNewSwimmerMessage(
          recovery.eligible
            ? "Vérifiez le nageur puis choisissez « Récupérer ce nageur »."
            : recovery.sameClub ? "Ce nageur est déjà connu dans votre club."
            : "Récupération impossible sans dérogation nationale.",
          recovery.eligible ? "warning" : recovery.sameClub ? "ok" : "error"
        );
        return;
      }
      if (!swimmer.firstName || !swimmer.lastName || !swimmer.birthDate || !swimmer.sex) {
        if (elements.engagementsClubNewSwimmerAlerts) elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
        setEngagementClubNewSwimmerMessage("Prénom, nom, date de naissance et sexe sont obligatoires pour créer un nouveau nageur.", "error");
        return;
      }
      const preview = await callFunction("previewEngagementClubSwimmerCreation", {
        swimmer
      });
      const alerts = Array.isArray(preview.alerts) ? preview.alerts : [];
      renderEngagementClubNewSwimmerAlerts(alerts, { confirmed: false });
      const blockingAlert = alerts.find((alert) => alert.type === "inverted-identity");
      if (preview.blocksCreation === true || blockingAlert) {
        const matchingName = blockingAlert?.name ? ` : ${blockingAlert.name}` : "";
        setEngagementClubNewSwimmerMessage(`Création impossible${matchingName}. Le nom et le prénom sont inversés pour la même date de naissance.`, "error");
        return;
      }
      if (alerts.length && !global.confirm(engagementClubNewSwimmerConfirmationMessage(alerts))) {
        setEngagementClubNewSwimmerMessage("Création annulée : rapprochement à vérifier.", "error");
        return;
      }
      setEngagementClubNewSwimmerMessage("Création du nageur...", "loading");
      const result = await callFunction("createEngagementClubSwimmer", {
        competitionId: selectedEngagementCompetitionId || "",
        swimmer,
        confirmAlerts: alerts.length > 0
      });
      invalidateEngagementClubSwimmersCache();
      await loadEngagementClubSwimmers({ force: true, silent: true });
      renderEngagementClubNewSwimmerAlerts(Array.isArray(result.alerts) ? result.alerts : [], { confirmed: true });
      resetEngagementClubNewSwimmerForm();
      closeEngagementClubNewSwimmerDialog({ force: true, restoreFocus: false });
      if (elements.engagementsClubSwimmersSearch) {
        elements.engagementsClubSwimmersSearch.value = result.swimmer?.lastName || swimmer.lastName || "";
        renderEngagementClubSwimmers();
      }
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "Nageur créé. Vous pouvez maintenant le sélectionner dans la liste.";
        elements.engagementsClubSwimmersMessage.dataset.tone = "ok";
      }
    } catch (error) {
      setEngagementClubNewSwimmerMessage(`Création impossible : ${error?.message || error}`, "error");
    } finally {
      if (elements.engagementsClubNewSwimmerSaveButton) elements.engagementsClubNewSwimmerSaveButton.disabled = false;
    }
  }

  async function recoverEngagementClubSwimmer() {
    const recovery = engagementClubSwimmerRecovery;
    if (!recovery?.eligible || !recovery?.swimmer?.licenseNumber || !canUse("engagements.club.manage")) return;
    const name = engagementSwimmerDisplayName(recovery.swimmer, "ce nageur");
    if (!global.confirm(`Récupérer ${name} pour votre club ? Cette action est possible car aucun résultat n'est publié cette saison.`)) return;
    if (elements.engagementsClubRecoverSwimmerButton) elements.engagementsClubRecoverSwimmerButton.disabled = true;
    setEngagementClubNewSwimmerMessage("Récupération du nageur...", "loading");
    try {
      const result = await callFunction("recoverEngagementClubSwimmer", {
        licenseNumber: recovery.swimmer.licenseNumber,
        competitionId: selectedEngagementCompetitionId || ""
      });
      invalidateEngagementClubSwimmersCache();
      await loadEngagementClubSwimmers({ force: true, silent: true });
      resetEngagementClubNewSwimmerForm();
      closeEngagementClubNewSwimmerDialog({ force: true, restoreFocus: false });
      if (elements.engagementsClubSwimmersSearch) {
        elements.engagementsClubSwimmersSearch.value = result.swimmer?.lastName || "";
        renderEngagementClubSwimmers();
      }
      if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "Nageur récupéré. Vous pouvez maintenant le sélectionner dans la liste.";
        elements.engagementsClubSwimmersMessage.dataset.tone = "ok";
      }
    } catch (error) {
      setEngagementClubNewSwimmerMessage(`Récupération impossible : ${error?.message || error}`, "error");
    } finally {
      if (elements.engagementsClubRecoverSwimmerButton) elements.engagementsClubRecoverSwimmerButton.disabled = false;
    }
  }

  async function deleteOrRequestEngagementCompetitionDeletion() {
    if (!selectedEngagementCompetition?.id || !canEditEngagementCompetition(selectedEngagementCompetition)) return;
    if (engagementDetailEditing && !confirmLeaveDirtyEngagementTab()) return;

    const competition = selectedEngagementCompetition;
    const directDelete = canDeleteEngagementCompetitionImmediately(competition);
    const actionLabel = directDelete ? "Supprimer définitivement" : "Demander la suppression de";
    const confirmMessage = directDelete
      ? `${actionLabel} la compétition "${competition.name || "sans nom"}" ? Cette action est irréversible.`
      : `${actionLabel} la compétition "${competition.name || "sans nom"}" ? Un administrateur national devra valider la suppression.`;
    if (!global.confirm(confirmMessage)) return;

    const deleteButtonLabel = elements.engagementsDeleteButton?.textContent || "";
    let deletionCompleted = false;
    if (elements.engagementsDeleteButton) {
      elements.engagementsDeleteButton.disabled = true;
      elements.engagementsDeleteButton.textContent = directDelete ? "Suppression en cours..." : "Envoi en cours...";
      elements.engagementsDeleteButton.setAttribute("aria-busy", "true");
    }
    if (elements.engagementsDetailStatus) {
      elements.engagementsDetailStatus.textContent = directDelete
        ? "Suppression de la compétition..."
        : "Envoi de la demande de suppression...";
      elements.engagementsDetailStatus.dataset.tone = "loading";
    }

    try {
      await callFunction(directDelete ? "deleteEngagementCompetition" : "requestEngagementCompetitionDeletion", {
        competitionId: competition.id
      });
      deletionCompleted = true;
      if (directDelete) {
        const remainingCompetitions = engagementCompetitions.filter((item) => item.id !== competition.id);
        invalidateEngagementCalendarCaches();
        const filters = engagementCalendarFiltersPayload();
        const requestedRange = engagementCalendarRequestedRange(filters);
        const cacheKey = engagementCalendarCacheKey("admin", requestedRange);
        activateEngagementCalendarCache(cacheKey, requestedRange, writeEngagementCalendarCache(cacheKey, remainingCompetitions));
        clearEngagementDetailTabDirty();
        closeEngagementCompetitionDetail();
        if (elements.engagementsStatus) {
          const successMessage = "Compétition supprimée.";
          elements.engagementsStatus.hidden = false;
          elements.engagementsStatus.textContent = successMessage;
          elements.engagementsStatus.dataset.tone = "ok";
          global.setTimeout(() => {
            if (elements.engagementsStatus?.textContent !== successMessage || elements.engagementsStatus?.dataset.tone !== "ok") return;
            elements.engagementsStatus.textContent = "";
            delete elements.engagementsStatus.dataset.tone;
            elements.engagementsStatus.hidden = true;
          }, 4000);
        }
      } else if (elements.engagementsDetailStatus) {
        selectedEngagementCompetition = {
          ...selectedEngagementCompetition,
          deletionRequestStatus: "pending"
        };
        renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
        elements.engagementsDetailStatus.textContent = "Demande de suppression envoyée au niveau national.";
        elements.engagementsDetailStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsDeleteButton) {
        elements.engagementsDeleteButton.removeAttribute("aria-busy");
        if (!deletionCompleted) {
          elements.engagementsDeleteButton.disabled = false;
          elements.engagementsDeleteButton.textContent = deleteButtonLabel;
        }
      }
    }
  }

  function updateEngagementAccessRequestBadge(count = engagementAccessRequests.length) {
    if (portalPendingOverviewLoaded) return;
    renderPendingBadgeCollection(
      elements.accessPendingBadges,
      canReviewEngagementAccessRequests() ? count : 0,
      "demande d'accès en attente",
      "demandes d'accès en attente"
    );
  }

  function renderEngagementAccessRequests() {
    if (!elements.engagementsAccessRequestsList) return;
    if (!canReviewEngagementAccessRequests()) {
      elements.engagementsAccessRequestsList.innerHTML = "";
      return;
    }
    if (!engagementAccessRequests.length) {
      elements.engagementsAccessRequestsList.innerHTML = '<p class="admin-engagements-empty">Aucune demande d\'accès en attente.</p>';
      closeEngagementAccessRequestEditForm();
      return;
    }
    elements.engagementsAccessRequestsList.innerHTML = engagementAccessRequests.map((request) => {
      const name = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "Demande sans nom";
      const newClubRequested = request.newClubRequested === true;
      const newClub = request.newClub || {};
      const nationalOnly = newClubRequested && !canUse("engagements.national.manage");
      return `
        <article class="admin-engagements-request-card" data-engagement-access-request-id="${escapeHtml(request.id || "")}">
          <div class="admin-engagements-request-main">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml([request.email, request.licenseNumber ? `Licence ${request.licenseNumber}` : ""].filter(Boolean).join(" - "))}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>${escapeHtml(newClubRequested ? `${newClub.clubCode || "Nouveau club"} — ${newClub.clubName || "Nom non renseigné"}` : clubDisplayLabel(request, { fallback: "Club non renseigné" }))}</span>
            <span>${escapeHtml(regionDisplayLabel(request.regionId) || "Région non renseignée")}</span>
            <span>${escapeHtml(request.requestedAt ? formatDeadline(request.requestedAt).replace(/^Limite /, "") : "-")}</span>
          </div>
          <div class="admin-engagements-request-actions">
            <button class="ghost-button" type="button" data-engagement-access-request-action="edit" data-engagement-access-request-id="${escapeHtml(request.id || "")}" ${nationalOnly ? "disabled title=\"Traitement réservé au niveau national\"" : ""}>${newClubRequested ? "Créer le club / valider" : "Modifier / valider"}</button>
            <button class="ghost-button" type="button" data-engagement-access-request-action="reject" data-engagement-access-request-id="${escapeHtml(request.id || "")}">Refuser</button>
          </div>
          ${newClubRequested ? `<p class="admin-engagements-request-note">Nouveau club demandé · N° fédéral ${escapeHtml(newClub.federalNumber || "-")} · ${escapeHtml([newClub.postalCode, newClub.city].filter(Boolean).join(" ") || "Localité non renseignée")}${nationalOnly ? " · Traitement national requis" : ""}</p>` : ""}
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
        markLastRefresh(elements.engagementsAccessRequestsStatus);
        elements.engagementsAccessRequestsStatus.textContent = `${engagementAccessRequests.length} demande${engagementAccessRequests.length > 1 ? "s" : ""} en attente.${lastRefreshSuffix(elements.engagementsAccessRequestsStatus)}`;
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
    if (elements.engagementsAccessRequestEditNewClubFields) elements.engagementsAccessRequestEditNewClubFields.hidden = true;
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
    const newClubRequested = request.newClubRequested === true;
    const newClub = request.newClub || {};
    populateEngagementAccessRequestEditClubSelect(request.clubId || "", request.clubName || "");
    if (elements.engagementsAccessRequestEditClubSelect) {
      elements.engagementsAccessRequestEditClubSelect.required = !newClubRequested;
      if (newClubRequested) elements.engagementsAccessRequestEditClubSelect.disabled = true;
    }
    if (elements.engagementsAccessRequestEditNewClubFields) elements.engagementsAccessRequestEditNewClubFields.hidden = !newClubRequested;
    [
      [elements.engagementsAccessRequestEditNewClubName, newClub.clubName],
      [elements.engagementsAccessRequestEditNewClubCode, newClub.clubCode],
      [elements.engagementsAccessRequestEditNewClubFederalNumber, newClub.federalNumber],
      [elements.engagementsAccessRequestEditNewClubCity, newClub.city],
      [elements.engagementsAccessRequestEditNewClubPostalCode, newClub.postalCode]
    ].forEach(([field, value]) => {
      if (!field) return;
      field.value = value || "";
      field.required = newClubRequested;
    });
    elements.engagementsAccessRequestEditForm.hidden = false;
    setEngagementAccessRequestEditMessage("Vérifiez les informations avant validation.", "loading");
    elements.engagementsAccessRequestEditForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function correctedEngagementAccessRequestFromEditForm() {
    const requestId = elements.engagementsAccessRequestEditId?.value || "";
    const request = engagementAccessRequests.find((item) => item.id === requestId) || {};
    const newClubRequested = request.newClubRequested === true;
    return {
      firstName: String(elements.engagementsAccessRequestEditFirstName?.value || "").trim(),
      lastName: String(elements.engagementsAccessRequestEditLastName?.value || "").trim(),
      email: String(elements.engagementsAccessRequestEditEmail?.value || "").trim(),
      licenseNumber: String(elements.engagementsAccessRequestEditLicenseNumber?.value || "").trim(),
      regionId: elements.engagementsAccessRequestEditRegionId?.value || "",
      clubId: elements.engagementsAccessRequestEditClubId?.value || "",
      clubName: elements.engagementsAccessRequestEditClubName?.value || "",
      newClubRequested,
      ...(newClubRequested ? {
        newClub: {
          clubName: String(elements.engagementsAccessRequestEditNewClubName?.value || "").trim(),
          clubCode: String(elements.engagementsAccessRequestEditNewClubCode?.value || "").trim(),
          federalNumber: String(elements.engagementsAccessRequestEditNewClubFederalNumber?.value || "").trim(),
          city: String(elements.engagementsAccessRequestEditNewClubCity?.value || "").trim(),
          postalCode: String(elements.engagementsAccessRequestEditNewClubPostalCode?.value || "").trim()
        }
      } : {})
    };
  }

  async function resolveEngagementAccessRequest(requestId, decision, correctedRequest = null, resolutionReason = "") {
    const cleanId = String(requestId || "").trim();
    if (!cleanId || !canReviewEngagementAccessRequests()) return;
    const request = engagementAccessRequests.find((item) => item.id === cleanId) || {};
    const approve = decision === "approved";
    const label = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "cette demande";
    const message = approve
      ? `Valider la demande de ${label} et créer l'accès aux engagements du club ?`
      : `Refuser la demande de ${label} ?`;
    if (approve && !global.confirm(message)) return false;
    if (elements.engagementsAccessRequestsStatus) {
      elements.engagementsAccessRequestsStatus.textContent = approve ? "Validation en cours..." : "Refus en cours...";
      elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("resolveEngagementAccessRequest", {
        requestId: cleanId,
        decision: approve ? "approved" : "rejected",
        ...(approve && correctedRequest ? { correctedRequest } : {}),
        ...(!approve ? { resolutionReason: String(resolutionReason || "").trim() } : {})
      });
      if (approve && result.access?.email) {
        await global.firebase?.auth?.().sendPasswordResetEmail(result.access.email, {
          url: "https://livepalmes.firebaseapp.com/portail.html",
          handleCodeInApp: false
        }).catch(() => {});
      }
      engagementAccessRequestsLoaded = false;
      if (canManageAccessDirectory()) loadAccessUsers({ reset: true });
      await loadEngagementAccessRequests({ force: true });
      portalPendingOverviewLoaded = false;
      await loadPortalPendingOverview({ force: true });
      if (elements.engagementsAccessRequestsStatus) {
        const notificationFailed = !approve && result.resolutionNotification?.status !== "sent";
        elements.engagementsAccessRequestsStatus.textContent = approve
          ? "Demande validée. L'accès club est actif et un e-mail de mot de passe a été envoyé si possible."
          : notificationFailed
            ? "Demande refusée, mais l’e-mail d’information n’a pas pu être envoyé."
            : "Demande refusée et demandeur informé par e-mail.";
        elements.engagementsAccessRequestsStatus.dataset.tone = notificationFailed ? "error" : "ok";
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

  function publicAccessRequestPayloadFromForm() {
    const newClubRequested = elements.publicAccessRequestNewClub?.checked === true;
    return {
      firstName: String(elements.publicAccessRequestFirstName?.value || "").trim(),
      lastName: String(elements.publicAccessRequestLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
      email: String(elements.publicAccessRequestEmail?.value || "").trim(),
      licenseNumber: String(elements.publicAccessRequestLicenseNumber?.value || "").trim(),
      regionId: elements.publicAccessRequestRegionId?.value || "",
      clubId: elements.publicAccessRequestClubId?.value || "",
      clubName: elements.publicAccessRequestClubName?.value || "",
      newClubRequested,
      ...(newClubRequested ? {
        newClub: {
          clubName: String(elements.publicAccessRequestNewClubName?.value || "").trim(),
          clubCode: String(elements.publicAccessRequestNewClubCode?.value || "").trim(),
          federalNumber: String(elements.publicAccessRequestNewClubFederalNumber?.value || "").trim(),
          city: String(elements.publicAccessRequestNewClubCity?.value || "").trim(),
          postalCode: String(elements.publicAccessRequestNewClubPostalCode?.value || "").trim()
        }
      } : {}),
      message: String(elements.publicAccessRequestText?.value || "").trim(),
      website: String(elements.publicAccessRequestWebsite?.value || "").trim()
    };
  }

  async function submitPublicEngagementAccessRequest(event) {
    event?.preventDefault?.();
    const button = elements.publicAccessRequestForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setPublicAccessRequestMessage("Envoi de la demande...", "loading");
    try {
      await matchPublicAccessRequestClubByFederalNumber();
      const result = await callFunction("submitEngagementAccessRequest", publicAccessRequestPayloadFromForm());
      elements.publicAccessRequestForm?.reset();
      populatePublicAccessRequestClubSelect();
      updatePublicAccessRequestNewClubMode();
      engagementAccessRequestsLoaded = false;
      setPublicAccessRequestMessage(
        result.existingAccount
          ? "Cette adresse semble déjà associée à un compte LivePalmes. Consultez l'e-mail que nous venons de vous envoyer."
          : "Demande envoyée. Elle doit maintenant être validée par la région ou le niveau national.",
        "ok"
      );
    } catch (error) {
      setPublicAccessRequestMessage(`Demande impossible : ${error?.message || error}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function updateEngagementNationalRequestsPresentation() {
    const correctionCount = engagementSwimmerChangeRequests.length;
    const deletionCount = engagementDeletionRequests.length;
    const accountCount = accessDeletionRequests.length;
    const total = correctionCount + deletionCount + accountCount;
    const correctionError = elements.engagementsSwimmerChangeRequestsStatus?.dataset.tone === "error";
    const deletionError = elements.engagementsDeletionRequestsStatus?.dataset.tone === "error";
    const accountError = elements.engagementsNationalAccountsStatus?.dataset.tone === "error";
    if (elements.engagementsSwimmerChangeRequests) {
      elements.engagementsSwimmerChangeRequests.hidden = correctionCount === 0 && !correctionError;
      if (correctionError) elements.engagementsSwimmerChangeRequests.open = true;
    }
    if (elements.engagementsDeletionRequestsGroup) {
      elements.engagementsDeletionRequestsGroup.hidden = deletionCount === 0 && !deletionError;
      if (deletionError) elements.engagementsDeletionRequestsGroup.open = true;
    }
    if (elements.engagementsNationalAccountsGroup) {
      elements.engagementsNationalAccountsGroup.hidden = accountCount === 0 && !accountError;
      if (accountError) elements.engagementsNationalAccountsGroup.open = true;
    }
    if (elements.engagementsDeletionRequestsCount) {
      elements.engagementsDeletionRequestsCount.textContent = `${deletionCount} en attente`;
    }
    if (elements.engagementsNationalAccountsCount) {
      elements.engagementsNationalAccountsCount.textContent = `${accountCount} en attente`;
    }
    const loading = engagementDeletionRequestsLoading || engagementSwimmerChangeRequestsLoading || accessDeletionRequestsLoading;
    const complete = engagementDeletionRequestsLoaded && engagementSwimmerChangeRequestsLoaded && accessDeletionRequestsLoaded;
    if (elements.nationalRequestsEmpty) {
      elements.nationalRequestsEmpty.hidden = total > 0 || (!loading && !complete && (deletionError || correctionError || accountError));
      elements.nationalRequestsEmpty.textContent = complete
        ? "Aucune demande en attente."
        : loading ? "Chargement des demandes..." : "Certaines demandes n'ont pas pu être chargées.";
    }
    if (!portalPendingOverviewLoaded) {
      renderPendingBadgeCollection(
        elements.nationalPendingBadges,
        canDeleteEngagementCompetitionDirectly() ? total : 0,
        "demande nationale en attente",
        "demandes nationales en attente"
      );
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
      updateEngagementNationalRequestsPresentation();
      return;
    }
    elements.engagementsDeletionRequestsList.innerHTML = engagementDeletionRequests.map((request) => {
      const swimmerRequest = request.requestType === "swimmer";
      const usageDetails = swimmerRequest ? [
        request.performanceMatchCount ? `${request.performanceMatchCount} correspondance${request.performanceMatchCount > 1 ? "s" : ""} dans les performances` : "",
        request.entryUsageCount ? `${request.entryUsageCount} inscription${request.entryUsageCount > 1 ? "s" : ""}` : "",
        request.entryScanTruncated ? "contrôle historique à compléter" : ""
      ].filter(Boolean).join(" - ") : "";
      return `
      <article class="admin-engagements-request-card" data-engagement-deletion-request-id="${escapeHtml(request.id || request.competitionId || request.swimmerId || "")}" data-request-type="${swimmerRequest ? "swimmer" : "competition"}">
        <div class="admin-engagements-request-main">
          <strong>${escapeHtml(swimmerRequest ? request.swimmerName || "Nageur sans nom" : request.competitionName || "Compétition sans nom")}</strong>
          <small>${escapeHtml([
            swimmerRequest ? "Nageur désactivé" : request.competitionDate ? formatShortDate(request.competitionDate) : "",
            swimmerRequest ? request.birthDate ? formatShortDate(request.birthDate) : "" : engagementLevelLabel(request.competitionLevel),
            swimmerRequest ? request.licenseNumber ? `Licence ${request.licenseNumber}` : "" : request.regionId ? regionDisplayLabel(request.regionId) : "",
            swimmerRequest ? clubDisplayLabel(request, { fallback: "Club non renseigné" }) : "",
            usageDetails
          ].filter(Boolean).join(" - "))}</small>
        </div>
        <div class="admin-engagements-request-meta">
          <span>Demandee par ${escapeHtml(request.requestedByEmail || request.requestedBy || "-")}</span>
          <span>${escapeHtml(request.requestedAt ? formatDeadline(request.requestedAt).replace(/^Limite /, "") : "-")}</span>
        </div>
        <div class="admin-engagements-request-actions">
          ${swimmerRequest ? "" : `<button class="ghost-button" type="button" data-engagement-deletion-action="view" data-engagement-competition-id="${escapeHtml(request.competitionId || "")}">Voir</button>`}
          <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-deletion-action="approve" data-engagement-deletion-request-id="${escapeHtml(request.id || request.competitionId || request.swimmerId || "")}" data-engagement-deletion-request-type="${swimmerRequest ? "swimmer" : "competition"}">${swimmerRequest ? "Confirmer le retrait" : "Approuver"}</button>
          <button class="ghost-button" type="button" data-engagement-deletion-action="reject" data-engagement-deletion-request-id="${escapeHtml(request.id || request.competitionId || request.swimmerId || "")}" data-engagement-deletion-request-type="${swimmerRequest ? "swimmer" : "competition"}">${swimmerRequest ? "Réactiver" : "Refuser"}</button>
        </div>
      </article>
    `;
    }).join("");
    updateEngagementNationalRequestsPresentation();
  }

  async function loadEngagementDeletionRequests({ force = false, silent = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementDeletionRequestsLoading) return;
    if (engagementDeletionRequestsLoaded && !force) return;
    engagementDeletionRequestsLoading = true;
    updateEngagementNationalRequestsPresentation();
    if (elements.engagementsDeletionRequestsRefresh) elements.engagementsDeletionRequestsRefresh.disabled = true;
    if (elements.engagementsDeletionRequestsStatus && !silent) {
      elements.engagementsDeletionRequestsStatus.textContent = "Chargement des demandes...";
      elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
    }
    try {
      const [competitionResult, swimmerResult] = await Promise.all([
        callFunction("listEngagementCompetitionDeletionRequests", { status: "pending", limit: 50 }),
        callFunction("listEngagementSwimmerDeletionRequests", { status: "pending", limit: 50 })
      ]);
      engagementDeletionRequests = [
        ...(Array.isArray(competitionResult.requests) ? competitionResult.requests.map((request) => ({ ...request, requestType: "competition" })) : []),
        ...(Array.isArray(swimmerResult.requests) ? swimmerResult.requests : [])
      ].sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));
      engagementDeletionRequestsLoaded = true;
      updateEngagementDeletionRequestBadge(engagementDeletionRequests.length);
      renderEngagementDeletionRequests();
      if (elements.engagementsDeletionRequestsStatus && !silent) {
        markLastRefresh(elements.engagementsDeletionRequestsStatus);
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
      updateEngagementNationalRequestsPresentation();
    }
  }

  function updateEngagementDeletionRequestBadge(count = engagementDeletionRequests.length) {
    void count;
    updateEngagementNationalRequestsPresentation();
  }

  async function resolveEngagementDeletionRequest(requestId, decision, requestType = "competition") {
    const cleanId = String(requestId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const approve = decision === "approved";
    const swimmerRequest = requestType === "swimmer";
    const message = swimmerRequest
      ? approve
        ? "Confirmer le retrait de ce nageur ? Sa fiche restera archivée et désactivée pour préserver l'historique."
        : "Refuser cette demande et réactiver le nageur dans l'effectif de son club ?"
      : approve
        ? "Approuver cette demande et supprimer définitivement la compétition ?"
        : "Refuser cette demande de suppression ?";
    if (!global.confirm(message)) return;
    if (elements.engagementsDeletionRequestsStatus) {
      elements.engagementsDeletionRequestsStatus.textContent = swimmerRequest
        ? approve ? "Confirmation du retrait..." : "Réactivation en cours..."
        : approve ? "Suppression en cours..." : "Refus en cours...";
      elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
    }
    try {
      await callFunction(swimmerRequest ? "resolveEngagementSwimmerDeletionRequest" : "resolveEngagementCompetitionDeletionRequest", {
        requestId: cleanId,
        decision: approve ? "approved" : "rejected"
      });
      portalPendingOverviewLoaded = false;
      engagementDeletionRequestsLoaded = false;
      await loadEngagementDeletionRequests({ force: true });
      await loadPortalPendingOverview({ force: true });
      if (approve && !swimmerRequest) {
        invalidateEngagementCalendarCaches();
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
      updateEngagementNationalSwimmerSelectionState();
      return;
    }
    if (!engagementNationalSwimmers.length) {
      updateEngagementNationalSwimmersStatus(0);
      elements.engagementsNationalSwimmersList.innerHTML = '<p class="admin-engagements-empty">Lancez une recherche pour afficher les nageurs de la base.</p>';
      updateEngagementNationalSwimmerSelectionState();
      return;
    }
    const swimmers = filteredEngagementNationalSwimmers();
    updateEngagementNationalSwimmersStatus(swimmers.length);
    if (!swimmers.length) {
      elements.engagementsNationalSwimmersList.innerHTML = '<p class="admin-engagements-empty">Aucun nageur ne correspond aux filtres.</p>';
      updateEngagementNationalSwimmerSelectionState();
      return;
    }
    const rows = swimmers.map((swimmer) => {
      const active = swimmer.active !== false;
      const merged = swimmer.status === "merged" || Boolean(swimmer.mergedIntoId);
      const name = engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
      const statusLabel = merged
        ? `Fusionne vers ${swimmer.mergedIntoName || swimmer.mergedIntoId || "une autre fiche"}`
        : active ? "Actif" : "Desactive";
      const sourceId = swimmer.id || swimmer.swimmerIndexId || "";
      const sourceType = swimmer.source || "performances";
      const sourceKey = `${sourceType}:${sourceId}`;
      const mergeOpen = engagementNationalSwimmerMergeMode && engagementNationalSwimmerMergeSourceId === sourceKey;
      const mergeTargets = mergeOpen ? engagementNationalSwimmerMergeTargets : [];
      const alertLabel = engagementNationalSwimmerDuplicateAlertLabel(swimmer, swimmers);
      const clubLabel = clubDisplayLabel(swimmer, { fallback: "Club non renseigné" });
      const perfCount = Number(swimmer.performanceCount || 0) || 0;
      return `
        <tr class="admin-engagements-national-swimmer-row" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}" data-engagement-national-swimmer-key="${escapeHtml(sourceKey)}" data-active="${active ? "true" : "false"}" data-merged="${merged ? "true" : "false"}">
          <td class="admin-engagements-national-choice">
            ${merged ? "" : `<input type="radio" name="adminEngagementsNationalSwimmerKeep" value="${escapeHtml(sourceKey)}" title="Conserver cette fiche" data-engagement-national-swimmer-keep>`}
          </td>
          <td class="admin-engagements-national-choice">
            ${merged ? "" : `<input type="checkbox" value="${escapeHtml(sourceKey)}" title="Fusionner cette fiche vers la fiche conservee" data-engagement-national-swimmer-merge-check>`}
          </td>
          <td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge" data-score="${escapeHtml(alertLabel.score)}">${escapeHtml(alertLabel.label)}</span></td>
          <td><strong>${escapeHtml(swimmer.lastName || name)}</strong></td>
          <td>${escapeHtml(swimmer.firstName || "")}</td>
          <td>${escapeHtml(swimmer.birthDate ? formatShortDate(swimmer.birthDate) : "-")}</td>
          <td>${escapeHtml(swimmer.sex || "-")}</td>
          <td>${escapeHtml(swimmer.licenseNumber || "-")}</td>
          <td>${escapeHtml(clubLabel)}</td>
          <td>${escapeHtml(perfCount ? String(perfCount) : "-")}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td class="admin-engagements-national-table-actions">
            ${merged ? `
              <button class="ghost-button" type="button" data-engagement-national-swimmer-action="repair-publication" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}">Finaliser la publication</button>
            ` : `
              <details class="admin-national-row-menu">
                <summary aria-label="Actions pour ${escapeHtml(name)}" title="Actions">&#8942;</summary>
                <div>
                  <button class="ghost-button" type="button" data-engagement-national-swimmer-action="edit" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}">Modifier la fiche</button>
                  ${!engagementNationalSwimmerMergeMode ? "" : `<button class="ghost-button" type="button" data-engagement-national-swimmer-action="merge" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}">Choisir une autre cible</button>`}
                  ${sourceType !== "engagement" ? "" : `<button class="ghost-button" type="button" data-engagement-national-swimmer-action="${active ? "disable" : "enable"}" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}">${active ? "Désactiver" : "Réactiver"}</button>`}
                  ${sourceType === "engagement" ? `<button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-national-swimmer-action="delete" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}">Supprimer</button>` : ""}
                </div>
              </details>
            `}
          </td>
        </tr>
        ${mergeOpen ? `
          <tr class="admin-engagements-national-merge-row">
            <td colspan="12">
              <div class="admin-engagements-national-merge" data-engagement-national-swimmer-merge="${escapeHtml(sourceKey)}">
                <label>
                  <span>Recherche cible</span>
                  <input type="search" value="${escapeHtml(engagementNationalSwimmerMergeQuery)}" placeholder="Nom, prénom ou licence" data-engagement-national-swimmer-merge-query>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-swimmer-action="search-merge" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}" ${engagementNationalSwimmerMergeLoading ? "disabled" : ""}>Rechercher</button>
                </div>
                <label class="admin-engagements-national-merge-target">
                  <span>Fusionner vers</span>
                  <select data-engagement-national-swimmer-merge-target>
                    <option value="">Choisir la fiche à conserver</option>
                    ${mergeTargets.map((candidate) => {
                      const candidateId = candidate.id || candidate.swimmerIndexId || "";
                      const candidateSource = candidate.source || "performances";
                      const candidateName = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.name || candidateId;
                      return `<option value="${escapeHtml(`${candidateSource}:${candidateId}`)}">${escapeHtml(candidateName)} - ${escapeHtml(candidate.licenseNumber || "sans licence")} - ${escapeHtml(clubDisplayLabel(candidate, { fallback: "club non renseigné" }))} - ${escapeHtml(candidateSource === "performances" ? "LivePalmes" : "création club")}</option>`;
                    }).join("")}
                  </select>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-swimmer-action="cancel-merge" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}">Annuler</button>
                  <button type="button" data-engagement-national-swimmer-action="confirm-merge" data-engagement-national-swimmer-id="${escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${escapeHtml(sourceType)}" ${mergeTargets.length ? "" : "disabled"}>Confirmer la fusion</button>
                </div>
                <p class="admin-engagements-request-note">${escapeHtml(engagementNationalSwimmerMergeLoading ? "Recherche en cours..." : mergeTargets.length ? `${mergeTargets.length} cible${mergeTargets.length > 1 ? "s" : ""} trouvée${mergeTargets.length > 1 ? "s" : ""}.` : "Lancez une recherche pour trouver la fiche à conserver.")}</p>
              </div>
            </td>
          </tr>
        ` : ""}
      `;
    }).join("");
    elements.engagementsNationalSwimmersList.innerHTML = `
      <div class="admin-engagements-national-table-wrap">
        <table class="admin-engagements-national-table" data-merge-mode="${engagementNationalSwimmerMergeMode ? "true" : "false"}">
          <thead>
            <tr>
              <th class="admin-engagements-national-choice">Conserver</th>
              <th class="admin-engagements-national-choice">Fusionner</th>
              <th class="admin-engagements-national-merge-only">Alerte</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Naissance</th>
              <th>Sexe</th>
              <th>Licence</th>
              <th>Club</th>
              <th>Perf.</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    updateEngagementNationalSwimmerSelectionState();
  }

  function updateEngagementNationalSwimmersStatus(filteredCount = engagementNationalSwimmers.length) {
    if (!elements.engagementsNationalSwimmersStatus) return;
    const total = engagementNationalSwimmers.length;
    if (!total) {
      elements.engagementsNationalSwimmersStatus.textContent = "Aucun nageur charge. Lancez une recherche.";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      return;
    }
    const filtered = Math.max(0, Math.min(total, Number(filteredCount) || 0));
    elements.engagementsNationalSwimmersStatus.textContent = filtered === total
      ? `${total} nageur${total > 1 ? "s" : ""} charge${total > 1 ? "s" : ""}.`
      : `${filtered} nageur${filtered > 1 ? "s" : ""} affiche${filtered > 1 ? "s" : ""} sur ${total} charge${total > 1 ? "s" : ""}.`;
    elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
  }

  function engagementSwimmerChangeSummary(current = {}, proposed = {}) {
    const fields = [
      ["lastName", "Nom", (value) => value || "Non renseigné"],
      ["firstName", "Prénom", (value) => value || "Non renseigné"],
      ["birthDate", "Naissance", (value) => value ? formatShortDate(value) : "Non renseignée"],
      ["sex", "Sexe", (value) => value || "Non renseigné"],
      ["licenseNumber", "Licence", (value) => value || "Non renseignée"]
    ];
    return fields
      .filter(([key]) => String(current[key] || "") !== String(proposed[key] || ""))
      .map(([key, label, format]) => ({ label, before: format(current[key]), after: format(proposed[key]) }));
  }

  function updateEngagementSwimmerChangeRequestsBadge(count = engagementSwimmerChangeRequests.length) {
    const total = Math.max(0, Number(count) || 0);
    if (elements.engagementsSwimmerChangeRequestsBadge) {
      elements.engagementsSwimmerChangeRequestsBadge.hidden = total === 0;
      elements.engagementsSwimmerChangeRequestsBadge.textContent = String(total);
    }
    if (elements.engagementsSwimmerChangeRequestsCount) {
      elements.engagementsSwimmerChangeRequestsCount.textContent = `${total} en attente`;
    }
  }

  function renderEngagementSwimmerChangeRequests() {
    const section = elements.engagementsSwimmerChangeRequests;
    const mount = elements.engagementsSwimmerChangeRequestsList;
    if (!section || !mount) return;
    updateEngagementSwimmerChangeRequestsBadge();
    if (engagementSwimmerChangeRequestsLoading) {
      mount.innerHTML = '<p class="admin-engagements-empty">Chargement des demandes de correction...</p>';
      updateEngagementNationalRequestsPresentation();
      return;
    }
    if (!engagementSwimmerChangeRequests.length) {
      mount.innerHTML = "";
      updateEngagementNationalRequestsPresentation();
      return;
    }
    mount.innerHTML = engagementSwimmerChangeRequests.map((item) => {
      const current = item.current || {};
      const proposed = item.proposed || {};
      const name = engagementSwimmerDisplayName(current, "Nageur");
      const changes = engagementSwimmerChangeSummary(current, proposed);
      const requesterName = [item.requestedByFirstName, item.requestedByLastName].filter(Boolean).join(" ");
      const requesterIdentity = [requesterName, item.requestedByEmail].filter(Boolean).join(" · ") || "Non renseigné";
      return `
        <article class="admin-engagements-swimmer-change-request" data-engagement-swimmer-change-request="${escapeHtml(item.id || "")}">
          <div class="admin-engagements-swimmer-change-request-head">
            <div>
              <strong>${escapeHtml(name)}</strong>
              <span>${escapeHtml(clubDisplayLabel(item, { fallback: "Club non renseigné" }))} · ${escapeHtml(formatAccessDateTime(item.requestedAt) || "Date inconnue")}</span>
            </div>
            <span class="admin-engagements-request-status" data-status="pending">En attente</span>
          </div>
          <div class="admin-engagements-swimmer-change-diff">
            ${changes.map((change) => `
              <div>
                <span>${escapeHtml(change.label)}</span>
                <del>${escapeHtml(change.before)}</del>
                <strong>${escapeHtml(change.after)}</strong>
              </div>
            `).join("")}
          </div>
          <p class="admin-engagements-request-note"><strong>Demandée par :</strong> ${escapeHtml(requesterIdentity)}</p>
          <p class="admin-engagements-request-note"><strong>Motif du club :</strong> ${escapeHtml(item.reason || "Non précisé")}</p>
          <label class="admin-engagements-swimmer-change-resolution-note">
            <span>Commentaire national <small>(facultatif)</small></span>
            <input type="text" maxlength="500" placeholder="Précision pour le club" data-engagement-swimmer-change-resolution-note>
          </label>
          <div class="admin-engagements-request-actions">
            <button class="ghost-button" type="button" data-engagement-swimmer-change-decision="rejected" data-engagement-swimmer-change-request-id="${escapeHtml(item.id || "")}">Refuser</button>
            <button class="ghost-button" type="button" data-engagement-swimmer-change-edit="${escapeHtml(item.id || "")}">Modifier et valider</button>
            <button type="button" data-engagement-swimmer-change-decision="approved" data-engagement-swimmer-change-request-id="${escapeHtml(item.id || "")}">Valider telle quelle</button>
          </div>
        </article>
      `;
    }).join("");
    updateEngagementNationalRequestsPresentation();
  }

  async function loadEngagementSwimmerChangeRequests({ force = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementSwimmerChangeRequestsLoading) return;
    if (engagementSwimmerChangeRequestsLoaded && !force) return;
    engagementSwimmerChangeRequestsLoading = true;
    updateEngagementNationalRequestsPresentation();
    if (elements.engagementsSwimmerChangeRequestsStatus) {
      elements.engagementsSwimmerChangeRequestsStatus.textContent = "Chargement des demandes...";
      elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "loading";
    }
    renderEngagementSwimmerChangeRequests();
    try {
      const result = await callFunction("listEngagementSwimmerChangeRequests", { status: "pending", limit: 50 });
      engagementSwimmerChangeRequests = Array.isArray(result.requests) ? result.requests : [];
      engagementSwimmerChangeRequestsLoaded = true;
      if (elements.engagementsSwimmerChangeRequestsStatus) {
        elements.engagementsSwimmerChangeRequestsStatus.textContent = "";
        elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "neutral";
      }
    } catch (error) {
      if (elements.engagementsSwimmerChangeRequestsStatus) {
        elements.engagementsSwimmerChangeRequestsStatus.textContent = `Demandes impossibles à charger : ${error?.message || error}`;
        elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "error";
      }
    } finally {
      engagementSwimmerChangeRequestsLoading = false;
      renderEngagementSwimmerChangeRequests();
      updateEngagementNationalRequestsPresentation();
    }
  }

  function openEngagementSwimmerChangeRequestReview(requestId = "", opener = null, card = null) {
    const item = engagementSwimmerChangeRequests.find((request) => request.id === requestId);
    if (!item || !canDeleteEngagementCompetitionDirectly()) return;
    const current = item.current || {};
    const proposed = item.proposed || {};
    const swimmer = {
      ...current,
      ...proposed,
      id: item.requestedSwimmerId || current.id || current.swimmerIndexId || "",
      swimmerIndexId: item.requestedSwimmerId || current.swimmerIndexId || current.id || "",
      source: item.requestedSource || item.targetSource || current.source || "performances",
      identityKey: current.identityKey || "",
      clubId: item.clubId || current.clubId || "",
      clubName: item.clubName || current.clubName || ""
    };
    const resolutionNote = String(card?.querySelector("[data-engagement-swimmer-change-resolution-note]")?.value || "").trim();
    openEngagementSwimmerCorrectionDialog(swimmer, "review", opener, {
      requestId,
      card,
      resolutionNote
    });
  }

  async function resolveEngagementSwimmerChangeRequest(requestId = "", decision = "", card = null, options = {}) {
    if (!requestId || !["approved", "rejected"].includes(decision) || !canDeleteEngagementCompetitionDirectly()) return;
    const verb = decision === "approved" ? "Valider" : "Refuser";
    if (options.confirm !== false && !global.confirm(`${verb} cette demande de correction ?`)) return;
    const resolutionNote = String(options.resolutionNote ?? card?.querySelector("[data-engagement-swimmer-change-resolution-note]")?.value ?? "").trim();
    const buttons = card?.querySelectorAll("button") || [];
    buttons.forEach((button) => { button.disabled = true; });
    if (elements.engagementsSwimmerChangeRequestsStatus) {
      elements.engagementsSwimmerChangeRequestsStatus.textContent = decision === "approved" ? "Application de la correction..." : "Refus de la demande...";
      elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("resolveEngagementSwimmerChangeRequest", {
        requestId,
        decision,
        resolutionNote,
        ...(options.proposed && typeof options.proposed === "object" ? { proposed: options.proposed } : {})
      });
      portalPendingOverviewLoaded = false;
      engagementSwimmerChangeRequestsLoaded = false;
      engagementNationalSwimmersLoaded = false;
      invalidateEngagementClubSwimmersCache();
      await loadEngagementSwimmerChangeRequests({ force: true });
      await loadPortalPendingOverview({ force: true });
      if (elements.engagementsNationalSwimmersSearch?.value.trim().length >= 2) {
        await loadEngagementNationalSwimmers({ force: true, silent: true });
      }
      if (elements.engagementsSwimmerChangeRequestsStatus) {
        const publicWarning = result?.result?.publicSnapshot?.ok === false
          ? " La fiche a été corrigée, mais sa publication publique devra être relancée."
          : "";
        const notificationStatus = result?.request?.resolutionNotification?.status || "";
        const mailWarning = notificationStatus && notificationStatus !== "sent"
          ? " La demande a bien été traitée, mais l’e-mail au demandeur n’a pas été envoyé."
          : "";
        elements.engagementsSwimmerChangeRequestsStatus.textContent = `${decision === "approved" ? "Correction validée." : "Demande refusée."}${publicWarning}${mailWarning}`;
        elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = publicWarning || mailWarning ? "warning" : "ok";
      }
      return result;
    } catch (error) {
      buttons.forEach((button) => { button.disabled = false; });
      if (elements.engagementsSwimmerChangeRequestsStatus) {
        elements.engagementsSwimmerChangeRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
        elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "error";
      }
      if (options.rethrow) throw error;
      return null;
    }
  }

  function openEngagementAccessRequestRejectDialog(requestId = "") {
    const request = engagementAccessRequests.find((item) => item.id === requestId);
    if (!request || !elements.engagementsAccessRequestRejectDialog) return;
    elements.engagementsAccessRequestRejectForm?.reset();
    if (elements.engagementsAccessRequestRejectId) elements.engagementsAccessRequestRejectId.value = requestId;
    if (elements.engagementsAccessRequestRejectMessage) elements.engagementsAccessRequestRejectMessage.textContent = "";
    elements.engagementsAccessRequestRejectDialog.showModal();
    elements.engagementsAccessRequestRejectReason?.focus();
  }

  function closeEngagementAccessRequestRejectDialog() {
    if (elements.engagementsAccessRequestRejectDialog?.open) elements.engagementsAccessRequestRejectDialog.close();
  }

  async function submitEngagementAccessRequestRejection(event) {
    event?.preventDefault?.();
    const requestId = elements.engagementsAccessRequestRejectId?.value || "";
    const reason = String(elements.engagementsAccessRequestRejectReason?.value || "").trim();
    if (!requestId || !reason) return;
    const button = elements.engagementsAccessRequestRejectForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    if (elements.engagementsAccessRequestRejectMessage) {
      elements.engagementsAccessRequestRejectMessage.textContent = "Refus et envoi de l’e-mail en cours...";
      elements.engagementsAccessRequestRejectMessage.dataset.tone = "loading";
    }
    const resolved = await resolveEngagementAccessRequest(requestId, "rejected", null, reason);
    if (resolved) closeEngagementAccessRequestRejectDialog();
    else if (elements.engagementsAccessRequestRejectMessage) {
      elements.engagementsAccessRequestRejectMessage.textContent = "Refus impossible. Vérifiez le message affiché dans la liste des demandes.";
      elements.engagementsAccessRequestRejectMessage.dataset.tone = "error";
    }
    if (button) button.disabled = false;
  }

  function closeEngagementSwimmerCorrectionDialog() {
    if (elements.engagementsSwimmerCorrectionDialog?.open) elements.engagementsSwimmerCorrectionDialog.close();
  }

  function resetEngagementSwimmerCorrectionDialog() {
    elements.engagementsSwimmerCorrectionForm?.reset();
    if (elements.engagementsSwimmerCorrectionReason) elements.engagementsSwimmerCorrectionReason.required = true;
    if (elements.engagementsSwimmerCorrectionMessage) {
      elements.engagementsSwimmerCorrectionMessage.textContent = "";
      elements.engagementsSwimmerCorrectionMessage.dataset.tone = "neutral";
    }
    if (elements.engagementsSwimmerCorrectionSubmit) elements.engagementsSwimmerCorrectionSubmit.disabled = false;
  }

  function openEngagementSwimmerCorrectionDialog(swimmer = {}, mode = "request", opener = null, options = {}) {
    const dialog = elements.engagementsSwimmerCorrectionDialog;
    if (!dialog || !swimmer) return;
    resetEngagementSwimmerCorrectionDialog();
    engagementSwimmerCorrectionOpener = opener instanceof HTMLElement ? opener : null;
    const direct = mode === "direct";
    const review = mode === "review";
    engagementSwimmerCorrectionReview = review ? {
      requestId: String(options.requestId || "").trim(),
      card: options.card || null
    } : null;
    const name = engagementSwimmerDisplayName(swimmer, "Nageur");
    if (elements.engagementsSwimmerCorrectionMode) elements.engagementsSwimmerCorrectionMode.value = review ? "review" : direct ? "direct" : "request";
    if (elements.engagementsSwimmerCorrectionSource) elements.engagementsSwimmerCorrectionSource.value = swimmer.source || "performances";
    if (elements.engagementsSwimmerCorrectionId) elements.engagementsSwimmerCorrectionId.value = swimmer.id || swimmer.swimmerIndexId || "";
    if (elements.engagementsSwimmerCorrectionIdentityKey) elements.engagementsSwimmerCorrectionIdentityKey.value = swimmer.identityKey || "";
    if (elements.engagementsSwimmerCorrectionLastName) elements.engagementsSwimmerCorrectionLastName.value = swimmer.lastName || "";
    if (elements.engagementsSwimmerCorrectionFirstName) elements.engagementsSwimmerCorrectionFirstName.value = swimmer.firstName || "";
    if (elements.engagementsSwimmerCorrectionBirthDate) elements.engagementsSwimmerCorrectionBirthDate.value = swimmer.birthDate || "";
    if (elements.engagementsSwimmerCorrectionSex) elements.engagementsSwimmerCorrectionSex.value = swimmer.sex || "";
    if (elements.engagementsSwimmerCorrectionLicense) elements.engagementsSwimmerCorrectionLicense.value = swimmer.licenseNumber || "";
    if (elements.engagementsSwimmerCorrectionTitle) elements.engagementsSwimmerCorrectionTitle.textContent = review ? "Modifier et valider la demande" : direct ? "Modifier le nageur" : "Demander une correction";
    if (elements.engagementsSwimmerCorrectionContext) elements.engagementsSwimmerCorrectionContext.textContent = `${name} · ${clubDisplayLabel(swimmer, { fallback: "Club non renseigné" })}`;
    if (elements.engagementsSwimmerCorrectionReasonLabel) elements.engagementsSwimmerCorrectionReasonLabel.textContent = review ? "Commentaire national (facultatif)" : direct ? "Motif de la correction" : "Motif de la demande";
    if (elements.engagementsSwimmerCorrectionReason) {
      elements.engagementsSwimmerCorrectionReason.required = !review;
      elements.engagementsSwimmerCorrectionReason.value = review ? String(options.resolutionNote || "") : "";
    }
    if (elements.engagementsSwimmerCorrectionSubmit) elements.engagementsSwimmerCorrectionSubmit.textContent = review ? "Valider la demande" : direct ? "Enregistrer la correction" : "Envoyer la demande";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    elements.engagementsSwimmerCorrectionLastName?.focus();
  }

  async function submitEngagementSwimmerCorrection() {
    if (!elements.engagementsSwimmerCorrectionForm?.reportValidity()) return;
    const mode = elements.engagementsSwimmerCorrectionMode?.value || "request";
    const direct = mode === "direct";
    const review = mode === "review";
    if (direct && !global.confirm("Enregistrer cette correction nationale ? Les performances et engagements liés seront mis à jour.")) return;
    if (review && !global.confirm("Valider cette demande avec les valeurs affichées ?")) return;
    const payload = {
      source: elements.engagementsSwimmerCorrectionSource?.value || "performances",
      swimmerId: elements.engagementsSwimmerCorrectionId?.value || "",
      identityKey: elements.engagementsSwimmerCorrectionIdentityKey?.value || "",
      proposed: {
        lastName: elements.engagementsSwimmerCorrectionLastName?.value || "",
        firstName: elements.engagementsSwimmerCorrectionFirstName?.value || "",
        birthDate: elements.engagementsSwimmerCorrectionBirthDate?.value || "",
        sex: elements.engagementsSwimmerCorrectionSex?.value || "",
        licenseNumber: elements.engagementsSwimmerCorrectionLicense?.value || ""
      },
      reason: elements.engagementsSwimmerCorrectionReason?.value || ""
    };
    if (elements.engagementsSwimmerCorrectionSubmit) elements.engagementsSwimmerCorrectionSubmit.disabled = true;
    if (elements.engagementsSwimmerCorrectionMessage) {
      elements.engagementsSwimmerCorrectionMessage.textContent = review ? "Validation de la demande..." : direct ? "Enregistrement de la correction..." : "Envoi de la demande...";
      elements.engagementsSwimmerCorrectionMessage.dataset.tone = "loading";
    }
    try {
      const result = review
        ? await resolveEngagementSwimmerChangeRequest(
          engagementSwimmerCorrectionReview?.requestId || "",
          "approved",
          engagementSwimmerCorrectionReview?.card || null,
          {
            confirm: false,
            rethrow: true,
            proposed: payload.proposed,
            resolutionNote: payload.reason
          }
        )
        : await callFunction(direct ? "updateEngagementNationalSwimmerIdentity" : "requestEngagementClubSwimmerChange", payload);
      invalidateEngagementClubSwimmersCache();
      engagementNationalSwimmersLoaded = false;
      engagementSwimmerChangeRequestsLoaded = false;
      closeEngagementSwimmerCorrectionDialog();
      if (review) {
        publicPerformanceSwimmerSearchShards.clear();
      } else if (direct) {
        publicPerformanceSwimmerSearchShards.clear();
        await Promise.all([
          elements.engagementsNationalSwimmersSearch?.value.trim().length >= 2
            ? loadEngagementNationalSwimmers({ force: true, silent: true })
            : Promise.resolve(),
          loadEngagementSwimmerChangeRequests({ force: true })
        ]);
        if (elements.engagementsNationalSwimmersStatus) {
          const publicWarning = result?.publicSnapshot?.ok === false ? " Publication publique à relancer." : "";
          elements.engagementsNationalSwimmersStatus.textContent = `Nageur corrigé.${publicWarning}`;
          elements.engagementsNationalSwimmersStatus.dataset.tone = publicWarning ? "warning" : "ok";
        }
      } else {
        await loadEngagementClubSwimmers({ force: true, silent: true });
        if (elements.engagementsClubSwimmersDirectoryStatus) {
          elements.engagementsClubSwimmersDirectoryStatus.textContent = "Demande envoyée au niveau national.";
          elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
        }
      }
    } catch (error) {
      if (elements.engagementsSwimmerCorrectionSubmit) elements.engagementsSwimmerCorrectionSubmit.disabled = false;
      if (elements.engagementsSwimmerCorrectionMessage) {
        elements.engagementsSwimmerCorrectionMessage.textContent = `Correction impossible : ${error?.message || error}`;
        elements.engagementsSwimmerCorrectionMessage.dataset.tone = "error";
      }
    }
  }

  function normalizeEngagementNationalClub(row = []) {
    if (row && !Array.isArray(row) && typeof row === "object") {
      return {
        ...row,
        clubId: String(row.clubId || row.id || "").trim(),
        clubCode: String(row.clubCode || "").trim(),
        clubName: String(row.clubName || "").trim(),
        regionId: String(row.referenceRegionId || row.regionId || "").trim(),
        federalNumber: String(row.federalNumber || "").trim(),
        city: String(row.city || "").trim(),
        postalCode: String(row.postalCode || "").trim(),
        active: row.active !== false,
        deleted: row.deleted === true
      };
    }
    return {
      clubId: String(row[0] || "").trim(),
      clubCode: String(row[1] || "").trim(),
      clubName: String(row[2] || "").trim(),
      regionId: String(row[3] || "").trim(),
      federalNumber: String(row[4] || "").trim(),
      city: String(row[5] || "").trim(),
      postalCode: String(row[6] || "").trim(),
      active: row[7] !== false,
      deleted: false,
      source: "intranap"
    };
  }

  function readEngagementNationalClubCache() {
    try {
      const cached = JSON.parse(global.localStorage?.getItem(ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY) || "null");
      if (!cached || cached.version !== 1 || !Array.isArray(cached.clubs)) return { clubs: [], syncedThrough: "" };
      return {
        clubs: cached.clubs.map(normalizeEngagementNationalClub).filter((club) => club.clubId),
        syncedThrough: String(cached.syncedThrough || "").trim()
      };
    } catch (_) {
      return { clubs: [], syncedThrough: "" };
    }
  }

  function writeEngagementNationalClubCache(clubs = [], syncedThrough = "") {
    try {
      global.localStorage?.setItem(ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY, JSON.stringify({
        version: 1,
        syncedThrough,
        clubs: clubs.map(normalizeEngagementNationalClub).filter((club) => club.clubId)
      }));
    } catch (_) {
      // Le cache reste facultatif si le stockage local est indisponible.
    }
  }

  function engagementNationalClubSyncStart(syncedThrough = "") {
    const date = new Date(syncedThrough);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - 1000).toISOString();
  }

  function mergeEngagementNationalClubDirectory(referenceRows = [], storedClubs = []) {
    const byId = new Map(referenceRows
      .map(normalizeEngagementNationalClub)
      .filter((club) => club.clubId && club.clubName)
      .map((club) => [club.clubId, club]));
    storedClubs.map(normalizeEngagementNationalClub).filter((club) => club.clubId).forEach((club) => {
      if (club.deleted === true) byId.delete(club.clubId);
      else byId.set(club.clubId, { ...(byId.get(club.clubId) || {}), ...club });
    });
    return Array.from(byId.values()).sort((left, right) =>
      String(left.clubName || "").localeCompare(String(right.clubName || ""), "fr")
      || String(left.clubCode || "").localeCompare(String(right.clubCode || ""), "fr")
    );
  }

  function filteredEngagementNationalClubs() {
    const terms = normalizedEngagementClubSearch(elements.engagementsNationalClubsSearch?.value || "").split(/\s+/).filter(Boolean);
    const status = elements.engagementsNationalClubsStatusFilter?.value || "";
    const regionId = elements.engagementsNationalClubsRegionFilter?.value || "";
    return engagementNationalClubs.filter((club) => {
      if (status === "active" && club.active === false) return false;
      if (status === "inactive" && club.active !== false) return false;
      if (regionId && club.regionId !== regionId) return false;
      const haystack = normalizedEngagementClubSearch([
        club.clubId, club.clubCode, club.clubName, club.federalNumber,
        club.city, club.postalCode, club.regionId
      ].filter(Boolean).join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }

  function setEngagementNationalClubAdministrators(administrators = [], available = true) {
    const byClub = new Map();
    (Array.isArray(administrators) ? administrators : []).forEach((administrator) => {
      const clubId = String(administrator?.clubId || "").trim();
      if (!clubId || !administrator?.email) return;
      if (!byClub.has(clubId)) byClub.set(clubId, []);
      byClub.get(clubId).push({
        uid: String(administrator.uid || "").trim(),
        email: String(administrator.email || "").trim(),
        firstName: String(administrator.firstName || "").trim(),
        lastName: String(administrator.lastName || "").trim()
      });
    });
    byClub.forEach((items) => items.sort((left, right) =>
      `${left.lastName} ${left.firstName} ${left.email}`.localeCompare(`${right.lastName} ${right.firstName} ${right.email}`, "fr", { sensitivity: "base" })
    ));
    engagementNationalClubAdministratorsByClub = byClub;
    engagementNationalClubAdministratorsLoaded = true;
    engagementNationalClubAdministratorsAvailable = available;
  }

  function engagementNationalClubAdministratorsHtml(clubId = "") {
    const administrators = engagementNationalClubAdministratorsByClub.get(clubId) || [];
    const content = !engagementNationalClubAdministratorsLoaded
      ? '<small>Chargement…</small>'
      : !engagementNationalClubAdministratorsAvailable
        ? '<small>Annuaire temporairement indisponible</small>'
        : administrators.length
          ? administrators.map((administrator) => {
              const name = [administrator.firstName, administrator.lastName].filter(Boolean).join(" ") || administrator.email;
              return `<small title="${escapeHtml(administrator.email)}"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(administrator.email)}</span></small>`;
            }).join("")
          : '<small>Aucun administrateur actif</small>';
    return `<div class="admin-national-club-card-administrators"><span>Administrateurs engagements</span>${content}</div>`;
  }

  function renderEngagementNationalClubs() {
    if (!elements.engagementsNationalClubsList) return;
    const clubs = filteredEngagementNationalClubs();
    const renderedClubs = clubs.slice(0, engagementNationalClubsVisibleLimit);
    if (elements.engagementsNationalClubsStatus) {
      elements.engagementsNationalClubsStatus.textContent = `${renderedClubs.length} club${renderedClubs.length > 1 ? "s" : ""} affiché${renderedClubs.length > 1 ? "s" : ""} sur ${clubs.length} correspondant${clubs.length > 1 ? "s" : ""} (${engagementNationalClubs.length} au total).`;
      elements.engagementsNationalClubsStatus.dataset.tone = "ok";
    }
    elements.engagementsNationalClubsList.innerHTML = clubs.length
      ? renderedClubs.map((club) => `<article class="admin-national-club-card" data-national-club-id="${escapeHtml(club.clubId)}">
          <div class="admin-national-club-card-main"><strong>${escapeHtml(club.clubCode || club.clubName)}</strong><span>${escapeHtml(club.clubName)}</span><small>${escapeHtml([club.city, club.postalCode].filter(Boolean).join(" · ") || "Localité non renseignée")}</small></div>
          <div class="admin-national-club-card-reference"><span>Numéro fédéral</span><strong>${escapeHtml(club.federalNumber || "À renseigner")}</strong><small>${escapeHtml(LIVEPALMES_REFERENCE_REGION_LABELS[club.regionId] || club.regionId || "Région inconnue")}</small></div>
          ${engagementNationalClubAdministratorsHtml(club.clubId)}
          <span class="admin-national-club-status" data-active="${club.active !== false}">${club.active !== false ? "Actif" : "Inactif"}</span>
          <button class="ghost-button compact" type="button" data-engagement-national-club-edit="${escapeHtml(club.clubId)}">Modifier</button>
        </article>`).join("") + (renderedClubs.length < clubs.length
          ? '<button class="ghost-button admin-national-clubs-show-more" type="button" data-engagement-national-clubs-show-more>Afficher plus de clubs</button>'
          : "")
      : '<p class="admin-engagements-empty">Aucun club ne correspond aux filtres.</p>';
  }

  async function loadEngagementNationalClubs({ force = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementNationalClubsLoading) return;
    if (engagementNationalClubsLoaded && !force) {
      renderEngagementNationalClubs();
      return;
    }
    engagementNationalClubsLoading = true;
    engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
    if (force) {
      engagementNationalClubAdministratorsByClub = new Map();
      engagementNationalClubAdministratorsLoaded = false;
      engagementNationalClubAdministratorsAvailable = false;
    }
    if (elements.engagementsNationalClubsStatus) {
      elements.engagementsNationalClubsStatus.textContent = "Chargement du référentiel clubs...";
      elements.engagementsNationalClubsStatus.dataset.tone = "loading";
    }
    try {
      await loadAccessClubReference();
      const referenceRows = global.LIVEPALMES_CLUB_REFERENCE?.clubs || [];
      const cached = force ? { clubs: [], syncedThrough: "" } : readEngagementNationalClubCache();
      const storedById = new Map(cached.clubs.map((club) => [club.clubId, club]));
      engagementNationalClubs = mergeEngagementNationalClubDirectory(referenceRows, cached.clubs);
      mergeNationalClubsIntoAccessReference(cached.clubs);
      renderEngagementNationalClubs();
      const updatedAfter = force ? "" : engagementNationalClubSyncStart(cached.syncedThrough);
      let pageUpdatedAfter = updatedAfter;
      let afterClubId = "";
      let syncedThrough = cached.syncedThrough;
      let hasMore = true;
      let includeAdministrators = true;
      while (hasMore) {
        const result = await callFunction("listEngagementNationalClubs", {
          limit: 250,
          includeAdministrators,
          directoryMode: true,
          ...(pageUpdatedAfter ? { updatedAfter: pageUpdatedAfter } : {}),
          ...(afterClubId ? { afterClubId } : {})
        });
        if (includeAdministrators && Array.isArray(result.clubAdministrators)) {
          setEngagementNationalClubAdministrators(
            result.clubAdministrators,
            result.clubAdministratorsAvailable !== false
          );
          renderEngagementNationalClubs();
        }
        if (includeAdministrators && result.replaceDirectory === true) storedById.clear();
        includeAdministrators = false;
        (Array.isArray(result.clubs) ? result.clubs : [])
          .map(normalizeEngagementNationalClub)
          .filter((club) => club.clubId)
          .forEach((club) => {
            if (club.deleted === true) storedById.delete(club.clubId);
            else storedById.set(club.clubId, club);
          });
        hasMore = result.hasMore === true && Boolean(result.cursor?.updatedAt && result.cursor?.clubId);
        if (hasMore) {
          pageUpdatedAfter = String(result.cursor.updatedAt);
          afterClubId = String(result.cursor.clubId);
        }
        const watermark = String(result.syncWatermark || "");
        if (watermark && (!syncedThrough || watermark > syncedThrough)) syncedThrough = watermark;
      }
      const storedClubs = Array.from(storedById.values());
      writeEngagementNationalClubCache(storedClubs, syncedThrough);
      engagementNationalClubs = mergeEngagementNationalClubDirectory(referenceRows, storedClubs);
      mergeNationalClubsIntoAccessReference(storedClubs);
      engagementNationalClubsLoaded = true;
      renderEngagementNationalClubs();
    } catch (error) {
      if (elements.engagementsNationalClubsStatus) {
        elements.engagementsNationalClubsStatus.textContent = `Lecture des clubs impossible : ${error?.message || error}`;
        elements.engagementsNationalClubsStatus.dataset.tone = "error";
      }
    } finally {
      engagementNationalClubsLoading = false;
    }
  }

  function closeEngagementNationalClubDialog() {
    if (elements.engagementsNationalClubDialog?.open) elements.engagementsNationalClubDialog.close();
  }

  function openEngagementNationalClubDialog(clubId = "") {
    const club = engagementNationalClubs.find((item) => item.clubId === clubId) || {};
    if (elements.engagementsNationalClubForm) elements.engagementsNationalClubForm.reset();
    if (elements.engagementsNationalClubId) elements.engagementsNationalClubId.value = club.clubId || "";
    if (elements.engagementsNationalClubFederalNumber) {
      elements.engagementsNationalClubFederalNumber.value = club.federalNumber || "";
      elements.engagementsNationalClubFederalNumber.readOnly = false;
      elements.engagementsNationalClubFederalNumber.dataset.originalValue = club.federalNumber || "";
    }
    if (elements.engagementsNationalClubCode) elements.engagementsNationalClubCode.value = club.clubCode || "";
    if (elements.engagementsNationalClubName) elements.engagementsNationalClubName.value = club.clubName || "";
    if (elements.engagementsNationalClubRegion) elements.engagementsNationalClubRegion.value = club.regionId || "";
    if (elements.engagementsNationalClubCity) elements.engagementsNationalClubCity.value = club.city || "";
    if (elements.engagementsNationalClubPostalCode) elements.engagementsNationalClubPostalCode.value = club.postalCode || "";
    if (elements.engagementsNationalClubActive) elements.engagementsNationalClubActive.checked = club.active !== false;
    if (elements.engagementsNationalClubDelete) elements.engagementsNationalClubDelete.hidden = !club.clubId || club.source !== "national";
    if (elements.engagementsNationalClubDialogTitle) elements.engagementsNationalClubDialogTitle.textContent = club.clubId ? `Modifier ${club.clubCode || club.clubName}` : "Ajouter un club";
    if (elements.engagementsNationalClubMessage) {
      elements.engagementsNationalClubMessage.textContent = club.clubId && club.federalNumber
        ? "Une correction du numéro fédéral demandera une confirmation et sera journalisée."
        : "";
      elements.engagementsNationalClubMessage.dataset.tone = "loading";
    }
    if (!elements.engagementsNationalClubDialog?.open) elements.engagementsNationalClubDialog?.showModal();
    elements.engagementsNationalClubFederalNumber?.focus();
  }

  async function saveEngagementNationalClub(event) {
    event.preventDefault();
    const clubId = elements.engagementsNationalClubId?.value || "";
    const previousFederalNumber = String(elements.engagementsNationalClubFederalNumber?.dataset.originalValue || "").trim().toUpperCase();
    const nextFederalNumber = String(elements.engagementsNationalClubFederalNumber?.value || "").trim().toUpperCase();
    const federalNumberChanged = Boolean(clubId && previousFederalNumber && previousFederalNumber !== nextFederalNumber);
    if (federalNumberChanged && !global.confirm(`Corriger le numéro fédéral de ${previousFederalNumber} vers ${nextFederalNumber} ? Cette modification sera journalisée.`)) return;
    const submit = elements.engagementsNationalClubForm?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    if (elements.engagementsNationalClubMessage) {
      elements.engagementsNationalClubMessage.textContent = "Enregistrement du club...";
      elements.engagementsNationalClubMessage.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("saveEngagementNationalClub", {
        clubId,
        confirmFederalNumberChange: federalNumberChanged,
        club: {
          federalNumber: elements.engagementsNationalClubFederalNumber?.value || "",
          clubCode: elements.engagementsNationalClubCode?.value || "",
          clubName: elements.engagementsNationalClubName?.value || "",
          regionId: elements.engagementsNationalClubRegion?.value || "",
          city: elements.engagementsNationalClubCity?.value || "",
          postalCode: elements.engagementsNationalClubPostalCode?.value || "",
          active: elements.engagementsNationalClubActive?.checked === true
        }
      });
      const saved = result.club || {};
      engagementNationalClubs = engagementNationalClubs.filter((club) => club.clubId !== saved.clubId).concat(saved)
        .sort((left, right) => String(left.clubName || "").localeCompare(String(right.clubName || ""), "fr"));
      mergeNationalClubsIntoAccessReference([saved]);
      engagementNationalClubsLoaded = true;
      renderEngagementNationalClubs();
      closeEngagementNationalClubDialog();
    } catch (error) {
      if (elements.engagementsNationalClubMessage) {
        elements.engagementsNationalClubMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsNationalClubMessage.dataset.tone = "error";
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function deleteEngagementNationalClub() {
    const clubId = elements.engagementsNationalClubId?.value || "";
    const club = engagementNationalClubs.find((item) => item.clubId === clubId);
    if (!club || club.source !== "national") return;
    if (!global.confirm(`Supprimer définitivement ${club.clubCode || club.clubName} ? Cette action n'est possible que si aucune donnée n'est liée à ce club.`)) return;
    if (elements.engagementsNationalClubDelete) elements.engagementsNationalClubDelete.disabled = true;
    if (elements.engagementsNationalClubMessage) {
      elements.engagementsNationalClubMessage.textContent = "Vérification des données liées au club...";
      elements.engagementsNationalClubMessage.dataset.tone = "loading";
    }
    try {
      await callFunction("deleteEngagementNationalClub", { clubId, confirmPermanent: true });
      engagementNationalClubs = engagementNationalClubs.filter((item) => item.clubId !== clubId);
      accessClubReference = accessClubReference.filter((item) => item.clubId !== clubId);
      accessClubReferenceById.delete(clubId);
      engagementNationalClubsLoaded = true;
      renderEngagementNationalClubs();
      closeEngagementNationalClubDialog();
    } catch (error) {
      if (elements.engagementsNationalClubMessage) {
        elements.engagementsNationalClubMessage.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsNationalClubMessage.dataset.tone = "error";
      }
    } finally {
      if (elements.engagementsNationalClubDelete) elements.engagementsNationalClubDelete.disabled = false;
    }
  }

  function engagementNationalStatusMatches(item = {}, status = "") {
    const merged = item.status === "merged" || Boolean(item.mergedIntoId);
    if (status === "merged") return merged;
    if (status === "active") return !merged && item.active !== false;
    if (status === "inactive") return !merged && item.active === false;
    return true;
  }

  function filteredEngagementNationalSwimmers() {
    const terms = normalizedEngagementClubSearch(elements.engagementsNationalSwimmersSearch?.value || "").split(/\s+/).filter(Boolean);
    const status = elements.engagementsNationalSwimmersStatusFilter?.value || "";
    return engagementNationalSwimmers.filter((swimmer) => {
      if (!engagementNationalStatusMatches(swimmer, status)) return false;
      if (!terms.length) return true;
      const haystack = normalizedEngagementClubSearch([
        swimmer.firstName,
        swimmer.lastName,
        swimmer.name,
        swimmer.licenseNumber,
        swimmer.clubId,
        swimmer.clubName,
        swimmer.sex,
        swimmer.birthDate,
        swimmer.searchText,
        ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
        ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
      ].filter(Boolean).join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }

  function resetEngagementNationalSwimmerFilters() {
    if (elements.engagementsNationalSwimmersSearch) elements.engagementsNationalSwimmersSearch.value = "";
    if (elements.engagementsNationalSwimmersStatusFilter) elements.engagementsNationalSwimmersStatusFilter.value = "";
    engagementNationalSwimmers = [];
    engagementNationalSwimmersLoaded = true;
    resetEngagementNationalSwimmerMergeState();
    renderEngagementNationalSwimmers();
  }

  async function loadEngagementNationalSwimmers({ force = false, silent = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementNationalSwimmersLoading) return;
    if (engagementNationalSwimmersLoaded && !force) return;
    const query = String(elements.engagementsNationalSwimmersSearch?.value || "").trim();
    if (query.length < 2) {
      engagementNationalSwimmers = [];
      engagementNationalSwimmersLoaded = true;
      renderEngagementNationalSwimmers();
      if (elements.engagementsNationalSwimmersStatus && !silent) {
        elements.engagementsNationalSwimmersStatus.textContent = "Saisissez au moins 2 caracteres pour chercher dans la base nageurs.";
        elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      }
      return;
    }
    engagementNationalSwimmersLoading = true;
    if (elements.engagementsNationalSwimmersRefresh) elements.engagementsNationalSwimmersRefresh.disabled = true;
    if (elements.engagementsNationalSwimmersStatus && !silent) {
      elements.engagementsNationalSwimmersStatus.textContent = "Recherche des nageurs...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      const [result, publicSwimmers] = await Promise.all([
        callFunction("searchEngagementNationalSwimmers", { query, limit: 60 }),
        searchEngagementAdminPublicSwimmers(query, 80)
      ]);
      engagementNationalSwimmers = mergeEngagementNationalSwimmerResults([
        ...publicSwimmers,
        ...(Array.isArray(result.swimmers) ? result.swimmers : [])
      ]).slice(0, 100);
      engagementNationalSwimmersLoaded = true;
      renderEngagementNationalSwimmers();
      if (elements.engagementsNationalSwimmersStatus && !silent) {
        updateEngagementNationalSwimmersStatus(filteredEngagementNationalSwimmers().length);
      }
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus && !silent) {
        elements.engagementsNationalSwimmersStatus.textContent = `Lecture nageurs impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    } finally {
      engagementNationalSwimmersLoading = false;
      if (elements.engagementsNationalSwimmersRefresh) elements.engagementsNationalSwimmersRefresh.disabled = false;
      if (engagementNationalSwimmersLoaded) renderEngagementNationalSwimmers();
    }
  }

  async function setEngagementNationalSwimmerStatus(swimmerId, active) {
    const cleanId = String(swimmerId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const swimmer = engagementNationalSwimmers.find((item) => item.id === cleanId || item.swimmerIndexId === cleanId) || {};
    const name = engagementSwimmerDisplayName(swimmer, "ce nageur");
    const message = active
      ? `Réactiver ${name} ? Il redeviendra utilisable par son club.`
      : `Désactiver ${name} ? Il ne sera plus proposable dans les engagements du club.`;
    if (!global.confirm(message)) return;
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = active ? "Réactivation en cours..." : "Désactivation en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("setEngagementNationalClubSwimmerStatus", {
        swimmerId: cleanId,
        active
      });
      engagementNationalSwimmersLoaded = false;
      invalidateEngagementClubSwimmersCache();
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
    const name = engagementSwimmerDisplayName(swimmer, "ce nageur");
    if (!global.confirm(`Supprimer définitivement ${name} de la base des nageurs créés par les clubs ? Cette action est irréversible.`)) return;
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = "Suppression définitive en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("deleteEngagementNationalClubSwimmer", {
        swimmerId: cleanId,
        confirmPermanent: true
      });
      engagementNationalSwimmersLoaded = false;
      invalidateEngagementClubSwimmersCache();
      await loadEngagementNationalSwimmers({ force: true });
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    }
  }

  function resetEngagementNationalSwimmerMergeState() {
    engagementNationalSwimmerMergeSourceId = "";
    engagementNationalSwimmerMergeTargets = [];
    engagementNationalSwimmerMergeQuery = "";
    engagementNationalSwimmerMergeLoading = false;
  }

  async function searchEngagementNationalSwimmerMergeTargets(sourceSwimmerId, sourceSource = "engagement") {
    const sourceId = String(sourceSwimmerId || "").trim();
    const sourceType = String(sourceSource || "engagement").trim() || "engagement";
    if (!sourceId || !canDeleteEngagementCompetitionDirectly()) return;
    const sourceKey = `${sourceType}:${sourceId}`;
    const card = elements.engagementsNationalSwimmersList?.querySelector(`[data-engagement-national-swimmer-key="${CSS.escape(sourceKey)}"]`);
    const query = String(card?.querySelector("[data-engagement-national-swimmer-merge-query]")?.value || engagementNationalSwimmerMergeQuery || "").trim();
    engagementNationalSwimmerMergeQuery = query;
    engagementNationalSwimmerMergeLoading = true;
    renderEngagementNationalSwimmers();
    try {
      const [result, publicSwimmers] = await Promise.all([
        callFunction("searchEngagementNationalSwimmerMergeTargets", {
          sourceSwimmerId: sourceId,
          sourceSource: sourceType,
          query,
          limit: 25
        }),
        query ? searchEngagementAdminPublicSwimmers(query, 40) : Promise.resolve([])
      ]);
      engagementNationalSwimmerMergeTargets = mergeEngagementNationalSwimmerResults([
        ...publicSwimmers,
        ...(Array.isArray(result.swimmers) ? result.swimmers : [])
      ])
        .filter((swimmer) => `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId}` !== sourceKey)
        .filter((swimmer) => swimmer.status !== "merged" && !swimmer.mergedIntoId)
        .slice(0, 40);
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `${engagementNationalSwimmerMergeTargets.length} fiche${engagementNationalSwimmerMergeTargets.length > 1 ? "s" : ""} cible${engagementNationalSwimmerMergeTargets.length > 1 ? "s" : ""} trouvée${engagementNationalSwimmerMergeTargets.length > 1 ? "s" : ""}.`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      }
    } catch (error) {
      engagementNationalSwimmerMergeTargets = [];
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Recherche impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    } finally {
      engagementNationalSwimmerMergeLoading = false;
      renderEngagementNationalSwimmers();
    }
  }

  async function mergeEngagementNationalSwimmer(sourceSwimmerId, sourceSource, targetValue) {
    const sourceId = String(sourceSwimmerId || "").trim();
    const sourceType = String(sourceSource || "engagement").trim() || "engagement";
    const [targetSourceRaw, targetIdRaw] = String(targetValue || "").split(":");
    const targetSource = targetSourceRaw || "performances";
    const targetId = targetIdRaw || "";
    if (!sourceId || !targetId || !canDeleteEngagementCompetitionDirectly()) return;
    const source = engagementNationalSwimmers.find((item) =>
      (item.source || "performances") === sourceType && (item.id === sourceId || item.swimmerIndexId === sourceId)
    ) || {};
    const target = engagementNationalSwimmerMergeTargets.find((item) =>
      (item.source || "performances") === targetSource && (item.id === targetId || item.swimmerIndexId === targetId)
    ) || {};
    const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.name || "cette fiche";
    const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.name || "la fiche cible";
    if (!global.confirm(`Fusionner ${sourceName} vers ${targetName} ? La fiche source sera marquée comme fusionnée et retirée des listes club.`)) return;
    const licenseMismatch = Boolean(source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
    if (licenseMismatch && !global.confirm(`Attention : les numéros de licence sont différents (${source.licenseNumber} / ${target.licenseNumber}). Confirmer quand même la fusion ?`)) return;
    const clubMismatch = Boolean(source.clubId && target.clubId && source.clubId !== target.clubId);
    if (clubMismatch && !global.confirm(`Attention : les clubs sont différents (${clubDisplayLabel(source)} / ${clubDisplayLabel(target)}). Confirmer quand même la fusion ?`)) return;
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = "Fusion nageur en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("mergeEngagementNationalClubSwimmer", {
        sourceSwimmerId: sourceId,
        sourceSource: sourceType,
        sourceIdentityKey: source.identityKey || "",
        targetSwimmerId: targetId,
        targetSource,
        targetIdentityKey: target.identityKey || "",
        confirmMerge: true,
        confirmLicenseMismatch: licenseMismatch,
        confirmClubMismatch: clubMismatch
      });
      resetEngagementNationalSwimmerMergeState();
      engagementNationalSwimmersLoaded = false;
      invalidateEngagementClubSwimmersCache();
      await loadEngagementNationalSwimmers({ force: true });
      if (elements.engagementsNationalSwimmersStatus) {
        const totalUpdates = Number(result.entrySwimmerUpdateCount || 0) + Number(result.relayUpdateCount || 0) + Number(result.performanceUpdateCount || 0);
        elements.engagementsNationalSwimmersStatus.textContent = `Fusion terminée. ${totalUpdates} élément${totalUpdates > 1 ? "s" : ""} mis à jour.`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Fusion impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    }
  }

  async function mergeSelectedEngagementNationalSwimmers() {
    const targetKey = selectedEngagementNationalSwimmerKeepKey();
    const sourceKeys = selectedEngagementNationalSwimmerMergeKeys().filter((key) => key !== targetKey);
    if (!targetKey || !sourceKeys.length || !canDeleteEngagementCompetitionDirectly()) {
      updateEngagementNationalSwimmerSelectionState();
      return;
    }
    const target = engagementNationalSwimmerByKey(targetKey);
    const sources = sourceKeys.map(engagementNationalSwimmerByKey).filter(Boolean);
    if (!target || !sources.length) return;
    const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.name || targetKey;
    const licenseMismatch = sources.some((source) => source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
    const clubMismatch = sources.some((source) => source.clubId && target.clubId && source.clubId !== target.clubId);
    const warning = [
      licenseMismatch ? "numéros de licence différents" : "",
      clubMismatch ? "clubs différents" : ""
    ].filter(Boolean).join(", ");
    const message = `Fusionner ${sources.length} fiche${sources.length > 1 ? "s" : ""} vers ${targetName} ? Les performances, engagements et relais seront rattaches a la fiche conservee.${warning ? ` Attention : ${warning}.` : ""}`;
    if (!global.confirm(message)) return;
    engagementNationalSwimmerMergeLoading = true;
    updateEngagementNationalSwimmerSelectionState();
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = "Fusion groupee en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    let successCount = 0;
    const errors = [];
    const [targetSourceRaw, targetIdRaw] = targetKey.split(":");
    for (const source of sources) {
      const sourceKey = engagementNationalSwimmerKey(source);
      const [sourceSourceRaw, sourceIdRaw] = sourceKey.split(":");
      try {
        await callFunction("mergeEngagementNationalClubSwimmer", {
          sourceSwimmerId: sourceIdRaw,
          sourceSource: sourceSourceRaw || "engagement",
          sourceIdentityKey: source.identityKey || "",
          targetSwimmerId: targetIdRaw,
          targetSource: targetSourceRaw || "performances",
          targetIdentityKey: target.identityKey || "",
          confirmMerge: true,
          confirmLicenseMismatch: true,
          confirmClubMismatch: true
        });
        successCount += 1;
      } catch (error) {
        const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.name || sourceKey;
        errors.push(`${sourceName} : ${error?.message || error}`);
      }
    }
    engagementNationalSwimmerMergeLoading = false;
    resetEngagementNationalSwimmerMergeState();
    engagementNationalSwimmersLoaded = false;
    invalidateEngagementClubSwimmersCache();
    await loadEngagementNationalSwimmers({ force: true, silent: true });
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = errors.length
        ? `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}. Erreurs : ${errors.slice(0, 3).join(" | ")}`
        : `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}.`;
      elements.engagementsNationalSwimmersStatus.dataset.tone = errors.length ? "error" : "ok";
    }
  }

  async function repairEngagementNationalSwimmerMergePublication(swimmerId = "", swimmerSource = "performances") {
    const swimmer = engagementNationalSwimmers.find((item) =>
      (item.source || "performances") === swimmerSource && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
    ) || {};
    const name = engagementSwimmerDisplayName(swimmer, "cette fiche fusionnée");
    if (!swimmerId || !global.confirm(`Finaliser la publication de ${name} ? L’ancienne fiche publique sera retirée et ses performances seront rattachées à la fiche conservée.`)) return;
    if (elements.engagementsNationalSwimmersStatus) {
      elements.engagementsNationalSwimmersStatus.textContent = "Publication de la fusion en cours...";
      elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("repairEngagementNationalSwimmerMergePublication", {
        sourceSwimmerId: swimmerId,
        sourceSource: swimmerSource,
        sourceIdentityKey: swimmer.identityKey || ""
      });
      engagementNationalSwimmersLoaded = false;
      await loadEngagementNationalSwimmers({ force: true, silent: true });
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Publication finalisée. ${Number(result?.publicSnapshot?.affectedRows || 0)} ligne${Number(result?.publicSnapshot?.affectedRows || 0) > 1 ? "s" : ""} synchronisée${Number(result?.publicSnapshot?.affectedRows || 0) > 1 ? "s" : ""}.`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsNationalSwimmersStatus) {
        elements.engagementsNationalSwimmersStatus.textContent = `Publication impossible : ${error?.message || error}`;
        elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
      }
    }
  }

  function renderEngagementNationalPeople() {
    if (!elements.engagementsNationalPeopleList) return;
    if (!canDeleteEngagementCompetitionDirectly()) {
      elements.engagementsNationalPeopleList.innerHTML = "";
      updateEngagementNationalPeopleSelectionState();
      return;
    }
    if (!engagementNationalPeople.length) {
      updateEngagementNationalPeopleStatus(0);
      elements.engagementsNationalPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ou chef d\'équipe créé par un club.</p>';
      updateEngagementNationalPeopleSelectionState();
      return;
    }
    const people = filteredEngagementNationalPeople();
    updateEngagementNationalPeopleStatus(people.length);
    if (!people.length) {
      elements.engagementsNationalPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ne correspond aux filtres.</p>';
      updateEngagementNationalPeopleSelectionState();
      return;
    }
    const rows = people.map((person) => {
      const active = person.active !== false;
      const merged = person.status === "merged" || Boolean(person.mergedIntoId);
      const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Personne sans nom";
      const statusLabel = merged
        ? `Fusionnee vers ${person.mergedIntoName || person.mergedIntoId || "une autre fiche"}`
        : active ? "Actif" : "Desactive";
      const sourceId = person.id || "";
      const mergeOpen = engagementNationalPeopleMergeMode && engagementNationalPersonMergeSourceId === sourceId;
      const mergeCandidates = engagementNationalPersonMergeCandidates(sourceId);
      const alertLabel = engagementNationalPersonDuplicateAlertLabel(person, people);
      const clubLabel = clubDisplayLabel(person, { fallback: "Club non renseigné" });
      return `
        <tr class="admin-engagements-national-person-row" data-engagement-national-person-id="${escapeHtml(sourceId)}" data-active="${active ? "true" : "false"}" data-merged="${merged ? "true" : "false"}">
          <td class="admin-engagements-national-choice">${merged ? "" : `<input type="radio" name="adminEngagementsNationalPersonKeep" value="${escapeHtml(sourceId)}" title="Conserver cette fiche" data-engagement-national-person-keep>`}</td>
          <td class="admin-engagements-national-choice">${merged ? "" : `<input type="checkbox" value="${escapeHtml(sourceId)}" title="Fusionner cette fiche vers la fiche conservee" data-engagement-national-person-merge-check>`}</td>
          <td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge" data-score="${escapeHtml(alertLabel.score)}">${escapeHtml(alertLabel.label)}</span></td>
          <td><strong>${escapeHtml(person.lastName || name)}</strong></td>
          <td>${escapeHtml(person.firstName || "")}</td>
          <td>${escapeHtml(person.licenseNumber || "-")}</td>
          <td>${escapeHtml(engagementClubPersonRoleLabel(person))}</td>
          <td>${escapeHtml(clubLabel)}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td class="admin-engagements-national-table-actions">
            <details class="admin-national-row-menu">
              <summary aria-label="Actions pour ${escapeHtml(name)}" title="Actions">&#8942;</summary>
              <div>
                ${merged || !engagementNationalPeopleMergeMode ? "" : `<button class="ghost-button" type="button" data-engagement-national-person-action="merge" data-engagement-national-person-id="${escapeHtml(sourceId)}">Choisir une autre cible</button>`}
                ${merged ? "" : `<button class="ghost-button" type="button" data-engagement-national-person-action="${active ? "disable" : "enable"}" data-engagement-national-person-id="${escapeHtml(sourceId)}">${active ? "Désactiver" : "Réactiver"}</button>`}
                <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-national-person-action="delete" data-engagement-national-person-id="${escapeHtml(sourceId)}">Supprimer</button>
              </div>
            </details>
          </td>
        </tr>
        ${mergeOpen ? `
          <tr class="admin-engagements-national-merge-row">
            <td colspan="10">
              <div class="admin-engagements-national-merge" data-engagement-national-person-merge="${escapeHtml(sourceId)}">
                <label>
                  <span>Fusionner vers</span>
                  <select data-engagement-national-person-merge-target>
                    <option value="">Choisir la fiche à conserver</option>
                    ${mergeCandidates.map((candidate) => `
                      <option value="${escapeHtml(candidate.id)}">${escapeHtml([candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.licenseNumber || candidate.id)} - ${escapeHtml(candidate.licenseNumber || "sans licence")} - ${escapeHtml(clubDisplayLabel(candidate, { fallback: "club non renseigné" }))}</option>
                    `).join("")}
                  </select>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-person-action="cancel-merge" data-engagement-national-person-id="${escapeHtml(sourceId)}">Annuler</button>
                  <button type="button" data-engagement-national-person-action="confirm-merge" data-engagement-national-person-id="${escapeHtml(sourceId)}" ${mergeCandidates.length ? "" : "disabled"}>Confirmer la fusion</button>
                </div>
                ${mergeCandidates.length ? "" : '<p class="admin-engagements-request-note">Aucune autre fiche n est chargee dans la liste.</p>'}
              </div>
            </td>
          </tr>
        ` : ""}
      `;
    }).join("");
    elements.engagementsNationalPeopleList.innerHTML = `
      <div class="admin-engagements-national-table-wrap">
        <table class="admin-engagements-national-table admin-engagements-national-people-table" data-merge-mode="${engagementNationalPeopleMergeMode ? "true" : "false"}">
          <thead>
            <tr>
              <th class="admin-engagements-national-choice">Conserver</th>
              <th class="admin-engagements-national-choice">Fusionner</th>
              <th class="admin-engagements-national-merge-only">Alerte</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Licence</th>
              <th>Role</th>
              <th>Club</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    updateEngagementNationalPeopleSelectionState();
  }

  function updateEngagementNationalPeopleStatus(filteredCount = engagementNationalPeople.length) {
    if (!elements.engagementsNationalPeopleStatus) return;
    const total = engagementNationalPeople.length;
    if (!total) {
      elements.engagementsNationalPeopleStatus.textContent = "Aucun officiel chargé.";
      elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
      return;
    }
    const filtered = Math.max(0, Math.min(total, Number(filteredCount) || 0));
    elements.engagementsNationalPeopleStatus.textContent = filtered === total
      ? `${total} personne${total > 1 ? "s" : ""} chargée${total > 1 ? "s" : ""}.`
      : `${filtered} personne${filtered > 1 ? "s" : ""} affichée${filtered > 1 ? "s" : ""} sur ${total}.`;
    elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
  }

  function filteredEngagementNationalPeople() {
    const terms = normalizedEngagementClubSearch(elements.engagementsNationalPeopleSearch?.value || "").split(/\s+/).filter(Boolean);
    const status = elements.engagementsNationalPeopleStatusFilter?.value || "";
    return engagementNationalPeople.filter((person) => {
      if (!engagementNationalStatusMatches(person, status)) return false;
      if (!terms.length) return true;
      const haystack = normalizedEngagementClubSearch([
        person.firstName,
        person.lastName,
        person.licenseNumber,
        person.clubId,
        person.clubName,
        engagementClubPersonRoleLabel(person)
      ].filter(Boolean).join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }

  function resetEngagementNationalPeopleFilters() {
    if (elements.engagementsNationalPeopleSearch) elements.engagementsNationalPeopleSearch.value = "";
    if (elements.engagementsNationalPeopleStatusFilter) elements.engagementsNationalPeopleStatusFilter.value = "";
    renderEngagementNationalPeople();
  }

  function engagementNationalPersonMergeCandidates(sourceId = "") {
    const source = engagementNationalPeople.find((person) => person.id === sourceId);
    if (!source) return [];
    return engagementNationalPeople
      .filter((person) => person.id && person.id !== sourceId)
      .filter((person) => person.status !== "merged" && !person.mergedIntoId)
      .sort((left, right) =>
        Number(right.clubId === source.clubId) - Number(left.clubId === source.clubId) ||
        `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr")
      );
  }

  function engagementNationalPersonDuplicateAlertLabel(person = {}, people = []) {
    const personId = person.id || "";
    const license = String(person.licenseNumber || "").trim();
    const normalizedName = normalizedEngagementClubSearch([person.lastName, person.firstName].filter(Boolean).join(" "));
    const sameLicense = license && people.some((candidate) => candidate.id !== personId && String(candidate.licenseNumber || "").trim() === license);
    if (sameLicense) return { score: "high", label: "Même licence" };
    const sameNameClub = normalizedName && people.some((candidate) =>
      candidate.id !== personId &&
      normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" ")) === normalizedName &&
      (!person.clubId || !candidate.clubId || person.clubId === candidate.clubId)
    );
    if (sameNameClub) return { score: "high", label: "Même identité" };
    const nearName = normalizedName && people.some((candidate) => {
      if (candidate.id === personId) return false;
      const candidateName = normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" "));
      return candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName));
    });
    if (nearName) return { score: "medium", label: "A verifier" };
    return { score: "low", label: "Simple" };
  }

  function engagementNationalPersonById(personId = "") {
    return engagementNationalPeople.find((person) => person.id === personId) || null;
  }

  function selectedEngagementNationalPersonMergeIds() {
    return Array.from(elements.engagementsNationalPeopleList?.querySelectorAll("[data-engagement-national-person-merge-check]:checked") || [])
      .map((item) => item.value)
      .filter(Boolean);
  }

  function selectedEngagementNationalPersonKeepId() {
    return elements.engagementsNationalPeopleList?.querySelector("[data-engagement-national-person-keep]:checked")?.value || "";
  }

  function updateEngagementNationalPeopleSelectionState() {
    if (elements.engagementsNationalPeopleBulk) elements.engagementsNationalPeopleBulk.hidden = !engagementNationalPeopleMergeMode;
    if (elements.engagementsNationalPeopleMergeMode) {
      elements.engagementsNationalPeopleMergeMode.setAttribute("aria-pressed", engagementNationalPeopleMergeMode ? "true" : "false");
      elements.engagementsNationalPeopleMergeMode.textContent = engagementNationalPeopleMergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
    }
    const keepId = selectedEngagementNationalPersonKeepId();
    const mergeIds = selectedEngagementNationalPersonMergeIds().filter((id) => id !== keepId);
    if (elements.engagementsNationalPeopleBulkMerge) {
      elements.engagementsNationalPeopleBulkMerge.disabled = !keepId || !mergeIds.length || engagementNationalPeopleLoading;
    }
    if (elements.engagementsNationalPeopleSelectionSummary) {
      const keep = engagementNationalPersonById(keepId);
      const keepName = keep ? ([keep.firstName, keep.lastName].filter(Boolean).join(" ") || keep.licenseNumber || keepId) : "";
      elements.engagementsNationalPeopleSelectionSummary.textContent = keepId && mergeIds.length
        ? `${mergeIds.length} fiche${mergeIds.length > 1 ? "s" : ""} à fusionner vers ${keepName}.`
        : "Choisissez une fiche à conserver et au moins une fiche à fusionner.";
    }
  }

  function setEngagementNationalPeopleMergeMode(enabled) {
    engagementNationalPeopleMergeMode = enabled === true;
    if (!engagementNationalPeopleMergeMode) engagementNationalPersonMergeSourceId = "";
    renderEngagementNationalPeople();
  }

  async function loadEngagementNationalPeople({ force = false, silent = false } = {}) {
    if (!canDeleteEngagementCompetitionDirectly() || engagementNationalPeopleLoading) return;
    if (engagementNationalPeopleLoaded && !force) return;
    engagementNationalPeopleLoading = true;
    if (elements.engagementsNationalPeopleRefresh) elements.engagementsNationalPeopleRefresh.disabled = true;
    if (elements.engagementsNationalPeopleStatus && !silent) {
      elements.engagementsNationalPeopleStatus.textContent = "Chargement des officiels...";
      elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementNationalClubPeople", { limit: 120 });
      engagementNationalPeople = Array.isArray(result.people) ? result.people : [];
      engagementNationalPeopleLoaded = true;
      markLastRefresh(elements.engagementsNationalPeopleStatus);
      renderEngagementNationalPeople();
      if (elements.engagementsNationalPeopleStatus && !silent) {
        updateEngagementNationalPeopleStatus(filteredEngagementNationalPeople().length);
      }
    } catch (error) {
      if (elements.engagementsNationalPeopleStatus && !silent) {
        elements.engagementsNationalPeopleStatus.textContent = `Lecture officiels impossible : ${error?.message || error}`;
        elements.engagementsNationalPeopleStatus.dataset.tone = "error";
      }
    } finally {
      engagementNationalPeopleLoading = false;
      if (elements.engagementsNationalPeopleRefresh) elements.engagementsNationalPeopleRefresh.disabled = false;
      if (engagementNationalPeopleLoaded) renderEngagementNationalPeople();
    }
  }

  async function setEngagementNationalPersonStatus(personId, active) {
    const cleanId = String(personId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const person = engagementNationalPeople.find((item) => item.id === cleanId) || {};
    const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "cette personne";
    const message = active
      ? `Réactiver ${name} ? Cette personne redeviendra utilisable par son club.`
      : `Désactiver ${name} ? Cette personne ne sera plus proposable comme officiel ou chef d'équipe.`;
    if (!global.confirm(message)) return;
    if (elements.engagementsNationalPeopleStatus) {
      elements.engagementsNationalPeopleStatus.textContent = active ? "Réactivation en cours..." : "Désactivation en cours...";
      elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("setEngagementNationalClubPersonStatus", {
        personId: cleanId,
        active
      });
      engagementNationalPeopleLoaded = false;
      engagementClubPeopleLoaded = false;
      await loadEngagementNationalPeople({ force: true });
    } catch (error) {
      if (elements.engagementsNationalPeopleStatus) {
        elements.engagementsNationalPeopleStatus.textContent = `Action impossible : ${error?.message || error}`;
        elements.engagementsNationalPeopleStatus.dataset.tone = "error";
      }
    }
  }

  async function deleteEngagementNationalPerson(personId) {
    const cleanId = String(personId || "").trim();
    if (!cleanId || !canDeleteEngagementCompetitionDirectly()) return;
    const person = engagementNationalPeople.find((item) => item.id === cleanId) || {};
    const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "cette personne";
    if (!global.confirm(`Supprimer définitivement ${name} de la base des officiels / chefs d'équipe ? Cette action est irréversible.`)) return;
    if (elements.engagementsNationalPeopleStatus) {
      elements.engagementsNationalPeopleStatus.textContent = "Suppression définitive en cours...";
      elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
    }
    try {
      await callFunction("deleteEngagementNationalClubPerson", {
        personId: cleanId,
        confirmPermanent: true
      });
      engagementNationalPeopleLoaded = false;
      engagementClubPeopleLoaded = false;
      await loadEngagementNationalPeople({ force: true });
    } catch (error) {
      if (elements.engagementsNationalPeopleStatus) {
        elements.engagementsNationalPeopleStatus.textContent = `Suppression impossible : ${error?.message || error}`;
        elements.engagementsNationalPeopleStatus.dataset.tone = "error";
      }
    }
  }

  async function mergeEngagementNationalPerson(sourcePersonId, targetPersonId) {
    const sourceId = String(sourcePersonId || "").trim();
    const targetId = String(targetPersonId || "").trim();
    if (!sourceId || !targetId || sourceId === targetId || !canDeleteEngagementCompetitionDirectly()) return;
    const source = engagementNationalPeople.find((item) => item.id === sourceId) || {};
    const target = engagementNationalPeople.find((item) => item.id === targetId) || {};
    const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.licenseNumber || "cette fiche";
    const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.licenseNumber || "la fiche cible";
    if (!global.confirm(`Fusionner ${sourceName} vers ${targetName} ? La fiche source sera marquée comme fusionnée et retirée des listes club.`)) return;
    const licenseMismatch = Boolean(source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
    if (licenseMismatch && !global.confirm(`Attention : les numéros de licence sont différents (${source.licenseNumber} / ${target.licenseNumber}). Confirmer quand même la fusion ?`)) return;
    const clubMismatch = Boolean(source.clubId && target.clubId && source.clubId !== target.clubId);
    if (clubMismatch && !global.confirm(`Attention : les clubs sont différents (${clubDisplayLabel(source)} / ${clubDisplayLabel(target)}). Confirmer quand même la fusion ?`)) return;
    if (elements.engagementsNationalPeopleStatus) {
      elements.engagementsNationalPeopleStatus.textContent = "Fusion en cours...";
      elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("mergeEngagementNationalClubPerson", {
        sourcePersonId: sourceId,
        targetPersonId: targetId,
        confirmMerge: true,
        confirmLicenseMismatch: licenseMismatch,
        confirmClubMismatch: clubMismatch
      });
      engagementNationalPersonMergeSourceId = "";
      engagementNationalPeopleLoaded = false;
      engagementClubPeopleLoaded = false;
      await loadEngagementNationalPeople({ force: true });
      if (elements.engagementsNationalPeopleStatus) {
        const totalUpdates = Number(result.teamLeaderUpdateCount || 0) + Number(result.officialsUpdateCount || 0);
        elements.engagementsNationalPeopleStatus.textContent = `Fusion terminée. ${totalUpdates} engagement${totalUpdates > 1 ? "s" : ""} mis à jour.`;
        elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
      }
    } catch (error) {
      if (elements.engagementsNationalPeopleStatus) {
        elements.engagementsNationalPeopleStatus.textContent = `Fusion impossible : ${error?.message || error}`;
        elements.engagementsNationalPeopleStatus.dataset.tone = "error";
      }
    }
  }

  async function mergeSelectedEngagementNationalPeople() {
    const targetId = selectedEngagementNationalPersonKeepId();
    const sourceIds = selectedEngagementNationalPersonMergeIds().filter((id) => id !== targetId);
    if (!targetId || !sourceIds.length || !canDeleteEngagementCompetitionDirectly()) {
      updateEngagementNationalPeopleSelectionState();
      return;
    }
    const target = engagementNationalPersonById(targetId);
    const sources = sourceIds.map(engagementNationalPersonById).filter(Boolean);
    if (!target || !sources.length) return;
    const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.licenseNumber || targetId;
    const licenseMismatch = sources.some((source) => source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
    const clubMismatch = sources.some((source) => source.clubId && target.clubId && source.clubId !== target.clubId);
    const warning = [
      licenseMismatch ? "numéros de licence différents" : "",
      clubMismatch ? "clubs différents" : ""
    ].filter(Boolean).join(", ");
    if (!global.confirm(`Fusionner ${sources.length} fiche${sources.length > 1 ? "s" : ""} vers ${targetName} ?${warning ? ` Attention : ${warning}.` : ""}`)) return;
    engagementNationalPeopleLoading = true;
    updateEngagementNationalPeopleSelectionState();
    if (elements.engagementsNationalPeopleStatus) {
      elements.engagementsNationalPeopleStatus.textContent = "Fusion groupee en cours...";
      elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
    }
    let successCount = 0;
    const errors = [];
    for (const source of sources) {
      try {
        await callFunction("mergeEngagementNationalClubPerson", {
          sourcePersonId: source.id,
          targetPersonId: targetId,
          confirmMerge: true,
          confirmLicenseMismatch: true,
          confirmClubMismatch: true
        });
        successCount += 1;
      } catch (error) {
        const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.licenseNumber || source.id;
        errors.push(`${sourceName} : ${error?.message || error}`);
      }
    }
    engagementNationalPeopleLoading = false;
    engagementNationalPersonMergeSourceId = "";
    engagementNationalPeopleLoaded = false;
    engagementClubPeopleLoaded = false;
    await loadEngagementNationalPeople({ force: true, silent: true });
    if (elements.engagementsNationalPeopleStatus) {
      elements.engagementsNationalPeopleStatus.textContent = errors.length
        ? `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}. Erreurs : ${errors.slice(0, 3).join(" | ")}`
        : `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}.`;
      elements.engagementsNationalPeopleStatus.dataset.tone = errors.length ? "error" : "ok";
    }
  }

  const AUDIT_ACTION_METADATA = Object.freeze({
    "accessUser.created": ["Compte créé", "access"],
    "accessUser.updated": ["Compte et habilitations modifiés", "access"],
    "accessUser.activated": ["Compte activé", "access"],
    "accessUser.deactivated": ["Compte désactivé", "access"],
    "accessUser.deleted": ["Compte supprimé", "access"],
    "accessUser.emailUpdated": ["Adresse du compte modifiée", "access"],
    "accessUser.competitionEmailPreferenceUpdated": ["Préférence de notification modifiée", "access"],
    "accessUser.deletionRequested": ["Suppression de compte demandée", "requests"],
    "accessUser.deletionRequestResolved": ["Demande de suppression de compte traitée", "requests"],
    "engagementAccessRequest.submitted": ["Demande d'accès déposée", "requests"],
    "engagementAccessRequest.resolved": ["Demande d'accès traitée", "requests"],
    "engagementAccessRequest.redirectedExistingAccount": ["Demande rattachée à un compte existant", "requests"],
    "engagementClub.createdFromAccessRequest": ["Club créé depuis une demande d'accès", "clubs"],
    "engagementClub.created": ["Club créé", "clubs"],
    "engagementClub.updated": ["Club modifié", "clubs"],
    "engagementClub.deleted": ["Club supprimé", "clubs"],
    "engagementClubSwimmer.created": ["Nageur créé", "people"],
    "engagementClubSwimmer.recovered": ["Nageur restauré", "people"],
    "engagementClubSwimmer.statusChanged": ["Statut d'un nageur modifié", "people"],
    "engagementClubSwimmer.activityStatusUpdated": ["Activité d'un nageur mise à jour", "people"],
    "engagementClubSwimmer.changeRequested": ["Correction de nageur demandée", "requests"],
    "engagementClubSwimmer.changeApproved": ["Correction de nageur validée", "requests"],
    "engagementClubSwimmer.changeRejected": ["Correction de nageur refusée", "requests"],
    "engagementClubSwimmer.identityCorrected": ["Identité de nageur corrigée", "people"],
    "engagementClubSwimmer.nationalMerged": ["Fiches nageur fusionnées", "people"],
    "engagementClubSwimmer.mergePublicationRepaired": ["Publication d'une fusion nageur réparée", "technical"],
    "engagementClubSwimmer.deleted": ["Nageur supprimé", "people"],
    "engagementClubSwimmer.deletionRequested": ["Suppression de nageur demandée", "requests"],
    "engagementClubSwimmer.deletionRequestResolved": ["Demande de suppression de nageur traitée", "requests"],
    "engagementClubPerson.saved": ["Officiel enregistré", "people"],
    "engagementClubPerson.statusChanged": ["Statut d'un officiel modifié", "people"],
    "engagementClubPerson.nationalStatusChanged": ["Statut national d'un officiel modifié", "people"],
    "engagementClubPerson.nationalMerged": ["Fiches officiel fusionnées", "people"],
    "engagementClubPerson.nationalDeleted": ["Officiel supprimé", "people"],
    "engagementCompetition.created": ["Compétition créée", "competitions"],
    "engagementCompetition.updated": ["Compétition modifiée", "competitions"],
    "engagementCompetition.deleted": ["Compétition supprimée", "competitions"],
    "engagementCompetition.deletionRequested": ["Suppression de compétition demandée", "requests"],
    "engagementCompetition.deletionRequestResolved": ["Demande de suppression de compétition traitée", "requests"],
    "engagementCompetition.closedAutomatically": ["Engagements fermés automatiquement", "technical"],
    "engagementCompetition.automaticClosureFailed": ["Fermeture automatique en échec", "technical"],
    "engagementCompetition.automaticClosureSweep": ["Contrôle des fermetures automatiques", "technical"],
    "engagementCompetition.documentUploaded": ["Document de compétition ajouté", "competitions"],
    "engagementCompetition.documentReplaced": ["Document de compétition remplacé", "competitions"],
    "engagementCompetition.documentUpdated": ["Document de compétition modifié", "competitions"],
    "engagementCompetition.documentDeleted": ["Document de compétition supprimé", "competitions"],
    "engagementCompetition.documentsNotified": ["Nouveaux documents notifiés", "competitions"],
    "engagementCompetition.openingEmailsPrepared": ["Courriels d'ouverture préparés", "technical"],
    "engagementCompetition.clubRecapEmailsPrepared": ["Courriels récapitulatifs préparés", "technical"],
    "engagementCompetition.preparedEmailsSent": ["Courriels préparés envoyés", "technical"],
    "engagementCompetition.clubRecapPdfGeneratedByAdmin": ["Récapitulatif club généré", "technical"],
    "engagementCompetition.clubRecapPdfsGenerated": ["Récapitulatifs clubs générés", "technical"],
    "engagementCompetition.txtExportGenerated": ["Export WinPalme généré", "technical"],
    "engagementClubEntry.teamLeaderSaved": ["Chef d'équipe enregistré", "competitions"],
    "engagementClubEntry.teamLeaderRemoved": ["Chef d'équipe retiré", "competitions"],
    "engagementClubEntry.officialsSaved": ["Officiels de la compétition enregistrés", "competitions"],
    "engagementClubEntry.swimmerAdded": ["Nageur ajouté aux engagements", "competitions"],
    "engagementClubEntry.swimmerRemoved": ["Nageur retiré des engagements", "competitions"],
    "engagementClubEntry.swimmerSelectionsSaved": ["Sélection des nageurs enregistrée", "competitions"],
    "engagementClubEntry.swimmersSaved": ["Nageurs engagés enregistrés", "competitions"],
    "engagementClubEntry.individualEntriesSaved": ["Courses individuelles enregistrées", "competitions"],
    "engagementClubEntry.relaysSaved": ["Relais enregistrés", "competitions"],
    "engagementClubEntry.recapPdfGenerated": ["Récapitulatif d'engagement généré", "technical"],
    "engagementClubAggregates.rebuilt": ["Agrégats du club reconstruits", "technical"],
    "engagementOpenWaterCourse.created": ["Course d'eau libre créée", "competitions"],
    "engagementOpenWaterCourse.statusChanged": ["Statut d'une course d'eau libre modifié", "competitions"],
    "performanceImport.created": ["Résultats importés", "performances"],
    "performanceImport.deleted": ["Import de résultats annulé", "performances"],
    "performanceImport.publicationResumed": ["Publication d'un import reprise", "performances"],
    "performanceImport.recordAlertDecision": ["Alerte Record/MPF traitée", "performances"],
    "performancePublicData.published": ["Performances publiques publiées", "performances"],
    "recordsMpf.published": ["Records et MPF publiés", "performances"],
    "performanceCorrection.updated": ["Performance corrigée", "performances"],
    "performanceCorrection.hidden": ["Performance masquée", "performances"]
  });

  const AUDIT_DETAIL_LABELS = Object.freeze({
    active: "Statut", capabilities: "Habilitations", changedCount: "Modifications appliquées",
    changedSwimmerCount: "Nageurs modifiés", chrono: "Chronométrage", clubCode: "Sigle du club",
    clubId: "Identifiant du club", clubName: "Club", competitionId: "Identifiant de la compétition",
    competitionName: "Compétition", date: "Date", decision: "Décision", email: "Adresse électronique",
    entryStatus: "État des engagements", eventCode: "Épreuve", federalNumber: "Numéro fédéral",
    fileName: "Fichier", hidden: "Masquée", importedPerformances: "Performances importées",
    firstName: "Prénom", individualEntryCount: "Courses individuelles", lastName: "Nom", level: "Niveau", licenseNumber: "Numéro de licence", name: "Nom",
    performanceCount: "Performances", personId: "Identifiant de la personne", reason: "Motif",
    changeCount: "Lignes modifiées", publishedAt: "Date de publication", sourceDate: "Date source", version: "Version publique",
    relayCount: "Relais", requestedChangeCount: "Modifications demandées", requestId: "Identifiant de la demande", roles: "Rôles",
    sourceClubId: "Club d'origine", status: "Statut", swimmerCount: "Nageurs engagés",
    swimmerId: "Identifiant du nageur", swimmerIndexId: "Identifiant du nageur", timingType: "Type de chronométrage",
    uid: "Identifiant utilisateur"
  });

  function auditActionLabel(action = "") {
    return AUDIT_ACTION_METADATA[action]?.[0] || String(action || "Action non reconnue").replaceAll(".", " · ");
  }

  function auditActionCategory(action = "") {
    if (AUDIT_ACTION_METADATA[action]?.[1]) return AUDIT_ACTION_METADATA[action][1];
    const value = String(action || "");
    if (/request|deletion/i.test(value)) return "requests";
    if (/performance|record|mpf/i.test(value)) return "performances";
    if (/ClubSwimmer|ClubPerson/i.test(value)) return "people";
    if (/Competition|ClubEntry/i.test(value)) return "competitions";
    return "technical";
  }

  function auditActorOrigin(log = {}) {
    const uid = String(log.actorUid || "");
    return !uid || uid.startsWith("system:") || uid === "public-login-page" ? "system" : "human";
  }

  function auditActorLabel(log = {}) {
    const actorUid = String(log.actorUid || "");
    if (!actorUid || actorUid.startsWith("system:")) return "Système LivePalmes";
    if (actorUid === "public-login-page") return "Demande publique";
    const actor = engagementNationalAuditActors.get(actorUid) || {};
    const currentUserName = [currentAccessProfile?.firstName, currentAccessProfile?.lastName].filter(Boolean).join(" ");
    const isCurrentUser = actorUid === String(currentAccessProfile?.uid || "");
    const label = (isCurrentUser ? currentUserName || currentAccessProfile?.displayName || currentAccessProfile?.email : "")
      || actor.name || actor.email || "Utilisateur non identifié";
    return label;
  }

  function auditActorOptionLabel(actor = {}, uid = "") {
    const name = actor.name || [actor.firstName, actor.lastName].filter(Boolean).join(" ");
    const email = String(actor.email || "").trim();
    if (name && email) return `${name} — ${email}`;
    return name || email || "Utilisateur non identifié";
  }

  function renderEngagementNationalAuditActorSuggestions(users = []) {
    const choices = [];
    const labels = new Set();
    users.forEach((user) => {
      const uid = String(user.uid || "");
      if (!uid) return;
      const actor = {
        uid,
        name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: user.email || ""
      };
      engagementNationalAuditActors.set(uid, actor);
      const label = auditActorOptionLabel(actor, uid);
      if (labels.has(label)) return;
      labels.add(label);
      choices.push({ uid, label });
    });
    engagementNationalAuditActorSuggestions = choices.sort((left, right) => left.label.localeCompare(right.label, "fr"));
    if (elements.engagementsNationalAuditActorOptions) {
      elements.engagementsNationalAuditActorOptions.innerHTML = engagementNationalAuditActorSuggestions
        .map((choice) => `<option value="${escapeHtml(choice.label)}"></option>`)
        .join("");
    }
  }

  function setEngagementNationalAuditActorSelection(choice = null) {
    const uid = String(choice?.uid || "");
    if (elements.engagementsNationalAuditActor) elements.engagementsNationalAuditActor.value = uid;
    if (elements.engagementsNationalAuditActorSearch) {
      elements.engagementsNationalAuditActorSearch.dataset.selected = uid ? "true" : "false";
      elements.engagementsNationalAuditActorSearch.title = uid ? "Utilisateur sélectionné" : "";
    }
    if (elements.engagementsNationalAuditActorSelected) elements.engagementsNationalAuditActorSelected.hidden = !uid;
  }

  async function searchEngagementNationalAuditActors(query = "", sequence = 0) {
    if (query.length < 2) return;
    if (elements.engagementsNationalAuditActorSearch) elements.engagementsNationalAuditActorSearch.setAttribute("aria-busy", "true");
    try {
      const result = await callFunction("listAccessUsers", { pageSize: 25, search: query });
      if (sequence !== engagementNationalAuditActorSearchSequence) return;
      renderEngagementNationalAuditActorSuggestions(Array.isArray(result.users) ? result.users : []);
    } catch {
      if (sequence === engagementNationalAuditActorSearchSequence) renderEngagementNationalAuditActorSuggestions([]);
    } finally {
      if (sequence === engagementNationalAuditActorSearchSequence && elements.engagementsNationalAuditActorSearch) {
        elements.engagementsNationalAuditActorSearch.removeAttribute("aria-busy");
      }
    }
  }

  function handleEngagementNationalAuditActorSearch() {
    const searchInput = elements.engagementsNationalAuditActorSearch;
    const actorInput = elements.engagementsNationalAuditActor;
    if (!searchInput || !actorInput) return;
    const value = searchInput.value.trim();
    const selected = engagementNationalAuditActorSuggestions.find((choice) => choice.label === value);
    engagementNationalAuditActorSearchSequence += 1;
    global.clearTimeout(engagementNationalAuditActorSearchTimer);
    if (selected) {
      setEngagementNationalAuditActorSelection(selected);
      if (engagementNationalAuditAppliedActorUid !== selected.uid) void loadEngagementNationalAuditLogs({ force: true });
      return;
    }
    setEngagementNationalAuditActorSelection();
    if (!value) {
      renderEngagementNationalAuditActorSuggestions([...engagementNationalAuditActors.values()]);
      if (engagementNationalAuditAppliedActorUid) void loadEngagementNationalAuditLogs({ force: true });
      return;
    }
    if (value.length < 2) {
      renderEngagementNationalAuditActorSuggestions([]);
      return;
    }
    const sequence = engagementNationalAuditActorSearchSequence;
    engagementNationalAuditActorSearchTimer = global.setTimeout(() => {
      void searchEngagementNationalAuditActors(value, sequence);
    }, 300);
  }

  function auditClubId(log = {}) {
    return String(log.target?.clubId || log.target?.sourceClubId || "");
  }

  function auditClubLabel(log = {}) {
    const clubId = auditClubId(log);
    return log.target?.clubName || engagementNationalAuditClubs.get(clubId)
      || (clubId ? clubDisplayLabel({ clubId }, { fallback: "" }) : "");
  }

  function auditCompetitionLabel(target = {}) {
    const competitionId = String(target.competitionId || "");
    const auditCompetition = engagementNationalAuditCompetitions.get(competitionId);
    const cachedCompetition = engagementCompetitions.find((competition) => competition.id === competitionId);
    return target.competitionName || target.name || auditCompetition?.name || cachedCompetition?.name || (competitionId ? "Compétition" : "");
  }

  function auditTargetSummary(target = {}, action = "") {
    if (!target || typeof target !== "object") target = {};
    const personName = [target.firstName || target.targetFirstName, target.lastName || target.targetLastName]
      .filter(Boolean).join(" ");
    const competition = auditCompetitionLabel(target);
    if (competition) return competition;
    if (personName) return personName;
    if (target.personId) return auditPersonLabel(target);
    if (target.swimmerName || target.personName) return target.swimmerName || target.personName;
    if (target.clubName) return target.clubName;
    if (target.email || target.targetEmail) return target.email || target.targetEmail;
    if (target.fileName) return target.fileName;
    if (target.clubId || target.sourceClubId) {
      const clubLabel = clubDisplayLabel({ clubId: target.clubId || target.sourceClubId }, { fallback: "" });
      if (clubLabel) return clubLabel;
    }
    if (action === "accessUser.competitionEmailPreferenceUpdated") return "Notifications du compte";
    if (action.startsWith("engagementAccessRequest.")) return "Demande d'accès";
    if (action.startsWith("engagementOpenWaterCourse.")) return "Course d'eau libre";
    if (action.startsWith("engagementClubSwimmer.")) return "Fiche nageur";
    if (action.startsWith("engagementClubPerson.")) return "Fiche officiel";
    if (action.startsWith("engagementClubAggregates.")) return "Données du club";
    if (action.startsWith("performanceImport.")) return "Import de résultats";
    if (action.startsWith("performancePublicData.")) return "Données publiques des performances";
    if (action.startsWith("recordsMpf.")) return "Référentiels Records et MPF";
    if (action.startsWith("performanceCorrection.")) return "Performance concernée";
    if (action.startsWith("accessUser.")) return "Compte utilisateur";
    return "Action LivePalmes";
  }

  function auditDateLabel(value = "") {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Date inconnue";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function auditDetailValue(value) {
    if (value === true) return "Oui";
    if (value === false) return "Non";
    if (value === null || value === undefined || value === "") return "Non renseigné";
    if (Array.isArray(value)) return value.map((item) => auditDetailValue(item)).join(", ");
    if (typeof value === "object") return Object.entries(value)
      .map(([key, item]) => `${auditDetailLabel(key)} : ${auditDetailValue(item)}`)
      .join(" · ") || "Aucun";
    return String(value);
  }

  const AUDIT_ROLE_LABELS = Object.freeze({
    swimmer: "Nageur", official: "Officiel", teamLeader: "Chef d’équipe"
  });

  const AUDIT_CAPABILITY_LABELS = Object.freeze({
    "records.manage": "Records / MPF",
    "consoles.access": "Accès aux consoles par PIN",
    "consoles.manage": "Gestion des consoles et des PIN",
    "competitions.import": "Import des compétitions",
    "dtn.view": "Espace DTN",
    "engagements.club.manage": "Engagements club",
    "engagements.club.switch": "Changement de club national",
    "engagements.region.manage": "Engagements région",
    "engagements.national.manage": "Engagements national",
    "admin.full": "Gestion générale"
  });

  function auditEnabledLabels(value = {}, labels = {}) {
    const entries = Array.isArray(value)
      ? value.map((key) => [String(key), true])
      : Object.entries(value && typeof value === "object" ? value : {});
    const enabled = entries
      .filter(([, active]) => active === true)
      .map(([key]) => labels[key] || auditDetailLabel(key));
    return enabled.join(", ") || "Aucun";
  }

  function auditPersonLabel(target = {}) {
    const personId = String(target.personId || "");
    const person = engagementNationalAuditPeople.get(personId) || {};
    return [target.firstName, target.lastName].filter(Boolean).join(" ")
      || target.personName || person.name || target.licenseNumber || person.licenseNumber || "Personne concernée";
  }

  function auditReadableValue(key = "", value, log = {}) {
    const target = log.target && typeof log.target === "object" ? log.target : {};
    if (key === "roles") return auditEnabledLabels(value, AUDIT_ROLE_LABELS);
    if (key === "capabilities") return auditEnabledLabels(value, AUDIT_CAPABILITY_LABELS);
    if (key === "active") return value === true ? "Actif" : value === false ? "Inactif" : auditDetailValue(value);
    if (key === "hidden") return value === true ? "Masquée" : value === false ? "Visible" : auditDetailValue(value);
    if (key === "personId") return auditPersonLabel(target);
    if (["clubId", "sourceClubId", "targetClubId"].includes(key)) {
      return target.clubName || engagementNationalAuditClubs.get(String(value))
        || clubDisplayLabel({ clubId: value }, { fallback: "Club concerné" });
    }
    if (key === "competitionId") return auditCompetitionLabel(target) || "Compétition concernée";
    if (["swimmerId", "swimmerIndexId"].includes(key)) return target.swimmerName || target.personName || "Nageur concerné";
    if (key === "uid") {
      const user = engagementNationalAuditActors.get(String(value)) || {};
      return user.name || user.email || target.email || "Utilisateur concerné";
    }
    if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? auditEnabledLabels(item) : String(item)).join(", ");
    if (value && typeof value === "object") {
      const booleanEntries = Object.values(value).every((item) => typeof item === "boolean");
      if (booleanEntries) return auditEnabledLabels(value);
    }
    return auditDetailValue(value);
  }

  function auditDetailLabel(key = "") {
    return AUDIT_DETAIL_LABELS[key]
      || String(key).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
  }

  function auditComplementaryLabel(key = "") {
    if (key === "personId") return "Personne concernée";
    if (["clubId", "sourceClubId", "targetClubId"].includes(key)) return "Club concerné";
    if (key === "competitionId") return "Compétition concernée";
    if (["swimmerId", "swimmerIndexId"].includes(key)) return "Nageur concerné";
    if (key === "uid") return "Utilisateur concerné";
    return auditDetailLabel(key);
  }

  function auditValuesEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  function auditChangeRows(target = {}) {
    const rows = [];
    const consumedKeys = new Set();
    const addChange = (key, before, after) => {
      if (auditValuesEqual(before, after)) return;
      const beforeValue = auditReadableValue(key, before, { target });
      const afterValue = auditReadableValue(key, after, { target });
      rows.push(`<div class="admin-national-audit-change"><dt>${escapeHtml(auditDetailLabel(key))}</dt><dd><span>${escapeHtml(beforeValue.length > 240 ? `${beforeValue.slice(0, 237)}…` : beforeValue)}</span><span class="admin-national-audit-change-arrow" aria-hidden="true">→</span><strong>${escapeHtml(afterValue.length > 240 ? `${afterValue.slice(0, 237)}…` : afterValue)}</strong></dd></div>`);
    };
    const objectPairs = [
      ["current", "proposed"],
      ["requestedProposed", "resolvedProposed"],
      ["before", "after"],
      ["previous", "next"]
    ];
    objectPairs.forEach(([beforeKey, afterKey]) => {
      const before = target[beforeKey];
      const after = target[afterKey];
      if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after)) return;
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      const comparableKeys = [...keys].filter((key) => Object.hasOwn(before, key) && Object.hasOwn(after, key));
      const changedKeys = comparableKeys.filter((key) => !auditValuesEqual(before[key], after[key]));
      if (!changedKeys.length) return;
      consumedKeys.add(beforeKey);
      consumedKeys.add(afterKey);
      changedKeys.forEach((key) => addChange(key, before[key], after[key]));
    });
    Object.keys(target).forEach((key) => {
      let afterKey = "";
      let baseKey = "";
      if (/^previous[A-Z]/.test(key)) {
        baseKey = key.slice(8).replace(/^./, (letter) => letter.toLowerCase());
        afterKey = baseKey;
      } else if (/^old[A-Z]/.test(key)) {
        baseKey = key.slice(3).replace(/^./, (letter) => letter.toLowerCase());
        afterKey = `new${key.slice(3)}`;
      } else if (/^before[A-Z]/.test(key)) {
        baseKey = key.slice(6).replace(/^./, (letter) => letter.toLowerCase());
        afterKey = `after${key.slice(6)}`;
      }
      if (!afterKey || !Object.hasOwn(target, afterKey)) return;
      consumedKeys.add(key);
      consumedKeys.add(afterKey);
      addChange(baseKey, target[key], target[afterKey]);
    });
    return { rows, consumedKeys };
  }

  function auditDetailIsTechnicalKey(key = "") {
    return /(?:^id$|^uid$|Id$|Ids$|Uid$|Key$|Hash$|Path$|Snapshot$)/.test(String(key));
  }

  function auditTechnicalKeyIsReadable(key = "") {
    return [
      "personId", "clubId", "sourceClubId", "targetClubId", "competitionId",
      "swimmerId", "swimmerIndexId", "uid"
    ].includes(key) || !auditDetailIsTechnicalKey(key);
  }

  function auditDetailRows(log = {}) {
    const target = log.target && typeof log.target === "object" ? log.target : {};
    const changes = auditChangeRows(target);
    const preferredKeys = Object.keys(AUDIT_DETAIL_LABELS)
      .filter((key) => Object.hasOwn(target, key) && !changes.consumedKeys.has(key) && !auditDetailIsTechnicalKey(key));
    const rows = preferredKeys.map((key) => {
      const rawValue = auditReadableValue(key, target[key], log);
      const value = rawValue.length > 500 ? `${rawValue.slice(0, 497)}…` : rawValue;
      const label = auditDetailLabel(key);
      return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
    });
    rows.unshift(...changes.rows);
    return rows.join("");
  }

  function auditTechnicalDetailsHtml(logs = []) {
    const first = logs[0] || {};
    const target = first.target && typeof first.target === "object" ? first.target : {};
    const changes = auditChangeRows(target);
    const technicalKeys = Object.keys(target)
      .filter((key) => !changes.consumedKeys.has(key))
      .filter((key) => auditDetailIsTechnicalKey(key) || !Object.hasOwn(AUDIT_DETAIL_LABELS, key))
      .filter(auditTechnicalKeyIsReadable)
      .filter((key) => !["fileHash", "performanceBaseSync", "clubActivityReactivation"].includes(key))
      .slice(0, 12);
    const rows = technicalKeys.map((key) => {
      const rawValue = auditReadableValue(key, target[key], first);
      const value = rawValue.length > 500 ? `${rawValue.slice(0, 497)}…` : rawValue;
      return `<div><dt>${escapeHtml(auditComplementaryLabel(key))}</dt><dd>${escapeHtml(value)}</dd></div>`;
    });
    const actionCodes = [...new Set(logs.map((log) => String(log.action || "")).filter(Boolean))];
    if (logs.length > 1) rows.push(`<div><dt>Traces regroupées</dt><dd>${logs.length}</dd></div>`);
    rows.push(`<div><dt>Type${actionCodes.length > 1 ? "s" : ""} d’action</dt><dd>${actionCodes.map((action) => escapeHtml(auditActionLabel(action))).join("<br>") || "-"}</dd></div>`);
    if (first.actorUid) rows.push(`<div><dt>Action réalisée par</dt><dd>${escapeHtml(auditActorLabel(first))}</dd></div>`);
    return `<details class="admin-national-audit-technical-disclosure"><summary>Détails complémentaires</summary><dl>${rows.join("")}</dl></details>`;
  }

  function auditActionIsCritical(action = "") {
    return /deleted|deletion|Merged|identityCorrected|accessUser\.(created|updated|activated|deactivated)|performanceCorrection\.(hidden|updated)/i.test(action);
  }

  function auditActionIsGroupable(action = "") {
    return [
      "engagementClubEntry.teamLeaderSaved", "engagementClubEntry.teamLeaderRemoved",
      "engagementClubEntry.officialsSaved", "engagementClubEntry.swimmerAdded",
      "engagementClubEntry.swimmerRemoved", "engagementClubEntry.swimmerSelectionsSaved",
      "engagementClubEntry.swimmersSaved", "engagementClubEntry.individualEntriesSaved",
      "engagementClubEntry.relaysSaved"
    ].includes(action);
  }

  function filteredEngagementNationalAuditLogs() {
    const query = normalizedEngagementClubSearch(elements.engagementsNationalAuditSearch?.value || "");
    const type = elements.engagementsNationalAuditType?.value || "";
    const origin = elements.engagementsNationalAuditOrigin?.value || "";
    return engagementNationalAuditLogs.filter((log) => {
      if (type && auditActionCategory(log.action) !== type) return false;
      if (origin && auditActorOrigin(log) !== origin) return false;
      if (!query) return true;
      const haystack = normalizedEngagementClubSearch([
        auditActionLabel(log.action), log.action, auditActorLabel(log), auditTargetSummary(log.target, log.action),
        auditClubLabel(log), JSON.stringify(log.target || {})
      ].join(" "));
      return haystack.includes(query);
    });
  }

  function groupedEngagementNationalAuditLogs(logs = []) {
    const groups = [];
    const latestGroupByKey = new Map();
    logs.forEach((log) => {
      const groupable = auditActionIsGroupable(log.action) && !auditActionIsCritical(log.action);
      const key = groupable
        ? [log.actorUid || "system", auditClubId(log), log.target?.competitionId || ""].join("|")
        : "";
      const previous = key ? latestGroupByKey.get(key) : null;
      const previousOldestAt = Date.parse(previous?.logs?.at(-1)?.createdAt || "");
      const currentAt = Date.parse(log.createdAt || "");
      const withinTenMinutes = Number.isFinite(previousOldestAt) && Number.isFinite(currentAt) && previousOldestAt - currentAt <= 10 * 60 * 1000;
      if (key && previous?.groupKey === key && withinTenMinutes) {
        previous.logs.push(log);
      } else {
        const group = { groupKey: key, logs: [log] };
        groups.push(group);
        if (key) latestGroupByKey.set(key, group);
      }
    });
    return groups;
  }

  function auditGroupedActionsHtml(logs = []) {
    const first = logs[0] || {};
    const actor = auditActorLabel(first);
    const club = auditClubLabel(first);
    const competition = auditCompetitionLabel(first.target || {});
    const sentence = `${actor} a modifié les engagements${club ? ` de ${club}` : ""}${competition ? ` pour ${competition}` : ""}.`;
    const actions = new Map();
    logs.forEach((log) => {
      if (!actions.has(log.action)) actions.set(log.action, []);
      actions.get(log.action).push(log);
    });
    const summaries = [...actions.entries()].map(([action, actionLogs]) => {
      const newest = actionLogs[0] || {};
      const oldest = actionLogs.at(-1) || newest;
      const newestTime = auditDateLabel(newest.createdAt).split(" ").at(-1);
      const oldestTime = auditDateLabel(oldest.createdAt).split(" ").at(-1);
      const period = newestTime === oldestTime ? `à ${newestTime}` : `de ${oldestTime} à ${newestTime}`;
      const details = auditDetailRows(newest);
      return `<li><div><strong>${escapeHtml(auditActionLabel(action))}</strong><span>${actionLogs.length} mise${actionLogs.length > 1 ? "s" : ""} à jour regroupée${actionLogs.length > 1 ? "s" : ""} · ${escapeHtml(period)}</span></div>${details ? `<small>Dernier état enregistré</small><dl>${details}</dl>` : ""}</li>`;
    }).join("");
    return `<p class="admin-national-audit-summary-sentence">${escapeHtml(sentence)}</p><ul class="admin-national-audit-action-summary">${summaries}</ul>${auditTechnicalDetailsHtml(logs)}`;
  }

  function auditEntryHtml(group = {}) {
    const logs = group.logs || [];
    const first = logs[0] || {};
    const grouped = logs.length > 1;
    const actionLabel = grouped ? "Engagements mis à jour" : auditActionLabel(first.action);
    const targetLabel = auditTargetSummary(first.target, first.action);
    const clubLabel = auditClubLabel(first);
    const category = auditActionCategory(first.action);
    const humanDetails = auditDetailRows(first);
    const detailHtml = grouped
      ? auditGroupedActionsHtml(logs)
      : `${humanDetails ? `<dl class="admin-national-audit-detail-grid">${humanDetails}</dl>` : ""}${auditTechnicalDetailsHtml(logs)}`;
    return `
      <details class="admin-national-audit-entry" data-audit-category="${escapeHtml(category)}">
        <summary>
          <time datetime="${escapeHtml(first.createdAt || "")}">${escapeHtml(auditDateLabel(first.createdAt))}</time>
          <span class="admin-national-audit-entry-main"><strong>${escapeHtml(actionLabel)}</strong><small>${escapeHtml(targetLabel)}</small></span>
          <span class="admin-national-audit-actor">${escapeHtml(auditActorLabel(first))}</span>
          ${clubLabel ? `<span class="admin-national-audit-club">${escapeHtml(clubLabel)}</span>` : ""}
          ${grouped ? `<span class="admin-national-audit-count">${logs.length} actions</span>` : ""}
          <span class="admin-national-audit-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div class="admin-national-audit-entry-details">
          ${detailHtml}
        </div>
      </details>`;
  }

  function updateEngagementNationalAuditFilterOptions() {
    accessClubReference.forEach((club) => {
      const clubId = String(club.clubId || "");
      const clubLabel = clubDisplayLabel(club, { fallback: "" });
      if (clubId && clubLabel) engagementNationalAuditClubs.set(clubId, clubLabel);
    });
    engagementNationalAuditLogs.forEach((log) => {
      const clubId = String(log.target?.clubId || "");
      if (clubId && !engagementNationalAuditClubs.has(clubId)) {
        const clubLabel = log.target?.clubName || clubDisplayLabel({ clubId }, { fallback: "" });
        if (clubLabel) engagementNationalAuditClubs.set(clubId, clubLabel);
      }
    });
    const replaceOptions = (select, options, emptyLabel) => {
      if (!select) return;
      const selected = select.value;
      select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>${options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`;
      select.value = selected;
    };
    replaceOptions(elements.engagementsNationalAuditClub,
      [...engagementNationalAuditClubs.entries()].sort((left, right) => left[1].localeCompare(right[1], "fr")),
      "Tous les clubs");
    if (!elements.engagementsNationalAuditActorSearch?.value.trim()) {
      renderEngagementNationalAuditActorSuggestions([...engagementNationalAuditActors.values()]);
    }
  }

  function resetEngagementNationalAuditFilters() {
    if (elements.engagementsNationalAuditSearch) elements.engagementsNationalAuditSearch.value = "";
    if (elements.engagementsNationalAuditPeriod) elements.engagementsNationalAuditPeriod.value = "7";
    if (elements.engagementsNationalAuditClub) elements.engagementsNationalAuditClub.value = "";
    setEngagementNationalAuditActorSelection();
    if (elements.engagementsNationalAuditActorSearch) elements.engagementsNationalAuditActorSearch.value = "";
    if (elements.engagementsNationalAuditType) elements.engagementsNationalAuditType.value = "";
    if (elements.engagementsNationalAuditOrigin) elements.engagementsNationalAuditOrigin.value = "";
    void loadEngagementNationalAuditLogs({ force: true });
  }

  function resetEngagementNationalAuditData() {
    engagementNationalAuditLogs = [];
    engagementNationalAuditLogsLoaded = false;
    engagementNationalAuditLogsLoading = false;
    engagementNationalAuditNextCursor = null;
    engagementNationalAuditHasMore = false;
    engagementNationalAuditVisibleFrom = "";
    engagementNationalAuditAppliedActorUid = "";
    engagementNationalAuditActorSearchSequence += 1;
    global.clearTimeout(engagementNationalAuditActorSearchTimer);
    engagementNationalAuditActorSuggestions = [];
    setEngagementNationalAuditActorSelection();
    engagementNationalAuditActors.clear();
    engagementNationalAuditClubs.clear();
    engagementNationalAuditCompetitions.clear();
    engagementNationalAuditPeople.clear();
  }

  function renderEngagementNationalAuditLogs() {
    if (!elements.engagementsNationalAuditList) return;
    if (!canViewActivityLog()) {
      elements.engagementsNationalAuditList.innerHTML = "";
      return;
    }
    updateEngagementNationalAuditFilterOptions();
    const filteredLogs = filteredEngagementNationalAuditLogs();
    const groups = groupedEngagementNationalAuditLogs(filteredLogs);
    if (!engagementNationalAuditLogs.length) {
      elements.engagementsNationalAuditList.innerHTML = '<p class="admin-engagements-empty">Aucune action enregistrée sur cette période.</p>';
    } else if (!groups.length) {
      elements.engagementsNationalAuditList.innerHTML = '<p class="admin-engagements-empty">Aucune action ne correspond aux filtres.</p>';
    } else {
      elements.engagementsNationalAuditList.innerHTML = `<div class="admin-national-audit-list">${groups.map(auditEntryHtml).join("")}</div>`;
    }
    if (elements.engagementsNationalAuditStatus && !engagementNationalAuditLogsLoading) {
      const loaded = engagementNationalAuditLogs.length;
      const groupedCount = groups.length;
      const visibleFromLabel = engagementNationalAuditVisibleFrom ? auditDateLabel(engagementNationalAuditVisibleFrom).split(" ")[0] : "";
      elements.engagementsNationalAuditStatus.textContent = `${groupedCount} ligne${groupedCount > 1 ? "s" : ""} affichée${groupedCount > 1 ? "s" : ""} · ${loaded} trace${loaded > 1 ? "s" : ""} chargée${loaded > 1 ? "s" : ""}${visibleFromLabel ? ` depuis le ${visibleFromLabel}` : ""}.`;
      elements.engagementsNationalAuditStatus.dataset.tone = "ok";
    }
    if (elements.engagementsNationalAuditLoadMore) elements.engagementsNationalAuditLoadMore.hidden = !engagementNationalAuditHasMore;
  }

  async function loadEngagementNationalAuditLogs({ force = false, silent = false, append = false } = {}) {
    if (!canViewActivityLog() || engagementNationalAuditLogsLoading) return;
    if (engagementNationalAuditLogsLoaded && !force && !append) return;
    if (append && (!engagementNationalAuditHasMore || !engagementNationalAuditNextCursor)) return;
    engagementNationalAuditLogsLoading = true;
    if (force) {
      engagementNationalAuditLogs = [];
      engagementNationalAuditNextCursor = null;
      engagementNationalAuditHasMore = false;
    }
    if (elements.engagementsNationalAuditRefresh) elements.engagementsNationalAuditRefresh.disabled = true;
    if (elements.engagementsNationalAuditLoadMore) elements.engagementsNationalAuditLoadMore.disabled = true;
    if (elements.engagementsNationalAuditStatus && !silent) {
      elements.engagementsNationalAuditStatus.textContent = append ? "Chargement des actions précédentes..." : "Chargement du journal...";
      elements.engagementsNationalAuditStatus.dataset.tone = "loading";
    }
    try {
      await loadAccessClubReference();
      const result = await callFunction("listEngagementNationalAuditLogs", {
        limit: 50,
        days: Number(elements.engagementsNationalAuditPeriod?.value || 7),
        actorUid: elements.engagementsNationalAuditActor?.value || "",
        clubId: elements.engagementsNationalAuditClub?.value || "",
        cursor: append ? engagementNationalAuditNextCursor : null,
        knownActorUids: [...engagementNationalAuditActors.entries()]
          .filter(([, actor]) => actor.name || actor.email)
          .map(([uid]) => uid)
          .slice(0, 100),
        knownCompetitionIds: [...engagementNationalAuditCompetitions.entries()]
          .filter(([, competition]) => competition.name)
          .map(([competitionId]) => competitionId)
          .slice(0, 100),
        knownPersonIds: [...engagementNationalAuditPeople.entries()]
          .map(([personId]) => personId)
          .slice(0, 100)
      });
      engagementNationalAuditAppliedActorUid = elements.engagementsNationalAuditActor?.value || "";
      (Array.isArray(result.actors) ? result.actors : []).forEach((actor) => {
        if (actor?.uid) engagementNationalAuditActors.set(actor.uid, actor);
      });
      (Array.isArray(result.competitions) ? result.competitions : []).forEach((competition) => {
        if (competition?.id) engagementNationalAuditCompetitions.set(competition.id, competition);
      });
      (Array.isArray(result.people) ? result.people : []).forEach((person) => {
        if (person?.id) engagementNationalAuditPeople.set(person.id, person);
      });
      const returnedLogs = Array.isArray(result.logs) ? result.logs : [];
      returnedLogs.forEach((log) => {
        const uid = String(log.actorUid || "");
        if (uid && !uid.startsWith("system:") && uid !== "public-login-page" && !engagementNationalAuditActors.has(uid)) {
          engagementNationalAuditActors.set(uid, { uid, name: "", email: "" });
        }
      });
      const previousIds = new Set(engagementNationalAuditLogs.map((log) => log.id));
      engagementNationalAuditLogs = append
        ? [...engagementNationalAuditLogs, ...returnedLogs.filter((log) => !previousIds.has(log.id))]
        : returnedLogs;
      engagementNationalAuditNextCursor = result.nextCursor || null;
      engagementNationalAuditHasMore = result.hasMore === true;
      engagementNationalAuditVisibleFrom = result.visibleFrom || "";
      engagementNationalAuditLogsLoaded = true;
    } catch (error) {
      if (elements.engagementsNationalAuditStatus && !silent) {
        elements.engagementsNationalAuditStatus.textContent = `Lecture du journal impossible : ${error?.message || error}`;
        elements.engagementsNationalAuditStatus.dataset.tone = "error";
      }
    } finally {
      engagementNationalAuditLogsLoading = false;
      if (elements.engagementsNationalAuditRefresh) elements.engagementsNationalAuditRefresh.disabled = false;
      if (elements.engagementsNationalAuditLoadMore) elements.engagementsNationalAuditLoadMore.disabled = false;
      if (engagementNationalAuditLogsLoaded) renderEngagementNationalAuditLogs();
    }
  }

  function engagementClubPersonRoleLabel(person = {}) {
    const roles = [];
    if (person.roles?.swimmer || person.swimmerIndexId) roles.push("Nageur");
    if (person.roles?.teamLeader) roles.push("Chef d'équipe");
    if (person.roles?.official) roles.push("Officiel");
    return roles.join(" - ") || "-";
  }

  function resetEngagementClubPersonForm() {
    elements.engagementsClubPersonForm?.reset();
    if (elements.engagementsClubPersonId) elements.engagementsClubPersonId.value = "";
    if (elements.engagementsClubPersonSwimmerId) elements.engagementsClubPersonSwimmerId.value = "";
    if (elements.engagementsClubPersonSwimmerSource) elements.engagementsClubPersonSwimmerSource.value = "";
    applyEngagementClubPersonSwimmer("");
    if (elements.engagementsClubPersonRoleTeamLeader) elements.engagementsClubPersonRoleTeamLeader.checked = false;
    if (elements.engagementsClubPersonRoleOfficial) elements.engagementsClubPersonRoleOfficial.checked = true;
    if (elements.engagementsClubPersonMessage) elements.engagementsClubPersonMessage.textContent = "";
  }

  function openEngagementClubPersonForm(person = null) {
    resetEngagementClubPersonForm();
    if (!engagementClubSwimmersLoaded) void loadEngagementClubSwimmers({ silent: true });
    if (person) {
      if (elements.engagementsClubPersonId) elements.engagementsClubPersonId.value = person.id || "";
      if (elements.engagementsClubPersonFirstName) elements.engagementsClubPersonFirstName.value = person.firstName || "";
      if (elements.engagementsClubPersonLastName) elements.engagementsClubPersonLastName.value = person.lastName || "";
      if (elements.engagementsClubPersonBirthDate) elements.engagementsClubPersonBirthDate.value = person.birthDate || "";
      if (elements.engagementsClubPersonSex) elements.engagementsClubPersonSex.value = person.sex || "";
      if (elements.engagementsClubPersonLicense) elements.engagementsClubPersonLicense.value = person.licenseNumber || "";
      if (elements.engagementsClubPersonSwimmerId) elements.engagementsClubPersonSwimmerId.value = person.swimmerIndexId || "";
      if (elements.engagementsClubPersonSwimmerSource) elements.engagementsClubPersonSwimmerSource.value = person.swimmerSource || "";
      if (elements.engagementsClubPersonRoleTeamLeader) elements.engagementsClubPersonRoleTeamLeader.checked = person.roles?.teamLeader === true;
      if (elements.engagementsClubPersonRoleOfficial) elements.engagementsClubPersonRoleOfficial.checked = person.roles?.official === true;
    }
    renderEngagementClubPersonSwimmerOptions();
    if (person?.swimmerIndexId) {
      const swimmerValue = engagementClubSwimmerReferenceValue({
        swimmerIndexId: person.swimmerIndexId,
        source: person.swimmerSource || "performances"
      });
      applyEngagementClubPersonSwimmer(swimmerValue);
      if (!engagementClubSwimmerFromReferenceValue(swimmerValue)) {
        [elements.engagementsClubPersonFirstName, elements.engagementsClubPersonLastName, elements.engagementsClubPersonBirthDate, elements.engagementsClubPersonSex, elements.engagementsClubPersonLicense]
          .forEach((field) => {
            if (!field) return;
            if (field.matches("select")) field.disabled = true;
            else field.readOnly = true;
          });
      }
    }
    if (elements.engagementsClubPersonForm) elements.engagementsClubPersonForm.hidden = false;
    (person ? elements.engagementsClubPersonFirstName : elements.engagementsClubPersonSwimmerSearch)?.focus?.();
  }

  function selectedEngagementClubPersonFromForm() {
    return {
      firstName: String(elements.engagementsClubPersonFirstName?.value || "").trim(),
      lastName: String(elements.engagementsClubPersonLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
      birthDate: String(elements.engagementsClubPersonBirthDate?.value || "").trim(),
      sex: String(elements.engagementsClubPersonSex?.value || "").trim(),
      licenseNumber: formatEngagementSwimmerLicense(elements.engagementsClubPersonLicense?.value || ""),
      swimmerIndexId: String(elements.engagementsClubPersonSwimmerId?.value || "").trim(),
      swimmerSource: String(elements.engagementsClubPersonSwimmerSource?.value || "").trim(),
      roles: {
        teamLeader: elements.engagementsClubPersonRoleTeamLeader?.checked === true,
        official: elements.engagementsClubPersonRoleOfficial?.checked === true
      }
    };
  }

  function renderEngagementClubPeople() {
    if (!elements.engagementsClubPeopleList) return;
    if (!engagementClubPeople.length) {
      elements.engagementsClubPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ou chef d\'équipe enregistré pour ce club.</p>';
      return;
    }
    elements.engagementsClubPeopleList.innerHTML = `
      <div class="admin-engagements-club-people-table" role="table" aria-label="Mes officiels">
        <div class="admin-engagements-club-person-row admin-engagements-club-person-head" role="row">
          <span role="columnheader">Personne</span>
          <span role="columnheader">Licence</span>
          <span role="columnheader">Rôle</span>
          <span role="columnheader">Statut</span>
          <span role="columnheader">Actions</span>
        </div>
        ${[...engagementClubPeople]
          .sort((left, right) => `${left.lastName || ""} ${left.firstName || ""}`.localeCompare(`${right.lastName || ""} ${right.firstName || ""}`, "fr", { sensitivity: "base" }))
          .map((person, index) => {
      const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Personne sans nom";
      const role = engagementClubPersonRoleLabel(person);
      const active = person.active === true;
      const detailsId = `adminEngagementsClubPersonDirectoryDetails${index}`;
      return `
        <div class="admin-engagements-club-person-row" role="row" data-engagement-club-person-id="${escapeHtml(person.id)}" data-active="${active ? "true" : "false"}" data-expanded="false">
          <button class="admin-engagements-club-person-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" data-engagement-club-person-directory-toggle>
            <strong>${escapeHtml(name)}</strong>
            <span class="admin-engagements-club-person-toggle-meta">
              <span class="admin-engagements-club-person-role-badge" title="${escapeHtml(role)}">${escapeHtml(role)}</span>
              <span class="admin-engagements-club-person-chevron" aria-hidden="true">›</span>
            </span>
          </button>
          <div id="${detailsId}" class="admin-engagements-club-person-details">
            <span role="cell"><strong>${escapeHtml(name)}</strong></span>
            <span role="cell">${escapeHtml(person.licenseNumber || "-")}</span>
            <span role="cell">${escapeHtml(role)}</span>
            <span role="cell"><span class="admin-engagements-club-person-status" data-active="${active ? "true" : "false"}">${active ? "Actif" : "Inactif"}</span></span>
            <span role="cell">
              <span class="admin-engagements-request-actions">
                <button class="ghost-button" type="button" data-engagement-club-person-action="edit" data-engagement-club-person-id="${escapeHtml(person.id)}">Modifier</button>
                <button class="ghost-button" type="button" data-engagement-club-person-action="${active ? "disable" : "enable"}" data-engagement-club-person-id="${escapeHtml(person.id)}">${active ? "Désactiver" : "Réactiver"}</button>
              </span>
            </span>
          </div>
        </div>
      `;
    }).join("")}
      </div>
    `;
  }

  async function loadEngagementClubPeople({ force = false, silent = false } = {}) {
    if (!canUse("engagements.club.manage") || engagementClubPeopleLoading) return;
    if (engagementClubPeopleLoaded && !force) {
      if (activeEngagementsTab === "clubPeople") renderEngagementClubPeople();
      renderEngagementClubPersonSwimmerOptions();
      renderEngagementClubTeamPersonOptions(elements.engagementsClubTeamPersonSelect?.value || "");
      if (activeEngagementsDetailTab === "officials") renderEngagementClubOfficials();
      return;
    }
    engagementClubPeopleLoading = true;
    if (elements.engagementsClubPeopleStatus && !silent) {
      elements.engagementsClubPeopleStatus.textContent = "Chargement de Mes officiels...";
      elements.engagementsClubPeopleStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listEngagementClubPeople", { includeInactive: true });
      engagementClubPeople = Array.isArray(result.people) ? result.people : [];
      engagementClubPeopleLoaded = true;
      if (activeEngagementsTab === "clubPeople") renderEngagementClubPeople();
      renderEngagementClubPersonSwimmerOptions();
      renderEngagementClubTeamPersonOptions(elements.engagementsClubTeamPersonSelect?.value || "");
      if (activeEngagementsDetailTab === "officials") renderEngagementClubOfficials();
      if (elements.engagementsClubPeopleStatus && !silent) {
        elements.engagementsClubPeopleStatus.textContent = "";
        elements.engagementsClubPeopleStatus.dataset.tone = "neutral";
      }
    } catch (error) {
      if (elements.engagementsClubPeopleStatus && !silent) {
        elements.engagementsClubPeopleStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.engagementsClubPeopleStatus.dataset.tone = "error";
      }
    } finally {
      engagementClubPeopleLoading = false;
      if (activeEngagementsDetailTab === "officials") renderEngagementClubOfficials();
    }
  }

  async function saveEngagementClubPerson(event) {
    event?.preventDefault?.();
    if (!canUse("engagements.club.manage")) return;
    if (!elements.engagementsClubPersonRoleTeamLeader?.checked && !elements.engagementsClubPersonRoleOfficial?.checked) {
      if (elements.engagementsClubPersonMessage) {
      elements.engagementsClubPersonMessage.textContent = "Sélectionnez au moins un rôle.";
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
      let personId = elements.engagementsClubPersonId?.value || "";
      let person = selectedEngagementClubPersonFromForm();
      if (!personId && person.swimmerIndexId) {
        const swimmer = engagementClubSwimmerFromReferenceValue(engagementClubSwimmerReferenceValue({
          swimmerIndexId: person.swimmerIndexId,
          source: person.swimmerSource || "performances"
        }));
        personId = engagementClubPersonForSwimmer(swimmer || {})?.id || "";
      }
      if (!personId) {
        const roleLabel = person.roles.official ? "officiel" : "chef d'équipe";
        const resolution = resolveEngagementClubPersonIdentity(person, roleLabel);
        if (resolution.cancelled) {
          if (elements.engagementsClubPersonMessage) {
            elements.engagementsClubPersonMessage.textContent = "Création annulée : utilisez la personne proposée ou corrigez l'identité.";
            elements.engagementsClubPersonMessage.dataset.tone = "warning";
          }
          return;
        }
        if (resolution.person) {
          personId = resolution.person.id;
          person = {
            ...engagementClubPersonPayloadWithRole(resolution.person),
            roles: {
              teamLeader: resolution.person.roles?.teamLeader === true || person.roles.teamLeader,
              official: resolution.person.roles?.official === true || person.roles.official
            }
          };
        }
      }
      await callFunction("saveEngagementClubPerson", {
        personId,
        person
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
    if (!global.confirm(`${active ? "Réactiver" : "Désactiver"} ${label} ?`)) return;
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

  async function loadEngagementCompetitions({ force = false, mode = engagementNavigationMode(), activate = null, silent = false } = {}) {
    const requestedMode = mode === "admin" ? "admin" : "club";
    const allowed = requestedMode === "admin" ? canCreateEngagementCompetition() : canUse("engagements.club.manage");
    if (!allowed) return;
    const filters = engagementCalendarFiltersPayload();
    const septemberPreview = engagementCalendarSeptemberPreview(filters);
    const requestedRange = engagementCalendarRequestedRange(filters);
    const cacheKey = engagementCalendarCacheKey(requestedMode, requestedRange);
    const clubCalendarAlreadyOpen = requestedMode === "club" && global.location.hash === "#club-competitions";
    const shouldActivate = activate === null
      ? requestedMode === engagementNavigationMode()
      : activate === true || clubCalendarAlreadyOpen;
    const cachedEntry = engagementCompetitionsLoadedCacheKey === cacheKey && engagementCompetitionsLoaded
      ? { competitions: engagementCompetitions, cachedAt: engagementCompetitionsCachedAt }
      : readEngagementCalendarCache(cacheKey);
    if (cachedEntry && shouldActivate && engagementCompetitionsLoadedCacheKey !== cacheKey) {
      activateEngagementCalendarCache(cacheKey, requestedRange, cachedEntry);
    }
    const cacheFresh = Boolean(cachedEntry?.cachedAt && Date.now() - cachedEntry.cachedAt < ENGAGEMENT_CALENDAR_CACHE_TTL_MS);
    if (!force && cacheFresh) {
      if (requestedMode === "club") scheduleEngagementClubWorkspacePreload(cachedEntry.competitions);
      return cachedEntry;
    }
    const cachedListVisible = Boolean(cachedEntry?.competitions?.length && shouldActivate);
    if (!cachedListVisible && shouldActivate && elements.engagementsCalendarList) {
      elements.engagementsCalendarList.innerHTML = `
        <div class="admin-engagements-calendar-loading" role="status">
          <strong>Chargement des compétitions...</strong>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </div>
      `;
    }
    if (!silent && !cachedListVisible && shouldActivate && elements.engagementsStatus) {
      elements.engagementsStatus.hidden = false;
      elements.engagementsStatus.textContent = "Chargement du calendrier...";
      elements.engagementsStatus.dataset.tone = "loading";
    }
    const pendingRequest = engagementCompetitionCalendarRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest.then((entry) => {
        if (!entry && shouldActivate) {
          return loadEngagementCompetitions({ force: true, mode: requestedMode, activate: true, silent: false });
        }
        const currentFilters = engagementCalendarFiltersPayload();
        const stillActive = entry && shouldActivate && requestedMode === engagementNavigationMode() &&
          engagementCalendarCacheKey(requestedMode, engagementCalendarRequestedRange(currentFilters)) === cacheKey;
        if (stillActive) {
          activateEngagementCalendarCache(cacheKey, requestedRange, entry);
          if (elements.engagementsStatus) {
            elements.engagementsStatus.textContent = "";
            delete elements.engagementsStatus.dataset.tone;
            elements.engagementsStatus.hidden = true;
          }
        }
        return entry;
      });
    }
    const cacheRevision = engagementCalendarCacheRevision;
    const requestPromise = (async () => {
      try {
        const ranges = [
          { startDate: filters.startDate, endDate: filters.endDate },
          ...(septemberPreview ? [septemberPreview] : [])
        ];
        const competitionRequest = callFunction("listEngagementCompetitions", {
          ranges: ranges.map((range) => ({ fromDate: range.startDate, toDate: range.endDate })),
          manageOnly: requestedMode === "admin",
          limit: 250
        });
        const [result, calendarEventResult] = await Promise.all([
          competitionRequest,
          requestedMode === "admin"
            ? callFunction("listEngagementCalendarEvents", {
                ranges: ranges.map((range) => ({ fromDate: range.startDate, toDate: range.endDate })),
                limit: 250
              })
            : Promise.resolve({ events: [] })
        ]);
        if (cacheRevision !== engagementCalendarCacheRevision) return null;
        let competitions = [
          ...(Array.isArray(result.competitions) ? result.competitions.map((item) => ({ ...item, sourceType: "competition" })) : []),
          ...(Array.isArray(calendarEventResult.events) ? calendarEventResult.events.map((item) => ({ ...item, sourceType: "calendarEvent" })) : [])
        ];
        if (requestedMode === "admin" && !canUse("engagements.national.manage")) {
          competitions = competitions.filter((competition) => canEditEngagementCompetition(competition));
        }
        const entry = writeEngagementCalendarCache(cacheKey, competitions);
        if (requestedMode === "club") scheduleEngagementClubWorkspacePreload(entry.competitions);
        const currentFilters = engagementCalendarFiltersPayload();
        const stillActive = shouldActivate && requestedMode === engagementNavigationMode() &&
          engagementCalendarCacheKey(requestedMode, engagementCalendarRequestedRange(currentFilters)) === cacheKey;
        if (stillActive) activateEngagementCalendarCache(cacheKey, requestedRange, entry);
        const deepLinkedCompetitionId = new URLSearchParams(global.location.search).get("competition") || "";
        if (stillActive && requestedMode === "club" && deepLinkedCompetitionId && !engagementPublicDeepLinkHandled) {
          engagementPublicDeepLinkHandled = true;
          loadEngagementCompetitionDetail(deepLinkedCompetitionId, "general");
        }
        if (stillActive && elements.engagementsStatus) {
          elements.engagementsStatus.textContent = "";
          delete elements.engagementsStatus.dataset.tone;
          elements.engagementsStatus.hidden = true;
        }
        return entry;
      } catch (error) {
        if (shouldActivate && requestedMode === engagementNavigationMode() && elements.engagementsStatus) {
          elements.engagementsStatus.hidden = false;
          elements.engagementsStatus.textContent = cachedEntry
            ? `Liste affichée depuis le cache ; actualisation impossible : ${error?.message || error}`
            : `Calendrier indisponible : ${error?.message || error}`;
          elements.engagementsStatus.dataset.tone = "error";
        }
        if (!cachedEntry && shouldActivate && elements.engagementsCalendarList) {
          elements.engagementsCalendarList.innerHTML = '<p class="admin-engagements-empty">Le calendrier est momentanément indisponible. Réessayez dans quelques instants.</p>';
        }
        return cachedEntry || null;
      } finally {
        if (engagementCompetitionCalendarRequests.get(cacheKey) === requestPromise) {
          engagementCompetitionCalendarRequests.delete(cacheKey);
        }
      }
    })();
    engagementCompetitionCalendarRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  function engagementCompetitionPayloadFromFields(fields = {}) {
    const deadlineValue = normalizeEngagementDeadlineField(fields.deadline) || fields.deadline?.value || "";
    const deadlineDate = deadlineValue ? new Date(deadlineValue) : null;
    const level = fields.level?.value || "regional";
    const qualificationTimesMode = fields.qualificationMode?.value || "all";
    const missingEntryTimeMode = fields.missingEntryTimeMode?.value || "manual";
    const maxEventsValue = Math.trunc(Number(fields.maxEvents?.value));
    const maxEventsPerSwimmer = Number.isFinite(maxEventsValue)
      ? Math.max(0, Math.min(5, maxEventsValue))
      : 0;
    return {
      competitionType: fields.competitionType?.value === "openWater" || fields.competitionType?.dataset?.value === "openWater" ? "openWater" : "pool",
      waterBodyType: fields.waterBodyType?.value || "",
      name: fields.name?.value || "",
      date: fields.date?.value || "",
      endDate: fields.endDate?.value || fields.date?.value || "",
      location: fields.location?.value || "",
      city: fields.city?.value || fields.location?.value || "",
      address: fields.address?.value || "",
      organizer: fields.organizer?.value || "",
      publicDescription: fields.publicDescription?.value || "",
      publicationStatus: fields.publicationStatus?.value || "draft",
      canceled: fields.canceled?.checked === true,
      level,
      regionId: level === "national" ? "" : fields.regionId?.value || "",
      invitedRegionIds: level === "national" ? [] : selectedRegionMultiSelectValues(fields.invitedRegionIds)
        .filter((region) => normalizedRegionKey(region) !== normalizedRegionKey(fields.regionId?.value || "")),
      entryDeadlineAt: deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate.toISOString() : "",
      computerEmail: fields.computerEmail?.value || "",
      officialsManagerEmail: fields.officialsManagerEmail?.value || "",
      fees: selectedCreateEngagementFeesFromForm(),
      entryStatus: fields.entryStatus?.value || "upcoming",
      officialsRequired: fields.officialsRequired?.value === "true",
      poolLength: fields.poolLength?.value || "",
      poolLaneCount: fields.poolLaneCount?.value === ""
        ? ""
        : Math.trunc(Number(fields.poolLaneCount?.value)),
      timingType: fields.timingType?.value || "",
      qualificationTimesMode,
      qualificationStartDate: qualificationTimesMode === "period" ? fields.qualificationStart?.value || "" : "",
      qualificationEndDate: qualificationTimesMode === "period" ? fields.qualificationEnd?.value || "" : "",
      missingEntryTimeMode,
      maxEventsPerSwimmer
    };
  }

  function createCompetitionFields() {
    return {
      competitionType: elements.engagementsCompetitionType,
      name: elements.engagementsName,
      date: elements.engagementsDate,
      endDate: elements.engagementsEndDate,
      location: elements.engagementsLocation,
      level: elements.engagementsLevel,
      regionId: elements.engagementsRegionId,
      invitedRegionIds: elements.engagementsInvitedRegionIds,
      deadline: elements.engagementsDeadline,
      computerEmail: elements.engagementsComputerEmail,
      officialsManagerEmail: elements.engagementsOfficialsManagerEmail,
      poolLength: elements.engagementsPoolLength,
      poolLaneCount: elements.engagementsPoolLaneCount,
      timingType: elements.engagementsTimingType,
      qualificationMode: elements.engagementsQualificationMode,
      qualificationStart: elements.engagementsQualificationStart,
      qualificationEnd: elements.engagementsQualificationEnd,
      missingEntryTimeMode: elements.engagementsMissingEntryTimeMode,
      maxEvents: elements.engagementsMaxEvents,
      maxEventsUnlimited: elements.engagementsMaxEventsUnlimited,
      entryStatus: elements.engagementsEntryStatus,
      officialsRequired: elements.engagementsOfficialsRequired
    };
  }

  function editCompetitionFields() {
    return {
      competitionType: elements.engagementsEditCompetitionType,
      waterBodyType: elements.engagementsEditWaterBodyType,
      name: elements.engagementsEditName,
      date: elements.engagementsEditDate,
      endDate: elements.engagementsEditEndDate,
      location: elements.engagementsEditLocation,
      city: elements.engagementsEditCity,
      address: elements.engagementsEditAddress,
      organizer: elements.engagementsEditOrganizer,
      publicDescription: elements.engagementsEditPublicDescription,
      publicationStatus: elements.engagementsEditPublicationStatus,
      canceled: elements.engagementsEditCanceled,
      level: elements.engagementsEditLevel,
      regionId: elements.engagementsEditRegionId,
      invitedRegionIds: elements.engagementsEditInvitedRegionIds,
      deadline: elements.engagementsEditDeadline,
      computerEmail: elements.engagementsEditComputerEmail,
      officialsManagerEmail: elements.engagementsEditOfficialsManagerEmail,
      poolLength: elements.engagementsEditPoolLength,
      poolLaneCount: elements.engagementsEditPoolLaneCount,
      timingType: elements.engagementsEditTimingType,
      qualificationMode: elements.engagementsEditQualificationMode,
      qualificationStart: elements.engagementsEditQualificationStart,
      qualificationEnd: elements.engagementsEditQualificationEnd,
      missingEntryTimeMode: elements.engagementsEditMissingEntryTimeMode,
      maxEvents: elements.engagementsEditMaxEvents,
      maxEventsUnlimited: elements.engagementsEditMaxEventsUnlimited,
      entryStatus: elements.engagementsEditEntryStatus,
      officialsRequired: elements.engagementsEditOfficialsRequired
    };
  }

  function engagementCompetitionPayloadFromForm() {
    const payload = engagementCompetitionPayloadFromFields(createCompetitionFields());
    return {
      ...payload,
      invitedRegionIds: [],
      entryDeadlineAt: "",
      entryStatus: "upcoming",
      computerEmail: "",
      officialsManagerEmail: "",
      fees: { enabled: false, swimmerFee: 0, individualEventFee: 0, relayFee: 0, helloAssoUrl: "" },
      officialsRequired: payload.level !== "national",
      poolLength: "",
      poolLaneCount: "",
      timingType: "",
      qualificationTimesMode: "all",
      qualificationStartDate: "",
      qualificationEndDate: "",
      missingEntryTimeMode: payload.competitionType === "openWater" ? "none" : "manual",
      maxEventsPerSwimmer: 0
    };
  }

  function engagementCompetitionPayloadFromEditForm() {
    return engagementCompetitionPayloadFromFields(editCompetitionFields());
  }

  function engagementOpeningDeadlineError(payload = {}, nowMs = Date.now()) {
    if (payload.entryStatus !== "open") return "";
    if (!payload.entryDeadlineAt) return "Renseignez la date et l’heure de clôture avant d’ouvrir les engagements.";
    const competitionDate = new Date(`${payload.date || ""}T00:00:00`);
    if (!Number.isNaN(competitionDate.getTime()) && competitionDate.getTime() - nowMs > 30 * 24 * 60 * 60 * 1000) {
      return "Impossible d’ouvrir les engagements plus de 30 jours avant la compétition.";
    }
    const deadline = new Date(payload.entryDeadlineAt);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() > nowMs) return "";
    return "Impossible d’ouvrir les engagements : la date de clôture est dépassée.";
  }

  function shouldSendEngagementOpeningMail(previousStatus, nextStatus) {
    return previousStatus !== "open" && nextStatus === "open";
  }

  function engagementOpeningMailScopeLabel(payload = {}) {
    if ((payload.level || "regional") === "national") {
      return "Destinataires : admins LivePalmes club, région et national, toutes régions.";
    }
    const regions = [
      payload.regionId,
      ...(Array.isArray(payload.invitedRegionIds) ? payload.invitedRegionIds : [])
    ].map(regionDisplayLabel).filter((region) => region && region !== "-");
    return `Destinataires : admins LivePalmes club, région et national${regions.length ? ` - régions ${regions.join(", ")}` : ""}.`;
  }

  function confirmEngagementOpeningMail(payload = {}) {
    return global.confirm([
      "Ouvrir les engagements et envoyer le mail d'ouverture ?",
      engagementOpeningMailScopeLabel(payload),
        "Les e-mails seront préparés pour ce cycle d'ouverture puis envoyés aux destinataires concernés."
    ].join("\n\n"));
  }

  function confirmEngagementReopeningMail(payload = {}) {
    return global.confirm([
      "La compétition va être réouverte.",
      "Souhaitez-vous renvoyer le mail d'ouverture aux clubs ?",
      engagementOpeningMailScopeLabel(payload),
      "OK : réouvrir et renvoyer le mail.\nAnnuler : réouvrir sans renvoyer de mail."
    ].join("\n\n"));
  }

  function confirmOpenedCompetitionSensitiveChanges(competition = {}, payload = {}) {
    const changes = [];
    if (competition.date !== payload.date || (competition.endDate || competition.date) !== (payload.endDate || payload.date)) {
      changes.push("date de la compétition");
    }
    if ((competition.regionId || "") !== (payload.regionId || "")) changes.push("région");
    if ((competition.level || "regional") !== (payload.level || "regional")) changes.push("niveau");
    if (!changes.length) return true;
    return global.confirm([
      "Des clubs peuvent déjà avoir commencé leurs engagements.",
      `Vous modifiez : ${changes.join(", ")}.`,
      "Confirmer ces changements ?"
    ].join("\n\n"));
  }

  async function prepareAndSendEngagementOpeningEmails(competitionId, statusTarget = elements.engagementsDetailStatus) {
    if (!competitionId) return null;
    if (statusTarget) {
      statusTarget.textContent = "Preparation du mail d'ouverture...";
      statusTarget.dataset.tone = "loading";
      statusTarget.hidden = false;
    }
    startEngagementLongOperation(
      "Préparation des courriels d'ouverture en cours...",
      "La compétition est ouverte ; LivePalmes prépare maintenant les destinataires avant l'envoi."
    );
    try {
      const preparation = await callFunction("prepareEngagementOpeningNotificationEmails", { competitionId });
      const jobCount = Number(preparation.jobCount || 0);
      if (!jobCount) {
        if (statusTarget) {
          statusTarget.textContent = "Engagements ouverts. Aucun destinataire d'e-mail trouvé.";
          statusTarget.dataset.tone = "ok";
        }
        finishEngagementLongOperation("success", "Engagements ouverts", "Aucun destinataire de courriel n'a été trouvé.");
        return preparation;
      }
      if (statusTarget) {
        statusTarget.textContent = `Envoi de ${jobCount} mail${jobCount > 1 ? "s" : ""} d'ouverture...`;
      }
      updateEngagementLongOperation(
        "Envoi des courriels d'ouverture en cours...",
        `${jobCount} courriel${jobCount > 1 ? "s" : ""} préparé${jobCount > 1 ? "s" : ""} ${jobCount > 1 ? "sont" : "est"} maintenant transmis.`
      );
      const sendResult = await callFunction("sendEngagementPreparedEmails", {
        competitionId,
        type: "opening_notification",
        limit: 500
      });
      if (engagementMailJobsCompetitionId === competitionId || selectedEngagementCompetitionId === competitionId) {
        await loadEngagementMailJobs({ force: true });
      }
      const sentCount = Number(sendResult.sentCount || 0);
      const errorCount = Number(sendResult.errorCount || 0);
      if (statusTarget) {
        statusTarget.textContent = [
          `Engagements ouverts. ${sentCount}/${jobCount} mail${jobCount > 1 ? "s" : ""} d'ouverture envoye${sentCount > 1 ? "s" : ""}.`,
          errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}.` : ""
        ].filter(Boolean).join(" ");
        statusTarget.dataset.tone = errorCount ? "error" : "ok";
      }
      finishEngagementLongOperation(
        errorCount ? "error" : "success",
        errorCount ? "Ouverture terminée avec des erreurs d'envoi" : "Engagements ouverts et courriels envoyés",
        `${sentCount}/${jobCount} courriel${jobCount > 1 ? "s" : ""} envoyé${sentCount > 1 ? "s" : ""}${errorCount ? ` · ${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""}.`
      );
      return sendResult;
    } catch (error) {
      finishEngagementLongOperation("error", "Envoi des courriels d'ouverture impossible", error?.message || String(error));
      throw error;
    }
  }

  async function createEngagementCompetition(event) {
    event?.preventDefault?.();
    if (!canCreateEngagementCompetition()) {
      if (elements.engagementsCreateMessage) {
      elements.engagementsCreateMessage.textContent = "Droit de création des compétitions d'engagements requis.";
        elements.engagementsCreateMessage.dataset.tone = "error";
      }
      return;
    }
    const payload = engagementCompetitionPayloadFromForm();
    const button = elements.engagementsCreateForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    if (elements.engagementsCreateMessage) {
      elements.engagementsCreateMessage.textContent = "Création en cours...";
      elements.engagementsCreateMessage.dataset.tone = "loading";
    }
    try {
      const genericEvent = ["training", "stage", "meeting", "other"].includes(elements.engagementsCompetitionType?.value || "");
      const result = await callFunction(genericEvent ? "createEngagementCalendarEvent" : "createEngagementCompetition", genericEvent ? {
        eventType: elements.engagementsCompetitionType.value,
        name: payload.name,
        date: payload.date,
        endDate: payload.endDate,
        location: payload.location,
        city: payload.location,
        level: payload.level,
        regionId: payload.regionId
      } : payload);
      elements.engagementsCreateForm?.reset();
      updateEngagementMaxEventsFields("create");
      updateEngagementCreateFormAccess();
      invalidateEngagementCalendarCaches();
      elements.engagementsCreateDialog?.close();
      setEngagementsTab("calendar");
      await loadEngagementCompetitions({ force: true });
      upsertEngagementCalendarItemFromServer(
        genericEvent ? result.event : result.competition,
        genericEvent ? "calendarEvent" : "competition"
      );
      newlyCreatedEngagementCompetitionId = genericEvent ? "" : result.competition?.id || "";
      if (elements.engagementsCreateMessage) {
        elements.engagementsCreateMessage.textContent = `Événement créé : ${result.event?.name || result.competition?.name || "calendrier"}.`;
        elements.engagementsCreateMessage.dataset.tone = "ok";
      }
      if (newlyCreatedEngagementCompetitionId) elements.engagementsCreateChecklist?.showModal();
      if (genericEvent && result.event?.id) global.LivePalmesCalendarEvents?.open?.(result.event.id);
    } catch (error) {
      if (elements.engagementsCreateMessage) {
        elements.engagementsCreateMessage.textContent = `Création impossible : ${error?.message || error}`;
        elements.engagementsCreateMessage.dataset.tone = "error";
      }
    } finally {
      if (button) button.disabled = false;
      updateEngagementCreateFormAccess();
    }
  }

  async function completeNewlyCreatedEngagementCompetition() {
    const competitionId = newlyCreatedEngagementCompetitionId;
    newlyCreatedEngagementCompetitionId = "";
    elements.engagementsCreateChecklist?.close("complete");
    if (competitionId) await loadEngagementCompetitionDetail(competitionId, "general");
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
      const openingDeadlineError = engagementOpeningDeadlineError(payload);
      if (openingDeadlineError) {
        if (elements.engagementsDetailStatus) {
          elements.engagementsDetailStatus.textContent = openingDeadlineError;
          elements.engagementsDetailStatus.dataset.tone = "error";
        }
        return;
      }
      const previousStatus = selectedEngagementCompetition.entryStatus || "upcoming";
      if (previousStatus === "open" && !confirmOpenedCompetitionSensitiveChanges(selectedEngagementCompetition, payload)) {
        if (elements.engagementsDetailStatus) {
          elements.engagementsDetailStatus.textContent = "Modification annulée.";
          elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        return;
      }
      const reopening = previousStatus === "closed" && payload.entryStatus === "open";
      let sendOpeningMail = shouldSendEngagementOpeningMail(previousStatus, payload.entryStatus);
      if (reopening) sendOpeningMail = confirmEngagementReopeningMail(payload);
      if (!reopening && sendOpeningMail && !confirmEngagementOpeningMail(payload)) {
        if (elements.engagementsDetailStatus) {
          elements.engagementsDetailStatus.textContent = "Ouverture annulee.";
          elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        return;
      }
      const result = await callFunction("updateEngagementCompetition", payload);
      selectedEngagementCompetition = result.competition || null;
      invalidateEngagementCalendarCaches();
      await loadEngagementCompetitions({ force: true });
      upsertEngagementCalendarItemFromServer(selectedEngagementCompetition, "competition");
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty("general");
      if (sendOpeningMail && selectedEngagementCompetition?.id) {
        try {
          await prepareAndSendEngagementOpeningEmails(selectedEngagementCompetition.id, elements.engagementsDetailStatus);
        } catch (mailError) {
          if (elements.engagementsDetailStatus) {
            elements.engagementsDetailStatus.textContent = `Paramètres enregistrés, mais e-mail d'ouverture impossible : ${mailError?.message || mailError}`;
            elements.engagementsDetailStatus.dataset.tone = "error";
          }
        }
      }
      if (elements.engagementsDetailStatus) {
        if (!sendOpeningMail) {
          elements.engagementsDetailStatus.textContent = reopening
            ? "Compétition rouverte sans renvoi de l'e-mail d'ouverture."
            : "Paramètres enregistrés.";
          elements.engagementsDetailStatus.dataset.tone = "ok";
        }
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

  async function saveEngagementCompetitionDetail(event, options = {}) {
    event?.preventDefault?.();
    if (!engagementDetailEditing || !selectedEngagementCompetition?.id || !canEditEngagementCompetition()) return false;
    if (elements.engagementsEditForm && !elements.engagementsEditForm.checkValidity()) {
      setEngagementsDetailTab("general");
      elements.engagementsEditForm.reportValidity();
      return false;
    }
    const categoryError = selectedEngagementEventsCategoryError();
    if (categoryError) {
      setEngagementsDetailTab("courses");
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = categoryError;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
      return false;
    }
    const programError = selectedEngagementProgramError();
    if (programError) {
      setEngagementsDetailTab("courses");
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = programError;
        elements.engagementsEventsMessage.dataset.tone = "error";
      }
      return false;
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
      const openingDeadlineError = engagementOpeningDeadlineError(payload);
      if (openingDeadlineError) {
        if (elements.engagementsDetailStatus) {
          elements.engagementsDetailStatus.textContent = openingDeadlineError;
          elements.engagementsDetailStatus.dataset.tone = "error";
        }
        return false;
      }
      const previousStatus = selectedEngagementCompetition.entryStatus || "upcoming";
      if (previousStatus === "open" && !confirmOpenedCompetitionSensitiveChanges(selectedEngagementCompetition, payload)) {
        if (elements.engagementsDetailStatus) {
          elements.engagementsDetailStatus.textContent = "Modification annulée.";
          elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        return false;
      }
      const reopening = previousStatus === "closed" && payload.entryStatus === "open";
      let sendOpeningMail = shouldSendEngagementOpeningMail(previousStatus, payload.entryStatus);
      if (reopening) sendOpeningMail = confirmEngagementReopeningMail(payload);
      if (!reopening && sendOpeningMail && !confirmEngagementOpeningMail(payload)) {
        if (elements.engagementsDetailStatus) {
          elements.engagementsDetailStatus.textContent = "Ouverture annulee.";
          elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        return false;
      }
      const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
      const result = await callFunction("updateEngagementCompetition", payload);
      const returnedCompetition = result.competition || {};
      const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
      selectedEngagementCompetition = {
        ...returnedCompetition,
        ...(expectedProgramItemCount && !returnedProgramItemCount ? { programSessions: payload.programSessions } : {})
      };
      invalidateEngagementCalendarCaches();
      await loadEngagementCompetitions({ force: true });
      upsertEngagementCalendarItemFromServer(selectedEngagementCompetition, "competition");
      activeEngagementProgramSessionId = "";
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      if (options.continueEditing === true) setEngagementEditMode(true);
      clearEngagementDetailTabDirty();
      if (sendOpeningMail && selectedEngagementCompetition?.id) {
        try {
          await prepareAndSendEngagementOpeningEmails(selectedEngagementCompetition.id, elements.engagementsDetailStatus);
        } catch (mailError) {
          if (elements.engagementsDetailStatus) {
            elements.engagementsDetailStatus.textContent = `Fiche enregistrée, mais e-mail d'ouverture impossible : ${mailError?.message || mailError}`;
            elements.engagementsDetailStatus.dataset.tone = "error";
          }
        }
      }
      if (elements.engagementsDetailStatus) {
        if (!sendOpeningMail) {
          elements.engagementsDetailStatus.textContent = reopening
          ? "Compétition rouverte sans renvoi de l'e-mail d'ouverture."
          : "Fiche compétition enregistrée.";
          elements.engagementsDetailStatus.dataset.tone = "ok";
        }
      }
      return true;
    } catch (error) {
      if (elements.engagementsDetailStatus) {
        elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
        elements.engagementsDetailStatus.dataset.tone = "error";
      }
      return false;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function engagementCompetitionPayloadFromSelection(extra = {}) {
    return {
      competitionId: selectedEngagementCompetition.id,
      competitionType: engagementCompetitionType(selectedEngagementCompetition),
      waterBodyType: selectedEngagementCompetition.waterBodyType || "",
      name: selectedEngagementCompetition.name || "",
      date: selectedEngagementCompetition.date || "",
      location: selectedEngagementCompetition.location || "",
      level: selectedEngagementCompetition.level || "regional",
      regionId: selectedEngagementCompetition.regionId || "",
      invitedRegionIds: selectedEngagementCompetition.invitedRegionIds || [],
      entryDeadlineAt: selectedEngagementCompetition.entryDeadlineAt || "",
      endDate: selectedEngagementCompetition.endDate || selectedEngagementCompetition.date || "",
      computerEmail: selectedEngagementCompetition.computerEmail || "",
      entryStatus: selectedEngagementCompetition.entryStatus || "upcoming",
      officialsRequired: selectedEngagementCompetition.officialsRequired === true,
      poolLength: engagementCompetitionType(selectedEngagementCompetition) === "pool" ? selectedEngagementCompetition.poolLength || "50" : "",
      poolLaneCount: selectedEngagementCompetition.poolLaneCount || 0,
      timingType: selectedEngagementCompetition.timingType || "electronic",
      qualificationTimesMode: selectedEngagementCompetition.qualificationTimesMode || "all",
      qualificationStartDate: selectedEngagementCompetition.qualificationStartDate || "",
      qualificationEndDate: selectedEngagementCompetition.qualificationEndDate || "",
      missingEntryTimeMode: engagementCompetitionType(selectedEngagementCompetition) === "pool" ? selectedEngagementCompetition.missingEntryTimeMode || "manual" : "none",
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
      invalidateEngagementCalendarCaches();
      await loadEngagementCompetitions({ force: true });
      activeEngagementProgramSessionId = "";
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty("courses");
      setEngagementsDetailTab("courses");
      setEngagementEventsSectionOpen(elements.engagementsEventsChoiceSection, false);
      setEngagementEventsSectionOpen(elements.engagementsProgramSection, true);
      if (elements.engagementsEventsMessage) {
        elements.engagementsEventsMessage.textContent = programConfirmed
          ? "Programme enregistré."
          : "Programme conservé à l'écran, mais non confirmé par le serveur. Redéployez les Functions avant de tester l'enregistrement réel.";
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
      invalidateEngagementCalendarCaches();
      await loadEngagementCompetitions({ force: true });
      renderEngagementCompetitionDetail(selectedEngagementCompetition || {});
      clearEngagementDetailTabDirty("fees");
      setEngagementsDetailTab("fees");
      if (elements.engagementsFeesMessage) {
      elements.engagementsFeesMessage.textContent = "Frais enregistrés.";
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
    const authReady = status.ready === true;
    const authUid = global.firebase?.auth?.().currentUser?.uid || "";
    if (activeAuthUid && activeAuthUid !== authUid) {
      clearEngagementClubWorkspaceSessionCaches();
      clearEngagementClubSwimmersSessionCaches();
      clearActiveEngagementClub();
      currentAccessProfile = null;
      renderPortalScopeContext({});
      portalPendingOverviewLoaded = false;
      portalPendingOverviewLoading = false;
      renderPortalPendingOverview();
      resetEngagementClubData();
      engagementCompetitions = [];
      engagementCompetitionsLoaded = false;
      engagementCompetitionsLoadedRange = "";
      engagementCompetitionsLoadedCacheKey = "";
      engagementCompetitionsCachedAt = 0;
      engagementAccessRequestsLoaded = false;
      engagementDeletionRequestsLoaded = false;
      accessUsers = [];
      accessUsersLoaded = false;
      accessCurrentCursor = null;
      accessNextCursor = null;
      accessPreviousCursors = [];
      accessPage = 1;
      accessDeletionRequestsLoaded = false;
      resetEngagementNationalAuditData();
    }
    activeAuthUid = signedIn ? authUid : "";
    if (!signedIn && status.ready) {
      clearActiveEngagementClub();
      currentAccessProfile = null;
      renderPortalScopeContext({});
      portalPendingOverviewLoaded = false;
      portalPendingOverviewLoading = false;
      renderPortalPendingOverview();
      resetEngagementClubData();
      resetEngagementNationalAuditData();
    }
    document.body.dataset.adminAuth = !authReady ? "loading" : signedIn ? "unlocked" : "locked";
    document.body.setAttribute("aria-busy", authReady ? "false" : "true");
    if (elements.dashboard) elements.dashboard.hidden = !signedIn;
    if (elements.accountControl) elements.accountControl.hidden = !signedIn;
    if (elements.navToggle) elements.navToggle.hidden = !signedIn;
    if (elements.sessionLabel) elements.sessionLabel.textContent = "Profil LivePalmes";
    if (signedIn) {
      updateCapabilityView();
      if (status.profile) renderCurrentUser(status.profile);
      else loadCurrentUser();
    } else {
      applyPortalHomeForProfile();
      setMobilePortalNavigationOpen(false);
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
      setMessage("E-mail de réinitialisation envoyé.", "ok");
    } catch (error) {
      setMessage(`Réinitialisation impossible : ${error?.message || error}`);
    }
  }

  async function signOut() {
    try {
      clearActiveEngagementClub();
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

  async function toggleAccountNotificationPreferences() {
    const button = elements.accountCompetitionNotifications;
    if (!button || button.disabled) return;
    const currentlyEnabled = button.getAttribute("aria-checked") !== "false";
    const enabled = !currentlyEnabled;
    if (!enabled && !global.confirm(
      "Désactiver les notifications de compétition ? Vous ne recevrez plus les ouvertures de compétitions, les nouveaux documents ni les récapitulatifs PDF d’engagement."
    )) return;
    if (button) button.disabled = true;
    setAccountMessage(elements.accountNotificationsMessage, "Enregistrement…", "loading");
    try {
      const result = await callFunction("updateCurrentEmailNotificationPreferences", {
        competitionNotifications: enabled
      });
      renderCurrentUser({
        ...(currentAccessProfile || {}),
        competitionNotificationsEnabled: result.competitionNotificationsEnabled !== false
      });
      setAccountMessage(
        elements.accountNotificationsMessage,
        result.competitionNotificationsEnabled !== false
          ? "Notifications de compétition activées."
          : "Notifications de compétition désactivées.",
        "ok"
      );
    } catch (error) {
      setAccountMessage(elements.accountNotificationsMessage, `Enregistrement impossible : ${error?.message || error}`);
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

  function openAccessDialog() {
    const dialog = elements.accessPanel;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    elements.accessAdd?.setAttribute("aria-expanded", "true");
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
    if (elements.accessDialogTitle) elements.accessDialogTitle.textContent = `Modifier ${[user.lastName, user.firstName].filter(Boolean).join(" ") || "l’utilisateur"}`;
    openAccessDialog();
    form.querySelector("#adminAccessLastName")?.focus();
  }

  function resetAccessForm(close = false) {
    editingUid = "";
    elements.accessForm?.reset();
    populateAccessClubSelect();
    setAccessMessage("");
    if (elements.accessDialogTitle) elements.accessDialogTitle.textContent = "Ajouter un utilisateur";
    if (close && elements.accessPanel?.open) elements.accessPanel.close();
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

  function accessActionIcon(action) {
    if (action === "edit") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z"></path><path d="m14.8 6 3.2 3.2"></path></svg>';
    }
    if (action === "enable") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8"></path><path d="M7.1 5.8a8 8 0 1 0 9.8 0"></path></svg>';
    }
    if (action === "disable") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="m9 7 1-3h4l1 3"></path><path d="m7 7 1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>';
  }

  function renderAccessUsers() {
    const mount = elements.accessList;
    if (!mount) return;
    if (elements.accessCount) {
      elements.accessCount.textContent = accessUsers.length
        ? `${accessUsers.length} compte${accessUsers.length > 1 ? "s" : ""} affiché${accessUsers.length > 1 ? "s" : ""}${accessDirectoryTruncated ? " · recherche bornée, affinez les filtres" : ""}`
        : "Aucun compte trouvé";
    }
    if (!accessUsers.length) {
      mount.innerHTML = `<p class="admin-access-empty">Aucun compte ne correspond à cette recherche.</p>`;
      renderAccessPagination();
      return;
    }
    const sortedUsers = [...accessUsers].sort((left, right) =>
      String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
      String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
      String(left.email || "").localeCompare(String(right.email || ""), "fr-FR", { sensitivity: "base", numeric: true })
    );
    const rows = sortedUsers.map((user, index) => {
      const lastName = user.lastName || "—";
      const firstName = user.firstName || "—";
      const name = [user.lastName, user.firstName].filter(Boolean).join(" ") || user.email || "Compte LivePalmes";
      const rights = (user.capabilities || []).map(capabilityLabel);
      const rightsLabel = rights.join(" · ") || "Aucune habilitation active";
      const inactive = user.status !== "active";
      const clubLine = clubDisplayLabel(user, { fallback: "Club non renseigné" });
      const regionLine = user.regionId ? `Région ${regionDisplayLabel(user.regionId)}` : "Région non renseignée";
      const currentUid = global.firebase?.auth?.().currentUser?.uid || "";
      const isCurrentUser = user.uid && user.uid === currentUid;
      const detailsId = `adminAccessDirectoryDetails${index}`;
      const actions = [];
      if (canUse("admin.full")) {
        actions.push(`<button class="ghost-button admin-access-action-button" type="button" data-access-edit="${user.uid}">${accessActionIcon("edit")}<span>Modifier</span></button>`);
        actions.push(`<button class="ghost-button admin-access-action-button" type="button" data-access-status="${inactive ? "active" : "inactive"}" data-access-uid="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${accessActionIcon(inactive ? "enable" : "disable")}<span>${inactive ? "Réactiver" : "Désactiver"}</span></button>`);
      }
      if (canDeleteAccessUserDirectly()) {
        actions.push(`<button class="ghost-button danger-button admin-access-action-button" type="button" data-access-delete="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${accessActionIcon("delete")}<span>Supprimer</span></button>`);
      } else if (canUse("engagements.region.manage")) {
        actions.push(`<button class="ghost-button danger-button admin-access-action-button" type="button" data-access-delete-request="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${accessActionIcon("delete")}<span>Demander la suppression</span></button>`);
      }
      return `
        <article class="admin-access-row ${inactive ? "inactive" : ""}" data-access-uid="${user.uid}" data-expanded="false" role="rowgroup">
          <button class="admin-access-row-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" data-access-directory-toggle>
            <span class="admin-access-row-toggle-user">
              <strong>${escapeHtml(name)}</strong>
              <small>${escapeHtml(user.email || user.uid)}</small>
            </span>
            <span class="admin-access-row-toggle-meta">
              <span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span>
              <span class="admin-access-row-chevron" aria-hidden="true">›</span>
            </span>
          </button>
          <div class="admin-access-row-summary" role="row">
            <div class="admin-access-last-name" role="cell" data-label="Nom">
              <strong>${escapeHtml(lastName)}</strong>
            </div>
            <div class="admin-access-first-name" role="cell" data-label="Prénom">${escapeHtml(firstName)}</div>
            <div class="admin-access-email" role="cell" data-label="Email" title="${escapeHtml(user.email || user.uid)}">${escapeHtml(user.email || user.uid)}</div>
            <div class="admin-access-scope" role="cell" data-label="Club" title="${escapeHtml(`${clubLine} · ${regionLine}`)}">
              <span>${escapeHtml(clubLine)}</span>
            </div>
            <div role="cell" data-label="Connexion">
              <small class="admin-access-login">${escapeHtml(user.lastLoginAt ? formatAccessDateTime(user.lastLoginAt) : "Non disponible")}</small>
            </div>
            <div role="cell" data-label="État"><span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span></div>
            <div class="admin-access-row-disclosure" role="cell">
              <button type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${escapeHtml(name)}" data-access-directory-toggle>
                <span class="admin-access-row-chevron" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <div id="${detailsId}" class="admin-access-row-expanded">
            <div class="admin-access-row-expanded-data">
              <div><span>Licence</span><strong>${escapeHtml(user.licenseNumber || "Non renseignée")}</strong></div>
              <div><span>Périmètre</span><strong>${escapeHtml(clubLine)}</strong><small>${escapeHtml(regionLine)}</small></div>
              <div class="admin-access-row-expanded-rights"><span>Habilitations</span><strong>${escapeHtml(rightsLabel)}</strong></div>
            </div>
            <div class="admin-access-row-actions">
              ${actions.join("") || "<small>Aucune action disponible</small>"}
            </div>
          </div>
        </article>
      `;
    }).join("");
    mount.innerHTML = `
      <div class="admin-access-table" role="table" aria-label="Utilisateurs du portail">
        <div class="admin-access-table-head" role="row">
          <span role="columnheader">Nom</span>
          <span role="columnheader">Prénom</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Club</span>
          <span role="columnheader">Connexion</span>
          <span role="columnheader">État</span>
          <span role="columnheader" aria-label="Détails"></span>
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

  async function loadAccessUsers({ reset = false, force = false } = {}) {
    if (!canManageAccessDirectory()) return;
    if (accessUsersLoading && !reset) return;
    if (accessUsersLoaded && !reset && !force) {
      renderAccessUsers();
      return;
    }
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
      if (Number(result.directoryVersion) >= 2) {
        accessUsers = returnedUsers;
        accessNextCursor = result.nextCursor || null;
        accessDirectoryTruncated = result.truncated === true;
      } else {
        const filteredUsers = legacyFilteredAccessUsers(returnedUsers, filters);
        const offset = Math.max(0, Math.trunc(Number(accessCurrentCursor?.offset) || 0));
        accessUsers = filteredUsers.slice(offset, offset + 25);
        accessNextCursor = offset + 25 < filteredUsers.length ? { offset: offset + 25 } : null;
        accessDirectoryTruncated = false;
      }
      accessUsersLoaded = true;
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
    await loadAccessUsers({ force: true });
  }

  async function showPreviousAccessPage() {
    if (!accessPreviousCursors.length || accessUsersLoading) return;
    accessCurrentCursor = accessPreviousCursors.pop() || null;
    accessPage = Math.max(1, accessPage - 1);
    await loadAccessUsers({ force: true });
  }

  async function setAccessStatus(uid, status) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    const verb = status === "active" ? "réactiver" : "désactiver";
    if (!window.confirm(`Confirmer : ${verb} ${label} ?`)) return;
    try {
      await callFunction("setAccessUserStatus", { uid, status });
      await loadAccessUsers({ force: true });
      setAccessMessage(`Accès ${status === "active" ? "réactivé" : "désactivé"}.`, "ok");
    } catch (error) {
      setAccessMessage(`Changement de statut impossible : ${error?.message || error}`);
    }
  }

  function renderAccessDeletionRequests() {
    if (!canDeleteAccessUserDirectly()) {
      if (elements.accessDeletionRequestsPanel) elements.accessDeletionRequestsPanel.hidden = true;
      if (elements.engagementsNationalAccountsList) elements.engagementsNationalAccountsList.innerHTML = "";
      updateEngagementNationalRequestsPresentation();
      return;
    }
    if (elements.accessDeletionRequestsPanel) elements.accessDeletionRequestsPanel.hidden = false;
    if (!accessDeletionRequests.length) {
      if (elements.accessDeletionRequestsList) elements.accessDeletionRequestsList.innerHTML = `<p class="admin-access-empty">Aucune demande de suppression en attente.</p>`;
      if (elements.engagementsNationalAccountsList) elements.engagementsNationalAccountsList.innerHTML = `<p class="admin-engagements-empty">Aucune demande de suppression de compte en attente.</p>`;
      if (elements.accessDeletionRequestsStatus) elements.accessDeletionRequestsStatus.textContent = `Aucune demande en attente.${lastRefreshSuffix(elements.accessDeletionRequestsStatus)}`;
      if (elements.engagementsNationalAccountsStatus) {
        elements.engagementsNationalAccountsStatus.textContent = "Aucune demande en attente.";
        elements.engagementsNationalAccountsStatus.dataset.tone = "ok";
      }
      updateEngagementNationalRequestsPresentation();
      return;
    }
    const html = accessDeletionRequests.map((request) => {
      const name = [request.targetFirstName, request.targetLastName].filter(Boolean).join(" ") || request.targetEmail || "Compte LivePalmes";
      const region = request.targetRegionId ? regionDisplayLabel(request.targetRegionId) : "Région non renseignée";
      const rights = (request.targetCapabilities || []).map(capabilityLabel).join(", ") || "Aucun droit actif";
      return `
        <article class="admin-engagements-request-card" data-access-deletion-request-id="${request.id}">
          <div class="admin-engagements-request-main">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(request.targetEmail || request.targetUid)}</small>
            <small>${escapeHtml(`Région ${region} - ${rights}`)}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>Demande par ${escapeHtml(request.requestedByEmail || request.requestedBy || "admin régional")}</span>
            <span>${escapeHtml(request.requestedAt ? formatAccessDateTime(request.requestedAt) : "")}</span>
          </div>
          <div class="admin-engagements-request-actions">
            <button type="button" data-access-deletion-decision="approved" data-access-deletion-request-id="${request.id}">Accepter</button>
            <button class="ghost-button" type="button" data-access-deletion-decision="rejected" data-access-deletion-request-id="${request.id}">Refuser</button>
          </div>
        </article>
      `;
    }).join("");
    if (elements.accessDeletionRequestsList) elements.accessDeletionRequestsList.innerHTML = html;
    if (elements.engagementsNationalAccountsList) elements.engagementsNationalAccountsList.innerHTML = html;
    if (elements.accessDeletionRequestsStatus) {
      elements.accessDeletionRequestsStatus.textContent = `${accessDeletionRequests.length} demande${accessDeletionRequests.length > 1 ? "s" : ""} en attente.${lastRefreshSuffix(elements.accessDeletionRequestsStatus)}`;
    }
    if (elements.engagementsNationalAccountsStatus) {
      elements.engagementsNationalAccountsStatus.textContent = `${accessDeletionRequests.length} demande${accessDeletionRequests.length > 1 ? "s" : ""} en attente.`;
      elements.engagementsNationalAccountsStatus.dataset.tone = "ok";
    }
    updateEngagementNationalRequestsPresentation();
  }

  async function loadAccessDeletionRequests({ force = false } = {}) {
    if (!canDeleteAccessUserDirectly() || accessDeletionRequestsLoading) return;
    if (accessDeletionRequestsLoaded && !force) return;
    accessDeletionRequestsLoading = true;
    updateEngagementNationalRequestsPresentation();
    if (elements.accessDeletionRequestsStatus) {
      elements.accessDeletionRequestsStatus.textContent = "Chargement...";
      elements.accessDeletionRequestsStatus.dataset.tone = "loading";
    }
    if (elements.engagementsNationalAccountsStatus) {
      elements.engagementsNationalAccountsStatus.textContent = "Chargement...";
      elements.engagementsNationalAccountsStatus.dataset.tone = "loading";
    }
    try {
      const result = await callFunction("listAccessUserDeletionRequests", {});
      accessDeletionRequests = Array.isArray(result.requests) ? result.requests : [];
      accessDeletionRequestsLoaded = true;
      markLastRefresh(elements.accessDeletionRequestsStatus);
      markLastRefresh(elements.engagementsNationalAccountsStatus);
      renderAccessDeletionRequests();
      if (elements.accessDeletionRequestsStatus) elements.accessDeletionRequestsStatus.dataset.tone = "ok";
    } catch (error) {
      if (elements.accessDeletionRequestsStatus) {
        elements.accessDeletionRequestsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.accessDeletionRequestsStatus.dataset.tone = "error";
      }
      if (elements.engagementsNationalAccountsStatus) {
        elements.engagementsNationalAccountsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
        elements.engagementsNationalAccountsStatus.dataset.tone = "error";
      }
    } finally {
      accessDeletionRequestsLoading = false;
      updateEngagementNationalRequestsPresentation();
    }
  }

  async function deleteAccessUser(uid) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    if (!global.confirm(`Suppression définitive du compte ${label} ? Cette action supprime le compte Firebase et ses droits LivePalmes.`)) return;
    try {
      await callFunction("deleteAccessUser", { uid, confirmPermanent: true });
      accessDeletionRequestsLoaded = false;
      await loadAccessUsers({ reset: true });
      if (canDeleteAccessUserDirectly()) await loadAccessDeletionRequests({ force: true });
      setAccessMessage("Compte supprimé définitivement.", "ok");
    } catch (error) {
      setAccessMessage(`Suppression impossible : ${error?.message || error}`);
    }
  }

  async function requestAccessUserDeletion(uid) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    if (!global.confirm(`Demander à un admin national de supprimer le compte ${label} ?`)) return;
    try {
      await callFunction("requestAccessUserDeletion", { uid });
      setAccessMessage("Demande de suppression envoyée à l'administration nationale.", "ok");
    } catch (error) {
      setAccessMessage(`Demande impossible : ${error?.message || error}`);
    }
  }

  async function resolveAccessDeletionRequest(requestId, decision, statusElement = elements.accessDeletionRequestsStatus) {
    const request = accessDeletionRequests.find((item) => item.id === requestId);
    const label = request?.targetEmail || request?.targetUid || "ce compte";
    const approve = decision === "approved";
    const message = approve
      ? `Accepter la demande et supprimer définitivement ${label} ?`
      : `Refuser la demande de suppression de ${label} ?`;
    if (!global.confirm(message)) return;
    if (statusElement) {
      statusElement.textContent = approve ? "Suppression en cours..." : "Refus en cours...";
      statusElement.dataset.tone = "loading";
    }
    try {
      await callFunction("resolveAccessUserDeletionRequest", { requestId, decision: approve ? "approved" : "rejected" });
      portalPendingOverviewLoaded = false;
      accessDeletionRequestsLoaded = false;
      await loadAccessUsers({ reset: true });
      await loadAccessDeletionRequests({ force: true });
      await loadPortalPendingOverview({ force: true });
      if (statusElement) {
      statusElement.textContent = approve ? "Demande acceptée et compte supprimé." : "Demande refusée.";
        statusElement.dataset.tone = "ok";
      }
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = `Traitement impossible : ${error?.message || error}`;
        statusElement.dataset.tone = "error";
      }
    }
  }

  async function saveAccessUser(event) {
    event?.preventDefault?.();
    if (!canUse("admin.full")) {
      setAccessMessage("Droit d'administration générale requis.");
      return;
    }
    const payload = accessPayloadFromForm();
    setAccessMessage("");
    try {
      const result = await callFunction("createOrUpdateAccessUser", payload);
      const sendReset = elements.accessForm.querySelector("#adminAccessSendReset")?.checked;
      if (sendReset) {
        await global.firebase.auth().sendPasswordResetEmail(result.email || payload.email, {
          url: "https://livepalmes.firebaseapp.com/portail.html",
          handleCodeInApp: false
        });
      }
      resetAccessForm(true);
      await loadAccessUsers({ reset: true });
      setAccessMessage(
        `${result.created ? "Compte créé" : "Compte mis à jour"} : ${result.email}. ${sendReset ? "E-mail de mot de passe envoyé." : ""}`,
        "ok"
      );
    } catch (error) {
      setAccessMessage(`Enregistrement impossible : ${error?.message || error}`);
    }
  }

    function init() {
    initializePortalNavigationLabels();
    if (!engagementDeadlineCountdownTimer) {
      engagementDeadlineCountdownTimer = global.setInterval(refreshEngagementDeadlineCountdowns, 60000);
    }
    restorePortalNavigationPinned();
    restoreActiveEngagementClubFromSession();
    populateLivePalmesRegionSelects();
    populateAccessClubSelect();
    populateEngagementSeasonFilter();
    const auth = ensureAdminAuth();
    updateView(auth?.status?.() || {});
    elements.form?.addEventListener("submit", signIn);
    elements.passwordToggle?.addEventListener("click", toggleLoginPasswordVisibility);
    elements.scopeClubButton?.addEventListener("click", openClubSwitchDialog);
    elements.accountClubSwitch?.addEventListener("click", () => {
      closeAccountMenu();
      openClubSwitchDialog();
    });
    elements.clubSwitchSearch?.addEventListener("input", renderClubSwitchResults);
    elements.clubSwitchResults?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-portal-active-club-id]");
      if (!button) return;
      changeActiveEngagementClub(button.dataset.portalActiveClubId || "");
    });
    elements.clubSwitchReset?.addEventListener("click", () => changeActiveEngagementClub(""));
    elements.clubSwitchClose?.addEventListener("click", () => elements.clubSwitchDialog?.close());
    elements.reset?.addEventListener("click", sendPasswordReset);
    elements.publicAccessRequestForm?.addEventListener("submit", submitPublicEngagementAccessRequest);
    elements.publicAccessRequestLastName?.addEventListener("input", (event) => {
      event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
    });
    elements.publicAccessRequestRegionId?.addEventListener("change", () => {
      if (elements.publicAccessRequestNewClub?.checked !== true) {
        void loadAccessClubReference().then(() => populatePublicAccessRequestClubSelect());
      }
    });
    elements.publicAccessRequestClubSelect?.addEventListener("focus", () => void loadAccessClubReference().then(() => populatePublicAccessRequestClubSelect()));
    elements.publicAccessRequestClubSelect?.addEventListener("change", syncPublicAccessRequestClubFieldsFromSelect);
    elements.publicAccessRequestNewClub?.addEventListener("change", () => updatePublicAccessRequestNewClubMode());
    elements.publicAccessRequestNewClubFederalNumber?.addEventListener("input", (event) => {
      event.currentTarget.value = event.currentTarget.value.toUpperCase();
    });
    elements.publicAccessRequestNewClubFederalNumber?.addEventListener("change", () => {
      void matchPublicAccessRequestClubByFederalNumber();
    });
    elements.signOut?.addEventListener("click", signOut);
    elements.engagementsAccessRequestsRefresh?.addEventListener("click", () => loadEngagementAccessRequests({ force: true }));
    elements.engagementsMailJobsList?.addEventListener("click", (event) => {
      if (event.target.closest("[data-engagement-mail-jobs-more]")) void loadEngagementMailJobs({ append: true });
    });
    elements.engagementsDeletionRequestsRefresh?.addEventListener("click", () => loadEngagementDeletionRequests({ force: true }));
    elements.engagementsNationalSwimmersRefresh?.addEventListener("click", () => loadEngagementNationalSwimmers({ force: true }));
    elements.engagementsCalendarFilters?.addEventListener("submit", (event) => event.preventDefault());
    [elements.engagementsRegionFilter, elements.engagementsLevelFilter, elements.engagementsTypeFilter, elements.engagementsStatusFilter, elements.engagementsMineFilter].forEach((filter) => {
      filter?.addEventListener("change", () => {
        engagementCompetitionsVisibleLimit = 24;
        syncEngagementStatusSegments();
        renderEngagementCompetitions();
      });
    });
    elements.engagementsSeasonFilter?.addEventListener("change", () => {
      engagementCompetitionsVisibleLimit = 24;
      loadEngagementCompetitions({ force: true });
    });
    elements.engagementsStatusSegmentButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        if (elements.engagementsStatusFilter) elements.engagementsStatusFilter.value = button.dataset.engagementStatus || "";
        engagementCompetitionsVisibleLimit = 24;
        syncEngagementStatusSegments();
        renderEngagementCompetitions();
      });
    });
    elements.engagementsFiltersReset?.addEventListener("click", () => {
      resetEngagementCalendarFilters();
      const filters = engagementCalendarFiltersPayload();
      const requestedRange = engagementCalendarRequestedRange(filters);
      if (engagementCompetitionsLoadedRange === requestedRange) renderEngagementCompetitions();
      else loadEngagementCompetitions({ force: true });
    });
    elements.engagementsTabButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        setEngagementsTab(button.dataset.engagementsTabButton);
        if (activeEngagementsTab === "calendar") loadEngagementCompetitions();
        if (activeEngagementsTab === "accessRequests") loadEngagementAccessRequests();
        if (activeEngagementsTab === "deletionRequests") loadActiveEngagementNationalTab();
        if (activeEngagementsTab === "clubPeople") {
          loadEngagementClubPeople();
          loadEngagementClubSwimmers({ silent: true });
        }
        if (activeEngagementsTab === "clubSwimmers") loadEngagementClubSwimmers();
        updateNavigationView();
      });
    });
    elements.engagementsDetailTabButtons?.forEach((button) => {
      button.addEventListener("click", () => requestEngagementDetailTab(button.dataset.engagementsDetailTabButton));
    });
    elements.engagementsUnsavedSave?.addEventListener("click", () => resolveEngagementUnsavedDecision("save"));
    elements.engagementsUnsavedDiscard?.addEventListener("click", () => resolveEngagementUnsavedDecision("discard"));
    elements.engagementsUnsavedStay?.addEventListener("click", () => resolveEngagementUnsavedDecision("stay"));
    elements.engagementsUnsavedDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      resolveEngagementUnsavedDecision("stay");
    });
    elements.engagementsDetailStepButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        const requestedGroup = button.dataset.engagementStepButton || "";
        const groupTabs = engagementDetailTabsForGroup(requestedGroup);
        const visibleTabs = new Set(visibleEngagementDetailTabs());
        const preferredClubTab = !isEngagementAdminMode()
          && requestedGroup === "participants"
          && engagementClubTeamComplete()
          && visibleTabs.has("swimmers")
          ? "swimmers"
          : "";
        if (requestedGroup === engagementDetailTabGroup(activeEngagementsDetailTab)
          && (!preferredClubTab || activeEngagementsDetailTab === preferredClubTab)) return;
        const target = preferredClubTab || groupTabs.find((tab) => visibleTabs.has(tab)) || "";
        if (target) requestEngagementDetailTab(target);
      });
    });
    elements.engagementsCalendarList?.addEventListener("click", (event) => {
      if (event.target.closest("[data-engagement-filters-reset]")) {
        resetEngagementCalendarFilters();
        const filters = engagementCalendarFiltersPayload();
        const requestedRange = engagementCalendarRequestedRange(filters);
        if (engagementCompetitionsLoadedRange === requestedRange) renderEngagementCompetitions();
        else loadEngagementCompetitions({ force: true });
        return;
      }
      if (event.target.closest("[data-engagement-show-more]")) {
        engagementCompetitionsVisibleLimit += 24;
        renderEngagementCompetitions();
        return;
      }
      const button = event.target.closest("[data-engagement-competition-id]");
      if (button) {
        const item = engagementCompetitions.find((competition) => competition.id === button.dataset.engagementCompetitionId);
        if (item?.sourceType === "calendarEvent") global.LivePalmesCalendarEvents?.open?.(item.id);
        else loadEngagementCompetitionDetail(button.dataset.engagementCompetitionId, button.dataset.engagementOpenTab || "general");
        return;
      }
      const card = event.target.closest("[data-engagement-competition-card-id]");
      if (card) {
        const item = engagementCompetitions.find((competition) => competition.id === card.dataset.engagementCompetitionCardId);
        if (item?.sourceType === "calendarEvent") global.LivePalmesCalendarEvents?.open?.(item.id);
        else loadEngagementCompetitionDetail(card.dataset.engagementCompetitionCardId, card.dataset.engagementOpenTab || "general");
      }
    });
    elements.engagementsDeletionRequestsList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-deletion-action]");
      if (!button) return;
      const action = button.dataset.engagementDeletionAction;
      if (action === "view") {
        setEngagementsTab("calendar");
        global.location.hash = "#competitions-calendrier";
        loadEngagementCompetitionDetail(button.dataset.engagementCompetitionId);
        return;
      }
      const decision = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
      if (decision) resolveEngagementDeletionRequest(
        button.dataset.engagementDeletionRequestId,
        decision,
        button.dataset.engagementDeletionRequestType || "competition"
      );
    });
    elements.engagementsAccessRequestsList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-access-request-action]");
      if (!button) return;
      if (button.dataset.engagementAccessRequestAction === "edit") {
        openEngagementAccessRequestEditForm(button.dataset.engagementAccessRequestId || "");
        return;
      }
      if (button.dataset.engagementAccessRequestAction === "reject") {
        openEngagementAccessRequestRejectDialog(button.dataset.engagementAccessRequestId || "");
      }
    });
    elements.engagementsAccessRequestEditForm?.addEventListener("submit", submitEngagementAccessRequestEdit);
    elements.engagementsAccessRequestEditCancel?.addEventListener("click", closeEngagementAccessRequestEditForm);
    elements.engagementsAccessRequestEditRegionId?.addEventListener("change", () => populateEngagementAccessRequestEditClubSelect());
    elements.engagementsAccessRequestEditClubSelect?.addEventListener("change", syncEngagementAccessRequestEditClubFieldsFromSelect);
    elements.engagementsAccessRequestRejectForm?.addEventListener("submit", submitEngagementAccessRequestRejection);
    elements.engagementsAccessRequestRejectCancel?.addEventListener("click", closeEngagementAccessRequestRejectDialog);
    elements.engagementsAccessRequestRejectDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEngagementAccessRequestRejectDialog();
    });
    elements.engagementsNationalTabButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.engagementsNationalTabButton;
        setEngagementNationalTab(tab);
        const hash = ENGAGEMENT_NATIONAL_HASH_BY_TAB[tab];
        if (hash && global.location.hash !== hash) global.location.hash = hash;
      });
    });
    elements.engagementsNationalAccountsRefresh?.addEventListener("click", () => loadAccessDeletionRequests({ force: true }));
    elements.engagementsNationalClubsSearch?.addEventListener("input", () => {
      engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
      renderEngagementNationalClubs();
    });
    elements.engagementsNationalClubsStatusFilter?.addEventListener("change", () => {
      engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
      renderEngagementNationalClubs();
    });
    elements.engagementsNationalClubsRegionFilter?.addEventListener("change", () => {
      engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
      renderEngagementNationalClubs();
    });
    elements.engagementsNationalClubsReset?.addEventListener("click", () => {
      if (elements.engagementsNationalClubsSearch) elements.engagementsNationalClubsSearch.value = "";
      if (elements.engagementsNationalClubsStatusFilter) elements.engagementsNationalClubsStatusFilter.value = "";
      if (elements.engagementsNationalClubsRegionFilter) elements.engagementsNationalClubsRegionFilter.value = "";
      engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
      renderEngagementNationalClubs();
    });
    elements.engagementsNationalClubsCreate?.addEventListener("click", () => openEngagementNationalClubDialog());
    elements.engagementsNationalClubsList?.addEventListener("click", (event) => {
      if (event.target.closest("[data-engagement-national-clubs-show-more]")) {
        engagementNationalClubsVisibleLimit += ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
        renderEngagementNationalClubs();
        return;
      }
      const button = event.target.closest("[data-engagement-national-club-edit]");
      if (button) openEngagementNationalClubDialog(button.dataset.engagementNationalClubEdit || "");
    });
    elements.engagementsNationalClubForm?.addEventListener("submit", saveEngagementNationalClub);
    elements.engagementsNationalClubClose?.addEventListener("click", closeEngagementNationalClubDialog);
    elements.engagementsNationalClubCancel?.addEventListener("click", closeEngagementNationalClubDialog);
    elements.engagementsNationalClubDelete?.addEventListener("click", deleteEngagementNationalClub);
    elements.engagementsNationalAccountsList?.addEventListener("click", (event) => {
      const decisionButton = event.target.closest("[data-access-deletion-decision]");
      if (!decisionButton) return;
      resolveAccessDeletionRequest(
        decisionButton.dataset.accessDeletionRequestId,
        decisionButton.dataset.accessDeletionDecision,
        elements.engagementsNationalAccountsStatus
      );
    });
    elements.engagementsNationalAuditRefresh?.addEventListener("click", () => loadEngagementNationalAuditLogs({ force: true }));
    elements.engagementsNationalAuditSearch?.addEventListener("input", renderEngagementNationalAuditLogs);
    elements.engagementsNationalAuditPeriod?.addEventListener("change", () => loadEngagementNationalAuditLogs({ force: true }));
    elements.engagementsNationalAuditClub?.addEventListener("change", () => loadEngagementNationalAuditLogs({ force: true }));
    elements.engagementsNationalAuditActorSearch?.addEventListener("input", handleEngagementNationalAuditActorSearch);
    elements.engagementsNationalAuditType?.addEventListener("change", renderEngagementNationalAuditLogs);
    elements.engagementsNationalAuditOrigin?.addEventListener("change", renderEngagementNationalAuditLogs);
    elements.engagementsNationalAuditReset?.addEventListener("click", resetEngagementNationalAuditFilters);
    elements.engagementsNationalAuditLoadMore?.addEventListener("click", () => loadEngagementNationalAuditLogs({ append: true }));
    elements.engagementsNationalSwimmersList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-national-swimmer-action]");
      if (!button) return;
      const action = button.dataset.engagementNationalSwimmerAction;
      const swimmerId = button.dataset.engagementNationalSwimmerId || "";
      const swimmerSource = button.dataset.engagementNationalSwimmerSource || "engagement";
      const swimmerKey = `${swimmerSource}:${swimmerId}`;
      if (action === "edit") {
        const swimmer = engagementNationalSwimmers.find((item) =>
          (item.source || "performances") === swimmerSource && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
        );
        if (swimmer) openEngagementSwimmerCorrectionDialog(swimmer, "direct", button);
      } else if (action === "disable" || action === "enable") {
        setEngagementNationalSwimmerStatus(swimmerId, action === "enable");
      } else if (action === "delete") {
        deleteEngagementNationalSwimmer(swimmerId);
      } else if (action === "repair-publication") {
        repairEngagementNationalSwimmerMergePublication(swimmerId, swimmerSource);
      } else if (action === "merge") {
        engagementNationalSwimmerMergeSourceId = engagementNationalSwimmerMergeSourceId === swimmerKey ? "" : swimmerKey;
        engagementNationalSwimmerMergeTargets = [];
        const source = engagementNationalSwimmers.find((item) =>
          (item.source || "performances") === swimmerSource && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
        ) || {};
        engagementNationalSwimmerMergeQuery = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.licenseNumber || "";
        renderEngagementNationalSwimmers();
        searchEngagementNationalSwimmerMergeTargets(swimmerId, swimmerSource);
      } else if (action === "cancel-merge") {
        resetEngagementNationalSwimmerMergeState();
        renderEngagementNationalSwimmers();
      } else if (action === "search-merge") {
        searchEngagementNationalSwimmerMergeTargets(swimmerId, swimmerSource);
      } else if (action === "confirm-merge") {
        const card = button.closest("[data-engagement-national-swimmer-key]");
        const targetValue = card?.querySelector("[data-engagement-national-swimmer-merge-target]")?.value || "";
        mergeEngagementNationalSwimmer(swimmerId, swimmerSource, targetValue);
      }
    });
    elements.engagementsNationalSwimmersList?.addEventListener("change", (event) => {
      const keep = event.target.closest("[data-engagement-national-swimmer-keep]");
      const merge = event.target.closest("[data-engagement-national-swimmer-merge-check]");
      if (keep?.checked) {
        const duplicateMerge = Array.from(elements.engagementsNationalSwimmersList?.querySelectorAll("[data-engagement-national-swimmer-merge-check]") || [])
          .find((item) => item.value === keep.value);
        if (duplicateMerge) duplicateMerge.checked = false;
      }
      if (merge?.checked) {
        const currentKeep = selectedEngagementNationalSwimmerKeepKey();
        if (currentKeep && currentKeep === merge.value) merge.checked = false;
      }
      updateEngagementNationalSwimmerSelectionState();
    });
    elements.engagementsNationalSwimmersSearch?.addEventListener("input", () => {
      engagementNationalSwimmersLoaded = false;
      if (!String(elements.engagementsNationalSwimmersSearch?.value || "").trim()) resetEngagementNationalSwimmerFilters();
    });
    elements.engagementsNationalSwimmersSearch?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadEngagementNationalSwimmers({ force: true });
      }
    });
    elements.engagementsNationalSwimmersStatusFilter?.addEventListener("change", renderEngagementNationalSwimmers);
    elements.engagementsNationalSwimmersReset?.addEventListener("click", resetEngagementNationalSwimmerFilters);
    elements.engagementsNationalSwimmersMergeMode?.addEventListener("click", () => {
      setEngagementNationalSwimmerMergeMode(!engagementNationalSwimmerMergeMode);
    });
    elements.engagementsNationalSwimmersBulkMerge?.addEventListener("click", mergeSelectedEngagementNationalSwimmers);
    elements.engagementsSwimmerChangeRequestsList?.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-engagement-swimmer-change-edit]");
      if (editButton) {
        openEngagementSwimmerChangeRequestReview(
          editButton.dataset.engagementSwimmerChangeEdit || "",
          editButton,
          editButton.closest("[data-engagement-swimmer-change-request]")
        );
        return;
      }
      const button = event.target.closest("[data-engagement-swimmer-change-decision]");
      if (!button) return;
      resolveEngagementSwimmerChangeRequest(
        button.dataset.engagementSwimmerChangeRequestId || "",
        button.dataset.engagementSwimmerChangeDecision || "",
        button.closest("[data-engagement-swimmer-change-request]")
      );
    });
    elements.engagementsNationalPeopleRefresh?.addEventListener("click", () => loadEngagementNationalPeople({ force: true }));
    elements.engagementsNationalPeopleList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-national-person-action]");
      if (!button) return;
      const action = button.dataset.engagementNationalPersonAction;
      const personId = button.dataset.engagementNationalPersonId || "";
      if (action === "disable" || action === "enable") {
        setEngagementNationalPersonStatus(personId, action === "enable");
      } else if (action === "delete") {
        deleteEngagementNationalPerson(personId);
      } else if (action === "merge") {
        engagementNationalPersonMergeSourceId = engagementNationalPersonMergeSourceId === personId ? "" : personId;
        renderEngagementNationalPeople();
      } else if (action === "cancel-merge") {
        engagementNationalPersonMergeSourceId = "";
        renderEngagementNationalPeople();
      } else if (action === "confirm-merge") {
        const card = button.closest("[data-engagement-national-person-id]");
        const targetId = card?.querySelector("[data-engagement-national-person-merge-target]")?.value || "";
        mergeEngagementNationalPerson(personId, targetId);
      }
    });
    elements.engagementsNationalPeopleList?.addEventListener("change", (event) => {
      const keep = event.target.closest("[data-engagement-national-person-keep]");
      const merge = event.target.closest("[data-engagement-national-person-merge-check]");
      if (keep?.checked) {
        const duplicateMerge = Array.from(elements.engagementsNationalPeopleList?.querySelectorAll("[data-engagement-national-person-merge-check]") || [])
          .find((item) => item.value === keep.value);
        if (duplicateMerge) duplicateMerge.checked = false;
      }
      if (merge?.checked) {
        const currentKeep = selectedEngagementNationalPersonKeepId();
        if (currentKeep && currentKeep === merge.value) merge.checked = false;
      }
      updateEngagementNationalPeopleSelectionState();
    });
    elements.engagementsNationalPeopleSearch?.addEventListener("input", renderEngagementNationalPeople);
    elements.engagementsNationalPeopleStatusFilter?.addEventListener("change", renderEngagementNationalPeople);
    elements.engagementsNationalPeopleReset?.addEventListener("click", resetEngagementNationalPeopleFilters);
    elements.engagementsNationalPeopleMergeMode?.addEventListener("click", () => {
      setEngagementNationalPeopleMergeMode(!engagementNationalPeopleMergeMode);
    });
    elements.engagementsNationalPeopleBulkMerge?.addEventListener("click", mergeSelectedEngagementNationalPeople);
    elements.engagementsClubSwimmersDirectorySearch?.addEventListener("input", renderEngagementClubSwimmersDirectory);
    elements.engagementsClubSwimmersDirectorySearchClear?.addEventListener("click", () => {
      if (!elements.engagementsClubSwimmersDirectorySearch) return;
      elements.engagementsClubSwimmersDirectorySearch.value = "";
      renderEngagementClubSwimmersDirectory();
      elements.engagementsClubSwimmersDirectorySearch.focus();
    });
    elements.engagementsClubSwimmersDirectorySexFilter?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-club-swimmer-sex-filter]");
      if (!button) return;
      const requestedFilter = button.dataset.engagementClubSwimmerSexFilter || "all";
      engagementClubSwimmersDirectorySexFilter = requestedFilter === "F" || requestedFilter === "M" ? requestedFilter : "all";
      renderEngagementClubSwimmersDirectory();
    });
    elements.engagementsClubSwimmersDirectorySearch?.form?.addEventListener("submit", (event) => event.preventDefault());
    elements.engagementsClubSwimmersDirectoryList?.addEventListener("click", (event) => {
      const inactiveToggle = event.target.closest("[data-engagement-club-directory-inactive-toggle]");
      if (inactiveToggle) {
        const scrollContainer = inactiveToggle.closest(".admin-engagements-club-swimmers-directory-table");
        const scrollTop = scrollContainer?.scrollTop || 0;
        engagementClubInactiveSwimmersDirectoryExpanded = inactiveToggle.getAttribute("aria-expanded") !== "true";
        inactiveToggle.setAttribute("aria-expanded", String(engagementClubInactiveSwimmersDirectoryExpanded));
        elements.engagementsClubSwimmersDirectoryList
          .querySelectorAll('[data-activity-status="inactive"]')
          .forEach((row) => { row.hidden = !engagementClubInactiveSwimmersDirectoryExpanded; });
        if (scrollContainer) scrollContainer.scrollTop = scrollTop;
        return;
      }
      const activityButton = event.target.closest("[data-engagement-club-swimmer-activity]");
      if (activityButton) {
        void setEngagementClubSwimmerActivityStatus(
          activityButton.dataset.engagementClubSwimmerActivity || "",
          activityButton.dataset.engagementClubSwimmerActivitySource || "performances",
          activityButton.dataset.engagementClubSwimmerActivityStatus || "active",
          activityButton.dataset.engagementClubSwimmerActivityName || "ce nageur",
          activityButton.dataset.engagementClubSwimmerActivitySex || ""
        );
        return;
      }
      const changeButton = event.target.closest("[data-engagement-club-swimmer-change]");
      if (changeButton) {
        const swimmerId = changeButton.dataset.engagementClubSwimmerChange || "";
        const source = changeButton.dataset.engagementClubSwimmerChangeSource || "performances";
        const swimmer = engagementClubSwimmers.find((item) =>
          (item.source || "performances") === source && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
        );
        if (swimmer) openEngagementSwimmerCorrectionDialog(swimmer, "request", changeButton);
        return;
      }
      const deleteButton = event.target.closest("[data-engagement-club-swimmer-delete]");
      if (deleteButton) {
        requestEngagementClubSwimmerDeletion(
          deleteButton.dataset.engagementClubSwimmerDelete || "",
          deleteButton.dataset.engagementClubSwimmerDeleteName || "ce nageur"
        );
        return;
      }
      const profileButton = event.target.closest("[data-engagement-club-swimmer-public-profile]");
      if (profileButton) {
        const name = profileButton.dataset.engagementClubSwimmerPublicName || "ce nageur";
        const profileUrl = profileButton.dataset.engagementClubSwimmerPublicProfile || "";
        if (profileUrl && global.confirm(`Ouvrir la fiche publique de ${name} dans un nouvel onglet ?`)) {
          global.open(profileUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }
      const button = event.target.closest("[data-engagement-club-swimmer-directory-toggle]");
      if (!button) return;
      const row = button.closest(".admin-engagements-club-swimmers-directory-row");
      const expanded = button.getAttribute("aria-expanded") === "true";
      if (!expanded) {
        elements.engagementsClubSwimmersDirectoryList.querySelectorAll("[data-engagement-club-swimmer-directory-toggle][aria-expanded=\"true\"]")
          .forEach((openButton) => {
            openButton.setAttribute("aria-expanded", "false");
            const openRow = openButton.closest(".admin-engagements-club-swimmers-directory-row");
            if (openRow) openRow.dataset.expanded = "false";
          });
      }
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      if (row) row.dataset.expanded = expanded ? "false" : "true";
    });
    elements.engagementsSwimmerCorrectionForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitEngagementSwimmerCorrection();
    });
    elements.engagementsSwimmerCorrectionClose?.addEventListener("click", closeEngagementSwimmerCorrectionDialog);
    elements.engagementsSwimmerCorrectionCancel?.addEventListener("click", closeEngagementSwimmerCorrectionDialog);
    elements.engagementsSwimmerCorrectionDialog?.addEventListener("close", () => {
      resetEngagementSwimmerCorrectionDialog();
      engagementSwimmerCorrectionReview = null;
      const opener = engagementSwimmerCorrectionOpener;
      engagementSwimmerCorrectionOpener = null;
      opener?.focus?.();
    });
    elements.engagementsSwimmerCorrectionDialog?.addEventListener("click", (event) => {
      if (event.target === elements.engagementsSwimmerCorrectionDialog) closeEngagementSwimmerCorrectionDialog();
    });
    elements.engagementsSwimmerCorrectionLastName?.addEventListener("input", (event) => {
      const start = event.target.selectionStart;
      const end = event.target.selectionEnd;
      event.target.value = event.target.value.toUpperCase();
      if (Number.isInteger(start) && Number.isInteger(end)) event.target.setSelectionRange(start, end);
    });
    elements.engagementsClubPeopleAddButton?.addEventListener("click", () => openEngagementClubPersonForm());
    elements.engagementsClubPersonSwimmerSearch?.addEventListener("input", () => {
      applyEngagementClubPersonSwimmer("");
      renderEngagementClubPersonSwimmerOptions();
      if (elements.engagementsClubPersonMessage) elements.engagementsClubPersonMessage.textContent = "";
    });
    elements.engagementsClubPersonSwimmerSearch?.addEventListener("focus", renderEngagementClubPersonSwimmerOptions);
    elements.engagementsClubPersonSwimmerSearch?.addEventListener("keydown", (event) => {
      const firstResult = elements.engagementsClubPersonSwimmerResults?.querySelector("button:not(:disabled)");
      if (event.key === "ArrowDown" && firstResult) {
        event.preventDefault();
        firstResult.focus();
      } else if (event.key === "Enter" && firstResult && !elements.engagementsClubPersonSwimmerResults.hidden) {
        event.preventDefault();
        firstResult.click();
      } else if (event.key === "Escape" && elements.engagementsClubPersonSwimmerResults) {
        elements.engagementsClubPersonSwimmerResults.hidden = true;
        elements.engagementsClubPersonSwimmerSearch.setAttribute("aria-expanded", "false");
      }
    });
    elements.engagementsClubPersonSwimmerResults?.addEventListener("click", (event) => {
      const result = event.target.closest("[data-engagement-club-person-swimmer-result]");
      if (!result) return;
      applyEngagementClubPersonSwimmer(result.dataset.engagementClubPersonSwimmerResult);
      if (elements.engagementsClubPersonMessage) elements.engagementsClubPersonMessage.textContent = "";
    });
    elements.engagementsClubPersonLicense?.addEventListener("input", (event) => {
      event.currentTarget.value = formatEngagementSwimmerLicense(event.currentTarget.value);
    });
    elements.engagementsClubPersonLastName?.addEventListener("input", (event) => {
      event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
    });
    elements.engagementsClubPersonCancel?.addEventListener("click", () => {
      resetEngagementClubPersonForm();
      if (elements.engagementsClubPersonForm) elements.engagementsClubPersonForm.hidden = true;
    });
    elements.engagementsClubPersonForm?.addEventListener("submit", saveEngagementClubPerson);
    elements.engagementsClubPeopleList?.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-engagement-club-person-directory-toggle]");
      if (toggle) {
        const row = toggle.closest(".admin-engagements-club-person-row");
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        if (!expanded) {
          elements.engagementsClubPeopleList.querySelectorAll('[data-engagement-club-person-directory-toggle][aria-expanded="true"]')
            .forEach((openToggle) => {
              openToggle.setAttribute("aria-expanded", "false");
              const openRow = openToggle.closest(".admin-engagements-club-person-row");
              if (openRow) openRow.dataset.expanded = "false";
            });
        }
        toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        if (row) row.dataset.expanded = expanded ? "false" : "true";
        return;
      }
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
    elements.engagementsOpenWaterCourseAdd?.addEventListener("click", addEngagementOpenWaterCourse);
    elements.engagementsOpenWaterCourseList?.addEventListener("click", (event) => {
      const selectButton = event.target.closest("[data-open-water-course-select]");
      if (selectButton) {
        addEngagementOpenWaterCourseToProgram(selectButton.dataset.openWaterCourseSelect || "");
        return;
      }
      const statusButton = event.target.closest("[data-open-water-course-id]");
      if (statusButton) void setEngagementOpenWaterCourseStatus(statusButton);
    });
    elements.engagementsEventsForm?.addEventListener("change", (event) => {
      const control = event.target.closest?.("[data-engagement-category-column]");
      if (control) applyEngagementCategoryColumnControl(control);
    });
    elements.engagementsEventsForm?.addEventListener("input", updateEngagementEventsSummaryFromForm);
    elements.engagementsEventsForm?.addEventListener("change", (event) => {
      updateEngagementEventsSummaryFromForm(event);
      const eventInput = event.target.closest?.("[data-engagement-event-code]");
      if (eventInput && !eventInput.checked && engagementCompetitionType(selectedEngagementCompetition) === "openWater") {
        const preservedEvents = selectedEngagementEventsFromForm();
        const preservedSessions = selectedEngagementProgramSessionsFromForm();
        renderEngagementEvents({ ...selectedEngagementCompetition, events: preservedEvents, programSessions: preservedSessions });
      }
    });
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
    elements.engagementsDeadline?.addEventListener("change", () => normalizeEngagementDeadlineField(elements.engagementsDeadline));
    elements.engagementsEditDeadline?.addEventListener("change", () => normalizeEngagementDeadlineField(elements.engagementsEditDeadline));
    elements.engagementsFeesForm?.addEventListener("submit", saveEngagementCompetitionDetail);
    elements.engagementsNoFees?.addEventListener("change", () => {
      updateEngagementFeesFormMode(isEngagementAdminMode() && engagementDetailEditing && canEditEngagementCompetition());
    });
    elements.engagementsFeesForm?.addEventListener("input", () => markEngagementDetailTabDirty("fees"));
    elements.engagementsFeesForm?.addEventListener("change", () => markEngagementDetailTabDirty("fees"));
    elements.engagementsClubTeamForm?.addEventListener("submit", saveEngagementClubTeamLeader);
    elements.engagementsClubTeamRenunciationButton?.addEventListener("click", openEngagementClubTeamRenunciationDialog);
    elements.engagementsClubTeamRenunciationDialogForm?.addEventListener("submit", selectEngagementClubTeamRenunciation);
    elements.engagementsClubTeamRenunciationDialogClose?.addEventListener("click", closeEngagementClubTeamRenunciationDialog);
    elements.engagementsClubTeamRenunciationDialogCancel?.addEventListener("click", closeEngagementClubTeamRenunciationDialog);
    elements.engagementsClubTeamRenunciationDialog?.addEventListener("cancel", restoreEngagementClubTeamLeaderChoice);
    elements.engagementsClubTeamModifyButton?.addEventListener("click", async () => {
      engagementClubTeamEditing = true;
      updateEngagementClubTeamLeaderActions();
      restoreEngagementClubTeamLeaderChoice();
      const teamLeader = selectedEngagementClubEntry?.teamLeader || {};
      if (teamLeader.mode === "person" && !teamLeader.externalClub) {
        await Promise.all([
          loadEngagementClubPeople({ silent: true }),
          loadEngagementClubSwimmers({ silent: true })
        ]);
        renderEngagementClubTeamPersonOptions(teamLeader.personId || "");
        elements.engagementsClubTeamPersonSearch?.focus();
      } else if (teamLeader.externalClub) {
        elements.engagementsClubTeamExternalOpen?.focus();
      } else {
        elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.focus();
      }
    });
    elements.engagementsClubTeamRemoveButton?.addEventListener("click", removeEngagementClubTeamLeader);
    elements.engagementsClubTeamExternalOpen?.addEventListener("click", () => {
      const currentTeamLeader = selectedEngagementClubEntry?.teamLeader || {};
      const editingCurrentExternal = currentTeamLeader.mode === "person" && currentTeamLeader.externalClub === true;
      engagementClubTeamEditing = true;
      elements.engagementsClubTeamForm?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
        .forEach((radio) => { radio.checked = false; });
      if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.checked = false;
      if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = true;
      if (!editingCurrentExternal) {
        [
          elements.engagementsClubTeamFirstName,
          elements.engagementsClubTeamLastName,
          elements.engagementsClubTeamBirthDate,
          elements.engagementsClubTeamSex,
          elements.engagementsClubTeamLicense,
          elements.engagementsClubTeamExternalClubId,
          elements.engagementsClubTeamExternalClubName
        ].forEach((field) => { if (field) field.value = ""; });
      }
      updateEngagementClubTeamFormMode();
      openEngagementClubExternalTeamDialog();
    });
    elements.engagementsClubTeamForm?.addEventListener("change", async (event) => {
      const changedMode = event.target?.matches?.('input[name="adminEngagementsClubTeamMode"]')
        ? event.target.value
        : "";
      if (changedMode === "renounced") {
        return;
      }
      if (changedMode === "person" && elements.engagementsClubTeamRenunciation) {
        elements.engagementsClubTeamRenunciation.checked = false;
        if (elements.engagementsClubTeamExternal) elements.engagementsClubTeamExternal.checked = false;
      }
      if (event.target === elements.engagementsClubTeamExternal && event.target.checked) {
        if (elements.engagementsClubTeamPersonSelect) elements.engagementsClubTeamPersonSelect.value = "";
        if (elements.engagementsClubTeamPersonSearch) elements.engagementsClubTeamPersonSearch.value = "";
        [
          elements.engagementsClubTeamFirstName,
          elements.engagementsClubTeamLastName,
          elements.engagementsClubTeamBirthDate,
          elements.engagementsClubTeamSex,
          elements.engagementsClubTeamLicense,
          elements.engagementsClubTeamExternalClubId,
          elements.engagementsClubTeamExternalClubName
        ].forEach((field) => {
          if (field) field.value = "";
        });
        setEngagementClubTeamManualFieldsVisible(true);
      }
      updateEngagementClubTeamFormMode();
      if (event.target === elements.engagementsClubTeamExternal && event.target.checked) {
        openEngagementClubExternalTeamDialog();
      }
      if (changedMode === "person") {
        await Promise.all([
          loadEngagementClubPeople({ silent: true }),
          loadEngagementClubSwimmers({ silent: true })
        ]);
        setEngagementClubTeamManualFieldsVisible(false);
        renderEngagementClubTeamPersonOptions("");
        elements.engagementsClubTeamPersonSearch?.focus();
      }
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    });
    elements.engagementsClubTeamPersonSearch?.addEventListener("input", () => {
      if (elements.engagementsClubTeamPersonSelect) elements.engagementsClubTeamPersonSelect.value = "";
      setEngagementClubTeamManualFieldsVisible(false);
      applyEngagementClubTeamPerson("");
      renderEngagementClubTeamPersonOptions("");
      updateEngagementClubTeamFormMode();
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    });
    elements.engagementsClubTeamPersonSelect?.addEventListener("change", async () => {
      const radio = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="person"]');
      if (radio) radio.checked = true;
      if (elements.engagementsClubTeamRenunciation) elements.engagementsClubTeamRenunciation.checked = false;
      updateEngagementClubTeamFormMode();
      const selectionId = elements.engagementsClubTeamPersonSelect.value;
      let person = engagementClubTeamLeaderPeople().find((candidate) => (candidate.selectionId || candidate.id) === selectionId) || null;
      let selectionFailed = false;
      try {
        person = await confirmEngagementClubTeamLeaderCandidate(person || {});
      } catch (error) {
        if (elements.engagementsClubTeamMessage) {
          elements.engagementsClubTeamMessage.textContent = `Ajout du chef d'équipe impossible : ${error?.message || error}`;
          elements.engagementsClubTeamMessage.dataset.tone = "error";
        }
        person = null;
        selectionFailed = true;
      }
      const personId = person?.id || "";
      if (!personId) {
        elements.engagementsClubTeamPersonSelect.value = "";
        applyEngagementClubTeamPerson("");
        if (!selectionFailed && elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
        return;
      }
      renderEngagementClubTeamPersonOptions(personId);
      elements.engagementsClubTeamPersonSelect.value = personId;
      applyEngagementClubTeamPerson(personId);
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
      if (personId) {
        const saved = await saveEngagementClubTeamLeader();
        if (saved && person) {
          engagementClubPeople = engagementClubPeople.map((candidate) => candidate.id === person.id
            ? { ...candidate, roles: { ...candidate.roles, teamLeader: true } }
            : candidate);
          renderEngagementClubTeamPersonOptions(person.id);
        }
        if (!saved && elements.engagementsClubTeamSaveButton) elements.engagementsClubTeamSaveButton.hidden = false;
      }
    });
    elements.engagementsClubTeamPersonResults?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-club-team-person-result]");
      const personId = button?.dataset.engagementClubTeamPersonResult || "";
      if (!personId || !elements.engagementsClubTeamPersonSelect) return;
      elements.engagementsClubTeamPersonSelect.value = personId;
      elements.engagementsClubTeamPersonSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    elements.engagementsClubTeamPersonCreate?.addEventListener("click", () => {
      const radio = elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="person"]');
      if (radio) radio.checked = true;
      if (elements.engagementsClubTeamPersonSelect) elements.engagementsClubTeamPersonSelect.value = "";
      setEngagementClubTeamManualFieldsVisible(true);
      applyEngagementClubTeamPerson("");
      elements.engagementsClubTeamFirstName?.focus();
    });
    elements.engagementsClubTeamExternalDialogForm?.addEventListener("submit", saveEngagementClubExternalTeamLeader);
    elements.engagementsClubTeamExternalDialogClose?.addEventListener("click", () => closeEngagementClubExternalTeamDialog({ reset: true }));
    elements.engagementsClubTeamExternalDialogCancel?.addEventListener("click", () => closeEngagementClubExternalTeamDialog({ reset: true }));
    elements.engagementsClubTeamExternalDialog?.addEventListener("cancel", () => {
      restoreEngagementClubTeamLeaderChoice();
    });
    elements.engagementsClubTeamForm?.addEventListener("input", (event) => {
      if (
        elements.engagementsClubTeamPersonSelect &&
        [
          elements.engagementsClubTeamFirstName,
          elements.engagementsClubTeamLastName,
          elements.engagementsClubTeamBirthDate,
          elements.engagementsClubTeamSex,
          elements.engagementsClubTeamLicense
        ].includes(event.target)
      ) {
        const selectedPerson = engagementClubPeople.find((person) => person.id === elements.engagementsClubTeamPersonSelect.value);
        if (!selectedPerson || (selectedPerson.birthDate && selectedPerson.sex)) {
          elements.engagementsClubTeamPersonSelect.value = "";
        }
        updateEngagementClubTeamFormMode();
      }
      if (elements.engagementsClubTeamMessage) elements.engagementsClubTeamMessage.textContent = "";
    });
    elements.engagementsClubTeamLicense?.addEventListener("input", (event) => {
      event.currentTarget.value = formatEngagementSwimmerLicense(event.currentTarget.value);
    });
    elements.engagementsClubTeamLastName?.addEventListener("input", (event) => {
      event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
    });
    elements.engagementsClubOfficialsForm?.addEventListener("submit", saveEngagementClubOfficials);
    elements.engagementsClubOfficialsList?.addEventListener("change", handleEngagementClubOfficialSelection);
    elements.engagementsClubSelectedOfficialsList?.addEventListener("change", handleEngagementClubOfficialSelection);
    elements.engagementsClubOfficialsSearch?.addEventListener("input", renderEngagementClubOfficials);
    elements.engagementsClubSwimmersForm?.addEventListener("submit", (event) => event.preventDefault());
    elements.engagementsClubEntriesForm?.addEventListener("submit", (event) => event.preventDefault());
    elements.engagementsClubSummaryPdfButton?.addEventListener("click", downloadEngagementClubSummaryPdf);
    elements.engagementsGenerateTxtExportButton?.addEventListener("click", generateEngagementAdminTxtExport);
    elements.engagementsDocumentAddButton?.addEventListener("click", () => openEngagementCompetitionDocumentForm());
    elements.engagementsDocumentFiles?.addEventListener("change", handleEngagementCompetitionDocumentFiles);
    elements.engagementsDocumentForm?.addEventListener("submit", saveEngagementCompetitionDocuments);
    elements.engagementsDocumentCancelButton?.addEventListener("click", closeEngagementCompetitionDocumentForm);
    elements.engagementsSharedDocumentsList?.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-engagement-document-edit]");
      if (editButton) {
        openEngagementCompetitionDocumentForm(editButton.dataset.engagementDocumentEdit);
        return;
      }
      const deleteButton = event.target.closest("[data-engagement-document-delete]");
      if (deleteButton) void deleteEngagementCompetitionDocument(deleteButton.dataset.engagementDocumentDelete);
    });
    elements.engagementsClubPdfSelect?.addEventListener("change", renderEngagementClubRecapSelector);
    elements.engagementsClubPdfDownloadButton?.addEventListener("click", () => downloadEngagementAdminClubRecapPdf(elements.engagementsClubPdfSelect?.value));
    elements.engagementsStatisticsRefreshButton?.addEventListener("click", () => loadEngagementCompetitionStatistics({ force: true }));
    elements.engagementsStatisticsEventSelect?.addEventListener("change", renderEngagementCompetitionStatistics);
    elements.engagementsPrepareOpeningEmailsButton?.addEventListener("click", prepareEngagementOpeningEmails);
    elements.engagementsGenerateClubRecapsButton?.addEventListener("click", generateEngagementAdminClubRecapPdfs);
    elements.engagementsPrepareClubRecapEmailsButton?.addEventListener("click", prepareEngagementClubRecapEmails);
    elements.engagementsSendOpeningEmailsButton?.addEventListener("click", () => sendEngagementPreparedEmails("opening_notification"));
    elements.engagementsSendClubRecapEmailsButton?.addEventListener("click", () => sendEngagementPreparedEmails("club_recap_pdf"));
    elements.engagementsClubRecapFiles?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-admin-club-pdf]");
      if (!button) return;
      downloadEngagementAdminClubRecapPdf(button.dataset.engagementAdminClubPdf);
    });
    elements.engagementsClubRelaysAddButton?.addEventListener("click", () => {
      const relayEvents = engagementClubRelayEvents();
      if (!relayEvents.length) return;
      openEngagementClubRelayDialog("", elements.engagementsClubRelaysAddButton);
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubSwimmersSearch?.addEventListener("input", () => {
      renderEngagementClubSwimmers();
    });
    elements.engagementsClubNewSwimmerLicense?.addEventListener("input", (event) => {
      event.currentTarget.value = formatEngagementSwimmerLicense(event.currentTarget.value);
      engagementClubSwimmerRecovery = null;
      if (elements.engagementsClubRecoverSwimmerButton) elements.engagementsClubRecoverSwimmerButton.hidden = true;
    });
    elements.engagementsClubNewSwimmerLastName?.addEventListener("input", (event) => {
      event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
    });
    elements.engagementsClubNewSwimmerResetButton?.addEventListener("click", resetEngagementClubNewSwimmerFormFromButton);
    elements.engagementsClubNewSwimmerSaveButton?.addEventListener("click", createEngagementClubSwimmer);
    elements.engagementsClubRecoverSwimmerButton?.addEventListener("click", recoverEngagementClubSwimmer);
    elements.engagementsClubNewSwimmerDialogOpen?.addEventListener("click", openEngagementClubNewSwimmerDialog);
    elements.engagementsClubNewSwimmerDialog?.addEventListener("click", (event) => {
      const dialog = elements.engagementsClubNewSwimmerDialog;
      const bounds = dialog.getBoundingClientRect();
      const clickedBackdrop = event.target === dialog && (
        event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
      );
      if (event.target.closest("[data-engagement-club-new-swimmer-dialog-close]") || clickedBackdrop) {
        closeEngagementClubNewSwimmerDialog();
      }
    });
    elements.engagementsClubNewSwimmerDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEngagementClubNewSwimmerDialog();
    });
    elements.engagementsClubSwimmersForm?.addEventListener("click", (event) => {
      const inactiveToggle = event.target.closest("[data-engagement-club-inactive-swimmers-toggle]");
      if (inactiveToggle) {
        engagementClubInactiveSwimmersExpanded = inactiveToggle.getAttribute("aria-expanded") !== "true";
        renderEngagementClubSwimmers();
        return;
      }
      const sexFilterButton = event.target.closest("[data-engagement-club-available-swimmer-sex-filter]");
      if (sexFilterButton) {
        const requestedFilter = sexFilterButton.dataset.engagementClubAvailableSwimmerSexFilter || "all";
        engagementClubAvailableSwimmersSexFilter = requestedFilter === "F" || requestedFilter === "M" ? requestedFilter : "all";
        renderEngagementClubSwimmers();
        return;
      }
      const button = event.target.closest("[data-engagement-club-swimmer-details-toggle]");
      if (!button) return;
      const row = button.closest("[data-engagement-club-swimmer-row]");
      const open = button.getAttribute("aria-expanded") !== "true";
      elements.engagementsClubSwimmersForm.querySelectorAll('[data-engagement-club-swimmer-row][data-expanded="true"]')
        .forEach((candidate) => {
          if (candidate !== row) setEngagementClubSwimmerRowExpanded(candidate, false);
        });
      setEngagementClubSwimmerRowExpanded(row, open);
    });
    elements.engagementsClubSwimmersForm?.addEventListener("change", (event) => {
      const row = event.target.closest("[data-engagement-club-swimmer-row]");
      if (!row) return;
      const checkbox = row?.querySelector("[data-engagement-club-swimmer-id]");
      const license = row?.querySelector("[data-engagement-club-swimmer-license]");
      const selectionChanged = event.target.matches("[data-engagement-club-swimmer-id]");
      if (selectionChanged && checkbox?.checked) {
        const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
        const swimmer = engagementClubSwimmers.find((candidate) => String(candidate.id || candidate.swimmerIndexId) === swimmerIndexId) || {
          id: swimmerIndexId,
          swimmerIndexId,
          licenseNumber: license?.value || license?.dataset.engagementClubSwimmerLicense || ""
        };
        const conflict = engagementClubMemberRoleConflict(swimmer, "swimmer");
        if (conflict) {
          checkbox.checked = false;
          row.dataset.selected = "false";
          global.alert(conflict);
          if (elements.engagementsClubSwimmersMessage) {
            elements.engagementsClubSwimmersMessage.textContent = conflict;
            elements.engagementsClubSwimmersMessage.dataset.tone = "error";
          }
          return;
        }
      }
      if (selectionChanged && checkbox && !checkbox.checked) {
        const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
        const savedSwimmer = (selectedEngagementClubEntry?.swimmers || [])
          .find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
        const currentEntries = selectedEngagementClubEntryRowsBySwimmerId().get(swimmerIndexId) || savedSwimmer.individualEntries || [];
        if (currentEntries.length) {
          const swimmerName = checkbox.dataset.engagementClubSwimmerName || "ce nageur";
          const confirmed = global.confirm(
            `Retirer ${swimmerName} supprimera aussi ${currentEntries.length} engagement${currentEntries.length > 1 ? "s" : ""} sur les courses individuelles. Confirmer cette suppression ?`
          );
          if (!confirmed) {
            checkbox.checked = true;
            if (row) row.dataset.selected = "true";
            return;
          }
        }
      }
      if (event.target.matches("input[data-engagement-club-swimmer-license]")) {
        event.target.value = String(event.target.value || "").trim().toUpperCase();
      }
      if (row && checkbox) {
        row.dataset.selected = checkbox.checked ? "true" : "false";
        if (license?.matches("input")) {
          license.required = checkbox.checked && ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE;
        }
      }
      if (selectionChanged) {
        const swimmerIndexId = checkbox?.dataset.engagementClubSwimmerId || "";
        if (checkbox?.checked !== true) discardPendingEngagementClubIndividualEntries(swimmerIndexId);
        const shouldExpandLicense = checkbox?.checked === true && Boolean(license?.matches("input") && license.value);
        const swimmers = selectedEngagementClubSwimmerRows();
        const changedSwimmer = swimmers.find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {
          swimmerIndexId,
          source: checkbox?.dataset.engagementClubSwimmerSource || "performances"
        };
        selectedEngagementClubEntry = {
          ...(selectedEngagementClubEntry || {}),
          swimmers
        };
        renderEngagementClubSwimmers();
        if (shouldExpandLicense && swimmerIndexId) {
          const nextCheckbox = Array.from(elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]") || [])
            .find((input) => input.dataset.engagementClubSwimmerId === swimmerIndexId);
          setEngagementClubSwimmerRowExpanded(nextCheckbox?.closest("[data-engagement-club-swimmer-row]"), true);
          nextCheckbox?.closest("[data-engagement-club-swimmer-row]")?.querySelector("[data-engagement-club-swimmer-license]")?.focus?.();
        }
        renderEngagementClubEntries();
        renderEngagementClubRelays();
        if (checkbox?.checked && changedSwimmer.licenseNumber && !ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(changedSwimmer.licenseNumber)) {
          if (elements.engagementsClubSwimmersMessage) {
            elements.engagementsClubSwimmersMessage.textContent = "La licence doit respecter le format A-12-34567 lorsqu'elle est renseignée.";
            elements.engagementsClubSwimmersMessage.dataset.tone = "error";
          }
          return;
        }
        void persistEngagementClubSwimmerSelection(changedSwimmer, checkbox?.checked === true);
        return;
      }
      const swimmers = selectedEngagementClubSwimmerRows();
      selectedEngagementClubEntry = { ...(selectedEngagementClubEntry || {}), swimmers };
      updateEngagementClubSwimmersSummary();
      renderEngagementClubEntries();
      renderEngagementClubRelays();
      const swimmerIndexId = checkbox?.dataset.engagementClubSwimmerId || "";
      const changedSwimmer = swimmers.find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId);
      if (event.target.matches("input[data-engagement-club-swimmer-license]") && checkbox?.checked && changedSwimmer && !engagementClubPersistedSwimmerIds.has(swimmerIndexId)) {
        if (changedSwimmer.licenseNumber && !ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(changedSwimmer.licenseNumber)) {
          if (elements.engagementsClubSwimmersMessage) {
            elements.engagementsClubSwimmersMessage.textContent = "La licence doit respecter le format A-12-34567.";
            elements.engagementsClubSwimmersMessage.dataset.tone = "error";
          }
          event.target.reportValidity?.();
          return;
        }
        void persistEngagementClubSwimmerSelection(changedSwimmer, true);
      } else if (elements.engagementsClubSwimmersMessage) {
        elements.engagementsClubSwimmersMessage.textContent = "";
        elements.engagementsClubSwimmersMessage.dataset.tone = "";
      }
    });
    elements.engagementsClubEntriesList?.addEventListener("change", (event) => {
      const row = event.target.closest("[data-engagement-club-entry-row]");
      let courseSelectionChanged = event.target.matches("[data-engagement-club-swimmer-event]");
      if (event.target.matches("[data-engagement-club-swimmer-event]") && event.target.checked) {
        const maxEvents = Number(selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
        const checkedEvents = Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked") || []);
        if (maxEvents > 0 && checkedEvents.length > maxEvents) {
          event.target.checked = false;
          courseSelectionChanged = false;
          if (elements.engagementsClubEntriesMessage) {
            elements.engagementsClubEntriesMessage.textContent = `Maximum ${maxEvents} course${maxEvents > 1 ? "s" : ""} individuelle${maxEvents > 1 ? "s" : ""} par nageur.`;
            elements.engagementsClubEntriesMessage.dataset.tone = "error";
          }
        }
      }
      if (event.target.matches("[data-engagement-club-swimmer-event]")) {
        const openWater = engagementCompetitionType(selectedEngagementCompetition) === "openWater";
        const eventCode = event.target.dataset.engagementClubSwimmerEvent || "";
        const choice = event.target.closest("[data-event-selected]");
        const timeValue = choice?.querySelector("[data-engagement-club-entry-cell-time]");
        const timeInput = Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event-time]") || [])
          .find((input) => input.dataset.engagementClubSwimmerEventTime === eventCode);
        const checked = event.target.checked;
        if (timeValue && !openWater) {
          timeValue.hidden = !checked;
          if (checked && !timeValue.textContent.trim()) {
            timeValue.textContent = "Calcul...";
            timeValue.dataset.entryTimeMode = "pending";
          }
        }
        if (timeInput && !checked) {
          timeInput.value = "";
          timeInput.disabled = true;
        }
        updateEngagementClubEntryRowCount(row);
      }
      if (courseSelectionChanged) {
        const swimmerIndexId = row?.dataset.engagementClubEntrySwimmerId || "";
        const swimmers = selectedEngagementClubSwimmerRows();
        const swimmer = swimmers.find((item) => item.swimmerIndexId === swimmerIndexId);
        selectedEngagementClubEntry = { ...(selectedEngagementClubEntry || {}), swimmers };
        if (swimmer) {
          void persistEngagementClubIndividualEntries(swimmer);
        }
      }
      updateEngagementClubEntriesSummary();
      if (elements.engagementsClubEntriesMessage && !event.target.matches("[data-engagement-club-swimmer-event]")) {
        elements.engagementsClubEntriesMessage.textContent = "";
      }
    });
    elements.engagementsClubEntriesList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-club-times-open]");
      if (!button) return;
      void openEngagementClubTimesDialog(button.dataset.engagementClubTimesOpen || "", button);
      if (elements.engagementsClubEntriesMessage) elements.engagementsClubEntriesMessage.textContent = "";
    });
    elements.engagementsClubTimesDialogList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-engagement-club-time-toggle]");
      if (!button) return;
      const row = button.closest("[data-engagement-club-time-dialog-row]");
      const input = row?.querySelector("[data-engagement-club-time-dialog-input]");
      const display = row?.querySelector("[data-engagement-club-time-dialog-display]");
      const historySelect = row?.querySelector("[data-engagement-club-time-history-select]");
      const help = row?.querySelector("[data-engagement-club-time-dialog-help]");
      if (!input) return;
      if (input.disabled) {
        input.value = button.dataset.automaticTime || "59:59.99";
        input.hidden = false;
        input.disabled = false;
        button.textContent = "Rétablir auto";
        if (help) help.textContent = "Temps saisi manuellement";
        input.focus?.();
      } else {
        input.value = "";
        input.hidden = true;
        input.disabled = true;
        button.textContent = "Saisie libre";
        if (display) {
          display.textContent = display.dataset.automaticLabel || "59:59.99";
          display.dataset.entryTimeMode = "known";
        }
        if (historySelect) updateEngagementClubTimeDialogHelp(historySelect);
      }
      if (elements.engagementsClubTimesDialogMessage) {
        elements.engagementsClubTimesDialogMessage.textContent = "";
        elements.engagementsClubTimesDialogMessage.dataset.tone = "";
      }
    });
    elements.engagementsClubTimesDialogList?.addEventListener("input", (event) => {
      if (!event.target.matches("[data-engagement-club-time-dialog-input]")) return;
      event.target.setCustomValidity?.("");
      const help = event.target.closest("[data-engagement-club-time-dialog-row]")?.querySelector("[data-engagement-club-time-dialog-help]");
      if (help) help.textContent = "Temps saisi manuellement";
      if (elements.engagementsClubTimesDialogMessage) {
        elements.engagementsClubTimesDialogMessage.textContent = "";
        elements.engagementsClubTimesDialogMessage.dataset.tone = "";
      }
    });
    elements.engagementsClubTimesDialogList?.addEventListener("change", (event) => {
      if (event.target.matches("[data-engagement-club-time-history-select]")) {
        const row = event.target.closest("[data-engagement-club-time-dialog-row]");
        const input = row?.querySelector("[data-engagement-club-time-dialog-input]");
        const toggle = row?.querySelector("[data-engagement-club-time-toggle]");
        if (input) {
          input.value = event.target.value;
          input.hidden = true;
          input.disabled = true;
        }
        if (toggle) {
          toggle.textContent = "Saisie libre";
          toggle.dataset.automaticTime = event.target.value;
        }
        updateEngagementClubTimeDialogHelp(event.target);
        if (elements.engagementsClubTimesDialogMessage) {
          elements.engagementsClubTimesDialogMessage.textContent = "";
          elements.engagementsClubTimesDialogMessage.dataset.tone = "";
        }
        return;
      }
      if (!event.target.matches("[data-engagement-club-time-dialog-input]")) return;
      if (!normalizeEngagementEntryTimeInput(event.target)) event.target.reportValidity?.();
    });
    elements.engagementsClubTimesDialogApply?.addEventListener("click", applyEngagementClubTimesDialog);
    elements.engagementsClubTimesDialogClose?.addEventListener("click", closeEngagementClubTimesDialog);
    elements.engagementsClubTimesDialogCancel?.addEventListener("click", closeEngagementClubTimesDialog);
    elements.engagementsClubTimesDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEngagementClubTimesDialog();
    });
    elements.engagementsClubTimesDialog?.addEventListener("click", (event) => {
      if (event.target === elements.engagementsClubTimesDialog) closeEngagementClubTimesDialog();
    });
    elements.engagementsClubRelayDialogApply?.addEventListener("click", () => void applyEngagementClubRelayDialog());
    elements.engagementsClubRelayDialogReset?.addEventListener("click", resetEngagementClubRelayDialogMembers);
    elements.engagementsClubRelayDialog?.addEventListener("input", (event) => {
      if (event.target === elements.engagementsClubRelayDialogTime) event.target.setCustomValidity?.("");
      if (elements.engagementsClubRelayDialogMessage) {
        elements.engagementsClubRelayDialogMessage.textContent = "";
        elements.engagementsClubRelayDialogMessage.dataset.tone = "";
      }
    });
    elements.engagementsClubRelayDialog?.addEventListener("change", (event) => {
      if (event.target.matches("[data-engagement-club-relay-dialog-member]")) {
        syncEngagementClubRelayDialogMemberOptions();
        engagementClubRelayDialogDraft = readEngagementClubRelayDialogDraft();
        const selectedCount = (engagementClubRelayDialogDraft?.memberIds || []).filter(Boolean).length;
        const relayEvent = engagementClubRelayEvents().find((item) => item.code === engagementClubRelayDialogDraft?.eventCode) || {};
        const peopleWording = engagementRelayPeopleWording(engagementClubRelayDialogDraft?.genderMode);
        if (elements.engagementsClubRelayDialogMembersSummary) {
          elements.engagementsClubRelayDialogMembersSummary.textContent = selectedCount
            ? `Participants · ${selectedCount}/${engagementRelayLegCount(relayEvent)}`
            : `Choisir les ${peopleWording.plural}`;
        }
        return;
      }
      const fieldByElement = new Map([
        [elements.engagementsClubRelayDialogEvent, "event"],
        [elements.engagementsClubRelayDialogCategory, "category"],
        [elements.engagementsClubRelayDialogGender, "gender"]
      ]);
      const changedField = fieldByElement.get(event.target);
      if (event.target === elements.engagementsClubRelayDialogTime) {
        if (!normalizeEngagementEntryTimeInput(event.target)) event.target.reportValidity?.();
        return;
      }
      if (!changedField || !engagementClubRelayDialogDraft) return;
      const previousRelay = engagementClubRelayDialogDraft;
      const currentRelay = readEngagementClubRelayDialogDraft();
      const reconciledRelay = reconcileEngagementClubRelayDraft(currentRelay, previousRelay, changedField);
      const previousMemberCount = (previousRelay.memberIds || []).filter(Boolean).length;
      const nextMemberCount = (reconciledRelay.memberIds || []).filter(Boolean).length;
      engagementClubRelayDialogDraft = reconciledRelay;
      renderEngagementClubRelayDialog();
      if (previousMemberCount > nextMemberCount && elements.engagementsClubRelayDialogMessage) {
        elements.engagementsClubRelayDialogMessage.textContent = "Les participants devenus incompatibles ont été retirés.";
        elements.engagementsClubRelayDialogMessage.dataset.tone = "";
      }
      global.requestAnimationFrame?.(() => event.target?.id && document.querySelector(`#${event.target.id}`)?.focus?.());
    });
    elements.engagementsClubRelayDialogClose?.addEventListener("click", () => closeEngagementClubRelayDialog());
    elements.engagementsClubRelayDialogCancel?.addEventListener("click", () => closeEngagementClubRelayDialog());
    elements.engagementsClubRelayDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEngagementClubRelayDialog();
    });
    elements.engagementsClubRelayDialog?.addEventListener("click", (event) => {
      if (event.target === elements.engagementsClubRelayDialog) closeEngagementClubRelayDialog();
    });
    elements.engagementsClubRelaysList?.addEventListener("change", (event) => {
      const changedControl = event.target;
      if (changedControl.matches("[data-engagement-club-relay-time]") && !normalizeEngagementEntryTimeInput(changedControl)) {
        if (elements.engagementsClubRelaysMessage) {
          elements.engagementsClubRelaysMessage.textContent = "Temps invalide : utilisez MM:SS.CC ou saisissez uniquement les chiffres.";
          elements.engagementsClubRelaysMessage.dataset.tone = "error";
        }
        changedControl.reportValidity?.();
        return;
      }
      const row = changedControl.closest("[data-engagement-club-relay-row]");
      const relayId = row?.dataset.engagementClubRelayId || "";
      const previousRelay = engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
      const changedField = changedControl.matches("[data-engagement-club-relay-event]")
        ? "event"
        : changedControl.matches("[data-engagement-club-relay-category]")
          ? "category"
          : changedControl.matches("[data-engagement-club-relay-gender]")
            ? "gender" : "time";
      engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom().map((relay) =>
        relay.relayId === relayId
          ? { ...reconcileEngagementClubRelayDraft(relay, previousRelay, changedField), draftPending: true }
          : relay
      );
      renderEngagementClubRelays();
      const focusSelector = changedField === "event"
        ? "[data-engagement-club-relay-event]"
        : changedField === "category"
          ? "[data-engagement-club-relay-category]"
          : changedField === "gender"
            ? "[data-engagement-club-relay-gender]" : "[data-engagement-club-relay-time]";
      focusEngagementClubRelayControl(relayId, focusSelector);
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubRelaysList?.addEventListener("input", (event) => {
      if (!event.target.matches("[data-engagement-club-relay-time]")) return;
      event.target.setCustomValidity?.("");
      if (elements.engagementsClubRelaysMessage) {
        elements.engagementsClubRelaysMessage.textContent = "";
        elements.engagementsClubRelaysMessage.dataset.tone = "";
      }
    });
    elements.engagementsClubRelaysList?.addEventListener("pointerdown", (event) => {
      const composeButton = event.target.closest("[data-engagement-club-relay-compose]");
      if (!composeButton || (Number.isFinite(event.button) && event.button !== 0)) return;
      event.preventDefault();
      openEngagementClubRelayDialog(composeButton.dataset.engagementClubRelayCompose || "", composeButton);
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubRelaysList?.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-engagement-club-relay-edit]");
      if (editButton) {
        const row = editButton.closest("[data-engagement-club-relay-row]");
        const relayId = row?.dataset.engagementClubRelayId || "";
        openEngagementClubRelayDialog(relayId, editButton);
        return;
      }
      const cancelEditButton = event.target.closest("[data-engagement-club-relay-cancel-edit]");
      if (cancelEditButton) {
        const row = cancelEditButton.closest("[data-engagement-club-relay-row]");
        const relayId = row?.dataset.engagementClubRelayId || "";
        const savedRelay = (selectedEngagementClubEntry?.relays || []).find((relay) => relay.relayId === relayId);
        if (savedRelay) {
          engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom().map((candidate) => candidate.relayId === relayId
            ? { ...savedRelay, persisted: true, draftPending: false, draftNotice: "" }
            : candidate);
          renderEngagementClubRelays();
        }
        if (elements.engagementsClubRelaysMessage) {
          elements.engagementsClubRelaysMessage.textContent = "Modifications annulées.";
          elements.engagementsClubRelaysMessage.dataset.tone = "";
        }
        return;
      }
      const composeButton = event.target.closest("[data-engagement-club-relay-compose]");
      if (composeButton) {
        if (!elements.engagementsClubRelayDialog?.open) {
          openEngagementClubRelayDialog(composeButton.dataset.engagementClubRelayCompose || "", composeButton);
        }
        if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
        return;
      }
      const removeButton = event.target.closest("[data-engagement-club-relay-remove]");
      if (!removeButton) return;
      const row = removeButton.closest("[data-engagement-club-relay-row]");
      const relayId = row?.dataset.engagementClubRelayId || "";
      const currentRows = selectedEngagementClubRelayRowsFromDom();
      const relay = currentRows.find((candidate) => candidate.relayId === relayId);
      if (!relay) return;
      if (relay.persisted && currentRows.some((candidate) => candidate.relayId !== relayId && candidate.draftPending)) {
        if (elements.engagementsClubRelaysMessage) {
          elements.engagementsClubRelaysMessage.textContent = "Validez ou supprimez d'abord le relais en cours de modification.";
          elements.engagementsClubRelaysMessage.dataset.tone = "error";
        }
        return;
      }
      if (relay.persisted && !global.confirm("Supprimer définitivement ce relais enregistré ?")) return;
      engagementClubRelaysDraft = currentRows.filter((candidate) => candidate.relayId !== relayId);
      renderEngagementClubRelays();
      if (relay.persisted) {
        const saved = await saveEngagementClubRelays();
        if (!saved) {
          engagementClubRelaysDraft = currentRows;
          renderEngagementClubRelays();
        }
        return;
      }
      if (elements.engagementsClubRelaysMessage) elements.engagementsClubRelaysMessage.textContent = "";
    });
    elements.engagementsClubEntriesList?.addEventListener("input", () => {
      if (elements.engagementsClubEntriesMessage) elements.engagementsClubEntriesMessage.textContent = "";
    });
    elements.engagementsLevel?.addEventListener("change", () => {
      updateEngagementCreateFormAccess();
    });
    elements.engagementsCreateOpen?.addEventListener("click", openCreateCompetitionDialog);
    elements.engagementsCreateDialogClose?.addEventListener("click", () => elements.engagementsCreateDialog?.close());
    elements.engagementsCreateCompleteNow?.addEventListener("click", () => void completeNewlyCreatedEngagementCompetition());
    elements.engagementsCreateChecklist?.addEventListener("close", () => { newlyCreatedEngagementCompetitionId = ""; });
    elements.engagementsRegionId?.addEventListener("change", () => updateEngagementCreateFormAccess());
    elements.engagementsEditLevel?.addEventListener("change", () => {
      setDefaultEngagementOfficialsRequired("edit");
      updateEngagementEditFormAccess();
    });
    elements.engagementsEditRegionId?.addEventListener("change", () => updateEngagementEditFormAccess());
    elements.engagementsEditQualificationMode?.addEventListener("change", () => updateEngagementQualificationFields("edit"));
    elements.engagementsEditMaxEventsUnlimited?.addEventListener("change", () => updateEngagementMaxEventsFields("edit"));
    elements.engagementsEditInvitedRegionChoices?.addEventListener("change", (event) => syncInvitedRegionChoice(event, elements.engagementsEditInvitedRegionIds));
    moveEngagementStatusField();
    prepareCreateCompetitionDialog();
    moveEngagementFeesToGeneral();
    updateEngagementQualificationFields("edit");
    updateEngagementMaxEventsFields("edit");
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
      setMobilePortalNavigationOpen(elements.navToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.navPin?.addEventListener("click", () => {
      setPortalNavigationPinned(elements.navPin.getAttribute("aria-pressed") !== "true");
    });
    elements.sidebar?.addEventListener("pointerleave", () => {
      elements.sidebar.classList.remove("is-collapsed-after-navigation");
    });
    elements.sidebar?.addEventListener("focusin", () => {
      elements.sidebar.classList.remove("is-collapsed-after-navigation");
    });
    elements.clubToggle?.addEventListener("click", () => {
      if (selectedEngagementCompetitionId && !closeEngagementCompetitionDetail()) return;
      togglePortalSpace("club", "clubHome", "espace-club", elements.clubToggle);
      collapsePortalNavigationAfterSelection();
    });
    elements.performanceToggle?.addEventListener("click", () => {
      togglePortalSpace("performance", "performanceHome", "gestion-performances", elements.performanceToggle);
      collapsePortalNavigationAfterSelection();
    });
    elements.engagementsAdminToggle?.addEventListener("click", () => {
      global.location.hash = "competitions-calendrier";
      collapsePortalNavigationAfterSelection();
    });
    elements.dtnToggle?.addEventListener("click", () => {
      togglePortalSpace("dtn", "dtnHome", "espace-dtn", elements.dtnToggle);
      collapsePortalNavigationAfterSelection();
    });
    elements.nationalToggle?.addEventListener("click", () => {
      togglePortalSpace("national", "nationalHome", "administration-nationale", elements.nationalToggle);
      collapsePortalNavigationAfterSelection();
    });
    elements.accessToggle?.addEventListener("click", () => {
      togglePortalSpace("access", "accessHome", "gestion-acces", elements.accessToggle);
      collapsePortalNavigationAfterSelection();
    });
    elements.overviewSpaceToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      const card = toggle.closest("[data-overview-space]");
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      document.querySelectorAll("[data-overview-space].is-expanded").forEach((otherCard) => {
        if (otherCard !== card) setOverviewSpaceExpanded(otherCard, false);
      });
      setOverviewSpaceExpanded(card, expanded);
      if (!expanded) toggle.blur();
    }));
    elements.engagementsHomeLinks.forEach((link) => link.addEventListener("click", (event) => {
      const nextEntry = link.dataset.engagementsHomeEntry || "adminCalendar";
      const nextTab = link.dataset.engagementsHomeTab || "calendar";
      const contextChanged = engagementNavigationMode(nextEntry) !== engagementNavigationMode();
      const closesCompetitionDetail = Boolean(selectedEngagementCompetitionId && (contextChanged || nextTab === "calendar"));
      if (closesCompetitionDetail && !confirmLeaveDirtyEngagementTab()) {
        event.preventDefault();
        return;
      }
      activeEngagementsNavEntry = nextEntry;
      setEngagementsTab(nextTab);
      if (closesCompetitionDetail) closeEngagementCompetitionDetail({ skipConfirmation: true });
      if (link.dataset.engagementsNationalTarget) {
        setEngagementNationalTab(link.dataset.engagementsNationalTarget);
      }
      if (global.location.hash === link.hash) updateNavigationView();
    }));
    elements.navigation?.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      if (link.dataset.adminViewLink === "engagements") {
        const nextEntry = link.dataset.engagementsNavEntry || "club";
        const contextChanged = engagementNavigationMode(nextEntry) !== engagementNavigationMode();
        if (contextChanged && selectedEngagementCompetitionId && !confirmLeaveDirtyEngagementTab()) {
          event.preventDefault();
          return;
        }
        activeEngagementsNavEntry = nextEntry;
        if (link.dataset.engagementsNavTab) {
          setEngagementsTab(link.dataset.engagementsNavTab);
        }
        if (link.dataset.engagementsNationalTarget) {
          setEngagementNationalTab(link.dataset.engagementsNationalTarget);
        }
        if (activeEngagementsTab === "calendar") {
          closeEngagementCompetitionDetail({ skipConfirmation: contextChanged });
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
          loadEngagementClubSwimmers({ silent: true });
        }
        if (activeEngagementsTab === "clubSwimmers") {
          closeEngagementCompetitionDetail();
          loadEngagementClubSwimmers();
        }
        if (global.location.hash === link.hash) updateNavigationView();
      }
      collapsePortalNavigationAfterSelection();
    });
    elements.accountEmailForm?.addEventListener("submit", updateAccountEmail);
    elements.accountCompetitionNotifications?.addEventListener("click", toggleAccountNotificationPreferences);
    elements.accountPasswordForm?.addEventListener("submit", updateAccountPassword);
    [elements.accountNotificationsDetails, elements.accountEmailDetails, elements.accountPasswordDetails].forEach((details) => {
      details?.querySelector(":scope > summary")?.addEventListener("click", () => {
        if (details.open) return;
        [elements.accountEmailDetails, elements.accountPasswordDetails].forEach((otherDetails) => {
          if (otherDetails && otherDetails !== details) otherDetails.open = false;
        });
      });
    });
    elements.accessForm?.addEventListener("submit", saveAccessUser);
    elements.accessRegionId?.addEventListener("change", () => void loadAccessClubReference().then(() => populateAccessClubSelect()));
    elements.accessClubSelect?.addEventListener("focus", () => void loadAccessClubReference().then(() => populateAccessClubSelect()));
    elements.accessClubSelect?.addEventListener("change", syncAccessClubFieldsFromSelect);
    elements.accessDeletionRequestsRefresh?.addEventListener("click", () => loadAccessDeletionRequests({ force: true }));
    elements.accessAdd?.addEventListener("click", () => {
      if (!canUse("admin.full")) return;
      resetAccessForm();
      openAccessDialog();
      elements.accessForm?.querySelector("#adminAccessLastName")?.focus();
    });
    elements.cancelEdit?.addEventListener("click", () => resetAccessForm(true));
    elements.accessDialogClose?.addEventListener("click", () => resetAccessForm(true));
    elements.accessPanel?.addEventListener("close", () => {
      resetAccessForm();
      elements.accessAdd?.setAttribute("aria-expanded", "false");
    });
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
      const directoryToggle = event.target.closest("[data-access-directory-toggle]");
      if (directoryToggle) {
        const row = directoryToggle.closest(".admin-access-row");
        const willExpand = row?.dataset.expanded !== "true";
        elements.accessList.querySelectorAll('.admin-access-row[data-expanded="true"]').forEach((expandedRow) => {
          expandedRow.dataset.expanded = "false";
          expandedRow.querySelectorAll("[data-access-directory-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
        });
        if (row) {
          row.dataset.expanded = willExpand ? "true" : "false";
          row.querySelectorAll("[data-access-directory-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", willExpand ? "true" : "false"));
        }
        return;
      }
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
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushPendingEngagementClubWrites();
    });
    global.addEventListener("livepalmes:calendar-events-changed", async (event) => {
      invalidateEngagementCalendarCaches();
      if (!isEngagementAdminMode()) return;
      await loadEngagementCompetitions({ force: true });
      const detail = event.detail || {};
      if (detail.action === "delete") {
        removeEngagementCalendarItemFromCache(detail.calendarEventId, "calendarEvent");
      } else if (detail.event) {
        upsertEngagementCalendarItemFromServer(detail.event, "calendarEvent");
      }
    });
    global.addEventListener("beforeunload", (event) => {
      if (!engagementClubHasPendingWrites()) return;
      flushPendingEngagementClubWrites();
      event.preventDefault();
      event.returnValue = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
