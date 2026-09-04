#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_PROJECT="livepalmes"
TEST_PROJECT="livepalmes-test"
PROD_SA="lp-prod-sync-ro@livepalmes.iam.gserviceaccount.com"
TEST_SA="lp-test-sync-wr@livepalmes-test.iam.gserviceaccount.com"
PROD_KEY="${HOME}/lp-prod-sync-ro-key.json"
TEST_KEY="${HOME}/lp-test-sync-wr-key.json"
CHECKPOINT="${HOME}/livepalmes-full-sync-checkpoint.json"
POST_STATE="${HOME}/livepalmes-postsync-state.json"
LOG="${HOME}/livepalmes-full-sync.log"
APPLY_LOG="${HOME}/livepalmes-sync-apply.log"
INVENTORY_LOG="${HOME}/livepalmes-sync-after.log"
VERIFY_LOG="${HOME}/livepalmes-sync-verify.log"
START_TS="$(date +%s)"

fail() {
  echo
  echo "======================================================"
  echo "ARRÊT : $*"
  echo "======================================================"
  echo "Les comptes temporaires, clés et checkpoints sont conservés pour permettre une reprise."
  exit 1
}

on_error() {
  local rc=$?
  echo
  echo "======================================================"
  echo "SYNCHRONISATION INTERROMPUE — code ${rc}"
  echo "======================================================"
  echo "Aucun nettoyage des accès temporaires n'a été effectué."
  echo "Relance possible avec la même commande."
  exit "${rc}"
}
trap on_error ERR

exec > >(tee -a "${LOG}") 2>&1
cd "${ROOT}"

echo "======================================================"
echo "LIVEPALMES — SYNCHRONISATION PROD → TEST"
echo "======================================================"
echo "Début : $(date)"
echo "PROD : ${PROD_PROJECT} — lecture seule"
echo "TEST : ${TEST_PROJECT} — destination"

# 1. Prérequis
command -v gcloud >/dev/null || fail "gcloud introuvable."
command -v jq >/dev/null || fail "jq introuvable."
command -v node >/dev/null || fail "node introuvable."
test -f "${PROD_KEY}" || fail "Clé PROD absente : ${PROD_KEY}"
test -f "${TEST_KEY}" || fail "Clé TEST absente : ${TEST_KEY}"
test "$(jq -r '.project_id' "${PROD_KEY}")" = "${PROD_PROJECT}" || fail "Credential PROD incorrect."
test "$(jq -r '.project_id' "${TEST_KEY}")" = "${TEST_PROJECT}" || fail "Credential TEST incorrect."
npm ci --prefix functions >/dev/null

echo "Prérequis : OK"

# 2. Vérifier que le compte source n'a qu'un rôle projet de lecture Firestore.
mapfile -t PROD_PROJECT_ROLES < <(
  gcloud projects get-iam-policy "${PROD_PROJECT}" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${PROD_SA}" \
    --format="value(bindings.role)"
)
FOUND_DATASTORE_VIEWER=false
for role in "${PROD_PROJECT_ROLES[@]}"; do
  [ -z "${role}" ] && continue
  if [ "${role}" = "roles/datastore.viewer" ]; then
    FOUND_DATASTORE_VIEWER=true
  else
    fail "Rôle projet PROD inattendu sur le compte source : ${role}"
  fi
done
[ "${FOUND_DATASTORE_VIEWER}" = true ] || fail "roles/datastore.viewer absent sur le compte source PROD."

check_bucket_role() {
  local bucket="$1" sa="$2" expected="$3"
  mapfile -t roles < <(
    gcloud storage buckets get-iam-policy "gs://${bucket}" --format=json |
      jq -r --arg member "serviceAccount:${sa}" '.bindings[]? | select(any(.members[]?; . == $member)) | .role'
  )
  local found=false
  for role in "${roles[@]}"; do
    [ -z "${role}" ] && continue
    if [ "${role}" = "${expected}" ]; then found=true; else fail "Rôle Storage inattendu sur ${bucket} : ${role}"; fi
  done
  [ "${found}" = true ] || fail "${expected} absent sur ${bucket}."
}
check_bucket_role "livepalmes.firebasestorage.app" "${PROD_SA}" "roles/storage.objectViewer"
check_bucket_role "livepalmes-public-data-718081132564" "${PROD_SA}" "roles/storage.objectViewer"
echo "Source PROD confirmée en lecture seule."

# 3. Vérifier qu'aucune Function email/scheduler interdite n'est déployée dans TEST.
FORBIDDEN='submitEngagementAccessRequest|resolveEngagementAccessRequest|updateCurrentEmailNotificationPreferences|disableCompetitionEmailNotifications|notifyEngagementCompetitionDocuments|listEngagementCompetitionMailJobs|prepareEngagementOpeningNotificationEmails|prepareEngagementClubRecapEmails|sendEngagementPreparedEmails|resolveEngagementSwimmerChangeRequest|resumePerformancePublicationJobs|closeDueEngagementCompetitions'
DEPLOYED_FUNCTIONS="$(gcloud functions list --project="${TEST_PROJECT}" --format='value(name)' 2>/dev/null || true)"
if echo "${DEPLOYED_FUNCTIONS}" | grep -Eiq "${FORBIDDEN}"; then
  echo "${DEPLOYED_FUNCTIONS}" | grep -Ei "${FORBIDDEN}" || true
  fail "Une Function email/scheduler interdite est présente dans TEST."
fi
if gcloud services list --project="${TEST_PROJECT}" --enabled --format='value(config.name)' | grep -Fxq 'cloudscheduler.googleapis.com'; then
  TEST_SCHEDULERS="$(gcloud scheduler jobs list --project="${TEST_PROJECT}" --location=europe-west1 --format='value(name)' 2>/dev/null || true)"
  if echo "${TEST_SCHEDULERS}" | grep -Eiq 'resumePerformancePublicationJobs|closeDueEngagementCompetitions'; then
    fail "Un scheduler LivePalmes interdit est actif dans TEST."
  fi
fi
echo "Emails / schedulers TEST : OK"

# 4. Vérifier le super-admin TEST.
ADMIN_CHECK="$(node tools/sync-firebase-prod-to-test.js --source-credential "${PROD_KEY}" --destination-credential "${TEST_KEY}" --inventory-only --page-size 400)"
echo "${ADMIN_CHECK}" | grep 'Super-admins TEST protégés'
if echo "${ADMIN_CHECK}" | grep -q 'Super-admins TEST protégés: AUCUN'; then fail "Aucun super-admin TEST détecté."; fi

# 5. Copie réelle avec checkpoint idempotent.
node tools/sync-firebase-prod-to-test.js \
  --source-credential "${PROD_KEY}" \
  --destination-credential "${TEST_KEY}" \
  --include-storage \
  --page-size 400 \
  --checkpoint "${CHECKPOINT}" \
  --apply \
  --confirmation copy-livepalmes-readonly-to-livepalmes-test \
  --automation-confirmation email-and-schedulers-disabled-in-livepalmes-test \
  2>&1 | tee "${APPLY_LOG}"

echo "Copie brute : terminée"

# 6. Inventaire après copie et contrôle qu'aucune racine copiée n'est incomplète.
node tools/sync-firebase-prod-to-test.js \
  --source-credential "${PROD_KEY}" \
  --destination-credential "${TEST_KEY}" \
  --inventory-only \
  --page-size 400 > "${INVENTORY_LOG}" 2>&1

BAD_COUNT=0
while IFS= read -r line; do
  SRC="$(echo "${line}" | sed -n 's/.*source=\([0-9][0-9]*\); destination=\([0-9][0-9]*\).*/\1/p')"
  DST="$(echo "${line}" | sed -n 's/.*source=\([0-9][0-9]*\); destination=\([0-9][0-9]*\).*/\2/p')"
  if [ -n "${SRC}" ] && [ -n "${DST}" ] && [ "${DST}" -lt "${SRC}" ]; then
    echo "Volume incomplet : ${line}"
    BAD_COUNT=1
  fi
done < <(grep '^\[INVENTAIRE\]' "${INVENTORY_LOG}")
[ "${BAD_COUNT}" -eq 0 ] || fail "Une collection TEST est incomplète."
echo "Volumes après copie : OK"

# 7. Reconstruction des données dérivées et publications TEST.
export LIVEPALMES_TEST_SYNC_CREDENTIAL="${TEST_KEY}"
export LIVEPALMES_TEST_POSTSYNC_STATE="${POST_STATE}"
node tools/firebase-test-postsync-runner.js

grep -q '"allDone": true' "${POST_STATE}" || fail "Reconstruction post-sync incomplète."
echo "Reconstruction : OK"

# 8. Vérification finale de la copie et des références résiduelles PROD.
node tools/verify-firebase-test-data-sync.js \
  --source-credential "${PROD_KEY}" \
  --destination-credential "${TEST_KEY}" \
  --page-size 400 2>&1 | tee "${VERIFY_LOG}"
VERIFY_RC=${PIPESTATUS[0]}
[ "${VERIFY_RC}" -eq 0 ] || fail "Le vérificateur final a détecté une anomalie."

FINAL_CHECK="$(node tools/sync-firebase-prod-to-test.js --source-credential "${PROD_KEY}" --destination-credential "${TEST_KEY}" --inventory-only --page-size 400)"
echo "${FINAL_CHECK}" | grep -E 'Super-admins TEST protégés|^\[INVENTAIRE\] performances:'
if echo "${FINAL_CHECK}" | grep -q 'Super-admins TEST protégés: AUCUN'; then fail "Super-admin TEST perdu."; fi
PERF_LINE="$(echo "${FINAL_CHECK}" | grep '^\[INVENTAIRE\] performances:')"
PERF_SOURCE="$(echo "${PERF_LINE}" | sed -n 's/.*source=\([0-9][0-9]*\); destination=\([0-9][0-9]*\).*/\1/p')"
PERF_TEST="$(echo "${PERF_LINE}" | sed -n 's/.*source=\([0-9][0-9]*\); destination=\([0-9][0-9]*\).*/\2/p')"
[ -n "${PERF_SOURCE}" ] && [ -n "${PERF_TEST}" ] || fail "Compteurs performances introuvables."
[ "${PERF_TEST}" -ge "${PERF_SOURCE}" ] || fail "Performances TEST incomplètes."

# 9. Nettoyage des accès temporaires, uniquement après succès complet.
gcloud projects remove-iam-policy-binding "${PROD_PROJECT}" --member="serviceAccount:${PROD_SA}" --role="roles/datastore.viewer" --quiet >/dev/null 2>&1 || true
gcloud storage buckets remove-iam-policy-binding gs://livepalmes.firebasestorage.app --member="serviceAccount:${PROD_SA}" --role="roles/storage.objectViewer" --quiet >/dev/null 2>&1 || true
gcloud storage buckets remove-iam-policy-binding gs://livepalmes-public-data-718081132564 --member="serviceAccount:${PROD_SA}" --role="roles/storage.objectViewer" --quiet >/dev/null 2>&1 || true

gcloud projects remove-iam-policy-binding "${TEST_PROJECT}" --member="serviceAccount:${TEST_SA}" --role="roles/datastore.user" --quiet >/dev/null 2>&1 || true
gcloud storage buckets remove-iam-policy-binding gs://livepalmes-test.firebasestorage.app --member="serviceAccount:${TEST_SA}" --role="roles/storage.objectAdmin" --quiet >/dev/null 2>&1 || true
gcloud storage buckets remove-iam-policy-binding gs://livepalmes-test-public-data-206080168534 --member="serviceAccount:${TEST_SA}" --role="roles/storage.objectAdmin" --quiet >/dev/null 2>&1 || true

gcloud iam service-accounts delete "${PROD_SA}" --project="${PROD_PROJECT}" --quiet
gcloud iam service-accounts delete "${TEST_SA}" --project="${TEST_PROJECT}" --quiet
rm -f "${PROD_KEY}" "${TEST_KEY}" "${CHECKPOINT}" "${POST_STATE}"

END_TS="$(date +%s)"
DURATION=$((END_TS - START_TS))
printf -v TOTAL_TIME '%02d:%02d:%02d' $((DURATION / 3600)) $(((DURATION % 3600) / 60)) $((DURATION % 60))
trap - ERR

echo
echo "======================================================"
echo "SYNCHRONISATION TERMINÉE"
echo "======================================================"
echo "Performances PROD : ${PERF_SOURCE}"
echo "Performances TEST : ${PERF_TEST}"
echo "Super-admin TEST : conservé"
echo "Index / TOP / DTN / calendriers : reconstruits"
echo "Références PROD résiduelles : aucune détectée"
echo "Comptes et clés temporaires : supprimés"
echo "Durée totale : ${TOTAL_TIME}"
echo "Logs : ${LOG}"
