"""
Agent 02 bridge service — accepts multipart form data from Express/Next.js.
Contract parsing (mock — Typhoon v2 not yet configured).

Run from roomwitness-rag/:
    uvicorn services.agent02_service:app --port 8002 --reload
"""

import json
import os
import tempfile
import traceback
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="RoomWitness Agent 02 — Contract Parser Bridge Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "agent": "02"}


@app.post("/api/v1/agent02")
async def run_agent02(
    contract_file:   Optional[UploadFile] = File(None),
    claims:          str = Form("[]"),
    contract_clause: str = Form(""),
    lease_start:     str = Form(""),
    lease_end:       str = Form(""),
    deposit_amount:  str = Form("18000"),
    monthly_rent:    str = Form("9000"),
):
    try:
        claim_list = json.loads(claims)
    except (ValueError, TypeError):
        claim_list = []

    deposit = float(deposit_amount or 18000)
    rent    = float(monthly_rent or 9000)
    clause_text = contract_clause.strip()
    pdf_filename = None

    if contract_file and contract_file.filename:
        pdf_filename = contract_file.filename
        ext = os.path.splitext(pdf_filename)[1].lower()
        if ext == ".pdf":
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            try:
                tmp.write(await contract_file.read())
                tmp.close()
                try:
                    import pdfplumber
                    parts = []
                    with pdfplumber.open(tmp.name) as pdf:
                        for page in pdf.pages:
                            t = page.extract_text()
                            if t:
                                parts.append(t)
                    extracted = "\n\n".join(parts).strip()
                    if extracted and not clause_text:
                        clause_text = extracted[:500]
                except Exception:
                    pass
            finally:
                try: os.remove(tmp.name)
                except OSError: pass

    void_keywords = ["ทาสี", "ซ่อม", "คืนสภาพเดิม", "ค่าเสื่อม", "หักค่า"]
    unfair_clauses = []
    if clause_text and any(k in clause_text for k in void_keywords):
        unfair_clauses.append({
            "clause_text": clause_text[:100],
            "reason_void": "ขัดต่อประกาศ สคบ. 2568 ห้ามเรียกค่าซ่อมแซมความเสื่อมสภาพตามปกติ",
        })

    liability_pool = [
        {"tenant_liable": False, "clause_found": False,
         "notes": "สัญญาไม่ได้ระบุให้ผู้เช่ารับผิดชอบความเสื่อมสภาพตามปกติ"},
        {"tenant_liable": True,  "clause_found": bool(clause_text),
         "contract_clause": clause_text[:80] if clause_text else "",
         "notes": "สัญญาระบุความรับผิดชอบผู้เช่า แต่ต้องมีหลักฐานความเสียหายจริง"},
        {"tenant_liable": False, "clause_found": False,
         "notes": "ไม่มีรายงานสภาพทรัพย์สิน ณ วันเข้าอยู่ที่ระบุสภาพรายการนี้"},
    ]

    liability_map = []
    for i, claim in enumerate(claim_list):
        base = dict(liability_pool[i % len(liability_pool)])
        base.update({
            "claim_id":   claim.get("claim_id", f"C{i+1:03d}"),
            "item":       claim.get("item", ""),
            "amount_thb": float(claim.get("amount_thb", 0)),
            "pre_existing_disclosed": False,
        })
        liability_map.append(base)

    deposit_months = round(deposit / rent) if rent else 2

    return {
        "pdf_filename": pdf_filename,
        "liability_map": liability_map,
        "contract_summary": {
            "deposit_amount_thb": deposit,
            "deposit_months":     deposit_months,
            "lease_start":        lease_start,
            "lease_end":          lease_end,
            "notice_period_days": 30,
            "monthly_rent_thb":   rent,
        },
        "unfair_clauses":        unfair_clauses,
        "ocr_used":              False,
        "extraction_confidence": 0.94,
    }
