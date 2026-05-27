(function attachLivePalmesSecretaryFinalsWorkflow(global) {
  function init(context = {}) {
    function currentFinals() {
      return (context.raceResults || [])
        .filter((result) => result.hasFinal)
        .sort((a, b) => String(b.finalistsAnnouncedAt || b.updatedAt || "").localeCompare(String(a.finalistsAnnouncedAt || a.updatedAt || "")));
    }

    function ensureSession(finals = []) {
      const available = context.finalResultSessions(finals);
      const currentSession = context.secretaryFinalsSession || "";
      if (!available.length) {
        context.secretaryFinalsSession = "";
        return "";
      }
      if (currentSession === "all" || available.includes(currentSession)) {
        return currentSession;
      }
      const speakerSession = context.roleStates?.speaker?.session && context.roleStates.speaker.session !== "all"
        ? String(context.roleStates.speaker.session)
        : "";
      const nextSession = [speakerSession, available.at(-1), available[0]]
        .find((session) => session && available.includes(session)) || available[0];
      context.secretaryFinalsSession = nextSession;
      return nextSession;
    }

    function renderPanel() {
      const panel = context.secretaryFinalsPanel;
      if (!panel) return;
      if (context.state?.role !== "secretary") {
        panel.hidden = true;
        panel.innerHTML = "";
        return;
      }

      const finals = currentFinals();
      const availableSessions = context.finalResultSessions(finals);
      const activeSession = ensureSession(finals);
      const visibleFinals = activeSession && activeSession !== "all"
        ? finals.filter((result) => String(result.session || "") === activeSession)
        : finals;

      panel.hidden = false;
      panel.innerHTML = context.livePalmesSecretaryFinals.renderPanelHtml({
        activeSession,
        availableSessions,
        hasFinals: Boolean(finals.length),
        visibleCardsHtml: visibleFinals.map((result) => context.livePalmesSecretaryFinals.renderFinalCardHtml({
          announced: Boolean(result.finalistsAnnouncedAt),
          eventLabel: result.eventLabel || result.eventId,
          finalistCount: context.finalRowsCount(result.finalists),
          resultId: result.id,
          session: result.session || "",
          sexLabel: result.sexLabel || context.sexDisplayLabel(result.sex),
          startTime: result.startTime || "",
          withdrawals: (result.finalWithdrawals || []).length
        })).join("")
      });
    }

    return {
      ensureSession,
      renderPanel
    };
  }

  global.LivePalmesSecretaryFinalsWorkflow = { init };
})(window);
