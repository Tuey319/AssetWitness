from typing import Literal
from pydantic import BaseModel, ConfigDict

Responsibility = Literal["NORMAL_WEAR", "OCCUPANT_RESPONSIBILITY", "DAD_RESPONSIBILITY", "DISPUTED"]
CaseType = Literal["move_in", "move_out", "fit_out_inspection"]


class CVResult(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    item_id: str
    verdict: str | None = None        # PRE_EXISTING | UNCHANGED | NORMAL_WEAR | NEW_DAMAGE | None
    attributable_party: str = "UNDETERMINED"
    confidence: float = 0.0
    prior_condition: str = ""
    current_condition: str = ""
    status: str = "ok"                # "ok" or "unverifiable_by_cv"


class Agent03Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    handover_id: str
    case_type: CaseType
    condition_map: list[CVResult]      # from Agent 01 — pass empty list if Agent 01 not run
    responsibility_map: list           # from Agent 02
    agreement_summary: dict            # from Agent 02
    handover_report_signed: bool       # was a joint condition report signed for this handover?


class ItemVerdict(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    item_id: str
    item: str
    estimated_cost_thb: float
    responsibility: Responsibility
    reasoning_th: str
    reasoning_en: str
    citations: list[str]
    recommended_action_th: str
    responsibility_confidence_pct: int


class Agent03Output(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    handover_id: str
    needs_dispute_resolution: bool
    documents_to_generate: list[str]
    total_estimated_cost_thb: float
    total_dad_responsibility_thb: float
    total_occupant_responsibility_thb: float
    item_verdicts: list[ItemVerdict]
    case_summary_th: str
    case_summary_en: str
