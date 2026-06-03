(function attachPerformanceAdminLink() {
  const adminUrl = "/administration.html";

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target?.closest?.(".performance-admin-link");
      if (!target) return;
      event.preventDefault();
      window.location.assign(adminUrl);
    },
    true
  );

  function init() {
    if (document.body.classList.contains("performance-admin-page")) return;
    const footer = document.createElement("footer");
    footer.className = "performance-admin-footer";
    footer.innerHTML = `
      <a class="performance-admin-link" href="${adminUrl}">Administration</a>
    `;
    document.body.append(footer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
