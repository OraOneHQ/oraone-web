# OraOne — Run Locally

This guide reproduces the working Emergent setup on your machine.

> **Already done for you in AWS (you don't need to repeat):**
> - `ALLOW_USER_PASSWORD_AUTH` is enabled on Cognito app client `2v4a1aufa8cqkvc09963ols01a`.
> - `http://localhost:3000/auth/callback` is whitelisted in CallbackURLs.
> - `http://localhost:3000` is whitelisted in LogoutURLs.
> - No seeded/dummy users are required for local setup.
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

## 7) Verify signup + login (real accounts only)

### Login (existing real user)
1. Go to http://localhost:3000/login
2. Use your actual Cognito user email/password.
3. Click **Sign in with Email** → you should land on `/app/overview`.

### Signup (new user)
1. Go to http://localhost:3000/signup
2. Use a real email you can read.
3. After submit you'll be sent to `/verify-email?email=...` and Cognito emails you a 6-digit code.
4. Paste it on the verify page to confirm the account, then log in.

### Curl smoke tests

```bash
# Login (replace with a real Cognito user)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-real-email>","password":"<your-password>"}'

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
| Login returns `Incorrect username or password.` | Verify you are using a confirmed Cognito user in pool `ap-south-2_hbzHCGsK9`. If needed, run forgot-password and confirm email before logging in. |
| Hosted UI button redirects to `localhost:3000` but Cognito complains about `redirect_mismatch` | Ensure `http://localhost:3000/auth/callback` is listed under your Cognito app client's CallbackURLs. |
| CORS error in browser | In `backend/.env` set `CORS_ORIGINS=http://localhost:3000` (already in the example). |
| `boto3` says "Unable to locate credentials" | `backend/.env` is missing `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — re-copy from the example. |

---

## 9) Security notes

- The AWS keys in the example `.env` are scoped IAM credentials — rotate before production.
- Do not commit `.env` files. The repo's `.gitignore` already excludes them.
- Set `CORS_ORIGINS` to your exact frontend URLs in any non-dev environment.
