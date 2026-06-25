"""
Agent 04 bridge service — accepts JSON body from Express/Next.js.
Document generation (mock — Typhoon v2 + AWS S3 not yet configured).

Run from roomwitness-rag/:
    uvicorn services.agent04_service:app --port 8004 --reload
"""

import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RoomWitness Agent 04 — Document Generator Bridge Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DOC_INFO = {
    "ocpb_complaint":   {"doc_type": "หนังสือร้องเรียน สคบ.",     "pages": 3},
    "demand_letter":    {"doc_type": "หนังสือเรียกร้องคืนเงิน",   "pages": 2},
    "evidence_summary": {"doc_type": "สรุปหลักฐานและผลวินิจฉัย", "pages": 4},
}


@app.get("/health")
def health():
    return {"status": "ok", "agent": "04"}


@app.post("/api/v1/agent04")
async def run_agent04(request: Request):
    data  = await request.json()
    docs  = data.get("documents_to_generate", ["demand_letter", "evidence_summary"])
    total = float(data.get("total_unlawful_thb", 0))

    await asyncio.sleep(1.5)  # simulate generation time

    return {
        "documents": {
            k: {**DOC_INFO[k], "status": "generated"}
            for k in docs
            if k in DOC_INFO
        },
        "generation_time_seconds": 8.4,
        "total_unlawful_amount_thb": total,
    }
