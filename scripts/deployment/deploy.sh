#!/bin/bash

set -euo pipefail

echo "[DEPLOY] Starting OraOne production deployment at $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

LOCKFILE="/tmp/oraone-deploy.lock"
if [ -f "$LOCKFILE" ]; then
	echo "[DEPLOY] Another deployment is already running"
	exit 1
fi
trap 'rm -f "$LOCKFILE"' EXIT
touch "$LOCKFILE"

cd /opt/oraone

CURRENT_COMMIT="$(git rev-parse HEAD)"

echo "[DEPLOY] Fetching latest main from origin"
git fetch origin
NEW_COMMIT="$(git rev-parse origin/main)"

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
	echo "[DEPLOY] Already on latest commit"
	exit 0
fi

echo "$CURRENT_COMMIT" > /opt/oraone/.last_deploy_commit
echo "[DEPLOY] Previous commit: $CURRENT_COMMIT"
git reset --hard origin/main
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $NEW_COMMIT" >> /opt/oraone/deploy-history.log

echo "[DEPLOY] Activating backend virtual environment"
source backend/.venv/bin/activate

echo "[DEPLOY] Installing backend dependencies"
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "[DEPLOY] Restarting oraone-backend"
sudo systemctl restart oraone-backend
sudo systemctl is-active --quiet oraone-backend

echo "[DEPLOY] Reloading nginx"
sudo systemctl reload nginx

echo "[DEPLOY] Waiting for backend startup"
for i in {1..15}; do
	if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
		echo "[DEPLOY] Health check passed"
		break
	fi
	sleep 2
done

if ! curl -fsS http://localhost:8000/health >/dev/null; then
	echo "[DEPLOY] Health check failed"
	if [ -f /opt/oraone/.last_deploy_commit ]; then
		PREVIOUS="$(cat /opt/oraone/.last_deploy_commit)"
		echo "[DEPLOY] Rolling back to $PREVIOUS"
		git reset --hard "$PREVIOUS"
		sudo systemctl restart oraone-backend || true
		if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
			echo "[DEPLOY] Rollback successful"
		else
			echo "[DEPLOY] Rollback failed"
		fi
	fi
	echo "[DEPLOY] Backend logs:"
	sudo journalctl -u oraone-backend -n 50 --no-pager || true
	exit 1
fi

echo "[DEPLOY] Deployment successful"
