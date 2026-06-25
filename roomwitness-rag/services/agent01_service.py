"""
Agent 01 bridge service — accepts multipart file uploads from Express/Next.js
and calls the real Groq CV assessment logic.

Run from roomwitness-rag/:
    uvicorn services.agent01_service:app --port 8001 --reload
"""

import json
import os
import sys
import tempfile
import traceback
import uuid
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="RoomWitness Agent 01 — CV Bridge Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "agent": "01"}


@app.post("/api/v1/agent01")
async def run_agent01(
    move_in:  Optional[UploadFile] = File(None),
    move_out: Optional[UploadFile] = File(None),
    claims:   str                  = Form("[]"),
):
    try:
        claim_list = json.loads(claims)
    except (ValueError, TypeError):
        claim_list = []

    if not claim_list:
        return JSONResponse({"error": "No claims provided"}, status_code=400)

    no_photos = not (move_in and move_in.filename and move_out and move_out.filename)
    if no_photos:
        return {
            "damage_map": [
                {
                    "claim_id":   c.get("claim_id", f"C{i+1:03d}"),
                    "item":       c.get("item", ""),
                    "verdict":    None,
                    "confidence": 0.0,
                    "move_in_condition":  "No photo uploaded",
                    "move_out_condition": "No photo uploaded",
                    "status":     "unverifiable_by_cv",
                    "supports_landlord_claim": "PARTIAL",
                    "wear_and_tear": False,
                    "notes": "No photos provided — legal reasoning will use contract and law only.",
                }
                for i, c in enumerate(claim_list)
            ],
            "model_used": "skipped",
        }

    tmp_dir  = tempfile.mkdtemp()
    in_path  = os.path.join(tmp_dir, f"in_{uuid.uuid4().hex}.jpg")
    out_path = os.path.join(tmp_dir, f"out_{uuid.uuid4().hex}.jpg")

    try:
        with open(in_path, "wb") as f:
            f.write(await move_in.read())
        with open(out_path, "wb") as f:
            f.write(await move_out.read())

        from agent01_cv import run_cv_assessment
        raw = run_cv_assessment(
            move_in_paths=[in_path],
            move_out_paths=[out_path],
            landlord_claims=claim_list,
        )

        damage_map = []
        for i, (claim, assessment) in enumerate(zip(claim_list, raw.get("claim_assessments", []))):
            confidence = float(assessment.get("confidence", 0.0))
            change  = assessment.get("change_detected")
            wear    = assessment.get("wear_and_tear")
            tenant  = assessment.get("likely_tenant_caused")
            supports = assessment.get("supports_landlord_claim", "PARTIAL")

            if confidence < 0.30 or (assessment.get("low_visibility") and confidence < 0.60):
                verdict, status = None, "unverifiable_by_cv"
            elif not change:
                verdict, status = "UNCHANGED", "ok"
            elif wear:
                verdict, status = "NORMAL_WEAR", "ok"
            elif change and tenant is False:
                verdict, status = "PRE_EXISTING", "ok"
            elif change and tenant is True:
                verdict, status = "NEW_DAMAGE", "ok"
            else:
                verdict, status = None, "ok"

            damage_map.append({
                "claim_id":           claim.get("claim_id", f"C{i+1:03d}"),
                "item":               claim.get("item", ""),
                "verdict":            verdict,
                "confidence":         confidence,
                "move_in_condition":  assessment.get("move_in_condition", ""),
                "move_out_condition": assessment.get("move_out_condition", ""),
                "status":             status,
                "supports_landlord_claim": supports,
                "wear_and_tear":      wear,
                "wear_and_tear_reason": assessment.get("wear_and_tear_reason", ""),
                "notes":              assessment.get("notes", ""),
            })

        return {"damage_map": damage_map, "model_used": raw.get("model_used", "")}

    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": traceback.format_exc()}, status_code=500)
    finally:
        for p in [in_path, out_path]:
            try: os.remove(p)
            except OSError: pass
