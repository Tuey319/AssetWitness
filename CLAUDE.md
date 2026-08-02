# AssetWitness

Agentic AI pipeline that certifies handover condition across DAD's (Dhanarak Asset
Development Co., Ltd.) property portfolio. Facilities staff or an occupant submits
condition photos and the occupancy/fit-out agreement; the system returns a per-item
responsibility verdict (normal wear / occupant / DAD / disputed) and up to 3
ready-to-file Thai documents. Repositioned from RoomWitness (BDI Bangkok Hackathon
2026), proposed for Sustainnovation 2026. Team: KP (lead, legal/policy research),
Beam (frontend, pitch), Tuey (tech lead, pipeline + backend).

## 4-Agent Pipeline

1. **Condition Comparison** (`assetwitness-pipeline/agent01_condition_comparison/`) —
   compares prior vs current condition photos per item. Llama-4-Scout via Groq.
2. **Agreement Parser** (`assetwitness-pipeline/agent02_agreement_parser/`) — reads
   the occupancy/fit-out agreement (pdfplumber), produces `agreement_summary`,
   `responsibility_map`, and `non_compliant_clauses`. Typhoon v2.
3. **Asset Policy Reasoning** (`assetwitness-pipeline/agent03_asset_policy_reasoning/`)
   — hard rules + ChromaDB RAG over the State Property Act/MOF Regulation corpus +
   Typhoon v2, classifies each item's `responsibility`.
4. **Report Generator** (`assetwitness-pipeline/services/agent04_service.py`) —
   Typhoon v2 + ReportLab (Platypus), synthesizes the 3 Thai documents.

## Repo Map

- `assetwitness-pipeline/` — 4 FastAPI microservices (`services/agent0{1,2,3,4}_service.py`,
  ports 8001–8004) plus their supporting Python packages
  (`agent01_condition_comparison/`, `agent02_agreement_parser/`,
  `agent03_asset_policy_reasoning/` incl. `asset_policy_corpus/`, `retriever.py`,
  `reasoner.py`, `document_selector.py`), `shared/` (Typhoon client), `chroma_db/`
  (vector store, gitignored), `outputs/` (generated PDFs, gitignored).
- `express-backend/` — Express/TypeScript proxy. Also owns the Portfolio Condition
  Dashboard's Postgres persistence (`prisma/`, `src/models/handoverCaseRepo.ts`,
  `src/controllers/dashboardController.ts`).
- `nextjs-frontend/` — Next.js 16 App Router web UI: `/app` (wizard + pipeline),
  `/dashboard` (Portfolio Condition Dashboard), `/move-in` (baseline condition vault).
- `assetwitness-app/` — Expo/React Native mobile app, same Express API.
- `docs/AssetWitness.md` — source pitch/requirements doc (not rewritten — this is
  the doc everything else aligns to).

## Data Contracts (drive the frontend)

These are the current JSON shapes the UI renders. Do not invent fields.

**Agent 01 condition** — `POST /api/v1/agent01` (multipart: `prior_condition`,
`current_condition` images + `condition_items` JSON) returns:
```
{ condition_map: [{ item_id, item, verdict: "PRE_EXISTING"|"UNCHANGED"|"NORMAL_WEAR"|"NEW_DAMAGE"|null,
  attributable_party: "DAD"|"OCCUPANT"|"UNDETERMINED", confidence, prior_condition, current_condition,
  status: "ok"|"unverifiable_by_cv", wear_and_tear, wear_and_tear_reason, notes }],
  model_used }
```

**Agent 02 agreement** — `POST /api/v1/agent02` (multipart: `agreement_file` +
`condition_items` JSON + occupancy/fee fields):
```
{ pdf_filename, responsibility_map: [{ item_id, item, estimated_cost_thb, occupant_responsible,
  agreement_clause, clause_found, pre_existing_disclosed, notes }],
  agreement_summary: { occupancy_start, occupancy_end, notice_period_days, monthly_fee_thb,
  deposit_amount_thb, deposit_months }, non_compliant_clauses: [{ clause_text, reason_non_compliant }],
  ocr_used, extraction_confidence }
```

**Agent 03 asset policy** — `POST /api/v1/agent03` (JSON: `condition_items`,
`condition_map`, `agreement_clause`, `case_type`, `handover_report_signed`):
```
{ needs_dispute_resolution, documents_to_generate: string[], total_estimated_cost_thb,
  total_dad_responsibility_thb, total_occupant_responsibility_thb,
  item_verdicts: [{ item_id, item, estimated_cost_thb,
  responsibility: "NORMAL_WEAR"|"OCCUPANT_RESPONSIBILITY"|"DAD_RESPONSIBILITY"|"DISPUTED",
  reasoning_th, reasoning_en, citations[], recommended_action_th, responsibility_confidence_pct }],
  case_summary_th, case_summary_en }
```

**Agent 04 report** — `POST /api/v1/agent04` (JSON: `documents_to_generate`, the 3
totals, `item_verdicts`, `case_summary_th/en`). Output: up to 3 Thai PDFs —
`condition_certification_report` (always), `fit_out_completion_checklist` (fit-out
cases), `liability_summary` (only when `needs_dispute_resolution`).

## HTTP API (express-backend — the real frontend contract)

- `POST /run/agent0{1,2,3,4}` — direct per-agent proxy, used by the Next.js wizard.
- `POST /full-analysis` — mobile-only orchestration of Agents 01→02→03 in one call,
  returns `HandoverAnalysis` (see `assetwitness-app/src/lib/types.ts`).
- `POST /generate-documents` — Agent 04 proxy with absolute `download_url` rewriting.
- `POST /extract-agreement` — PDF → `{text}` (pdf-parse).
- `GET /download/:handoverId/:docType` — streams a generated PDF.
- `POST /dashboard/cases`, `GET /dashboard/summary` — Portfolio Condition Dashboard.

## Run

```bash
cd assetwitness-pipeline
pip install -r requirements.txt
cp .env.example .env             # set GROQ_API_KEY + TYPHOON_API_KEY
python agent03_asset_policy_reasoning/seed_corpus.py   # seed ChromaDB (run ONCE)

python -m uvicorn services.agent01_service:app --port 8001 --reload
python -m uvicorn services.agent02_service:app --port 8002 --reload
python -m uvicorn services.agent03_service:app --port 8003 --reload
python -m uvicorn services.agent04_service:app --port 8004 --reload

cd ../express-backend
npm install && cp .env.example .env
npm run db:up && npm run db:generate   # Portfolio Dashboard Postgres (docker)
# apply prisma/migrations/*/migration.sql by hand — see CONTRIBUTING.md
npm run dev

cd ../nextjs-frontend
npm install && npm run dev
```

Env: `GROQ_API_KEY`, `TYPHOON_API_KEY` (required, `assetwitness-pipeline/.env`),
`DATABASE_URL` (required, `express-backend/.env`, points at the dashboard Postgres).

## Frontend Conventions

- Bilingual TH + EN: Thai primary, English secondary line.
- Responsibility color tokens: `NORMAL_WEAR`/`DAD_RESPONSIBILITY` = green,
  `DISPUTED` = amber, `OCCUPANT_RESPONSIBILITY` = red.
- Web flow: Landing → `/app` (4-step wizard: items → photos → agreement → review) →
  pipeline results inline → document downloads. No paywall — this is a DAD-side
  platform/processing license, not a consumer per-transaction product (see
  `docs/AssetWitness.md` Business Model).
