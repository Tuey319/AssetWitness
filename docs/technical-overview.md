# RoomWitness — Technical Overview

## Problem

Bangkok renters routinely lose part or all of their security deposit to landlord
damage claims they have no practical way to contest — no legal knowledge, no time,
and no structured evidence. RoomWitness turns move-in/move-out photos, chat
screenshots, and the lease into a per-claim legal verdict and a set of ready-to-file
Thai legal documents.

## Architecture

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
        3 Thai legal PDFs → local storage / S3
```

Each agent is an independent FastAPI microservice behind a fixed port; an Express.js
backend proxies requests from the Next.js frontend and handles multipart file uploads.
This decomposition means agents can be developed, tested, and demoed in isolation
(e.g. `python agent01_cv.py move_in.jpg move_out.jpg` from the CLI), and any agent can
be swapped or upgraded without touching the others as long as its I/O contract holds.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 14 (App Router) + TypeScript | 3000 |
| Backend | Express.js — API proxy, multipart upload, Zod validation | 3001 |
| Agent 01 — CV | FastAPI + Groq Llama-4-Scout (vision) | 8001 |
| Agent 02 — Contract Parser | FastAPI + pdfplumber + Typhoon v2 | 8002 |
| Agent 03 — Legal Reasoning | FastAPI + Typhoon v2 + ChromaDB (RAG) | 8003 |
| Agent 04 — Doc Generator | FastAPI + Typhoon v2 + ReportLab (Platypus) | 8004 |

A companion Expo/React Native app consumes the same Express API for mobile capture
and review.

## Agent 01 — CV Comparison (`agent01_cv/`)

Given a move-in/move-out photo pair per claimed item, Llama-4-Scout (via Groq) produces
a structured assessment: `change_detected`, `wear_and_tear`, `likely_tenant_caused`,
`supports_landlord_claim` (YES/NO/PARTIAL), and a `confidence` score, plus free-text
condition descriptions for both photos.

That raw assessment is deterministically translated into a `CVVerdict` consumed by
Agent 03 (`agent01_cv/models.py::translate_to_cv_result`):

| Groq signal | CVVerdict |
|---|---|
| `change_detected = False` | `UNCHANGED` |
| `wear_and_tear = True` | `NORMAL_WEAR` |
| `change_detected = True`, `likely_tenant_caused = False` | `PRE_EXISTING` |
| `change_detected = True`, `likely_tenant_caused = True` | `NEW_DAMAGE` |
| `confidence < 0.30` | `verdict = None`, `status = "unverifiable_by_cv"` |
| `PARTIAL` / ambiguous | `verdict = None` (Agent 03's LLM decides) |

Pushing this mapping into deterministic Python rather than free-form LLM output keeps
Agent 03's hard-rule layer reliable — Agent 03 never has to interpret vision-model
prose, only a fixed enum.

A second pass over uploaded chat screenshots (LINE/WhatsApp/SMS) extracts
landlord/tenant promises and deposit-related statements (`agent01_cv/evidence.py`),
which are folded into the same case context.

## Agent 02 — Contract Parser (`agent02_contract_parser/`)

Extracts text from the lease PDF (`pdfplumber`, OCR fallback tracked via
`extraction_confidence`), then uses Typhoon v2 to produce a structured
`ContractSummary` (deposit amount/months, lease dates, notice period, rent) and a
`liability_map` — one entry per landlord claim indicating whether the lease's own
clauses assign that item to the tenant, whether the clause was actually found in the
text, and whether pre-existing damage was disclosed. It separately flags
`unfair_clauses` (e.g. clauses assigning normal wear-and-tear to the tenant, or
requiring deposits above the legal cap) with a `reason_void`, so Agent 03 can cite them
directly.

## Agent 03 — Legal Reasoning (`agent03_legal_reasoning/`)

The core reasoning agent. For each claim it:

1. **Applies deterministic hard rules first** (`reasoner.py::apply_hard_rules`) —
   these override the LLM outright:
   - CV verdict `PRE_EXISTING`, `UNCHANGED`, or `NORMAL_WEAR` → forced `UNLAWFUL`
     (landlord cannot charge for damage that predates tenancy, wasn't there, or is
     ordinary wear).
   - `NEW_DAMAGE` with no signed move-in report → forced `DISPUTED` (new damage is
     real, but baseline condition can't be proven either way).
   - CV confidence `< 0.60` → forced `DISPUTED` regardless of verdict label (don't let
     a low-confidence vision call decide the case).
   - No CV data (`unverifiable_by_cv` or Agent 01 not run) → no forced verdict; the LLM
     reasons from contract + law alone.
   When a hard rule fires, Typhoon v2 still writes the Thai/English reasoning and
   picks citations, but the verdict value itself is locked
   (`FORCED_VERDICT_INSTRUCTION`) — the model cannot override a hard rule.

2. **Retrieves relevant law** via ChromaDB semantic search (`retriever.py`) over a
   pre-seeded `thai_rental_law` collection — a query built from the item name,
   landlord's description, and CV verdict label returns the top-k CCC/OCPB chunks,
   each carrying `text_th`, `text_en`, `clause`, and a pre-authored
   `legal_implication` used to steer the LLM.

3. **Reasons with Typhoon v2** (SCB10X's Thai-native LLM) over the assembled context —
   claim details, CV verdict, contract liability, retrieved law chunks — to produce a
   `ClaimVerdict`: `verdict`, bilingual reasoning, `citations`, a recommended action in
   Thai, and a `claim_validity_pct`.

4. **Determines routing** (`router.py::determine_routing`) from landlord unit count:
   OCPB Notification B.E. 2568 only applies to landlords with 3+ units; below that,
   the case routes to civil court under CCC §537–571 (`route: OCPB | CIVIL | BOTH`,
   with `BOTH` used when unit count is unknown so no filing option is prematurely
   excluded).

This hard-rules-then-LLM design means the legally unambiguous cases (explicitly voided
clauses, pre-existing damage, normal wear) are never subject to model variance — the
LLM's job is producing well-cited natural-language reasoning for a verdict that's
already decided, and doing the actual judgment call only in genuinely disputed
territory.

## Agent 04 — Document Generator (`agent04_doc_generator/`)

Not part of the original spec-only scope — since implemented. Takes Agent 03's
verdicts and case summary and uses Typhoon v2 plus ReportLab (Platypus) templates to
render three Thai-language documents: an OCPB complaint, a deposit demand letter, and
an evidence summary. Output is saved to local disk (`roomwitness-rag/outputs/`) by
default; S3 upload support exists in `uploader.py` for production use but is optional.

## Data contracts

Each agent's I/O is a Pydantic model, and the boundary types are duplicated
deliberately (e.g. `CVResult` appears in both `agent01_cv/models.py` and
`agent03_legal_reasoning/models.py` with a comment noting they must match) rather than
imported cross-package — this keeps each FastAPI service independently deployable
without a shared library dependency, at the cost of needing to keep both definitions
in sync by hand when the schema changes.

## Known gaps / honesty notes

- The user-facing "฿X of ฿Y recoverable" total is illustrative in the current UI —
  only `cv_summary.total_disputed_amount` (sum of photo-disputed claims) is backend
  computed; deposit/rent fields are collected but not yet aggregated into a final
  recoverable amount.
- Contract OCR falls back gracefully but `extraction_confidence` should be surfaced to
  the user when low, since Agent 03's reasoning quality depends on it.
