export interface ConditionItem {
  item_id: string;
  item: string;
  description: string;
  estimated_cost_thb: number;
}

/**
 * A free, no-AI condition photo record saved on-device at occupancy start. Kept
 * around so facilities staff don't have to re-shoot baseline photos every
 * handover cycle for the same space.
 */
export interface ConditionRecord {
  id: string;
  createdAt: string;
  label: string;
  photoUris: string[];
}

/** A saved history entry for a completed handover case — powers Home/History/Profile. */
export interface CaseRecord {
  id: string;
  createdAt: string;
  items: string[];
  totalEstimatedCost: number;
  totalDadResponsibility: number;
  needsDisputeResolution: boolean;
}

export type ConditionVerdict = 'PRE_EXISTING' | 'UNCHANGED' | 'NORMAL_WEAR' | 'NEW_DAMAGE';
export type AttributableParty = 'DAD' | 'OCCUPANT' | 'UNDETERMINED';

export interface ConditionAssessment {
  item_id: string;
  verdict: ConditionVerdict | null;
  attributable_party: AttributableParty;
  confidence: number;
  prior_condition: string;
  current_condition: string;
  status: 'ok' | 'unverifiable_by_cv';
  wear_and_tear?: boolean;
  notes?: string;
}

export type Responsibility = 'NORMAL_WEAR' | 'OCCUPANT_RESPONSIBILITY' | 'DAD_RESPONSIBILITY' | 'DISPUTED';

export interface ItemVerdict {
  item_id: string;
  item: string;
  estimated_cost_thb: number;
  responsibility: Responsibility;
  reasoning_th: string;
  reasoning_en: string;
  citations: string[];
  recommended_action_th: string;
  responsibility_confidence_pct: number;
}

export interface HandoverItemResult {
  condition_item: ConditionItem;
  // Backend returns null when no photos were provided for this item.
  condition: ConditionAssessment | null;
  verdict: ItemVerdict | null;
}

export interface AgreementSummary {
  occupancy_start: string;
  occupancy_end: string;
  notice_period_days: number;
  monthly_fee_thb: number;
  deposit_amount_thb: number | null;
  deposit_months: number | null;
}

export interface NonCompliantClause {
  clause_text: string;
  reason_non_compliant: string;
}

export interface HandoverAnalysis {
  handover_id: string;
  items: HandoverItemResult[];
  model_used: string | null;
  agreement_summary: AgreementSummary | null;
  non_compliant_clauses: NonCompliantClause[];
  pdf_filename: string | null;
  needs_dispute_resolution: boolean;
  documents_to_generate: string[];
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
  case_summary_th: string;
  case_summary_en: string;
}

export type CaseType = 'move_in' | 'move_out' | 'fit_out_inspection';

export interface AnalyzeForm {
  conditionItems: ConditionItem[];
  priorConditionUris?: string[];
  currentConditionUris?: string[];
  agreementClause?: string;
  occupancyStart?: string;
  occupancyEnd?: string;
  monthlyFee?: number;
  caseType?: CaseType;
  handoverReportSigned?: boolean;
}

/** Error envelope returned by every portal route on failure: `{ error: string }`. */
export interface ApiError {
  error: string;
}

// ── Document generation (Agent 04) ─────────────────────────────────

/** Request body for POST /generate-documents (matches Agent03Output fields Agent04 consumes). */
export interface GenerateDocsForm {
  documents_to_generate: string[];
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
  item_verdicts: ItemVerdict[];
  case_summary_th: string;
  case_summary_en: string;
}

export interface DocumentResult {
  download_url: string;
  pages: number;
  status: string;
  doc_type: string;
}

/** Response from POST /generate-documents (Agent04Output). */
export interface GenerateDocsResult {
  handover_id: string;
  documents: Record<string, DocumentResult>;
  generation_time_seconds: number;
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
}
