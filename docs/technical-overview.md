# AssetWitness — Technical Overview

## Problem

DAD (Dhanarak Asset Development Co., Ltd.) manages a large, constantly turning-over
property portfolio — government agencies moving into Building C and Pod Duang through
2027, plus a large commercial tenancy (shops, dining, co-working) with regular lease
turnover. Every handover needs its condition documented, and someone needs to answer
quickly and defensibly: what condition was this space in, what changed, and who's
responsible for the difference. AssetWitness turns condition photos, the occupancy or
fit-out agreement, and a list of condition items into a per-item responsibility verdict
and a set of ready-to-file Thai handover documents.

## Architecture

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
```

Each agent is an independent FastAPI microservice behind a fixed port; an Express.js
backend proxies requests from the Next.js frontend and Expo mobile app, handles
multipart file uploads, and persists a lightweight summary of each completed handover
for the Portfolio Condition Dashboard. This decomposition means agents can be
developed, tested, and demoed in isolation, and any agent can be swapped or upgraded
without touching the others as long as its I/O contract holds.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 16 (App Router) + TypeScript | 3000 |
| Backend | Express.js — API proxy, multipart upload, Zod validation, dashboard persistence | 3001 |
| Dashboard DB | Postgres via Prisma (driver-adapter runtime) | 5438 |
| Agent 01 — Condition Comparison | FastAPI + Groq Llama-4-Scout (vision) | 8001 |
| Agent 02 — Agreement Parser | FastAPI + pdfplumber + Typhoon v2 | 8002 |
| Agent 03 — Asset Policy Reasoning | FastAPI + Typhoon v2 + ChromaDB (RAG) | 8003 |
| Agent 04 — Report Generator | FastAPI + Typhoon v2 + ReportLab (Platypus) | 8004 |

A companion Expo/React Native app consumes the same Express API for mobile capture
and review.

## Agent 01 — Condition Comparison (`agent01_condition_comparison/`)

Given a prior/current condition photo pair per item, Llama-4-Scout (via Groq) produces
a structured assessment: `change_detected`, `wear_and_tear`, `likely_occupant_caused`,
and a `confidence` score, plus free-text condition descriptions for both photos.

That raw assessment is deterministically translated into a `CVResult` consumed by
Agent 03 (`agent01_condition_comparison/models.py::translate_to_cv_result`):

| Groq signal | ConditionVerdict | attributable_party |
|---|---|---|
| `change_detected = False` | `UNCHANGED` | `UNDETERMINED` |
| `wear_and_tear = True` | `NORMAL_WEAR` | `UNDETERMINED` |
| `change_detected = True`, `likely_occupant_caused = False` | `PRE_EXISTING` | `DAD` |
| `change_detected = True`, `likely_occupant_caused = True` | `NEW_DAMAGE` | `OCCUPANT` |
| `confidence < 0.30` | `verdict = None`, `status = "unverifiable_by_cv"` | `UNDETERMINED` |
| ambiguous / null `likely_occupant_caused` | `verdict = None` (Agent 03's LLM decides) | `UNDETERMINED` |

Pushing this mapping into deterministic Python rather than free-form LLM output keeps
Agent 03's hard-rule layer reliable — Agent 03 never has to interpret vision-model
prose, only a fixed enum. This 4-way taxonomy (pre-existing / unchanged / normal wear /
new damage) is domain-agnostic — it carried over from RoomWitness unchanged, since
"was this already there / unchanged / ordinary wear / newly caused" isn't specific to
consumer deposit law.

## Agent 02 — Agreement Parser (`agent02_agreement_parser/`)

Extracts text from the occupancy/fit-out agreement PDF (`pdfplumber`, OCR fallback
tracked via `extraction_confidence`), then uses Typhoon v2 to produce a structured
`AgreementSummary` (occupancy dates, notice period, monthly fee, optional deposit
fields — gov't agencies don't typically post a consumer-style deposit) and a
`responsibility_map` — one entry per condition item indicating whether the
agreement's own clauses assign that item to the occupant, whether the clause was
actually found in the text, and whether pre-existing damage was disclosed. It
separately flags `non_compliant_clauses` (clauses that conflict with the State
Property Act / MOF Regulation on state-property leasing) with a
`reason_non_compliant`, so Agent 03 can cite them directly.

## Agent 03 — Asset Policy Reasoning (`agent03_asset_policy_reasoning/`)

The core reasoning agent. For each condition item it:

1. **Applies deterministic hard rules first** (`reasoner.py::apply_hard_rules`) —
   these override the LLM outright:
   - Condition verdict `PRE_EXISTING` → forced `DAD_RESPONSIBILITY` (condition
     predates this handover — it's DAD's asset, DAD's responsibility).
   - `UNCHANGED` or `NORMAL_WEAR` → forced `NORMAL_WEAR` (not chargeable to anyone).
   - `NEW_DAMAGE` with no signed handover report → forced `DISPUTED` (damage is real,
     but baseline condition can't be proven either way).
   - Condition confidence `< 0.60` → forced `DISPUTED` regardless of verdict label
     (don't let a low-confidence vision call decide the case).
   - No condition data (`unverifiable_by_cv` or Agent 01 not run) → no forced verdict;
     the LLM reasons from the agreement + policy alone.
   When a hard rule fires, Typhoon v2 still writes the Thai/English reasoning and
   picks citations, but the responsibility value itself is locked
   (`FORCED_RESPONSIBILITY_INSTRUCTION`) — the model cannot override a hard rule.

2. **Retrieves relevant policy** via ChromaDB semantic search (`retriever.py`) over a
   pre-seeded asset-policy collection — a query built from the item name, description,
   and condition verdict label returns the top-k matching chunks from the State
   Property Act B.E. 2562, MOF Regulation B.E. 2552, the Procurement Act B.E. 2560
   (fit-out framing), and explicit DAD-policy placeholders, each carrying `text_th`,
   `text_en`, `clause`, and a pre-authored `legal_implication`/`agent03_use`
   annotation used to steer the LLM.

3. **Reasons with Typhoon v2** (SCB10X's Thai-native LLM) over the assembled context —
   item details, condition verdict, agreement liability, retrieved policy chunks — to
   produce an `ItemVerdict`: `responsibility`, bilingual reasoning, `citations`, a
   recommended action in Thai, and a `responsibility_confidence_pct`.

4. **Selects documents** (`document_selector.py::select_documents`) from `case_type`
   and whether any item came back `DISPUTED` — every handover gets a condition
   certification report; fit-out cases additionally get a completion checklist;
   disputed cases additionally get a liability summary. Unlike RoomWitness's routing
   (which court to file in, based on landlord unit count), this isn't about legal
   venue — there's no "route," just a document set.

This hard-rules-then-LLM design means the unambiguous cases (pre-existing condition,
normal wear, unchanged) are never subject to model variance — the LLM's job is
producing well-cited natural-language reasoning for a responsibility that's already
decided, and doing the actual judgment call only in genuinely disputed territory.

## Agent 04 — Report Generator (`services/agent04_service.py`)

Takes Agent 03's item verdicts and case summary and uses Typhoon v2 plus ReportLab
(Platypus) templates to render up to three Thai-language documents: a condition
certification report (always), a fit-out completion checklist (fit-out cases), and a
liability summary (disputed cases, explicitly framed as dispute-resolution support
evidence, not a final verdict). Output is saved to local disk
(`assetwitness-pipeline/outputs/`).

## Portfolio Condition Dashboard

The one genuinely new feature beyond the RoomWitness-derived pipeline (which has no
aggregation/persistence layer — every case there was stateless request/response).
After Agent 04 completes, the client posts a lightweight summary row — building,
case type, responsibility totals, `needs_dispute_resolution`, timestamp — to
`POST /dashboard/cases` (Express + Prisma + Postgres). `GET /dashboard/summary`
aggregates by building (handover count, dispute rate, responsibility totals), and the
Next.js `/dashboard` page renders it sorted by dispute rate, flagging buildings above
a threshold — surfacing where deferred maintenance or high-dispute patterns are
concentrated, per `docs/AssetWitness.md`'s product-line description.

## Data contracts

Each agent's I/O is a Pydantic model, and the boundary types are duplicated
deliberately (e.g. `CVResult` appears in both `agent01_condition_comparison/models.py`
and `agent03_asset_policy_reasoning/models.py` with a comment noting they must match)
rather than imported cross-package — this keeps each FastAPI service independently
deployable without a shared library dependency, at the cost of needing to keep both
definitions in sync by hand when the schema changes.

## Known gaps / honesty notes

- DAD's own granular handover/damage-vs-wear criteria are not public (checked
  dad.co.th, treasury.go.th — no tenant handbook, fit-out standard, or condition
  checklist found). The corpus includes explicit placeholder chunks
  (`status: "placeholder_pending_dad_policy"`) for this, and Agent 03's reasoning
  notes when a verdict rests on one rather than presenting it as settled — see
  [asset-policy-methodology.md](asset-policy-methodology.md).
- Contract OCR falls back gracefully but `extraction_confidence` should be surfaced to
  the user when low, since Agent 03's reasoning quality depends on it.
- The Portfolio Condition Dashboard stores only aggregate numbers per handover, not
  full agent payloads — it's a rollup, not a system of record for individual case
  detail.
