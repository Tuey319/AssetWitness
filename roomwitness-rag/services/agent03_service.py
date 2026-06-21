"""
Agent 03 bridge service — accepts JSON body from Express/Next.js.
Legal reasoning via Groq + ChromaDB RAG (real implementation).

Run from roomwitness-rag/:
    uvicorn services.agent03_service:app --port 8003 --reload
"""

import os
import sys
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# legacy/ contains rag_agent.py
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "legacy"))

app = FastAPI(title="RoomWitness Agent 03 — Legal Reasoning Bridge Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    corpus_ready = False
    try:
        from rag_agent import _get_collection
        col = _get_collection()
        corpus_ready = col.count() > 0
    except Exception:
        pass
    return {"status": "ok", "agent": "03", "corpus_ready": corpus_ready}


@app.post("/api/v1/agent03")
async def run_agent03(request: Request):
    data = await request.json()

    claims              = data.get("claims", [])
    damage_map          = data.get("damage_map", [])
    contract_clause     = data.get("contract_clause", "")
    landlord_unit_count = int(data.get("landlord_unit_count", 0))
    has_void_clause     = bool(data.get("has_void_clause", False))

    if not claims:
        return JSONResponse({"error": "No claims"}, status_code=400)

    try:
        from rag_agent import classify_claim
    except ImportError as e:
        return JSONResponse({"error": f"rag_agent import failed: {e}"}, status_code=500)

    cv_by_id = {r.get("claim_id"): r for r in damage_map}
    VERDICT_MAP = {"LAWFUL": "LAWFUL", "DISPUTED": "DISPUTED", "UNLAWFUL": "UNLAWFUL"}

    verdicts       = []
    total_claimed  = 0.0
    total_unlawful = 0.0

    for claim in claims:
        amt = float(claim.get("amount_thb", 0))
        total_claimed += amt
        cv = cv_by_id.get(claim.get("claim_id"), {})

        cv_evidence = {
            "item_matched":           True,
            "move_in_condition":      cv.get("move_in_condition", ""),
            "move_out_condition":     cv.get("move_out_condition", ""),
            "change_detected":        cv.get("verdict") not in (None, "UNCHANGED"),
            "likely_tenant_caused":   cv.get("verdict") == "NEW_DAMAGE",
            "confidence":             float(cv.get("confidence", 0.5)),
            "notes":                  cv.get("notes", ""),
            "wear_and_tear":          cv.get("verdict") == "NORMAL_WEAR",
            "wear_and_tear_reason":   cv.get("wear_and_tear_reason", ""),
            "supports_landlord_claim": cv.get("supports_landlord_claim", "PARTIAL"),
        }

        try:
            result = classify_claim(claim, cv_evidence, contract_clause)
        except Exception:
            traceback.print_exc()
            result = {
                "classification": "DISPUTED",
                "confidence": 0.0,
                "dispute_amount": amt,
                "dimensions": {},
                "legal_basis": [],
                "summary_th": "ไม่สามารถวิเคราะห์ได้",
                "retrieved_sections": [],
            }

        verdict   = VERDICT_MAP.get(result.get("classification", "DISPUTED"), "DISPUTED")
        cv_verdict = cv.get("verdict")

        if cv_verdict in ("NORMAL_WEAR", "PRE_EXISTING", "UNCHANGED"):
            verdict = "UNLAWFUL"
            result["summary_th"] = (
                result.get("summary_th", "") +
                " (ยืนยันโดยผลการตรวจสอบภาพ: " + {
                    "NORMAL_WEAR":  "เสื่อมสภาพตามปกติ — ไม่ชอบด้วยกฎหมายตามประกาศ สคบ. 2568",
                    "PRE_EXISTING": "ความเสียหายมีอยู่ก่อนเข้าอยู่ — เรียกร้องไม่ได้",
                    "UNCHANGED":    "สภาพไม่เปลี่ยนแปลง — ไม่มีความเสียหาย",
                }[cv_verdict] + ")"
            )
        elif cv_verdict == "NEW_DAMAGE" and has_void_clause and verdict == "LAWFUL":
            verdict = "DISPUTED"
            result["summary_th"] = (
                "ข้อสัญญาที่ใช้เรียกร้องค่าเสียหายถูกตัดสินว่าเป็นโมฆะตามประกาศ สคบ. 2568 "
                "เจ้าของบ้านต้องพิสูจน์ความผิดของผู้เช่าตาม ป.พ.พ. มาตรา 562 แทน"
            )

        if verdict == "UNLAWFUL":
            total_unlawful += amt

        verdicts.append({
            "claim_id":   claim.get("claim_id"),
            "item":       claim.get("item"),
            "amount_thb": amt,
            "verdict":    verdict,
            "reasoning_th": result.get("summary_th", ""),
            "reasoning_en": "",
            "citations":  [
                f"{b.get('source','')} {b.get('section','')}".strip()
                for b in result.get("legal_basis", [])
            ],
            "recommended_action_th": (
                "ปฏิเสธการชำระและอ้างกฎหมายที่ระบุ"
                if verdict == "UNLAWFUL"
                else "ขอหลักฐานเพิ่มเติมก่อนพิจารณา"
            ),
            "claim_validity_pct": int((1 - float(result.get("dispute_amount", 0)) / amt) * 100) if amt else 0,
            "dimensions":  result.get("dimensions", {}),
            "confidence":  float(result.get("confidence", 0)),
        })

    if landlord_unit_count >= 3:
        routing = "OCPB"
        docs    = ["ocpb_complaint", "demand_letter", "evidence_summary"]
    elif landlord_unit_count in (1, 2):
        routing = "CIVIL"
        docs    = ["demand_letter", "evidence_summary"]
    else:
        routing = "BOTH"
        docs    = ["ocpb_complaint", "demand_letter", "evidence_summary"]

    pct = round(total_unlawful / total_claimed * 100) if total_claimed else 0

    return {
        "routing":                routing,
        "documents_to_generate":  docs,
        "total_claimed_thb":      total_claimed,
        "total_unlawful_thb":     total_unlawful,
        "verdicts":               verdicts,
        "case_summary_th": (
            f"ผู้เช่าถูกเรียกร้องค่าเสียหายรวม {total_claimed:,.0f} บาท "
            f"โดยพบว่า {total_unlawful:,.0f} บาท ({pct}%) ไม่ชอบด้วยกฎหมาย "
            f"แนะนำให้ดำเนินการตามเส้นทาง {routing}"
        ),
        "case_summary_en": (
            f"Tenant faces {total_claimed:,.0f} THB in claims, "
            f"{total_unlawful:,.0f} THB ({pct}%) unlawful under OCPB 2568 and CCC §537-571."
        ),
    }
