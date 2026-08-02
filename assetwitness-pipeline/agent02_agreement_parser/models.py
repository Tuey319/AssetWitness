from pydantic import BaseModel, ConfigDict


class ConditionItemRef(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    item_id: str
    item: str
    estimated_cost_thb: float
    description: str


class ResponsibilityItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    item: str
    occupant_responsible: bool
    agreement_clause: str | None
    clause_found: bool
    pre_existing_disclosed: bool
    notes: str


class AgreementSummary(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    occupancy_start: str
    occupancy_end: str
    notice_period_days: int
    monthly_fee_thb: float
    deposit_amount_thb: float | None = None    # optional — gov't agencies often don't post a consumer-style deposit
    deposit_months: int | None = None


class NonCompliantClause(BaseModel):
    """A clause that conflicts with the State Property Act / MOF Regulation on state-property leasing."""
    model_config = ConfigDict(str_strip_whitespace=True)

    clause_text: str
    reason_non_compliant: str


class Agent02Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    handover_id: str
    agreement_document_url: str    # s3://bucket/handover_id/agreement.pdf  (or local path for demo)
    condition_items: list[ConditionItemRef]


class Agent02Output(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    handover_id: str
    responsibility_map: list[ResponsibilityItem]
    agreement_summary: AgreementSummary
    non_compliant_clauses: list[NonCompliantClause]
    ocr_used: bool
    extraction_confidence: float
