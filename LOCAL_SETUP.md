# OraOne — Run Locally

This guide reproduces the working Emergent setup on your machine.

> **Already done for you in AWS (you don't need to repeat):**
> - `ALLOW_USER_PASSWORD_AUTH` is enabled on Cognito app client `2v4a1aufa8cqkvc09963ols01a`.
> - `http://localhost:3000/auth/callback` is whitelisted in CallbackURLs.
> - `http://localhost:3000` is whitelisted in LogoutURLs.
> - Test user `test@gmail.com` has permanent password `OraOne@2026` (CONFIRMED state).
>
> These are AWS-side config changes, so they apply to every developer machine — no per-laptop AWS work needed.

---

## 1) Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Python | 3.10+ (3.11 recommended) | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| Yarn | 1.22+ (`npm i -g yarn`) | https://yarnpkg.com/ |
| MongoDB | 6+ (any local instance) | https://www.mongodb.com/docs/manual/installation/ — or just `docker run -d -p 27017:27017 --name mongo mongo:7` |

---

## 2) Clone & install

```bash
git clone https://github.com/varunjakkampudi-tech/oraone.git
cd oraone

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
```

---

## 3) Create env files

```bash
# from repo root
cp backend/.env.local.example backend/.env
cp frontend/.env.local.example frontend/.env
```

Both files already contain the working AWS keys, Cognito IDs, and `localhost` URLs.
**Do NOT commit `.env`** — they're in `.gitignore`.

---

## 4) Start MongoDB (only needed for agents/leads endpoints)

```bash
# Option A — local install
mongod --dbpath ~/mongo-data

# Option B — Docker (recommended)
docker run -d -p 27017:27017 --name oraone-mongo mongo:7
```

---

## 5) Run backend on :8000

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Smoke test:

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","time":"..."}
```

> The repo also has `main.py` (auth-only mini app). For full functionality use `server:app` as above.

---

## 6) Run frontend on :3000

```bash
cd frontend
yarn start
```

Open http://localhost:3000.

---

## 7) Verify signup + login

### Login (existing test user)
1. Go to http://localhost:3000/login
2. Email: `test@gmail.com`
3. Password: `OraOne@2026`
4. Click **Sign in with Email** → you should land on `/app/overview`.

### Signup (new user)
1. Go to http://localhost:3000/signup
2. Use a real email you can read.
3. After submit you'll be sent to `/verify-email?email=...` and Cognito emails you a 6-digit code.
4. Paste it on the verify page to confirm the account, then log in.

### Curl smoke tests

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"OraOne@2026"}'

# Use the access_token returned above
TOKEN=...
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

---

## 8) Troubleshooting

| Symptom | Fix |
|---|---|
| Backend exits with `KeyError: 'MONGO_URL'` | You haven't created `backend/.env`. Re-run step 3. |
| Login returns `Invalid request parameters.` | Means the Cognito app client lost `ALLOW_USER_PASSWORD_AUTH`. Re-enable in AWS Console → Cognito → User Pools → App integration → your app client → Authentication flows. |
| Login returns `Incorrect username or password.` for `test@gmail.com` | The test user may have been reset. Run from any machine with AWS creds: `aws cognito-idp admin-set-user-password --user-pool-id ap-south-2_hbzHCGsK9 --username test@gmail.com --password 'OraOne@2026' --permanent --region ap-south-2` |
| Hosted UI button redirects to `localhost:3000` but Cognito complains about `redirect_mismatch` | Ensure `http://localhost:3000/auth/callback` is listed under your Cognito app client's CallbackURLs. |
| CORS error in browser | In `backend/.env` set `CORS_ORIGINS=http://localhost:3000` (already in the example). |
| `boto3` says "Unable to locate credentials" | `backend/.env` is missing `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — re-copy from the example. |

---

## 9) Security notes

- The AWS keys in the example `.env` are scoped IAM credentials — rotate before production.
- Do not commit `.env` files. The repo's `.gitignore` already excludes them.
- Set `CORS_ORIGINS` to your exact frontend URLs in any non-dev environment.
