"""
ai_service.py
Micro-serviço HTTP que expõe o script do Borges (generate_recommendation_from_curves.py)
ao frontend da equipa M2.

Endpoint:
    POST /ai/recommend  body: {"action": "walking|squat|upstairs", "sessionId": int}
    -> devolve o JSON gerado pelo script.

Correr (em produção):
    uvicorn ai_service:app --host 0.0.0.0 --port 8001
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Configuração ─────────────────────────────────────────────────────────────
# Pode ser sobreposta por variáveis de ambiente no systemd unit.
BORGES_ROOT = Path(os.environ.get(
    "BORGES_ROOT",
    "/opt/v1-motion-standard-curves",
))
PYTHON_BIN = os.environ.get("PYTHON_BIN", "python3")
SCRIPT_TIMEOUT_SEC = int(os.environ.get("SCRIPT_TIMEOUT_SEC", "90"))

SCRIPT = BORGES_ROOT / "generate_recommendation_from_curves.py"

# Caminhos das curvas padrão (todas usam o ficheiro normal_knee_curve.csv).
STANDARD_CSV = {
    "walking":  BORGES_ROOT / "outputs" / "walking"  / "normal_knee_curve.csv",
    "squat":    BORGES_ROOT / "outputs" / "squat"    / "normal_knee_curve.csv",
    "upstairs": BORGES_ROOT / "outputs" / "upstairs" / "normal_knee_curve.csv",
}

VALID_ACTIONS = set(STANDARD_CSV.keys())

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="M2 AI Recommendation Wrapper", version="0.1.0")

# CORS permissivo (o frontend pode estar noutro host/porta).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class RecommendRequest(BaseModel):
    action: str = Field(..., description="walking | squat | upstairs")
    sessionId: int = Field(..., ge=1, description="ID da sessão na BD do V2")


@app.get("/health")
def health():
    """Endpoint trivial para verificar que o serviço está vivo."""
    return {
        "ok": True,
        "scriptExists": SCRIPT.is_file(),
        "borgesRoot": str(BORGES_ROOT),
    }


@app.post("/ai/recommend")
def recommend(req: RecommendRequest):
    """Corre o script do Borges e devolve o JSON gerado."""
    action = req.action.lower().strip()
    if action not in VALID_ACTIONS:
        raise HTTPException(400, f"action inválida; usa um de: {sorted(VALID_ACTIONS)}")

    std_csv = STANDARD_CSV[action]
    if not SCRIPT.is_file():
        raise HTTPException(500, f"script não encontrado em {SCRIPT}")
    if not std_csv.is_file():
        raise HTTPException(500, f"standard csv não encontrado em {std_csv}")

    # Cria um diretório temporário; o script escreve lá os outputs obrigatórios.
    workdir = Path(tempfile.mkdtemp(prefix="airec_"))
    out_json = workdir / "rec.json"
    out_txt = workdir / "rec.txt"
    out_html = workdir / "rec.html"

    try:
        cmd = [
            PYTHON_BIN, str(SCRIPT),
            "--action", action,
            "--patient-session-id", str(req.sessionId),
            "--standard-csv", str(std_csv),
            "--out-json", str(out_json),
            "--out-txt", str(out_txt),
            "--out-html", str(out_html),
        ]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=SCRIPT_TIMEOUT_SEC,
            cwd=str(BORGES_ROOT),
        )
        if proc.returncode != 0:
            # Devolve os últimos 500 chars do stderr para diagnóstico.
            raise HTTPException(500, f"script falhou (rc={proc.returncode}): {proc.stderr[-500:]}")
        if not out_json.is_file():
            raise HTTPException(500, "script terminou sem produzir JSON")
        return json.loads(out_json.read_text(encoding="utf-8"))
    except subprocess.TimeoutExpired:
        raise HTTPException(504, f"script excedeu {SCRIPT_TIMEOUT_SEC}s")
    finally:
        # Limpa o diretório temporário.
        shutil.rmtree(workdir, ignore_errors=True)
