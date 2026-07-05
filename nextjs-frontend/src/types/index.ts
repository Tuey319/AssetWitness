export interface Claim {
  claim_id: string;
  item: string;
  description: string;
  amount_thb: number;
}

export interface CVResult {
  claim_id: string;
  item: string;
  verdict: 'UNCHANGED' | 'NORMAL_WEAR' | 'PRE_EXISTING' | 'NEW_DAMAGE' | null;
  confidence: number;
  move_in_condition: string;
  move_out_condition: string;
  status: string;
  supports_landlord_claim: string;
  wear_and_tear: boolean;
  wear_and_tear_reason: string;
  notes: string;
}

export interface ContractSummary {
  deposit_amount_thb: number;
  deposit_months: number;
  lease_start: string;
  lease_end: string;
  notice_period_days: number;
  monthly_rent_thb: number;
}

export interface LiabilityItem {
  claim_id: string;
  item: string;
  amount_thb: number;
  tenant_liable: boolean;
  clause_found: boolean;
  contract_clause?: string;
  notes: string;
}

export interface UnfairClause {
  clause_text: string;
  reason_void: string;
}

export interface ClaimVerdict {
  claim_id: string;
  item: string;
  amount_thb: number;
  verdict: 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL';
  reasoning_th: string;
  reasoning_en: string;
  citations: string[];
  recommended_action_th: string;
  claim_validity_pct: number;
  confidence: number;
}

export interface Agent01Result {
  damage_map: CVResult[];
  model_used: string;
}

export interface Agent02Result {
  pdf_filename: string | null;
  liability_map: LiabilityItem[];
  contract_summary: ContractSummary;
  unfair_clauses: UnfairClause[];
  ocr_used: boolean;
  extraction_confidence: number;
  landlord_promises: string[];
  tenant_promises: string[];
  deposit_mentions: string[];
  platforms: string[];
}

export interface Agent03Result {
  routing: string;
  documents_to_generate: string[];
  total_claimed_thb: number;
  total_unlawful_thb: number;
  verdicts: ClaimVerdict[];
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
  case_id?: string;
  documents: Record<string, DocumentInfo>;
  generation_time_seconds: number;
  total_unlawful_amount_thb: number;
}

export type PipelineStep = 0 | 1 | 2 | 3 | 4;
export type StepState = 'idle' | 'active' | 'done' | 'error';

export interface PipelineResults {
  agent01?: Agent01Result;
  agent02?: Agent02Result;
  agent03?: Agent03Result;
  agent04?: Agent04Result;
}
