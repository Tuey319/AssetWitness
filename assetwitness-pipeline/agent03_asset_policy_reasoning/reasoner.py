import logging

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser

from agent03_asset_policy_reasoning.prompts import (
    FORCED_RESPONSIBILITY_INSTRUCTION,
    REASONER_PROMPT,
)

logger = logging.getLogger(__name__)


def apply_hard_rules(
    cv_verdict: str | None,
    cv_confidence: float,
    handover_report_signed: bool,
) -> str | None:
    """
    Apply deterministic rules before calling Typhoon v2.

    Hard rules take precedence over LLM reasoning. Returns a forced
    responsibility string when a rule fires, or None to let the LLM reason
    freely. This structure carries over from the underlying condition-change
    taxonomy (see agent01's ConditionVerdict) — a condition that's already
    there, unchanged, or ordinary wear isn't chargeable to whoever is moving
    in/out, regardless of which specific asset-policy regime applies; only
    genuinely new, occupant-caused damage needs policy/agreement-grounded
    reasoning at all.

    cv_verdict is None when condition_map is empty (Agent 01 not run), in
    which case this function always returns None.

    Args:
        cv_verdict: Condition verdict label from Agent 01, or None.
        cv_confidence: Confidence score from Agent 01 [0.0, 1.0].
        handover_report_signed: Whether a signed joint condition report exists for this handover.

    Returns:
        Forced responsibility string or None.
    """
    if cv_verdict == "PRE_EXISTING":
        # Condition predates this handover — DAD's asset, DAD's responsibility
        return "DAD_RESPONSIBILITY"
    if cv_verdict == "UNCHANGED":
        return "NORMAL_WEAR"
    if cv_verdict == "NORMAL_WEAR":
        return "NORMAL_WEAR"
    if cv_verdict == "NEW_DAMAGE" and not handover_report_signed:
        # Damage is new but baseline condition cannot be proved without a signed report
        return "DISPUTED"
    if cv_verdict is not None and cv_confidence < 0.60:
        # Insufficient visual confidence — do not let hard rule determine outcome
        return "DISPUTED"
    if cv_verdict == "unverifiable_by_cv":
        # No visual data available — LLM reasons from agreement + policy alone
        return None
    return None


def build_reasoner_chain(llm: ChatOpenAI):
    """
    Assemble the LangChain chain for per-item policy reasoning.

    Chain: REASONER_PROMPT | llm | JsonOutputParser

    Args:
        llm: A ChatOpenAI instance (Typhoon v2).

    Returns:
        A runnable LangChain chain.
    """
    return REASONER_PROMPT | llm | JsonOutputParser()


def reason_item(
    item: str,
    description: str,
    estimated_cost_thb: float,
    cv_verdict: str | None,
    cv_confidence: float,
    agreement_liable: bool,
    handover_report_signed: bool,
    formatted_chunks: str,
    forced_responsibility: str | None,
    llm: ChatOpenAI,
) -> dict:
    """
    Produce a responsibility classification for a single handover condition item.

    If forced_responsibility is set, Typhoon only writes reasoning and
    citations — the responsibility value is locked. Otherwise Typhoon
    determines the responsibility too.

    Args:
        item: Name of the condition item.
        description: Description of what changed.
        estimated_cost_thb: Estimated remediation cost in Thai Baht.
        cv_verdict: Condition verdict from Agent 01 (or None).
        cv_confidence: Condition-comparison confidence score.
        agreement_liable: Whether the occupant is liable per the agreement (from Agent 02).
        handover_report_signed: Whether a signed joint condition report exists.
        formatted_chunks: Formatted policy/regulation chunks from retriever.
        forced_responsibility: Pre-determined responsibility or None for LLM to decide.
        llm: A ChatOpenAI instance (Typhoon v2).

    Returns:
        Dict matching the ItemVerdict schema (without item_id/item/estimated_cost_thb —
        those are added by the caller).
    """
    if forced_responsibility:
        forced_instruction = FORCED_RESPONSIBILITY_INSTRUCTION.format(responsibility=forced_responsibility)
    else:
        forced_instruction = ""

    chain = build_reasoner_chain(llm)
    result = chain.invoke({
        "item": item,
        "description": description,
        "estimated_cost_thb": estimated_cost_thb,
        "cv_verdict": cv_verdict or "ไม่มีข้อมูลภาพ (Agent 01 not run)",
        "cv_confidence": f"{cv_confidence:.0%}",
        "agreement_liable": "ใช่" if agreement_liable else "ไม่ใช่",
        "handover_report_signed": "ใช่" if handover_report_signed else "ไม่ใช่",
        "forced_responsibility_instruction": forced_instruction,
        "retrieved_chunks": formatted_chunks,
    })

    # If forced_responsibility is set, override whatever the LLM wrote
    if forced_responsibility:
        result["responsibility"] = forced_responsibility

    return result
