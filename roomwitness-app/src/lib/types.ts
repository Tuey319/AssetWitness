export interface LandlordClaim {
  item: string;
  description: string;
  amount_thb: number;
}

export interface CV {
  move_in_condition: string;
  move_out_condition: string;
  wear_and_tear: boolean;
  likely_tenant_caused: boolean;
  low_visibility: boolean;
  supports_landlord_claim: 'YES' | 'NO' | 'PARTIAL';
  confidence: number;
}

export interface Dimensions {
  pre_existence: string;
  wear_and_tear: string;
  proportionality: string;
  contractual_clarity: string;
}

export interface LegalBasis {
  section: string;
  source: 'CCC' | 'OCPB';
  excerpt: string;
  favors: 'TENANT' | 'LANDLORD';
}

export interface Legal {
  classification: 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL';
  confidence: number;
  dimensions: Dimensions;
  legal_basis: LegalBasis[];
  summary_th: string;
}

export interface ClaimResult {
  claim: LandlordClaim;
  cv: CV;
  legal: Legal;
}

export interface CVSummary {
  total_claims: number;
  supported_claims: number;
  disputed_claims: number;
  partial_claims: number;
  total_disputed_amount: number;
}

export interface EvidenceSummary {
  landlord_promises: string[];
  tenant_promises: string[];
  deposit_mentions: string[];
  platforms: string[];
}

export interface FullAnalysis {
  claims: ClaimResult[];
  cv_summary: CVSummary | null;
  evidence_summary: EvidenceSummary | null;
  images_used: { move_in: string | null; move_out: string | null };
}

export interface AnalyzeForm {
  claims: LandlordClaim[];
  moveIn?: { uri: string };
  moveOut?: { uri: string };
  screenshots?: { uri: string }[];
  contractClause?: string;
  landlordPromises?: string;
  tenantPromises?: string;
}
