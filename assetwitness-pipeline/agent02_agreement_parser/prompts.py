from langchain_core.prompts import ChatPromptTemplate

# Grounded in the real, named framework governing Thai state property — see
# docs/asset-policy-methodology.md for the full citation notes. Specific
# section numbers for damage-vs-wear provisions are NOT invented here since
# they aren't publicly confirmed; the prompt sticks to what's verifiable
# (the Act/Regulation names themselves, and the confirmed 30-day return
# notice) and otherwise asks the model to flag rather than assert compliance.
SYSTEM_PROMPT = """คุณเป็นผู้เชี่ยวชาญด้านสัญญาการใช้ประโยชน์ในที่ราชพัสดุของไทย
วิเคราะห์สัญญาที่ให้มาอย่างเป็นกลาง (ไม่เข้าข้างฝ่ายใดฝ่ายหนึ่ง) และตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

สำหรับแต่ละรายการสภาพที่ตรวจพบ ให้ตรวจสอบ:
1. มีข้อกำหนดในสัญญาที่ระบุความรับผิดชอบของผู้ครอบครอง (หน่วยงานราชการหรือผู้เช่าเชิงพาณิชย์) หรือไม่
2. มีการเปิดเผยความเสียหายที่มีอยู่ก่อนหรือไม่
3. ข้อสัญญาใดที่อาจขัดต่อพระราชบัญญัติที่ราชพัสดุ พ.ศ. 2562 หรือระเบียบกระทรวงการคลังว่าด้วยการจัดหาประโยชน์ในที่ราชพัสดุ พ.ศ. 2552 — ระบุเฉพาะที่มั่นใจ หากไม่แน่ใจให้ระบุ "ต้องตรวจสอบเพิ่มเติม" แทนการฟันธง
4. วันเริ่มต้น-สิ้นสุดสัญญา ระยะเวลาแจ้งล่วงหน้า (ปกติ 30 วันตามระเบียบ พ.ศ. 2552) ค่าเช่า/ค่าธรรมเนียมรายเดือน และเงินประกัน (ถ้ามี)"""

USER_PROMPT = """สัญญา:
{agreement_text}

รายการสภาพที่ตรวจพบระหว่างการส่งมอบ:
{item_list}

สำคัญมาก: ค้นหาข้อสัญญาที่อาจไม่สอดคล้องกับกฎหมาย/ระเบียบที่ราชพัสดุและเพิ่มลงใน non_compliant_clauses โดยต้องอ้างอิงข้อความจากสัญญาจริง ไม่ใช่จากคำอธิบาย หากไม่มั่นใจว่าขัดต่อกฎหมายจริงหรือไม่ ให้ระบุเหตุผลว่า "ต้องตรวจสอบเพิ่มเติมกับนโยบายของ ธพส." แทนการฟันธง

ตอบในรูปแบบ JSON นี้เท่านั้น:
{{
  "responsibility_map": [
    {{
      "item": "string",
      "occupant_responsible": false,
      "agreement_clause": "ข้อความจากสัญญา หรือ null",
      "clause_found": false,
      "pre_existing_disclosed": false,
      "notes": "string"
    }}
  ],
  "agreement_summary": {{
    "occupancy_start": "YYYY-MM-DD",
    "occupancy_end": "YYYY-MM-DD",
    "notice_period_days": 30,
    "monthly_fee_thb": 0,
    "deposit_amount_thb": null,
    "deposit_months": null
  }},
  "non_compliant_clauses": [
    {{
      "clause_text": "string",
      "reason_non_compliant": "string"
    }}
  ]
}}"""

PARSER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", USER_PROMPT),
])
