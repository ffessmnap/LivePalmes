"use strict";
const PUBLIC_DIRECTORY_TTL_MS = 30 * 1000;

function createPublicClubDirectoryReader(load, { now = Date.now, ttlMs = PUBLIC_DIRECTORY_TTL_MS } = {}) {
  let cached = null, pending = null;
  return async function read() {
    if (cached && now() < cached.expiresAt) return structuredClone(cached.value);
    if (!pending) {
      pending = Promise.resolve().then(load).then(value => {
        if (value?.ok !== true || value.source !== "nap" || !Array.isArray(value.clubs) || value.clubs.length > 1000) {
          throw new Error("Annuaire public NAP invalide.");
        }
        cached = { value: structuredClone(value), expiresAt: now() + ttlMs };
        return cached.value;
      }).catch(error => { cached = null; throw error; }).finally(() => { pending = null; });
    }
    return structuredClone(await pending);
  };
}

let currentPool, currentReader;
function directory(pool) {
  if (pool !== currentPool) {
    currentPool = pool;
    currentReader = createPublicClubDirectoryReader(() => require("./nap-club-directory-page").directory(pool));
  }
  return currentReader();
}

module.exports = { createPublicClubDirectoryReader, directory, PUBLIC_DIRECTORY_TTL_MS };
