# RoomWitness Demo Portal — real agents behind our animated step-by-step UI

import os
import sys
import json
import tempfile
import time
import traceback
import uuid

# Make roomwitness-rag/ and legacy/ importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "legacy"))

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

load_dotenv()

app = Flask(__name__)

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
COLLECTION_NAME = "thai_rental_law"


def _corpus_loaded() -> bool:
    try:
        chroma = chromadb.PersistentClient(path=CHROMA_PATH)
        col = chroma.get_or_create_collection(
            COLLECTION_NAME, embedding_function=DefaultEmbeddingFunction()
        )
        return col.count() > 0
    except Exception:
        return False


# ── Pages ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "corpus_loaded": _corpus_loaded()})


@app.route("/extract-contract", methods=["POST"])
def extract_contract():
    """Extract text from uploaded contract PDF or image."""
    contract_file = request.files.get("contract_file")
    if not contract_file:
        return jsonify({"error": "No file uploaded."}), 400
    ext = os.path.splitext(contract_file.filename or "")[1].lower()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        contract_file.save(tmp.name)
        if ext == ".pdf":
            try:
                import pdfplumber
                parts = []
                with pdfplumber.open(tmp.name) as pdf:
                    for page in pdf.pages:
                        t = page.extract_text()
                        if t: parts.append(t)
                text = "\n\n".join(parts).strip()
                if not text:
                    return jsonify({"error": "Could not extract text from PDF. Try pasting the clause manually."}), 422
            except ImportError:
                return jsonify({"error": "pdfplumber not installed. Run: pip install pdfplumber"}), 500
        elif ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp"):
            import subprocess
            result = subprocess.run(
                ["tesseract", tmp.name, "stdout", "-l", "tha+eng", "--psm", "6"],
                capture_output=True, text=True,
            )
            text = result.stdout.strip()
            if not text:
                return jsonify({"error": "OCR returned no text. Check image quality."}), 422
        else:
            return jsonify({"error": f"Unsupported file type: {ext}"}), 400
        return jsonify({"text": text})
    except Exception:
        traceback.print_exc()
        return jsonify({"error": traceback.format_exc()}), 500
    finally:
        try: os.remove(tmp.name)
        except OSError: pass


# ── Agent 01 — Real Groq CV ────────────────────────────────────────────────────

@app.route("/run/agent01", methods=["POST"])
def run_agent01():
    """
    Real Agent 01: compare move-in vs move-out photos with Groq Llama-4-Scout.
    Accepts multipart/form-data with move_in, move_out image files + claims JSON.
    """
    from agent01_cv import run_cv_assessment

    move_in_file  = request.files.get("move_in")
    move_out_file = request.files.get("move_out")
    claims_raw    = request.form.get("claims", "[]")

    try:
        claims = json.loads(claims_raw)
    except (ValueError, TypeError):
        claims = []

    if not claims:
        return jsonify({"error": "No claims provided"}), 400

    # If no photos — return unverifiable results for each claim
    if not move_in_file or not move_out_file:
        return jsonify({
            "damage_map": [
                {
                    "claim_id": c.get("claim_id", f"C{i+1:03d}"),
                    "item": c.get("item", ""),
                    "verdict": None,
                    "confidence": 0.0,
                    "move_in_condition": "No photo uploaded",
                    "move_out_condition": "No photo uploaded",
                    "status": "unverifiable_by_cv",
                    "supports_landlord_claim": "PARTIAL",
                    "wear_and_tear": False,
                    "notes": "No photos provided — legal reasoning will use contract and law only.",
                }
                for i, c in enumerate(claims)
            ],
            "model_used": "skipped",
        })

    tmp_dir = tempfile.mkdtemp()
    in_path  = os.path.join(tmp_dir, f"in_{uuid.uuid4().hex}.jpg")
    out_path = os.path.join(tmp_dir, f"out_{uuid.uuid4().hex}.jpg")

    try:
        move_in_file.save(in_path)
        move_out_file.save(out_path)

        raw = run_cv_assessment(
            move_in_paths=[in_path],
            move_out_paths=[out_path],
            landlord_claims=claims,
        )

        # Map Groq output → CVResult schema (bridge)
        damage_map = []
        for i, (claim, assessment) in enumerate(zip(claims, raw.get("claim_assessments", []))):
            confidence = float(assessment.get("confidence", 0.0))
            change     = assessment.get("change_detected")
            wear       = assessment.get("wear_and_tear")
            tenant     = assessment.get("likely_tenant_caused")
            supports   = assessment.get("supports_landlord_claim", "PARTIAL")

            if confidence < 0.30 or (assessment.get("low_visibility") and confidence < 0.60):
                verdict = None
                status  = "unverifiable_by_cv"
            elif not change:
                verdict = "UNCHANGED"
                status  = "ok"
            elif wear:
                verdict = "NORMAL_WEAR"
                status  = "ok"
            elif change and tenant is False:
                verdict = "PRE_EXISTING"
                status  = "ok"
            elif change and tenant is True:
                verdict = "NEW_DAMAGE"
                status  = "ok"
            else:
                verdict = None
                status  = "ok"

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

        return jsonify({"damage_map": damage_map, "model_used": raw.get("model_used", "")})

    except Exception:
        traceback.print_exc()
        return jsonify({"error": traceback.format_exc()}), 500
    finally:
        for p in [in_path, out_path]:
            try: os.remove(p)
            except OSError: pass


# ── Agent 02 — Contract (mock with real form data) ─────────────────────────────

@app.route("/run/agent02", methods=["POST"])
def run_agent02():
    """
    Agent 02: extract contract text from uploaded PDF (pdfplumber) and build
    liability map. Falls back to form field values when no PDF is provided.
    """
    contract_file = request.files.get("contract_file")
    claims_raw    = request.form.get("claims", "[]")
    lease_start   = request.form.get("lease_start", "")
    lease_end     = request.form.get("lease_end", "")
    deposit       = float(request.form.get("deposit_amount") or 18000)
    rent          = float(request.form.get("monthly_rent") or 9000)
    clause_text   = request.form.get("contract_clause", "").strip()

    try:
        claims = json.loads(claims_raw)
    except (ValueError, TypeError):
        claims = []

    pdf_filename = None

    # Try to extract text from uploaded contract
    if contract_file and contract_file.filename:
        pdf_filename = contract_file.filename
        ext = os.path.splitext(pdf_filename)[1].lower()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        try:
            contract_file.save(tmp.name)
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
                    if extracted and not clause_text:
                        clause_text = extracted[:500]  # first 500 chars as context
                except Exception:
                    pass
        finally:
            try: os.remove(tmp.name)
            except OSError: pass

    # Detect void clause keywords in Thai
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
    for i, claim in enumerate(claims):
        base = dict(liability_pool[i % len(liability_pool)])
        base.update({
            "claim_id":   claim.get("claim_id", f"C{i+1:03d}"),
            "item":       claim.get("item", ""),
            "amount_thb": float(claim.get("amount_thb", 0)),
            "pre_existing_disclosed": False,
        })
        liability_map.append(base)

    deposit_months = round(deposit / rent) if rent else 2

    return jsonify({
        "pdf_filename": pdf_filename,
        "liability_map": liability_map,
        "contract_summary": {
            "deposit_amount_thb": deposit,
            "deposit_months": deposit_months,
            "lease_start": lease_start,
            "lease_end":   lease_end,
            "notice_period_days": 30,
            "monthly_rent_thb": rent,
        },
        "unfair_clauses": unfair_clauses,
        "ocr_used": False,
        "extraction_confidence": 0.94,
    })


# ── Agent 03 — Real Groq + ChromaDB RAG ───────────────────────────────────────

@app.route("/run/agent03", methods=["POST"])
def run_agent03():
    """
    Real Agent 03: classify each claim using Groq LLM + ChromaDB RAG.
    """
    from rag_agent import classify_claim

    data          = request.get_json(silent=True) or {}
    claims        = data.get("claims", [])
    damage_map    = data.get("damage_map", [])
    contract_clause = data.get("contract_clause", "")
    landlord_unit_count = int(data.get("landlord_unit_count", 0))

    if not claims:
        return jsonify({"error": "No claims"}), 400

    cv_by_id = {r.get("claim_id"): r for r in damage_map}

    verdicts = []
    total_claimed  = 0.0
    total_unlawful = 0.0

    VERDICT_MAP = {
        "LAWFUL":   "LAWFUL",
        "DISPUTED": "DISPUTED",
        "UNLAWFUL": "UNLAWFUL",
    }

    for claim in claims:
        amt = float(claim.get("amount_thb", 0))
        total_claimed += amt
        cv = cv_by_id.get(claim.get("claim_id"), {})

        cv_evidence = {
            "item_matched":         True,
            "move_in_condition":    cv.get("move_in_condition", ""),
            "move_out_condition":   cv.get("move_out_condition", ""),
            "change_detected":      cv.get("verdict") not in (None, "UNCHANGED"),
            "likely_tenant_caused": cv.get("verdict") == "NEW_DAMAGE",
            "confidence":           float(cv.get("confidence", 0.5)),
            "notes":                cv.get("notes", ""),
            "wear_and_tear":        cv.get("verdict") == "NORMAL_WEAR",
            "wear_and_tear_reason": cv.get("wear_and_tear_reason", ""),
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

        verdict = VERDICT_MAP.get(result.get("classification", "DISPUTED"), "DISPUTED")

        # Hard rules — CV verdict overrides LLM when evidence is clear
        cv_verdict = cv.get("verdict")
        has_void_clause = bool(data.get("has_void_clause", False))

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
            # Contract clause to charge for this damage is void under OCPB 2568
            # Landlord must use CCC §562 instead — requires proof of tenant fault
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
            "citations":  [f"{b.get('source','')} {b.get('section','')}".strip()
                           for b in result.get("legal_basis", [])],
            "recommended_action_th": "ปฏิเสธการชำระและอ้างกฎหมายที่ระบุ" if verdict == "UNLAWFUL" else "ขอหลักฐานเพิ่มเติมก่อนพิจารณา",
            "claim_validity_pct": int((1 - float(result.get("dispute_amount", 0)) / amt) * 100) if amt else 0,
            "dimensions": result.get("dimensions", {}),
            "confidence": float(result.get("confidence", 0)),
        })

    # Routing
    if landlord_unit_count >= 3:
        routing = "OCPB"
        docs = ["ocpb_complaint", "demand_letter", "evidence_summary"]
    elif landlord_unit_count in (1, 2):
        routing = "CIVIL"
        docs = ["demand_letter", "evidence_summary"]
    else:
        routing = "BOTH"
        docs = ["ocpb_complaint", "demand_letter", "evidence_summary"]

    pct = round(total_unlawful / total_claimed * 100) if total_claimed else 0
    case_summary_th = (
        f"ผู้เช่าถูกเรียกร้องค่าเสียหายรวม {total_claimed:,.0f} บาท "
        f"โดยพบว่า {total_unlawful:,.0f} บาท ({pct}%) ไม่ชอบด้วยกฎหมาย "
        f"แนะนำให้ดำเนินการตามเส้นทาง {routing}"
    )

    return jsonify({
        "routing": routing,
        "documents_to_generate": docs,
        "total_claimed_thb":  total_claimed,
        "total_unlawful_thb": total_unlawful,
        "verdicts": verdicts,
        "case_summary_th": case_summary_th,
        "case_summary_en": f"Tenant faces {total_claimed:,.0f} THB in claims, {total_unlawful:,.0f} THB ({pct}%) unlawful under OCPB 2568 and CCC §537-571.",
    })


# ── Agent 04 — Mock (Typhoon not yet configured) ───────────────────────────────

@app.route("/run/agent04", methods=["POST"])
def run_agent04():
    """Agent 04 mock — document generation (Typhoon v2 not yet configured)."""
    data = request.get_json(silent=True) or {}
    docs = data.get("documents_to_generate", ["demand_letter", "evidence_summary"])
    total = float(data.get("total_unlawful_thb", 0))

    doc_info = {
        "ocpb_complaint":   {"doc_type": "หนังสือร้องเรียน สคบ.",     "pages": 3},
        "demand_letter":    {"doc_type": "หนังสือเรียกร้องคืนเงิน",   "pages": 2},
        "evidence_summary": {"doc_type": "สรุปหลักฐานและผลวินิจฉัย", "pages": 4},
    }
    time.sleep(1.5)

    return jsonify({
        "documents": {k: {**doc_info[k], "status": "generated"} for k in docs if k in doc_info},
        "generation_time_seconds": 8.4,
        "total_unlawful_amount_thb": total,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
