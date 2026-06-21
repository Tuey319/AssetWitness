"""
RoomWitness — Mock Demo Portal
Simulates the full 4-agent pipeline with pre-baked Thai rental dispute data.
Run: python portal/app.py
"""

import time
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# ── Mock case data ─────────────────────────────────────────────────────────────

MOCK_CASE = {
    "case_id": "DEMO-2568-001",
    "tenant": {"name_th": "นายสมชาย ใจดี", "name_en": "Somchai Jaidee"},
    "landlord": {"name_th": "นางสาวพิมพ์ใจ มีทรัพย์", "unit_count": 5},
    "property": "ห้อง 304 อาคารสุขุมวิทเรสซิเดนซ์ ซอยสุขุมวิท 11 กรุงเทพฯ 10110",
    "lease": {"start": "1 ม.ค. 2567", "end": "31 ธ.ค. 2567", "deposit_thb": 18000, "rent_thb": 9000},
    "claims": [
        {"claim_id": "C001", "item": "สีผนังห้องนอน", "amount_thb": 8000,
         "description": "ผนังห้องนอนมีรอยเปื้อนและรอยขีดข่วนทั่วบริเวณ"},
        {"claim_id": "C002", "item": "แอร์คอนดิชัน", "amount_thb": 5500,
         "description": "แอร์ไม่เย็น ต้องล้างและเติมน้ำยา"},
        {"claim_id": "C003", "item": "กระเบื้องห้องน้ำ", "amount_thb": 3200,
         "description": "กระเบื้องห้องน้ำแตกร้าว 2 แผ่น"},
    ],
}

# ── Mock Agent 01 output ───────────────────────────────────────────────────────

MOCK_AGENT01 = {
    "damage_map": [
        {
            "claim_id": "C001",
            "verdict": "NORMAL_WEAR",
            "confidence": 0.82,
            "move_in_condition": "ผนังสะอาด มีสีครีมสม่ำเสมอ",
            "move_out_condition": "มีรอยเปื้อนเล็กน้อยตามปกติจากการอยู่อาศัย 1 ปี",
            "status": "ok",
        },
        {
            "claim_id": "C002",
            "verdict": None,
            "confidence": 0.45,
            "move_in_condition": "แอร์ทำงานปกติ",
            "move_out_condition": "ไม่สามารถตรวจสอบสภาพแอร์ได้จากภาพ",
            "status": "unverifiable_by_cv",
        },
        {
            "claim_id": "C003",
            "verdict": "PRE_EXISTING",
            "confidence": 0.91,
            "move_in_condition": "กระเบื้องมีรอยร้าวอยู่แล้วตั้งแต่วันเข้าอยู่",
            "move_out_condition": "รอยร้าวเดิม ไม่มีการเปลี่ยนแปลง",
            "status": "ok",
        },
    ],
    "model_used": "meta-llama/llama-4-scout-17b-16e-instruct",
}

# ── Mock Agent 02 output ───────────────────────────────────────────────────────

MOCK_AGENT02 = {
    "liability_map": [
        {
            "claim_id": "C001", "item": "สีผนังห้องนอน", "amount_thb": 8000,
            "tenant_liable": False, "clause_found": False,
            "pre_existing_disclosed": False,
            "notes": "สัญญาไม่ได้ระบุให้ผู้เช่ารับผิดชอบความเสื่อมสภาพตามปกติ",
        },
        {
            "claim_id": "C002", "item": "แอร์คอนดิชัน", "amount_thb": 5500,
            "tenant_liable": True, "clause_found": True,
            "contract_clause": "ผู้เช่าต้องดูแลอุปกรณ์ไฟฟ้าในสภาพดี",
            "pre_existing_disclosed": False,
            "notes": "สัญญาระบุให้ผู้เช่าดูแลอุปกรณ์ไฟฟ้า แต่การล้างแอร์เป็นค่าบำรุงรักษาตามปกติ",
        },
        {
            "claim_id": "C003", "item": "กระเบื้องห้องน้ำ", "amount_thb": 3200,
            "tenant_liable": False, "clause_found": False,
            "pre_existing_disclosed": False,
            "notes": "ไม่มีรายงานสภาพทรัพย์สิน ณ วันเข้าอยู่ที่ระบุสภาพกระเบื้อง",
        },
    ],
    "contract_summary": {
        "deposit_amount_thb": 18000, "deposit_months": 2,
        "lease_start": "2024-01-01", "lease_end": "2024-12-31",
        "notice_period_days": 30, "monthly_rent_thb": 9000,
    },
    "unfair_clauses": [
        {
            "clause_text": "ผู้เช่าต้องทาสีห้องใหม่ก่อนออก",
            "reason_void": "ขัดต่อประกาศ สคบ. 2568 ห้ามเรียกค่าซ่อมแซมความเสื่อมสภาพตามปกติ",
        }
    ],
    "ocr_used": False,
    "extraction_confidence": 0.94,
}

# ── Mock Agent 03 output ───────────────────────────────────────────────────────

MOCK_AGENT03 = {
    "routing": "OCPB",
    "documents_to_generate": ["ocpb_complaint", "demand_letter", "evidence_summary"],
    "total_claimed_thb": 16700,
    "total_unlawful_thb": 11200,
    "verdicts": [
        {
            "claim_id": "C001", "item": "สีผนังห้องนอน", "amount_thb": 8000,
            "verdict": "UNLAWFUL",
            "reasoning_th": "รอยเปื้อนบนผนังเป็นความเสื่อมสภาพตามปกติจากการอยู่อาศัย 1 ปี ไม่ใช่ความเสียหายที่ผู้เช่าก่อขึ้น ตามประกาศ สคบ. 2568 ข้อสัญญาใดที่กำหนดให้ผู้เช่าทาสีใหม่ถือเป็นโมฆะ",
            "reasoning_en": "Wall scuffing after 12 months of habitation constitutes normal wear and tear. OCPB 2568 explicitly voids any lease clause charging tenants for this.",
            "citations": ["ประกาศ สคบ. 2568", "ป.พ.พ. มาตรา 562"],
            "recommended_action_th": "ปฏิเสธการชำระค่าสีผนัง และอ้างประกาศ สคบ. 2568 ในหนังสือตอบโต้",
            "claim_validity_pct": 0,
        },
        {
            "claim_id": "C002", "item": "แอร์คอนดิชัน", "amount_thb": 5500,
            "verdict": "DISPUTED",
            "reasoning_th": "ไม่สามารถตรวจสอบสภาพแอร์จากภาพได้ อย่างไรก็ตาม ค่าล้างแอร์ตามปกติถือเป็นค่าบำรุงรักษาที่เจ้าของบ้านต้องรับผิดชอบตาม ป.พ.พ. มาตรา 547",
            "reasoning_en": "AC maintenance costs are landlord responsibility under CCC §547. Tenant liability applies only if negligence is proven.",
            "citations": ["ป.พ.พ. มาตรา 547"],
            "recommended_action_th": "ขอใบเสร็จค่าซ่อมและหลักฐานว่าผู้เช่าเป็นผู้ทำให้เสียหาย หากไม่มีหลักฐาน ให้ปฏิเสธการชำระ",
            "claim_validity_pct": 30,
        },
        {
            "claim_id": "C003", "item": "กระเบื้องห้องน้ำ", "amount_thb": 3200,
            "verdict": "UNLAWFUL",
            "reasoning_th": "ภาพถ่ายวันเข้าอยู่แสดงรอยร้าวที่มีอยู่ก่อนแล้ว เจ้าของบ้านไม่ได้ส่งมอบทรัพย์สินในสภาพดีตาม ป.พ.พ. มาตรา 546 การเรียกร้องค่าซ่อมจึงไม่ชอบด้วยกฎหมาย",
            "reasoning_en": "Move-in photos confirm the crack was pre-existing. Landlord violated delivery duty under CCC §546. Charge is unlawful.",
            "citations": ["ป.พ.พ. มาตรา 546", "ป.พ.พ. มาตรา 548"],
            "recommended_action_th": "แนบภาพถ่ายวันเข้าอยู่ที่แสดงรอยร้าวเดิมพร้อมหนังสือเรียกร้องคืนเงิน",
            "claim_validity_pct": 0,
        },
    ],
    "case_summary_th": "ผู้เช่าถูกเรียกร้องค่าเสียหายรวม 16,700 บาท โดยพบว่า 11,200 บาท ไม่ชอบด้วยกฎหมาย เนื่องจากเป็นความเสื่อมสภาพตามปกติและความเสียหายที่มีอยู่ก่อน เจ้าของบ้านมี 5 ห้อง จึงอยู่ในขอบเขตของประกาศ สคบ. 2568 แนะนำให้ยื่นเรื่องต่อ สคบ.",
    "case_summary_en": "Tenant faces 16,700 THB in claims, of which 11,200 THB (67%) is unlawful under OCPB 2568 and CCC §537-571. Landlord operates 5 units, placing this case under OCPB jurisdiction. All three documents should be filed.",
}

# ── Mock Agent 04 output ───────────────────────────────────────────────────────

MOCK_AGENT04 = {
    "documents": {
        "ocpb_complaint":    {"doc_type": "หนังสือร้องเรียน สคบ.",      "pages": 3, "status": "generated"},
        "demand_letter":     {"doc_type": "หนังสือเรียกร้องคืนเงิน",    "pages": 2, "status": "generated"},
        "evidence_summary":  {"doc_type": "สรุปหลักฐานและผลวินิจฉัย",  "pages": 4, "status": "generated"},
    },
    "generation_time_seconds": 8.4,
    "total_unlawful_amount_thb": 11200,
}

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", case=MOCK_CASE)


@app.route("/health")
def health():
    import chromadb
    try:
        client = chromadb.PersistentClient(path="./chroma_db")
        col = client.get_or_create_collection("thai_rental_law")
        loaded = col.count() > 0
    except Exception:
        loaded = False
    return jsonify({"status": "ok", "corpus_loaded": loaded})


@app.route("/mock/agent01", methods=["GET", "POST"])
def mock_agent01():
    time.sleep(1.2)
    claims = (request.get_json(silent=True) or {}).get("claims", [])
    if not claims:
        return jsonify(MOCK_AGENT01)

    # Pool of CV verdicts to cycle through deterministically
    cv_pool = [
        {"verdict": "NORMAL_WEAR",  "confidence": 0.82,
         "move_in_condition": "สภาพปกติ ไม่มีความเสียหาย",
         "move_out_condition": "มีความเสื่อมสภาพเล็กน้อยตามการใช้งานปกติ", "status": "ok"},
        {"verdict": "PRE_EXISTING", "confidence": 0.91,
         "move_in_condition": "พบร่องรอยความเสียหายอยู่แล้วตั้งแต่วันเข้าอยู่",
         "move_out_condition": "สภาพเดิม ไม่มีการเปลี่ยนแปลง", "status": "ok"},
        {"verdict": None,           "confidence": 0.45,
         "move_in_condition": "ไม่สามารถระบุสภาพได้ชัดเจนจากภาพ",
         "move_out_condition": "ไม่สามารถตรวจสอบได้", "status": "unverifiable_by_cv"},
        {"verdict": "NEW_DAMAGE",   "confidence": 0.78,
         "move_in_condition": "สภาพดี ไม่มีความเสียหาย",
         "move_out_condition": "พบความเสียหายใหม่ที่ไม่มีในวันเข้าอยู่", "status": "ok"},
        {"verdict": "UNCHANGED",    "confidence": 0.88,
         "move_in_condition": "สภาพทั่วไปปกติ",
         "move_out_condition": "สภาพเหมือนเดิม ไม่พบการเปลี่ยนแปลง", "status": "ok"},
    ]

    damage_map = []
    for i, claim in enumerate(claims):
        base = cv_pool[i % len(cv_pool)]
        damage_map.append({
            "claim_id": claim["claim_id"],
            **base,
        })

    return jsonify({"damage_map": damage_map, "model_used": "meta-llama/llama-4-scout-17b-16e-instruct"})


@app.route("/mock/agent02", methods=["GET", "POST"])
def mock_agent02():
    time.sleep(1.5)
    data   = request.get_json(silent=True) or {}
    claims = data.get("claims", [])
    if not claims:
        return jsonify(MOCK_AGENT02)

    deposit    = float(data.get("deposit") or 18000)
    rent       = float(data.get("rent")    or 9000)
    lease_start = data.get("lease_start") or "2024-01-01"
    lease_end   = data.get("lease_end")   or "2024-12-31"
    clause_text = data.get("clause", "").strip()

    # Cycle: first claim not liable, second liable (contract clause), rest not liable
    liability_pool = [
        {"tenant_liable": False, "clause_found": False,
         "notes": "สัญญาไม่ได้ระบุให้ผู้เช่ารับผิดชอบความเสื่อมสภาพตามปกติ"},
        {"tenant_liable": True,  "clause_found": bool(clause_text),
         "contract_clause": clause_text or "ผู้เช่าต้องดูแลทรัพย์สินในสภาพดี",
         "notes": "สัญญาระบุความรับผิดชอบผู้เช่า แต่ต้องมีหลักฐานความเสียหายจริง"},
        {"tenant_liable": False, "clause_found": False,
         "notes": "ไม่มีรายงานสภาพทรัพย์สิน ณ วันเข้าอยู่ที่ระบุสภาพรายการนี้"},
    ]

    liability_map = []
    for i, claim in enumerate(claims):
        base = dict(liability_pool[i % len(liability_pool)])
        base.update({"claim_id": claim["claim_id"], "item": claim["item"],
                     "amount_thb": claim["amount_thb"],
                     "pre_existing_disclosed": False})
        liability_map.append(base)

    unfair_clauses = []
    if clause_text and any(k in clause_text for k in ["ทาสี", "ซ่อม", "คืน", "หัก", "ค่าเสื่อม"]):
        unfair_clauses.append({
            "clause_text": clause_text[:80],
            "reason_void": "ขัดต่อประกาศ สคบ. 2568 ห้ามเรียกค่าซ่อมแซมความเสื่อมสภาพตามปกติ",
        })

    deposit_months = round(deposit / rent) if rent else 2

    return jsonify({
        "liability_map": liability_map,
        "contract_summary": {
            "deposit_amount_thb": deposit,
            "deposit_months": deposit_months,
            "lease_start": lease_start,
            "lease_end":   lease_end,
            "notice_period_days": 30,
            "monthly_rent_thb": rent,
        },
        "unfair_clauses":       unfair_clauses,
        "ocr_used":             False,
        "extraction_confidence": 0.94,
    })


@app.route("/mock/agent03", methods=["GET", "POST"])
def mock_agent03():
    time.sleep(1.8)
    claims = (request.get_json(silent=True) or {}).get("claims", [])
    if not claims:
        return jsonify(MOCK_AGENT03)

    verdict_pool = [
        {"verdict": "UNLAWFUL",
         "reasoning_th": "การเรียกร้องนี้ไม่ชอบด้วยกฎหมาย เนื่องจากเป็นความเสื่อมสภาพตามปกติหรือความเสียหายที่มีอยู่ก่อน ตามประกาศ สคบ. 2568",
         "reasoning_en": "This claim is unlawful under OCPB 2568 — damage constitutes normal wear and tear or was pre-existing.",
         "citations": ["ประกาศ สคบ. 2568", "ป.พ.พ. มาตรา 562"],
         "recommended_action_th": "ปฏิเสธการชำระ อ้างประกาศ สคบ. 2568 และแนบภาพถ่ายประกอบ",
         "claim_validity_pct": 0},
        {"verdict": "DISPUTED",
         "reasoning_th": "ไม่มีหลักฐานเพียงพอที่จะตัดสินได้ชัดเจน ผู้ให้เช่าต้องแสดงหลักฐานความเสียหายที่ตรวจสอบได้",
         "reasoning_en": "Insufficient evidence to determine liability. Landlord must produce verified damage evidence.",
         "citations": ["ป.พ.พ. มาตรา 547"],
         "recommended_action_th": "ขอหลักฐานค่าซ่อมและใบเสร็จจากผู้ให้เช่าก่อนพิจารณา",
         "claim_validity_pct": 30},
        {"verdict": "LAWFUL",
         "reasoning_th": "ความเสียหายเกิดจากการใช้งานเกินขอบเขตปกติ สัญญาระบุความรับผิดชอบของผู้เช่าไว้ชัดเจน",
         "reasoning_en": "Damage was caused by tenant negligence beyond normal use. Contract clearly assigns liability.",
         "citations": ["ป.พ.พ. มาตรา 552", "ป.พ.พ. มาตรา 562"],
         "recommended_action_th": "พิจารณาชำระตามจำนวนที่สมเหตุสมผลพร้อมใบเสร็จ",
         "claim_validity_pct": 80},
    ]

    verdicts = []
    total_claimed = 0.0
    total_unlawful = 0.0
    for i, claim in enumerate(claims):
        base = verdict_pool[i % len(verdict_pool)]
        amt = float(claim.get("amount_thb", 0))
        total_claimed += amt
        if base["verdict"] == "UNLAWFUL":
            total_unlawful += amt
        verdicts.append({
            "claim_id": claim["claim_id"],
            "item": claim["item"],
            "amount_thb": amt,
            **base,
        })

    return jsonify({
        "routing": "OCPB",
        "documents_to_generate": ["ocpb_complaint", "demand_letter", "evidence_summary"],
        "total_claimed_thb": total_claimed,
        "total_unlawful_thb": total_unlawful,
        "verdicts": verdicts,
        "case_summary_th": f"ผู้เช่าถูกเรียกร้องค่าเสียหายรวม {total_claimed:,.0f} บาท โดยพบว่า {total_unlawful:,.0f} บาท ไม่ชอบด้วยกฎหมาย แนะนำให้ยื่นเรื่องต่อ สคบ.",
        "case_summary_en": f"Tenant faces {total_claimed:,.0f} THB in claims, of which {total_unlawful:,.0f} THB is unlawful under OCPB 2568 and CCC §537-571.",
    })


@app.route("/mock/agent04")
def mock_agent04():
    time.sleep(2.0)
    return jsonify(MOCK_AGENT04)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
