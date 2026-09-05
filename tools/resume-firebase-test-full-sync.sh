#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

restore_index() {
  git checkout -- functions/index.js >/dev/null 2>&1 || true
}
trap restore_index EXIT

command -v firebase >/dev/null || {
  echo "Firebase CLI introuvable."
  exit 1
}

# Toujours repartir du fichier source Git propre avant d'appliquer le patch local TEST.
git checkout -- functions/index.js
node tools/patch-firebase-test-large-club-rebuild.js

echo
echo "Déploiement TEST ciblé : rebuildEngagementClubAggregates uniquement."
firebase deploy \
  --project livepalmes-test \
  --only functions:rebuildEngagementClubAggregates \
  --force

# Le patch était uniquement destiné au déploiement TEST ciblé : ne pas le laisser dans l'arbre de travail.
git checkout -- functions/index.js
trap - EXIT

echo
echo "Reprise de la synchronisation complète depuis les checkpoints existants."
exec bash tools/run-firebase-test-full-sync.sh
