(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function auditActionLabel(action = "") {
        return global.LivePalmesActivityJournal.metadata[action]?.[0] || portalConfig.AUDIT_ACTION_METADATA[action]?.[0] || String(action || "Action non reconnue").replaceAll(".", " · ");
      }

    function auditActionCategory(action = "") {
        if (global.LivePalmesActivityJournal.metadata[action]?.[1]) return global.LivePalmesActivityJournal.metadata[action][1];
        if (portalConfig.AUDIT_ACTION_METADATA[action]?.[1]) return portalConfig.AUDIT_ACTION_METADATA[action][1];
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
        const actor = portalConfig.engagementNationalAuditActors.get(actorUid) || {};
        const currentUserName = [portalState.currentAccessProfile?.firstName, portalState.currentAccessProfile?.lastName].filter(Boolean).join(" ");
        const isCurrentUser = actorUid === String(portalState.currentAccessProfile?.uid || "");
        const label = (isCurrentUser ? currentUserName || portalState.currentAccessProfile?.displayName || portalState.currentAccessProfile?.email : "")
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
          portalConfig.engagementNationalAuditActors.set(uid, actor);
          const label = auditActorOptionLabel(actor, uid);
          if (labels.has(label)) return;
          labels.add(label);
          choices.push({ uid, label });
        });
        portalState.engagementNationalAuditActorSuggestions = choices.sort((left, right) => left.label.localeCompare(right.label, "fr"));
        if (portalContext.elements.engagementsNationalAuditActorOptions) {
          portalContext.elements.engagementsNationalAuditActorOptions.innerHTML = portalState.engagementNationalAuditActorSuggestions
            .map((choice) => `<option value="${portalActions.escapeHtml(choice.label)}"></option>`)
            .join("");
        }
      }

    function setEngagementNationalAuditActorSelection(choice = null) {
        const uid = String(choice?.uid || "");
        if (portalContext.elements.engagementsNationalAuditActor) portalContext.elements.engagementsNationalAuditActor.value = uid;
        if (portalContext.elements.engagementsNationalAuditActorSearch) {
          portalContext.elements.engagementsNationalAuditActorSearch.dataset.selected = uid ? "true" : "false";
          portalContext.elements.engagementsNationalAuditActorSearch.title = uid ? "Utilisateur sélectionné" : "";
        }
        if (portalContext.elements.engagementsNationalAuditActorSelected) portalContext.elements.engagementsNationalAuditActorSelected.hidden = !uid;
      }

    async function searchEngagementNationalAuditActors(query = "", sequence = 0) {
        if (query.length < 2) return;
        if (portalContext.elements.engagementsNationalAuditActorSearch) portalContext.elements.engagementsNationalAuditActorSearch.setAttribute("aria-busy", "true");
        try {
          const result = await portalActions.callFunction("listAccessUsers", { pageSize: 25, search: query });
          if (sequence !== portalState.engagementNationalAuditActorSearchSequence) return;
          renderEngagementNationalAuditActorSuggestions(Array.isArray(result.users) ? result.users : []);
        } catch {
          if (sequence === portalState.engagementNationalAuditActorSearchSequence) renderEngagementNationalAuditActorSuggestions([]);
        } finally {
          if (sequence === portalState.engagementNationalAuditActorSearchSequence && portalContext.elements.engagementsNationalAuditActorSearch) {
            portalContext.elements.engagementsNationalAuditActorSearch.removeAttribute("aria-busy");
          }
        }
      }

    function handleEngagementNationalAuditActorSearch() {
        const searchInput = portalContext.elements.engagementsNationalAuditActorSearch;
        const actorInput = portalContext.elements.engagementsNationalAuditActor;
        if (!searchInput || !actorInput) return;
        const value = searchInput.value.trim();
        const selected = portalState.engagementNationalAuditActorSuggestions.find((choice) => choice.label === value);
        portalState.engagementNationalAuditActorSearchSequence += 1;
        global.clearTimeout(portalState.engagementNationalAuditActorSearchTimer);
        if (selected) {
          setEngagementNationalAuditActorSelection(selected);
          if (portalState.engagementNationalAuditAppliedActorUid !== selected.uid) void loadEngagementNationalAuditLogs({ force: true });
          return;
        }
        setEngagementNationalAuditActorSelection();
        if (!value) {
          renderEngagementNationalAuditActorSuggestions([...portalConfig.engagementNationalAuditActors.values()]);
          if (portalState.engagementNationalAuditAppliedActorUid) void loadEngagementNationalAuditLogs({ force: true });
          return;
        }
        if (value.length < 2) {
          renderEngagementNationalAuditActorSuggestions([]);
          return;
        }
        const sequence = portalState.engagementNationalAuditActorSearchSequence;
        portalState.engagementNationalAuditActorSearchTimer = global.setTimeout(() => {
          void searchEngagementNationalAuditActors(value, sequence);
        }, 300);
      }

    function auditClubId(log = {}) {
        return String(log.target?.clubId || log.target?.sourceClubId || "");
      }

    function auditClubLabel(log = {}) {
        const clubId = auditClubId(log);
        return log.target?.clubName || portalConfig.engagementNationalAuditClubs.get(clubId)
          || (clubId ? portalActions.clubDisplayLabel({ clubId }, { fallback: "" }) : "");
      }

    function auditCompetitionLabel(target = {}) {
        const competitionId = String(target.competitionId || "");
        const auditCompetition = portalConfig.engagementNationalAuditCompetitions.get(competitionId);
        const cachedCompetition = portalState.engagementCompetitions.find((competition) => competition.id === competitionId);
        return target.competitionName || target.name || auditCompetition?.name || cachedCompetition?.name || (competitionId ? "Compétition" : "");
      }

    function auditTargetSummary(target = {}, action = "") {
        if (!target || typeof target !== "object") target = {};
        const personName = [target.firstName || target.targetFirstName, target.lastName || target.targetLastName]
          .filter(Boolean).join(" ");
        const competition = auditCompetitionLabel(target);
        if (personName) return personName;
        if (competition) return competition;
        if (target.personId) return auditPersonLabel(target);
        if (target.swimmerName || target.personName) return target.swimmerName || target.personName;
        if (target.clubName) return target.clubName;
        if (target.email || target.targetEmail) return target.email || target.targetEmail;
        if (target.fileName) return target.fileName;
        if (target.clubId || target.sourceClubId) {
          const clubLabel = portalActions.clubDisplayLabel({ clubId: target.clubId || target.sourceClubId }, { fallback: "" });
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
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
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
        const person = portalConfig.engagementNationalAuditPeople.get(personId) || {};
        return [target.firstName, target.lastName].filter(Boolean).join(" ")
          || target.personName || person.name || target.licenseNumber || person.licenseNumber || "Personne concernée";
      }

    function auditReadableValue(key = "", value, log = {}) {
        const target = log.target && typeof log.target === "object" ? log.target : {};
        if (key === "roles") return auditEnabledLabels(value, portalConfig.AUDIT_ROLE_LABELS);
        if (key === "capabilities") return auditEnabledLabels(value, portalConfig.AUDIT_CAPABILITY_LABELS);
        if (key === "status") return global.LivePalmesActivityJournal.value(value);
        if (key === "active") return value === true ? "Actif" : value === false ? "Inactif" : auditDetailValue(value);
        if (key === "hidden") return value === true ? "Masquée" : value === false ? "Visible" : auditDetailValue(value);
        if (key === "personId") return auditPersonLabel(target);
        if (["clubId", "sourceClubId", "targetClubId"].includes(key)) {
          return (String(value) === String(target.clubId) ? target.clubName : "") || portalConfig.engagementNationalAuditClubs.get(String(value))
            || portalActions.clubDisplayLabel({ clubId: value }, { fallback: value ? `Club réf. ${value}` : "Non renseigné" });
        }
        if (key === "competitionId") return auditCompetitionLabel(target) || "Compétition concernée";
        if (["swimmerId", "swimmerIndexId"].includes(key)) return target.swimmerName || target.personName || "Nageur concerné";
        if (key === "uid") {
          const user = portalConfig.engagementNationalAuditActors.get(String(value)) || {};
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
        return portalConfig.AUDIT_DETAIL_LABELS[key]
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
          rows.push(`<div class="admin-national-audit-change"><dt>${portalActions.escapeHtml(auditDetailLabel(key))}</dt><dd><span>${portalActions.escapeHtml(beforeValue)}</span><span class="admin-national-audit-change-arrow" aria-hidden="true">→</span><strong>${portalActions.escapeHtml(afterValue)}</strong></dd></div>`);
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
          const comparableKeys = [...keys];
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
        const preferredKeys = Object.keys(portalConfig.AUDIT_DETAIL_LABELS)
          .filter((key) => Object.hasOwn(target, key) && !changes.consumedKeys.has(key) && !auditDetailIsTechnicalKey(key));
        const rows = preferredKeys.map((key) => {
          const rawValue = auditReadableValue(key, target[key], log);
          const value = rawValue.length > 500 ? `${rawValue.slice(0, 497)}…` : rawValue;
          const label = auditDetailLabel(key);
          return `<div><dt>${portalActions.escapeHtml(label)}</dt><dd>${portalActions.escapeHtml(value)}</dd></div>`;
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
          .filter((key) => auditDetailIsTechnicalKey(key) || !Object.hasOwn(portalConfig.AUDIT_DETAIL_LABELS, key))
          .filter(auditTechnicalKeyIsReadable)
          .filter((key) => !["fileHash", "performanceBaseSync", "clubActivityReactivation"].includes(key))
          .slice(0, 12);
        const rows = technicalKeys.map((key) => {
          const rawValue = auditReadableValue(key, target[key], first);
          const value = rawValue.length > 500 ? `${rawValue.slice(0, 497)}…` : rawValue;
          return `<div><dt>${portalActions.escapeHtml(auditComplementaryLabel(key))}</dt><dd>${portalActions.escapeHtml(value)}</dd></div>`;
        });
        const actionCodes = [...new Set(logs.map((log) => String(log.action || "")).filter(Boolean))];
        if (logs.length > 1) rows.push(`<div><dt>Traces regroupées</dt><dd>${logs.length}</dd></div>`);
        rows.push(`<div><dt>Type${actionCodes.length > 1 ? "s" : ""} d’action</dt><dd>${actionCodes.map((action) => portalActions.escapeHtml(auditActionLabel(action))).join("<br>") || "-"}</dd></div>`);
        if (first.actorUid) rows.push(`<div><dt>Action réalisée par</dt><dd>${portalActions.escapeHtml(auditActorLabel(first))}</dd></div>`);
        return `<details class="admin-national-audit-technical-disclosure"><summary>Détails complémentaires</summary><dl>${rows.join("")}</dl></details>`;
      }

    function filteredEngagementNationalAuditLogs() {
        const query = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsNationalAuditSearch?.value || "");
        const type = portalContext.elements.engagementsNationalAuditType?.value || "";
        const origin = portalContext.elements.engagementsNationalAuditOrigin?.value || "";
        return portalState.engagementNationalAuditLogs.filter((log) => {
          if (type && auditActionCategory(log.action) !== type) return false;
          if (origin && auditActorOrigin(log) !== origin) return false;
          if (!query) return true;
          const haystack = portalActions.normalizedEngagementClubSearch([
            auditActionLabel(log.action), log.action, auditActorLabel(log), auditTargetSummary(log.target, log.action),
            auditClubLabel(log), JSON.stringify(log.target || {})
          ].join(" "));
          return haystack.includes(query);
        });
      }

    function auditEntryHtml(group = {}) {
        const logs = group.logs || [];
        const first = logs[0] || {};
        let actionLabel = auditActionLabel(first.action);
        if (first.action === "nap.swimmerActivity.complete") {
          const active = first.target?.after?.active ?? (first.target?.status === "active" ? true : first.target?.status === "inactive" ? false : null);
          if (active !== null) actionLabel = first.outcome === "completed"
            ? (active ? "Nageur réactivé" : "Nageur désactivé")
            : (active ? "Réactivation du nageur" : "Désactivation du nageur");
        }
        const targetLabel = auditTargetSummary(first.target, first.action);
        const clubLabel = auditClubLabel(first);
        const category = auditActionCategory(first.action);
        const status = first.outcome === "unconfirmed" ? "Résultat non confirmé" : first.outcome === "completed" ? "Terminé" : "Trace enregistrée";
        const humanDetails = auditDetailRows(first);
        const planChanges = global.LivePalmesActivityJournal.changes(first.target || {});
        const operationDetails = planChanges.length ? `<dl class="admin-national-audit-detail-grid">${planChanges.map((row) => `<div><dt>${portalActions.escapeHtml(row.label)}</dt><dd>${portalActions.escapeHtml(row.before)} → <strong>${portalActions.escapeHtml(row.after)}</strong></dd></div>`).join("")}</dl>` : "";
        const detailHtml = `<p class="admin-national-audit-outcome">${status}${first.outcome === "unconfirmed" ? " : une préparation existe, aucun reçu de fin n’a été retrouvé. Les changements ci-dessous sont ceux préparés ; leur application n’est pas confirmée." : ""}${first.action.startsWith("nap.") && !first.historyComplete ? ". Détails historiques partiels : ils peuvent être complétés en chargeant les traces précédentes." : ""}</p>${humanDetails ? `<dl class="admin-national-audit-detail-grid">${humanDetails}</dl>` : ""}${operationDetails}${auditTechnicalDetailsHtml(logs)}`;
        return `
      <details class="admin-national-audit-entry" data-audit-category="${portalActions.escapeHtml(category)}">
        <summary>
          <time datetime="${portalActions.escapeHtml(first.createdAt || "")}">${portalActions.escapeHtml(auditDateLabel(first.createdAt))}</time>
          <span class="admin-national-audit-entry-main"><strong>${portalActions.escapeHtml(actionLabel)}</strong><small>${portalActions.escapeHtml(targetLabel)} · ${status}</small></span>
          <span class="admin-national-audit-actor">${portalActions.escapeHtml(auditActorLabel(first))}</span>
          ${clubLabel ? `<span class="admin-national-audit-club">${portalActions.escapeHtml(clubLabel)}</span>` : ""}
          <span class="admin-national-audit-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div class="admin-national-audit-entry-details">
          ${detailHtml}
        </div>
      </details>`;
      }

    function updateEngagementNationalAuditFilterOptions() {
        portalState.accessClubReference.forEach((club) => {
          const clubId = String(club.clubId || "");
          const clubLabel = portalActions.clubDisplayLabel(club, { fallback: "" });
          if (clubId && clubLabel) portalConfig.engagementNationalAuditClubs.set(clubId, clubLabel);
        });
        portalState.engagementNationalAuditLogs.forEach((log) => {
          const clubId = String(log.target?.clubId || "");
          if (clubId && !portalConfig.engagementNationalAuditClubs.has(clubId)) {
            const clubLabel = log.target?.clubName || portalActions.clubDisplayLabel({ clubId }, { fallback: "" });
            if (clubLabel) portalConfig.engagementNationalAuditClubs.set(clubId, clubLabel);
          }
        });
        const replaceOptions = (select, options, emptyLabel) => {
          if (!select) return;
          const selected = select.value;
          select.innerHTML = `<option value="">${portalActions.escapeHtml(emptyLabel)}</option>${options.map(([value, label]) => `<option value="${portalActions.escapeHtml(value)}">${portalActions.escapeHtml(label)}</option>`).join("")}`;
          select.value = selected;
        };
        replaceOptions(portalContext.elements.engagementsNationalAuditClub,
          [...portalConfig.engagementNationalAuditClubs.entries()].sort((left, right) => left[1].localeCompare(right[1], "fr")),
          "Tous les clubs");
        if (!portalContext.elements.engagementsNationalAuditActorSearch?.value.trim()) {
          renderEngagementNationalAuditActorSuggestions([...portalConfig.engagementNationalAuditActors.values()]);
        }
      }

    function resetEngagementNationalAuditFilters() {
        if (portalContext.elements.engagementsNationalAuditSearch) portalContext.elements.engagementsNationalAuditSearch.value = "";
        if (portalContext.elements.engagementsNationalAuditPeriod) portalContext.elements.engagementsNationalAuditPeriod.value = "7";
        if (portalContext.elements.engagementsNationalAuditClub) portalContext.elements.engagementsNationalAuditClub.value = "";
        setEngagementNationalAuditActorSelection();
        if (portalContext.elements.engagementsNationalAuditActorSearch) portalContext.elements.engagementsNationalAuditActorSearch.value = "";
        if (portalContext.elements.engagementsNationalAuditType) portalContext.elements.engagementsNationalAuditType.value = "";
        if (portalContext.elements.engagementsNationalAuditOrigin) portalContext.elements.engagementsNationalAuditOrigin.value = "";
        void loadEngagementNationalAuditLogs({ force: true });
      }

    function resetEngagementNationalAuditData() {
        portalState.engagementNationalAuditLogs = [];
        portalState.engagementNationalAuditLogsLoaded = false;
        portalState.engagementNationalAuditLogsLoading = false;
        portalState.engagementNationalAuditNextCursor = null;
        portalState.engagementNationalAuditHasMore = false;
        portalState.engagementNationalAuditVisibleFrom = "";
        portalState.engagementNationalAuditAppliedActorUid = "";
        portalState.engagementNationalAuditActorSearchSequence += 1;
        global.clearTimeout(portalState.engagementNationalAuditActorSearchTimer);
        portalState.engagementNationalAuditActorSuggestions = [];
        setEngagementNationalAuditActorSelection();
        portalConfig.engagementNationalAuditActors.clear();
        portalConfig.engagementNationalAuditClubs.clear();
        portalConfig.engagementNationalAuditCompetitions.clear();
        portalConfig.engagementNationalAuditPeople.clear();
      }

    function renderEngagementNationalAuditLogs() {
        if (!portalContext.elements.engagementsNationalAuditList) return;
        if (!portalActions.canViewActivityLog()) {
          portalContext.elements.engagementsNationalAuditList.innerHTML = "";
          return;
        }
        updateEngagementNationalAuditFilterOptions();
        const filteredLogs = filteredEngagementNationalAuditLogs();
        const groups = global.LivePalmesActivityJournal.byDayAndActor(filteredLogs);
        if (!portalState.engagementNationalAuditLogs.length) {
          portalContext.elements.engagementsNationalAuditList.innerHTML = '<p class="admin-engagements-empty">Aucune action enregistrée sur cette période.</p>';
        } else if (!groups.length) {
          portalContext.elements.engagementsNationalAuditList.innerHTML = '<p class="admin-engagements-empty">Aucune action ne correspond aux filtres.</p>';
        } else {
          portalContext.elements.engagementsNationalAuditList.innerHTML = `<div class="admin-national-audit-list">${groups.map((group) => `<section class="admin-national-audit-day"><h3>${portalActions.escapeHtml(auditDateLabel(group.logs[0].createdAt).split(" ")[0])} · ${portalActions.escapeHtml(auditActorLabel(group.logs[0]))}<small>${group.logs.length} opération${group.logs.length > 1 ? "s" : ""}</small></h3>${group.logs.map((log) => auditEntryHtml({ logs: [log] })).join("")}</section>`).join("")}</div>`;
        }
        if (portalContext.elements.engagementsNationalAuditStatus && !portalState.engagementNationalAuditLogsLoading) {
          const loaded = portalState.engagementNationalAuditLogs.length;
          const groupedCount = filteredLogs.length;
          const visibleFromLabel = portalState.engagementNationalAuditVisibleFrom ? auditDateLabel(portalState.engagementNationalAuditVisibleFrom).split(" ")[0] : "";
          portalContext.elements.engagementsNationalAuditStatus.textContent = `${groupedCount} opération${groupedCount > 1 ? "s" : ""} affichée${groupedCount > 1 ? "s" : ""} parmi ${loaded} chargée${loaded > 1 ? "s" : ""}${visibleFromLabel ? ` depuis le ${visibleFromLabel}` : ""}. ${portalState.engagementNationalAuditHasMore ? "Historique partiel : charger la suite pour poursuivre la recherche." : "Fin de la période atteinte."} Recherche, catégorie et origine portent sur les opérations chargées.`;
          portalContext.elements.engagementsNationalAuditStatus.dataset.tone = "ok";
        }
        if (portalContext.elements.engagementsNationalAuditLoadMore) portalContext.elements.engagementsNationalAuditLoadMore.hidden = !portalState.engagementNationalAuditHasMore;
      }

    async function loadEngagementNationalAuditLogs({ force = false, silent = false, append = false } = {}) {
        if (!portalActions.canViewActivityLog() || portalState.engagementNationalAuditLogsLoading) return;
        if (portalState.engagementNationalAuditLogsLoaded && !force && !append) return;
        if (append && (!portalState.engagementNationalAuditHasMore || !portalState.engagementNationalAuditNextCursor)) return;
        portalState.engagementNationalAuditLogsLoading = true;
        if (force) {
          portalState.engagementNationalAuditLogs = [];
          portalState.engagementNationalAuditNextCursor = null;
          portalState.engagementNationalAuditHasMore = false;
        }
        if (portalContext.elements.engagementsNationalAuditRefresh) portalContext.elements.engagementsNationalAuditRefresh.disabled = true;
        if (portalContext.elements.engagementsNationalAuditLoadMore) portalContext.elements.engagementsNationalAuditLoadMore.disabled = true;
        if (portalContext.elements.engagementsNationalAuditStatus && !silent) {
          portalContext.elements.engagementsNationalAuditStatus.textContent = append ? "Chargement des actions précédentes..." : "Chargement du journal...";
          portalContext.elements.engagementsNationalAuditStatus.dataset.tone = "loading";
        }
        try {
          const requestFilters = {
            limit: 50,
            days: Number(portalContext.elements.engagementsNationalAuditPeriod?.value || 7),
            actorUid: portalContext.elements.engagementsNationalAuditActor?.value || "",
            clubId: portalContext.elements.engagementsNationalAuditClub?.value || "",
            cursor: append ? portalState.engagementNationalAuditNextCursor : null,
            knownActorUids: [...portalConfig.engagementNationalAuditActors.entries()]
              .filter(([, actor]) => actor.name || actor.email)
              .map(([uid]) => uid)
              .slice(0, 100),
            knownCompetitionIds: [...portalConfig.engagementNationalAuditCompetitions.entries()]
              .filter(([, competition]) => competition.name)
              .map(([competitionId]) => competitionId)
              .slice(0, 100),
            knownPersonIds: [...portalConfig.engagementNationalAuditPeople.entries()]
              .map(([personId]) => personId)
              .slice(0, 100)
          };
          // Club labels must not delay the journal or change its captured filters.
          void Promise.resolve().then(() => portalActions.loadAccessClubReference()).then(() => {
            if (portalState.engagementNationalAuditLogsLoaded) updateEngagementNationalAuditFilterOptions();
          }).catch(() => {});
          const result = await portalActions.callFunction("listEngagementNationalAuditLogs", requestFilters);
          portalState.engagementNationalAuditAppliedActorUid = requestFilters.actorUid;
          (Array.isArray(result.actors) ? result.actors : []).forEach((actor) => {
            if (actor?.uid) portalConfig.engagementNationalAuditActors.set(actor.uid, actor);
          });
          (Array.isArray(result.competitions) ? result.competitions : []).forEach((competition) => {
            if (competition?.id) portalConfig.engagementNationalAuditCompetitions.set(competition.id, competition);
          });
          (Array.isArray(result.people) ? result.people : []).forEach((person) => {
            if (person?.id) portalConfig.engagementNationalAuditPeople.set(person.id, person);
          });
          const returnedLogs = Array.isArray(result.logs) ? result.logs : [];
          returnedLogs.forEach((log) => {
            const uid = String(log.actorUid || "");
            if (uid && !uid.startsWith("system:") && uid !== "public-login-page" && !portalConfig.engagementNationalAuditActors.has(uid)) {
              portalConfig.engagementNationalAuditActors.set(uid, { uid, name: "", email: "" });
            }
          });
          portalState.engagementNationalAuditLogs = global.LivePalmesActivityJournal.merge(append ? portalState.engagementNationalAuditLogs : [], returnedLogs);
          portalState.engagementNationalAuditNextCursor = result.nextCursor || null;
          portalState.engagementNationalAuditHasMore = result.hasMore === true;
          portalState.engagementNationalAuditVisibleFrom = result.visibleFrom || "";
          portalState.engagementNationalAuditLogsLoaded = true;
        } catch (error) {
          if (portalContext.elements.engagementsNationalAuditStatus && !silent) {
            portalContext.elements.engagementsNationalAuditStatus.textContent = `Lecture du journal impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalAuditStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalAuditLogsLoading = false;
          if (portalContext.elements.engagementsNationalAuditRefresh) portalContext.elements.engagementsNationalAuditRefresh.disabled = false;
          if (portalContext.elements.engagementsNationalAuditLoadMore) portalContext.elements.engagementsNationalAuditLoadMore.disabled = false;
          if (portalState.engagementNationalAuditLogsLoaded) renderEngagementNationalAuditLogs();
        }
      }

    function engagementClubPersonRoleLabel(person = {}) {
        const roles = [];
        if (person.roles?.swimmer || person.swimmerIndexId) roles.push("Nageur");
        if (person.roles?.teamLeader) roles.push("Chef d'équipe");
        if (person.roles?.official) roles.push("Officiel");
        return roles.join(" - ") || "-";
      }

    function closeEngagementClubPersonDialog() {
        const form=portalContext.elements.engagementsClubPersonForm;
        if(!portalState.engagementClubPersonFormHome || !form) return;
        portalContext.elements.engagementsClubPersonDialog?.close();
        portalState.engagementClubPersonFormHome.parent.insertBefore(form,portalState.engagementClubPersonFormHome.next);
        portalState.engagementClubPersonFormHome.opener?.focus?.();
        portalState.engagementClubPersonFormHome=null;
        form.hidden=true;
      }

    function openNativeCompetitionPersonCreation() {
        if(global.LivePalmesEnvironment?.sportingDataSource !== "nap" || portalState.engagementClubPersonSaving || !portalActions.canUse("engagements.club.manage")) return;
        const form=portalContext.elements.engagementsClubPersonForm,dialog=portalContext.elements.engagementsClubPersonDialog;
        if(!form || !dialog || portalState.engagementClubPersonFormHome) return;
        portalActions.openEngagementClubPersonForm();
        if(portalContext.elements.engagementsClubPersonRoleTeamLeader) portalContext.elements.engagementsClubPersonRoleTeamLeader.checked=true;
        if(portalContext.elements.engagementsClubPersonRoleOfficial) portalContext.elements.engagementsClubPersonRoleOfficial.checked=false;
        if(portalState.engagementClubPersonFormHome) portalState.engagementClubPersonFormHome.fromCompetition=true;
        portalContext.elements.engagementsClubPersonFirstName?.focus();
      }

    function resetEngagementClubPersonForm() {
        portalContext.elements.engagementsClubPersonForm?.reset();
        if (portalContext.elements.engagementsClubPersonId) portalContext.elements.engagementsClubPersonId.value = "";
        if (portalContext.elements.engagementsClubPersonSwimmerId) portalContext.elements.engagementsClubPersonSwimmerId.value = "";
        if (portalContext.elements.engagementsClubPersonSwimmerSource) portalContext.elements.engagementsClubPersonSwimmerSource.value = "";
        portalActions.applyEngagementClubPersonSwimmer("");
        if (portalContext.elements.engagementsClubPersonRoleTeamLeader) portalContext.elements.engagementsClubPersonRoleTeamLeader.checked = false;
        if (portalContext.elements.engagementsClubPersonRoleOfficial) portalContext.elements.engagementsClubPersonRoleOfficial.checked = true;
        if (portalContext.elements.engagementsClubPersonMessage) portalContext.elements.engagementsClubPersonMessage.textContent = "";
      }

    return {
      auditActionLabel,
      auditActionCategory,
      auditActorOrigin,
      auditActorLabel,
      auditActorOptionLabel,
      renderEngagementNationalAuditActorSuggestions,
      setEngagementNationalAuditActorSelection,
      searchEngagementNationalAuditActors,
      handleEngagementNationalAuditActorSearch,
      auditClubId,
      auditClubLabel,
      auditCompetitionLabel,
      auditTargetSummary,
      auditDateLabel,
      auditDetailValue,
      auditEnabledLabels,
      auditPersonLabel,
      auditReadableValue,
      auditDetailLabel,
      auditComplementaryLabel,
      auditValuesEqual,
      auditChangeRows,
      auditDetailIsTechnicalKey,
      auditTechnicalKeyIsReadable,
      auditDetailRows,
      auditTechnicalDetailsHtml,
      filteredEngagementNationalAuditLogs,
      auditEntryHtml,
      updateEngagementNationalAuditFilterOptions,
      resetEngagementNationalAuditFilters,
      resetEngagementNationalAuditData,
      renderEngagementNationalAuditLogs,
      loadEngagementNationalAuditLogs,
      engagementClubPersonRoleLabel,
      closeEngagementClubPersonDialog,
      openNativeCompetitionPersonCreation,
      resetEngagementClubPersonForm
    };
  }
  global.LivePalmesPortalActivityJournal = { create };
})(window);
