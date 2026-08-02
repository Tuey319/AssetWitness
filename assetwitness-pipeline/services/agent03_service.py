"""
Agent 03 bridge service — Asset Policy Reasoning via Typhoon v2 + ChromaDB RAG.

Run from assetwitness-pipeline/:
    python -m uvicorn services.agent03_service:app --port 8003 --reload
"""

import json
import logging
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser

# Make assetwitness-pipeline/ importable as a package root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent03_asset_policy_reasoning.retriever import (
    build_rag_query,
    format_chunks_for_prompt,
    get_chroma_client,
    get_collection,
    retrieve_chunks,
)
from agent03_asset_policy_reasoning.reasoner import apply_hard_rules, reason_item
from agent03_asset_policy_reasoning.prompts import SUMMARY_PROMPT
from agent03_asset_policy_reasoning.document_selector import select_documents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AssetWitness Agent 03 — Asset Policy Reasoning Bridge Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY")
TYPHOON_BASE_URL = os.getenv("TYPHOON_BASE_URL", "https://api.opentyphoon.ai/v1")
TYPHOON_MODEL = os.getenv("TYPHOON_MODEL", "typhoon-v2-70b-instruct")


def _get_llm() -> ChatOpenAI | None:
    if not TYPHOON_API_KEY:
        logger.warning("TYPHOON_API_KEY not set — verdicts will use fallback text")
        return None
    return ChatOpenAI(
        api_key=TYPHOON_API_KEY,
        base_url=TYPHOON_BASE_URL,
        model=TYPHOON_MODEL,
        temperature=0.1,
    )


@app.get("/health")
def health():
    corpus_ready = False
    try:
        col = get_collection(get_chroma_client())
        corpus_ready = col.count() > 0
    except Exception:
        pass
    return {"status": "ok", "agent": "03", "corpus_ready": corpus_ready}


@app.post("/api/v1/agent03")
async def run_agent03(request: Request):
    data = await request.json()

    condition_items: list = data.get("condition_items", [])
    condition_map: list = data.get("condition_map", [])
    agreement_clause: str = data.get("agreement_clause", "")
    case_type: str = data.get("case_type", "move_out")
    handover_report_signed: bool = bool(data.get("handover_report_signed", False))

    if not condition_items:
        return JSONResponse({"error": "No condition_items"}, status_code=400)

    llm = _get_llm()
    cv_by_id = {r.get("item_id"): r for r in condition_map}

    item_verdicts: list[dict] = []
    total_estimated_cost = 0.0
    total_dad_responsibility = 0.0
    total_occupant_responsibility = 0.0

    for item in condition_items:
        cost = float(item.get("estimated_cost_thb", 0))
        total_estimated_cost += cost
        cv = cv_by_id.get(item.get("item_id"), {})

        cv_verdict = cv.get("verdict")
        cv_confidence = float(cv.get("confidence", 0.5))

        if cv.get("status") == "unverifiable_by_cv":
            cv_verdict = "unverifiable_by_cv"
            cv_confidence = 0.0

        # Apply deterministic hard rules first
        forced = apply_hard_rules(
            cv_verdict=cv_verdict,
            cv_confidence=cv_confidence,
            handover_report_signed=handover_report_signed,
        )

        # RAG retrieval over the asset policy corpus
        query = build_rag_query(
            item.get("item", ""),
            item.get("description", ""),
            cv_verdict,
        )
        try:
            chunks = retrieve_chunks(query, top_k=3)
        except Exception as exc:
            logger.warning("ChromaDB retrieval failed for '%s': %s", item.get("item"), exc)
            chunks = []
        formatted = format_chunks_for_prompt(chunks)

        # LLM reasoning
        if llm:
            try:
                raw = reason_item(
                    item=item.get("item", ""),
                    description=item.get("description", ""),
                    estimated_cost_thb=cost,
                    cv_verdict=cv_verdict,
                    cv_confidence=cv_confidence,
                    agreement_liable=False,
                    handover_report_signed=handover_report_signed,
                    formatted_chunks=formatted,
                    forced_responsibility=forced,
                    llm=llm,
                )
            except Exception as exc:
                logger.warning("reason_item failed for '%s': %s", item.get("item"), exc)
                raw = {
                    "responsibility": forced or "DISPUTED",
                    "reasoning_th": "ไม่สามารถวิเคราะห์ได้",
                    "reasoning_en": "Analysis failed",
                    "citations": [],
                    "recommended_action_th": "ขอคำแนะนำจากผู้เชี่ยวชาญ",
                    "responsibility_confidence_pct": 0,
                }
        else:
            raw = {
                "responsibility": forced or "DISPUTED",
                "reasoning_th": "ไม่สามารถวิเคราะห์ได้ (TYPHOON_API_KEY not configured)",
                "reasoning_en": "Analysis unavailable — Typhoon API key not set",
                "citations": [],
                "recommended_action_th": "กรุณาตั้งค่า TYPHOON_API_KEY ใน .env",
                "responsibility_confidence_pct": 0,
            }

        responsibility = raw.get("responsibility", "DISPUTED")
        if responsibility == "DAD_RESPONSIBILITY":
            total_dad_responsibility += cost
        elif responsibility == "OCCUPANT_RESPONSIBILITY":
            total_occupant_responsibility += cost

        item_verdicts.append({
            "item_id": item.get("item_id"),
            "item": item.get("item"),
            "estimated_cost_thb": cost,
            "responsibility": responsibility,
            "reasoning_th": raw.get("reasoning_th", ""),
            "reasoning_en": raw.get("reasoning_en", ""),
            "citations": raw.get("citations", []),
            "recommended_action_th": raw.get("recommended_action_th", ""),
            "responsibility_confidence_pct": int(raw.get("responsibility_confidence_pct", 0)),
        })

    needs_dispute_resolution = any(v["responsibility"] == "DISPUTED" for v in item_verdicts)
    selection = select_documents(case_type, needs_dispute_resolution)

    # Generate handover summary
    case_summary_th = ""
    case_summary_en = ""

    if llm:
        try:
            summary_chain = SUMMARY_PROMPT | llm | JsonOutputParser()
            summary = summary_chain.invoke({
                "verdicts_json": json.dumps(item_verdicts, ensure_ascii=False),
                "total_estimated_cost_thb": total_estimated_cost,
                "total_dad_responsibility_thb": total_dad_responsibility,
                "total_occupant_responsibility_thb": total_occupant_responsibility,
                "needs_dispute_resolution": "ใช่" if needs_dispute_resolution else "ไม่ใช่",
            })
            case_summary_th = summary.get("case_summary_th", "")
            case_summary_en = summary.get("case_summary_en", "")
        except Exception as exc:
            logger.warning("Summary generation failed: %s", exc)

    if not case_summary_th:
        case_summary_th = (
            f"มูลค่าประเมินรวม {total_estimated_cost:,.0f} บาท "
            f"ธพส. รับผิดชอบ {total_dad_responsibility:,.0f} บาท "
            f"ผู้ครอบครองรับผิดชอบ {total_occupant_responsibility:,.0f} บาท"
        )
    if not case_summary_en:
        case_summary_en = (
            f"Total estimated cost {total_estimated_cost:,.0f} THB; "
            f"DAD responsibility {total_dad_responsibility:,.0f} THB; "
            f"occupant responsibility {total_occupant_responsibility:,.0f} THB."
        )

    return {
        "needs_dispute_resolution": needs_dispute_resolution,
        "documents_to_generate": selection["documents_to_generate"],
        "total_estimated_cost_thb": total_estimated_cost,
        "total_dad_responsibility_thb": total_dad_responsibility,
        "total_occupant_responsibility_thb": total_occupant_responsibility,
        "item_verdicts": item_verdicts,
        "case_summary_th": case_summary_th,
        "case_summary_en": case_summary_en,
    }
