# RoomWitness — Legal Methodology

## Scope

RoomWitness classifies each landlord damage/deposit deduction claim as **LAWFUL**,
**DISPUTED**, or **UNLAWFUL** under Thai law, and routes the tenant to the correct
filing venue. The legal corpus and reasoning logic live in
`roomwitness-rag/agent03_legal_reasoning/`.

## Legal sources

Two bodies of law are used, stored as structured JSON chunks in
`agent03_legal_reasoning/legal_corpus/` and embedded into a ChromaDB collection
(`thai_rental_law`) for retrieval:

1. **Civil and Commercial Code (CCC), §537–571** (ประมวลกฎหมายแพ่งและพาณิชย์) — the
   general law of lease (เช่าทรัพย์). Original code provisions, no sunset date. Applies
   to *every* residential lease regardless of landlord size.
2. **OCPB Notification B.E. 2568 (2025)** (ประกาศคณะกรรมการว่าด้วยสัญญา) — a specific
   consumer-protection notification from the Office of the Consumer Protection Board
   governing residential lease contract terms, effective 2025-09-04. Applies only to
   landlords operating **3 or more residential units**, including via online platforms.

Each corpus chunk carries both the Thai statutory text (`text_th`) and an English
translation (`text_en`), plus a pre-authored `legal_implication` and `agent03_use`
annotation that tells the reasoning agent when the chunk is dispositive — this is what
lets a general-purpose LLM apply the law consistently rather than re-deriving legal
conclusions from raw statutory text on every call.

## Key CCC provisions and how they're used

| Section | Rule | Use in classification |
|---|---|---|
| §546 | Landlord must deliver the property in good repair | Pre-existing damage is landlord's responsibility — cannot be charged at move-out |
| §547 | Landlord reimburses necessary preservation costs; tenant only bears ordinary maintenance/petty repairs | Draws the DISPUTED boundary between minor tenant repair and major landlord repair |
| §548 | Tenant may terminate if property delivered unfit | Supporting citation for UNLAWFUL pre-existing-damage verdicts |
| §550 | Landlord liable for defects arising during the tenancy from non-tenant causes | UNLAWFUL when charged damage is really structural/systemic failure |
| §552 | Tenant may not use the property outside customary/contractual use | Landlord's basis for a claim — rebutted if use was normal and customary |
| §553 | Tenant standard of care is "ordinary prudence," not perfection | Rebuts negligence claims where tenant lived normally |
| §558 | Unauthorized alterations must be restored to original condition; tenant liable for resulting damage | LAWFUL for unauthorized structural change, but capped at restoration cost, not full replacement |
| §561 | Absent a signed move-in condition report, tenant is *presumed* to have received the unit in good repair and must return it as such, unless tenant proves otherwise | Central burden-of-proof rule — Agent 01's move-in photos are what rebut this presumption |
| §562 | Tenant liable only for damage from their own/household's fault, not from proper use | Core citation for DISPUTED/UNLAWFUL wear-and-tear cases |
| §563 | Landlord's claim against tenant is time-barred 6 months after return of property | Checked against move-out date; claims filed later are time-barred |
| §222 + §562 (proportionality doctrine) | Damages are limited to actual loss; full replacement cost can't be claimed for a partially damaged or depreciated item | Flags disproportionate claim amounts as DISPUTED even when some damage is real |

## Key OCPB 2568 provisions and how they're used

| Rule | Use in classification |
|---|---|
| Scope: 3+ units, incl. online platforms | Gates whether OCPB rules apply at all (see Routing below) |
| Deposit capped at 1 month's rent | UNLAWFUL if a 3+-unit landlord collected/withheld more than 1 month's deposit |
| Deposit must be returned within 7 days if no damage claimed | UNLAWFUL if held past 7 days with no claim |
| If damage is claimed, verified deductions returned within 14 days | Flags withholding beyond 14 days with no return |
| Wear-and-tear liability clauses are void | UNLAWFUL whenever wear-and-tear is charged to the tenant, regardless of what the lease says |
| No forfeiture without verified evidence | UNLAWFUL if landlord can't produce evidence matching the claimed damage |
| Signed move-in condition report is mandatory | Undermines the landlord's claim entirely if absent |
| Penalties: up to 1 year imprisonment and/or ฿200,000 fine | Cited in the OCPB complaint document to show personal liability exposure |
| Utility charges capped at official MEA/PEA/MWA rates | UNLAWFUL if inflated utility charges were deducted from deposit |
| No unilateral rent increase mid-term | UNLAWFUL if a deduction relates to a rent increase the tenant refused |
| Tenant early-termination right (after ≥half the term, 30 days' notice) | UNLAWFUL if deposit is forfeited as an early-exit penalty despite proper notice |

## Classification pipeline

For each claim, `agent03_legal_reasoning/reasoner.py` applies logic in two stages:

**Stage 1 — deterministic hard rules** (`apply_hard_rules`), which override the LLM:

| Condition | Forced verdict | Rationale |
|---|---|---|
| CV verdict = `PRE_EXISTING` | UNLAWFUL | §546/§548/§561 — landlord's delivery duty |
| CV verdict = `UNCHANGED` | UNLAWFUL | No damage occurred |
| CV verdict = `NORMAL_WEAR` | UNLAWFUL | OCPB 2568 voids wear-and-tear liability outright |
| CV verdict = `NEW_DAMAGE`, no signed move-in report | DISPUTED | Damage is real, but §561's presumption can't be evaluated without a baseline |
| CV confidence < 0.60 | DISPUTED | Insufficient visual certainty to let a hard rule decide |
| No CV data available | *(none — LLM decides)* | Reasoning proceeds from contract + law alone |

**Stage 2 — RAG-grounded LLM reasoning.** A retrieval query is built from the item
name, landlord's description, and CV verdict label; the top-k matching law chunks
(Thai + English, with clause reference) are retrieved from ChromaDB and injected into
the prompt alongside the claim, CV verdict/confidence, and Agent 02's contract
liability finding. Typhoon v2 (SCB10X's Thai-native LLM) produces the final
`ClaimVerdict`: verdict, bilingual reasoning, specific citations, a recommended action
in Thai, and a claim-validity percentage. If Stage 1 forced a verdict, Typhoon still
writes the reasoning/citations but the verdict value itself cannot be changed — the
model is locked out of overriding a hard rule.

This two-stage design exists so that legally unambiguous situations (explicitly void
clauses, provably pre-existing damage, ordinary wear) are decided by code, not model
sampling — the LLM's discretion is confined to genuinely disputed territory, where the
law itself requires balancing (e.g. proportionality of a repair charge).

## Routing

`router.py::determine_routing` decides where the tenant should file, based on landlord
unit count (collected from the contract/tenant input):

| Landlord unit count | Route | Documents generated |
|---|---|---|
| ≥ 3 | OCPB | OCPB complaint, demand letter, evidence summary |
| 1–2 | Civil court | Demand letter, evidence summary (OCPB has no jurisdiction; CCC §537–571 is the basis) |
| Unknown (0) | Both | All three documents, with a note telling the tenant to confirm unit count before filing the OCPB complaint |

This matters because OCPB Notification B.E. 2568 is a consumer-protection instrument
that only binds landlords operating at commercial scale (3+ units); an individual
landlord renting out a single condo is outside its scope and must be pursued under the
general Civil and Commercial Code instead. Defaulting to "generate everything" when
unit count is unknown avoids silently excluding a filing option the tenant may be
entitled to.

## Limitations / honesty notes

- The corpus is a curated set of provisions selected for deposit-dispute relevance,
  not an exhaustive restatement of Thai lease law — it does not cover every possible
  landlord/tenant dispute scenario (e.g. subletting, early termination for cause,
  habitability defects unrelated to deposits).
- OCPB 2568 is a 2025 notification; verify current effective status and any amendments
  before relying on it for an actual filing, since notifications of this kind can be
  amended or superseded.
- Classifications and generated documents are decision support, not a substitute for
  a licensed Thai lawyer's advice — particularly for claims near the CCC §563 six-month
  limitation period or amounts large enough to warrant formal legal counsel.
