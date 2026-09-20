(function attachLivePalmesLegalFooter(global, document) {
  "use strict";

  const LINKS = [
    ["/mentions-legales.html", "Mentions légales"],
    ["/conditions-utilisation.html", "Conditions d’utilisation"],
    ["/confidentialite.html", "Confidentialité"]
  ];

  function ensureStyles() {
    if (document.querySelector('link[data-livepalmes-legal-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/livepalmes-legal.css?v=20260920-legal-1";
    link.dataset.livepalmesLegalStyles = "true";
    document.head.appendChild(link);
  }

  function legalNav() {
    const nav = document.createElement("nav");
    nav.className = "livepalmes-legal-links";
    nav.setAttribute("aria-label", "Informations légales");
    LINKS.forEach(([href, label]) => {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.textContent = label;
      nav.appendChild(anchor);
    });
    return nav;
  }

  function enhanceExistingFooters() {
    const footers = document.querySelectorAll(".public-footer, .performance-public-footer");
    footers.forEach((footer) => {
      if (footer.querySelector(".livepalmes-legal-links")) return;
      footer.appendChild(legalNav());
    });
    return footers.length;
  }

  function ensurePortalFooter() {
    if (!document.body?.classList?.contains("admin-portal-page")) return;
    if (document.querySelector(".livepalmes-legal-footer")) return;
    const footer = document.createElement("footer");
    footer.className = "livepalmes-legal-footer";
    footer.appendChild(legalNav());
    const shell = document.querySelector(".admin-portal-shell");
    if (shell?.parentNode) shell.parentNode.insertBefore(footer, shell.nextSibling);
    else document.body.appendChild(footer);
  }

  function init() {
    ensureStyles();
    enhanceExistingFooters();
    ensurePortalFooter();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window, document);
