"""
Agent 01 bridge service — accepts multipart file uploads from Express/Next.js
and calls the real Groq condition-comparison logic.

Run from assetwitness-pipeline/:
    uvicorn services.agent01_service:app --port 8001 --reload
"""

import json
import os
import tempfile
import traceback
import uuid
from typing import List

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="AssetWitness Agent 01 — Condition Comparison Bridge Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "agent": "01"}


@app.post("/api/v1/agent01")
async def run_agent01(
    prior_condition:   List[UploadFile] = File(default=[]),
    current_condition: List[UploadFile] = File(default=[]),
    condition_items:    str              = Form("[]"),
):
    try:
        item_list = json.loads(condition_items)
    except (ValueError, TypeError):
        item_list = []

    if not item_list:
        return JSONResponse({"error": "No condition_items provided"}, status_code=400)

    prior_valid = [f for f in prior_condition if f and f.filename]
    current_valid = [f for f in current_condition if f and f.filename]

    if not prior_valid or not current_valid:
        return {
            "condition_map": [
                {
                    "item_id":   item.get("item_id", f"I{i+1:03d}"),
                    "item":      item.get("item", ""),
                    "verdict":   None,
                    "attributable_party": "UNDETERMINED",
                    "confidence": 0.0,
                    "prior_condition":   "No photo uploaded",
                    "current_condition": "No photo uploaded",
                    "status":    "unverifiable_by_cv",
                    "wear_and_tear": False,
                    "notes": "No photos provided — policy reasoning will use the agreement and asset policy only.",
                }
                for i, item in enumerate(item_list)
            ],
            "model_used": "skipped",
        }

    tmp_dir = tempfile.mkdtemp()
    prior_paths = []
    current_paths = []

    try:
        for upload in prior_valid:
            p = os.path.join(tmp_dir, f"prior_{uuid.uuid4().hex}.jpg")
            with open(p, "wb") as f:
                f.write(await upload.read())
            prior_paths.append(p)

        for upload in current_valid:
            p = os.path.join(tmp_dir, f"current_{uuid.uuid4().hex}.jpg")
            with open(p, "wb") as f:
                f.write(await upload.read())
            current_paths.append(p)

        from agent01_condition_comparison import run_cv_assessment
        raw = run_cv_assessment(
            prior_paths=prior_paths,
            current_paths=current_paths,
            condition_items=item_list,
        )

        condition_map = []
        for i, (item, assessment) in enumerate(zip(item_list, raw.get("item_assessments", []))):
            confidence = float(assessment.get("confidence", 0.0))
            change = assessment.get("change_detected")
            wear = assessment.get("wear_and_tear")
            occupant_caused = assessment.get("likely_occupant_caused")

            if confidence < 0.30 or (assessment.get("low_visibility") and confidence < 0.60):
                verdict, status, party = None, "unverifiable_by_cv", "UNDETERMINED"
            elif not change:
                verdict, status, party = "UNCHANGED", "ok", "UNDETERMINED"
            elif wear:
                verdict, status, party = "NORMAL_WEAR", "ok", "UNDETERMINED"
            elif change and occupant_caused is False:
                verdict, status, party = "PRE_EXISTING", "ok", "DAD"
            elif change and occupant_caused is True:
                verdict, status, party = "NEW_DAMAGE", "ok", "OCCUPANT"
            else:
                verdict, status, party = None, "ok", "UNDETERMINED"

            condition_map.append({
                "item_id":            item.get("item_id", f"I{i+1:03d}"),
                "item":               item.get("item", ""),
                "verdict":            verdict,
                "attributable_party": party,
                "confidence":         confidence,
                "prior_condition":    assessment.get("prior_condition", ""),
                "current_condition":  assessment.get("current_condition", ""),
                "status":             status,
                "wear_and_tear":      wear,
                "wear_and_tear_reason": assessment.get("wear_and_tear_reason", ""),
                "notes":              assessment.get("notes", ""),
            })

        return {"condition_map": condition_map, "model_used": raw.get("model_used", "")}

    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": traceback.format_exc()}, status_code=500)
    finally:
        for p in prior_paths + current_paths:
            try: os.remove(p)
            except OSError: pass
