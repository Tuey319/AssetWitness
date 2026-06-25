# RoomWitness

AI-powered analyzer for Thai rental deposit disputes. Upload move-in/out photos and a lease contract, enter the landlord's damage claims, and get per-claim legal verdicts plus ready-to-file Thai legal documents in seconds.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 14 + TypeScript | 3000 |
| Backend | Express.js (API proxy) | 3001 |
| Agent 01 — CV | FastAPI + Groq Llama-4-Scout | 8001 |
| Agent 02 — Contract Parser | FastAPI + pdfplumber | 8002 |
| Agent 03 — Legal Reasoning | FastAPI + Typhoon v2 + ChromaDB RAG | 8003 |
| Agent 04 — Doc Generator | FastAPI + Typhoon v2 + ReportLab | 8004 |

## Pipeline

```
[Move-in/out photos]    [Lease PDF]    [Landlord claims]
         │                   │                │
         ▼                   ▼                │
   Agent 01 (CV)      Agent 02 (Parser) ◄────┘
   Groq vision        pdfplumber + Typhoon
   damage_map[]       liability_map[]
         │                   │
         └──────┬────────────┘
                ▼
        Agent 03 (Legal Brain)
        Hard rules + ChromaDB RAG + Typhoon v2
        verdicts[] + routing
                │
                ▼
        Agent 04 (Doc Generator)
        Typhoon v2 + ReportLab (Platypus)
        3 Thai legal PDFs → local storage
```

## Quick Start

> **Windows users:** use `python -m uvicorn` and `python -m pip` — plain `uvicorn`/`pip` fail due to the uv trampoline issue.

### 1 — Python services

```bash
cd roomwitness-rag

# Install core dependencies
python -m pip install fastapi uvicorn groq chromadb pdfplumber python-dotenv \
    reportlab langchain-openai langchain-core python-multipart

# Copy and fill in credentials (GROQ_API_KEY + TYPHOON_API_KEY required)
cp .env.example .env

# Seed ChromaDB legal corpus (run ONCE)
python agent03_legal_reasoning/seed_corpus.py

# Start all 4 services — one terminal each
python -m uvicorn services.agent01_service:app --port 8001 --reload
python -m uvicorn services.agent02_service:app --port 8002 --reload
python -m uvicorn services.agent03_service:app --port 8003 --reload
python -m uvicorn services.agent04_service:app --port 8004 --reload
```

### 2 — Express backend

```bash
cd express-backend
npm install
cp .env.example .env
npm run dev          # http://localhost:3001
```

### 3 — Next.js frontend

```bash
cd nextjs-frontend
npm install
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000**, fill in claims and photos, click **Analyze dispute**.

## API Keys Required

| Key | Where to get | Used by |
|-----|-------------|---------|
| `GROQ_API_KEY` | https://console.groq.com (free) | Agent 01 |
| `TYPHOON_API_KEY` | https://typhoon.apps.opentyphoon.ai | Agent 03, Agent 04 |

AWS S3 credentials are **optional** — Agent 04 saves PDFs to local disk by default (`roomwitness-rag/outputs/`). S3 upload code is in `agent04_doc_generator/uploader.py` for future use.

## Repository Layout

```
RoomWitness/
├── nextjs-frontend/          # React UI (Next.js 14 App Router)
│   └── src/
│       ├── app/              # page.tsx + globals.css
│       ├── components/       # DropZone, ClaimsList, Pipeline
│       └── types/            # Shared TypeScript interfaces
│
├── express-backend/          # API proxy + file upload middleware
│   └── src/
│       ├── routes/           # Agent proxy routes + PDF download proxy
│       ├── controllers/      # agentController, extractController
│       ├── schemas/          # Zod request validation
│       └── services/         # Axios helpers
│
└── roomwitness-rag/          # Python AI microservices
    ├── services/             # Bridge FastAPI services (ports 8001–8004)
    ├── agent01_cv/           # Groq Llama-4-Scout vision agent
    ├── agent02_contract_parser/
    ├── agent03_legal_reasoning/  # Hard rules + RAG + Typhoon v2
    ├── agent04_doc_generator/    # Production module (S3 path, future use)
    ├── shared/               # config, typhoon_client, s3_client
    ├── chroma_db/            # ChromaDB vector store (auto-created)
    └── outputs/              # Generated PDFs saved here (auto-created)
```

## Team

- **KP** — Lead
- **Beam** — Frontend
- **Tuey** — Tech Lead

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, code conventions, and PR checklist.
