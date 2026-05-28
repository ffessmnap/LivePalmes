(function attachLivePalmesAdminModals(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderRoleCodesModalHtml(options = {}) {
    const {
      active = false,
      adminAuthStatus = null,
      diagnosticsEnabled = false,
      pins = {},
      serverPinMode = false,
      roles = []
    } = options;
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Codes d'accès">
        <div class="decision-modal-head">
          <div>
            <span>Sécurité</span>
            <h2>Codes des consoles</h2>
            <p>Chaque code doit contenir exactement 4 chiffres. L'administrateur peut modifier les accès depuis cette fenêtre.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        <div class="role-code-grid">
          ${roles.map((item) => `
            <label>
              <span>${escapeHtml(item.label)}</span>
              <input type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" data-role-code="${escapeHtml(item.role)}" value="${serverPinMode ? "" : escapeHtml(pins[item.role] || "")}" placeholder="${serverPinMode ? "Nouveau code" : ""}">
            </label>
          `).join("")}
        </div>
        ${serverPinMode ? `<div class="admin-auth-status-box"><strong>Codes serveur actifs</strong><span>Les PIN ne sont plus affichés dans le navigateur. Pour les modifier, saisis les 6 nouveaux codes puis enregistre.</span></div>` : ""}
        <div class="admin-extra-zone">
          <span>Administration avancée</span>
          ${adminAuthStatus?.signedIn ? `
          <span class="admin-auth-chip">Admin connecte : ${escapeHtml(adminAuthStatus.email || "Firebase")}</span>
          <button class="ghost-button compact" type="button" data-admin-auth-signout>Deconnexion admin</button>
          ` : ""}
          ${diagnosticsEnabled ? `
          <button class="ghost-button compact" type="button" data-technical-diagnostic>Diagnostic technique</button>
          <button class="ghost-button compact" type="button" data-performance-diagnostic>Diagnostic perf</button>
          ` : ""}
          <button class="ghost-button compact" type="button" data-public-index-republish>Republier public</button>
          <button class="ghost-button compact" type="button" data-open-history-archives>Archives historiques</button>
        </div>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
          ${active ? `<button class="ghost-button danger-button" type="button" data-disable-role-codes>Désactiver les codes</button>` : ""}
          <button class="primary-button" type="button" data-save-role-codes="${active ? "keep" : "enable"}">${active ? "Enregistrer les codes" : "Enregistrer et activer"}</button>
        </div>
      </div>
    `;
  }

  function renderRoleCodesAdminModalHtml(options = {}) {
    const {
      action = "codes",
      adminAuthStatus = {},
      help = "",
      title = "Code administrateur"
    } = options;
    const canUseFirebaseAuth = adminAuthStatus.available && adminAuthStatus.configured && !adminAuthStatus.signedIn;
    const canUseLegacyCode = adminAuthStatus.legacyFallbackEnabled;
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="decision-modal-head">
          <div>
            <span>Sécurité</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(help)}</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        ${adminAuthStatus.signedIn ? `
        <div class="admin-auth-status-box">
          <strong>Admin Firebase connecte</strong>
          <span>${escapeHtml(adminAuthStatus.email || "Compte admin")}</span>
        </div>
        ` : ""}
        ${canUseFirebaseAuth ? `
        <div class="admin-auth-fields">
          <label class="role-code-admin-field">
            Email admin
            <input id="adminEmailInput" type="email" autocomplete="username" data-admin-auth-email>
          </label>
          <label class="role-code-admin-field">
            Mot de passe
            <input id="adminPasswordInput" type="password" autocomplete="current-password" data-admin-auth-password>
          </label>
        </div>
        ` : ""}
        ${canUseLegacyCode ? `
        <div class="admin-auth-warning">Migration en cours : aucun admin Firebase n'est encore configure, l'ancien code admin reste temporairement accepte.</div>
        <label class="role-code-admin-field">
          Code admin temporaire
          <input id="roleCodeAdminInput" type="password" inputmode="text" maxlength="5" autocomplete="off">
        </label>
        ` : ""}
        ${!adminAuthStatus.signedIn && !canUseFirebaseAuth && !canUseLegacyCode ? `
        <div class="admin-auth-warning">Connexion admin impossible : configure d'abord un UID ou email admin Firebase dans LivePalmes.</div>
        ` : ""}
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
          <button class="primary-button" type="button" data-confirm-role-code-admin="${escapeHtml(action)}">Continuer</button>
        </div>
      </div>
    `;
  }

  function renderResetHistoryModalHtml() {
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Confirmer RAZ historique">
        <div class="decision-modal-head">
          <div>
            <span>Historique</span>
            <h2>Confirmer le RAZ</h2>
            <p>Écris RAZ pour archiver l'historique actif puis le remettre à zéro.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        <label class="role-code-admin-field">
          Confirmation
          <input id="resetHistoryInput" type="text" maxlength="3" autocomplete="off">
        </label>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
          <button class="primary-button danger-button" type="button" data-confirm-reset-history>Archiver et remettre à zéro</button>
        </div>
      </div>
    `;
  }

  function renderResetResultsModalHtml(options = {}) {
    const {
      activeSession = "",
      selectedSession = "",
      sessions = []
    } = options;
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Confirmer RAZ LivePalmes">
        <div class="decision-modal-head">
          <div>
            <span>Remise à zéro</span>
            <h2>RAZ LivePalmes</h2>
            <p>Disponible uniquement en actualisation manuelle. Chaque RAZ archive ce qu'il efface avant suppression.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        <div class="admin-series-options">
          <label class="admin-series-option">
            <input type="radio" name="resetResultsScope" value="history">
            <strong>Journal d'arbitrage</strong>
            <span>Archive puis vide les décisions, forfaits, abandons et annonces.</span>
          </label>
          <label class="admin-series-option">
            <input type="radio" name="resetResultsScope" value="results-session" checked ${sessions.length ? "" : "disabled"}>
            <strong>Résultats d'une session</strong>
            <span>Archive puis supprime les résultats publiés et PDF complets liés à la session choisie.</span>
            ${sessions.length ? `
              <select id="resetResultsSessionSelect" class="reset-session-select" aria-label="Session à remettre à zéro">
                ${sessions.map((session) => `
                  <option value="${escapeHtml(session.number)}" ${session.number === selectedSession ? "selected" : ""}>Session ${escapeHtml(session.number)}</option>
                `).join("")}
              </select>
            ` : ""}
          </label>
          <label class="admin-series-option">
            <input type="radio" name="resetResultsScope" value="results-all" ${activeSession ? "" : "checked"}>
            <strong>Tous les résultats de la compétition</strong>
            <span>Archive puis supprime les résultats publics de toutes les sessions.</span>
          </label>
          <label class="admin-series-option danger-option">
            <input type="radio" name="resetResultsScope" value="series-all">
            <strong>Séries et compétition complète</strong>
            <span>Vide programme, séries, engagés, PDF de séries publics et résultats publics pour préparer une nouvelle compétition.</span>
          </label>
        </div>
        <label class="role-code-admin-field">
          Confirmation
          <input id="resetResultsInput" type="text" maxlength="3" autocomplete="off" placeholder="RAZ">
        </label>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
          <button class="primary-button danger-button" type="button" data-confirm-reset-results>Archiver et remettre à zéro</button>
        </div>
      </div>
    `;
  }

  function renderPublicSessionInfosModalHtml(options = {}) {
    const {
      infos = {},
      sessions = []
    } = options;
    return `
      <div class="decision-dialog role-codes-dialog session-infos-dialog" role="dialog" aria-modal="true" aria-label="Informations des sessions">
        <div class="decision-modal-head">
          <div>
            <span>Pages publiques</span>
            <h2>Informations</h2>
            <p>Ces textes apparaîtront sur les pages publiques Résultats et Séries quand on clique sur la session concernée.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        <div class="session-infos-editor">
          ${sessions.length ? sessions.map((session) => `
            <label class="session-info-field">
              <strong>Session ${escapeHtml(session.number)}</strong>
              <textarea data-session-info-input="${escapeHtml(session.number)}" rows="4" placeholder="Ex : échauffement à 8h00, début de session à 9h00, protocole à 11h30...">${escapeHtml(infos[session.number] || "")}</textarea>
            </label>
          `).join("") : `<p class="panel-subtitle">Aucune session chargée pour le moment.</p>`}
        </div>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-codes-close>Annuler</button>
          <button class="primary-button" type="button" data-save-public-session-infos ${sessions.length ? "" : "disabled"}>Publier les informations</button>
        </div>
      </div>
    `;
  }

  function archiveMeetLabel(archive) {
    const meet = archive?.meet || {};
    const parts = [meet.name, meet.city, meet.year].filter(Boolean);
    return parts.length ? parts.join(" - ") : "Compétition non renseignée";
  }

  function renderHistoryArchivesModalHtml(options = {}) {
    const {
      canDelete = false,
      formatDateTime = () => "",
      historyArchives = [],
      resultArchives = []
    } = options;
    return `
      <div class="decision-dialog role-codes-dialog history-archives-dialog" role="dialog" aria-modal="true" aria-label="Archives historiques" data-archives-can-delete="${canDelete ? "1" : "0"}">
        <div class="decision-modal-head">
          <div>
            <span>Administration</span>
            <h2>Archives historiques</h2>
            <p>Archives créées automatiquement avant un RAZ historique ou une remise à zéro des résultats.</p>
          </div>
          <button class="decision-close" type="button" data-role-codes-close aria-label="Fermer">×</button>
        </div>
        <h3 class="archive-section-title">Journal d'arbitrage</h3>
        <div class="archive-list">
          ${historyArchives.length ? historyArchives.map((archive) => `
            <div class="archive-item" data-archive-id="${escapeHtml(archive.id)}">
              <div>
                <strong>${escapeHtml(archive.createdLabel || formatDateTime(archive.createdAt) || archive.createdAt || "-")}</strong>
                <span>${escapeHtml(archiveMeetLabel(archive))}</span>
                <span>${escapeHtml(String(archive.count || archive.alerts?.length || 0))} lignes du journal</span>
              </div>
              <div class="archive-actions">
                <button class="ghost-button compact" type="button" data-open-archive="${escapeHtml(archive.id)}">Ouvrir</button>
                ${canDelete ? `<button class="ghost-button compact danger-button" type="button" data-delete-archive="${escapeHtml(archive.id)}">Supprimer</button>` : ""}
              </div>
            </div>
          `).join("") : `<p class="panel-subtitle">Aucune archive enregistrée.</p>`}
        </div>
        <h3 class="archive-section-title">Résultats publics</h3>
        <div class="archive-list">
          ${resultArchives.length ? resultArchives.map((archive) => `
            <div class="archive-item" data-result-archive-id="${escapeHtml(archive.id)}">
              <div>
                <strong>${escapeHtml(archive.createdLabel || formatDateTime(archive.createdAt) || archive.createdAt || "-")}</strong>
                <span>${escapeHtml(archiveMeetLabel(archive))}</span>
                <span>${escapeHtml(String(archive.count || 0))} résultats archivés${archive.reason ? ` - ${escapeHtml(archive.reason)}` : ""}</span>
              </div>
              <div class="archive-actions">
                <button class="ghost-button compact" type="button" data-open-result-archive="${escapeHtml(archive.id)}">Ouvrir</button>
                ${canDelete ? `<button class="ghost-button compact danger-button" type="button" data-delete-result-archive="${escapeHtml(archive.id)}">Supprimer</button>` : ""}
              </div>
            </div>
          `).join("") : `<p class="panel-subtitle">Aucune archive de résultats enregistrée.</p>`}
        </div>
        <div class="decision-modal-actions">
          ${canDelete ? `<button class="ghost-button" type="button" data-role-codes-back>Retour</button>` : ""}
          <button class="primary-button" type="button" data-role-codes-close>Fermer</button>
        </div>
      </div>
    `;
  }

  function renderRolePinModalHtml(options = {}) {
    const {
      label = "Console",
      role = ""
    } = options;
    return `
      <div class="decision-dialog role-codes-dialog" role="dialog" aria-modal="true" aria-label="Code d'accès">
        <div class="decision-modal-head">
          <div>
            <span>Accès console</span>
            <h2>${escapeHtml(label)}</h2>
            <p>Entre le code de cette console ou le code administrateur.</p>
          </div>
          <button class="decision-close" type="button" data-role-pin-cancel aria-label="Fermer">×</button>
        </div>
        <label class="role-code-admin-field">
          Code
          <input id="rolePinInput" type="password" inputmode="text" maxlength="5" autocomplete="off" data-role-pin-input="${escapeHtml(role)}">
        </label>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-role-pin-cancel>Annuler</button>
          <button class="primary-button" type="button" data-confirm-role-pin="${escapeHtml(role)}">Ouvrir</button>
        </div>
      </div>
    `;
  }

  function renderAdminSeriesModalHtml() {
    return `
      <div class="decision-dialog admin-series-dialog" role="dialog" aria-modal="true" aria-label="Administration des séries">
        <div class="decision-modal-head">
          <div>
            <span>Administration</span>
            <h2>Importer des séries PDF</h2>
            <p>Choisis si le PDF remplace toute la compétition ou seulement une session déjà publiée.</p>
          </div>
          <button class="decision-close" type="button" data-admin-series-close aria-label="Fermer">×</button>
        </div>
        <div class="admin-series-options">
          <label class="admin-series-option">
            <input type="radio" name="seriesImportMode" value="full" checked>
            <strong>PDF général de la compétition</strong>
            <span>Remplace toutes les séries, le programme, le titre de compétition et les engagés.</span>
          </label>
          <label class="admin-series-option">
            <input type="radio" name="seriesImportMode" value="session">
            <strong>PDF de mise à jour d'une session</strong>
            <span>Remplace uniquement la ou les sessions présentes dans le PDF, par exemple la session 2 avec finales.</span>
          </label>
        </div>
        <div class="admin-series-help">
          <strong>Repère rapide</strong>
          <span>PDF général : à utiliser au début de la compétition.</span>
          <span>Mise à jour session : remplace seulement la session choisie.</span>
        </div>
        <label class="admin-session-field" hidden>
          <span>Session à remplacer</span>
          <input id="seriesSessionOverride" type="number" min="1" max="20" inputmode="numeric" placeholder="ex. 2">
        </label>
        <label class="ghost-button admin-series-file" for="seriesPdfInput">Choisir le PDF</label>
        <input id="seriesPdfInput" class="hidden-file-input" type="file" accept="application/pdf">
      </div>
    `;
  }

  global.LivePalmesAdminModals = {
    renderAdminSeriesModalHtml,
    renderHistoryArchivesModalHtml,
    renderPublicSessionInfosModalHtml,
    renderResetHistoryModalHtml,
    renderResetResultsModalHtml,
    renderRoleCodesAdminModalHtml,
    renderRoleCodesModalHtml,
    renderRolePinModalHtml
  };
})(window);
