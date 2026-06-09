# ai-service — AI Recommendation Wrapper

FastAPI micro-service that wraps Borges's `generate_recommendation_from_curves.py`
and exposes it to the M2 clinical dashboard.

**Runs on Windows (local dev) and Ubuntu (production server).**

## What it does

```
[Frontend — dev: /ai-api proxy | prod: VITE_AI_URL]
              │
              ▼
[FastAPI on :8001]
    GET  /ai/standard-curve?action=walking   → standard CSV for chart overlay
    POST /ai/recommend {action, sessionId}   → subprocess Borges script
              │
              ▼
[v1-motion-standard-curves-main/generate_recommendation_from_curves.py]
              │  fetch V2 /measurements/:sessionId
              ▼
[JSON returned to frontend]
```

## Prerequisites

| Item | Notes |
|---|---|
| Python 3.10+ | `python --version` |
| `v1-motion-standard-curves-main/` | Sibling folder of `ai-service/` (auto-detected) |
| Standard CSVs | Must exist under `outputs/walking`, `outputs/squat`, `outputs/upstairs` |
| V2 API reachable | Default `http://113.44.220.94:3000/measurements` (for AI generation) |

Standard CSV paths used by the wrapper:

| action | file |
|---|---|
| walking | `outputs/walking/normal_knee_curve.csv` |
| squat | `outputs/squat/standard_squat_curve.csv` |
| upstairs | `outputs/upstairs/standard_upstairs_curve.csv` |

## Files

- `ai_service.py` — FastAPI app: `GET /health`, `GET /ai/standard-curve`, `POST /ai/recommend`
- `requirements.txt` — fastapi + uvicorn + pydantic
- `ai-recommend.service` — systemd unit (Ubuntu only)

---

## Windows — local development

Typical layout (your machine):

```text
E:\School\project-main-web\
  ai-service\                  ← this wrapper
  v1-motion-standard-curves-main\   ← Borges scripts + outputs (do not edit)
  m2-clinical-web\             ← React frontend
```

### 1. One-time setup

Open **PowerShell**:

```powershell
cd E:\School\project-main-web\ai-service

# Optional but recommended: virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

If script activation is blocked:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 2. Smoke-test Borges script (optional)

```powershell
cd E:\School\project-main-web\v1-motion-standard-curves-main

python generate_recommendation_from_curves.py `
  --action walking `
  --patient-session-id 209 `
  --standard-csv outputs/walking/normal_knee_curve.csv `
  --base-url http://113.44.220.94:3000/measurements `
  --out-json $env:TEMP\test_rec.json `
  --out-txt $env:TEMP\test_rec.txt

Get-Content $env:TEMP\test_rec.json -Head 20
```

If JSON appears, Borges + V2 API are working.

### 3. Start ai-service (terminal 1)

```powershell
cd E:\School\project-main-web\ai-service
.\.venv\Scripts\Activate.ps1   # if using venv

# BORGES_ROOT is auto-detected as ..\v1-motion-standard-curves-main
uvicorn ai_service:app --host 127.0.0.1 --port 8001 --reload
```

Override paths if needed:

```powershell
$env:BORGES_ROOT = "E:\School\project-main-web\v1-motion-standard-curves-main"
$env:PYTHON_BIN = "python"
$env:MEASUREMENTS_BASE_URL = "http://113.44.220.94:3000/measurements"
uvicorn ai_service:app --host 127.0.0.1 --port 8001 --reload
```

### 4. Verify endpoints (another PowerShell window)

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
Invoke-RestMethod "http://127.0.0.1:8001/ai/standard-curve?action=walking"

Invoke-RestMethod http://127.0.0.1:8001/ai/recommend `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"action":"walking","sessionId":209}'
```

### 5. Start frontend (terminal 2)

```powershell
cd E:\School\project-main-web\m2-clinical-web
npm run dev
```

Open `http://localhost:5173`, go to a **session detail** page:

- Chart: check **「叠加标准曲线对照」** + pick action → orange dashed standard line
- Bottom card: **「生成 AI 建议」**

In dev, Vite proxies `/ai-api` → `http://127.0.0.1:8001` — no need to expose port 8001 to the browser directly.

### Windows notes

| Topic | Detail |
|---|---|
| Can it run? | **Yes** — FastAPI + subprocess work on Windows |
| Auto-start on boot | No systemd; keep a terminal open, or use NSSM / Task Scheduler if needed later |
| `python` vs `python3` | On Windows use `python`; set `PYTHON_BIN=python` if you override env |
| Firewall | Local dev uses `127.0.0.1` only — no inbound rule needed |
| Production on Windows Server | Possible (same uvicorn command, bind `0.0.0.0`), but team currently targets Ubuntu |

---

## Ubuntu — production server

### 1. Place Borges repo

```bash
sudo mkdir -p /opt/v1-motion-standard-curves-main
# copy v1-motion-standard-curves-main contents (must include outputs/... CSVs)
sudo chown -R "$USER:$USER" /opt/v1-motion-standard-curves-main
```

### 2. Smoke-test Borges script

```bash
cd /opt/v1-motion-standard-curves-main
python3 generate_recommendation_from_curves.py \
  --action walking --patient-session-id 209 \
  --standard-csv outputs/walking/normal_knee_curve.csv \
  --out-json /tmp/test.json --out-txt /tmp/test.txt
head -20 /tmp/test.json
```

### 3. Install wrapper

```bash
sudo mkdir -p /opt/ai-service
sudo chown -R "$USER:$USER" /opt/ai-service
cd /opt/ai-service
# copy ai_service.py, requirements.txt, ai-recommend.service here
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 4. Test manually

```bash
cd /opt/ai-service
BORGES_ROOT=/opt/v1-motion-standard-curves-main \
MEASUREMENTS_BASE_URL=http://113.44.220.94:3000/measurements \
.venv/bin/uvicorn ai_service:app --host 0.0.0.0 --port 8001
```

```bash
curl http://localhost:8001/health
curl "http://localhost:8001/ai/standard-curve?action=walking"
curl -X POST http://localhost:8001/ai/recommend \
  -H 'Content-Type: application/json' \
  -d '{"action":"walking","sessionId":209}'
```

### 5. systemd service

Edit `ai-recommend.service` if the OS user is not `ubuntu`, then:

```bash
sudo cp /opt/ai-service/ai-recommend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ai-recommend
sudo systemctl start ai-recommend
sudo systemctl status ai-recommend
```

### 6. Firewall

```bash
sudo ufw allow 8001/tcp
curl http://113.44.220.94:8001/health
```

### 7. Frontend production

Set in `m2-clinical-web` build env:

```text
VITE_AI_URL=http://113.44.220.94:8001
```

---

## API

### `GET /health`

Returns `borgesRoot`, whether the script and standard CSVs exist.

### `GET /ai/standard-curve?action=walking`

Returns `{ action, angleID, source, points[] }` for chart overlay.

### `POST /ai/recommend`

Body:

```json
{ "action": "walking", "sessionId": 209 }
```

`action`: `walking` | `squat` | `upstairs`.

Returns full Borges JSON (status, metrics, observations, clinicalAdviceDraft, …).

## Configuration (env vars)

| Var | Default | Description |
|---|---|---|
| `BORGES_ROOT` | `../v1-motion-standard-curves-main` (relative to `ai_service.py`) | Borges repo path |
| `PYTHON_BIN` | `sys.executable` (same Python as uvicorn) | Override only if Borges needs another venv |
| `MEASUREMENTS_BASE_URL` | `http://113.44.220.94:3000/measurements` | V2 API base passed to Borges `--base-url` |
| `SCRIPT_TIMEOUT_SEC` | `90` | Subprocess timeout |

On Ubuntu these are set in `ai-recommend.service`.

## Logs (Ubuntu)

```bash
sudo journalctl -u ai-recommend -f
```

## CORS

The wrapper accepts all origins (`allow_origins=["*"]`) for development.
Tighten in production once the frontend domain is fixed.
