# RoomWitness — Python AI Services

Four FastAPI microservices that power the RoomWitness dispute analysis pipeline.

## Pipeline

```
POST /api/v1/agent01  →  damage_map[]          (CV photo comparison)
POST /api/v1/agent02  →  liability_map[]        (contract parsing)
POST /api/v1/agent03  →  verdicts[] + routing   (legal reasoning)
POST /api/v1/agent04  →  PDFs saved locally     (document generation)
GET  /api/v1/download/{case_id}/{doc_type}       (PDF download)
```

## Agent Summary

| Agent | Service file | LLM | Port |
|-------|-------------|-----|------|
| **01 — CV** | `services/agent01_service.py` | Groq Llama-4-Scout | 8001 |
| **02 — Contract Parser** | `services/agent02_service.py` | pdfplumber (no LLM) | 8002 |
| **03 — Legal Reasoning** | `services/agent03_service.py` | Typhoon v2.5 + ChromaDB RAG | 8003 |
| **04 — Doc Generator** | `services/agent04_service.py` | Typhoon v2.5 + ReportLab | 8004 |

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
TYPHOON_MODEL=typhoon-v2.5-30b-a3b-instruct

# AWS S3 — optional, Agent 04 uses local storage by default
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-1
S3_BUCKET=roomwitness-cases
```

### 2 — Install dependencies

> **Windows:** use `python -m pip` — plain `pip` fails with the uv trampoline.

```bash
python -m pip install fastapi uvicorn "uvicorn[standard]" python-multipart python-dotenv \
    groq chromadb sentence-transformers pdfplumber \
    reportlab langchain-openai langchain-core \
    requests pillow lxml beautifulsoup4
```

### 3 — Seed ChromaDB (run ONCE)

Loads OCPB 2568 and Civil Code §537–571 into ChromaDB. Re-run only if you update `legal_corpus/*.json`.

```bash
python agent03_legal_reasoning/seed_corpus.py
```

Data is persisted to `chroma_db/` — no need to reseed on restart.

### 4 — Start services

> **Windows:** use `python -m uvicorn` — plain `uvicorn` fails with the uv trampoline.

Run each command in a separate terminal from `roomwitness-rag/`:

```bash
python -m uvicorn services.agent01_service:app --port 8001 --reload
python -m uvicorn services.agent02_service:app --port 8002 --reload
python -m uvicorn services.agent03_service:app --port 8003 --reload
python -m uvicorn services.agent04_service:app --port 8004 --reload
```

Interactive docs at `http://localhost:800X/docs`.

## Agent Details

### Agent 01 — CV Damage Assessment

Compares move-in vs move-out photos using Groq's Llama-4-Scout vision model.

**Input:** multipart form — `move_in` (image), `move_out` (image), `claims` (JSON string)  
**Output:** `damage_map[]` — per-claim CV verdict (`NEW_DAMAGE`, `NORMAL_WEAR`, `PRE_EXISTING`, `UNCHANGED`, `unverifiable_by_cv`)

### Agent 02 — Contract Parser

Extracts lease terms, tenant liability map, and void clauses from the rental contract.

**Input:** multipart form — `contract_file` (PDF/image), lease metadata fields  
**Output:** `liability_map[]`, `contract_summary{}`, `unfair_clauses[]`

No LLM used — pdfplumber + regex extraction.

### Agent 03 — Legal Reasoning

Applies deterministic hard rules then calls Typhoon v2.5 with ChromaDB-retrieved Thai law context for per-claim verdicts.

**Input:** JSON — `claims[]`, `damage_map[]`, `contract_clause`, `landlord_unit_count`, `has_void_clause`  
**Output:** `verdicts[]`, `routing` (OCPB/CIVIL/BOTH), `total_unlawful_thb`, `case_summary_th/en`

Hard rules (no LLM needed):
- `NORMAL_WEAR` → **UNLAWFUL** (OCPB 2568 §6)
- `PRE_EXISTING` → **UNLAWFUL**
- `UNCHANGED` → **UNLAWFUL**
- CV confidence < 60% → **DISPUTED**

RAG corpus: `legal_corpus/ocpb_2568.json` + `legal_corpus/ccc_537_571.json`

#### Legal corpus sources

The chunks in `legal_corpus/` were verified against the following primary sources:

**Civil and Commercial Code §537–571 (Hire of Property)**
- [Thailand Law Library — §537–545](https://library.siam-legal.com/thai-law/civil-and-commercial-code-exchange-section-537-545/)
- [Thailand Law Library — §552–563](https://library.siam-legal.com/thai-law/civil-and-commercial-code-exchange-section-552-563/)
- [Thailand Law Online — §537–571 overview](https://www.thailandlawonline.com/civil-and-commercial-code/537-571-lease-or-hire-of-property-laws)
- [ASEAN — CCC Book III full text (PDF)](https://asean.org/wp-content/uploads/2016/08/Thailand199.pdf)

**OCPB Notification B.E. 2568 (2025) — Residential Lease Contract Controls**
- [OCPB official announcement](https://www.ocpb.go.th/news_view.php?nid=17156)
- [Lex Nova Partners — plain-English summary](https://lexnovapartners.com/residential-lease-contracts/)
- [Formichella & Sritawat — analysis of key changes](https://fosrlaw.com/2025/thailand-residential-leasing-regulations-2025/)
- [Landager — deposit rules and limits](https://landager.com/en/property-compliance/thailand/national/security-deposits)

### Agent 04 — Document Generator

Generates professional Thai legal PDFs using Typhoon v2.5 for narrative text and ReportLab Platypus for layout. PDFs are saved to `outputs/{case_id}/` locally.

**Input:** JSON — `documents_to_generate[]`, `total_unlawful_thb`, `verdicts[]`, `case_summary_th/en`, `claims[]`  
**Output:** per-document `{ doc_type, pages, status, download_url }`

Documents generated:
- `demand_letter` — หนังสือเรียกร้องคืนเงินประกัน (formal demand with unlawful claims table + signature block)
- `evidence_summary` — สรุปหลักฐานและผลวินิจฉัย (stat boxes + color-coded verdict table)
- `ocpb_complaint` — หนังสือร้องเรียน สคบ. (official complaint form layout with attachments checklist)

**Thai font:** Leelawadee (`C:\Windows\Fonts\leelawad.ttf`) — built into Windows, no download needed. Falls back to Helvetica on non-Windows systems (Thai characters won't render without a Thai TTF).

**PDF download:** `GET /api/v1/download/{case_id}/{doc_type}` — served from `outputs/`.

**S3:** `agent04_doc_generator/uploader.py` is kept for future use once AWS credentials are configured. Not called by the bridge service.

## Repository Structure

```
roomwitness-rag/
├── services/                     # Bridge services (what the frontend calls)
│   ├── agent01_service.py        # Groq CV (real)
│   ├── agent02_service.py        # pdfplumber parser (real)
│   ├── agent03_service.py        # Typhoon + ChromaDB RAG (real)
│   └── agent04_service.py        # Typhoon + ReportLab, local PDF (real)
│
├── agent01_cv/                   # CV module (used by agent01_service)
├── agent02_contract_parser/      # Parser module (used by agent02_service)
├── agent03_legal_reasoning/      # Legal module (used by agent03_service)
│   ├── legal_corpus/             # OCPB 2568 + CCC JSON chunks
│   ├── retriever.py              # ChromaDB query helpers
│   ├── reasoner.py               # Hard rules + LLM reasoning
│   ├── router.py                 # OCPB/CIVIL/BOTH routing logic
│   ├── prompts.py                # Typhoon prompt templates
│   └── seed_corpus.py            # One-time corpus loader
│
├── agent04_doc_generator/        # Production module (S3 path, future use)
│   ├── templates/                # Document structure definitions
│   ├── renderer.py               # ReportLab canvas renderer (legacy)
│   └── uploader.py               # S3 upload (not used yet)
│
├── shared/                       # Shared config + clients
│   ├── config.py                 # Env vars
│   ├── typhoon_client.py         # LangChain ChatOpenAI → Typhoon
│   └── s3_client.py              # Boto3 S3 helpers
│
├── chroma_db/                    # ChromaDB persistent store (gitignored)
├── outputs/                      # Generated PDFs (gitignored)
├── test_images/                  # Sample move-in/out photos for testing
├── .env                          # Local credentials (gitignored)
└── .env.example                  # Template
```

## Testing

Sample test images are in `test_images/`:
- `move_in.jpg` — clean room (no damage)
- `move_out.jpg` — same room with visible scratches, stain, and crack

Sample claims for a full pipeline test:

| claim_id | item | description | amount_thb |
|----------|------|-------------|-----------|
| C001 | Wall scratches | Multiple scratch marks on bedroom wall | 2500 |
| C002 | Floor stain | Large stain on living room tiles | 1800 |
| C003 | Wall crack | Crack on bathroom wall | 3200 |
