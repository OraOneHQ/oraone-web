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

echo "[DEPLOY] Loading environment variables"
if [ -f backend/.env ]; then
	set -a
	source backend/.env
	set +a
	echo "[DEPLOY] Environment variables loaded"
else
	echo "[DEPLOY] WARNING: backend/.env not found"
fi

echo "[DEPLOY] Installing backend dependencies"
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "[DEPLOY] Checking AWS credentials availability"
if ! python <<'EOF'
import boto3

try:
    identity = boto3.client("sts").get_caller_identity()
    print(identity["Arn"])
except Exception:
    raise SystemExit(1)
EOF
then
	echo "[DEPLOY] WARNING: AWS credentials not configured. Checking IAM role..."
	if ! curl -fsS http://169.254.169.254/latest/meta-data/iam/security-credentials/ >/dev/null 2>&1; then
		echo "[DEPLOY] WARNING: EC2 instance has no IAM role attached"
		echo "[DEPLOY] INFO: Backend will use lazy-loading for AWS services"
		echo "[DEPLOY] INFO: To enable AWS features, either:"
		echo "[DEPLOY] INFO:   1. Attach an IAM role to this EC2 instance, OR"
		echo "[DEPLOY] INFO:   2. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env"
	else
		echo "[DEPLOY] IAM role detected"
	fi
fi

echo "[DEPLOY] Restarting oraone-backend"
sudo systemctl restart oraone-backend
sudo systemctl is-active --quiet oraone-backend

echo "[DEPLOY] Reloading nginx"
sudo systemctl reload nginx

check_health() {
	if curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
		return 0
	fi
	if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
		return 0
	fi
	return 1
}

echo "[DEPLOY] Waiting for backend startup"
for i in {1..20}; do
	if check_health; then
		echo "[DEPLOY] Health check passed"
		break
	fi
	echo "[DEPLOY] Health check attempt $i/20..."
	sleep 2
done

if ! check_health; then
	echo "[DEPLOY] Health check failed"
	if [ -f /opt/oraone/.last_deploy_commit ]; then
		PREVIOUS="$(cat /opt/oraone/.last_deploy_commit)"
		echo "[DEPLOY] Rolling back to $PREVIOUS"
		git reset --hard "$PREVIOUS"
		sudo systemctl restart oraone-backend || true
		if check_health; then
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
