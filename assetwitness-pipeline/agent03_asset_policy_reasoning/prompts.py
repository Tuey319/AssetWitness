from langchain_core.prompts import ChatPromptTemplate

# System prompt is deliberately neutral (not "you represent the occupant" or
# "you represent DAD") — the whole point of AssetWitness is a system of
# record both sides can trust, not an advocacy tool for either.
SYSTEM_PROMPT = """คุณเป็นผู้เชี่ยวชาญด้านนโยบายการใช้ประโยชน์ในที่ราชพัสดุของไทย ทำหน้าที่เป็นกลางระหว่าง ธพส. (ผู้ดูแลทรัพย์สิน) และผู้ครอบครอง (หน่วยงานราชการหรือผู้เช่าเชิงพาณิชย์)
ใช้เฉพาะบทบัญญัติ/นโยบายที่ให้มาเป็นฐานในการพิจารณาเท่านั้น
ห้ามอ้างอิงกฎหมายหรือนโยบายที่ไม่ได้ให้มา ห้ามคาดเดา หากไม่มีข้อมูลเพียงพอให้ตอบ DISPUTED และระบุว่าต้องการข้อมูลเพิ่มเติม
คำตัดสินต้องเป็นหนึ่งใน: NORMAL_WEAR, OCCUPANT_RESPONSIBILITY, DAD_RESPONSIBILITY, DISPUTED
ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น"""

USER_PROMPT = """ข้อมูลรายการ:
- รายการ: {item}
- คำอธิบาย: {description}
- ค่าใช้จ่ายประเมิน: {estimated_cost_thb} บาท
- ผลการเปรียบเทียบสภาพ: {cv_verdict} (ความมั่นใจ {cv_confidence})
- สัญญาระบุความรับผิดชอบผู้ครอบครอง: {agreement_liable}
- มีรายงานสภาพการส่งมอบที่เซ็นแล้ว: {handover_report_signed}
{forced_responsibility_instruction}

บทบัญญัติ/นโยบายที่เกี่ยวข้อง:
{retrieved_chunks}

ตอบในรูปแบบนี้:
{{
  "responsibility": "NORMAL_WEAR หรือ OCCUPANT_RESPONSIBILITY หรือ DAD_RESPONSIBILITY หรือ DISPUTED",
  "reasoning_th": "เหตุผล 2-3 ประโยคเป็นภาษาไทย",
  "reasoning_en": "2-3 sentence reasoning in English",
  "citations": ["พ.ร.บ. ที่ราชพัสดุ พ.ศ. 2562", "ระเบียบกระทรวงการคลังว่าด้วยการจัดหาประโยชน์ในที่ราชพัสดุ พ.ศ. 2552"],
  "recommended_action_th": "สิ่งที่ควรดำเนินการต่อไป",
  "responsibility_confidence_pct": 0
}}"""

FORCED_RESPONSIBILITY_INSTRUCTION = """คำตัดสินที่กำหนดไว้แล้ว: {responsibility}
ห้ามเปลี่ยนคำตัดสิน ให้เขียนเฉพาะ reasoning_th, reasoning_en, citations, \
recommended_action_th และ responsibility_confidence_pct เท่านั้น"""

REASONER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", USER_PROMPT),
])

SUMMARY_SYSTEM_PROMPT = """คุณเป็นผู้เชี่ยวชาญด้านนโยบายการใช้ประโยชน์ในที่ราชพัสดุของไทย ทำหน้าที่เป็นกลาง
สรุปผลการตรวจสอบสภาพการส่งมอบทั้งหมดเป็น JSON ที่มีสองฟิลด์: case_summary_th และ case_summary_en
ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น"""

SUMMARY_USER_PROMPT = """ผลการตรวจสอบทั้งหมด:
{verdicts_json}

ค่าใช้จ่ายประเมินรวม: {total_estimated_cost_thb} บาท
ความรับผิดชอบของ ธพส.: {total_dad_responsibility_thb} บาท
ความรับผิดชอบของผู้ครอบครอง: {total_occupant_responsibility_thb} บาท
ต้องส่งต่อการแก้ไขข้อพิพาท: {needs_dispute_resolution}

ตอบในรูปแบบนี้:
{{
  "case_summary_th": "สรุปการส่งมอบ 3-4 ประโยคเป็นภาษาไทย",
  "case_summary_en": "3-4 sentence handover summary in English"
}}"""

SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
    ("system", SUMMARY_SYSTEM_PROMPT),
    ("human", SUMMARY_USER_PROMPT),
])
