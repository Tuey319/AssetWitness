# RoomWitness

AI-powered analyzer for Thai rental deposit disputes. Upload move-in/out photos and a lease contract, get per-claim legal verdicts and ready-to-file Thai documents in seconds.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 14 + TypeScript | 3000 |
| Backend | Express.js | 3001 |
| Agent 01 — CV | FastAPI + Groq Llama-4-Scout | 8001 |
| Agent 02 — Contract Parser | FastAPI + pdfplumber | 8002 |
| Agent 03 — Legal Reasoning | FastAPI + Groq + ChromaDB RAG | 8003 |
| Agent 04 — Doc Generator | FastAPI (mock → Typhoon v2) | 8004 |

## Pipeline

```
[Move-in/out photos]    [Lease PDF]    [Landlord claims]
         │                   │                │
         ▼                   ▼                │
   Agent 01 (CV)      Agent 02 (Parser) ◄────┘
   damage_map[]       liability_map[]
         │                   │
         └──────┬────────────┘
                ▼
        Agent 03 (Legal Brain)
        Groq + ChromaDB RAG
        verdicts[] + routing
                │
                ▼
        Agent 04 (Docs)
        Thai legal PDFs
```

## Quick Start

### 1 — Python services

```bash
cd roomwitness-rag

# Install
pip install fastapi uvicorn groq chromadb pdfplumber python-dotenv

# Copy and fill in credentials
cp .env.example .env   # add GROQ_API_KEY at minimum

# Seed ChromaDB (run once)
python agent03_legal_reasoning/seed_corpus.py

# Start all 4 services (separate terminals)
uvicorn services.agent01_service:app --port 8001 --reload
uvicorn services.agent02_service:app --port 8002 --reload
uvicorn services.agent03_service:app --port 8003 --reload
uvicorn services.agent04_service:app --port 8004 --reload
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
# .env.example already points to http://localhost:3001
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000** and analyze a dispute.

## Repository Layout

```
RoomWitness/
├── nextjs-frontend/          # React UI
│   └── src/
│       ├── app/              # Next.js App Router + global CSS
│       ├── components/       # DropZone, ClaimsList, Pipeline
│       └── types/            # Shared TypeScript interfaces
│
├── express-backend/          # API proxy
│   └── src/
│       ├── app.js
│       ├── config.js
│       ├── routes/           # agents.js, extract.js
│       ├── middleware/       # multer upload
│       └── services/         # axios proxy helpers
│
└── roomwitness-rag/          # Python AI microservices
    ├── services/             # Bridge FastAPI services (demo)
    ├── agent01_cv/           # Groq vision agent
    ├── agent02_contract_parser/
    ├── agent03_legal_reasoning/
    ├── agent04_doc_generator/
    ├── legacy/               # rag_agent.py (used by Agent 03)
    └── portal/               # Original Flask portal (reference)
```

## Team

- **KP** — Lead
- **Beam** — Frontend
- **Tuey** — Tech Lead

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, code conventions, and PR checklist.
