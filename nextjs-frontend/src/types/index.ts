export interface ConditionItem {
  item_id: string;
  item: string;
  description: string;
  estimated_cost_thb: number;
}

export interface ConditionAssessment {
  item_id: string;
  item: string;
  verdict: 'UNCHANGED' | 'NORMAL_WEAR' | 'PRE_EXISTING' | 'NEW_DAMAGE' | null;
  attributable_party: 'DAD' | 'OCCUPANT' | 'UNDETERMINED';
  confidence: number;
  prior_condition: string;
  current_condition: string;
  status: string;
  wear_and_tear: boolean;
  wear_and_tear_reason: string;
  notes: string;
}

export interface AgreementSummary {
  occupancy_start: string;
  occupancy_end: string;
  notice_period_days: number;
  monthly_fee_thb: number;
  deposit_amount_thb: number | null;
  deposit_months: number | null;
}

export interface ResponsibilityItem {
  item_id: string;
  item: string;
  estimated_cost_thb: number;
  occupant_responsible: boolean;
  agreement_clause: string | null;
  clause_found: boolean;
  pre_existing_disclosed: boolean;
  notes: string;
}

export interface NonCompliantClause {
  clause_text: string;
  reason_non_compliant: string;
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

export interface Agent01Result {
  condition_map: ConditionAssessment[];
  model_used: string;
}

export interface Agent02Result {
  pdf_filename: string | null;
  responsibility_map: ResponsibilityItem[];
  agreement_summary: AgreementSummary;
  non_compliant_clauses: NonCompliantClause[];
  ocr_used: boolean;
  extraction_confidence: number;
}

export interface Agent03Result {
  needs_dispute_resolution: boolean;
  documents_to_generate: string[];
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
  item_verdicts: ItemVerdict[];
  case_summary_th: string;
  case_summary_en: string;
}

export interface DocumentInfo {
  doc_type: string;
  pages: number;
  status: string;
  download_url?: string;
}

export interface Agent04Result {
  handover_id?: string;
  documents: Record<string, DocumentInfo>;
  generation_time_seconds: number;
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
}

export type CaseType = 'move_in' | 'move_out' | 'fit_out_inspection';

export type PipelineStep = 0 | 1 | 2 | 3 | 4;
export type StepState = 'idle' | 'active' | 'done' | 'error';

export interface PipelineResults {
  agent01?: Agent01Result;
  agent02?: Agent02Result;
  agent03?: Agent03Result;
  agent04?: Agent04Result;
}
