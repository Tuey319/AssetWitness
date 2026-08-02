import { z } from 'zod';

const conditionItemSchema = z.object({
  item_id:            z.string(),
  item:                z.string(),
  description:         z.string(),
  estimated_cost_thb:  z.number(),
});

// Agent 01 — multipart body (condition_items is JSON-encoded string)
export const agent01BodySchema = z.object({
  condition_items: z.string().default('[]'),
});

// Agent 02 — multipart body
export const agent02BodySchema = z.object({
  condition_items: z.string().default('[]'),
  agreement_clause: z.string().default(''),
  occupancy_start:  z.string().default(''),
  occupancy_end:    z.string().default(''),
  monthly_fee:      z.string().default('0'),
});

// Agent 03 — JSON body
export const agent03BodySchema = z.object({
  condition_items:        z.array(conditionItemSchema),
  condition_map:          z.array(z.unknown()).default([]),
  agreement_clause:       z.string().default(''),
  case_type:              z.enum(['move_in', 'move_out', 'fit_out_inspection']).default('move_out'),
  handover_report_signed: z.boolean().default(false),
});

// Agent 04 — JSON body
export const agent04BodySchema = z.object({
  documents_to_generate:              z.array(z.string()),
  total_estimated_cost_thb:           z.number(),
  total_dad_responsibility_thb:       z.number().optional().default(0),
  total_occupant_responsibility_thb:  z.number().optional().default(0),
  item_verdicts:                      z.array(z.unknown()).optional().default([]),
  case_summary_th:                    z.string().optional().default(''),
  case_summary_en:                    z.string().optional().default(''),
});

// POST /generate-documents — JSON body (extra client fields like occupant/DAD
// PII are stripped; only what Agent 04 consumes is forwarded)
export const generateDocumentsBodySchema = z.object({
  documents_to_generate: z.array(z.string())
    .default(['condition_certification_report']),
  total_estimated_cost_thb:           z.number().default(0),
  total_dad_responsibility_thb:       z.number().optional().default(0),
  total_occupant_responsibility_thb:  z.number().optional().default(0),
  item_verdicts:                      z.array(z.unknown()).optional().default([]),
  case_summary_th:                    z.string().optional().default(''),
  case_summary_en:                    z.string().optional().default(''),
});

export type Agent01Body = z.infer<typeof agent01BodySchema>;
export type Agent02Body = z.infer<typeof agent02BodySchema>;
export type Agent03Body = z.infer<typeof agent03BodySchema>;
export type Agent04Body = z.infer<typeof agent04BodySchema>;
