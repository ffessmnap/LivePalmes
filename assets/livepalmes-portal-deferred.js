(function attachPortalDeferred(global) {
  "use strict";
  const version = "20261102-reactivity-1";
  const factories = new Map(), requests = new Map(), instances = new WeakMap();
  let pending = 0, status, failed = false;
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
    if (factories.has(key)) return implementation(context, key, action, helpers)(...args);
    const uid = context.state.activeAuthUid, clubId = context.state.activeEngagementClubId;
    const sessionRevision = global.LivePalmesPortalSession?.revision();
    const route = global.location?.hash, competitionId = context.state.selectedEngagementCompetitionId;
    const changesData = /^(?:save|create|delete|remove|set|update|send|generate|prepare|recover|merge|resolve|request)/.test(action);
    const control = args[0]?.submitter || args[0]?.currentTarget;
    const button = control?.tagName === "BUTTON" ? control : null;
    const disabled = button?.disabled;
    if (button) button.disabled = true;
    args[0]?.preventDefault?.();
    pending++; message("Chargement des outils…");
    document.body.setAttribute("data-portal-module-loading", "true");
    return load(key).then(() => {
      if (button) button.disabled = disabled;
      if (sessionRevision !== global.LivePalmesPortalSession?.revision() || uid !== context.state.activeAuthUid || clubId !== context.state.activeEngagementClubId || route !== global.location?.hash
          || changesData && competitionId !== context.state.selectedEngagementCompetitionId) {
        throw Object.assign(new Error("Le contexte a changé. Réessayez depuis l’écran actuel."),{portalModuleFailure:true});
      }
      return implementation(context, key, action, helpers)(...args);
    }).catch(error => {
      if (error.portalModuleFailure) message(error.message,true);
      if (!factories.has(key)) {
        error.portalModuleFailure = true;
        message("Module indisponible. Réessayez votre action.",true);
      }
      throw error;
    }).finally(() => {
      if (button) button.disabled = disabled;
      if (--pending === 0) { document.body.removeAttribute("data-portal-module-loading"); if (!failed) message(""); }
    });
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

  global.LivePalmesPortalDeferred = { register: (key, factory) => factories.set(key, factory), invoke, load };
})(window);
