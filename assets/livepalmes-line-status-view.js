(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function renderLineAlertBadgesHtml({ codes = [], terminalStatus = null, title = "" } = {}) {
    if (terminalStatus) {
      const isAbandon = terminalStatus.type === "abandon";
      return `<span class="line-alert-badges" title="${escapeHtml(title)}"><span class="line-alert-badge ${isAbandon ? "abd-line-badge" : "abs-line-badge"}">${isAbandon ? "ABD" : "ABS"}</span></span>`;
    }
    return `
    <span class="line-alert-badges" title="${escapeHtml(title)}">
      <span class="line-alert-badge dsq-line-badge">DSQ</span>
      ${codes.length ? `<span class="line-alert-reasons">${escapeHtml(codes.join(" / "))}</span>` : ""}
    </span>
  `;
  }

  function renderImportedLineStatusBadgeHtml(label = "") {
    if (!label) return "";
    return `<span class="line-alert-badges imported-status-badges" title="${escapeHtml(label)}"><span class="line-alert-badge abs-line-badge">ABS</span><span class="line-alert-reasons">${escapeHtml(label)}</span></span>`;
  }

  function renderLineTimeStatusHtml({ importedLabel = "", terminalStatus = null } = {}) {
    if (terminalStatus) {
      const isAbandon = terminalStatus.type === "abandon";
      return `<span class="line-time-status"><span class="line-alert-badge ${isAbandon ? "abd-line-badge" : "abs-line-badge"}">${isAbandon ? "ABD" : "ABS"}</span><strong>${isAbandon ? "Abandon" : "Forfait non déclaré"}</strong></span>`;
    }
    if (importedLabel) {
      return `<span class="line-time-status"><span class="line-alert-badge abs-line-badge">ABS</span><strong>${escapeHtml(importedLabel)}</strong></span>`;
    }
    return "";
  }

  window.LivePalmesLineStatusView = {
    renderImportedLineStatusBadgeHtml,
    renderLineAlertBadgesHtml,
    renderLineTimeStatusHtml
  };
}());
