#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

cleanup() {
  git checkout -- functions/index.js >/dev/null 2>&1 || true
  rm -rf .firebase-test-functions >/dev/null 2>&1 || true
}
trap cleanup EXIT

command -v firebase >/dev/null || {
  echo "Firebase CLI introuvable."
  exit 1
}

# Toujours repartir du fichier source Git propre avant d'appliquer le patch local TEST.
git checkout -- functions/index.js
node tools/patch-firebase-test-large-club-rebuild.js

echo
echo "Préparation d'un codebase TEST isolé, sans SecretParam."
TARGET_FIREBASE_PROJECT=livepalmes-test \
  node tools/prepare-firebase-test-functions.js engagement-core >/tmp/livepalmes-test-function-selector.txt
npm ci --prefix .firebase-test-functions/functions >/dev/null

echo
echo "Déploiement TEST ciblé : rebuildEngagementClubAggregates uniquement."
firebase deploy \
  --config .firebase-test-functions/firebase.json \
  --project livepalmes-test \
  --only functions:rebuildEngagementClubAggregates \
  --non-interactive \
  --force

# Le patch et le codebase isolé étaient uniquement destinés au déploiement TEST ciblé.
git checkout -- functions/index.js
rm -rf .firebase-test-functions
rm -f /tmp/livepalmes-test-function-selector.txt
trap - EXIT

echo
echo "Reprise de la synchronisation complète depuis les checkpoints existants."
exec bash tools/run-firebase-test-full-sync.sh
