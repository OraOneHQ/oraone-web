#!/bin/bash
#
# LEGACY REFERENCE SCRIPT — written for the decommissioned AWS EC2 host.
# See scripts/deployment/deploy.sh for context. Not currently invoked by any
# active CI workflow.

set -euo pipefail

echo "[ROLLBACK] Starting rollback at $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

cd /opt/oraone

if [ -n "${1:-}" ]; then
  TARGET_COMMIT="$1"
elif [ -f /opt/oraone/.last_deploy_commit ]; then
  TARGET_COMMIT="$(cat /opt/oraone/.last_deploy_commit)"
else
  echo "[ROLLBACK] No rollback commit provided and /opt/oraone/.last_deploy_commit not found"
  exit 1
fi

echo "[ROLLBACK] Rolling back to commit: $TARGET_COMMIT"
git reset --hard "$TARGET_COMMIT"

echo "[ROLLBACK] Restarting oraone-backend"
sudo systemctl restart oraone-backend
sudo systemctl is-active --quiet oraone-backend

echo "[ROLLBACK] Validating local health endpoint"
curl -fsS http://localhost:8000/health > /dev/null

echo "[ROLLBACK] Rollback successful"
