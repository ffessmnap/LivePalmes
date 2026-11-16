const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_MIN_INTERVAL_MS = 15 * 1000;
const DEFAULT_MAX_REQUESTS = 8;

function cleanPublicAccessName(input, label = "Le nom") {
  if (typeof input !== "string" || /[\u0000-\u001f\u007f]/u.test(input)) throw new TypeError(`${label} est invalide.`);
  const value = input.normalize("NFC").trim().replace(/\p{Zs}+/gu, " ");
  const obviousLink = /(?:https?|ftp|file|mailto)\s*:|www\s*\.|@|\b[\p{L}\p{N}-]+\.(?:com|fr|net|org|eu|io|xyz|info|online|site|dev|app|co|uk|de|es|it)\b/iu;
  if (!value || value.length > 80 || !/\p{L}/u.test(value) || !/^[\p{L}\p{M}\p{Zs}\p{Pd}.'’ʼ·・\u200c\u200d]+$/u.test(value) || obviousLink.test(value)) {
    throw new TypeError(`${label} doit contenir un nom, sans lien ni adresse e-mail.`);
  }
  return value;
}

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
  nextPortalAccessRateLimit,
  cleanPublicAccessName
};
