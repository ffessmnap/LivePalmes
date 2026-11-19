(function attachPortalDeferred(global) {
  "use strict";
  const version = "20261119-a4-excel-1";
  const factories = new Map(), requests = new Map(), instances = new WeakMap();
  const syncDependencies = {"loadAccessDirectorySnapshot":["account-and-access"],"loadAccessUsers":["account-and-access"],"showNextAccessPage":["account-and-access"],"showPreviousAccessPage":["account-and-access"],"loadAccessDeletionRequests":["account-and-access","national-requests"],"saveAccessUser":["account-and-access"],"searchEngagementNationalAuditActors":["activity-journal"],"loadEngagementNationalAuditLogs":["activity-journal","competition-settings"],"loadEngagementClubPeople":["activity-journal","club-and-competition","club-people"],"saveEngagementClubPerson":["activity-journal","club-and-competition","club-people","competition-actions"],"setEngagementClubPersonStatus":["activity-journal","club-and-competition"],"loadEngagementCompetitions":["club-entry-state","competition-settings"],"saveNativeCompetitionDetail":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"createEngagementCompetition":["club-and-competition","competition-settings"],"updateEngagementCompetition":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"saveEngagementCompetitionDetail":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"updateEngagementCompetitionEvents":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"updateEngagementCompetitionFees":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"flushEngagementClubSwimmerEventTimesBatch":["club-entry-state"],"ensureEngagementClubSwimmerEventTimes":["club-entry-state"],"removeEngagementClubSwimmerFromCourses":["club-entry-state"],"restoreEngagementNavigation":["club-entry-state","competition-actions"],"setEngagementClubSwimmerActivityStatus":["club-entry-state","club-entry-views"],"requestEngagementClubSwimmerDeletion":["club-entry-state"],"loadEngagementClubEntryTimeHistory":["club-entry-views","competition-settings"],"openEngagementClubTimesDialog":["club-entry-views","competition-settings"],"applyEngagementClubRelayDialog":["club-entry-state","club-entry-views"],"confirmEngagementClubTeamLeaderCandidate":["club-people","competition-actions"],"selectEngagementClubTeamRenunciation":["club-people"],"saveEngagementClubExternalTeamLeader":["club-people"],"handleEngagementClubOfficialSelection":["club-people","competition-actions"],"searchEngagementAdminPublicSwimmers":["club-people"],"loadEngagementCompetitionDetail":["club-and-competition","club-entry-state","club-entry-views","competition-actions","competition-settings","documents-and-program"],"retryEngagementCompetitionRead":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"saveEngagementClubTeamLeader":["club-people","competition-actions","competition-settings"],"removeEngagementClubTeamLeader":["club-people"],"loadEngagementClubSwimmers":["club-entry-state","club-entry-views","club-people","competition-actions"],"saveEngagementClubSwimmers":["club-entry-state"],"saveEngagementClubRelays":["club-entry-views"],"downloadEngagementAdminClubRecapPdf":["club-entry-views","documents-and-program"],"generateEngagementAdminClubRecapPdfs":["club-entry-views","documents-and-program"],"generateEngagementAdminTxtExport":["club-entry-views","documents-and-program"],"prepareEngagementClubRecapEmails":["club-entry-views","documents-and-program"],"sendEngagementPreparedEmails":["club-entry-views","competition-actions","documents-and-program"],"createEngagementClubSwimmer":["club-entry-state","club-entry-views","competition-actions"],"recoverEngagementClubSwimmer":["club-entry-state","club-entry-views","competition-actions"],"deleteOrRequestEngagementCompetitionDeletion":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"finishQualificationJob":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"updateCompetitionWithQualifications":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"loadEngagementClubRecapFiles":["documents-and-program"],"loadEngagementCompetitionStatistics":["documents-and-program"],"loadEngagementMailJobs":["documents-and-program"],"saveEngagementCompetitionDocuments":["club-entry-views","documents-and-program","competition-settings"],"deleteEngagementCompetitionDocument":["club-entry-views","documents-and-program","competition-settings"],"loadEngagementOpenWaterCourses":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"addEngagementOpenWaterCourse":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"setEngagementOpenWaterCourseStatus":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"matchPublicAccessRequestClubByFederalNumber":["competition-settings"],"loadEngagementNationalClubs":["competition-settings","national-requests"],"saveEngagementNationalClub":["competition-settings","national-directories","national-requests"],"deleteEngagementNationalClub":["national-directories","national-requests"],"loadEngagementNationalSwimmers":["club-people","national-directories","national-requests"],"setEngagementNationalSwimmerStatus":["club-entry-state"],"deleteEngagementNationalSwimmer":["club-entry-state"],"searchEngagementNationalSwimmerMergeTargets":["club-people","national-directories","national-requests"],"executeSwimmerMerge":["national-directories"],"mergeEngagementNationalSwimmer":["club-entry-state","national-directories"],"mergeSelectedEngagementNationalSwimmers":["club-entry-state","club-people","national-directories"],"loadEngagementNationalPeople":["activity-journal","national-directories"],"mergeSelectedEngagementNationalPeople":["national-directories"],"loadEngagementAccessRequests":["competition-actions","national-requests"],"resolveEngagementAccessRequest":["national-requests"],"submitEngagementAccessRequestEdit":["national-requests"],"submitPublicEngagementAccessRequest":["national-requests"],"loadEngagementDeletionRequests":["national-requests"],"resolveEngagementDeletionRequest":["competition-settings"],"loadEngagementSwimmerChangeRequests":["account-and-access","national-requests"],"resolveEngagementSwimmerChangeRequest":["activity-journal","club-and-competition","club-entry-state"],"submitEngagementAccessRequestRejection":["national-requests"],"submitEngagementSwimmerCorrection":["activity-journal","club-and-competition","club-entry-state","club-entry-views","competition-actions","national-requests"],"requestEngagementDetailTab":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"act":["club-and-competition","club-entry-views","competition-actions","competition-settings","documents-and-program"],"openEngagementSwimmerChangeRequestReview":["club-entry-state","club-entry-views","national-requests"]};
  const secondaryKeys = ["account-and-access","activity-journal","club-and-competition","club-entry-state","club-entry-views","club-people","competition-actions","competition-settings","documents-and-program","national-directories","national-requests"];
  let pending = 0, status, failed = false;
  let viewRequest;
  const viewScripts = {"nationalHome":["assets/public/livepalmes-trophy-table.js?v=20261103-alignement","assets/livepalmes-national-trophy.js?v=20261103"],"news":["assets/livepalmes-portal-news.js?v=20261101-news-editor-1"],"nationalDocuments":["assets/public/livepalmes-home-model.js?v=20261014-home-2","assets/livepalmes-featured-documents-model.js?v=20261013-documents-1","assets/livepalmes-featured-documents.js?v=20261023-documents-page-1","assets/livepalmes-national-documents.js?v=20261025-documents-2mo-1"],"engagements":["assets/livepalmes-license-administration.js?v=20261027-license-closure","assets/livepalmes-admin-calendar-events.js?v=20261119-a6-1"]};
  const scriptIntegrity = {
    "assets/livepalmes-admin-calendar-events.js": "sha256-e6M7xK/qMPcgomL7oepXmgJlgfcvV3YJLieLZ40t8mA= sha256-VIQX1AxSrUHBsx1xFatybVgUa1UsDK/sdAop28LL8vY=",
    "assets/livepalmes-featured-documents-model.js": "sha256-G8CP/halM6ofXIjS97yQK3KL5mDjeAh4mxnOi43deqI= sha256-sYkCKScqgcdD7lYnsAc/tBSwclf54D1rvz7R8bntcpU=",
    "assets/livepalmes-featured-documents.js": "sha256-Eoe+anc6AcFaOMRz14iraVJl562k6zydVkYgl4SZkIM= sha256-vV28wVD44E3V7yJPvkLlxHLyLHYanqrulqYUjaBLtMY=",
    "assets/livepalmes-license-administration.js": "sha256-g3KSC+ljAjZZXT2tyJjcH6TS4WWMBxy85JSwUJZU24w= sha256-+SLH0R8pTD9Qa/pfHiyRhCUP+IqXJpAfkmRamKWRKKE=",
    "assets/livepalmes-national-documents.js": "sha256-74XoNzVUNr+FKksAtCoaufAhHqZGs7YwxiylGxONdUc= sha256-Cb1saVDYgzxTfINZUbQiUjXu5doY25z56R+BypYZuLE=",
    "assets/livepalmes-national-trophy.js": "sha256-bKGQtf+RngRHx1UMqtW0o6j+uTteO6MS3x/zMAciEic= sha256-eEWhkQ/FZm1jDMKJ6eATAREmjEVUWZ4XRm9obTy8V6A=",
    "assets/livepalmes-portal-news.js": "sha256-qhxQiLwAxZORS3tF7Z1RCHO846EHr9CfiWn6rpos+Cg= sha256-nulgkmVihl3IvBteo1ZozIE3L0IeQ7+cxS/VLG9IHXs=",
    "assets/portal/deferred/account-and-access.js": "sha256-XBIep/NkyM98DOBh/qDY4bhM1Rr1IMjr3NsLkYjmGKw= sha256-BX6UYSWmIyLFZOM2ELbUZyFkyI6v7N9aR1Z26C8eUvM=",
    "assets/portal/deferred/activity-journal.js": "sha256-5TTn6WnivGFsNwYw2SDeK3W4pz0xBZDa0+MAI9xFYXM= sha256-61xsZtzAu2EJcvFSwBORWuwL+ux/VEqgY4ccH2OALQo=",
    "assets/portal/deferred/club-and-competition.js": "sha256-2ITmZBoBUzU79fiTuVes1H7xQWzR8RmvnFPqPyO1oQ8= sha256-fNf7+DrGPvkg+xkrD0dlPnMnzWmRyv3hVaGcCjT4cd4=",
    "assets/portal/deferred/club-entry-state.js": "sha256-IgXiWsLpT/4l7qTXJHtklx/KTUp6JfjsH+Y4uIOEjEY= sha256-ln50Z3LUIcACJboS7+c1StWD8MuDlj6QLbmX3oJY+DA=",
    "assets/portal/deferred/club-entry-views.js": "sha256-hOsY8lHKQth0rP4V/eXwS0F8+Tu5+LpCa7uBxxSbUm8= sha256-NNL+1P0ZgSAGR5wJmU9qjtqSFSoBe5fhYQBBnKS3bMA=",
    "assets/portal/deferred/club-people.js": "sha256-PEdcQAUFB9mPyul8r+DY7zszKHO4LUJh6ZF2l/Tkpv8= sha256-CY1003xg1eis1Z0RW0U0N1xm8xKs0waaR13hDYuWylA=",
    "assets/portal/deferred/competition-actions.js": "sha256-e3Vk39bUQmOiT/AH00f6jWeQY3o1cxL3sMSnye/7Kqc= sha256-rtkAmrBtD2IG8U+sTrkuFhBr3WYvDoCvVGo0azIMsWo=",
    "assets/portal/deferred/competition-settings.js": "sha256-Xiu9GEyLi+oG5jzenG3FeqX1qjs++hmE17lCYYQMEx4= sha256-07/wcJCn17aub9+/2LTMXzuv/YrYR90+Mt1QkrKrQLc=",
    "assets/portal/deferred/documents-and-program.js": "sha256-FfIN6UuArtXIO7DKqLqxESeAb/QEb/RwXolTOuvJ/jw= sha256-kfYYLiJCTmlxfPOV0/KzZvRUWk6xZgToj9sbxxiysLQ=",
    "assets/portal/deferred/national-directories.js": "sha256-mIXDxf+FFjdd7xUmUmL6tEBb9vhQuLKJ9WwrnthW4xE= sha256-A9QbrJaLc5M4Hz66Ar++v7cic8zIUg2tESfVYFdRC4U=",
    "assets/portal/deferred/national-requests.js": "sha256-y+ueWk8evsE3789LES0hBZyZiOs8RG4HOO/Kjliyp6E= sha256-s3ENJWVeyOR1XBhURuif4fbaLplpw5pwM4yBWTSdnOU=",
    "assets/portal/deferred/team-entries.js": "sha256-Aei79hi/WgPXBFE2kO8ZbRNByLP0emdSx07wzIvZKZA= sha256-znQxWpLl3XcTXjQL/rK9xL82KIfulsu2hZ6rr0ar1a4=",
    "assets/portal/deferred/workspace-events.js": "sha256-fLuagbGNw9psqpgTIix13kxA/0S1IUV6/MwiIB4dqeE= sha256-+lcevhauTwA1aQyHleebMHP1BAHSVOJCr8mtwgARNIk=",
    "assets/public/livepalmes-home-model.js": "sha256-ptVD9VDQgn9b8PF3CXA5HYWAGajklycxfHdBd98tveE= sha256-SmRm2TolXlKFt7IRUpmIOZEoxW/0j71/Xpjfa94S0L0=",
    "assets/public/livepalmes-trophy-table.js": "sha256-/tJLEUmyrI+Ks4T766QSgnj1H+TGRotorFSLgQovPuc= sha256-RPxwKOs7SuvHtbBxRvHrbIbyf3xm+ehg4ZaWDZIEKYU="
  };
  const resources = new Map();
  const boundContexts = new WeakSet();
  const loadedAssets = new Set();
  function asset(src) {
    if (resources.has(src)) return resources.get(src);
    const script = document.createElement("script"); script.src = src;
    script.integrity = scriptIntegrity[src.split("?")[0]];
    const request = new Promise((resolve, reject) => {
      script.addEventListener("load", () => { loadedAssets.add(src); resolve(); }, {once:true});
      script.addEventListener("error", () => { resources.delete(src); script.remove(); reject(new Error("Outil indisponible.")); }, {once:true});
    });
    resources.set(src, request); document.head.appendChild(script); return request;
  }
  function style(slot) {
    const src = slot.dataset.portalStyleSrc;
    if (!src) return Promise.resolve();
    if (resources.has(src)) return resources.get(src);
    const request = new Promise((resolve, reject) => {
      const cleanup = () => { slot.removeEventListener("load", done); slot.removeEventListener("error", error); };
      const done = () => { cleanup(); resolve(); };
      const error = () => { cleanup(); resources.delete(src); slot.removeAttribute("href"); reject(new Error("Styles indisponibles.")); };
      slot.addEventListener("load", done); slot.addEventListener("error", error); slot.href = src;
    });
    resources.set(src, request); return request;
  }
  function fragment(slot) {
    const src = slot.dataset.portalFragmentSrc;
    if (resources.has(src)) return resources.get(src);
    const request = fetch(src).then(response => {
      if (!response.ok) throw new Error("Formulaire indisponible.");
      return response.text();
    }).then(html => { slot.innerHTML = html; slot.dataset.portalFragmentLoaded = "true"; })
      .catch(error => { resources.delete(src); throw error; });
    resources.set(src, request); return request;
  }
  function message(text, error = false) {
    if (!status) {
      status = document.createElement("div"); status.className = "admin-portal-module-status";
      status.setAttribute("role","status"); status.setAttribute("aria-live","polite"); document.body.appendChild(status);
    }
    failed = error; status.textContent = text; status.hidden = !text;
  }

  function load(key) {
    if (!/^[a-z-]+$/.test(key)) return Promise.reject(new Error("Module inconnu."));
    if (factories.has(key)) return Promise.resolve();
    if (requests.has(key)) return requests.get(key);
    const script = document.createElement("script");
    script.src = `assets/portal/deferred/${key}.js?v=${version}`;
    script.integrity = scriptIntegrity[`assets/portal/deferred/${key}.js`] || "";
    const request = new Promise((resolve, reject) => {
      script.addEventListener("load", () => {
        if (factories.has(key)) resolve();
        else { requests.delete(key); script.remove(); reject(new Error("Module LivePalmes incomplet. Réessayez.")); }
      }, { once: true });
      script.addEventListener("error", () => {
        requests.delete(key); script.remove(); reject(new Error("Chargement du module impossible. Réessayez."));
      }, { once: true });
    });
    requests.set(key, request);
    document.head.appendChild(script);
    return request;
  }

  function implementation(context, key, action, helpers) {
    let modules = instances.get(context);
    if (!modules) { modules = new Map(); instances.set(context, modules); }
    if (!modules.has(key)) modules.set(key, factories.get(key)(context, helpers));
    return modules.get(key)[action];
  }

  function invoke(context, key, action, args, helpers) {
    // A warmed module runs synchronously up to its first await, like its original.
    const dependencies = [key, ...(syncDependencies[action] || [])];
    if (dependencies.every(name => factories.has(name))) return implementation(context, key, action, helpers)(...args);
    const uid = context.state.activeAuthUid, clubId = context.state.activeEngagementClubId;
    const sessionRevision = global.LivePalmesPortalSession?.revision();
    const route = global.location?.hash, competitionId = context.state.selectedEngagementCompetitionId;
    const changesData = /^(?:save|create|delete|remove|set|update|send|generate|prepare|recover|merge|resolve|request)/.test(action);
    const control = args[0]?.submitter || args[0]?.currentTarget;
    const quiet = args[0]?.background === true || args[0]?.silent === true && args[0]?.activate === false;
    const button = control?.tagName === "BUTTON" ? control : null;
    const disabled = button?.disabled;
    if (button) button.disabled = true;
    args[0]?.preventDefault?.();
    if (!quiet) {
      pending++; message("Chargement des outils…");
      document.body.setAttribute("data-portal-module-loading", "true");
    }
    return Promise.all(dependencies.map(load)).then(() => {
      if (button) button.disabled = disabled;
      if (sessionRevision !== global.LivePalmesPortalSession?.revision() || uid !== context.state.activeAuthUid || clubId !== context.state.activeEngagementClubId || route !== global.location?.hash
          || changesData && competitionId !== context.state.selectedEngagementCompetitionId) {
        throw Object.assign(new Error("Le contexte a changé. Réessayez depuis l’écran actuel."),{portalModuleFailure:true});
      }
      return implementation(context, key, action, helpers)(...args);
    }).catch(error => {
      if (error.portalModuleFailure && !quiet) message(error.message,true);
      if (dependencies.some(name => !factories.has(name))) {
        error.portalModuleFailure = true;
        if (!quiet) message("Module indisponible. Conservez votre saisie, puis réessayez. Si le problème persiste, rechargez la page.",true);
      }
      throw error;
    }).finally(() => {
      if (button) button.disabled = disabled;
      if (!quiet && --pending === 0) { document.body.removeAttribute("data-portal-module-loading"); if (!failed) message(""); }
    });
  }

  function sync(context, key, action, args, helpers) {
    if (!factories.has(key)) throw Object.assign(new Error("Les outils de cet écran ne sont pas encore prêts."), { portalModuleFailure: true });
    return implementation(context, key, action, helpers)(...args);
  }

  function prepareView(context, view, resume) {
    if (["dashboard", "clubHome"].includes(view)) return true;
    const slots = Array.from(document.querySelectorAll("[data-portal-style-src]")).filter(slot => !slot.dataset.portalStyleView || slot.dataset.portalStyleView === view);
    const scripts = viewScripts[view] || [];
    const fragments = Array.from(document.querySelectorAll("[data-portal-fragment]")).filter(slot => {
      const key = slot.dataset.portalFragment;
      return key === view || ["import", "correction"].includes(view) && ["import", "correction"].includes(key);
    });
    if ([...secondaryKeys, "workspace-events"].every(key => factories.has(key)) && scripts.every(src => loadedAssets.has(src)) && slots.every(slot => slot.sheet)
        && fragments.every(slot => slot.dataset.portalFragmentLoaded === "true")) {
      if (!boundContexts.has(context)) {
        implementation(context, "workspace-events", "bindWorkspaceEvents", {}).call(null);
        boundContexts.add(context);
      }
      return true;
    }
    if (!viewRequest) {
      message("Chargement des outils…");
      const route = global.location?.hash;
      const scriptRequest = scripts.reduce((previous, src) => previous.then(() => asset(src)), Promise.resolve());
      const request = Promise.all([...secondaryKeys.map(load), load("workspace-events"), scriptRequest, ...slots.map(style), ...fragments.map(fragment)]).then(() => { viewRequest = null; message(""); resume(); })
        .catch(() => {
          viewRequest = null;
          if (route !== global.location?.hash) { message(""); resume(); }
          else message("Module indisponible. Conservez votre saisie, puis rouvrez la rubrique. Si le problème persiste, rechargez la page.", true);
        })
        .finally(() => { if (viewRequest === request) viewRequest = null; });
      viewRequest = request;
    }
    return false;
  }

  function warmIntent(event) {
    const hash = event.target?.closest?.('a[href^="#"]')?.getAttribute("href") || "";
    let keys = [];
    if (/^#club-competitions/.test(hash)) keys = ["club-and-competition","competition-actions","club-entry-state"];
    else if (/^#club-nageurs/.test(hash)) keys = ["competition-actions","club-entry-views"];
    else if (/^#club-officiels/.test(hash)) keys = ["club-and-competition","club-people"];
    else if (/^#competitions-/.test(hash)) keys = ["competition-settings","club-and-competition","competition-actions","documents-and-program"];
    else if (/^#(?:mon-compte|gestion-utilisateurs|gestion-demandes-acces)/.test(hash)) keys = ["account-and-access","national-requests"];
    else if (/^#administration-historique/.test(hash)) keys = ["activity-journal"];
    else if (/^#administration-(?:annuaires|doublons|officiels)/.test(hash)) keys = ["national-directories"];
    keys.forEach(key => { void load(key).catch(()=>{}); });
  }
  global.addEventListener?.("unhandledrejection",event=>{ if (event.reason?.portalModuleFailure) event.preventDefault(); });
  for (const event of ["pointerover","pointerdown","focusin"]) document.addEventListener?.(event,warmIntent,{capture:true,passive:true});

  global.LivePalmesPortalDeferred = { register: (key, factory) => factories.set(key, factory), invoke, sync, prepareView, load };
})(window);
