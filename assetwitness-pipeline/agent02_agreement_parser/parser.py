import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser

from agent02_agreement_parser.prompts import PARSER_PROMPT

logger = logging.getLogger(__name__)


def build_parser_chain(llm: ChatOpenAI):
    """
    Assemble the LangChain chain for agreement parsing.

    Chain: PARSER_PROMPT | llm | JsonOutputParser

    Args:
        llm: A ChatOpenAI instance (Typhoon v2).

    Returns:
        A runnable LangChain chain that accepts {agreement_text, item_list}
        and returns a parsed dict.
    """
    return PARSER_PROMPT | llm | JsonOutputParser()


def parse_agreement(agreement_text: str, condition_items: list[dict], llm: ChatOpenAI) -> dict:
    """
    Parse an occupancy/lease/fit-out agreement against the handover's condition
    items using Typhoon v2 via LangChain.

    Formats the item list as a numbered Thai list for prompt injection, invokes
    the chain, and retries once with a JSON correction instruction on decode failure.

    Args:
        agreement_text: Raw text extracted from the agreement PDF.
        condition_items: List of item dicts (keys: item_id, item, estimated_cost_thb, description).
        llm: A ChatOpenAI instance (Typhoon v2).

    Returns:
        Parsed dict matching the Agent02Output schema fields
        (responsibility_map, agreement_summary, non_compliant_clauses).
    """
    item_lines = [
        f"{i + 1}. {c['item']} — {c['description']} (est. {c['estimated_cost_thb']:,.0f} บาท)"
        for i, c in enumerate(condition_items)
    ]
    item_list = "\n".join(item_lines)

    chain = build_parser_chain(llm)

    try:
        return chain.invoke({"agreement_text": agreement_text, "item_list": item_list})
    except (json.JSONDecodeError, ValueError) as first_err:
        logger.warning("First parse attempt failed (%s) — retrying with correction prompt", first_err)

    # Retry: append a correction instruction so the model fixes its own output
    from langchain_core.prompts import ChatPromptTemplate
    correction_prompt = ChatPromptTemplate.from_messages([
        ("system", "คุณเป็นผู้เชี่ยวชาญด้านสัญญาการใช้ประโยชน์ที่ราชพัสดุของไทย"),
        ("human",
         "ครั้งก่อนคุณตอบผิดรูปแบบ JSON กรุณาตอบใหม่ในรูปแบบ JSON ที่ถูกต้องเท่านั้น "
         "ห้ามมีข้อความนอก JSON\n\n"
         f"สัญญา:\n{agreement_text}\n\nรายการที่ต้องตรวจสอบ:\n{item_list}"),
    ])
    correction_chain = correction_prompt | llm | JsonOutputParser()
    return correction_chain.invoke({})
