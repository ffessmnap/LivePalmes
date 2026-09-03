function escapeMailHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizedContext(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function livePalmesMailLinkLabel(url = "", context = "") {
  const cleanUrl = String(url || "").toLowerCase();
  const cleanContext = normalizedContext(context);
  if (cleanUrl.includes("notifications.html")) return "Gérer mes notifications";
  if (cleanUrl.includes("helloasso") || cleanContext.includes("paiement")) return "Accéder au paiement HelloAsso";
  if (cleanUrl.includes("firebasestorage.googleapis.com")) return "Ouvrir le document";
  if (/https:\/\/[^/]+\/portail(?:\.html)?/.test(cleanUrl)) {
    if (cleanContext.includes("traiter") || cleanContext.includes("examiner")) {
      return "Traiter la demande dans le portail LivePalmes";
    }
    if (cleanContext.includes("mot de passe") || cleanContext.includes("connexion")) {
      return "Accéder à la connexion LivePalmes";
    }
    if (cleanContext.includes("engagement") || cleanContext.includes("competition")) {
      return "Accéder à la compétition dans le portail LivePalmes";
    }
    return "Accéder au portail LivePalmes";
  }
  return "Ouvrir le lien";
}

function livePalmesMailHtml(text = "") {
  const lines = String(text || "").split(/\r?\n/);
  let previousLine = "";
  const htmlLines = lines.map((line) => {
    const context = /^\s*https?:\/\/\S+\s*$/.test(line) ? previousLine : (line || previousLine);
    let cursor = 0;
    let html = "";
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    for (const match of line.matchAll(urlPattern)) {
      let url = match[0];
      let suffix = "";
      while (/[),.;!?]$/.test(url)) {
        suffix = `${url.slice(-1)}${suffix}`;
        url = url.slice(0, -1);
      }
      html += escapeMailHtml(line.slice(cursor, match.index));
      html += `<a href="${escapeMailHtml(url)}">${escapeMailHtml(livePalmesMailLinkLabel(url, context))}</a>`;
      html += escapeMailHtml(suffix);
      cursor = match.index + match[0].length;
    }
    html += escapeMailHtml(line.slice(cursor));
    if (line.trim()) previousLine = line;
    return html;
  });
  return `<div style="font-family:Arial,sans-serif;line-height:1.5">${htmlLines.join("<br>")}</div>`;
}

module.exports = {
  escapeMailHtml,
  livePalmesMailHtml,
  livePalmesMailLinkLabel
};
