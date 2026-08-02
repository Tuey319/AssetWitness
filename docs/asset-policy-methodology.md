# AssetWitness — Asset Policy Methodology

## Scope

AssetWitness classifies each handover condition item's responsibility as
**NORMAL_WEAR**, **OCCUPANT_RESPONSIBILITY**, **DAD_RESPONSIBILITY**, or **DISPUTED**
under Thai state-property law and DAD's own (where public) policies. The corpus and
reasoning logic live in `assetwitness-pipeline/agent03_asset_policy_reasoning/`.

## Legal sources

Real, citable state-property law exists and is used, stored as structured JSON chunks
in `agent03_asset_policy_reasoning/asset_policy_corpus/` and embedded into a ChromaDB
collection for retrieval:

1. **State Property Act B.E. 2562 (2019)** (พระราชบัญญัติที่ราชพัสดุ) —
   `state_property_act_2562.json`. Defines state property and delegates the detailed
   rules for governance, maintenance, use, and benefit-generation (including leasing)
   to Ministry of Finance regulation. Confirms any DAD-managed handover (Building C,
   Pod Duang, the Government Complex buildings) falls within its scope.
2. **MOF Regulation on Benefit-Generation of State Property B.E. 2552 (2009)**
   (ระเบียบกระทรวงการคลังว่าด้วยการจัดหาประโยชน์ในที่ราชพัสดุ) —
   `mof_regulation_2552.json`. The direct functional analog to a standard lease law —
   governs leasing/benefit-generation arrangements on state property, including one
   confirmed provision used directly: **occupants must return state property within
   30 days of notice**.
3. **Public Procurement and Supplies Management Act B.E. 2560 (2017)**
   (พระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ) — also in
   `mof_regulation_2552.json`. Its inspection-acceptance provisions (การตรวจรับพัสดุ)
   are a plausible secondary citation for fit-out completion checklists specifically —
   a weaker fit than the leasing regulation (oriented at goods/construction
   procurement, not tenant occupancy), used only as supporting framing for
   `fit_out_inspection` cases.
4. **DAD-specific policy — explicit placeholder** (`dad_placeholder_policies.json`).
   DAD's own granular handover/damage-vs-wear criteria and fit-out completion standard
   are **not public** (checked dad.co.th, treasury.go.th — no tenant handbook, fit-out
   standard, or condition checklist found). Rather than inventing section numbers,
   these chunks are explicitly marked `"status": "placeholder_pending_dad_policy"` and
   Agent 03's `agent03_use` annotation instructs the reasoning output to flag any
   verdict resting on one as needing DAD sign-off, not present it as settled — matching
   this project's own "if we can't cite it, we call it an assumption" standard down to
   the citation level (see `docs/AssetWitness.md`'s Validation section).

Each corpus chunk carries both the Thai statutory text (`text_th`) and an English
translation (`text_en`), plus a pre-authored `legal_implication` and `agent03_use`
annotation that tells the reasoning agent when the chunk is dispositive — this is what
lets a general-purpose LLM apply the policy consistently rather than re-deriving
conclusions from raw statutory text on every call.

## How each source is used

| Chunk | Rule | Use in classification |
|---|---|---|
| `SPA_2562_definition` | State property definition (มาตรา 6) | Confirms scope — the handover premises are state property under the Act |
| `SPA_2562_delegation` | Detailed rules delegated to MOF Regulation | Framing — explains why the Act is cited for scope/authority, not specific wear thresholds |
| `MOF_2552_scope` | Governs leasing/benefit-generation on state property | Primary regulation for occupancy/lease-term matters |
| `MOF_2552_return_notice` | 30-day return-of-property notice period | Confirmed provision — cite directly for move-out notice-period questions |
| `PROCUREMENT_2560_inspection_acceptance` | State agencies must inspect condition/completeness before acceptance | Supporting framing for `fit_out_completion_checklist`, not the primary basis for responsibility splits |
| `DAD_PLACEHOLDER_normal_wear` | DAD's own wear-and-tear threshold | Placeholder only — flag as pending DAD input if retrieved |
| `DAD_PLACEHOLDER_fit_out_standard` | DAD's own fit-out completion standard | Placeholder only — flag as pending DAD sign-off if retrieved |

## Classification pipeline

For each condition item, `agent03_asset_policy_reasoning/reasoner.py` applies logic in
two stages:

**Stage 1 — deterministic hard rules** (`apply_hard_rules`), which override the LLM:

| Condition | Forced responsibility | Rationale |
|---|---|---|
| Condition verdict = `PRE_EXISTING` | `DAD_RESPONSIBILITY` | Condition predates this handover — DAD's asset, DAD's responsibility |
| Condition verdict = `UNCHANGED` | `NORMAL_WEAR` | No change occurred |
| Condition verdict = `NORMAL_WEAR` | `NORMAL_WEAR` | Ordinary use, not chargeable to anyone |
| Condition verdict = `NEW_DAMAGE`, no signed handover report | `DISPUTED` | Damage is real, but baseline condition can't be evaluated without one |
| Condition confidence < 0.60 | `DISPUTED` | Insufficient visual certainty to let a hard rule decide |
| No condition data available (`unverifiable_by_cv` or Agent 01 not run) | *(none — LLM decides)* | Reasoning proceeds from agreement + policy alone |

**Stage 2 — RAG-grounded LLM reasoning.** A retrieval query is built from the item
name, description, and condition verdict label; the top-k matching policy chunks
(Thai + English, with clause reference) are retrieved from ChromaDB and injected into
the prompt alongside the item, condition verdict/confidence, agreement liability
finding, and whether a handover report was signed. Typhoon v2 (SCB10X's Thai-native
LLM) produces the final `ItemVerdict`: responsibility, bilingual reasoning, specific
citations, a recommended action in Thai, and a responsibility-confidence percentage.
If Stage 1 forced a responsibility, Typhoon still writes the reasoning/citations but
the responsibility value itself cannot be changed — the model is locked out of
overriding a hard rule.

This two-stage design exists so that unambiguous situations (pre-existing condition,
ordinary wear, unchanged) are decided by code, not model sampling — the LLM's
discretion is confined to genuinely new, occupant-caused damage, where the applicable
policy actually requires judgment.

## Document selection

`document_selector.py::select_documents` decides which of the 3 documents to generate,
based on `case_type` and whether any item came back `DISPUTED`:

| Condition | Documents generated |
|---|---|
| Always | Condition certification report |
| `case_type = fit_out_inspection` | + Fit-out completion checklist |
| Any item `DISPUTED` | + Liability summary (explicitly framed as dispute-resolution support evidence, not a final verdict) |

Unlike RoomWitness's routing (which court to file in, based on landlord unit count),
this isn't about legal venue at all — there's no "route," just a document set, since
AssetWitness's neutral, portfolio-scale positioning doesn't involve adversarial filing
options the way an individual consumer deposit dispute does.

## Limitations / honesty notes

- The corpus covers scope/authority (State Property Act), leasing/return-notice
  mechanics (MOF Regulation), and fit-out inspection framing (Procurement Act) — it is
  not an exhaustive restatement of Thai state-property law, and does not cover every
  possible handover dispute scenario.
- DAD's own granular condition/wear/fit-out standards are confirmed **not public** as
  of this writing — any responsibility verdict resting on a placeholder chunk should
  be treated as provisional pending real DAD policy documents, not as settled.
- Classifications and generated documents are decision support for DAD's asset
  management team, not a substitute for legal counsel — particularly for high-value
  disputes or cases that escalate beyond internal resolution.
