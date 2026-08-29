const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_MIN_INTERVAL_MS = 15 * 1000;
const DEFAULT_MAX_REQUESTS = 8;

function nextPortalAccessRateLimit(current = {}, nowMs = Date.now(), options = {}) {
  const windowMs = Number(options.windowMs || DEFAULT_WINDOW_MS);
  const minIntervalMs = Number(options.minIntervalMs || DEFAULT_MIN_INTERVAL_MS);
  const maxRequests = Number(options.maxRequests || DEFAULT_MAX_REQUESTS);
  const currentWindowStart = Date.parse(current.windowStartedAt || "");
  const currentLastRequest = Date.parse(current.lastRequestedAt || "");
  const sameWindow = Number.isFinite(currentWindowStart) && nowMs - currentWindowStart < windowMs;
  const count = sameWindow ? Math.max(0, Math.trunc(Number(current.count) || 0)) : 0;
  const retryAfterMs = Number.isFinite(currentLastRequest) && nowMs - currentLastRequest < minIntervalMs
    ? minIntervalMs - (nowMs - currentLastRequest)
    : count >= maxRequests
      ? Math.max(1000, windowMs - (nowMs - currentWindowStart))
      : 0;
  if (retryAfterMs > 0) return { allowed: false, retryAfterMs, next: current };
  const now = new Date(nowMs).toISOString();
  return {
    allowed: true,
    retryAfterMs: 0,
    next: {
      windowStartedAt: sameWindow ? new Date(currentWindowStart).toISOString() : now,
      lastRequestedAt: now,
      count: count + 1,
      updatedAt: now
    }
  };
}

module.exports = {
  nextPortalAccessRateLimit
};
