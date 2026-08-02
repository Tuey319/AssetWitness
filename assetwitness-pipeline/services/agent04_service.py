"""
Agent 04 — Report Generator (local storage).
Generates professional Thai handover documents using Platypus + Leelawadee font.

Run from assetwitness-pipeline/:
    python -m uvicorn services.agent04_service:app --port 8004 --reload
"""

import io
import json
import logging
import os
import time
import uuid
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AssetWitness Agent 04 — Report Generator (Local)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY")
TYPHOON_BASE_URL = os.getenv("TYPHOON_BASE_URL", "https://api.opentyphoon.ai/v1")
TYPHOON_MODEL   = os.getenv("TYPHOON_MODEL", "typhoon-v2-70b-instruct")

# ── Fonts ──────────────────────────────────────────────────────────────────────

_F_REG  = "ThaiReg"
_F_BOLD = "ThaiBold"

def _register_fonts() -> tuple[str, str]:
    try:
        pdfmetrics.registerFont(TTFont(_F_REG,  r"C:\Windows\Fonts\leelawad.ttf"))
        pdfmetrics.registerFont(TTFont(_F_BOLD, r"C:\Windows\Fonts\leelawdb.ttf"))
        return _F_REG, _F_BOLD
    except Exception as exc:
        logger.warning("Thai font registration failed (%s) — falling back to Helvetica", exc)
        return "Helvetica", "Helvetica-Bold"

FR, FB = _register_fonts()

# ── Colour palette ─────────────────────────────────────────────────────────────

NAVY     = colors.HexColor("#1B3A6B")
NAVY_LT  = colors.HexColor("#E8F0F9")
STEEL    = colors.HexColor("#4A6FA5")
RED      = colors.HexColor("#C0392B")
GREEN    = colors.HexColor("#27AE60")
ORANGE   = colors.HexColor("#D35400")
GREY_LT  = colors.HexColor("#F5F5F5")
GREY     = colors.HexColor("#AAAAAA")

# ── Styles ─────────────────────────────────────────────────────────────────────

def _styles() -> dict:
    return {
        "doc_title": ParagraphStyle(
            "doc_title", fontName=FB, fontSize=16,
            alignment=TA_CENTER, textColor=NAVY,
            spaceAfter=4, leading=22,
        ),
        "doc_subtitle": ParagraphStyle(
            "doc_subtitle", fontName=FR, fontSize=10,
            alignment=TA_CENTER, textColor=STEEL,
            spaceAfter=2,
        ),
        "section_hdr": ParagraphStyle(
            "section_hdr", fontName=FB, fontSize=11,
            textColor=NAVY, spaceBefore=12, spaceAfter=4, leading=16,
        ),
        "body": ParagraphStyle(
            "body", fontName=FR, fontSize=10,
            leading=17, spaceAfter=6, alignment=TA_JUSTIFY,
        ),
        "body_right": ParagraphStyle(
            "body_right", fontName=FR, fontSize=10,
            leading=17, spaceAfter=4, alignment=TA_RIGHT,
        ),
        "body_center": ParagraphStyle(
            "body_center", fontName=FR, fontSize=10,
            leading=17, spaceAfter=4, alignment=TA_CENTER,
        ),
        "label": ParagraphStyle(
            "label", fontName=FB, fontSize=10,
            leading=16, spaceAfter=2,
        ),
        "small": ParagraphStyle(
            "small", fontName=FR, fontSize=8.5,
            textColor=colors.HexColor("#555555"), leading=13,
        ),
        "table_hdr": ParagraphStyle(
            "table_hdr", fontName=FB, fontSize=9,
            textColor=colors.white, alignment=TA_CENTER, leading=13,
        ),
        "table_cell": ParagraphStyle(
            "table_cell", fontName=FR, fontSize=9,
            leading=13, alignment=TA_LEFT,
        ),
        "table_cell_c": ParagraphStyle(
            "table_cell_c", fontName=FR, fontSize=9,
            leading=13, alignment=TA_CENTER,
        ),
        "verdict_dad": ParagraphStyle(
            "verdict_dad", fontName=FB, fontSize=9,
            textColor=GREEN, alignment=TA_CENTER, leading=13,
        ),
        "verdict_occupant": ParagraphStyle(
            "verdict_occupant", fontName=FB, fontSize=9,
            textColor=RED, alignment=TA_CENTER, leading=13,
        ),
        "verdict_wear": ParagraphStyle(
            "verdict_wear", fontName=FB, fontSize=9,
            textColor=STEEL, alignment=TA_CENTER, leading=13,
        ),
        "verdict_disputed": ParagraphStyle(
            "verdict_disputed", fontName=FB, fontSize=9,
            textColor=ORANGE, alignment=TA_CENTER, leading=13,
        ),
        "sig_label": ParagraphStyle(
            "sig_label", fontName=FR, fontSize=10,
            alignment=TA_CENTER, leading=16,
        ),
    }

_VERDICT_LABEL = {
    "NORMAL_WEAR":             "เสื่อมสภาพตามปกติ",
    "OCCUPANT_RESPONSIBILITY": "ผู้ครอบครองรับผิดชอบ",
    "DAD_RESPONSIBILITY":      "ธพส. รับผิดชอบ",
    "DISPUTED":                "เป็นข้อพิพาท",
}

# ── LLM helpers ────────────────────────────────────────────────────────────────

_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "คุณเป็นผู้เชี่ยวชาญด้านการร่างเอกสารส่งมอบทรัพย์สินราชพัสดุของ ธพส. "
     "ร่างเฉพาะส่วนที่ขอ ใช้ภาษาไทยทางการและสุภาพ "
     "วันที่ทุกรูปแบบต้องเป็น พ.ศ. เสมอ "
     "ตอบเป็นข้อความล้วนๆ ไม่ต้องมี JSON หรือ Markdown หรือ bullet"),
    ("human",
     "ประเภทเอกสาร: {doc_type}\n"
     "ส่วนที่ต้องการ: {section_key}\n"
     "คำสั่ง: {instruction}\n\n"
     "ข้อมูลการส่งมอบ (JSON):\n{context_json}\n\n"
     "ร่างส่วนนี้ (2-4 ประโยค ภาษาไทยทางการ):"),
])

DOC_META = {
    "condition_certification_report": {
        "doc_type": "หนังสือรับรองสภาพทรัพย์สิน",
        "label": "รายงานรับรองสภาพทรัพย์สินการส่งมอบ",
    },
    "fit_out_completion_checklist": {
        "doc_type": "แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน",
        "label": "แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน (Fit-Out)",
    },
    "liability_summary": {
        "doc_type": "สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท",
        "label": "สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท",
    },
}

# LLM sections — only narrative parts; structured elements are built from data
_LLM_SECTIONS = {
    "condition_certification_report": [
        ("opening",
         "ร่างย่อหน้าเปิดเรื่อง 2-3 ประโยค ระบุว่าเอกสารนี้รับรองสภาพทรัพย์สินในการส่งมอบ "
         "ระหว่าง ธพส. และผู้ครอบครอง โดยอ้างถึงการตรวจสอบสภาพทรัพย์สินที่ดำเนินการแล้ว"),
        ("findings",
         "ร่างสรุปผลการตรวจสอบ 3-4 ประโยค อธิบายมูลค่าประเมินความเสียหายรวม {amount} บาท "
         "และการแบ่งความรับผิดชอบระหว่าง ธพส. และผู้ครอบครองตามรายการที่ตรวจพบ"),
        ("recommendation",
         "ร่างข้อแนะนำ 2-3 ประโยค แนะนำขั้นตอนถัดไปสำหรับรายการที่ผู้ครอบครองต้องรับผิดชอบ "
         "และรายการที่ยังเป็นข้อพิพาทหากมี"),
    ],
    "fit_out_completion_checklist": [
        ("intro",
         "ร่างย่อหน้าแนะนำ 2-3 ประโยค ระบุว่าเอกสารนี้เป็นแบบตรวจสอบความสมบูรณ์ของงานตกแต่งภายใน (fit-out) "
         "ก่อนการรับมอบพื้นที่จาก ธพส."),
        ("completion_status",
         "ร่างสถานะความสมบูรณ์ของงาน 3-4 ประโยค อ้างอิงมูลค่าประเมินรวม {amount} บาท "
         "และรายการที่ผ่านหรือไม่ผ่านการตรวจรับ"),
        ("outstanding_items",
         "ร่างรายการที่ยังค้างดำเนินการ 2-3 ประโยค ระบุว่ารายการใดต้องได้รับการยืนยันจาก ธพส. เพิ่มเติม "
         "ก่อนปิดงานตกแต่งภายใน"),
    ],
    "liability_summary": [
        ("overview",
         "ร่างภาพรวมข้อพิพาท 2-3 ประโยค อธิบายบริบทของรายการที่มีความเห็นไม่ตรงกันและจำนวนเงินที่เกี่ยวข้อง"),
        ("analysis",
         "ร่างบทวิเคราะห์ 3-4 ประโยค อธิบายวิธีการตรวจสอบหลักฐาน "
         "(การเปรียบเทียบภาพถ่ายสภาพ ตรวจสอบข้อตกลง และการวิเคราะห์ตามระเบียบที่เกี่ยวข้อง)"),
        ("recommendation",
         "ร่างข้อแนะนำ 2-3 ประโยค แนะนำขั้นตอนที่ควรดำเนินการต่อไปเพื่อระงับข้อพิพาท "
         "โดยเน้นว่าเป็นข้อมูลสนับสนุนการตัดสินใจของมนุษย์ มิใช่คำวินิจฉัยขั้นสุดท้าย"),
    ],
}


def _get_llm() -> ChatOpenAI | None:
    if not TYPHOON_API_KEY:
        logger.warning("TYPHOON_API_KEY not set — fallback text used")
        return None
    return ChatOpenAI(
        api_key=TYPHOON_API_KEY,
        base_url=TYPHOON_BASE_URL,
        model=TYPHOON_MODEL,
        temperature=0.05,
    )


def _llm_text(doc_type: str, section_key: str, instruction: str, context: dict, llm: ChatOpenAI) -> str:
    chain = _PROMPT | llm | StrOutputParser()
    return chain.invoke({
        "doc_type": doc_type,
        "section_key": section_key,
        "instruction": instruction,
        "context_json": json.dumps(context, ensure_ascii=False, indent=2),
    }).strip()


def _fallback(section_key: str, total: float) -> str:
    if "opening" in section_key or "intro" in section_key:
        return (
            f"เอกสารนี้รับรองสภาพทรัพย์สินในการส่งมอบ โดยมีมูลค่าประเมินรวม {total:,.0f} บาท "
            f"ตามรายการที่ตรวจสอบแล้ว"
        )
    if "recommendation" in section_key or "outstanding" in section_key:
        return (
            f"โปรดดำเนินการตามรายการความรับผิดชอบที่ระบุไว้ และติดต่อ ธพส. "
            f"สำหรับรายการที่ยังต้องการการยืนยันเพิ่มเติม"
        )
    return "(ไม่สามารถสร้างเนื้อหาได้ — TYPHOON_API_KEY not configured)"


def _generate_sections(doc_type: str, context: dict, llm: ChatOpenAI | None) -> dict[str, str]:
    total = context.get("total_estimated_cost_thb", 0)
    result: dict[str, str] = {}
    for key, instr in _LLM_SECTIONS.get(doc_type, []):
        instr_fmt = instr.format(amount=f"{total:,.0f}")
        if llm:
            try:
                result[key] = _llm_text(doc_type, key, instr_fmt, context, llm)
                logger.info("LLM: %s › %s OK", doc_type, key)
            except Exception as exc:
                logger.warning("LLM failed %s › %s: %s", doc_type, key, exc)
                result[key] = _fallback(key, total)
        else:
            result[key] = _fallback(key, total)
    return result


# ── Shared PDF helpers ─────────────────────────────────────────────────────────

def _doc(buf: io.BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.2*cm, bottomMargin=2.2*cm,
    )


def _hr(color=NAVY, thickness=1.5) -> HRFlowable:
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=6, spaceBefore=2)


def _thin_hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.5, color=GREY, spaceAfter=4, spaceBefore=4)


def _verdict_badge_style(responsibility: str, styles: dict) -> ParagraphStyle:
    mapping = {
        "NORMAL_WEAR":             styles["verdict_wear"],
        "OCCUPANT_RESPONSIBILITY": styles["verdict_occupant"],
        "DAD_RESPONSIBILITY":      styles["verdict_dad"],
        "DISPUTED":                styles["verdict_disputed"],
    }
    return mapping.get(responsibility, styles["verdict_disputed"])


def _page_num_canvas_maker(page_label: str):
    """Returns a canvas maker function that draws footer on each page."""
    def _on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont(FR, 8)
        canvas.setFillColor(GREY)
        w = A4[0]
        canvas.drawCentredString(w / 2, 1.2*cm, f"{page_label}  —  หน้า {doc.page}")
        canvas.restoreState()
    return _on_page


def _item_verdict_table(verdicts: list[dict], s: dict, col_widths: list) -> Table:
    hdr = [
        Paragraph("รายการ", s["table_hdr"]),
        Paragraph("มูลค่าประเมิน (บาท)", s["table_hdr"]),
        Paragraph("ผู้รับผิดชอบ", s["table_hdr"]),
        Paragraph("เหตุผลโดยสรุป", s["table_hdr"]),
        Paragraph("อ้างอิง", s["table_hdr"]),
    ]
    rows = [hdr]
    for v in verdicts:
        responsibility = v.get("responsibility", "DISPUTED")
        badge = Paragraph(
            _VERDICT_LABEL.get(responsibility, responsibility),
            _verdict_badge_style(responsibility, s)
        )
        reason = v.get("reasoning_th", "")
        if len(reason) > 100:
            reason = reason[:97] + "..."
        cites = ", ".join(v.get("citations", []))
        if len(cites) > 60:
            cites = cites[:57] + "..."
        rows.append([
            Paragraph(v.get("item", ""), s["table_cell"]),
            Paragraph(f"{float(v.get('estimated_cost_thb', 0)):,.0f}", s["table_cell_c"]),
            badge,
            Paragraph(reason, s["small"]),
            Paragraph(cites, s["small"]),
        ])
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0),  NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_LT]),
        ("GRID",         (0, 0), (-1, -1), 0.4, GREY),
        ("BOX",          (0, 0), (-1, -1), 1,   NAVY),
        ("FONTNAME",     (0, 0), (-1, -1), FR),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))
    return tbl


def _dual_signature_block(s: dict, today_th: str) -> Table:
    sig_rows = [
        [Paragraph("ลงชื่อ ผู้แทน ธพส.", s["sig_label"]),
         Paragraph("ลงชื่อ ผู้ครอบครอง", s["sig_label"])],
        [Spacer(1, 1.2*cm), Spacer(1, 1.2*cm)],
        [Paragraph("____________________________", s["sig_label"]),
         Paragraph("____________________________", s["sig_label"])],
        [Paragraph("( ผู้แทน ธพส. )", s["sig_label"]),
         Paragraph("( ผู้ครอบครอง )", s["sig_label"])],
        [Paragraph(f"วันที่ {today_th}", s["sig_label"]),
         Paragraph(f"วันที่ {today_th}", s["sig_label"])],
    ]
    sig_tbl = Table(sig_rows, colWidths=[8.25*cm, 8.25*cm])
    sig_tbl.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), FR)]))
    return sig_tbl


# ── Condition Certification Report ─────────────────────────────────────────────

def render_condition_certification_report(sections: dict, context: dict, handover_id: str) -> tuple[bytes, int]:
    s = _styles()
    total_cost = context.get("total_estimated_cost_thb", 0)
    dad_resp   = context.get("total_dad_responsibility_thb", 0)
    occ_resp   = context.get("total_occupant_responsibility_thb", 0)
    verdicts   = context.get("item_verdicts", [])
    today_th   = datetime.now().strftime("%d/%m/%Y")

    buf = io.BytesIO()
    doc = _doc(buf)
    story = []

    story.append(Paragraph("หนังสือรับรองสภาพทรัพย์สินการส่งมอบ", s["doc_title"]))
    story.append(_hr())
    story.append(Paragraph(f"เลขที่อ้างอิง: AW-{handover_id.upper()}  ·  วันที่ {today_th}", s["doc_subtitle"]))
    story.append(Spacer(1, 0.5*cm))

    stat_label = ParagraphStyle("sl", fontName=FR, fontSize=8, textColor=STEEL, alignment=TA_CENTER)
    stat_value = ParagraphStyle("sv", fontName=FB, fontSize=14, textColor=NAVY, alignment=TA_CENTER)
    boxes = Table([[
        Paragraph("มูลค่าประเมินรวม", stat_label),
        Paragraph("ธพส. รับผิดชอบ", stat_label),
        Paragraph("ผู้ครอบครองรับผิดชอบ", stat_label),
    ], [
        Paragraph(f"฿{total_cost:,.0f}", stat_value),
        Paragraph(f"฿{dad_resp:,.0f}", stat_value),
        Paragraph(f"฿{occ_resp:,.0f}", stat_value),
    ]], colWidths=[5.3*cm, 5.3*cm, 5.3*cm])
    boxes.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), NAVY_LT),
        ("BACKGROUND",   (1, 0), (1, -1), colors.HexColor("#EAF4EC")),
        ("BACKGROUND",   (2, 0), (2, -1), colors.HexColor("#FDECEA")),
        ("BOX",          (0, 0), (0, -1), 1, STEEL),
        ("BOX",          (1, 0), (1, -1), 1, STEEL),
        ("BOX",          (2, 0), (2, -1), 1, STEEL),
        ("LINEAFTER",    (0, 0), (1, -1), 1, colors.white),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
    ]))
    story.append(boxes)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph(sections.get("opening", ""), s["body"]))
    story.append(Spacer(1, 0.3*cm))

    if verdicts:
        story.append(Paragraph("รายการตรวจสอบสภาพทรัพย์สิน", s["section_hdr"]))
        story.append(_item_verdict_table(verdicts, s, [3*cm, 2.2*cm, 3.2*cm, 4.8*cm, 3.3*cm]))
        story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("ผลการตรวจสอบ", s["section_hdr"]))
    story.append(Paragraph(sections.get("findings", ""), s["body"]))

    story.append(Paragraph("ข้อแนะนำ", s["section_hdr"]))
    story.append(Paragraph(sections.get("recommendation", ""), s["body"]))
    story.append(Spacer(1, 0.5*cm))
    story.append(_thin_hr())

    story.append(_dual_signature_block(s, today_th))

    all_cites = []
    for v in verdicts:
        all_cites.extend(v.get("citations", []))
    unique_cites = list(dict.fromkeys(all_cites))
    if unique_cites:
        story.append(Spacer(1, 0.4*cm))
        story.append(_thin_hr())
        story.append(Paragraph("อ้างอิง: " + " · ".join(unique_cites), s["small"]))

    label = "หนังสือรับรองสภาพทรัพย์สินการส่งมอบ"
    doc.build(story, onFirstPage=_page_num_canvas_maker(label), onLaterPages=_page_num_canvas_maker(label))
    return buf.getvalue(), doc.page


# ── Fit-Out Completion Checklist ───────────────────────────────────────────────

def render_fit_out_completion_checklist(sections: dict, context: dict, handover_id: str) -> tuple[bytes, int]:
    s = _styles()
    verdicts   = context.get("item_verdicts", [])
    disputed   = [v for v in verdicts if v.get("responsibility") == "DISPUTED"]
    today_th   = datetime.now().strftime("%d/%m/%Y")

    buf = io.BytesIO()
    doc = _doc(buf)
    story = []

    story.append(Paragraph("แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน (Fit-Out)", s["doc_title"]))
    story.append(_hr())
    story.append(Paragraph(f"เลขที่อ้างอิง: AW-FO-{handover_id.upper()}  ·  วันที่ {today_th}", s["doc_subtitle"]))
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph(sections.get("intro", ""), s["body"]))
    story.append(Spacer(1, 0.3*cm))

    if verdicts:
        story.append(Paragraph("รายการตรวจรับงานตกแต่งภายใน", s["section_hdr"]))
        story.append(_item_verdict_table(verdicts, s, [3*cm, 2.2*cm, 3.2*cm, 4.8*cm, 3.3*cm]))
        story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("สถานะความสมบูรณ์ของงาน", s["section_hdr"]))
    story.append(Paragraph(sections.get("completion_status", ""), s["body"]))

    story.append(Paragraph("รายการที่ยังค้างดำเนินการ", s["section_hdr"]))
    if disputed:
        for v in disputed:
            story.append(Paragraph(f"☐  {v.get('item', '')} — ต้องยืนยันจาก ธพส. เพิ่มเติม", s["body"]))
    else:
        story.append(Paragraph("ไม่มีรายการค้างดำเนินการ", s["body"]))
    story.append(Paragraph(sections.get("outstanding_items", ""), s["body"]))
    story.append(Spacer(1, 0.5*cm))
    story.append(_thin_hr())

    story.append(_dual_signature_block(s, today_th))

    label = "แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน"
    doc.build(story, onFirstPage=_page_num_canvas_maker(label), onLaterPages=_page_num_canvas_maker(label))
    return buf.getvalue(), doc.page


# ── Liability Summary ──────────────────────────────────────────────────────────

def render_liability_summary(sections: dict, context: dict, handover_id: str) -> tuple[bytes, int]:
    s = _styles()
    verdicts = context.get("item_verdicts", [])
    disputed = [v for v in verdicts if v.get("responsibility") == "DISPUTED"]
    total_disputed = sum(float(v.get("estimated_cost_thb", 0)) for v in disputed)
    today_th = datetime.now().strftime("%d/%m/%Y")

    buf = io.BytesIO()
    doc = _doc(buf)
    story = []

    story.append(Paragraph("สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท", s["doc_title"]))
    story.append(_hr())
    story.append(Paragraph(f"เลขที่อ้างอิง: AW-LS-{handover_id.upper()}  ·  วันที่ {today_th}", s["doc_subtitle"]))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph(
        "<i>เอกสารนี้เป็นหลักฐานประกอบการตัดสินใจของมนุษย์สำหรับการระงับข้อพิพาท "
        "มิใช่คำวินิจฉัยขั้นสุดท้าย</i>",
        s["small"]
    ))
    story.append(Spacer(1, 0.3*cm))

    stat_label = ParagraphStyle("sl", fontName=FR, fontSize=8, textColor=STEEL, alignment=TA_CENTER)
    stat_value = ParagraphStyle("sv", fontName=FB, fontSize=14, textColor=NAVY, alignment=TA_CENTER)
    boxes = Table([[
        Paragraph("รายการที่เป็นข้อพิพาท", stat_label),
        Paragraph("มูลค่าที่เป็นข้อพิพาท", stat_label),
    ], [
        Paragraph(f"{len(disputed)}", stat_value),
        Paragraph(f"฿{total_disputed:,.0f}", stat_value),
    ]], colWidths=[8*cm, 8*cm])
    boxes.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#FDF2E9")),
        ("BOX",          (0, 0), (0, -1), 1, STEEL),
        ("BOX",          (1, 0), (1, -1), 1, STEEL),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
    ]))
    story.append(boxes)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("ภาพรวมข้อพิพาท", s["section_hdr"]))
    story.append(Paragraph(sections.get("overview", ""), s["body"]))

    story.append(Paragraph("วิธีการตรวจสอบ", s["section_hdr"]))
    story.append(Paragraph(sections.get("analysis", ""), s["body"]))
    story.append(Spacer(1, 0.3*cm))

    if disputed:
        story.append(Paragraph("รายการที่เป็นข้อพิพาท", s["section_hdr"]))
        hdr = [
            Paragraph("รายการ", s["table_hdr"]),
            Paragraph("มูลค่า", s["table_hdr"]),
            Paragraph("เหตุผลโดยสรุป", s["table_hdr"]),
            Paragraph("ข้อแนะนำ", s["table_hdr"]),
            Paragraph("อ้างอิง", s["table_hdr"]),
        ]
        rows = [hdr]
        for v in disputed:
            reason = v.get("reasoning_th", "")
            if len(reason) > 90:
                reason = reason[:87] + "..."
            action = v.get("recommended_action_th", "")
            if len(action) > 70:
                action = action[:67] + "..."
            cites = ", ".join(v.get("citations", []))
            if len(cites) > 50:
                cites = cites[:47] + "..."
            rows.append([
                Paragraph(v.get("item", ""), s["table_cell"]),
                Paragraph(f"฿{float(v.get('estimated_cost_thb', 0)):,.0f}", s["table_cell_c"]),
                Paragraph(reason, s["small"]),
                Paragraph(action, s["small"]),
                Paragraph(cites, s["small"]),
            ])
        tbl = Table(rows, colWidths=[2.8*cm, 2.2*cm, 4*cm, 3.8*cm, 2.7*cm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0),  NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_LT]),
            ("GRID",         (0, 0), (-1, -1), 0.4, GREY),
            ("BOX",          (0, 0), (-1, -1), 1,   NAVY),
            ("FONTNAME",     (0, 0), (-1, -1), FR),
            ("FONTSIZE",     (0, 0), (-1, -1), 9),
            ("TOPPADDING",   (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
            ("LEFTPADDING",  (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("ข้อแนะนำ", s["section_hdr"]))
    story.append(Paragraph(sections.get("recommendation", ""), s["body"]))

    summary = context.get("case_summary_en", "")
    if summary:
        story.append(Spacer(1, 0.3*cm))
        story.append(_thin_hr())
        story.append(Paragraph(f"<i>Case summary (EN): {summary}</i>", s["small"]))

    label = "สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท"
    doc.build(story, onFirstPage=_page_num_canvas_maker(label), onLaterPages=_page_num_canvas_maker(label))
    return buf.getvalue(), doc.page


# ── Dispatch ──────────────────────────────────────────────────────────────────

_RENDERERS = {
    "condition_certification_report": render_condition_certification_report,
    "fit_out_completion_checklist":   render_fit_out_completion_checklist,
    "liability_summary":              render_liability_summary,
}


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "agent": "04"}


@app.post("/api/v1/agent04")
async def run_agent04(request: Request):
    data = await request.json()

    docs_to_generate: list[str]  = data.get("documents_to_generate", ["condition_certification_report"])
    total_estimated_cost: float  = float(data.get("total_estimated_cost_thb", 0))
    total_dad_resp: float        = float(data.get("total_dad_responsibility_thb", 0))
    total_occupant_resp: float   = float(data.get("total_occupant_responsibility_thb", 0))
    item_verdicts: list          = data.get("item_verdicts", [])
    case_summary_th: str         = data.get("case_summary_th", "")
    case_summary_en: str         = data.get("case_summary_en", "")

    handover_id = uuid.uuid4().hex[:10]
    start       = time.perf_counter()
    llm         = _get_llm()

    context = {
        "total_estimated_cost_thb":          total_estimated_cost,
        "total_dad_responsibility_thb":      total_dad_resp,
        "total_occupant_responsibility_thb": total_occupant_resp,
        "item_verdicts":                     item_verdicts,
        "case_summary_th":                   case_summary_th,
        "case_summary_en":                   case_summary_en,
        "generated_date":                    datetime.now().strftime("%d/%m/%Y"),
    }

    documents: dict = {}

    for doc_type in docs_to_generate:
        if doc_type not in DOC_META:
            logger.warning("Unknown doc_type '%s' — skipping", doc_type)
            continue

        renderer = _RENDERERS.get(doc_type)
        if renderer is None:
            continue

        sections = _generate_sections(doc_type, context, llm)

        try:
            pdf_bytes, page_count = renderer(sections, context, handover_id)
        except Exception as exc:
            logger.exception("Render failed for %s: %s", doc_type, exc)
            continue

        out_dir  = OUTPUTS_DIR / handover_id
        out_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = out_dir / f"{doc_type}.pdf"
        pdf_path.write_bytes(pdf_bytes)
        logger.info("Saved %s (%d pages, %d B)", pdf_path.name, page_count, len(pdf_bytes))

        documents[doc_type] = {
            "doc_type":     DOC_META[doc_type]["doc_type"],
            "pages":        page_count,
            "status":       "generated",
            "download_url": f"/api/v1/download/{handover_id}/{doc_type}",
        }

    elapsed = round(time.perf_counter() - start, 2)
    return {
        "handover_id":                       handover_id,
        "documents":                         documents,
        "generation_time_seconds":           elapsed,
        "total_estimated_cost_thb":          total_estimated_cost,
        "total_dad_responsibility_thb":      total_dad_resp,
        "total_occupant_responsibility_thb": total_occupant_resp,
    }


@app.get("/api/v1/download/{handover_id}/{doc_type}")
def download_document(handover_id: str, doc_type: str):
    if any(c in handover_id + doc_type for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid parameters")
    pdf_path = OUTPUTS_DIR / handover_id / f"{doc_type}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{doc_type}_{handover_id}.pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc_type}_{handover_id}.pdf"'},
    )
