(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function formatEngagementAutomationDate(value) {
        return value ? portalActions.formatDeadline(value).replace(/^Limite /, "") : "-";
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
      <article class="admin-engagements-closure-card" data-closure-status="${portalActions.escapeHtml(portalActions.engagementClosureAutomationStatusTone(status))}">
        <div class="admin-engagements-closure-card-head">
          <strong>Fermeture automatique</strong>
          <span>${portalActions.escapeHtml(portalActions.engagementClosureAutomationStatusLabel(status))}</span>
        </div>
        <dl>
          ${rows.map(([label, value]) => `
            <div>
              <dt>${portalActions.escapeHtml(label)}</dt>
              <dd>${portalActions.escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      </article>
    `;
      }

    async function loadEngagementClubRecapFiles({ force = false } = {}) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || portalState.engagementClubRecapEntriesLoading) return;
        if (!force && portalState.engagementClubRecapEntriesCompetitionId === portalState.selectedEngagementCompetitionId) {
          renderEngagementClubRecapSelector();
          return;
        }
        portalState.engagementClubRecapEntriesLoading = true;
        renderEngagementClubRecapSelector();
        try {
          const result = await portalActions.callFunction("listEngagementCompetitionClubRecaps", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          portalState.engagementClubRecapEntries = Array.isArray(result.entries) ? result.entries : [];
          portalState.engagementClubRecapEntriesCompetitionId = portalState.selectedEngagementCompetitionId;
        } catch (error) {
          portalState.engagementClubRecapEntries = [];
          portalState.engagementClubRecapEntriesCompetitionId = portalState.selectedEngagementCompetitionId;
          if (portalContext.elements.engagementsClubRecapFiles) {
            portalContext.elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="error">Lecture recap clubs impossible : ${portalActions.escapeHtml(error?.message || error)}</p>`;
          }
          return;
        } finally {
          portalState.engagementClubRecapEntriesLoading = false;
        }
        renderEngagementClubRecapSelector();
      }

    function renderEngagementClubRecapSelector() {
        const select = portalContext.elements.engagementsClubPdfSelect;
        const button = portalContext.elements.engagementsClubPdfDownloadButton;
        const status = portalContext.elements.engagementsClubRecapFiles;
        if (!select || !button || !status) return;
        const previousValue = select.value;
        select.innerHTML = "";
        if (portalState.engagementClubRecapEntriesLoading) {
          select.append(new Option("Chargement des clubs…", ""));
          button.disabled = true;
          status.innerHTML = '<p class="admin-engagements-empty">Chargement des dossiers clubs…</p>';
          return;
        }
        if (!portalState.engagementClubRecapEntries.length) {
          select.append(new Option("Aucun club engagé", ""));
          button.disabled = true;
          status.innerHTML = '<p class="admin-engagements-empty">Aucun dossier club n’est disponible pour le moment.</p>';
          return;
        }
        portalState.engagementClubRecapEntries.forEach((entry) => {
          select.append(new Option(portalActions.clubDisplayLabel(entry, { fallback: "Club" }), entry.clubId || ""));
        });
        select.value = Array.from(select.options).some((option) => option.value === previousValue)
          ? previousValue
          : select.options[0]?.value || "";
        button.disabled = !select.value;
        const selectedEntry = portalState.engagementClubRecapEntries.find((entry) => entry.clubId === select.value) || portalState.engagementClubRecapEntries[0];
        status.innerHTML = selectedEntry
          ? `<small>${portalActions.escapeHtml(`${selectedEntry.swimmerCount || 0} nageur${Number(selectedEntry.swimmerCount || 0) > 1 ? "s" : ""} · ${selectedEntry.individualCount || 0} course${Number(selectedEntry.individualCount || 0) > 1 ? "s" : ""} · ${selectedEntry.relayCount || 0} relais`)}</small>`
          : "";
      }

    function engagementStatisticsTimeModeLabel(mode = "") {
        return {
          known: "Temps connu",
          manual: "Saisie manuelle",
          native: "Origine non connue",
          default595999: "Temps par défaut"
        }[String(mode || "")] || "";
      }

    function renderEngagementCompetitionStatistics() {
        const summary = portalContext.elements.engagementsStatisticsSummary;
        const alerts = portalContext.elements.engagementsStatisticsAlerts;
        const select = portalContext.elements.engagementsStatisticsEventSelect;
        const eventRows = portalContext.elements.engagementsStatisticsEventRows;
        const clubRows = portalContext.elements.engagementsStatisticsClubRows;
        if (!summary || !alerts || !select || !eventRows || !clubRows) return;
        if (portalState.engagementCompetitionStatisticsLoading) {
          summary.innerHTML = '<p class="admin-engagements-empty">Calcul des statistiques en cours…</p>';
          alerts.innerHTML = "";
          eventRows.innerHTML = "";
          clubRows.innerHTML = "";
          if (portalContext.elements.engagementsStatisticsRefreshButton) portalContext.elements.engagementsStatisticsRefreshButton.disabled = true;
          return;
        }
        if (portalContext.elements.engagementsStatisticsRefreshButton) portalContext.elements.engagementsStatisticsRefreshButton.disabled = false;
        const statistics = portalState.engagementCompetitionStatistics;
        if (!statistics) {
          summary.innerHTML = '<p class="admin-engagements-empty">Ouvrez cet onglet pour calculer les statistiques.</p>';
          alerts.innerHTML = "";
          eventRows.innerHTML = "";
          clubRows.innerHTML = "";
          return;
        }
        if (statistics.error) {
          summary.innerHTML = `<p class="admin-portal-message" data-tone="error">Calcul impossible : ${portalActions.escapeHtml(statistics.error)}</p>`;
          alerts.innerHTML = "";
          eventRows.innerHTML = "";
          clubRows.innerHTML = "";
          return;
        }
        const counts = statistics.counts || {};
        const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
        const cards = [
          ["Participants", counts.swimmerCount || 0, `${counts.femaleCount || 0} F · ${counts.maleCount || 0} H`],
          ["Clubs", counts.clubCount || 0, "dossiers engagés"],
          ["Courses", counts.individualEntryCount || 0, "engagements individuels"],
          ["Relais", counts.relayCount || 0, "équipes engagées"],
          ["Officiels", counts.officialCount || 0, "déclarés"]
        ];
        summary.innerHTML = cards.map(([label, value, detail]) => `
      <article><small>${portalActions.escapeHtml(label)}</small><strong>${portalActions.escapeHtml(String(value))}</strong><span>${portalActions.escapeHtml(detail)}</span></article>
    `).join("");
        const warningParts = [
          counts.incompleteClubCount ? `${counts.incompleteClubCount} dossier${counts.incompleteClubCount > 1 ? "s" : ""} à vérifier` : "",
          !openWater && counts.manualTimeCount ? `${counts.manualTimeCount} temps saisi${counts.manualTimeCount > 1 ? "s" : ""} manuellement` : "",
          !openWater && counts.unknownTimeOriginCount ? `${counts.unknownTimeOriginCount} temps : origine non connue` : "",
          !openWater && counts.defaultTimeCount ? `${counts.defaultTimeCount} temps par défaut 59:59.99` : "",
          counts.unknownSexCount ? `${counts.unknownSexCount} sexe${counts.unknownSexCount > 1 ? "s" : ""} non renseigné${counts.unknownSexCount > 1 ? "s" : ""}` : "",
          statistics.truncated ? "Liste détaillée limitée aux 10 000 premiers engagements" : ""
        ].filter(Boolean);
        alerts.innerHTML = warningParts.length
          ? `<div class="admin-engagements-statistics-warning"><strong>Points de contrôle</strong><span>${portalActions.escapeHtml(warningParts.join(" · "))}</span></div>`
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
            <span data-label="Ordre">${index + 1}</span><span data-label="Club"><strong>${portalActions.escapeHtml(portalActions.clubDisplayCode(row, "-"))}</strong></span>
            <span data-label="Catégorie">${portalActions.escapeHtml([row.category, engagementProgramGenderModeDisplayLabel(row.genderMode, row.eventCode)].filter(Boolean).join(" · ") || "-")}</span>
            <span data-label="Composition">${portalActions.escapeHtml((row.members || []).map((member) => [member.lastName, member.firstName].filter(Boolean).join(" ")).join(", ") || "-")}</span>
            <span data-label="${openWater ? "Inscription" : "Temps"}"><strong>${openWater ? "Oui" : portalActions.escapeHtml(row.entryTime || "-")}</strong></span>
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
          <div class="admin-engagements-statistics-gender-heading is-${portalActions.escapeHtml(group.tone)}" role="row"><strong>${portalActions.escapeHtml(group.label)}</strong><span>${group.rows.length} engagé${group.rows.length > 1 ? "s" : ""}</span></div>
          ${group.rows.map((row, index) => `
          <div class="admin-engagements-statistics-row admin-engagements-statistics-individual-row" role="row" data-sex="${portalActions.escapeHtml(group.sex || "unknown")}">
            <span data-label="Ordre">${index + 1}</span>
            <span data-label="Nageur"><strong>${portalActions.escapeHtml([row.lastName, row.firstName].filter(Boolean).join(" ") || "-")}</strong></span>
            <span data-label="Club"><strong>${portalActions.escapeHtml(portalActions.clubDisplayCode(row, "-"))}</strong></span>
            <span data-label="Catégorie">${portalActions.escapeHtml(row.category || "-")}</span>
            <span data-label="${openWater ? "Inscription" : "Temps"}" ${openWater ? "" : `title="${portalActions.escapeHtml(engagementStatisticsTimeModeLabel(row.entryTimeMode))}"`}><strong>${openWater ? "Oui" : portalActions.escapeHtml(row.entryTime || "-")}</strong></span>
          </div>`).join("")}`).join("")}`;
        }
        const clubs = Array.isArray(statistics.clubs) ? statistics.clubs : [];
        clubRows.innerHTML = clubs.length ? `
      <div class="admin-engagements-statistics-club-row admin-engagements-statistics-row-head" role="row"><span>Club</span><span>Nageurs</span><span>Courses</span><span>Relais</span><span>Officiels</span><span>Dernière modification</span></div>
      ${clubs.map((club) => `
        <div class="admin-engagements-statistics-club-row" role="row">
          <span data-label="Club"><strong>${portalActions.escapeHtml(portalActions.clubDisplayCode(club, "-"))}</strong><small>${portalActions.escapeHtml(club.clubName || portalActions.accessClubFromId(club.clubId)?.clubName || "")}</small></span>
          <span data-label="Nageurs">${portalActions.escapeHtml(`${club.swimmerCount || 0} (${club.femaleCount || 0} F · ${club.maleCount || 0} H)`)}</span>
          <span data-label="Courses">${portalActions.escapeHtml(String(club.individualCount || 0))}</span><span data-label="Relais">${portalActions.escapeHtml(String(club.relayCount || 0))}</span>
          <span data-label="Officiels">${portalActions.escapeHtml(String(club.officialCount || 0))}</span>
          <span data-label="Dernière modification">${portalActions.escapeHtml(club.updatedAt ? portalActions.formatDeadline(club.updatedAt).replace(/^Limite /, "") : "-")}</span>
        </div>`).join("")}` : '<p class="admin-engagements-empty">Aucun club engagé pour le moment.</p>';
      }

    async function loadEngagementCompetitionStatistics({ force = false } = {}) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || portalState.engagementCompetitionStatisticsLoading) return;
        if (!force && portalState.engagementCompetitionStatisticsCompetitionId === portalState.selectedEngagementCompetitionId && portalState.engagementCompetitionStatistics) {
          renderEngagementCompetitionStatistics();
          return;
        }
        portalState.engagementCompetitionStatisticsLoading = true;
        renderEngagementCompetitionStatistics();
        try {
          portalState.engagementCompetitionStatistics = await portalActions.callFunction("getEngagementCompetitionStatistics", {
            competitionId: portalState.selectedEngagementCompetitionId,
            force
          });
          portalState.engagementCompetitionStatisticsCompetitionId = portalState.selectedEngagementCompetitionId;
          if (portalContext.elements.engagementsStatisticsUpdatedAt) {
            portalContext.elements.engagementsStatisticsUpdatedAt.textContent = `Actualisé ${portalActions.formatDeadline(portalState.engagementCompetitionStatistics.generatedAt).replace(/^Limite /, "")}`;
          }
        } catch (error) {
          portalState.engagementCompetitionStatistics = { error: error?.message || String(error) };
          portalState.engagementCompetitionStatisticsCompetitionId = portalState.selectedEngagementCompetitionId;
        } finally {
          portalState.engagementCompetitionStatisticsLoading = false;
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
        const mount = portalContext.elements.engagementsMailJobsList;
        if (!mount) return;
        if (!portalActions.isEngagementAdminMode()) {
          mount.innerHTML = "";
          return;
        }
        if (portalState.engagementMailJobsLoading && !portalState.engagementMailJobs.length) {
          mount.innerHTML = '<p class="admin-engagements-empty">Chargement du suivi des envois…</p>';
          return;
        }
        if (!portalState.selectedEngagementCompetitionId) {
          mount.innerHTML = "";
          return;
        }
        if (!portalState.engagementMailJobsCompetitionId || portalState.engagementMailJobsCompetitionId !== portalState.selectedEngagementCompetitionId) {
          mount.innerHTML = '<p class="admin-engagements-empty">Suivi des envois à charger.</p>';
          return;
        }
        if (!portalState.engagementMailJobs.length) {
          mount.innerHTML = '<p class="admin-engagements-empty">Aucun courriel préparé pour le moment.</p><button class="ghost-button" type="button" data-engagement-mail-jobs-refresh>Actualiser le suivi</button>';
          return;
        }
        const sentCount = portalState.engagementMailJobs.filter((job) => job.status === "sent").length;
        const readyCount = portalState.engagementMailJobs.filter((job) => job.status === "ready").length;
        const failedCount = portalState.engagementMailJobs.filter((job) => job.status === "failed" || job.status === "partial").length;
        const blockedCount = portalState.engagementMailJobs.filter((job) => job.status === "blocked_missing_config").length;
        const uncertainCount = portalState.engagementMailJobs.filter((job) => job.status === "uncertain" ||
          (job.status === "sending" && Date.now() - Date.parse(job.updatedAt) > 5 * 60 * 1000)).length;
        const sendingCount = portalState.engagementMailJobs.filter((job) => job.status === "sending" &&
          !(Date.now() - Date.parse(job.updatedAt) > 5 * 60 * 1000)).length;
        const statusParts = [
          readyCount ? `${readyCount} en attente d'envoi` : "",
              sentCount ? `${sentCount} envoyé${sentCount > 1 ? "s" : ""}` : "",
          failedCount ? `${failedCount} erreur${failedCount > 1 ? "s" : ""}` : "",
          sendingCount ? `${sendingCount} en cours` : "",
          uncertainCount ? `${uncertainCount} à vérifier — ne pas renvoyer` : "",
          blockedCount ? `${blockedCount} configuration manquante` : ""
        ].filter(Boolean);
        mount.innerHTML = `
      <div class="admin-engagements-mail-jobs-head">
        <strong>Courriels</strong>
        <button class="ghost-button" type="button" data-engagement-mail-jobs-refresh ${portalState.engagementMailJobsLoading ? "disabled" : ""}>Actualiser le suivi</button>
        <small aria-live="polite">${portalState.engagementMailJobs.length}${portalState.engagementMailJobsTotalCount > portalState.engagementMailJobs.length ? ` sur ${portalState.engagementMailJobsTotalCount}` : ""} envois affichés${statusParts.length ? ` · Sur les lignes affichées : ${statusParts.join(" · ")}` : ""}. Un envoi peut regrouper plusieurs destinataires en CCI. Envoyé = accepté par le serveur mail.</small>
      </div>
      <div class="admin-engagements-mail-jobs-table" role="table" aria-label="Suivi des envois">
        <div class="admin-engagements-mail-jobs-row admin-engagements-mail-jobs-row-head" role="row">
          <span role="columnheader">Type</span>
          <span role="columnheader">Destinataire</span>
          <span role="columnheader">Club</span>
          <span role="columnheader">Statut</span>
        </div>
        ${portalState.engagementMailJobs.map((job) => `
          <div class="admin-engagements-mail-jobs-row" role="row" data-mail-status="${portalActions.escapeHtml(job.status || "")}">
            <span role="cell">${portalActions.escapeHtml(engagementMailJobTypeLabel(job.type))}</span>
            <span role="cell">
              <strong>${portalActions.escapeHtml(job.deliveryMode === "bcc-v1" ? `${job.recipientCount} destinataire${job.recipientCount > 1 ? "s" : ""} · CCI` : job.toEmail || "-")}</strong>
              <small>${portalActions.escapeHtml(job.subject || "-")}</small>
            </span>
            <span role="cell">${portalActions.escapeHtml(portalActions.clubDisplayLabel(job, { fallback: "-" }))}</span>
            <span role="cell">
              <span class="admin-engagements-mail-status">${portalActions.escapeHtml(job.status === "sending" && Date.now() - Date.parse(job.updatedAt) > 5 * 60 * 1000 ? "À vérifier — ne pas renvoyer" : { ready: "En attente d'envoi", sending: "Envoi en cours — ne pas relancer", uncertain: "À vérifier — ne pas renvoyer", cancelled: "Annulé", disabled: "Désactivé", sent: "Envoyé", partial: "Partiellement accepté — ne pas renvoyer le groupe", failed: "En erreur — non renvoyé automatiquement", blocked_missing_config: "Configuration manquante", cancelled_no_participants: "Annulé — aucun participant" }[job.status] || job.statusLabel || job.status || "Non envoyé")}</span>
              ${job.deliveryMode === "bcc-v1" ? `<small>${Number(job.sentCount || 0)} accepté(s) · ${Number(job.failedCount || 0)} rejeté(s) · ${Number(job.uncertainCount || 0)} à vérifier · ${Number(job.cancelledCount || 0)} annulé(s)</small>` : ""}
              ${job.reason && ["failed", "uncertain"].includes(job.status) ? `<small>${portalActions.escapeHtml(job.reason)}</small>` : ""}
              <small>${portalActions.escapeHtml(job.updatedAt ? portalActions.formatDeadline(job.updatedAt).replace(/^Limite /, "") : "")}</small>
            </span>
          </div>
        `).join("")}
      </div>
      ${portalState.engagementMailJobsHasMore ? `<button class="ghost-button" type="button" data-engagement-mail-jobs-more ${portalState.engagementMailJobsLoading ? "disabled" : ""}>${portalState.engagementMailJobsLoading ? "Chargement…" : "Afficher plus de courriels"}</button>` : ""}
    `;
      }

    async function loadEngagementMailJobs({ force = false, append = false } = {}) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || portalState.engagementMailJobsLoading) return;
        if (!force && !append && portalState.engagementMailJobsCompetitionId === portalState.selectedEngagementCompetitionId) {
          renderEngagementMailJobs();
          return;
        }
        portalState.engagementMailJobsLoading = true;
        const requestedCompetitionId = portalState.selectedEngagementCompetitionId;
        if (force || portalState.engagementMailJobsCompetitionId !== portalState.selectedEngagementCompetitionId) {
          portalState.engagementMailJobs = [];
          portalState.engagementMailJobsCursor = null;
          portalState.engagementMailJobsHasMore = false;
          portalState.engagementMailJobsTotalCount = 0;
        }
        renderEngagementMailJobs();
        try {
          const result = await portalActions.callFunction("listEngagementCompetitionMailJobs", {
            competitionId: requestedCompetitionId,
            pageSize: 100,
            ...(append && portalState.engagementMailJobsCursor ? { cursor: portalState.engagementMailJobsCursor } : {})
          });
          if (requestedCompetitionId !== portalState.selectedEngagementCompetitionId) return;
          const nextJobs = Array.isArray(result.jobs) ? result.jobs : [];
          portalState.engagementMailJobs = append ? [...new Map([...portalState.engagementMailJobs, ...nextJobs].map(job => [job.id, job])).values()] : nextJobs;
          portalState.engagementMailJobsCursor = result.nextCursor || null;
          portalState.engagementMailJobsHasMore = result.hasMore === true;
          if (result.totalCount !== null && result.totalCount !== undefined && Number.isFinite(Number(result.totalCount))) {
            portalState.engagementMailJobsTotalCount = Number(result.totalCount);
          }
          portalState.engagementMailJobsCompetitionId = portalState.selectedEngagementCompetitionId;
        } catch (error) {
          if (requestedCompetitionId !== portalState.selectedEngagementCompetitionId) return;
          if (!append) {
            portalState.engagementMailJobs = [];
            portalState.engagementMailJobsCompetitionId = portalState.selectedEngagementCompetitionId;
            if (portalContext.elements.engagementsMailJobsList) {
              portalContext.elements.engagementsMailJobsList.innerHTML = `<p class="admin-portal-message" data-tone="error">Lecture des e-mails préparés impossible : ${portalActions.escapeHtml(error?.message || error)}</p>`;
            }
            return;
          }
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Lecture de la page suivante impossible : ${error?.message || error}`;
          }
        } finally {
          portalState.engagementMailJobsLoading = false;
        }
        renderEngagementMailJobs();
      }

    function engagementCompetitionDocumentCategoryLabel(category = "") {
        return {
          poster: "Affiche",
          circular: "Circulaire",
          rules: "Règlement",
          information: "Note d'information",
          access: "Plan / accès",
          results: "Résultats",
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
          results: "Résultats",
          other: "Autre"
        }).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("");
      }

    function engagementCompetitionDocumentFileSize(size = 0) {
        const bytes = Number(size);
        if (!Number.isFinite(bytes) || bytes <= 0) return "";
        if (bytes < 1024) return `${bytes} o`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
        return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
      }

    function engagementCompetitionDocumentTypeLabel(fileName = "") {
        return String(fileName || "").split(".").pop()?.toUpperCase() || "FICHIER";
      }

    function renderEngagementCompetitionDocumentDrafts() {
        const mount = portalContext.elements.engagementsDocumentDrafts;
        if (!mount) return;
        const documents = Array.isArray(portalState.selectedEngagementCompetition?.clubDocuments) ? portalState.selectedEngagementCompetition.clubDocuments : [];
        const editing = documents.find((document) => document.id === portalState.engagementCompetitionDocumentEditingId) || null;
        const drafts = editing
          ? [{
              file: portalState.engagementCompetitionDocumentFiles[0] || null,
              title: editing.title || "",
              category: editing.category || "other",
              description: editing.description || "",
              fileName: portalState.engagementCompetitionDocumentFiles[0]?.name || editing.fileName || ""
            }]
          : portalState.engagementCompetitionDocumentFiles.map((file) => ({
              file,
              title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
              category: "other",
              description: "",
              fileName: file.name
            }));
        mount.innerHTML = drafts.map((draft, index) => `
      <div class="admin-engagements-document-draft" data-engagement-document-draft="${index}">
        <small class="admin-engagements-document-draft-file">${portalActions.escapeHtml(draft.fileName)}${draft.file ? ` · ${portalActions.escapeHtml(engagementCompetitionDocumentFileSize(draft.file.size))}` : " · fichier actuel conservé"}</small>
        <label>Titre<input type="text" maxlength="160" required data-engagement-document-title value="${portalActions.escapeHtml(draft.title)}"></label>
        <label>Catégorie<select data-engagement-document-category>${engagementCompetitionDocumentCategoryOptions(draft.category)}</select></label>
        <label>Description facultative<textarea maxlength="500" rows="2" data-engagement-document-description>${portalActions.escapeHtml(draft.description)}</textarea></label>
      </div>
    `).join("");
        if (portalContext.elements.engagementsDocumentNotifyLabel) {
          portalContext.elements.engagementsDocumentNotifyLabel.hidden = Boolean(editing && !portalState.engagementCompetitionDocumentFiles.length);
        }
        if (portalContext.elements.engagementsDocumentSubmitButton) {
          portalContext.elements.engagementsDocumentSubmitButton.textContent = editing
            ? (portalState.engagementCompetitionDocumentFiles.length ? "Remplacer le document" : "Enregistrer")
            : `Mettre en ligne${drafts.length > 1 ? ` (${drafts.length})` : ""}`;
        }
      }

    function openEngagementCompetitionDocumentForm(documentId = "") {
        if (!portalActions.isEngagementAdminMode() || portalState.engagementCompetitionDocumentSaving) return;
        portalState.engagementCompetitionDocumentEditingId = String(documentId || "");
        portalState.engagementCompetitionDocumentFiles = [];
        if (portalContext.elements.engagementsDocumentFiles) {
          portalContext.elements.engagementsDocumentFiles.value = "";
          portalContext.elements.engagementsDocumentFiles.multiple = !portalState.engagementCompetitionDocumentEditingId;
          portalContext.elements.engagementsDocumentFiles.required = !portalState.engagementCompetitionDocumentEditingId;
        }
        if (portalContext.elements.engagementsDocumentNotify) portalContext.elements.engagementsDocumentNotify.checked = false;
        if (portalContext.elements.engagementsDocumentFormMessage) {
          portalContext.elements.engagementsDocumentFormMessage.textContent = "";
          portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "";
        }
        if (portalContext.elements.engagementsDocumentForm) portalContext.elements.engagementsDocumentForm.hidden = false;
        if (portalContext.elements.engagementsDocumentAddButton) portalContext.elements.engagementsDocumentAddButton.hidden = true;
        renderEngagementCompetitionDocumentDrafts();
        portalContext.elements.engagementsDocumentFiles?.focus();
      }

    function closeEngagementCompetitionDocumentForm() {
        portalState.engagementCompetitionDocumentEditingId = "";
        portalState.engagementCompetitionDocumentFiles = [];
        if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.value = "";
        if (portalContext.elements.engagementsDocumentDrafts) portalContext.elements.engagementsDocumentDrafts.innerHTML = "";
        if (portalContext.elements.engagementsDocumentNotify) portalContext.elements.engagementsDocumentNotify.checked = false;
        if (portalContext.elements.engagementsDocumentForm) portalContext.elements.engagementsDocumentForm.hidden = true;
        if (portalContext.elements.engagementsDocumentAddButton) portalContext.elements.engagementsDocumentAddButton.hidden = false;
      }

    function engagementCompetitionDocumentDraftValues() {
        return Array.from(portalContext.elements.engagementsDocumentDrafts?.querySelectorAll("[data-engagement-document-draft]") || []).map((row) => ({
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
        const files = Array.from(portalContext.elements.engagementsDocumentFiles?.files || []);
        const maximum = portalActions.canUse("engagements.national.manage") ? portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_NATIONAL_MAX_BYTES : portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES;
        const invalid = files.find((file) => !portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_EXTENSION_PATTERN.test(file.name) || file.size <= 0 || file.size > maximum);
        const currentCount = Array.isArray(portalState.selectedEngagementCompetition?.clubDocuments) ? portalState.selectedEngagementCompetition.clubDocuments.length : 0;
        const tooMany = !portalState.engagementCompetitionDocumentEditingId && currentCount + files.length > portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT;
        if (invalid || tooMany) {
          portalState.engagementCompetitionDocumentFiles = [];
          if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.value = "";
          if (portalContext.elements.engagementsDocumentFormMessage) {
            portalContext.elements.engagementsDocumentFormMessage.textContent = tooMany
              ? `La compétition est limitée à ${portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT} documents actifs.`
              : `${invalid?.name || "Ce fichier"} est vide, dépasse ${maximum / (1024 * 1024)} Mo ou utilise un format non autorisé.`;
            portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
          }
          renderEngagementCompetitionDocumentDrafts();
          return;
        }
        portalState.engagementCompetitionDocumentFiles = portalState.engagementCompetitionDocumentEditingId ? files.slice(0, 1) : files;
        if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "";
        renderEngagementCompetitionDocumentDrafts();
      }

    function updateSelectedEngagementCompetitionDocuments(documents = []) {
        portalState.selectedEngagementCompetition = {
          ...(portalState.selectedEngagementCompetition || {}),
          clubDocuments: Array.isArray(documents) ? documents : []
        };
        renderEngagementDocuments(portalState.selectedEngagementCompetition);
      }

    async function saveEngagementCompetitionDocuments(event) {
        event?.preventDefault();
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode() || portalState.engagementCompetitionDocumentSaving) return;
        const editingDocument = (portalState.selectedEngagementCompetition?.clubDocuments || [])
          .find((document) => document.id === portalState.engagementCompetitionDocumentEditingId) || null;
        const values = engagementCompetitionDocumentDraftValues();
        if (!values.length || values.some((draft) => !draft.title)) {
          if (portalContext.elements.engagementsDocumentFormMessage) {
            portalContext.elements.engagementsDocumentFormMessage.textContent = portalState.engagementCompetitionDocumentEditingId
              ? "Renseignez le titre du document."
              : "Choisissez au moins un fichier et renseignez chaque titre.";
            portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
          }
          return;
        }
        const publishesFile = portalState.engagementCompetitionDocumentFiles.length > 0;
        if (publishesFile) {
          const national = portalActions.canUse("engagements.national.manage");
          const maximum = national ? portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_NATIONAL_MAX_BYTES : portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES;
          if (portalState.engagementCompetitionDocumentFiles.some((file) => file.size > maximum)) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = `Chaque fichier est limité à ${maximum / (1024 * 1024)} Mo.`;
            return;
          }
          if (national && portalState.engagementCompetitionDocumentFiles.some((file) => file.size > portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES) && !global.confirm("Ce dépôt contient un ou plusieurs fichiers de plus de 2 Mo. Votre droit national autorise un dépassement jusqu’à 10 Mo par fichier. Continuer la mise en ligne ?")) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Mise en ligne annulée.";
            return;
          }
        }
        const notify = publishesFile && portalContext.elements.engagementsDocumentNotify?.checked === true;
        if (notify) {
          try {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Calcul des destinataires…";
            const audience = await portalActions.callFunction("previewEngagementCompetitionDocumentNotification", {
              competitionId: portalState.selectedEngagementCompetitionId
            });
            const confirmed = global.confirm(
              audience.disabled
                ? `Mettre en ligne ${portalState.engagementCompetitionDocumentFiles.length} document(s) ? Les notifications autorisées par le réglage national partiront uniquement vers livepalmes@nap-ffessm.fr sur TEST.`
                : `Mettre en ligne ${portalState.engagementCompetitionDocumentFiles.length} document${portalState.engagementCompetitionDocumentFiles.length > 1 ? "s" : ""} et envoyer un e-mail à ${Number(audience.recipientCount || 0)} administrateur${Number(audience.recipientCount || 0) > 1 ? "s" : ""} de ${Number(audience.clubCount || 0)} club${Number(audience.clubCount || 0) > 1 ? "s" : ""} ?`
            );
            if (!confirmed) {
              if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Mise en ligne annulée.";
              return;
            }
          } catch (error) {
            if (portalContext.elements.engagementsDocumentFormMessage) {
              portalContext.elements.engagementsDocumentFormMessage.textContent = `Calcul des destinataires impossible : ${error?.message || error}`;
              portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
            }
            return;
          }
        }
        portalState.engagementCompetitionDocumentSaving = true;
        if (portalContext.elements.engagementsDocumentSubmitButton) portalContext.elements.engagementsDocumentSubmitButton.disabled = true;
        if (portalContext.elements.engagementsDocumentCancelButton) portalContext.elements.engagementsDocumentCancelButton.disabled = true;
        if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.disabled = true;
        const publishedIds = [];
        const errors = [];
        try {
          if (editingDocument && !publishesFile) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Enregistrement…";
            const result = await portalActions.callFunction("updateEngagementCompetitionDocument", {
              competitionId: portalState.selectedEngagementCompetitionId,
              documentId: editingDocument.id,
              expectedFingerprint: editingDocument.napFingerprint,
              ...values[0]
            });
            updateSelectedEngagementCompetitionDocuments(result.documents || []);
          } else {
            for (let index = 0; index < portalState.engagementCompetitionDocumentFiles.length; index += 1) {
              const file = portalState.engagementCompetitionDocumentFiles[index];
              const draft = values[editingDocument ? 0 : index];
              if (portalContext.elements.engagementsDocumentFormMessage) {
                portalContext.elements.engagementsDocumentFormMessage.textContent = `Mise en ligne ${index + 1}/${portalState.engagementCompetitionDocumentFiles.length} : ${file.name}`;
              }
              try {
                const fileDataUrl = await readEngagementCompetitionDocumentFile(file);
                const result = await portalActions.callFunction("uploadEngagementCompetitionDocument", {
                  competitionId: portalState.selectedEngagementCompetitionId,
                  ...(editingDocument ? { documentId: editingDocument.id, expectedFingerprint:editingDocument.napFingerprint } : {}),
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
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Envoi de la notification aux clubs…";
            try {
              notification = await portalActions.callFunction("notifyEngagementCompetitionDocuments", {
                competitionId: portalState.selectedEngagementCompetitionId,
                documentIds: publishedIds
              });
              portalState.engagementMailJobsCompetitionId = "";
            } catch (error) {
              errors.push(`Notification : ${error?.message || error}`);
            }
          }
          if (!errors.length) {
            closeEngagementCompetitionDocumentForm();
          } else if (portalContext.elements.engagementsDocumentFormMessage) {
            portalContext.elements.engagementsDocumentFormMessage.textContent = errors.join(" · ");
            portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
          }
          renderEngagementDocuments(portalState.selectedEngagementCompetition || {});
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = errors.length
              ? `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne. ${errors.join(" · ")}`
              : notification
                ? notification.queued ? `${publishedIds.length} document(s) mis en ligne. Notification regroupée cinq minutes après le premier dépôt, selon le réglage national. Sur TEST, aucun mail envoyé.` : notification.disabled ? `${publishedIds.length} document(s) mis en ligne. TEST : aucun mail envoyé.`
                  : `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne · ${Number(notification.sentCount || 0)} e-mail${Number(notification.sentCount || 0) > 1 ? "s" : ""} envoyé${Number(notification.sentCount || 0) > 1 ? "s" : ""}${notification.configurationMissing ? " · configuration e-mail manquante" : Number(notification.errorCount || 0) ? ` · ${notification.errorCount} en erreur` : ""}.`
                : editingDocument && !publishesFile
                  ? "Informations du document enregistrées."
                  : `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne.`;
            portalContext.elements.engagementsDocumentsSummary.dataset.tone = errors.length || notification?.configurationMissing || Number(notification?.errorCount || 0) ? "warning" : "success";
          }
        } finally {
          portalState.engagementCompetitionDocumentSaving = false;
          if (portalContext.elements.engagementsDocumentSubmitButton) portalContext.elements.engagementsDocumentSubmitButton.disabled = false;
          if (portalContext.elements.engagementsDocumentCancelButton) portalContext.elements.engagementsDocumentCancelButton.disabled = false;
          if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.disabled = false;
        }
      }

    async function deleteEngagementCompetitionDocument(documentId = "") {
        const document = (portalState.selectedEngagementCompetition?.clubDocuments || []).find((item) => item.id === documentId);
        if (!document || portalState.engagementCompetitionDocumentSaving || portalActions.isRegionalPastEngagementReadOnly()) return;
        if (!global.confirm(`Supprimer définitivement « ${document.title || document.fileName} » ? Les clubs ne seront pas informés.`)) return;
        portalState.engagementCompetitionDocumentSaving = true;
        try {
          const result = await portalActions.callFunction("deleteEngagementCompetitionDocument", {
            competitionId: portalState.selectedEngagementCompetitionId,
            documentId,
            expectedFingerprint:document.napFingerprint
          });
          updateSelectedEngagementCompetitionDocuments(result.documents || []);
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = result.storageDeleted === false
              ? "Document retiré de la compétition. Le nettoyage du fichier de stockage devra être vérifié."
              : "Document supprimé.";
            portalContext.elements.engagementsDocumentsSummary.dataset.tone = result.storageDeleted === false ? "warning" : "success";
          }
        } catch (error) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDocumentsSummary.dataset.tone = "error";
          }
        } finally {
          portalState.engagementCompetitionDocumentSaving = false;
        }
      }

    function renderEngagementSharedDocuments(competition = {}) {
        const documents = Array.isArray(competition.clubDocuments) ? competition.clubDocuments : [];
        const adminMode = portalActions.isEngagementAdminMode();
        const regionalPastReadOnly = portalActions.isRegionalPastEngagementReadOnly(competition);
        if (portalContext.elements.engagementsSharedDocumentsTitle) {
          portalContext.elements.engagementsSharedDocumentsTitle.textContent = adminMode ? "Documents de la compétition" : "Documents disponibles";
        }
        if (portalContext.elements.engagementsSharedDocumentsCount) {
          portalContext.elements.engagementsSharedDocumentsCount.textContent = documents.length
            ? adminMode
              ? `${documents.length} document${documents.length > 1 ? "s" : ""} disponible${documents.length > 1 ? "s" : ""} · maximum ${portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT}`
              : `${documents.length} document${documents.length > 1 ? "s" : ""}`
            : adminMode ? "Affiches, circulaires, règlements et informations utiles." : "";
          portalContext.elements.engagementsSharedDocumentsCount.hidden = !adminMode && !documents.length;
        }
        if (portalContext.elements.engagementsDocumentAddButton) {
          portalContext.elements.engagementsDocumentAddButton.disabled = documents.length >= portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT;
          portalContext.elements.engagementsDocumentAddButton.title = documents.length >= portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT
            ? `La limite de ${portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT} documents est atteinte.`
            : "";
        }
        if (!portalContext.elements.engagementsSharedDocumentsList) return;
        portalContext.elements.engagementsSharedDocumentsList.innerHTML = documents.length ? documents.map((document) => {
          const uploader = adminMode && document.uploadedBy
            ? [document.uploadedBy.name || document.uploadedBy.email, document.uploadedBy.name && document.uploadedBy.email ? document.uploadedBy.email : ""].filter(Boolean).join(" · ")
            : "";
          return `
        <article class="admin-engagements-shared-document-card">
          <div class="admin-engagements-shared-document-main">
            <div class="admin-engagements-shared-document-badges">
              <span>${portalActions.escapeHtml(engagementCompetitionDocumentCategoryLabel(document.category))}</span>
              <span>${portalActions.escapeHtml(engagementCompetitionDocumentTypeLabel(document.fileName))}</span>
              ${engagementCompetitionDocumentFileSize(document.size) ? `<span>${portalActions.escapeHtml(engagementCompetitionDocumentFileSize(document.size))}</span>` : ""}
            </div>
            <a href="${portalActions.escapeHtml(document.url || "#")}" target="_blank" rel="noopener">${portalActions.escapeHtml(document.title || document.fileName || "Document")}</a>
            ${document.description ? `<p>${portalActions.escapeHtml(document.description)}</p>` : ""}
            <small class="admin-engagements-shared-document-meta">Mis en ligne ${portalActions.escapeHtml(document.updatedAt ? portalActions.formatDeadline(document.updatedAt).replace(/^Limite /, "") : "")}${uploader ? ` · par ${portalActions.escapeHtml(uploader)}` : ""}</small>
          </div>
          ${adminMode ? `
            <div class="admin-engagements-shared-document-actions">
              <a class="ghost-button compact" href="${portalActions.escapeHtml(document.url || "#")}" target="_blank" rel="noopener">Télécharger</a>
              <button class="ghost-button compact" type="button" data-engagement-document-edit="${portalActions.escapeHtml(document.id)}">Modifier / remplacer</button>
              ${regionalPastReadOnly ? "" : `<button class="ghost-button compact admin-engagements-danger-button" type="button" data-engagement-document-delete="${portalActions.escapeHtml(document.id)}">Supprimer</button>`}
            </div>` : ""}
        </article>`;
        }).join("") : '<p class="admin-engagements-empty">Aucun document mis en ligne pour cette compétition.</p>';
        if(adminMode&&competition.napSource===true&&global.LivePalmesImportSource){
          const host=document.createElement('div');portalContext.elements.engagementsSharedDocumentsList.append(host);
          global.LivePalmesImportSource.mount({host,competitionId:competition.id,onRead:payload=>portalActions.callFunction('getEngagementCompetition',payload)});
        }
      }

    function canDownloadEngagementOpenWaterTxt(competition) {
        return competition?.napSource === true;
      }

    function renderEngagementDocuments(competition = portalState.selectedEngagementCompetition || {}) {
        const adminMode = portalActions.isEngagementAdminMode();
        if (portalContext.elements.engagementsNotificationPreviewActions) portalContext.elements.engagementsNotificationPreviewActions.hidden =
          !adminMode || global.LivePalmesEnvironment?.sportingDataSource !== "nap" || competition.napSource !== true;
        if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = "";
        if (portalContext.elements.engagementsGenerateClubRecapsButton) portalContext.elements.engagementsGenerateClubRecapsButton.hidden = !adminMode || competition.napSource !== true;
        const openWater = portalActions.engagementCompetitionType(competition) === "openWater";
        const documentsHead = portalContext.elements.engagementsDocumentsTitle?.closest(".admin-engagements-documents-head");
        if (documentsHead) documentsHead.hidden = !adminMode;
        if (portalContext.elements.engagementsGenerateTxtExportButton) {
          portalContext.elements.engagementsGenerateTxtExportButton.disabled = openWater && !canDownloadEngagementOpenWaterTxt(competition);
          portalContext.elements.engagementsGenerateTxtExportButton.title = openWater
            ? (canDownloadEngagementOpenWaterTxt(competition) ? "Téléchargement manuel de l’export eau libre. Aucun envoi automatique." : "L’export TXT eau libre nécessite une compétition issue de NAP.")
            : "";
        }
        if (portalContext.elements.engagementsDocumentsTitle) portalContext.elements.engagementsDocumentsTitle.textContent = adminMode ? "GED" : "Documents";
        if (portalContext.elements.engagementsDocumentsSummary) {
          portalContext.elements.engagementsDocumentsSummary.textContent = adminMode
            ? openWater
              ? (canDownloadEngagementOpenWaterTxt(competition) ? "Gérez les documents destinés aux clubs et téléchargez l’export TXT eau libre. Aucun envoi automatique." : "Gérez les documents destinés aux clubs. L’export TXT eau libre nécessite une compétition issue de NAP.")
              : "Gérez les documents destinés aux clubs et téléchargez les fichiers techniques."
            : "Consultez et téléchargez les documents utiles de la compétition.";
          portalContext.elements.engagementsDocumentsSummary.dataset.tone = "";
        }
        if (portalContext.elements.engagementsComputerEmailLabel) {
          portalContext.elements.engagementsComputerEmailLabel.textContent = competition.computerEmail
            ? `Informatique : ${competition.computerEmail}`
            : "Email du responsable informatique non renseigne";
          portalContext.elements.engagementsComputerEmailLabel.hidden = !adminMode || !competition.computerEmail;
        }
        if (portalContext.elements.engagementsDocumentsList) {
          portalContext.elements.engagementsDocumentsList.innerHTML = renderEngagementClosureAutomation(competition);
        }
        if (portalContext.elements.engagementsGeneratedFiles) {
          const files = Array.isArray(competition.generatedFiles) ? competition.generatedFiles : [];
          portalContext.elements.engagementsGeneratedFiles.innerHTML = files.length
            ? files.map((file) => `<a href="${portalActions.escapeHtml(file.url || "#")}" target="_blank" rel="noopener">${portalActions.escapeHtml(file.name || "Document")}</a>`).join("")
            : `<p class="admin-engagements-empty">Aucun fichier disponible pour le moment.</p>`;
        }
        renderEngagementSharedDocuments(competition);
        renderEngagementClubRecapSelector();
        renderEngagementMailJobs();
      }

    function updateSelectedEngagementDocumentStatus(key, status, generatedAt = new Date().toISOString()) {
        if (!key || !portalState.selectedEngagementCompetition) return;
        portalState.selectedEngagementCompetition = {
          ...portalState.selectedEngagementCompetition,
          documents: {
            ...(portalState.selectedEngagementCompetition.documents || {}),
            [key]: {
              ...((portalState.selectedEngagementCompetition.documents || {})[key] || {}),
              status,
              generatedAt
            }
          }
        };
        renderEngagementDocuments(portalState.selectedEngagementCompetition);
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
        portalContext.elements.engagementsSectionToggles?.forEach((button) => {
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
        if (portalContext.elements.engagementsEventsChoiceSummary) {
          portalContext.elements.engagementsEventsChoiceSummary.textContent = engagementEventsCompactSummary(events);
        }
        if (portalContext.elements.engagementsEventsSummary) {
          portalContext.elements.engagementsEventsSummary.textContent = engagementProgramStatusSummary(events, sessions);
        }
        if (portalContext.elements.engagementsProgramSummary) {
          const missingCount = missingEngagementProgramEventCount(events, sessions);
          const summary = engagementProgramSummary(sessions);
          portalContext.elements.engagementsProgramSummary.textContent = missingCount
          ? `${summary} ${missingCount} épreuve${missingCount > 1 ? "s" : ""} à placer.`
            : summary;
          if (portalContext.elements.engagementsProgramSection) {
            portalContext.elements.engagementsProgramSection.dataset.warning = missingCount ? "true" : "false";
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
              genderMode: portalConfig.ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS[item.genderMode] ? item.genderMode : "mixed",
              phase: engagementProgramPhaseForEvent(item.eventCode, item.phase)
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
        return Array.from(portalContext.elements.engagementsProgramSessions?.querySelectorAll("[data-engagement-program-session]") || []).map((sessionElement, sessionIndex) => {
          const items = Array.from(sessionElement.querySelectorAll("[data-engagement-program-row]")).map((row) => {
            const eventCode = row.dataset.engagementProgramEvent || "";
            const genderMode = row.dataset.engagementProgramGender || "mixed";
            const phase = row.dataset.engagementProgramPhase || "direct";
            return {
              eventCode,
              genderMode: portalConfig.ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS[genderMode] ? genderMode : "mixed",
              phase: engagementProgramPhaseForEvent(eventCode, phase)
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
        const definition = portalActions.engagementEventDefinition(eventCode);
        const modes = definition?.relayMixedRule === "required"
          ? [["mixed", "Relais mixte"]]
          : portalConfig.ENGAGEMENT_PROGRAM_GENDER_MODES.map(([mode]) => [mode, engagementProgramGenderModeDisplayLabel(mode, eventCode, eventOption)]);
        if (!portalState.selectedEngagementCompetition?.napSource) return modes;
        const nativeEvent = portalState.selectedEngagementCompetition.events?.find(event => event.code === eventCode);
        if (!nativeEvent && definition && portalState.engagementDetailEditing && ["pool","openWater"].includes(portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition))) return modes;
        if (!Array.isArray(nativeEvent?.nativeCourses)) return [];
        const available = new Set(nativeEvent.nativeCourses.map(course => String(course.sexe).trim()));
        return modes.filter(([mode]) => mode === "mixed"
          ? nativeEvent.type === "relay" ? available.has("0") : available.has("F") && available.has("M")
          : available.has(mode === "female" ? "F" : "M"));
      }

    function engagementProgramGenderModeShortLabel(mode, eventCode = "", eventOption = null) {
        const definition = portalActions.engagementEventDefinition(eventCode);
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
        const definition = portalActions.engagementEventDefinition(eventCode);
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
        const definition = portalActions.engagementEventDefinition(eventCode);
        if (mode === "female") return "female";
        if (mode === "male") return "male";
        if (definition?.relayMixedRule === "required" || (definition?.relayMixedRule === "mastersOnly" && eventOption?.relayMixedMode === "masters")) {
          return "relay-mixed";
        }
        return "combined";
      }

    function engagementProgramPhaseLabel(phase = "direct") {
        return portalConfig.ENGAGEMENT_PROGRAM_PHASE_LABELS[phase] || portalConfig.ENGAGEMENT_PROGRAM_PHASE_LABELS.direct;
      }

    function engagementProgramFormatsForEvent(eventCode = "") {
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) !== "openWater") return portalConfig.ENGAGEMENT_PROGRAM_FORMATS;
        return portalActions.engagementEventDefinition(eventCode)?.openWaterFormat === "elimination"
          ? portalConfig.ENGAGEMENT_OPEN_WATER_ELIMINATION_PROGRAM_FORMATS
          : [];
      }

    function engagementProgramPhaseForEvent(eventCode = "", requestedPhase = "direct") {
        const phase = portalConfig.ENGAGEMENT_PROGRAM_PHASE_LABELS[requestedPhase] ? requestedPhase : "direct";
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) !== "openWater") return phase;
        const formats = engagementProgramFormatsForEvent(eventCode);
        if (!formats.length) return "direct";
        return ["direct", "heats", "final"].includes(phase) ? phase : "direct";
      }

    function engagementProgramSameSlot(item = {}, eventCode = "", genderMode = "") {
        return item.eventCode === eventCode && item.genderMode === genderMode;
      }

    function engagementProgramPassages(sessions, eventCode, genderMode) {
        const passages = [];
        sessions.forEach((session, sessionIndex) => {
          (session.items || []).forEach((item, itemIndex) => {
            if (engagementProgramSameSlot(item, eventCode, genderMode)) passages.push({ item, sessionIndex, itemIndex });
          });
        });
        return passages;
      }

    function engagementProgramFormatForPhase(phase = "direct") {
        if (phase === "heats" || phase === "final") return "heatsFinal";
        if (phase === "slowHeats" || phase === "fastHeat") return "slowFast";
        return "direct";
      }

    function engagementProgramFirstPhaseForFormat(format = "direct") {
        return format === "heatsFinal" ? "heats" : format === "slowFast" ? "slowHeats" : "direct";
      }

    function engagementProgramSecondPhaseForFormat(format = "direct") {
        return format === "heatsFinal" ? "final" : format === "slowFast" ? "fastHeat" : "";
      }

    function engagementProgramCanAddPassage(sessions, eventCode, genderMode, targetSessionId = "") {
        const passages = engagementProgramPassages(sessions, eventCode, genderMode);
        if (!passages.length) return true;
        if (!engagementProgramFormatsForEvent(eventCode).length) return false;
        if (passages.length !== 1 || !["heats", "slowHeats"].includes(passages[0].item.phase)) return false;
        const targetSessionIndex = sessions.findIndex((session) => session.id === targetSessionId);
        return targetSessionIndex >= passages[0].sessionIndex;
      }

    function engagementProgramNextPhase(sessions, eventCode, genderMode) {
        const passages = engagementProgramPassages(sessions, eventCode, genderMode);
        if (!passages.length) return "direct";
        return passages[0].item.phase === "heats" ? "final" : passages[0].item.phase === "slowHeats" ? "fastHeat" : "";
      }

    function normalizeEngagementProgramPassageOrder(sessions) {
        const slots = new Map();
        sessions.forEach((session) => {
          (session.items || []).forEach((item) => {
            const key = `${item.eventCode}:${item.genderMode}`;
            if (!slots.has(key)) slots.set(key, []);
            slots.get(key).push(item);
          });
        });
        slots.forEach((items) => {
          const phases = new Set(items.map((item) => item.phase || "direct"));
          if (phases.has("direct") || items.length > 2) return;
          const format = phases.has("slowHeats") || phases.has("fastHeat") ? "slowFast" : "heatsFinal";
          items[0].phase = engagementProgramFirstPhaseForFormat(format);
          if (items[1]) items[1].phase = engagementProgramSecondPhaseForFormat(format);
        });
        return sessions;
      }

    function applyEngagementProgramFormatChange(row, requestedFormat = "direct") {
        const eventCode = row?.dataset.engagementProgramEvent || "";
        const availableFormats = engagementProgramFormatsForEvent(eventCode);
        const format = availableFormats.some(([value]) => value === requestedFormat) ? requestedFormat : "direct";
        const genderMode = row?.dataset.engagementProgramGender || "mixed";
        const sessions = selectedEngagementProgramSessionsFromForm();
        const passages = engagementProgramPassages(sessions, eventCode, genderMode);
        const first = passages[0]?.item;
        if (!first) return sessions;
        first.phase = engagementProgramFirstPhaseForFormat(format);
        if (format === "direct") {
          sessions.forEach((session) => {
            session.items = (session.items || []).filter((item) => item === first || !engagementProgramSameSlot(item, eventCode, genderMode));
          });
        } else if (passages[1]?.item) {
          passages[1].item.phase = engagementProgramSecondPhaseForFormat(format);
        }
        return sessions;
      }

    function renderEngagementProgramSessions(programSessions = [], canEdit = false) {
        const mount = portalContext.elements.engagementsProgramSessions;
        if (!mount) return;
        const eventOptions = selectedEngagementEventOptions();
        const sessions = normalizeEngagementProgramPassageOrder(normalizedEngagementProgramSessions(programSessions, eventOptions));
        if (!canEdit || !sessions.some((session) => session.id === portalState.activeEngagementProgramSessionId)) {
          portalState.activeEngagementProgramSessionId = "";
        }
        if (portalContext.elements.engagementsProgramAddSession) {
          portalContext.elements.engagementsProgramAddSession.hidden = !canEdit;
          portalContext.elements.engagementsProgramAddSession.disabled = !canEdit || !eventOptions.length;
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
        <strong>${portalActions.escapeHtml(event.label)}</strong>
        <div>
          ${engagementProgramGenderModesForEvent(event).map(([mode, label]) => {
                const disabled = !canEdit || !portalState.activeEngagementProgramSessionId || !engagementProgramCanAddPassage(sessions, event.code, mode, portalState.activeEngagementProgramSessionId);
                return `<button class="ghost-button" type="button" title="${portalActions.escapeHtml(label)}" aria-label="${portalActions.escapeHtml(`${event.label} ${label}`)}" data-engagement-program-action="add-slot" data-engagement-program-event="${portalActions.escapeHtml(event.code)}" data-engagement-program-gender="${portalActions.escapeHtml(mode)}" ${disabled ? "disabled" : ""}>${portalActions.escapeHtml(engagementProgramGenderModeShortLabel(mode, event.code, event))}</button>`;
              }).join("")}
        </div>
      </div>
    `).join("");
        const eventLabelFor = (eventCode) => eventOptions.find((event) => event.code === eventCode)?.label || eventCode;
        const eventOptionFor = (eventCode) => eventOptions.find((event) => event.code === eventCode) || null;
        const sessionHtmlFor = (session, sessionIndex) => {
          const active = canEdit && session.id === portalState.activeEngagementProgramSessionId;
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
        <section class="admin-engagements-program-session" data-engagement-program-session="${portalActions.escapeHtml(session.id || `session-${sessionIndex + 1}`)}" data-engagement-program-session-date-value="${portalActions.escapeHtml(session.date || "")}" data-engagement-program-session-time-value="${portalActions.escapeHtml(session.startTime || "")}" data-active="${active ? "true" : "false"}">
        <div class="admin-engagements-program-session-head">
          <div class="admin-engagements-program-session-title">
            <span>Session</span>
            <strong>${portalActions.escapeHtml(`Session ${sessionIndex + 1}`)}</strong>
          </div>
          <label>
            Date
            ${canEdit
                  ? `<input type="date" value="${portalActions.escapeHtml(session.date || "")}" data-engagement-program-session-date>`
                  : `<span class="admin-engagements-program-read-value">${portalActions.escapeHtml(portalActions.formatShortDate(session.date) || "-")}</span>`}
          </label>
          <label>
            Debut
            ${canEdit
                  ? `<input type="time" value="${portalActions.escapeHtml(session.startTime || "")}" data-engagement-program-session-time>`
                  : `<span class="admin-engagements-program-read-value">${portalActions.escapeHtml(session.startTime || "-")}</span>`}
          </label>
          <div class="admin-engagements-program-actions">
            <button class="ghost-button" type="button" title="Les épreuves disponibles s'ajoutent dans cette session" aria-label="Choisir cette session comme cible" data-engagement-program-action="select-session" ${canEdit ? "" : "hidden"}>${active ? "Cible" : "Choisir"}</button>
            <button class="ghost-button" type="button" title="Supprimer la session" aria-label="Supprimer la session" data-engagement-program-action="remove-session" ${canEdit ? "" : "hidden"}>&times;</button>
          </div>
        </div>
        <div class="admin-engagements-program-rows">
          ${session.items.length ? session.items.map((item, itemIndex) => {
                const passageIndex = engagementProgramPassages(sessions, item.eventCode, item.genderMode)
                  .findIndex((passage) => passage.sessionIndex === sessionIndex && passage.itemIndex === itemIndex);
                const format = engagementProgramFormatForPhase(item.phase);
                const formatOptions = engagementProgramFormatsForEvent(item.eventCode);
                return `
            <div class="admin-engagements-program-row" data-engagement-program-row data-engagement-program-event="${portalActions.escapeHtml(item.eventCode)}" data-engagement-program-gender="${portalActions.escapeHtml(item.genderMode)}" data-engagement-program-phase="${portalActions.escapeHtml(item.phase || "direct")}">
              <div class="admin-engagements-program-row-main">
                <span>${itemIndex + 1}.</span>
                <strong>${portalActions.escapeHtml(eventLabelFor(item.eventCode))}</strong>
                <i aria-hidden="true">-</i>
                <em data-gender-mode="${portalActions.escapeHtml(item.genderMode)}" data-gender-tone="${portalActions.escapeHtml(engagementProgramGenderModeTone(item.genderMode, item.eventCode, eventOptionFor(item.eventCode)))}" title="${portalActions.escapeHtml(engagementProgramGenderModeDisplayLabel(item.genderMode, item.eventCode, eventOptionFor(item.eventCode)))}">${portalActions.escapeHtml(engagementProgramGenderModeDisplayLabel(item.genderMode, item.eventCode, eventOptionFor(item.eventCode)))}</em>
                ${passageIndex <= 0 && formatOptions.length ? `
                  <div class="admin-engagements-program-format" data-engagement-program-format>
                    ${canEdit ? `
                      <button class="admin-engagements-program-format-trigger" type="button" data-engagement-program-action="toggle-format" aria-haspopup="menu" aria-expanded="false" title="${portalActions.escapeHtml(portalConfig.ENGAGEMENT_PROGRAM_FORMAT_LABELS[format] || engagementProgramPhaseLabel(item.phase))}">
                        <span>${portalActions.escapeHtml(engagementProgramPhaseLabel(item.phase))}</span><i aria-hidden="true">⌄</i>
                      </button>
                      <div class="admin-engagements-program-format-menu" role="menu" hidden>
                        ${formatOptions.map(([value, label]) => `<button type="button" role="menuitem" data-engagement-program-action="set-format" data-engagement-program-format-value="${portalActions.escapeHtml(value)}" ${value === format ? "aria-current=\"true\"" : ""}>${portalActions.escapeHtml(label)}</button>`).join("")}
                      </div>
                    ` : `<span class="admin-engagements-program-format-read-value">${portalActions.escapeHtml(engagementProgramPhaseLabel(item.phase))}</span>`}
                  </div>
                ` : passageIndex > 0 ? `<b class="admin-engagements-program-phase">${portalActions.escapeHtml(engagementProgramPhaseLabel(item.phase))}</b>` : ""}
              </div>
              <div class="admin-engagements-program-actions">
                <button class="ghost-button" type="button" title="Monter" aria-label="Monter" data-engagement-program-action="move-up" ${canEdit ? "" : "hidden"}>↑</button>
                <button class="ghost-button" type="button" title="Descendre" aria-label="Descendre" data-engagement-program-action="move-down" ${canEdit ? "" : "hidden"}>↓</button>
                <button class="ghost-button" type="button" title="Retirer" aria-label="Retirer" data-engagement-program-action="remove-row" ${canEdit ? "" : "hidden"}>&times;</button>
              </div>
            </div>
          `;
              }).join("") : `<p class="admin-engagements-empty">Aucune ligne dans cette session.</p>`}
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
      <div class="admin-engagements-program-day-group" data-program-day="${portalActions.escapeHtml(group.dayKey)}">
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
        renderEngagementProgramSessions(sessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
      }

    function addEngagementProgramSession() {
        const eventOptions = selectedEngagementEventOptions();
        if (!eventOptions.length) return;
        const sessions = selectedEngagementProgramSessionsFromForm(eventOptions);
        sessions.push({
          id: `session-${Date.now()}`,
          label: `Session ${sessions.length + 1}`,
          date: portalState.selectedEngagementCompetition?.date || "",
          startTime: "",
          items: []
        });
        portalState.activeEngagementProgramSessionId = sessions.at(-1)?.id || "";
        portalActions.markEngagementDetailTabDirty("courses");
        renderEngagementProgramSessions(sessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
      }

    function handleEngagementProgramAction(event) {
        const button = event.target.closest("[data-engagement-program-action]");
        if (!portalActions.isEngagementAdminMode() || !portalState.engagementDetailEditing || !portalActions.canEditEngagementCompetition()) return;
        const eventOptions = selectedEngagementEventOptions();
        if (!eventOptions.length) return;
        const sessions = selectedEngagementProgramSessionsFromForm(eventOptions);
        if (!button) {
          const clickedSession = event.target.closest("[data-engagement-program-session]");
          if (!clickedSession || event.target.closest("input, select, textarea, button, label")) return;
          portalState.activeEngagementProgramSessionId = clickedSession.dataset.engagementProgramSession || portalState.activeEngagementProgramSessionId;
          renderEngagementProgramSessions(sessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
          return;
        }
        const action = button.dataset.engagementProgramAction;
        if (action === "toggle-format") {
          const control = button.closest("[data-engagement-program-format]");
          const menu = control?.querySelector("[role=menu]");
          const opening = menu?.hidden !== false;
          portalContext.elements.engagementsProgramSessions?.querySelectorAll("[data-engagement-program-format] [role=menu]").forEach((candidate) => { candidate.hidden = true; });
          portalContext.elements.engagementsProgramSessions?.querySelectorAll('[data-engagement-program-action="toggle-format"]').forEach((candidate) => { candidate.setAttribute("aria-expanded", "false"); });
          if (menu) menu.hidden = !opening;
          button.setAttribute("aria-expanded", opening ? "true" : "false");
          return;
        }
        if (action === "set-format") {
          const row = button.closest("[data-engagement-program-row]");
          const nextSessions = applyEngagementProgramFormatChange(row, button.dataset.engagementProgramFormatValue || "direct");
          portalActions.markEngagementDetailTabDirty("courses");
          renderEngagementProgramSessions(nextSessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
          return;
        }
        const sessionElement = button.closest("[data-engagement-program-session]");
        const sessionIndex = Array.from(portalContext.elements.engagementsProgramSessions?.querySelectorAll("[data-engagement-program-session]") || []).indexOf(sessionElement);
        if (action === "add-slot") {
          const targetSession = sessions.find((session) => session.id === portalState.activeEngagementProgramSessionId);
          const eventCode = button.dataset.engagementProgramEvent || "";
          const genderMode = button.dataset.engagementProgramGender || "mixed";
          const phase = engagementProgramNextPhase(sessions, eventCode, genderMode);
          if (targetSession && phase && engagementProgramCanAddPassage(sessions, eventCode, genderMode, portalState.activeEngagementProgramSessionId)) {
            targetSession.items.push({ eventCode, genderMode, phase });
            portalActions.markEngagementDetailTabDirty("courses");
          }
        } else if (action === "select-session" && sessions[sessionIndex]) {
          portalState.activeEngagementProgramSessionId = sessions[sessionIndex].id;
        } else if (action === "remove-session" && sessionIndex >= 0) {
          const removedId = sessions[sessionIndex]?.id;
          sessions.splice(sessionIndex, 1);
          if (removedId === portalState.activeEngagementProgramSessionId) portalState.activeEngagementProgramSessionId = "";
          portalActions.markEngagementDetailTabDirty("courses");
        } else {
          const rowElement = button.closest("[data-engagement-program-row]");
          const rowIndex = Array.from(sessionElement?.querySelectorAll("[data-engagement-program-row]") || []).indexOf(rowElement);
          const rows = sessions[sessionIndex]?.items || [];
          if (action === "remove-row" && rowIndex >= 0) {
            rows.splice(rowIndex, 1);
            portalActions.markEngagementDetailTabDirty("courses");
          } else if (action === "move-up" && rowIndex > 0) {
            [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
            portalActions.markEngagementDetailTabDirty("courses");
          } else if (action === "move-down" && rowIndex >= 0 && rowIndex < rows.length - 1) {
            [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
            portalActions.markEngagementDetailTabDirty("courses");
          }
        }
        renderEngagementProgramSessions(sessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
      }

    function selectedEngagementEventsFromForm() {
        const checkedInputs = Array.from(portalContext.elements.engagementsEventsForm?.querySelectorAll("[data-engagement-event-code]:checked") || []);
        return checkedInputs.map((input) => {
          const code = input.dataset.engagementEventCode || "";
          const definition = portalActions.engagementEventDefinition(code);
          if (!definition) return null;
          const allowedCategories = engagementAllowedCategoryCodes(code);
          const checkedCategories = Array.from(input.closest("[data-engagement-event-item]")?.querySelectorAll("[data-engagement-category-code]:checked") || [])
            .map((categoryInput) => categoryInput.dataset.engagementCategoryCode)
            .filter((categoryCode) => allowedCategories.includes(categoryCode))
            .filter(Boolean);
          const categoryRestrictions = checkedCategories.length === allowedCategories.length && !portalConfig.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]
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
        const selectedItems = Array.from(portalContext.elements.engagementsEventsForm?.querySelectorAll("[data-engagement-event-item]") || [])
          .filter((item) => item.querySelector("[data-engagement-event-code]")?.checked === true);
        const invalidItem = selectedItems.find((item) => !item.querySelectorAll("[data-engagement-category-code]:checked").length);
        const label = invalidItem?.querySelector("[data-engagement-event-label]")?.textContent?.trim();
        return invalidItem ? `Au moins une catégorie doit rester autorisée pour ${label || "chaque épreuve"}.` : "";
      }

    function selectedEngagementProgramError() {
        const eventLabels = new Map(selectedEngagementEventOptions().map((event) => [event.code, event.label]));
        const sessions = selectedEngagementProgramSessionsFromForm();
        const occurrences = sessions.flatMap((session, sessionIndex) => (session.items || []).map((item, itemIndex) => ({
          ...item,
          position: sessionIndex * 160 + itemIndex
        })));
        const usedByPhase = new Map();
        for (const item of occurrences) {
          const phaseKey = `${item.eventCode}:${item.phase}`;
          const usedModes = usedByPhase.get(phaseKey) || new Set();
          const duplicate = item.genderMode === "mixed" ? usedModes.size > 0 : usedModes.has("mixed") || usedModes.has(item.genderMode);
          if (duplicate) return `Doublon dans le programme : ${eventLabels.get(item.eventCode) || item.eventCode} · ${engagementProgramPhaseLabel(item.phase)}.`;
          usedModes.add(item.genderMode);
          usedByPhase.set(phaseKey, usedModes);
        }
        const modesByEvent = new Map();
        occurrences.forEach((item) => {
          if (!modesByEvent.has(item.eventCode)) modesByEvent.set(item.eventCode, new Set());
          modesByEvent.get(item.eventCode).add(item.genderMode);
        });
        for (const [eventCode, modes] of modesByEvent) {
          if (modes.has("mixed") && modes.size > 1) return `F/H ensemble ne peut pas être combiné avec Femmes ou Hommes pour ${eventLabels.get(eventCode) || eventCode}.`;
        }
        const groups = new Map();
        occurrences.forEach((item) => {
          const key = `${item.eventCode}:${item.genderMode}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(item);
        });
        for (const items of groups.values()) {
          const eventCode = items[0].eventCode;
          const eventLabel = eventLabels.get(eventCode) || eventCode;
          const phases = new Set(items.map((item) => item.phase));
          if (phases.has("direct") && phases.size > 1) return `Course directe incompatible avec un autre passage pour ${eventLabel}.`;
          const heats = items.find((item) => item.phase === "heats");
          const final = items.find((item) => item.phase === "final");
          const slowHeats = items.find((item) => item.phase === "slowHeats");
          const fastHeat = items.find((item) => item.phase === "fastHeat");
          if (Boolean(heats) !== Boolean(final)) return `Les séries et la finale doivent être programmées ensemble pour ${eventLabel}.`;
          if (Boolean(slowHeats) !== Boolean(fastHeat)) return `Les séries lentes et la série rapide doivent être programmées ensemble pour ${eventLabel}.`;
          if ((heats || final) && (slowHeats || fastHeat)) return `Deux formats de déroulement sont combinés pour ${eventLabel}.`;
          if (heats && final && heats.position >= final.position) return `La finale doit être placée après les séries pour ${eventLabel}.`;
          if (slowHeats && fastHeat && slowHeats.position >= fastHeat.position) return `La série rapide doit être placée après les séries lentes pour ${eventLabel}.`;
        }
        return "";
      }

    function engagementAllowedCategoryCodes(eventCode) {
        const definitions = engagementCategoryDefinitionsForEvent(eventCode);
        const forbidden = portalConfig.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[eventCode] || new Set();
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
        const definition = portalActions.engagementEventDefinition(eventCode);
        return definition?.type === "relay"
          ? portalConfig.ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
          : portalConfig.ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS;
      }

    function updateEngagementEventsSummaryFromForm(event) {
        if (event?.type === "input" && event.target?.matches?.("[data-engagement-category-column]")) return;
        if (event?.target?.closest?.("[data-engagement-program-sessions]")) {
          const sessions = selectedEngagementProgramSessionsFromForm();
          updateEngagementEventsSectionSummaries(selectedEngagementEventsFromForm(), sessions);
          portalActions.markEngagementDetailTabDirty("courses");
          return;
        }
        portalActions.markEngagementDetailTabDirty("courses");
        setEngagementEventsSectionOpen(portalContext.elements.engagementsProgramSection, true);
        const previousProgramSessions = selectedEngagementProgramSessionsFromForm();
        portalContext.elements.engagementsEventsForm?.querySelectorAll("[data-engagement-event-item]").forEach((item) => {
          const checked = item.querySelector("[data-engagement-event-code]")?.checked === true;
          const restrictions = item.querySelector("[data-engagement-event-restrictions]");
          const relayMixedModeField = item.querySelector("[data-engagement-relay-mixed-mode]");
          const relayMultipleField = item.querySelector("[data-engagement-relay-multiple]");
          item.dataset.selected = checked ? "true" : "false";
          if (restrictions) restrictions.hidden = !checked;
          if (relayMixedModeField?.dataset.engagementRelayMixedEditable === "true") {
            relayMixedModeField.disabled = !checked;
          }
          if (relayMultipleField) relayMultipleField.disabled = !checked || !portalActions.isEngagementAdminMode() || !portalState.engagementDetailEditing || !portalActions.canEditEngagementCompetition();
        });
        updateEngagementCategoryColumnControls(portalContext.elements.engagementsIndividualEvents);
        updateEngagementCategoryColumnControls(portalContext.elements.engagementsRelayEvents);
        if (!portalContext.elements.engagementsEventsSummary) return;
        const selectedEvents = selectedEngagementEventsFromForm();
        portalContext.elements.engagementsEventsSummary.textContent = engagementEventSummary(selectedEvents);
        updateEngagementEventsSectionSummaries(selectedEvents, previousProgramSessions);
        renderEngagementProgramSessions(previousProgramSessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
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

    const openWaterProposedDistances = new Set([150,1000,2000,3000,4000,5000,6000]);
    const openWaterReadyDistances = new Set(openWaterProposedDistances);
    const openWaterExtraDistances = new Set();
    let openWaterVisibleCompetitionId = null;
    function renderEngagementOpenWaterCourseLibrary() {
        if (!portalContext.elements.engagementsOpenWaterCourseList) return;
        const competitionId = portalState.selectedEngagementCompetition?.id || "";
        if (competitionId !== openWaterVisibleCompetitionId) {
          openWaterExtraDistances.clear();
          openWaterVisibleCompetitionId = competitionId;
        }
        const canEdit = portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition();
        const selectedCodes = new Set(selectedEngagementEventsFromForm().map((event) => event.code));
        const visibleCourses = portalState.engagementOpenWaterCourses.filter(course =>
          openWaterProposedDistances.has(course.distance) || openWaterExtraDistances.has(course.distance) ||
          selectedCodes.has(portalActions.engagementOpenWaterEventCode(course))
        );
        const disciplineColumns = [
          { code: "SF", label: "Surface", shortLabel: "SF" },
          { code: "BI", label: "Bi-palmes", shortLabel: "BI" },
          { code: "SUP", label: "Support", shortLabel: "SP" }
        ];
        const courseRows = Array.from(visibleCourses.reduce((rows, course) => {
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
          const selected = selectedCodes.has(portalActions.engagementOpenWaterEventCode(course));
          const active = course.active !== false;
          if(active||selected)return `<label class="admin-engagements-open-water-course-check"><input type="checkbox" data-open-water-course-select="${portalActions.escapeHtml(course.id)}" aria-label="${portalActions.escapeHtml(course.label)}" ${selected?'checked':''} ${canEdit?'':'disabled'}></label>`;
          const actionLabel = selected ? `${course.label} déjà ajoutée` : active ? `Ajouter ${course.label}` : `Réactiver ${course.label}`;
          const action = active
            ? `<button class="admin-engagements-open-water-course-add" type="button" data-open-water-course-select="${portalActions.escapeHtml(course.id)}" data-open-water-course-selected="${selected ? "true" : "false"}" aria-label="${portalActions.escapeHtml(actionLabel)}" title="${portalActions.escapeHtml(actionLabel)}" ${!canEdit || selected ? "disabled" : ""}>${selected ? "✓" : "+"}</button>`
            : `<button class="admin-engagements-open-water-course-status" type="button" data-open-water-course-id="${portalActions.escapeHtml(course.id)}" data-open-water-course-next-active="true" aria-label="${portalActions.escapeHtml(actionLabel)}" title="${portalActions.escapeHtml(actionLabel)}" ${!canEdit ? "disabled" : ""}>↻</button>`;
          const deactivate = canEdit && active
            ? `<button class="admin-engagements-open-water-course-status" type="button" data-open-water-course-id="${portalActions.escapeHtml(course.id)}" data-open-water-course-next-active="false" aria-label="Désactiver ${portalActions.escapeHtml(course.label)}" title="Désactiver ${portalActions.escapeHtml(course.label)}">×</button>`
            : "";
          return `<span class="admin-engagements-open-water-course-actions" data-open-water-course-active="${active ? "true" : "false"}">${action}${deactivate}</span>`;
        };
        portalContext.elements.engagementsOpenWaterCourseList.innerHTML = `
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
        if (portalContext.elements.engagementsOpenWaterCourseCreator) portalContext.elements.engagementsOpenWaterCourseCreator.hidden = !canEdit;
      }

    async function loadEngagementOpenWaterCourses({ force = false } = {}) {
        if (portalState.engagementOpenWaterCoursesLoading || (portalState.engagementOpenWaterCoursesLoaded && !force)) return;
        portalState.engagementOpenWaterCoursesLoading = true;
        if (portalContext.elements.engagementsOpenWaterCourseMessage) {
          portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "Chargement de la bibliothèque...";
          portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("listEngagementOpenWaterCourses", {});
          const draft = portalState.engagementDetailEditing && portalContext.elements.engagementsEventsForm
            ? {events:selectedEngagementEventsFromForm(),programSessions:selectedEngagementProgramSessionsFromForm()}
            : {};
          portalState.engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : portalState.engagementOpenWaterCourses;
          portalState.engagementOpenWaterCoursesLoaded = true;
          renderEngagementOpenWaterCourseLibrary();
          if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater") renderEngagementEvents({...portalState.selectedEngagementCompetition,...draft});
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "";delete portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone;}
        } catch (error) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `Bibliothèque indisponible : ${error?.message || error}`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
        } finally {
          portalState.engagementOpenWaterCoursesLoading = false;
        }
      }

    function addEngagementOpenWaterCourseToProgram(courseId = "") {
        const course = portalState.engagementOpenWaterCourses.find((item) => item.id === courseId);
        if (!course) return;
        const preservedEvents = selectedEngagementEventsFromForm();
        const definition = portalActions.engagementOpenWaterEventDefinitions({ events: preservedEvents }).find((event) => event.openWaterCourseId === course.id);
        if (!definition) return;
        const removing=preservedEvents.some(event=>event.code===definition.code);
        if (!removing && course.active === false) return;
        const preservedSessions = selectedEngagementProgramSessionsFromForm();
        if(removing&&preservedSessions.some(session=>session.items?.some(item=>item.eventCode===definition.code))&&!global.confirm("Décocher cette course et retirer ses passages du programme ? Les changements restent locaux jusqu’à l’enregistrement. Aucun engagement ne sera supprimé.")){renderEngagementOpenWaterCourseLibrary();return;}
        renderEngagementEvents({
          ...portalState.selectedEngagementCompetition,
          events: removing?preservedEvents.filter(event=>event.code!==definition.code):[...preservedEvents, { ...definition, categoryRestrictions: [] }],
          programSessions: removing?preservedSessions.map(session=>({...session,items:session.items.filter(item=>item.eventCode!==definition.code)})):preservedSessions
        });
        portalActions.markEngagementDetailTabDirty("courses");
        if (portalContext.elements.engagementsOpenWaterCourseMessage) {
          portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "";
          portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "ok";
        }
      }

    async function addEngagementOpenWaterCourse(event) {
        event?.preventDefault?.();
        if(portalContext.elements.engagementsOpenWaterCourseAdd?.disabled)return;
        const distance = Math.trunc(Number(portalContext.elements.engagementsOpenWaterDistance?.value));
        if (!Number.isInteger(Number(portalContext.elements.engagementsOpenWaterDistance?.value))||distance<1||distance>100000) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "Renseignez une distance entière de 1 à 100 000 mètres.";
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
          return;
        }
        const preservedEvents = selectedEngagementEventsFromForm();
        const preservedSessions = selectedEngagementProgramSessionsFromForm();
        try {
          const addButton=portalContext.elements.engagementsOpenWaterCourseAdd;
          if(addButton)addButton.disabled=true;
          const existing = portalState.engagementOpenWaterCourses.filter(course=>course.distance===distance);
          const disciplines = distance===150?["SF","BI"]:["SF","BI","SUP"];
          const alreadyAvailable = disciplines.every(discipline=>existing.some(course=>course.discipline===discipline&&course.active!==false));
          const result = alreadyAvailable && openWaterReadyDistances.has(distance) ? {courses:portalState.engagementOpenWaterCourses} : await portalActions.callFunction("addEngagementOpenWaterCourse", { distance });
          if(result.nativeReferencesReady===true)openWaterReadyDistances.add(distance);
          portalState.engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : portalState.engagementOpenWaterCourses;
          portalState.engagementOpenWaterCoursesLoaded = true;
          openWaterExtraDistances.add(distance);
          if (portalContext.elements.engagementsOpenWaterDistance) portalContext.elements.engagementsOpenWaterDistance.value = "";
          if (portalContext.elements.engagementsOpenWaterDiscipline) portalContext.elements.engagementsOpenWaterDiscipline.value = "";
          renderEngagementEvents({
            ...portalState.selectedEngagementCompetition,
            events: preservedEvents,
            programSessions: preservedSessions
          });
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `${distance} m ajouté.`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `Ajout impossible : ${error?.message || error}`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
        } finally {if(portalContext.elements.engagementsOpenWaterCourseAdd)portalContext.elements.engagementsOpenWaterCourseAdd.disabled=false;}
      }

    async function setEngagementOpenWaterCourseStatus(button) {
        const courseId = button?.dataset.openWaterCourseId || "";
        const active = button?.dataset.openWaterCourseNextActive === "true";
        if (!courseId) return;
        const preservedEvents = selectedEngagementEventsFromForm();
        const preservedSessions = selectedEngagementProgramSessionsFromForm();
        try {
          const result = await portalActions.callFunction("setEngagementOpenWaterCourseStatus", { courseId, active });
          portalState.engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : portalState.engagementOpenWaterCourses;
          renderEngagementEvents({ ...portalState.selectedEngagementCompetition, events: preservedEvents, programSessions: preservedSessions });
        } catch (error) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `Modification impossible : ${error?.message || error}`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
        }
      }

    function renderEngagementEventGroup(mount, type, selectedCodes, canEdit, competition = portalState.selectedEngagementCompetition || {}) {
        if (!mount) return;
        let events = portalActions.engagementEventDefinitionsForCompetition(competition).filter((event) => event.type === type);
        if (portalActions.engagementCompetitionType(competition) === "openWater" && type === "individual") {
          events = events.filter((event) => selectedCodes.has(event.code));
        }
        const relayTable = type === "relay";
        const categoryDefinitions = type === "relay"
          ? portalConfig.ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
          : portalConfig.ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS;
        const categoryHead = categoryDefinitions.map(([code, label]) => `
      <label class="admin-engagements-category-column-control" title="${portalActions.escapeHtml(label)} : appliquer à toutes les courses sélectionnées">
        <input type="checkbox" data-engagement-category-column="${portalActions.escapeHtml(code)}" aria-label="${portalActions.escapeHtml(label)} pour toutes les courses" ${canEdit ? "" : "disabled"}>
        <span>${portalActions.escapeHtml(code)}</span>
      </label>
    `).join("");
        const rows = events.map((event) => {
          const selectedEvent = selectedCodes.get(event.code) || {};
          const selected = Boolean(selectedEvent.code);
          const restrictedCategories = normalizeEngagementCategoryRestrictions(
            event.code,
            Array.isArray(selectedEvent.categoryRestrictions) ? selectedEvent.categoryRestrictions : []
          );
          const forbiddenCategories = portalConfig.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set();
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
            <input type="checkbox" data-engagement-event-code="${portalActions.escapeHtml(event.code)}" ${selected ? "checked" : ""} ${canEdit && (competition.napSource !== true || portalActions.engagementCompetitionType(competition) === "openWater" || portalActions.engagementCompetitionType(competition) === "pool" && !selected) ? "" : "disabled"} ${competition.napSource === true && selected && portalActions.engagementCompetitionType(competition)!=="openWater" ? 'title="Course déjà enregistrée ; utilisez Retirer cette course pour la supprimer."' : ""}>
            <span>
              <strong data-engagement-event-label title="${portalActions.escapeHtml(event.label)}${portalActions.escapeHtml(mixedRuleLabel)}">${portalActions.escapeHtml(event.shortLabel)}</strong>
            </span>
          </label>
          ${relayTable ? mixedRuleCell : ""}
          ${multipleRelayCell}
          <div class="admin-engagements-event-restrictions" data-engagement-event-restrictions ${selected ? "" : "hidden"}>
            ${categoryDefinitions.map(([code, label]) => forbiddenCategories.has(code)
                  ? `<span class="admin-engagements-category-blocked" title="${portalActions.escapeHtml(label)} - interdit par le reglement"></span>`
                  : `
                <label title="${portalActions.escapeHtml(label)}">
                  <input type="checkbox" aria-label="${portalActions.escapeHtml(label)}" data-engagement-category-code="${portalActions.escapeHtml(code)}" ${allCategoriesAllowed || restrictedCategories.has(code) ? "checked" : ""} ${canEdit ? "" : "disabled"}>
                  <span>${portalActions.escapeHtml(code)}</span>
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

    function renderEngagementEvents(competition = portalState.selectedEngagementCompetition || {}) {
        const events = Array.isArray(competition.events) ? competition.events : [];
        const selectedCodes = new Map(events.map((event) => [event.code, event]).filter(([code]) => Boolean(code)));
        const adminMode = portalActions.isEngagementAdminMode();
        renderEngagementNativeEditWarnings(competition);
        renderNativeCourseRemoval(competition, adminMode && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition(competition));
        const canEdit = adminMode && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition(competition) && !competition.qualificationJobId && (competition.napSource !== true || !competition.qualifications?.enabled || portalActions.canUse("engagements.national.manage"));
        const clubProgramView = !adminMode;
        const openWater = portalActions.engagementCompetitionType(competition) === "openWater";
        if (portalContext.elements.engagementsOpenWaterLibrary) portalContext.elements.engagementsOpenWaterLibrary.hidden = !openWater || !adminMode;
        if (portalContext.elements.engagementsEventsForm) {
          portalContext.elements.engagementsEventsForm.dataset.clubProgramView = clubProgramView ? "true" : "false";
        }
        if (portalContext.elements.engagementsEventsChoiceSection) portalContext.elements.engagementsEventsChoiceSection.hidden = !adminMode;
        if (portalContext.elements.engagementsProgramSection) portalContext.elements.engagementsProgramSection.hidden = false;
        if (portalContext.elements.engagementsProgramEditHint) portalContext.elements.engagementsProgramEditHint.hidden = !adminMode || !portalState.engagementDetailEditing || !canEdit;
        renderEngagementEventGroup(portalContext.elements.engagementsIndividualEvents, "individual", selectedCodes, canEdit, competition);
        renderEngagementEventGroup(portalContext.elements.engagementsRelayEvents, "relay", selectedCodes, canEdit, competition);
        if (openWater && adminMode) {
          renderEngagementOpenWaterCourseLibrary();
          void loadEngagementOpenWaterCourses();
        }
        if (portalContext.elements.engagementsEventsSummary) {
          portalContext.elements.engagementsEventsSummary.textContent = clubProgramView && !events.length ? "Programme en préparation." : engagementEventSummary(events);
        }
        if (portalContext.elements.engagementsEventsSaveButton) {
          portalContext.elements.engagementsEventsSaveButton.hidden = true;
          portalContext.elements.engagementsEventsSaveButton.disabled = true;
        }
        renderEngagementProgramSessions(competition.programSessions || [], adminMode && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition(competition));
        if (clubProgramView) setEngagementEventsSectionOpen(portalContext.elements.engagementsProgramSection, true);
        updateEngagementEventsSectionSummaries(
          events,
          normalizedEngagementProgramSessions(competition.programSessions || [], events.map((event) => ({ code: event.code, label: event.shortLabel || event.code })))
        );
        if (portalContext.elements.engagementsEventsMessage) {
          portalContext.elements.engagementsEventsMessage.textContent = !adminMode
            ? ""
            : portalActions.canEditEngagementCompetition(competition)
            ? ""
          : "Programme consultable uniquement avec un droit de gestion sur cette compétition.";
          portalContext.elements.engagementsEventsMessage.dataset.tone = canEdit ? "ok" : "";
        }
      }

    function renderNativeCourseRemoval(competition, canEdit) {
        if (!portalContext.elements.engagementsEventsForm) return;
        let mount = document.getElementById("adminNativeCourseRemoval");
        if (!mount) {
          mount = document.createElement("div");
          mount.id = "adminNativeCourseRemoval";
          portalContext.elements.engagementsEventsForm.append(mount);
        }
        mount.hidden = competition.napSource !== true || !canEdit || portalActions.engagementCompetitionType(competition)==="openWater";
        if (mount.hidden) { mount.textContent = ""; return; }
        mount.innerHTML = `<p>Courses de la compétition. Si des engagements existent, seul le National peut retirer une course après confirmation. Les engagements sont conservés.</p><ul>${(competition.nativeRules?.courses || []).map(course => `<li>${portalActions.escapeHtml(course.course || "Course ancienne")} ${portalActions.escapeHtml(course.sexe === "F" ? "Femmes" : course.sexe === "M" ? "Hommes" : "Mixte")} <button type="button" class="ghost-button" data-native-course-remove="${portalActions.escapeHtml(String(course.id))}">Retirer cette course</button></li>`).join("")}</ul>`;
        mount.querySelectorAll("[data-native-course-remove]").forEach(button => button.addEventListener("click", async () => {
          try {
            if (Object.keys(portalActions.nativeCompetitionPatchFromForm()).length) throw new Error("Enregistrez ou annulez vos autres modifications avant de retirer une course.");
            if (!global.confirm("Retirer cette course de la compétition ?\n\nAttention : les engagements déjà saisis seront conservés et devront être vérifiés manuellement. Le programme détaillé sera conservé. Si des engagements existent, ce retrait est réservé au National.")) return;
            mount.querySelectorAll("button").forEach(item => { item.disabled = true; });
            const result = await portalActions.callFunction("updateEngagementCompetition", { competitionId:competition.id, expectedFingerprint:competition.napFingerprint, patch:{removeNativeCourseId:button.dataset.nativeCourseRemove,confirmCourseRemoval:true} });
            portalState.selectedEngagementCompetition = result.competition;
            portalState.nativeCompetitionEditBaseline = null;
            portalActions.invalidateEngagementCalendarCaches();
            await portalActions.loadEngagementCompetitions({force:true});
            portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
            portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition);
            portalActions.clearEngagementDetailTabDirty();
            portalContext.elements.engagementsDetailStatus.textContent = "Course retirée de NAP. Les engagements et le programme détaillé sont conservés : vérifiez-les si nécessaire.";
          } catch(error) {
            portalContext.elements.engagementsDetailStatus.textContent = error.message;
            mount.querySelectorAll("button").forEach(item => { item.disabled = false; });
          }
        }));
      }

    function renderEngagementCompetitions() {
        const mount = portalContext.elements.engagementsCalendarList;
        if (!mount) return;
        const visibleCompetitions = portalActions.filteredEngagementCompetitions();
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
        const { upcoming, past } = portalActions.engagementCalendarSections(visibleCompetitions);
        mount.innerHTML = `<h3 class="admin-engagements-period-title">En cours et à venir</h3>` +
          (upcoming.length ? renderEngagementCompetitionTable(upcoming, "upcoming", portalState.engagementCompetitionsVisibleLimit)
            : '<p class="admin-engagements-empty">Aucune compétition en cours ou à venir pour ces filtres.</p>') +
          (past.length ? `<details class="admin-engagements-past" data-engagement-past ${portalState.engagementPastCompetitionsExpanded ? "open" : ""}>
        <summary>Compétitions passées (${past.length})</summary>
        ${renderEngagementCompetitionTable(past, "past", portalState.engagementPastCompetitionsVisibleLimit)}
      </details>` : "");
      }

    function renderEngagementCompetitionTable(visibleCompetitions, period, limit) {
        const renderedCompetitions = visibleCompetitions.slice(0, limit);
        const groupedCompetitions = [];
        renderedCompetitions.forEach((competition) => {
          const groupLabel = portalActions.engagementCompetitionMonthLabel(competition);
          let group = groupedCompetitions.at(-1);
          if (!group || group.label !== groupLabel) {
            group = { label: groupLabel, competitions: [] };
            groupedCompetitions.push(group);
          }
          group.competitions.push(competition);
        });
        return `
      <div class="admin-engagements-competitions-table" role="table" aria-label="${period === "past" ? "Compétitions passées" : portalActions.isEngagementAdminMode() ? "Compétitions à administrer" : "Engagements en compétition"}">
        <div class="admin-engagements-competitions-table-head" role="row">
          <span role="columnheader">Date</span>
          <span role="columnheader">Compétition</span>
          <span role="columnheader">Niveau / région</span>
          <span role="columnheader">${portalActions.isEngagementAdminMode() ? "Publication" : "Engagements"}</span>
          <span role="columnheader">Action</span>
        </div>
        ${groupedCompetitions.map((group, groupIndex) => `
          <section class="admin-engagements-competition-group" role="rowgroup" aria-labelledby="engagement-competition-group-${period}-${groupIndex}">
            <h4 id="engagement-competition-group-${period}-${groupIndex}">${portalActions.escapeHtml(group.label)}</h4>
            ${group.competitions.map((competition) => {
                  const action = portalActions.engagementCompetitionAction(competition);
                  const entryStatus = competition.entryStatus || "upcoming";
                  const deadlineLabel = portalActions.engagementDeadlineDisplay(competition);
                  const showStatusBadge = entryStatus !== "open";
                  const calendarEvent = competition.sourceType === "calendarEvent";
                  return `
                <article class="admin-engagements-competition ${competition.id === portalState.selectedEngagementCompetitionId ? "selected" : ""}" role="row" data-competition-type="${portalActions.escapeHtml(portalActions.engagementCompetitionType(competition))}" data-engagement-competition-card-id="${portalActions.escapeHtml(competition.id)}" data-engagement-open-tab="${portalActions.escapeHtml(action.tab)}">
                  <time class="admin-engagements-competition-date" role="cell" data-label="Date" datetime="${portalActions.escapeHtml(competition.date || "")}">${portalActions.escapeHtml(portalActions.formatEngagementCompetitionDate(competition))}</time>
                  <div class="admin-engagements-competition-main" role="cell" data-label="Compétition">
                    <strong>${portalActions.escapeHtml(competition.name || "Compétition sans nom")}</strong>
                    <small class="admin-engagements-competition-type">${portalActions.escapeHtml(portalActions.engagementCompetitionTypeLabel(portalActions.engagementCompetitionType(competition)))}</small>
                    <small class="admin-engagements-competition-location">${portalActions.escapeHtml(competition.city || competition.location || "Ville non renseignée")}</small>
                    <small class="admin-engagements-competition-mobile-meta">${portalActions.escapeHtml([
                          competition.city || competition.location || "Ville non renseignée",
                          portalActions.engagementLevelLabel(competition.level),
                          competition.regionId ? portalActions.regionDisplayLabel(competition.regionId) : ""
                        ].filter(Boolean).join(" · "))}</small>
                  </div>
                  <div class="admin-engagements-competition-scope" role="cell" data-label="Niveau / région">
                    <span>${portalActions.escapeHtml(portalActions.engagementLevelLabel(competition.level))}</span>
                    ${competition.regionId ? `<small>${portalActions.escapeHtml(portalActions.regionDisplayLabel(competition.regionId))}</small>` : ""}
                  </div>
                  <div class="admin-engagements-competition-status" role="cell" data-label="${portalActions.isEngagementAdminMode() ? "Publication" : "Engagements"}">
                    ${calendarEvent || portalActions.isEngagementAdminMode()
                          ? `<span class="admin-engagements-competition-entry-badge" data-entry-state="${competition.publicationStatus === "published" ? "open" : "upcoming"}">${portalActions.escapeHtml(portalActions.publicCalendarPublicationLabel(competition.publicationStatus))}</span>${competition.canceled ? "<small>Événement annulé</small>" : ""}`
                          : `${showStatusBadge ? `<span class="admin-engagements-competition-entry-badge" data-entry-state="${portalActions.escapeHtml(entryStatus)}">${portalActions.escapeHtml(portalActions.engagementStatusLabel(entryStatus))}</span>` : ""}${deadlineLabel ? `<small data-entry-status="${portalActions.escapeHtml(portalActions.engagementDeadlineTone(competition))}" data-engagement-deadline-competition-id="${portalActions.escapeHtml(competition.id)}">${portalActions.escapeHtml(deadlineLabel)}</small>` : ""}`}
                  </div>
                  <div class="admin-engagements-competition-actions" role="cell" data-label="Action">
                    <button class="ghost-button" type="button" aria-label="${portalActions.escapeHtml(`${action.label} — ${competition.name || "Compétition sans nom"}`)}" data-engagement-competition-id="${portalActions.escapeHtml(competition.id)}" data-engagement-open-tab="${portalActions.escapeHtml(action.tab)}">
                      ${action.tab === "team"
                            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><circle cx="17" cy="9" r="3"></circle><path d="M2 21a6 6 0 0 1 12 0M12 21a5 5 0 0 1 10 0"></path></svg>'
                            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'}
                      <span>${portalActions.escapeHtml(action.label)}</span>
                    </button>
                  </div>
                </article>
              `;
                }).join("")}
          </section>
        `).join("")}
      </div>
    ` + (renderedCompetitions.length < visibleCompetitions.length
          ? `<button class="ghost-button admin-engagements-show-more" type="button" data-engagement-show-more="${period}">Afficher plus de compétitions${period === "past" ? " passées" : ""}</button>`
          : "");
      }

    function setEngagementCompetitionDetailVisible(visible) {
        if (portalContext.elements.engagementsView) portalContext.elements.engagementsView.dataset.detailOpen = visible ? "true" : "false";
        if (!visible) portalState.qualificationExceptionScope = "";
        if (portalContext.elements.engagementsCalendarPanel) portalContext.elements.engagementsCalendarPanel.dataset.detailOpen = visible ? "true" : "false";
        if (portalContext.elements.engagementsCalendarCard) portalContext.elements.engagementsCalendarCard.dataset.detailOpen = visible ? "true" : "false";
        if (portalContext.elements.engagementsCalendarFilters) portalContext.elements.engagementsCalendarFilters.hidden = visible;
        if (portalContext.elements.engagementsCalendarList) portalContext.elements.engagementsCalendarList.hidden = visible;
        if (portalContext.elements.engagementsCalendarActions) {
          const calendarActionsVisible = !visible && portalActions.isEngagementAdminMode() && portalState.activeEngagementsTab === "calendar";
          portalContext.elements.engagementsCalendarActions.hidden = !calendarActionsVisible;
        }
        if (portalContext.elements.engagementsDetail) portalContext.elements.engagementsDetail.hidden = !visible;
        if (portalContext.elements.engagementsDetailClose) portalContext.elements.engagementsDetailClose.hidden = !visible;
        if (!visible) portalActions.setEngagementSaveState("");
      }

    function setEngagementClubEntryLoadingState(state = "") {
        if (!portalContext.elements.engagementsDetail) return;
        if (state) {
          portalContext.elements.engagementsDetail.dataset.clubEntryLoading = state;
          portalContext.elements.engagementsDetail.setAttribute("aria-busy", state === "loading" ? "true" : "false");
          return;
        }
        delete portalContext.elements.engagementsDetail.dataset.clubEntryLoading;
        portalContext.elements.engagementsDetail.removeAttribute("aria-busy");
      }

    function engagementNativeEditWarningKind(warning) {
        switch (String(warning || "").trim()) {
          case "Courses anciennes conservees.": return "courses";
          case "Une admission regionale ancienne reste conservee ; sa correspondance doit etre verifiee avant modification.": return "regions";
          default: return "";
        }
      }

    function renderEngagementNativeEditWarnings(competition = {}) {
        const editing = portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && competition.napSource === true && portalActions.canEditEngagementCompetition(competition);
        const kinds = new Set((competition.nativeWarnings || []).map(engagementNativeEditWarningKind));
        [
          [portalContext.elements.engagementsNativeCoursesWarning, "courses", "Une ou plusieurs courses NAP ne correspondent pas au catalogue LivePalmes. Elles sont conservées ; faites vérifier leur correspondance avant de modifier le programme."],
          [portalContext.elements.engagementsNativeRegionsWarning, "regions", "Un code de région NAP n’est pas reconnu. Les régions invitées sont conservées ; leur modification est bloquée jusqu’à vérification de la correspondance."]
        ].forEach(([element, kind, label]) => {
          if (!element) return;
          const visible = editing && kinds.has(kind);
          element.textContent = visible ? label : "";
          element.hidden = !visible;
        });
      }

    function engagementClubContextMessage(competition = {}) {
        if (portalActions.isEngagementAdminMode()) return "";
        if (competition.canceled || competition.entryStatus !== "open" || portalActions.engagementDeadlineTone(competition) === "deadline-passed") return "";
        const lockReason = portalActions.engagementClubWriteLockReason({ ...competition, nativeReadOnly: false });
        if (lockReason) return lockReason;
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap" && competition.nativeTeamLeaderRequired) return "Déclarez votre chef d’équipe pour commencer les engagements.";
        return "";
      }

    return {
      formatEngagementAutomationDate,
      renderEngagementClosureAutomation,
      loadEngagementClubRecapFiles,
      renderEngagementClubRecapSelector,
      engagementStatisticsTimeModeLabel,
      renderEngagementCompetitionStatistics,
      loadEngagementCompetitionStatistics,
      engagementMailJobTypeLabel,
      renderEngagementMailJobs,
      loadEngagementMailJobs,
      engagementCompetitionDocumentCategoryLabel,
      engagementCompetitionDocumentCategoryOptions,
      engagementCompetitionDocumentFileSize,
      engagementCompetitionDocumentTypeLabel,
      renderEngagementCompetitionDocumentDrafts,
      openEngagementCompetitionDocumentForm,
      closeEngagementCompetitionDocumentForm,
      engagementCompetitionDocumentDraftValues,
      readEngagementCompetitionDocumentFile,
      handleEngagementCompetitionDocumentFiles,
      updateSelectedEngagementCompetitionDocuments,
      saveEngagementCompetitionDocuments,
      deleteEngagementCompetitionDocument,
      renderEngagementSharedDocuments,
      canDownloadEngagementOpenWaterTxt,
      renderEngagementDocuments,
      updateSelectedEngagementDocumentStatus,
      engagementEventSummary,
      engagementProgramSummary,
      engagementProgramStatusSummary,
      engagementEventsCompactSummary,
      missingEngagementProgramEventCount,
      updateEngagementEventsSectionToggleLabels,
      setEngagementEventsSectionOpen,
      updateEngagementEventsSectionSummaries,
      engagementEventCountLabel,
      selectedEngagementEventOptions,
      normalizedEngagementProgramSessions,
      selectedEngagementProgramSessionsFromForm,
      engagementProgramGenderModesForEvent,
      engagementProgramGenderModeShortLabel,
      engagementProgramGenderModeDisplayLabel,
      engagementProgramGenderModeTone,
      engagementProgramPhaseLabel,
      engagementProgramFormatsForEvent,
      engagementProgramPhaseForEvent,
      engagementProgramSameSlot,
      engagementProgramPassages,
      engagementProgramFormatForPhase,
      engagementProgramFirstPhaseForFormat,
      engagementProgramSecondPhaseForFormat,
      engagementProgramCanAddPassage,
      engagementProgramNextPhase,
      normalizeEngagementProgramPassageOrder,
      applyEngagementProgramFormatChange,
      renderEngagementProgramSessions,
      refreshEngagementProgramEditor,
      addEngagementProgramSession,
      handleEngagementProgramAction,
      selectedEngagementEventsFromForm,
      selectedEngagementEventsCategoryError,
      selectedEngagementProgramError,
      engagementAllowedCategoryCodes,
      normalizeEngagementCategoryRestrictions,
      engagementCategoryDefinitionsForEvent,
      updateEngagementEventsSummaryFromForm,
      engagementCategoryColumnInputs,
      updateEngagementCategoryColumnControls,
      applyEngagementCategoryColumnControl,
      renderEngagementOpenWaterCourseLibrary,
      loadEngagementOpenWaterCourses,
      addEngagementOpenWaterCourseToProgram,
      addEngagementOpenWaterCourse,
      setEngagementOpenWaterCourseStatus,
      renderEngagementEventGroup,
      renderEngagementEvents,
      renderNativeCourseRemoval,
      renderEngagementCompetitions,
      renderEngagementCompetitionTable,
      setEngagementCompetitionDetailVisible,
      setEngagementClubEntryLoadingState,
      engagementNativeEditWarningKind,
      renderEngagementNativeEditWarnings,
      engagementClubContextMessage
    };
  }
  global.LivePalmesPortalDocumentsAndProgram = { create };
})(window);
