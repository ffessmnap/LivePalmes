#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

STATE="${HOME}/livepalmes-postsync-state.json"
LOG="${HOME}/livepalmes-full-sync.log"
KEY="${HOME}/lp-test-sync-wr-key.json"
STALL_SECONDS="${LIVEPALMES_POSTSYNC_STALL_SECONDS:-1200}"
CHECK_EVERY_SECONDS="${LIVEPALMES_POSTSYNC_CHECK_SECONDS:-30}"
RESTART_DELAY_SECONDS="${LIVEPALMES_POSTSYNC_RESTART_DELAY_SECONDS:-10}"

export LIVEPALMES_TEST_SYNC_CREDENTIAL="${KEY}"
export LIVEPALMES_TEST_POSTSYNC_STATE="${STATE}"

test -f "${KEY}" || { echo "Clé TEST absente : ${KEY}"; exit 1; }
command -v node >/dev/null || { echo "node introuvable."; exit 1; }
command -v jq >/dev/null || { echo "jq introuvable."; exit 1; }

state_mtime() {
  if [ -f "${STATE}" ]; then stat -c %Y "${STATE}" 2>/dev/null || echo 0; else echo 0; fi
}

all_done() {
  [ -f "${STATE}" ] && jq -e '.allDone == true' "${STATE}" >/dev/null 2>&1
}

stop_child() {
  local pid="$1"
  kill -TERM "${pid}" >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    kill -0 "${pid}" >/dev/null 2>&1 || return 0
    sleep 1
  done
  kill -KILL "${pid}" >/dev/null 2>&1 || true
}

trap 'echo "Arrêt du superviseur demandé."; [ -n "${child_pid:-}" ] && stop_child "${child_pid}"; exit 130' INT TERM

echo "======================================================" >> "${LOG}"
echo "POST-SYNC TEST — MODE RÉSILIENT" >> "${LOG}"
echo "Seuil sans progression : ${STALL_SECONDS}s" >> "${LOG}"
echo "======================================================" >> "${LOG}"

while ! all_done; do
  before_mtime="$(state_mtime)"
  before_epoch="$(date +%s)"
  echo "[$(date -Is)] Démarrage/reprise de la reconstruction post-sync." >> "${LOG}"

  node tools/firebase-test-postsync-runner.js >> "${LOG}" 2>&1 &
  child_pid=$!

  while kill -0 "${child_pid}" >/dev/null 2>&1; do
    sleep "${CHECK_EVERY_SECONDS}"
    all_done && break

    current_mtime="$(state_mtime)"
    now_epoch="$(date +%s)"

    if [ "${current_mtime}" -gt "${before_mtime}" ]; then
      before_mtime="${current_mtime}"
      before_epoch="${now_epoch}"
    fi

    idle_seconds=$((now_epoch - before_epoch))
    if [ "${idle_seconds}" -ge "${STALL_SECONDS}" ]; then
      echo "[$(date -Is)] Aucune progression depuis ${idle_seconds}s : redémarrage automatique du runner." >> "${LOG}"
      stop_child "${child_pid}"
      break
    fi
  done

  wait "${child_pid}" >/dev/null 2>&1 || true
  child_pid=""

  all_done && break
  echo "[$(date -Is)] Reprise automatique dans ${RESTART_DELAY_SECONDS}s." >> "${LOG}"
  sleep "${RESTART_DELAY_SECONDS}"
done

echo "[$(date -Is)] Reconstruction post-sync terminée (allDone=true)." >> "${LOG}"
