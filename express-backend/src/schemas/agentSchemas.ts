import { z } from 'zod';

const claimSchema = z.object({
  claim_id:    z.string(),
  item:        z.string(),
  description: z.string(),
  amount_thb:  z.number(),
});

// Agent 01 — multipart body (claims is JSON-encoded string)
export const agent01BodySchema = z.object({
  claims: z.string().default('[]'),
});

// Agent 02 — multipart body
export const agent02BodySchema = z.object({
  claims:          z.string().default('[]'),
  contract_clause: z.string().default(''),
  lease_start:     z.string().default(''),
  lease_end:       z.string().default(''),
  deposit_amount:  z.string().default('0'),
  monthly_rent:    z.string().default('0'),
});

// Agent 03 — JSON body
export const agent03BodySchema = z.object({
  claims:              z.array(claimSchema),
  damage_map:          z.array(z.unknown()).default([]),
  contract_clause:     z.string().default(''),
  landlord_unit_count: z.number().default(0),
  has_void_clause:     z.boolean().default(false),
});

// Agent 04 — JSON body
export const agent04BodySchema = z.object({
  documents_to_generate: z.array(z.string()),
  total_unlawful_thb:    z.number(),
});

export type Agent01Body = z.infer<typeof agent01BodySchema>;
export type Agent02Body = z.infer<typeof agent02BodySchema>;
export type Agent03Body = z.infer<typeof agent03BodySchema>;
export type Agent04Body = z.infer<typeof agent04BodySchema>;
