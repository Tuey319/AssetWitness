import { z } from 'zod';

export const createHandoverCaseSchema = z.object({
  building: z.string().min(1),
  case_type: z.enum(['move_in', 'move_out', 'fit_out_inspection']),
  needs_dispute_resolution: z.boolean().default(false),
  total_estimated_cost_thb: z.number(),
  total_dad_responsibility_thb: z.number().default(0),
  total_occupant_responsibility_thb: z.number().default(0),
});
