# OraOne Self-Hosted GitHub Actions Deployment

This guide configures fully automated production deployment for OraOne using a GitHub self-hosted runner running directly on the EC2 production server.

## 1. Deployment Architecture

```mermaid
flowchart LR
  A[Developer Push to main] --> B[GitHub Private Repository]
  B --> C[GitHub Actions Workflow deploy.yml]
  C --> D[Self-Hosted Runner on EC2]
  D --> E[/opt/oraone/deploy.sh]
  E --> F[Restart oraone-backend service]
  E --> G[Reload nginx]
  E --> H[Health checks]
  H --> I[Deployment success or fail]
```

## 2. Prerequisites

- EC2 host: Amazon Linux 2023
- Repo mirror present at `/opt/oraone`
- Backend venv exists at `/opt/oraone/backend/.venv`
- Services installed:
  - `oraone-backend`
  - `nginx`
- Runner user has passwordless sudo for service operations used in deployment:
  - `systemctl restart oraone-backend`
  - `systemctl reload nginx`
  - `systemctl is-active oraone-backend`

Recommended sudoers entry (via `visudo`):

```sudoers
ec2-user ALL=(ALL) NOPASSWD: /bin/systemctl restart oraone-backend, /bin/systemctl reload nginx, /bin/systemctl is-active oraone-backend
```

## 3. Install and Configure Self-Hosted Runner on EC2

Run these on the EC2 production server.

### 3.1 Create runner directory

```bash
cd ~
mkdir -p actions-runner
cd actions-runner
```

### 3.2 Download latest Linux x64 runner

```bash
LATEST_URL=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep browser_download_url | grep linux-x64 | cut -d '"' -f 4)
curl -fsSL -o actions-runner.tar.gz "$LATEST_URL"
tar xzf actions-runner.tar.gz
```

### 3.3 Configure runner

Get a registration token from:
GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner

Run config (replace placeholders):

```bash
./config.sh \
  --url https://github.com/<ORG_OR_USER>/<PRIVATE_REPO> \
  --token <RUNNER_REGISTRATION_TOKEN> \
  --name oraone-prod-runner \
  --labels production,linux,ec2 \
  --unattended \
  --work _work
```

### 3.4 Install and start as service

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
sudo systemctl enable actions.runner.*
```

## 4. Place Deployment Scripts in /opt/oraone

Files added in this repository:

- `scripts/deployment/deploy.sh`
- `scripts/deployment/rollback.sh`

Copy them to production path:

```bash
cd /opt/oraone
cp scripts/deployment/deploy.sh /opt/oraone/deploy.sh
cp scripts/deployment/rollback.sh /opt/oraone/rollback.sh
chmod +x /opt/oraone/deploy.sh /opt/oraone/rollback.sh
```

## 5. GitHub Actions Workflow

Workflow file:

- `.github/workflows/deploy.yml`

Behavior:

- Triggers on push to `main`
- Runs on self-hosted runner labels: `self-hosted`, `production`, `linux`, `ec2`
- Executes `/opt/oraone/deploy.sh`
- Verifies backend service state
- Verifies health endpoints:
  - `http://localhost:8000/health`
  - `https://api.oraone.in/health`
- Prints deployment logs
- Fails the workflow if deploy or health checks fail

## 6. Deployment Script Details

`/opt/oraone/deploy.sh` performs:

1. Start message with UTC timestamp
2. Acquire deployment lock file (`/tmp/oraone-deploy.lock`)
3. `git fetch origin`
4. Compare current commit with `origin/main` and exit if unchanged
5. Save rollback commit to `/opt/oraone/.last_deploy_commit`
6. `git reset --hard origin/main`
7. Append deployment entry to `/opt/oraone/deploy-history.log`
8. Activate backend venv
9. `python -m pip install --upgrade pip`
10. `pip install -r backend/requirements.txt`
11. Restart `oraone-backend`
12. Validate service active
13. Reload nginx
14. Wait/retry local health checks
15. Auto-rollback and restart backend if health check still fails
16. Validate rollback health without masking the original deployment failure
17. Print recent backend service logs in workflow output on failure
18. Success message

Failure path behavior (implemented in `deploy.sh`):

```bash
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
```

## 7. Rollback Script Details

`/opt/oraone/rollback.sh`:

- Uses commit hash passed as argument, or fallback from `/opt/oraone/.last_deploy_commit`
- Executes hard reset to target commit
- Restarts backend
- Validates local health endpoint

Usage:

```bash
# preferred: explicit commit
/opt/oraone/rollback.sh <previous_commit_hash>

# fallback: uses /opt/oraone/.last_deploy_commit
/opt/oraone/rollback.sh
```

## 8. Troubleshooting

### Runner offline

- Check service:

```bash
cd ~/actions-runner
sudo ./svc.sh status
```

- Restart runner service:

```bash
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

- Inspect runner logs in `_diag` folder:

```bash
ls -lah ~/actions-runner/_diag
```

### Runner not starting after reboot

```bash
sudo systemctl enable actions.runner.*
systemctl list-unit-files | grep actions.runner
```

### Workflow stuck in queued state

- Confirm runner labels match workflow:
  - workflow expects: `self-hosted`, `production`, `linux`, `ec2`
- Confirm runner is attached to the correct private repo.

### Deploy fails on sudo/systemctl

- Ensure runner user has required passwordless sudo entries in `/etc/sudoers`.

### Health checks fail

- Check backend service logs:

```bash
sudo journalctl -u oraone-backend -n 200 --no-pager
```

- Check nginx logs:

```bash
sudo tail -n 200 /var/log/nginx/error.log
```

- Verify local app directly:

```bash
curl -v http://localhost:8000/health
```

### Python/venv errors

- Recreate venv if needed:

```bash
cd /opt/oraone/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 9. Validation Checklist

- [ ] Self-hosted runner is online in GitHub repo settings
- [ ] Runner labels include: `production`, `linux`, `ec2`
- [ ] `/opt/oraone/deploy.sh` and `/opt/oraone/rollback.sh` exist and are executable
- [ ] Push to `main` triggers deployment automatically
- [ ] Manual deployment trigger is disabled (merge-only deployment)
- [ ] Workflow logs show deploy script execution
- [ ] `oraone-backend` is active after deployment
- [ ] `http://localhost:8000/health` returns success
- [ ] `https://api.oraone.in/health` returns success
- [ ] Rollback script successfully restores previous commit

## 10. Security Notes

- No GitHub Secrets are required.
- No SSH deployment from GitHub Actions is used.
- No PEM keys are stored in GitHub.
- Deployment is executed directly on EC2 by the self-hosted runner.

## 11. Branch Protection (Recommended)

Configure branch protection on `main` in GitHub:

- Require pull request before merging
- Require at least one approval
- Require required status checks to pass
- Block force pushes

This ensures production deploys happen through reviewed PR merges.
