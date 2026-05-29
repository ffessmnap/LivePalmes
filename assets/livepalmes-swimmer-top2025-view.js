(function attachLivePalmesSwimmerTop2025View(global) {
  function render(options = {}) {
    const {
      categoryClass,
      categoryLabel,
      data = {},
      escapeHtml,
      matchesRace,
      sameCategory
    } = options;

    const categories = ["Cadet", "Junior", "Senior"];
    return categories.map((category) => {
      const rows = (data.top2025 || [])
        .filter((item) => matchesRace(item) && sameCategory(item.category, category))
        .sort((a, b) => (a.rank || 99) - (b.rank || 99))
        .slice(0, 5);

      return `
        <div class="ranking-list ${categoryClass(category)}">
          <h4>${escapeHtml(categoryLabel(category))}</h4>
          <ol>
            ${rows.length ? rows.map((row) => `
              <li>
                <span class="rank">${escapeHtml(row.rank || "-")}</span>
                <span>
                  <strong>${escapeHtml(row.name || "-")}</strong>
                  <span class="muted-text">${escapeHtml(row.club || "")}</span>
                </span>
                <span class="time">${escapeHtml(row.time || "-")}</span>
              </li>
            `).join("") : `<li class="empty">À renseigner</li>`}
          </ol>
        </div>
      `;
    }).join("");
  }

  global.LivePalmesSwimmerTop2025View = { render };
})(window);
