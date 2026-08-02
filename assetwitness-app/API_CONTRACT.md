# AssetWitness — Frontend ↔ Backend API Contract (Mobile)

This is the contract the `assetwitness-app` (Expo/React Native) client depends on. The
TypeScript types in `src/lib/types.ts` are the **authoritative response shapes** — keep
server output in sync with them. The reference implementation is
`express-backend/src/controllers/fullAnalysisController.ts`.

## Config & CORS

- **Base URL**: client reads `EXPO_PUBLIC_API_BASE` (see `.env.example`). No trailing slash.
- **CORS**: the **web** build sends cross-origin requests, so the server must allow the
  app origin (Express already runs `cors()` with no origin restriction). Native
  iOS/Android builds do **not** need CORS.
- **Auth**: none (hackathon/pilot scope).
- **Mock mode**: when `EXPO_PUBLIC_USE_MOCK !== 'false'` the client never calls the
  network and instead builds a result from `src/lib/fixtures.ts` — `buildMockResult`
  and `buildMockDocsResult` derive their output from the form the user actually
  submitted (item names, costs, case type), not hardcoded fixture data. Set
  `EXPO_PUBLIC_USE_MOCK=false` to integrate with a real backend.

## Error envelope

Every route returns `{ "error": string }` with a non-2xx status on failure
(`src/lib/types.ts` `ApiError`). The client throws the `error` string. Known statuses:
`400` (bad input), `422` (unprocessable, e.g. OCR found no text), `500` (server error).

---

## `POST /full-analysis` — primary endpoint

`multipart/form-data`. Orchestrates Agent 01 → 02 → 03 for one handover.

**Fields** (from `src/lib/api.ts` `analyze`):

| field | type | required | notes |
|---|---|---|---|
| `condition_items` | JSON string of `{item_id, item, description, estimated_cost_thb}[]` | ✅ | ≥1 or `400` |
| `prior_condition_image` | file (repeated) | optional | baseline condition photos |
| `current_condition_image` | file (repeated) | optional | handover-time photos |
| `agreement_clause` | string | optional | sent even if empty |
| `occupancy_start` / `occupancy_end` | string (`YYYY-MM-DD`) | optional | sent even if empty |
| `monthly_fee` | string (number) | optional | defaults to `"0"` |
| `case_type` | `"move_in"\|"move_out"\|"fit_out_inspection"` | optional | defaults to `move_out` |
| `handover_report_signed` | string (`"true"`/`"false"`) | optional | defaults to `false` |

**Response** = `HandoverAnalysis` (`src/lib/types.ts`):

```jsonc
{
  "handover_id": "AW-...",
  "items": [
    {
      "condition_item": { "item_id": "I001", "item": "...", "description": "...", "estimated_cost_thb": 5000 },
      "condition": { "item_id": "I001", "verdict": "PRE_EXISTING|UNCHANGED|NORMAL_WEAR|NEW_DAMAGE|null",
                     "attributable_party": "DAD|OCCUPANT|UNDETERMINED", "confidence": 0.82,
                     "prior_condition": "...", "current_condition": "...", "status": "ok|unverifiable_by_cv" }, // or null
      "verdict": { "item_id": "I001", "item": "...", "estimated_cost_thb": 5000,
                   "responsibility": "NORMAL_WEAR|OCCUPANT_RESPONSIBILITY|DAD_RESPONSIBILITY|DISPUTED",
                   "reasoning_th": "...", "reasoning_en": "...", "citations": ["..."],
                   "recommended_action_th": "...", "responsibility_confidence_pct": 82 } // or null
    }
  ],
  "model_used": "...",
  "agreement_summary": { "occupancy_start": "...", "occupancy_end": "...", "notice_period_days": 30,
                         "monthly_fee_thb": 10000, "deposit_amount_thb": null, "deposit_months": null }, // or null
  "non_compliant_clauses": [ { "clause_text": "...", "reason_non_compliant": "..." } ],
  "pdf_filename": null,
  "needs_dispute_resolution": false,
  "documents_to_generate": ["condition_certification_report"],
  "total_estimated_cost_thb": 5000,
  "total_dad_responsibility_thb": 0,
  "total_occupant_responsibility_thb": 5000,
  "case_summary_th": "...",
  "case_summary_en": "..."
}
```

### Contract rules the backend MUST honor

1. **Per-item `condition` may be absent.** When no photos were provided for that item,
   return `"condition": null`. Same for `verdict` if Agent 03 didn't produce one.
2. The server may return **more** fields than listed; the client ignores extras. Do not
   **remove** any listed field.
3. **Responsibility totals are backend-computed** (Agent 03's aggregation, passed
   through unchanged) — the client does not re-derive them.
4. **Latency.** The pipeline can take minutes; the client does one blocking request
   with a 5-minute timeout (`src/lib/api.ts`). If real latency risks mobile timeouts at
   scale, consider an async job (`202` + job id) + poll/`GET status` — not implemented
   today.

---

## `POST /generate-documents` — Agent 04

`application/json`. Called from `src/app/documents.tsx` right after `/full-analysis`
returns — no separate PII-collection step exists; the request body is built directly
from the `HandoverAnalysis` result (see `buildDocsForm` in `documents.tsx`).

**Request** = `GenerateDocsForm` (`src/lib/types.ts`):

```jsonc
{
  "documents_to_generate": ["condition_certification_report"],
  "total_estimated_cost_thb": 5000,
  "total_dad_responsibility_thb": 0,
  "total_occupant_responsibility_thb": 5000,
  "item_verdicts": [ /* non-null verdicts from HandoverAnalysis.items */ ],
  "case_summary_th": "...",
  "case_summary_en": "..."
}
```

**Response** = `GenerateDocsResult`:

```jsonc
{
  "handover_id": "AW-...",
  "documents": {
    "condition_certification_report": { "download_url": "https://...", "pages": 2, "status": "generated", "doc_type": "..." }
  },
  "generation_time_seconds": 4.2,
  "total_estimated_cost_thb": 5000,
  "total_dad_responsibility_thb": 0,
  "total_occupant_responsibility_thb": 5000
}
```

The client renders each `documents[key]` as a card and opens `download_url` in a
browser, so `download_url` must be a publicly fetchable URL — Express rewrites Agent
04's internal path to `{base}/download/{handover_id}/{docType}` before returning it.

---

## `GET /health`

```jsonc
{ "status": "ok", "corpus_loaded": true }
```

## Available but currently unused by the app

- `POST /extract-agreement` — `agreement_file` (PDF) → `{ "text": "..." }`. Used by the
  Next.js web wizard, not currently wired into the mobile flow.
- `POST /run/agent01`, `/run/agent02`, `/run/agent03`, `/run/agent04` — direct
  per-agent proxies, used by the Next.js web wizard's step-by-step pipeline UI. Mobile
  uses the combined `/full-analysis` instead.
- `POST /dashboard/cases`, `GET /dashboard/summary` — Portfolio Condition Dashboard,
  currently only posted to from the Next.js web wizard.
