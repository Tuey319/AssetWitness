# Contributing to RoomWitness

Thai rental deposit dispute analyzer. Tenants upload room photos, claims, and a lease contract — a 4-agent AI pipeline produces a legal verdict and ready-to-send Thai documents.

---

## Architecture

| Component | Description |
|-----------|-------------|
| **Frontend** (`nextjs-frontend/`) | Next.js 14 / TypeScript. Rewrites `/run/*`, `/extract-contract`, `/download/*` to the Express backend. |
| **Backend** (`express-backend/`) | Node.js / Express / TypeScript. Proxies multipart and JSON requests to Python microservices, streams PDF downloads. |
| **AI Pipeline** (`roomwitness-rag/`) | Python / FastAPI / Groq / Typhoon v2.5 / ChromaDB. Four isolated microservices, one per agent. |

**Request flow:**

```
Browser
  → Next.js :3000
    → Express :3001
      → Agent 01 :8001  (CV photo comparison — Groq)
      → Agent 02 :8002  (Contract parser — pdfplumber)
      → Agent 03 :8003  (Legal reasoning — Typhoon v2.5 + ChromaDB RAG)
      → Agent 04 :8004  (Thai document generator — Typhoon v2.5 + ReportLab)
```

---

## Quick Start

> **Windows:** always use `python -m pip` and `python -m uvicorn` — plain `pip`/`uvicorn` fail due to the uv trampoline issue in the venv.

### 1. Clone and install JS dependencies

```bash
git clone https://github.com/your-org/roomwitness.git
cd roomwitness

cd express-backend && npm install && cd ..
cd nextjs-frontend && npm install && cd ..
```

### 2. Create env files

```bash
cp nextjs-frontend/.env.example  nextjs-frontend/.env.local
cp express-backend/.env.example  express-backend/.env
cp roomwitness-rag/.env.example  roomwitness-rag/.env
```

Fill in `roomwitness-rag/.env`:
- `GROQ_API_KEY` — https://console.groq.com (free)
- `TYPHOON_API_KEY` — https://typhoon.apps.opentyphoon.ai

### 3. Set up Python services

```bash
cd roomwitness-rag

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

python -m pip install fastapi uvicorn "uvicorn[standard]" python-multipart python-dotenv \
    groq chromadb sentence-transformers pdfplumber \
    reportlab langchain-openai langchain-core \
    requests pillow lxml beautifulsoup4

# Seed ChromaDB once (persists to chroma_db/ — no need to repeat on restart)
python agent03_legal_reasoning/seed_corpus.py
```

### 4. Start everything

Open six terminals.

```bash
# Terminal 1 — Agent 01
cd roomwitness-rag && python -m uvicorn services.agent01_service:app --port 8001 --reload

# Terminal 2 — Agent 02
cd roomwitness-rag && python -m uvicorn services.agent02_service:app --port 8002 --reload

# Terminal 3 — Agent 03
cd roomwitness-rag && python -m uvicorn services.agent03_service:app --port 8003 --reload

# Terminal 4 — Agent 04
cd roomwitness-rag && python -m uvicorn services.agent04_service:app --port 8004 --reload

# Terminal 5 — Express backend
cd express-backend && npm run dev        # http://localhost:3001

# Terminal 6 — Next.js frontend
cd nextjs-frontend && npm run dev        # http://localhost:3000
```

### 5. Verify

```bash
curl http://localhost:3001/health   # {"status":"ok","corpus_loaded":true/false}
curl http://localhost:8001/health   # {"status":"ok","agent":"01"}
curl http://localhost:8002/health   # {"status":"ok","agent":"02"}
curl http://localhost:8003/health   # {"status":"ok","agent":"03","corpus_ready":true}
curl http://localhost:8004/health   # {"status":"ok","agent":"04"}
```

Open **http://localhost:3000** and run a full analysis to confirm end-to-end.

---

## Environment Variables

### `nextjs-frontend/.env.local`

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:3001` | Express backend URL used by Next.js rewrites |

### `express-backend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `AGENT_01_URL` | `http://localhost:8001` | CV comparison service |
| `AGENT_02_URL` | `http://localhost:8002` | Contract parser service |
| `AGENT_03_URL` | `http://localhost:8003` | Legal reasoning service |
| `AGENT_04_URL` | `http://localhost:8004` | Document generator service |
| `MAX_FILE_SIZE_MB` | `20` | Max upload size per file |

### `roomwitness-rag/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key for Agent 01 vision — **required** |
| `TYPHOON_API_KEY` | — | Typhoon v2.5 API key for Agents 03 + 04 — **required** |
| `TYPHOON_BASE_URL` | `https://api.opentyphoon.ai/v1` | Typhoon endpoint |
| `TYPHOON_MODEL` | `typhoon-v2.5-30b-a3b-instruct` | Model name |
| `AWS_ACCESS_KEY_ID` | — | AWS credentials for S3 (optional — local storage used by default) |
| `AWS_SECRET_ACCESS_KEY` | — | AWS credentials for S3 (optional) |
| `AWS_REGION` | `ap-southeast-1` | S3 region |
| `S3_BUCKET` | `roomwitness-cases` | S3 bucket name |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |

> **Never commit `.env` files.** They are in `.gitignore`. Use `.env.example` files with placeholder values.

---

## API Overview

### Express Backend (`/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Health check — reports `corpus_loaded` from Agent 03 |
| `/run/agent01` | POST | Multipart — CV photo comparison |
| `/run/agent02` | POST | Multipart — Contract parser |
| `/run/agent03` | POST | JSON — Legal reasoning + RAG |
| `/run/agent04` | POST | JSON — Thai document generation |
| `/extract-contract` | POST | Multipart — Extract text from PDF contract |
| `/download/:caseId/:docType` | GET | Stream generated PDF from Agent 04 local storage |

### Python Agents (`/api/v1/`)

| Port | Agent | Endpoint | Key input fields |
|------|-------|----------|-----------------|
| `:8001` | Agent 01 | `POST /api/v1/agent01` | `move_in`, `move_out` images + `claims` JSON |
| `:8002` | Agent 02 | `POST /api/v1/agent02` | `contract_file` + lease metadata |
| `:8003` | Agent 03 | `POST /api/v1/agent03` | `claims`, `damage_map`, `contract_clause`, `landlord_unit_count` |
| `:8004` | Agent 04 | `POST /api/v1/agent04` | `documents_to_generate`, `total_unlawful_thb`, `verdicts`, `case_summary_th/en` |
| `:8004` | Agent 04 | `GET /api/v1/download/{case_id}/{doc_type}` | Serves generated PDF file |

---

## Development Workflow

```bash
# Type check Express + Frontend
cd express-backend && npm run typecheck
cd nextjs-frontend && npm run lint

# Run Express in dev mode (hot reload via ts-node-dev)
cd express-backend && npm run dev

# Run Next.js in dev mode
cd nextjs-frontend && npm run dev
```

### Branching

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, protected |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, deps, config |

---

## Project Structure

```
roomwitness/
├── nextjs-frontend/              # Next.js 14 · TypeScript
│   ├── next.config.js            # Rewrites for /run/*, /health, /download/*
│   └── src/
│       ├── app/                  # page.tsx (pipeline logic) + globals.css
│       ├── components/           # DropZone, ClaimsList, Pipeline
│       └── types/                # Shared TypeScript interfaces (Agent01–04 results)
│
├── express-backend/              # Express · TypeScript · Node.js
│   └── src/
│       ├── app.ts                # Express setup and error handler
│       ├── config/index.ts       # Env var loading
│       ├── controllers/          # agentController.ts, extractController.ts
│       ├── schemas/agentSchemas.ts  # Zod request validation
│       ├── routes/index.ts       # All route registrations + PDF download proxy
│       ├── middleware/upload.ts  # Multer file upload
│       └── services/agentClient.ts  # Axios helpers + temp file cleanup
│
└── roomwitness-rag/              # Python · FastAPI · ChromaDB
    ├── services/                 # Bridge FastAPI apps (what Express calls)
    │   ├── agent01_service.py    # Groq Llama-4-Scout CV (real)
    │   ├── agent02_service.py    # pdfplumber contract parser (real)
    │   ├── agent03_service.py    # Typhoon v2.5 + ChromaDB RAG (real)
    │   └── agent04_service.py    # Typhoon v2.5 + ReportLab Platypus, local PDF (real)
    ├── agent01_cv/               # CV module used by agent01_service
    ├── agent02_contract_parser/  # Parser module used by agent02_service
    ├── agent03_legal_reasoning/  # Legal module used by agent03_service
    │   ├── legal_corpus/         # OCPB 2568 + CCC §537-571 JSON chunks
    │   ├── retriever.py          # ChromaDB query helpers
    │   ├── reasoner.py           # Hard rules + Typhoon reasoning
    │   ├── router.py             # OCPB/CIVIL/BOTH routing
    │   └── seed_corpus.py        # One-time corpus loader
    ├── agent04_doc_generator/    # Production module (S3 path — future use)
    ├── shared/                   # config.py, typhoon_client.py, s3_client.py
    ├── chroma_db/                # ChromaDB store (auto-created, gitignored)
    ├── outputs/                  # Generated PDFs (auto-created, gitignored)
    └── test_images/              # Sample move-in/out photos for testing
```

---

## Agent 04 — Document Generation Notes

Agent 04 generates three Thai legal PDFs using Typhoon v2.5 (narrative text) and ReportLab Platypus (layout):

| Document | Thai name |
|----------|-----------|
| `demand_letter` | หนังสือเรียกร้องคืนเงินประกัน |
| `evidence_summary` | สรุปหลักฐานและผลการวินิจฉัยคดี |
| `ocpb_complaint` | หนังสือร้องเรียนต่อ สคบ. |

**Thai font:** Leelawadee (`C:\Windows\Fonts\leelawad.ttf`) — built into Windows, no download needed. Falls back to Helvetica on non-Windows (Thai characters won't render without a Thai TTF font registered).

**Storage:** PDFs are saved to `roomwitness-rag/outputs/{case_id}/{doc_type}.pdf`. S3 upload is implemented in `agent04_doc_generator/uploader.py` for future use once AWS credentials are configured.

---

## Adding a New Agent

1. **Python service** — create `roomwitness-rag/services/agentXX_service.py` with `GET /health` and `POST /api/v1/agentXX`. Add `load_dotenv()` at the top.

2. **Express schema** — add `agentXXBodySchema` to `express-backend/src/schemas/agentSchemas.ts`.

3. **Express controller** — add `runAgentXX` to `express-backend/src/controllers/agentController.ts`.

4. **Express route** — register `router.post('/run/agentXX', ...)` in `express-backend/src/routes/index.ts`. Add `AGENT_XX_URL` to `config/index.ts`.

5. **TypeScript types** — add input/output interfaces to `nextjs-frontend/src/types/index.ts`.

6. **Frontend** — call `/run/agentXX` from the pipeline in `page.tsx`. The `/run/:path*` rewrite already covers all agent routes.

---

## PR Checklist

- [ ] `npm run typecheck` passes in `express-backend/`
- [ ] `npm run lint` passes in `nextjs-frontend/`
- [ ] All Python agents respond on `/health`
- [ ] Full pipeline test passes in the browser (all 4 agents complete)
- [ ] No `.env` files or secrets committed
- [ ] Temp files cleaned up in `finally` blocks
- [ ] New TypeScript types added to `src/types/index.ts`
- [ ] `.env.example` updated for any new env vars

---

## Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/). Scope should be the package or agent: `frontend`, `express`, `agent01`, `agent02`, `agent03`, `agent04`, `rag`.

```
feat(agent04): add evidence_summary PDF with verdict table
fix(express): stream PDF download instead of buffering in memory
chore(deps): upgrade reportlab to 4.2.0
refactor(agent03): replace legacy/rag_agent with agent03_legal_reasoning module
```

---

## Questions

Reach the team on the project WhatsApp group. Technical AI pipeline questions → Tuey. Frontend and pitch → Beam. Product and scope → KP.
