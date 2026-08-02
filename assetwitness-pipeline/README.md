# AssetWitness — Python AI Services

Four FastAPI microservices that power the AssetWitness handover-certification pipeline.

## Pipeline

```
POST /api/v1/agent01  →  condition_map[]        (condition photo comparison)
POST /api/v1/agent02  →  responsibility_map[]    (agreement parsing)
POST /api/v1/agent03  →  item_verdicts[] + documents_to_generate  (asset policy reasoning)
POST /api/v1/agent04  →  PDFs saved locally      (report generation)
GET  /api/v1/download/{handover_id}/{doc_type}    (PDF download)
```

## Agent Summary

| Agent | Service file | LLM | Port |
|-------|-------------|-----|------|
| **01 — Condition Comparison** | `services/agent01_service.py` | Groq Llama-4-Scout | 8001 |
| **02 — Agreement Parser** | `services/agent02_service.py` | pdfplumber + Typhoon v2 | 8002 |
| **03 — Asset Policy Reasoning** | `services/agent03_service.py` | Typhoon v2 + ChromaDB RAG | 8003 |
| **04 — Report Generator** | `services/agent04_service.py` | Typhoon v2 + ReportLab | 8004 |

## Setup

### 1 — Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
GROQ_API_KEY=...          # https://console.groq.com (free)
TYPHOON_API_KEY=...       # https://typhoon.apps.opentyphoon.ai
TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1
TYPHOON_MODEL=typhoon-v2-70b-instruct
CHROMA_PERSIST_DIR=./chroma_db
```

### 2 — Install dependencies

> **Windows:** use `python -m pip` — plain `pip` fails with the uv trampoline.

```bash
python -m pip install -r requirements.txt
```

> `langchain-core`/`langchain-openai` are pinned `<1.0` — the 1.x line pulls in a
> `langsmith` release that requires `xxhash` + `uuid_utils` native DLLs, which Windows
> Application Control blocks on some dev machines. `<1.0` avoids that dependency chain
> entirely while keeping the same LangChain API surface this codebase uses.

### 3 — Seed ChromaDB (run ONCE)

Loads the State Property Act B.E. 2562, MOF Regulation B.E. 2552, Procurement Act
B.E. 2560, and DAD-policy placeholder chunks into ChromaDB. Re-run only if you update
`agent03_asset_policy_reasoning/asset_policy_corpus/*.json`.

```bash
python agent03_asset_policy_reasoning/seed_corpus.py
```

Data is persisted to `chroma_db/` — no need to reseed on restart.

### 4 — Start services

> **Windows:** use `python -m uvicorn` — plain `uvicorn` fails with the uv trampoline.

Run each command in a separate terminal from `assetwitness-pipeline/`:

```bash
python -m uvicorn services.agent01_service:app --port 8001 --reload
python -m uvicorn services.agent02_service:app --port 8002 --reload
python -m uvicorn services.agent03_service:app --port 8003 --reload
python -m uvicorn services.agent04_service:app --port 8004 --reload
```

Interactive docs at `http://localhost:800X/docs`.

## Agent Details

### Agent 01 — Condition Comparison

Compares prior vs current condition photos using Groq's Llama-4-Scout vision model.

**Input:** multipart form — `prior_condition` (image(s)), `current_condition`
(image(s)), `condition_items` (JSON string)
**Output:** `condition_map[]` — per-item condition verdict (`NEW_DAMAGE`,
`NORMAL_WEAR`, `PRE_EXISTING`, `UNCHANGED`, `unverifiable_by_cv`)

### Agent 02 — Agreement Parser

Extracts occupancy dates, notice period, monthly fee, an occupant responsibility map,
and non-compliant clauses from the occupancy/fit-out agreement.

**Input:** multipart form — `agreement_file` (PDF/image), `condition_items` (JSON
string), occupancy/fee metadata fields
**Output:** `responsibility_map[]`, `agreement_summary{}`, `non_compliant_clauses[]`

Extraction is pdfplumber (no LLM); the responsibility map and non-compliant clauses
are produced by Typhoon v2 reasoning over the extracted text.

### Agent 03 — Asset Policy Reasoning

Applies deterministic hard rules then calls Typhoon v2 with ChromaDB-retrieved
state-property policy context for per-item responsibility verdicts.

**Input:** JSON — `condition_items[]`, `condition_map[]`, `agreement_clause`,
`case_type`, `handover_report_signed`
**Output:** `item_verdicts[]`, `documents_to_generate[]`, `needs_dispute_resolution`,
the 3 responsibility totals, `case_summary_th/en`

Hard rules (no LLM needed):
- Condition verdict `PRE_EXISTING` → **DAD_RESPONSIBILITY**
- `UNCHANGED` / `NORMAL_WEAR` → **NORMAL_WEAR**
- `NEW_DAMAGE` with no signed handover report → **DISPUTED**
- Condition confidence < 60% → **DISPUTED**

RAG corpus: `agent03_asset_policy_reasoning/asset_policy_corpus/*.json` — see
`docs/asset-policy-methodology.md` at the repo root for the full source breakdown,
including which chunks are confirmed law vs. explicit DAD-policy placeholders.

### Agent 04 — Report Generator

Generates Thai PDFs using Typhoon v2 for narrative text and ReportLab Platypus for
layout. PDFs are saved to `outputs/{handover_id}/` locally.

**Input:** JSON — `documents_to_generate[]`, the 3 responsibility totals,
`item_verdicts[]`, `case_summary_th/en`
**Output:** per-document `{ doc_type, pages, status, download_url }`

Documents generated:
- `condition_certification_report` — หนังสือรับรองสภาพทรัพย์สิน (always generated)
- `fit_out_completion_checklist` — แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน (`case_type = fit_out_inspection`)
- `liability_summary` — สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท (`needs_dispute_resolution = true`)

**Thai font:** Leelawadee (`C:\Windows\Fonts\leelawad.ttf`) — built into Windows, no
download needed. Falls back to Helvetica on non-Windows systems (Thai characters
won't render without a Thai TTF).

**PDF download:** `GET /api/v1/download/{handover_id}/{doc_type}` — served from
`outputs/`.

## Repository Structure

```
assetwitness-pipeline/
├── services/                          # Bridge services (what the frontend calls)
│   ├── agent01_service.py             # Groq condition comparison (real)
│   ├── agent02_service.py             # pdfplumber + Typhoon agreement parser (real)
│   ├── agent03_service.py             # Typhoon + ChromaDB RAG (real)
│   └── agent04_service.py             # Typhoon + ReportLab, local PDF (real)
│
├── agent01_condition_comparison/       # Condition module (used by agent01_service)
├── agent02_agreement_parser/           # Parser module (used by agent02_service)
├── agent03_asset_policy_reasoning/     # Policy module (used by agent03_service)
│   ├── asset_policy_corpus/            # State Property Act + MOF Reg. + placeholders
│   ├── retriever.py                    # ChromaDB query helpers
│   ├── reasoner.py                     # Hard rules + LLM reasoning
│   ├── document_selector.py            # Which of the 3 documents to generate
│   ├── prompts.py                      # Typhoon prompt templates
│   └── seed_corpus.py                  # One-time corpus loader
│
├── shared/                             # Shared config + clients
│   ├── config.py                       # Env vars
│   └── typhoon_client.py               # LangChain ChatOpenAI → Typhoon
│
├── chroma_db/                          # ChromaDB persistent store (gitignored)
├── outputs/                            # Generated PDFs (gitignored)
├── .env                                # Local credentials (gitignored)
└── .env.example                        # Template
```
