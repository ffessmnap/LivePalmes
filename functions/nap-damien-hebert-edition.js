"use strict";

const { readTrophyResults } = require("./nap-damien-hebert-results");
const { COURSES, bestTrophyCourses, rankTrophyCategory } = require("./nap-damien-hebert-ranking");
const { formatTime } = require("./nap-performance-time");
const { gzipSync, gunzipSync } = require("node:zlib");

function frozenRanking(published) {
  if (!published?.frozenGzip) return published?.frozen || null;
  return JSON.parse(gunzipSync(published.frozenGzip).toString("utf8"));
}

function editionRef(db) {
  return db.collection("engagementConfigurations").doc("damienHebert");
}

function normalizeEdition(input) {
  const { from, through, seasonEndYear } = input ?? {};
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 100) throw new TypeError("Nom d’édition invalide.");
  require("./nap-damien-hebert-results").validateWindow({ from, through, seasonEndYear });
  return { title, from, through, seasonEndYear };
}

async function buildEdition(pool, edition) {
  const performances = await readTrophyResults(pool, edition);
  const best = bestTrophyCourses(performances);
  const identities = new Map(performances.map(row => [row.swimmerId, row]));
  const groups = { F: [], M: [] };
  for (const [swimmerId, courses] of best) {
    const { firstName, lastName, club, birthYear, sex } = identities.get(swimmerId);
    const events = COURSES.map(course => {
      const result = courses.get(course);
      if (!result) return null;
      const points = Number(result.points);
      if (result.points == null || !Number.isSafeInteger(points) || points < 0) {
        throw new RangeError("Points manquants ou invalides sur une performance retenue.");
      }
      return { time: formatTime(result.centiseconds), points };
    });
    groups[sex].push({
      swimmerId, firstName, lastName, club: club || "", birthYear, events,
      complete: courses.size === COURSES.length,
      totalPoints: events.reduce((sum, event) => sum + (event?.points ?? 0), 0)
    });
  }
  return { edition, updatedAt: new Date().toISOString(), groups: {
    F: rankTrophyCategory(groups.F), M: rankTrophyCategory(groups.M)
  } };
}

function createPublicReader(db, pool) {
  let cached;
  let pending;
  return async function read() {
    if (cached?.expires > Date.now()) return cached.value;
    if (!pending) pending = (async () => {
      const { published } = (await editionRef(db).get()).data() || {};
      const value = frozenRanking(published) || (published ? await buildEdition(pool, published.edition) : null);
      cached = { expires: Date.now() + 60000, value };
      return value;
    })().finally(() => { pending = null; });
    return pending;
  };
}

async function manageEdition(db, pool, input) {
  const ref = editionRef(db);
  const action = input?.action;
  const snapshot = await ref.get();
  const { draft = null, published = null } = snapshot.data() || {};
  const publicEdition = published && { edition: published.edition, frozen: Boolean(published.frozen || published.frozenGzip) };
  if (action === "read") return { draft, published: publicEdition };
  if (action === "preview") return { preview: await buildEdition(pool, normalizeEdition(input.edition)) };
  const changes = {};
  if (action === "save" || action === "publish") {
    changes.draft = normalizeEdition(input.edition);
    if (action === "publish") {
      await buildEdition(pool, changes.draft);
      changes.published = { edition: changes.draft };
    }
  } else if (action === "freeze" && published && !publicEdition.frozen) {
    const ranking = { ...await buildEdition(pool, published.edition), final: true };
    const frozenGzip = gzipSync(JSON.stringify(ranking));
    if (frozenGzip.length > 900000) throw new RangeError("Classement arrêté trop volumineux.");
    changes.published = { edition: published.edition, frozenGzip };
  } else {
    throw new TypeError("Action indisponible.");
  }
  await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (Boolean(current.exists) !== Boolean(snapshot.exists)
      || (current.exists && !current.updateTime.isEqual(snapshot.updateTime))) {
      throw new TypeError("L’édition a changé. Rechargez l’écran avant de réessayer.");
    }
    tx.set(ref, changes, { mergeFields: Object.keys(changes) });
  });
  const active = changes.published || published;
  return { draft: changes.draft || draft, published: active && { edition: active.edition, frozen: Boolean(active.frozen || active.frozenGzip) } };
}

module.exports = { createPublicReader, manageEdition, buildEdition };
