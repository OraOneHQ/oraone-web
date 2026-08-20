#!/bin/bash
#
# LEGACY REFERENCE SCRIPT — written for the decommissioned AWS EC2 host
# (/opt/oraone, systemd unit `oraone-backend`, api.oraone.in). Not currently
# invoked by any active CI workflow (see .github/workflows/deploy.yml). Keep
# as a reference for the deploy/backup/health-check steps a future backend
# host will need; update the paths/host below once one is chosen.

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

# --------------------------------------------------------------------------- #
# Database: backup then migrate (before restarting so new code never runs      #
# against an old schema).                                                       #
# --------------------------------------------------------------------------- #
# Derive a libpq-compatible URL from the app's async DATABASE_URL.
PG_URL="${DATABASE_URL:-}"
PG_URL="${PG_URL/postgresql+asyncpg:/postgresql:}"
PG_URL="${PG_URL/postgres+asyncpg:/postgresql:}"

BACKUP_DIR="/opt/oraone/db-backups"
mkdir -p "$BACKUP_DIR"
if [ -n "$PG_URL" ] && command -v pg_dump >/dev/null 2>&1; then
	BACKUP_FILE="$BACKUP_DIR/oraone-$(date -u '+%Y%m%dT%H%M%SZ').sql.gz"
	echo "[DEPLOY] Backing up database to $BACKUP_FILE"
	if pg_dump "$PG_URL" | gzip > "$BACKUP_FILE"; then
		echo "[DEPLOY] Database backup complete"
		# Retain only the 10 most recent backups.
		ls -1t "$BACKUP_DIR"/oraone-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
	else
		echo "[DEPLOY] ERROR: Database backup failed — aborting before migration"
		rm -f "$BACKUP_FILE"
		exit 1
	fi
else
	echo "[DEPLOY] WARNING: pg_dump or DATABASE_URL unavailable — skipping backup"
fi

echo "[DEPLOY] Applying database migrations (alembic upgrade head)"
if ! ( cd /opt/oraone/backend && alembic upgrade head ); then
	echo "[DEPLOY] ERROR: Database migration failed"
	if [ -f /opt/oraone/.last_deploy_commit ]; then
		PREVIOUS="$(cat /opt/oraone/.last_deploy_commit)"
		echo "[DEPLOY] Rolling back code to $PREVIOUS (DB left intact; restore from $BACKUP_DIR if needed)"
		git reset --hard "$PREVIOUS"
	fi
	exit 1
fi
echo "[DEPLOY] Migrations applied"

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

# --------------------------------------------------------------------------- #
# Smoke tests — verify routing & auth are wired before declaring success.       #
# --------------------------------------------------------------------------- #
smoke_status() {
	# $1 = path — echoes the HTTP status code (000 on connection failure).
	curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000$1" 2>/dev/null || echo "000"
}

echo "[DEPLOY] Running smoke tests"
SMOKE_FAILED=0

HEALTH_CODE="$(smoke_status /api/health)"
if [ "$HEALTH_CODE" != "200" ]; then
	echo "[DEPLOY] SMOKE FAIL: /api/health returned $HEALTH_CODE"
	SMOKE_FAILED=1
else
	echo "[DEPLOY] SMOKE OK: /api/health -> 200"
fi

# The entitlements endpoint must exist and reject anonymous callers (fail-closed).
ENT_CODE="$(smoke_status /api/entitlements/me)"
case "$ENT_CODE" in
	401|403)
		echo "[DEPLOY] SMOKE OK: /api/entitlements/me -> $ENT_CODE (auth enforced)"
		;;
	*)
		echo "[DEPLOY] SMOKE FAIL: /api/entitlements/me returned $ENT_CODE (expected 401/403)"
		SMOKE_FAILED=1
		;;
esac

if [ "$SMOKE_FAILED" -ne 0 ]; then
	echo "[DEPLOY] Smoke tests failed"
	if [ -f /opt/oraone/.last_deploy_commit ]; then
		PREVIOUS="$(cat /opt/oraone/.last_deploy_commit)"
		echo "[DEPLOY] Rolling back to $PREVIOUS"
		git reset --hard "$PREVIOUS"
		sudo systemctl restart oraone-backend || true
	fi
	sudo journalctl -u oraone-backend -n 50 --no-pager || true
	exit 1
fi

echo "[DEPLOY] Deployment successful"
