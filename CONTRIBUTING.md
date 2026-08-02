# Contributing to AssetWitness

Handover condition certification for DAD-managed properties. Facilities staff or an
occupant uploads condition photos, condition items, and the occupancy/fit-out
agreement — a 4-agent AI pipeline produces a per-item responsibility verdict and
ready-to-file Thai handover documents.

---

## Architecture

| Component | Description |
|-----------|-------------|
| **Frontend** (`nextjs-frontend/`) | Next.js 16 / TypeScript. Rewrites `/run/*`, `/extract-agreement`, `/download/*`, `/dashboard-api/*` to the Express backend. |
| **Backend** (`express-backend/`) | Node.js / Express / TypeScript. Proxies multipart and JSON requests to Python microservices, streams PDF downloads, persists the Portfolio Condition Dashboard (Prisma + Postgres). |
| **AI Pipeline** (`assetwitness-pipeline/`) | Python / FastAPI / Groq / Typhoon v2 / ChromaDB. Four isolated microservices, one per agent. |
| **Mobile** (`assetwitness-app/`) | Expo / React Native, same Express API via `/full-analysis`. |

**Request flow:**

```
Browser
  → Next.js :3000
    → Express :3001
      → Agent 01 :8001  (Condition comparison — Groq)
      → Agent 02 :8002  (Agreement parser — pdfplumber + Typhoon)
      → Agent 03 :8003  (Asset policy reasoning — Typhoon v2 + ChromaDB RAG)
      → Agent 04 :8004  (Thai report generator — Typhoon v2 + ReportLab)
      → Postgres :5438  (Portfolio Condition Dashboard, via Prisma)
```

---

## Quick Start

> **Windows:** always use `python -m pip` and `python -m uvicorn` — plain `pip`/`uvicorn` fail due to the uv trampoline issue in the venv.

### 1. Clone and install JS dependencies

```bash
git clone https://github.com/your-org/assetwitness.git
cd assetwitness

cd express-backend && npm install && cd ..
cd nextjs-frontend && npm install && cd ..
```

### 2. Create env files

```bash
cp nextjs-frontend/.env.example       nextjs-frontend/.env.local
cp express-backend/.env.example       express-backend/.env
cp assetwitness-pipeline/.env.example assetwitness-pipeline/.env
```

Fill in `assetwitness-pipeline/.env`:
- `GROQ_API_KEY` — https://console.groq.com (free)
- `TYPHOON_API_KEY` — https://typhoon.apps.opentyphoon.ai

### 3. Set up Python services

```bash
cd assetwitness-pipeline

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

python -m pip install -r requirements.txt

# Seed ChromaDB once (persists to chroma_db/ — no need to repeat on restart)
python agent03_asset_policy_reasoning/seed_corpus.py
```

### 4. Set up the Portfolio Condition Dashboard's Postgres

```bash
cd express-backend
npm run db:up          # docker compose — Postgres on :5438
npm run db:generate     # generate the Prisma client into generated/prisma/

# Apply the hand-written migration (see "Why migrations are hand-applied" below)
docker compose exec -T db psql -U assetwitness -d assetwitness -f - < prisma/migrations/20260802000000_init/migration.sql
```

### 5. Start everything

Open seven terminals.

```bash
# Terminal 1 — Agent 01
cd assetwitness-pipeline && python -m uvicorn services.agent01_service:app --port 8001 --reload

# Terminal 2 — Agent 02
cd assetwitness-pipeline && python -m uvicorn services.agent02_service:app --port 8002 --reload

# Terminal 3 — Agent 03
cd assetwitness-pipeline && python -m uvicorn services.agent03_service:app --port 8003 --reload

# Terminal 4 — Agent 04
cd assetwitness-pipeline && python -m uvicorn services.agent04_service:app --port 8004 --reload

# Terminal 5 — Postgres (if not already up from step 4)
cd express-backend && npm run db:up

# Terminal 6 — Express backend
cd express-backend && npm run dev        # http://localhost:3001

# Terminal 7 — Next.js frontend
cd nextjs-frontend && npm run dev        # http://localhost:3000
```

### 6. Verify

```bash
curl http://localhost:3001/health           # {"status":"ok","corpus_loaded":true/false}
curl http://localhost:8001/health           # {"status":"ok","agent":"01"}
curl http://localhost:8002/health           # {"status":"ok","agent":"02"}
curl http://localhost:8003/health           # {"status":"ok","agent":"03","corpus_ready":true}
curl http://localhost:8004/health           # {"status":"ok","agent":"04"}
curl http://localhost:3001/dashboard/summary  # {"buildings":[],"totals":{...}}
```

Open **http://localhost:3000** and run a full pipeline to confirm end-to-end, then
check **http://localhost:3000/dashboard** picks up the resulting handover.

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
| `AGENT_01_URL` | `http://localhost:8001` | Condition comparison service |
| `AGENT_02_URL` | `http://localhost:8002` | Agreement parser service |
| `AGENT_03_URL` | `http://localhost:8003` | Asset policy reasoning service |
| `AGENT_04_URL` | `http://localhost:8004` | Report generator service |
| `MAX_FILE_SIZE_MB` | `20` | Max upload size per file |
| `DATABASE_URL` | — | Postgres connection string for the Portfolio Condition Dashboard — **required** |

### `assetwitness-pipeline/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key for Agent 01 vision — **required** |
| `TYPHOON_API_KEY` | — | Typhoon v2 API key for Agents 02–04 — **required** |
| `TYPHOON_BASE_URL` | `https://api.opentyphoon.ai/v1` | Typhoon endpoint |
| `TYPHOON_MODEL` | `typhoon-v2-70b-instruct` | Model name |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |

> **Never commit `.env` files.** They are in `.gitignore`. Use `.env.example` files with placeholder values.

---

## Why migrations are hand-applied

On this dev machine, Windows Application Control blocks Prisma's native
schema-engine binary, which `prisma migrate dev`/`diff` depend on. `prisma generate`
and the driver-adapter runtime client (`@prisma/adapter-pg`, see
`src/db/client.ts`) are unaffected — they talk to Postgres directly via the `pg`
driver, never shelling out to a native engine. So schema changes are: (1) hand-edit
`prisma/schema.prisma`, (2) hand-write the matching SQL in a new
`prisma/migrations/<timestamp>_<name>/migration.sql`, (3) apply it with
`docker compose exec -T db psql -U assetwitness -d assetwitness -f - < path/to/migration.sql`,
(4) `npm run db:generate`. On an unrestricted machine, `prisma migrate dev` will
recognize these as already-applied and work normally going forward.

---

## API Overview

### Express Backend (`/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Health check — reports `corpus_loaded` from Agent 03 |
| `/run/agent01` | POST | Multipart — Condition comparison |
| `/run/agent02` | POST | Multipart — Agreement parser |
| `/run/agent03` | POST | JSON — Asset policy reasoning + RAG |
| `/run/agent04` | POST | JSON — Thai report generation |
| `/full-analysis` | POST | Multipart — mobile-only orchestration of Agents 01→02→03 |
| `/generate-documents` | POST | JSON — Agent 04 proxy with absolute download URLs |
| `/extract-agreement` | POST | Multipart — Extract text from an agreement PDF |
| `/download/:handoverId/:docType` | GET | Stream a generated PDF from Agent 04 local storage |
| `/dashboard/cases` | POST | JSON — record one handover summary row |
| `/dashboard/summary` | GET | By-building aggregation for the Portfolio Condition Dashboard |

### Python Agents (`/api/v1/`)

| Port | Agent | Endpoint | Key input fields |
|------|-------|----------|-----------------|
| `:8001` | Agent 01 | `POST /api/v1/agent01` | `prior_condition`, `current_condition` images + `condition_items` JSON |
| `:8002` | Agent 02 | `POST /api/v1/agent02` | `agreement_file` + `condition_items` + occupancy/fee fields |
| `:8003` | Agent 03 | `POST /api/v1/agent03` | `condition_items`, `condition_map`, `agreement_clause`, `case_type`, `handover_report_signed` |
| `:8004` | Agent 04 | `POST /api/v1/agent04` | `documents_to_generate`, the 3 responsibility totals, `item_verdicts`, `case_summary_th/en` |
| `:8004` | Agent 04 | `GET /api/v1/download/{handover_id}/{doc_type}` | Serves generated PDF file |

---

## Development Workflow

```bash
# Type check Express + Frontend
cd express-backend && npm run typecheck
cd nextjs-frontend && npx tsc --noEmit

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
assetwitness/
├── nextjs-frontend/              # Next.js 16 · TypeScript
│   ├── next.config.js            # Rewrites for /run/*, /health, /download/*, /dashboard-api/*
│   └── src/
│       ├── app/                  # /app (wizard), /dashboard, /move-in, page.tsx, globals.css
│       ├── components/           # DropZone, ClaimsList, Pipeline
│       └── types/                # Shared TypeScript interfaces (Agent01–04 results)
│
├── express-backend/              # Express · TypeScript · Node.js
│   ├── prisma/
│   │   ├── schema.prisma         # HandoverCase model
│   │   └── migrations/           # Hand-written SQL (see above)
│   └── src/
│       ├── app.ts                # Express setup and error handler
│       ├── config/index.ts       # Env var loading
│       ├── db/client.ts          # Prisma driver-adapter client
│       ├── controllers/          # agentController, fullAnalysisController, dashboardController, extractController
│       ├── models/handoverCaseRepo.ts  # Dashboard Prisma queries
│       ├── schemas/               # agentSchemas.ts, dashboardSchemas.ts — Zod validation
│       ├── routes/index.ts       # All route registrations + PDF download proxy
│       ├── middleware/upload.ts  # Multer file upload
│       └── services/agentClient.ts  # Axios helpers + temp file cleanup
│
├── assetwitness-app/              # Expo · React Native
│
└── assetwitness-pipeline/         # Python · FastAPI · ChromaDB
    ├── services/                  # Bridge FastAPI apps (what Express calls)
    │   ├── agent01_service.py     # Groq Llama-4-Scout condition comparison (real)
    │   ├── agent02_service.py     # pdfplumber + Typhoon agreement parser (real)
    │   ├── agent03_service.py     # Typhoon v2 + ChromaDB RAG (real)
    │   └── agent04_service.py     # Typhoon v2 + ReportLab Platypus, local PDF (real)
    ├── agent01_condition_comparison/
    ├── agent02_agreement_parser/
    ├── agent03_asset_policy_reasoning/
    │   ├── asset_policy_corpus/   # State Property Act 2562 + MOF Reg. 2552 + DAD placeholders
    │   ├── retriever.py           # ChromaDB query helpers
    │   ├── reasoner.py            # Hard rules + Typhoon reasoning
    │   ├── document_selector.py   # Which of the 3 documents to generate
    │   └── seed_corpus.py         # One-time corpus loader
    ├── shared/                    # config.py, typhoon_client.py
    ├── chroma_db/                 # ChromaDB store (auto-created, gitignored)
    └── outputs/                   # Generated PDFs (auto-created, gitignored)
```

---

## Agent 04 — Report Generation Notes

Agent 04 generates up to three Thai PDFs using Typhoon v2 (narrative text) and
ReportLab Platypus (layout):

| Document | Thai name | When generated |
|----------|-----------|----------------|
| `condition_certification_report` | หนังสือรับรองสภาพทรัพย์สิน | Always |
| `fit_out_completion_checklist` | แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน | `case_type = fit_out_inspection` |
| `liability_summary` | สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท | `needs_dispute_resolution = true` |

**Thai font:** Leelawadee (`C:\Windows\Fonts\leelawad.ttf`) — built into Windows, no download needed. Falls back to Helvetica on non-Windows (Thai characters won't render without a Thai TTF font registered).

**Storage:** PDFs are saved to `assetwitness-pipeline/outputs/{handover_id}/{doc_type}.pdf`.

---

## Adding a New Agent

1. **Python service** — create `assetwitness-pipeline/services/agentXX_service.py` with `GET /health` and `POST /api/v1/agentXX`. Add `load_dotenv()` at the top.

2. **Express schema** — add `agentXXBodySchema` to `express-backend/src/schemas/agentSchemas.ts`.

3. **Express controller** — add `runAgentXX` to `express-backend/src/controllers/agentController.ts`.

4. **Express route** — register `router.post('/run/agentXX', ...)` in `express-backend/src/routes/index.ts`. Add `AGENT_XX_URL` to `config/index.ts`.

5. **TypeScript types** — add input/output interfaces to `nextjs-frontend/src/types/index.ts` (and `assetwitness-app/src/lib/types.ts` if mobile needs it).

6. **Frontend** — call `/run/agentXX` from the pipeline in `app/app/page.tsx`. The `/run/:path*` rewrite already covers all agent routes.

---

## PR Checklist

- [ ] `npm run typecheck` passes in `express-backend/`
- [ ] `npx tsc --noEmit` passes in `nextjs-frontend/` and `assetwitness-app/`
- [ ] All Python agents respond on `/health`
- [ ] Full pipeline test passes in the browser (all 4 agents complete)
- [ ] `/dashboard` reflects a newly-run handover
- [ ] No `.env` files or secrets committed
- [ ] Temp files cleaned up in `finally` blocks
- [ ] New TypeScript types added to `src/types/index.ts`
- [ ] `.env.example` updated for any new env vars
- [ ] Prisma schema changes have a matching hand-written `migration.sql`

---

## Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/). Scope should be the package or agent: `frontend`, `express`, `dashboard`, `agent01`, `agent02`, `agent03`, `agent04`, `pipeline`, `mobile`.

```
feat(agent04): add liability_summary PDF with disputed-item table
fix(express): stream PDF download instead of buffering in memory
chore(deps): upgrade reportlab to 4.2.0
feat(dashboard): add by-building dispute-rate flagging
```

---

## Questions

Reach the team on the project WhatsApp group. Technical AI pipeline questions → Tuey. Frontend and pitch → Beam. Product, legal/policy, and scope → KP.
