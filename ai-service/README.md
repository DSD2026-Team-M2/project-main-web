# ai-service — AI Recommendation Wrapper

FastAPI micro-service that wraps Borges's `generate_recommendation_from_curves.py`
(from https://github.com/abenjas69/v1-motion-standard-curves) and exposes it as
an HTTP endpoint consumed by the dashboard's "AI Curve Analysis" card.

## What it does

```
[Frontend POST /ai/recommend  {action, sessionId}]
              │
              ▼
[FastAPI on :8001]
              │  subprocess: generate_recommendation_from_curves.py
              ▼
[Borges's script] ──fetch──> V2 API /measurements/:sessionId
              │  writes /tmp/.../rec.json
              ▼
[Wrapper returns JSON]
```

## Files

- `ai_service.py` — FastAPI app (~120 lines), endpoint `POST /ai/recommend`
- `requirements.txt` — fastapi + uvicorn + pydantic
- `ai-recommend.service` — systemd unit so the service auto-starts on boot

## Deploy (Ubuntu server)

> Run once.

### 1. Clone Borges's repo at `/opt/v1-motion-standard-curves`

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/abenjas69/v1-motion-standard-curves.git
sudo chown -R "$USER:$USER" /opt/v1-motion-standard-curves
cd v1-motion-standard-curves
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 2. Smoke-test Borges's script

```bash
.venv/bin/python generate_recommendation_from_curves.py \
  --action walking --patient-session-id 209 \
  --standard-csv outputs/walking/normal_knee_curve.csv \
  --out-json /tmp/test.json --out-txt /tmp/test.txt --out-html /tmp/test.html
head -20 /tmp/test.json
```

If you see JSON, it works.

### 3. Install this wrapper at `/opt/ai-service`

```bash
sudo mkdir -p /opt/ai-service
sudo chown -R "$USER:$USER" /opt/ai-service
cd /opt/ai-service
# copy ai_service.py, requirements.txt, ai-recommend.service here
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 4. Test the wrapper manually

```bash
cd /opt/ai-service
BORGES_ROOT=/opt/v1-motion-standard-curves \
PYTHON_BIN=/opt/v1-motion-standard-curves/.venv/bin/python \
.venv/bin/uvicorn ai_service:app --host 0.0.0.0 --port 8001
```

In another terminal:

```bash
curl http://localhost:8001/health
curl -X POST http://localhost:8001/ai/recommend \
  -H 'Content-Type: application/json' \
  -d '{"action":"walking","sessionId":209}' | head -20
```

If JSON comes back, `Ctrl+C` the uvicorn.

### 5. Install as systemd service

```bash
sudo cp /opt/ai-service/ai-recommend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ai-recommend
sudo systemctl start ai-recommend
sudo systemctl status ai-recommend     # should say active (running)
```

### 6. Open port 8001 (if firewall is on)

```bash
sudo ufw allow 8001/tcp
```

### 7. Verify from outside

```bash
curl http://113.44.220.94:8001/health
```

Expected: `{"ok": true, "scriptExists": true, "borgesRoot": "/opt/v1-motion-standard-curves"}`

## Logs

```bash
sudo journalctl -u ai-recommend -f
```

## API

### `GET /health`

Sanity check. Returns whether the script is reachable.

### `POST /ai/recommend`

Body:
```json
{ "action": "walking", "sessionId": 209 }
```

`action` must be one of: `walking`, `squat`, `upstairs`.

Returns the full JSON produced by `generate_recommendation_from_curves.py`
(status, confidence, metrics, observations, clinicalAdviceDraft, ...).

## Configuration (env vars)

| Var | Default | Description |
|---|---|---|
| `BORGES_ROOT` | `/opt/v1-motion-standard-curves` | Where Borges's repo lives |
| `PYTHON_BIN` | `python3` | Python interpreter (use the venv one) |
| `SCRIPT_TIMEOUT_SEC` | `90` | Subprocess timeout |

These are set in the systemd unit; edit `/etc/systemd/system/ai-recommend.service`
if paths differ, then `sudo systemctl daemon-reload && sudo systemctl restart ai-recommend`.

## CORS

The wrapper currently accepts requests from any origin (`allow_origins=["*"]`).
Tighten this once the production frontend domain is known.
