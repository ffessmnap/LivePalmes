(function attachLivePalmesFinalists(global) {
  const FINAL_WITHDRAWAL_WINDOW_MS = 30 * 60 * 1000;

  function finalistAnnouncedAt(row, result) {
    if (row?.repechaged) return row.repechageAnnouncedAt || "";
    return row?.announcedAt || result?.finalistsAnnouncedAt || "";
  }

  function finalWithdrawalLimitDate(row, result) {
    const announcedAt = finalistAnnouncedAt(row, result);
    if (!announcedAt) return null;
    const date = new Date(new Date(announcedAt).getTime() + FINAL_WITHDRAWAL_WINDOW_MS);
    if (Number.isNaN(date.getTime())) return "";
    return date;
  }

  function canWithdrawFinalist(row, result, now = new Date()) {
    if (row?.withdrawnAt) return false;
    const limit = finalWithdrawalLimitDate(row, result);
    return Boolean(limit) && now <= limit;
  }

  function hasFinalWithdrawalDeadline(row, result) {
    return Boolean(finalWithdrawalLimitDate(row, result));
  }

  function canWithdrawBeforeReplacementAnnouncement(row) {
    return Boolean(row?.repechaged && !row.repechageAnnouncedAt && !row.withdrawnAt);
  }

  function isFinalWithdrawalDeadlineExpired(row, result, now = new Date()) {
    const limit = finalWithdrawalLimitDate(row, result);
    return Boolean(limit) && now > limit;
  }

  function finalResultSessions(results = []) {
    return [...new Set(results.map((result) => String(result.session || "")).filter(Boolean))]
      .sort((a, b) => Number(a || 0) - Number(b || 0));
  }

  global.LivePalmesFinalists = {
    canWithdrawBeforeReplacementAnnouncement,
    canWithdrawFinalist,
    finalResultSessions,
    finalistAnnouncedAt,
    finalWithdrawalLimitDate,
    hasFinalWithdrawalDeadline,
    isFinalWithdrawalDeadlineExpired
  };
})(window);
