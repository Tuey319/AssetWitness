# Migrating RoomWitness to Express.js + Python Microservices

## Why this split makes sense

The current Flask portal does two unrelated things: serves HTML and calls Python AI code directly via imports. Splitting them gives you:

- **Express.js** — web server, routing, file uploads, session, serving frontend
- **Python agents** — AI-only microservices (Groq, ChromaDB, LangChain, Typhoon)

Python agents stay untouched. Express just calls them over HTTP instead of importing them.

---

## Target Architecture

```
Browser
  │
  ▼
Express.js  (port 3000)          ← replaces Flask portal
  │  serves frontend HTML/CSS/JS
  │  handles file uploads (multer)
  │  proxies requests to Python agents
  │
  ├──► Python Agent 01  (port 8001)  Groq CV
  ├──► Python Agent 02  (port 8002)  Typhoon v2 Contract Parser
  ├──► Python Agent 03  (port 8003)  ChromaDB RAG Legal Reasoning
  └──► Python Agent 04  (port 8004)  Document Generator
```

The Python FastAPI agents (8001-8004) keep running exactly as they are.
Express replaces only `portal/app.py` and becomes the single entry point.

---

## What stays in Python (unchanged)

```
agent01_cv/          — Groq vision, keep running with uvicorn
agent02_contract_parser/
agent03_legal_reasoning/
agent04_doc_generator/
shared/
legacy/
```

No changes to any of these. Python handles all AI.

---

## What moves to Express

| Current (Flask)             | New (Express)                        |
|-----------------------------|--------------------------------------|
| `portal/app.py`             | `express-portal/server.js`           |
| `portal/templates/index.html` | `express-portal/public/index.html` |
| `portal/static/style.css`   | `express-portal/public/style.css`   |
| Flask routes `/run/agent0X` | Express routes `/run/agent0X`        |
| Flask file uploads          | multer middleware                    |
| pdfplumber PDF extract      | pdf-parse npm package                |

---

## Step-by-step Migration

### 1. Initialize the Express project

```bash
mkdir express-portal
cd express-portal
npm init -y
npm install express multer axios form-data pdf-parse dotenv cors
```

### 2. Project structure

```
express-portal/
├── server.js          # main app
├── routes/
│   ├── agent01.js     # POST /run/agent01
│   ├── agent02.js     # POST /run/agent02
│   ├── agent03.js     # POST /run/agent03
│   ├── agent04.js     # POST /run/agent04
│   └── extract.js     # POST /extract-contract
├── public/
│   ├── index.html     # copy from portal/templates/index.html
│   └── style.css      # copy from portal/static/style.css
├── .env
└── package.json
```

### 3. `.env`

```
AGENT01_URL=http://localhost:8001
AGENT02_URL=http://localhost:8002
AGENT03_URL=http://localhost:8003
AGENT04_URL=http://localhost:8004
PORT=3000
```

### 4. `server.js`

```js
const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/run/agent01',       require('./routes/agent01'));
app.use('/run/agent02',       require('./routes/agent02'));
app.use('/run/agent03',       require('./routes/agent03'));
app.use('/run/agent04',       require('./routes/agent04'));
app.use('/extract-contract',  require('./routes/extract'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(process.env.PORT || 3000, () => {
  console.log(`RoomWitness Express running on http://localhost:${process.env.PORT || 3000}`);
});
```

### 5. Agent 01 route — `routes/agent01.js`

```js
const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const router   = express.Router();
const upload   = multer({ dest: '/tmp/' });

router.post('/', upload.fields([
  { name: 'move_in', maxCount: 1 },
  { name: 'move_out', maxCount: 1 },
]), async (req, res) => {
  try {
    const fd = new FormData();
    fd.append('claims', req.body.claims || '[]');

    if (req.files?.move_in?.[0]) {
      fd.append('move_in', fs.createReadStream(req.files.move_in[0].path),
        req.files.move_in[0].originalname);
    }
    if (req.files?.move_out?.[0]) {
      fd.append('move_out', fs.createReadStream(req.files.move_out[0].path),
        req.files.move_out[0].originalname);
    }

    const { data } = await axios.post(
      `${process.env.AGENT01_URL}/api/v1/agent01`, fd,
      { headers: fd.getHeaders() }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up temp files
    Object.values(req.files || {}).flat().forEach(f => {
      try { fs.unlinkSync(f.path); } catch {}
    });
  }
});

module.exports = router;
```

### 6. Agent 03 route — `routes/agent03.js`

```js
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

router.post('/', async (req, res) => {
  try {
    const { data } = await axios.post(
      `${process.env.AGENT03_URL}/api/v1/agent03`, req.body
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

Agent 02 and 04 routes follow the same pattern (multipart for 02, JSON for 04).

### 7. PDF extraction — `routes/extract.js`

```js
const express = require('express');
const multer  = require('multer');
const pdfParse = require('pdf-parse');
const fs      = require('fs');
const router  = express.Router();
const upload  = multer({ dest: '/tmp/' });

router.post('/', upload.single('contract_file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const buffer = fs.readFileSync(req.file.path);
    const { text } = await pdfParse(buffer);
    if (!text.trim()) return res.status(422).json({ error: 'Could not extract text from PDF' });
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    try { fs.unlinkSync(req.file.path); } catch {}
  }
});

module.exports = router;
```

### 8. Frontend — no changes needed

Copy `portal/templates/index.html` → `express-portal/public/index.html`
Copy `portal/static/style.css` → `express-portal/public/style.css`

The frontend already calls `/run/agent01`, `/run/agent02` etc. — same paths, same JSON. No JS changes required.

### 9. Run everything

```bash
# Terminal 1-4 — Python agents (unchanged)
uvicorn agent01_cv.main:app --port 8001
uvicorn agent02_contract_parser.main:app --port 8002
uvicorn agent03_legal_reasoning.main:app --port 8003
uvicorn agent04_doc_generator.main:app --port 8004

# Terminal 5 — Express portal
cd express-portal
node server.js
```

Open http://localhost:3000

---

## Key differences from Flask portal

| Concern            | Flask                        | Express                          |
|--------------------|------------------------------|----------------------------------|
| File uploads       | `request.files`              | `multer` middleware              |
| PDF extraction     | `pdfplumber`                 | `pdf-parse` npm                  |
| HTTP calls to agents | direct Python imports       | `axios` HTTP calls               |
| Temp file cleanup  | manual in `finally`          | manual in `finally` (same)       |
| Static files       | `Flask(__name__)` auto-serve | `express.static('public')`       |
| Env vars           | `python-dotenv`              | `dotenv` npm                     |

---

## Important: update frontend `/run/agent0X` URLs

Currently the frontend calls the Flask portal's own routes (`/run/agent01` etc.) which then **import** Python code directly. After migration, Express calls the **FastAPI endpoints** (`/api/v1/agent01` etc.) over HTTP.

The frontend URLs stay the same (`/run/agent01`). Only the backend changes — Express receives the request, forwards to FastAPI, returns the response.

---

## What to do about the Flask portal mock routes?

The `portal/app.py` mock routes (`/mock/agent01`, `/run/agent02` etc.) can be kept running in parallel during the transition, or replaced one at a time. Recommend:

1. Build Express routes for Agent 01 and 03 first (real Groq + RAG)
2. Keep Flask mock for Agent 02 and 04 until Typhoon v2 is configured
3. Once all agents work in Express, decommission Flask portal

---

## Packages to install

```bash
npm install express multer axios form-data pdf-parse dotenv cors
```

No Python packages change. The AI stack is unchanged.
