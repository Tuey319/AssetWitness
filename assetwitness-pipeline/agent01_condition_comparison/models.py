from typing import Literal
from pydantic import BaseModel, ConfigDict

# Same 4-way taxonomy as the RoomWitness prototype this is derived from — it's
# a domain-agnostic condition-change classification (was this already there /
# unchanged / normal wear / newly caused), not specific to consumer deposit law.
ConditionVerdict = Literal["PRE_EXISTING", "UNCHANGED", "NORMAL_WEAR", "NEW_DAMAGE"]

# Who the change is attributable to, if determinable from photos alone.
# Distinct from the final `responsibility` classification Agent 03 produces —
# this is Agent 01's own read of the visual evidence, before agreement terms
# and policy are applied.
AttributableParty = Literal["DAD", "OCCUPANT", "UNDETERMINED"]


class ConditionItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    item_id: str
    item: str
    description: str
    estimated_cost_thb: float
    prior_condition_image_url: str    # s3:// or local path — the space's last recorded condition
    current_condition_image_url: str  # s3:// or local path — this handover's photos


class Agent01Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    handover_id: str
    condition_items: list[ConditionItem]


class CVResult(BaseModel):
    """Schema consumed by Agent 03 — must match agent03_asset_policy_reasoning/models.py exactly."""
    model_config = ConfigDict(str_strip_whitespace=True)

    item_id: str
    verdict: ConditionVerdict | None = None   # None = LLM decides in Agent 03
    attributable_party: AttributableParty = "UNDETERMINED"
    confidence: float = 0.0
    prior_condition: str = ""
    current_condition: str = ""
    status: str = "ok"                        # "ok" or "unverifiable_by_cv"


class Agent01Output(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    handover_id: str
    condition_map: list[CVResult]
    model_used: str


def translate_to_cv_result(item_id: str, raw: dict) -> CVResult:
    """
    Bridge between Groq Llama-4-Scout's assessment output and Agent 03's CVResult schema.

    Groq output fields used:
        change_detected: bool
        wear_and_tear: bool
        likely_occupant_caused: bool | None
        confidence: float
        prior_condition: str
        current_condition: str

    Mapping to ConditionVerdict / AttributableParty:
        change_detected=False                                        -> UNCHANGED, party=UNDETERMINED (no change to attribute)
        wear_and_tear=True                                            -> NORMAL_WEAR, party=UNDETERMINED (ordinary use, not chargeable to anyone)
        change_detected=True AND likely_occupant_caused=False         -> PRE_EXISTING, party=DAD (condition predates this handover)
        change_detected=True AND likely_occupant_caused=True          -> NEW_DAMAGE, party=OCCUPANT
        confidence < 0.30                                             -> status=unverifiable_by_cv, verdict=None
        anything else (null likely_occupant_caused)                  -> verdict=None, party=UNDETERMINED (Agent 03 LLM decides)
    """
    confidence = float(raw.get("confidence", 0.0))
    change_detected = raw.get("change_detected")
    wear_and_tear = raw.get("wear_and_tear")
    likely_occupant_caused = raw.get("likely_occupant_caused")

    if confidence < 0.30:
        return CVResult(
            item_id=item_id,
            verdict=None,
            attributable_party="UNDETERMINED",
            confidence=confidence,
            prior_condition=raw.get("prior_condition", ""),
            current_condition=raw.get("current_condition", ""),
            status="unverifiable_by_cv",
        )

    verdict: ConditionVerdict | None = None
    party: AttributableParty = "UNDETERMINED"

    if change_detected is False:
        verdict = "UNCHANGED"
    elif wear_and_tear is True:
        verdict = "NORMAL_WEAR"
    elif change_detected is True and likely_occupant_caused is False:
        verdict = "PRE_EXISTING"
        party = "DAD"
    elif change_detected is True and likely_occupant_caused is True:
        verdict = "NEW_DAMAGE"
        party = "OCCUPANT"
    # null likely_occupant_caused / assessment failure -> verdict=None (Agent 03 LLM decides)

    return CVResult(
        item_id=item_id,
        verdict=verdict,
        attributable_party=party,
        confidence=confidence,
        prior_condition=raw.get("prior_condition", ""),
        current_condition=raw.get("current_condition", ""),
        status="ok",
    )
