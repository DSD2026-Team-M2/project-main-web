"""
ai_service.py
FastAPI wrapper for Borges generate_recommendation_from_curves.py (v1-motion-standard-curves-main).

Endpoints:
    GET  /health
    GET  /ai/standard-curve?action=walking|squat|upstairs
    POST /ai/recommend  body: {"action", "sessionId"}

Run locally:
    set BORGES_ROOT=..\\v1-motion-standard-curves-main
    uvicorn ai_service:app --host 0.0.0.0 --port 8001 --reload
"""

import csv
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Config ───────────────────────────────────────────────────────────────────
_REPO_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_BORGES = _REPO_ROOT / "v1-motion-standard-curves-main"

BORGES_ROOT = Path(os.environ.get("BORGES_ROOT", _DEFAULT_BORGES))
# Default to the same interpreter running uvicorn (avoids Windows "python3" → rc=9009).
PYTHON_BIN = os.environ.get("PYTHON_BIN") or sys.executable
SCRIPT_TIMEOUT_SEC = int(os.environ.get("SCRIPT_TIMEOUT_SEC", "90"))
MEASUREMENTS_BASE_URL = os.environ.get(
    "MEASUREMENTS_BASE_URL",
    "http://113.44.220.94:3000/measurements",
)

SCRIPT = BORGES_ROOT / "generate_recommendation_from_curves.py"

STANDARD_CSV = {
    "walking": BORGES_ROOT / "outputs" / "walking" / "normal_knee_curve.csv",
    "squat": BORGES_ROOT / "outputs" / "squat" / "standard_squat_curve.csv",
    "upstairs": BORGES_ROOT / "outputs" / "upstairs" / "standard_upstairs_curve.csv",
}

VALID_ACTIONS = set(STANDARD_CSV.keys())

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="M2 AI Recommendation Wrapper", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class RecommendRequest(BaseModel):
    action: str = Field(..., description="walking | squat | upstairs")
    sessionId: int = Field(..., ge=1, description="V2 session id")


def _normalize_action(action: str) -> str:
    return action.lower().strip()


def _read_standard_curve_points(path: Path) -> list[dict]:
    points: list[dict] = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            angle_raw = row.get("smooth_angle") or row.get("mean_angle")
            if row.get("percent") in (None, "") or angle_raw in (None, ""):
                continue
            point = {
                "percent": float(row["percent"]),
                "angle": float(angle_raw),
            }
            if row.get("mean_minus_sd") not in (None, ""):
                point["bandLow"] = float(row["mean_minus_sd"])
            if row.get("mean_plus_sd") not in (None, ""):
                point["bandHigh"] = float(row["mean_plus_sd"])
            points.append(point)
    if not points:
        raise HTTPException(500, f"standard csv vazio ou inválido: {path}")
    return points


@app.get("/health")
def health():
    standards = {
        action: {"path": str(path), "exists": path.is_file()}
        for action, path in STANDARD_CSV.items()
    }
    return {
        "ok": True,
        "borgesRoot": str(BORGES_ROOT),
        "scriptExists": SCRIPT.is_file(),
        "standards": standards,
        "measurementsBaseUrl": MEASUREMENTS_BASE_URL,
        "pythonBin": PYTHON_BIN,
    }


@app.get("/ai/standard-curve")
def standard_curve(action: str = Query(..., description="walking | squat | upstairs")):
    """Return the saved healthy standard curve for chart overlay."""
    action = _normalize_action(action)
    if action not in VALID_ACTIONS:
        raise HTTPException(400, f"action inválida; usa um de: {sorted(VALID_ACTIONS)}")

    std_csv = STANDARD_CSV[action]
    if not std_csv.is_file():
        raise HTTPException(500, f"standard csv não encontrado em {std_csv}")

    try:
        rel = str(std_csv.relative_to(BORGES_ROOT))
    except ValueError:
        rel = str(std_csv)

    return {
        "action": action,
        "angleID": "left_knee",
        "source": rel,
        "points": _read_standard_curve_points(std_csv),
    }


@app.post("/ai/recommend")
def recommend(req: RecommendRequest):
    """Run Borges script and return generated JSON."""
    action = _normalize_action(req.action)
    if action not in VALID_ACTIONS:
        raise HTTPException(400, f"action inválida; usa um de: {sorted(VALID_ACTIONS)}")

    std_csv = STANDARD_CSV[action]
    if not SCRIPT.is_file():
        raise HTTPException(500, f"script não encontrado em {SCRIPT}")
    if not std_csv.is_file():
        raise HTTPException(500, f"standard csv não encontrado em {std_csv}")

    workdir = Path(tempfile.mkdtemp(prefix="airec_"))
    out_json = workdir / "rec.json"
    out_txt = workdir / "rec.txt"
    out_html = workdir / "rec.html"

    try:
        cmd = [
            PYTHON_BIN,
            str(SCRIPT),
            "--action",
            action,
            "--patient-session-id",
            str(req.sessionId),
            "--standard-csv",
            str(std_csv),
            "--base-url",
            MEASUREMENTS_BASE_URL,
            "--out-json",
            str(out_json),
            "--out-txt",
            str(out_txt),
            "--out-html",
            str(out_html),
        ]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=SCRIPT_TIMEOUT_SEC,
            cwd=str(BORGES_ROOT),
        )
        if proc.returncode != 0:
            err_tail = (proc.stderr or proc.stdout or "").strip()[-500:]
            if proc.returncode == 9009 and not err_tail:
                err_tail = (
                    f"interpreter não encontrado: {PYTHON_BIN!r} "
                    "(Windows: use PYTHON_BIN=python ou deixe o default sys.executable)"
                )
            raise HTTPException(
                500,
                f"script falhou (rc={proc.returncode}): {err_tail}",
            )
        if not out_json.is_file():
            raise HTTPException(500, "script terminou sem produzir JSON")
        return json.loads(out_json.read_text(encoding="utf-8"))
    except subprocess.TimeoutExpired:
        raise HTTPException(504, f"script excedeu {SCRIPT_TIMEOUT_SEC}s")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
