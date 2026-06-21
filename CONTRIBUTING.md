# Contributing to RoomWitness

## Architecture

```
Browser
  │
  ▼
Next.js frontend  (port 3000)     nextjs-frontend/
  │  Rewrites /run/* and /extract-contract to Express
  │
  ▼
Express.js backend  (port 3001)   express-backend/
  │  Proxies requests to Python AI microservices
  │
  ├──► Python Agent 01  (port 8001)  roomwitness-rag/services/agent01_service.py
  ├──► Python Agent 02  (port 8002)  roomwitness-rag/services/agent02_service.py
  ├──► Python Agent 03  (port 8003)  roomwitness-rag/services/agent03_service.py
  └──► Python Agent 04  (port 8004)  roomwitness-rag/services/agent04_service.py
```

Python microservice endpoints (used by the bridge services):
- Each service runs logic from `roomwitness-rag/portal/app.py` as a standalone FastAPI app
- The production FastAPI apps in `agent*/main.py` use S3 URLs and are for deployment

---

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API key (free at https://console.groq.com)
- `CHROMA_PATH` must point to a seeded ChromaDB collection

### 1 — Python services

```bash
cd roomwitness-rag

# Install dependencies
pip install fastapi uvicorn groq chromadb pdfplumber python-dotenv

# Copy and fill in credentials
cp .env.example .env

# Seed ChromaDB (run once)
python agent03_legal_reasoning/seed_corpus.py

# Start services (each in a separate terminal)
uvicorn services.agent01_service:app --port 8001 --reload
uvicorn services.agent02_service:app --port 8002 --reload
uvicorn services.agent03_service:app --port 8003 --reload
uvicorn services.agent04_service:app --port 8004 --reload
```

### 2 — Express backend

```bash
cd express-backend
npm install
cp .env .env.local  # already configured for localhost
npm run dev         # starts on port 3001
```

### 3 — Next.js frontend

```bash
cd nextjs-frontend
npm install
# .env.local already points to http://localhost:3001
npm run dev         # starts on port 3000
```

Open http://localhost:3000

---

## Repository Layout

```
RoomWitness/
├── nextjs-frontend/       # React UI (Next.js 14, TypeScript)
│   └── src/
│       ├── app/           # App Router pages + global CSS
│       ├── components/    # DropZone, ClaimsList, Pipeline
│       └── types/         # Shared TypeScript interfaces
│
├── express-backend/       # API proxy server (Express.js)
│   └── src/
│       ├── app.js         # Express setup
│       ├── config.js      # Env var loading
│       ├── routes/        # agents.js, extract.js, index.js
│       ├── middleware/     # upload.js (multer)
│       └── services/      # agentClient.js (axios helpers)
│
└── roomwitness-rag/       # Python AI microservices
    ├── services/          # Bridge FastAPI services (ports 8001-8004)
    ├── agent01_cv/        # Groq Llama-4-Scout vision agent
    ├── agent02_contract_parser/
    ├── agent03_legal_reasoning/
    ├── agent04_doc_generator/
    ├── legacy/            # rag_agent.py (used by agent03 service)
    └── portal/            # Original Flask portal (reference only)
```

---

## Code Conventions

### JavaScript (Express / Node)
- CommonJS (`require/module.exports`) throughout Express backend
- Route files export an Express Router
- Controller logic lives in route handlers (thin layer — just proxy)
- All errors forwarded via `next(err)` to the central error handler in `app.js`
- Temp files from multer cleaned up in `finally` blocks via `agentClient.cleanupFiles()`

### TypeScript (Next.js)
- All components are `'use client'` (form is fully interactive)
- Props typed with interfaces from `src/types/index.ts`
- State lifted to `page.tsx`; components receive values + callbacks
- No third-party state library — React `useState` only

### Python (FastAPI bridge services)
- Each service is self-contained: no cross-service imports
- CORS enabled for all origins (dev only — restrict in production)
- Sync route functions used where possible to keep code readable
- `/health` endpoint on every service (checked by Express `/health` route)

---

## Adding a New Agent

1. **Python service** — create `roomwitness-rag/services/agentXX_service.py`
   - Register `POST /api/v1/agentXX` that returns JSON
   - Register `GET /health`

2. **Express route** — add handler in `express-backend/src/routes/agents.js`
   ```js
   router.post('/agentXX', async (req, res, next) => { ... });
   ```

3. **Next.js page** — call `/run/agentXX` from `page.tsx` pipeline in sequence

4. **Next.js rewrite** — already covered by `/run/:path*` in `next.config.ts`

---

## Pull Request Checklist

- [ ] Python services tested with `curl` or the FastAPI `/docs` UI
- [ ] Express routes tested end-to-end (Next.js → Express → Python)
- [ ] TypeScript compiles: `cd nextjs-frontend && npm run build`
- [ ] No secrets committed (`.env`, API keys)
- [ ] Temp files cleaned up in finally blocks (no leaks in `/tmp`)
