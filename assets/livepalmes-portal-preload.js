(function attachPortalPreload(global) {
  "use strict";
  let context, token = "", next = 0, running = false, epoch = 0;
  let timer, frame, idle, notBefore = 0;
  const tasks = [
    ["club-and-competition", "loadEngagementCompetitions", { mode: "club", activate: false, silent: true }],
    ["competition-actions", "loadEngagementClubSwimmers", { silent: true, background: true }],
    ["club-and-competition", "loadEngagementClubPeople", { silent: true, background: true }]
  ];
  function scope() {
    if (!context) return "";
    const { state, actions } = context, profile = state.currentAccessProfile;
    const club = actions.engagementClubScope();
    if (!state.activeAuthUid || !profile || !club || !actions.canUse("engagements.club.manage")) return "";
    return JSON.stringify([state.activeAuthUid, club, profile.status, profile.accessScopes,
      [...(profile.capabilities || [])].sort(), global.LivePalmesPortalSession?.revision()]);
  }
  function available() {
    const connection = global.navigator?.connection;
    return global.LivePalmesEnvironment?.sportingDataSource === "nap"
      && document.body?.dataset.adminAuth === "unlocked" && document.body?.dataset.portalSession !== "locked"
      && document.visibilityState === "visible" && global.navigator?.onLine !== false
      && !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType)
      && ["", "#accueil", "#espace-club"].includes(global.location.hash)
      && !context.state.selectedEngagementCompetitionId && !document.querySelector("dialog[open]");
  }
  function cancelPending() {
    epoch++;
    global.clearTimeout(timer); global.cancelAnimationFrame?.(frame); global.cancelIdleCallback?.(idle);
    timer = frame = idle = undefined;
  }
  function cancel() {
    cancelPending(); token = ""; next = 0;
  }
  async function run(expected, revision) {
    if (running || revision !== epoch || expected !== scope() || !available()) return;
    running = true;
    const [chunk, action, options] = tasks[next];
    try {
      // Prepare code quietly, without the foreground loader's status overlay.
      await global.LivePalmesPortalDeferred.load(chunk);
      if (revision !== epoch || expected !== scope() || !available()) return;
      next++;
      await context.actions[action](options);
    } catch {
      // A failed speculative read is retried by the normal route, never in a loop.
      if (revision === epoch && expected === scope() && tasks[next]?.[1] === action) next++;
    } finally {
      running = false;
      schedule();
    }
  }
  function schedule() {
    if (!context) return;
    const current = scope();
    if (current !== token) { cancelPending(); token = current; next = 0; }
    if (!current || running || timer !== undefined || frame !== undefined || idle !== undefined || next >= tasks.length || !available()) return;
    const expected = current, revision = epoch;
    const later = () => {
      frame = undefined;
      if (revision !== epoch) return;
      timer = global.setTimeout(() => {
        timer = undefined;
        if (revision !== epoch || expected !== scope() || !available()) return;
        if (global.requestIdleCallback) {
          idle = global.requestIdleCallback(() => { idle = undefined; void run(expected, revision); });
        } else void run(expected, revision);
      }, Math.max(500, notBefore - Date.now()));
    };
    // Two frames and a separate task allow the authorised home to paint first.
    if (global.requestAnimationFrame) frame = global.requestAnimationFrame(() => {
      if (revision === epoch) frame = global.requestAnimationFrame(later);
    });
    else later();
  }
  function attach(portalContext) {
    if (context) return;
    context = portalContext;
    const intent = event => {
      if (event.isTrusted === false) return;
      notBefore = Date.now() + 1500; cancelPending(); schedule();
    };
    for (const name of ["pointerdown", "keydown", "input"]) document.addEventListener(name, intent, { capture: true, passive: true });
    global.addEventListener("hashchange", () => { cancelPending(); schedule(); });
    document.addEventListener("visibilitychange", () => { cancelPending(); schedule(); });
    global.addEventListener("online", schedule);
    document.addEventListener("livepalmes:portal-session-locked", cancel);
    document.addEventListener("livepalmes:portal-session-resumed", schedule);
  }
  global.LivePalmesPortalPreload = { attach, schedule, cancel };
})(window);
