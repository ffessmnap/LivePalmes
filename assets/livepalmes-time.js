(function attachLivePalmesTime(global) {
  function timeToMs(value) {
    if (!value) return Number.POSITIVE_INFINITY;
    const clean = String(value).trim().replace(",", ".");
    const parts = clean.split(":");
    let minutes = 0;
    let seconds = 0;
    if (parts.length === 3) {
      minutes = Number(parts[0]) * 60 + Number(parts[1]);
      seconds = Number(parts[2]);
    } else if (parts.length === 2) {
      minutes = Number(parts[0]);
      seconds = Number(parts[1]);
    } else {
      seconds = Number(parts[0]);
    }
    return Math.round((minutes * 60 + seconds) * 1000);
  }

  function formatGap(ms) {
    const total = Math.abs(ms) / 1000;
    if (total >= 60) {
      const minutes = Math.floor(total / 60);
      const seconds = (total % 60).toFixed(2).padStart(5, "0");
      return `${minutes}:${seconds}`;
    }
    return total.toFixed(2);
  }

  function importedSeriesTime(value) {
    const clean = String(value || "").trim().replace(",", ".");
    if (!clean) return "";
    const parts = clean.split(":");
    if (parts.length === 3) return `${parts[0]}:${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}`;
    if (parts.length === 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return clean;
  }

  global.LivePalmesTime = {
    formatGap,
    importedSeriesTime,
    timeToMs
  };
})(window);
