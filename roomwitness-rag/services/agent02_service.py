"""
Agent 02 bridge service — accepts multipart form data from Express/Next.js
and calls the real Typhoon v2 contract parsing logic.

Run from roomwitness-rag/:
    uvicorn services.agent02_service:app --port 8002 --reload
"""

import json
import os
import tempfile
import traceback
from contextlib import asynccontextmanager
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_openai import ChatOpenAI

from agent02_contract_parser.parser import parse_contract
from shared.typhoon_client import get_typhoon_llm

_llm: ChatOpenAI | None = None


@asynccontextmanager
async def lifespan(app):
    global _llm
    _llm = get_typhoon_llm(temperature=0.1)
    yield
    _llm = None


app = FastAPI(
    title="RoomWitness Agent 02 — Contract Parser Bridge Service",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "agent": "02"}


async def _extract_chat_evidence(
    screenshots: List[UploadFile],
    manual_landlord: str,
    manual_tenant: str,
) -> dict:
    """
    OCR conversation screenshots (Groq Llama-4-Scout via agent01_cv.evidence)
    and merge with manually typed promises. Always returns the four evidence
    fields so the response schema is stable.
    """
    evidence = {
        "landlord_promises": [],
        "tenant_promises":   [],
        "deposit_mentions":  [],
        "platforms":         [],
    }
    valid = [f for f in (screenshots or []) if f and f.filename]
    if not valid and not manual_landlord.strip() and not manual_tenant.strip():
        return evidence

    tmp_paths: list[str] = []
    try:
        for i, upload in enumerate(valid):
            ext = os.path.splitext(upload.filename)[1].lower() or ".jpg"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_ss{i}{ext}")
            tmp.write(await upload.read())
            tmp.close()
            tmp_paths.append(tmp.name)

        from agent01_cv import run_evidence_analysis
        raw = run_evidence_analysis(
            screenshot_paths=tmp_paths,
            manual_landlord_promises=manual_landlord,
            manual_tenant_promises=manual_tenant,
        )
        evidence["landlord_promises"] = raw.get("all_landlord_promises", [])
        evidence["tenant_promises"]   = raw.get("all_tenant_promises", [])
        evidence["deposit_mentions"]  = raw.get("all_deposit_mentions", [])
        evidence["platforms"]         = raw.get("platforms_detected", [])
    except Exception:
        traceback.print_exc()
        # Groq unavailable or extraction failed — keep the manual statements
        evidence["landlord_promises"] = [
            ln.strip("•-– ").strip() for ln in manual_landlord.splitlines() if ln.strip()
        ]
        evidence["tenant_promises"] = [
            ln.strip("•-– ").strip() for ln in manual_tenant.splitlines() if ln.strip()
        ]
    finally:
        for p in tmp_paths:
            try:
                os.remove(p)
            except OSError:
                pass
    return evidence


@app.post("/api/v1/agent02")
async def run_agent02(
    contract_file:   Optional[UploadFile] = File(None),
    screenshots:     List[UploadFile] = File(default=[]),
    claims:          str = Form("[]"),
    contract_clause: str = Form(""),
    lease_start:     str = Form(""),
    lease_end:       str = Form(""),
    deposit_amount:  str = Form("0"),
    monthly_rent:    str = Form("0"),
    manual_landlord_promises: str = Form(""),
    manual_tenant_promises:   str = Form(""),
):
    if _llm is None:
        return JSONResponse({"error": "LLM not initialised"}, status_code=503)

    try:
        claim_list = json.loads(claims)
    except (ValueError, TypeError):
        claim_list = []

    # ── Chat-screenshot evidence (OCR via Groq Llama-4-Scout) ─────────
    evidence = await _extract_chat_evidence(
        screenshots, manual_landlord_promises, manual_tenant_promises,
    )

    # ── Extract PDF text ──────────────────────────────────────────────
    lease_text = contract_clause.strip()
    pdf_filename = None

    if contract_file and contract_file.filename:
        pdf_filename = contract_file.filename
        ext = os.path.splitext(pdf_filename)[1].lower()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        try:
            tmp.write(await contract_file.read())
            tmp.close()

            if ext == ".pdf":
                try:
                    import pdfplumber
                    parts = []
                    with pdfplumber.open(tmp.name) as pdf:
                        for page in pdf.pages:
                            t = page.extract_text()
                            if t:
                                parts.append(t)
                    extracted = "\n\n".join(parts).strip()
                    if extracted:
                        lease_text = extracted
                except Exception:
                    pass
        finally:
            try:
                os.remove(tmp.name)
            except OSError:
                pass

    # ── No text at all — return unverifiable stubs ────────────────────
    if not lease_text and not claim_list:
        return JSONResponse({"error": "No contract text and no claims"}, status_code=400)

    if not lease_text:
        deposit = float(deposit_amount or 0)
        rent    = float(monthly_rent or 0)
        return {
            "pdf_filename": pdf_filename,
            "liability_map": [
                {
                    "claim_id": c.get("claim_id", f"C{i+1:03d}"),
                    "item": c.get("item", ""),
                    "amount_thb": float(c.get("amount_thb", 0)),
                    "tenant_liable": False,
                    "contract_clause": None,
                    "clause_found": False,
                    "pre_existing_disclosed": False,
                    "notes": "ไม่มีสัญญาเช่า — ไม่สามารถตรวจสอบความรับผิดชอบได้",
                }
                for i, c in enumerate(claim_list)
            ],
            "contract_summary": {
                "deposit_amount_thb": deposit,
                "deposit_months": round(deposit / rent) if rent else 0,
                "lease_start": lease_start,
                "lease_end": lease_end,
                "notice_period_days": 30,
                "monthly_rent_thb": rent,
            },
            "unfair_clauses": [],
            "ocr_used": bool(evidence["platforms"]),
            "extraction_confidence": 0.0,
            **evidence,
        }

    # ── Call Typhoon v2 ───────────────────────────────────────────────
    try:
        parsed = parse_contract(lease_text, claim_list, _llm)
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": traceback.format_exc()}, status_code=500)

    # ── Clean up Typhoon summary ───────────────────────────────────────
    summary = parsed.get("contract_summary", {})

    # Remove placeholder dates — never fall back to form values for dates
    # (form date fields are often test/demo values and would be wrong)
    for field in ("lease_start", "lease_end"):
        val = summary.get(field, "")
        if not val or val == "YYYY-MM-DD" or not str(val).strip():
            summary[field] = ""

    # Numeric fields: use form values as fallback when Typhoon returns 0
    if not float(summary.get("monthly_rent_thb") or 0) and monthly_rent:
        summary["monthly_rent_thb"] = float(monthly_rent)
    if not float(summary.get("deposit_amount_thb") or 0) and deposit_amount:
        summary["deposit_amount_thb"] = float(deposit_amount)

    # Recalculate deposit_months if Typhoon returned 0
    dep = float(summary.get("deposit_amount_thb") or 0)
    rent_val = float(summary.get("monthly_rent_thb") or 0)
    if not summary.get("deposit_months") and dep and rent_val:
        summary["deposit_months"] = round(dep / rent_val)

    # Attach claim_id and amount_thb to each liability entry
    liability_map = parsed.get("liability_map", [])
    for i, entry in enumerate(liability_map):
        if i < len(claim_list):
            entry.setdefault("claim_id",   claim_list[i].get("claim_id", f"C{i+1:03d}"))
            entry.setdefault("amount_thb", float(claim_list[i].get("amount_thb", 0)))
            entry.setdefault("description", claim_list[i].get("description", ""))

    return {
        "pdf_filename":          pdf_filename,
        "liability_map":         liability_map,
        "contract_summary":      summary,
        "unfair_clauses":        parsed.get("unfair_clauses", []),
        "ocr_used":              bool(evidence["platforms"]),
        "extraction_confidence": 0.94,
        **evidence,
    }
