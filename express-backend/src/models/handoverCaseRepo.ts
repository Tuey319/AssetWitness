import { getDb } from '../db/client';

export interface HandoverCaseInput {
  building: string;
  case_type: string;
  needs_dispute_resolution: boolean;
  total_estimated_cost_thb: number;
  total_dad_responsibility_thb: number;
  total_occupant_responsibility_thb: number;
}

export function create(data: HandoverCaseInput) {
  return getDb().handoverCase.create({ data });
}

export function findAll() {
  return getDb().handoverCase.findMany({ orderBy: { created_at: 'desc' } });
}
