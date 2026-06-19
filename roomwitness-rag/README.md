# RoomWitness RAG — Thai Rental Deposit Legal Classifier

Classifies landlord deposit deduction claims against Thai law (CCC §537-571 and the OCPB 2025 rental notification) using a retrieval-augmented GPT-4o pipeline.

---

## Setup

```bash
cd roomwitness-rag
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

---

## Build the corpus

```bash
python build_corpus.py
```

This will:
1. Scrape CCC §537–571 from krisdika.go.th → `corpus/raw/ccc_NNN.txt`
2. Download and extract the OCPB 2025 PDF → `corpus/raw/ocpb_2025.txt`
3. Chunk all text → `corpus/chunks/all_chunks.json`
4. Embed with `text-embedding-3-small` and store in ChromaDB at `./chroma_db`

If the corpus already exists in ChromaDB, the embedding step is skipped automatically.

---

## If the OCPB PDF must be downloaded manually

If `scrape_ocpb.py` cannot download the file automatically, it will print instructions. In short:

1. Open [https://ratchakitcha.soc.go.th](https://ratchakitcha.soc.go.th)
2. Search for: `ประกาศคณะกรรมการว่าด้วยสัญญา เรื่อง ให้ธุรกิจการให้เช่าอาคาร`
3. Find the notification dated **4 September 2025 (2568 BE)**
4. Download the PDF and save it as: `corpus/raw/ocpb_2025.pdf`
5. Re-run: `python build_corpus.py`

---

## Start the portal

```bash
flask --app portal/app.py run
```

Then open [http://localhost:5000](http://localhost:5000).

---

## Run the RAG agent test (no portal)

```bash
python rag_agent.py
```

Prints a JSON classification for a sample wall-paint damage claim.

---

## Project structure

```
roomwitness-rag/
├── scraper/
│   ├── scrape_ccc.py       # CCC §537-571 scraper
│   └── scrape_ocpb.py      # OCPB 2025 PDF downloader + extractor
├── corpus/
│   ├── raw/                # Scraped .txt files and PDF
│   └── chunks/             # all_chunks.json
├── build_corpus.py         # Runs scraping → chunking → embedding
├── rag_agent.py            # Classification pipeline
├── portal/
│   ├── app.py              # Flask routes
│   ├── templates/index.html
│   └── static/style.css
├── requirements.txt
└── .env.example
```

---

## Environment variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `CHROMA_PATH` | Path for ChromaDB persistence (default: `./chroma_db`) |
