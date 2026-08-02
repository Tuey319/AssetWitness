# AssetWitness

AI-powered handover condition certification for DAD-managed properties. Photograph a
space's prior and current condition, attach the occupancy/fit-out agreement, list the
condition items — get a per-item responsibility verdict and ready-to-file Thai
handover documents in seconds. Derived from RoomWitness (BDI Bangkok Hackathon 2026),
proposed for Sustainnovation 2026.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 16 + TypeScript | 3000 |
| Backend | Express.js (API proxy + dashboard persistence) | 3001 |
| Dashboard DB | Postgres (via Prisma) | 5438 |
| Agent 01 — Condition Comparison | FastAPI + Groq Llama-4-Scout | 8001 |
| Agent 02 — Agreement Parser | FastAPI + pdfplumber + Typhoon v2 | 8002 |
| Agent 03 — Asset Policy Reasoning | FastAPI + Typhoon v2 + ChromaDB RAG | 8003 |
| Agent 04 — Report Generator | FastAPI + Typhoon v2 + ReportLab | 8004 |

A companion Expo/React Native app (`assetwitness-app/`) consumes the same Express API.

## Pipeline

```
[Prior/current photos]  [Agreement PDF]  [Condition items]
         │                    │                │
         ▼                    ▼                │
  Agent 01 (Condition)  Agent 02 (Parser) ◄────┘
  Groq vision            pdfplumber + Typhoon
  condition_map[]         responsibility_map[]
         │                    │
         └──────┬─────────────┘
                ▼
        Agent 03 (Asset Policy Reasoning)
        Hard rules + ChromaDB RAG + Typhoon v2
        item_verdicts[] + documents_to_generate
                │
                ▼
        Agent 04 (Report Generator)
        Typhoon v2 + ReportLab (Platypus)
        Up to 3 Thai PDFs → local storage
                │
                ▼
        Portfolio Condition Dashboard
        Express + Prisma + Postgres — one summary row per handover
```

## Quick Start

> **Windows users:** use `python -m uvicorn` and `python -m pip` — plain `uvicorn`/`pip` fail due to the uv trampoline issue.

### 1 — Python services

```bash
cd assetwitness-pipeline

python -m pip install -r requirements.txt

# Copy and fill in credentials (GROQ_API_KEY + TYPHOON_API_KEY required)
cp .env.example .env

# Seed ChromaDB asset-policy corpus (run ONCE)
python agent03_asset_policy_reasoning/seed_corpus.py

# Start all 4 services — one terminal each
python -m uvicorn services.agent01_service:app --port 8001 --reload
python -m uvicorn services.agent02_service:app --port 8002 --reload
python -m uvicorn services.agent03_service:app --port 8003 --reload
python -m uvicorn services.agent04_service:app --port 8004 --reload
```

### 2 — Express backend + Portfolio Dashboard DB

```bash
cd express-backend
npm install
cp .env.example .env
npm run db:up          # docker compose — Postgres on :5438
npm run db:generate     # generate Prisma client

# apply the hand-written migration once (see CONTRIBUTING.md for why it's manual)
docker compose exec -T db psql -U assetwitness -d assetwitness -f - < prisma/migrations/20260802000000_init/migration.sql

npm run dev             # http://localhost:3001
```

### 3 — Next.js frontend

```bash
cd nextjs-frontend
npm install
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000**, click **Run a handover**, fill in condition items and
photos, run the pipeline. Visit **/dashboard** for the portfolio-wide rollup.

## API Keys Required

| Key | Where to get | Used by |
|-----|-------------|---------|
| `GROQ_API_KEY` | https://console.groq.com (free) | Agent 01 |
| `TYPHOON_API_KEY` | https://typhoon.apps.opentyphoon.ai | Agent 02, Agent 03, Agent 04 |

AWS S3 credentials are **optional** — Agent 04 saves PDFs to local disk by default
(`assetwitness-pipeline/outputs/`).

## Repository Layout

```
AssetWitness/
├── nextjs-frontend/          # React UI (Next.js 16 App Router)
│   └── src/
│       ├── app/              # /app (wizard), /dashboard, /move-in, page.tsx
│       ├── components/       # DropZone, ClaimsList, Pipeline
│       └── types/            # Shared TypeScript interfaces
│
├── express-backend/          # API proxy + dashboard persistence
│   ├── prisma/                # schema.prisma, hand-written migrations/
│   └── src/
│       ├── routes/           # Agent proxy routes + dashboard + PDF download proxy
│       ├── controllers/      # agentController, fullAnalysisController, dashboardController
│       ├── models/           # handoverCaseRepo.ts (Prisma queries)
│       ├── schemas/          # Zod request validation
│       └── services/         # Axios helpers
│
├── assetwitness-app/          # Expo/React Native mobile app
│
└── assetwitness-pipeline/     # Python AI microservices
    ├── services/              # Bridge FastAPI services (ports 8001–8004)
    ├── agent01_condition_comparison/
    ├── agent02_agreement_parser/
    ├── agent03_asset_policy_reasoning/  # Hard rules + RAG + Typhoon v2
    │   └── asset_policy_corpus/         # State Property Act 2562 + MOF Reg. 2552
    ├── shared/                # config, typhoon_client
    ├── chroma_db/             # ChromaDB vector store (auto-created)
    └── outputs/                # Generated PDFs saved here (auto-created)
```

## Team

- **KP** — Lead, legal/policy research
- **Beam** — Frontend, pitch
- **Tuey** — Tech Lead

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, code conventions, and PR checklist.
