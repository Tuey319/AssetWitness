# RoomWitness

Thai rental deposit dispute analyzer. Tenants upload room photos, claims, and a lease contract — a 4-agent AI pipeline produces a legal verdict and ready-to-send Thai documents.

---

## Architecture

| Component | Description |
|-----------|-------------|
| **Frontend** (`nextjs-frontend/`) | Next.js 14 / TypeScript / Tailwind CSS. Rewrites `/run/*` and `/extract-contract` to the Express backend. |
| **Backend** (`express-backend/`) | Node.js / Express / TypeScript. Proxies multipart and JSON requests to the Python microservices. |
| **AI Pipeline** (`roomwitness-rag/`) | Python / FastAPI / Groq Llama-4 / ChromaDB. Four isolated microservices, one per agent. |

**Request flow:**

```
Browser
  → Next.js :3000
    → Express :3001
      → Agent 01 :8001  (CV photo comparison)
      → Agent 02 :8002  (Contract parser + OCR)
      → Agent 03 :8003  (Legal reasoning + RAG)
      → Agent 04 :8004  (Thai document generator)
```

---

## Quick Start

### 1. Install dependencies

```bash
git clone https://github.com/your-org/roomwitness.git
cd roomwitness
pnpm install
```

### 2. Create env files

```bash
cp nextjs-frontend/.env.example  nextjs-frontend/.env.local
cp express-backend/.env.example  express-backend/.env
cp roomwitness-rag/.env.example  roomwitness-rag/.env
```

Fill in `TYPHOON_API_KEY` and `GROQ_API_KEY` in `roomwitness-rag/.env`.

### 3. Set up Python services

```bash
cd roomwitness-rag
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python agent03_legal_reasoning/seed_corpus.py   # run once
```

### 4. Start everything

Open four terminal tabs.

```bash
# Tab 1 — Frontend
cd nextjs-frontend && pnpm dev        # http://localhost:3000

# Tab 2 — Backend
cd express-backend && pnpm dev        # http://localhost:3001

# Tab 3 — Agents 01 + 02
cd roomwitness-rag && source .venv/bin/activate
uvicorn services.agent01_service:app --port 8001 --reload &
uvicorn services.agent02_service:app --port 8002 --reload

# Tab 4 — Agents 03 + 04
cd roomwitness-rag && source .venv/bin/activate
uvicorn services.agent03_service:app --port 8003 --reload &
uvicorn services.agent04_service:app --port 8004 --reload
```

### 5. Verify

```bash
curl http://localhost:3000/health    # Next.js → Express health proxy
curl http://localhost:3001/health    # Express
curl http://localhost:8001/health    # Agent 01
curl http://localhost:8002/health    # Agent 02
curl http://localhost:8003/health    # Agent 03
curl http://localhost:8004/health    # Agent 04
```

All should return `{"status": "ok"}`.

---

## Environment Variables

### `nextjs-frontend/.env.local`

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Express backend URL |

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
| `TYPHOON_API_KEY` | — | Typhoon v2 API key — **required** |
| `TYPHOON_BASE_URL` | `https://api.opentyphoon.ai/v1` | Typhoon v2 endpoint |
| `TYPHOON_MODEL` | `typhoon-v2-70b-instruct` | Model name |
| `GROQ_API_KEY` | — | Groq API key for Agent 01 vision — **required** |
| `AWS_ACCESS_KEY_ID` | — | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | — | AWS credentials for S3 |
| `AWS_REGION` | `ap-southeast-1` | S3 region |
| `S3_BUCKET` | `roomwitness-cases` | S3 bucket name |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |

> **Never commit `.env` files.** They are in `.gitignore`. Use `.env.example` files with placeholder values.

---

## API Overview

### Express Backend (`/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Health check — also reports `corpus_loaded` from Agent 03 |
| `/run/agent01` | POST | Multipart — CV photo comparison |
| `/run/agent02` | POST | Multipart — Contract parser |
| `/run/agent03` | POST | JSON — Legal reasoning + RAG |
| `/run/agent04` | POST | JSON — Thai document generation |
| `/extract-contract` | POST | Multipart — Extract text from a PDF contract |

### Python Agents (`/api/v1/`)

| Port | Agent | Endpoint | Input |
|------|-------|----------|-------|
| `:8001` | Agent 01 | `POST /api/v1/agent01` | Multipart: `move_in`, `move_out` images + `claims` JSON |
| `:8002` | Agent 02 | `POST /api/v1/agent02` | Multipart: `contract_file` + lease metadata |
| `:8003` | Agent 03 | `POST /api/v1/agent03` | JSON: `claims`, `damage_map`, `contract_clause` |
| `:8004` | Agent 04 | `POST /api/v1/agent04` | JSON: `documents_to_generate`, `total_unlawful_thb` |

---

## Development Workflow

```bash
# Type check all TypeScript packages from workspace root
pnpm typecheck

# Lint all packages
pnpm lint

# Auto-fix lint
pnpm lint:fix

# Format with Prettier
pnpm format

# Run all tests
pnpm test
```

All of the above run automatically on pre-commit via Husky + lint-staged.

### Branching

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, protected |
| `develop` | Integration — all PRs target this |
| `feature/*` | New features (branch from `develop`) |
| `fix/*` | Bug fixes (branch from `develop`) |
| `chore/*` | Tooling, deps, config (branch from `develop`) |

---

## Project Structure

```
roomwitness/
├── nextjs-frontend/              # Next.js 14 · TypeScript · Tailwind
│   └── src/
│       ├── app/                  # App Router pages and layouts
│       ├── components/           # DropZone, ClaimsList, Pipeline
│       ├── types/                # Shared TypeScript interfaces
│       └── lib/                  # API helpers
│
├── express-backend/              # Express · TypeScript · Node.js
│   └── src/
│       ├── app.ts                # Express setup and error handler
│       ├── config/               # Env var loading
│       │   └── index.ts
│       ├── controllers/          # HTTP handlers — validate input, call services
│       │   ├── agentController.ts
│       │   └── extractController.ts
│       ├── schemas/              # Zod request schemas
│       │   └── agentSchemas.ts
│       ├── routes/               # Route registration only
│       │   └── index.ts
│       ├── middleware/           # upload.ts (Multer)
│       │   └── upload.ts
│       └── services/             # Axios helpers + temp file cleanup
│           └── agentClient.ts
│
└── roomwitness-rag/              # Python · FastAPI · ChromaDB
    ├── services/                 # agent01–04 FastAPI bridge apps
    ├── agent01_cv/
    ├── agent02_contract_parser/
    ├── agent03_legal_reasoning/
    │   ├── seed_corpus.py        # Run once to seed ChromaDB
    │   └── legal_corpus/         # OCPB 2568 + Civil Code §537-571
    ├── agent04_doc_generator/
    └── shared/                   # typhoon_client.py, s3_client.py
```

---

## Adding a New Agent

1. **Python service** — create `roomwitness-rag/services/agentXX_service.py` with a `GET /health` and `POST /api/v1/agentXX` endpoint.

2. **Express route** — add a `router.post('/agentXX', ...)` handler in `express-backend/src/routes/agents.ts`. Register the URL in `config.ts` as `AGENT_XX_URL`.

3. **TypeScript types** — add input/output interfaces to `nextjs-frontend/src/types/index.ts`.

4. **Frontend** — call `/run/agentXX` from the pipeline in `page.tsx`. The `/run/:path*` rewrite already covers all agent routes.

---

## PR Checklist

- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes with no warnings
- [ ] `pnpm test` passes
- [ ] Python services respond on `/health`
- [ ] No `.env` files or secrets committed
- [ ] Temp files cleaned up in `finally` blocks
- [ ] New types added to `src/types/index.ts`
- [ ] `.env.example` updated for any new env vars

---

## Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/). Scope should be the package or agent: `frontend`, `express`, `agent02`, `rag`, `types`.

```
feat(agent03): add 6-month limitation period check
fix(express): clean up temp files in extract-contract error path
chore(deps): upgrade langchain to 0.3.0
refactor(frontend): lift pipeline state from Pipeline to page.tsx
```

---

## Questions

Reach the team on the project WhatsApp group. Technical AI pipeline questions → Tuey. Frontend and pitch → Beam. Product and scope → KP.
