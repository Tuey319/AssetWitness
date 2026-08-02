# AssetWitness — Product & Platform Roadmap (Advisor Notes)

This captures advisor feedback on product direction, platform design, data strategy,
compliance research, and phasing. **Monetization and growth items are intentionally
excluded** (platform-license pricing/ROI, per-handover fee structure, user
acquisition) — those belong in the business plan, not here.

## Market positioning

The RoomWitness-era advisor feedback flagged a narrow, defensible niche over a
shallow "general tenant app" as the right shape — see
[asset-policy-methodology.md](asset-policy-methodology.md) for the depth that
demands. AssetWitness keeps that same discipline but repositions the niche entirely:
instead of one tenant disputing one landlord, it's DAD's asset management team
needing a defensible, portfolio-wide condition record across a large, constantly
turning-over property base (Building C, Pod Duang, the older Government Complex
buildings) on a real 2027 occupancy deadline. The roadmap below treats Handover
Certification as the wedge — Dispute Resolution Support and the Portfolio Condition
Dashboard as expansion *after* the core certification flow is solid, not a parallel
v1 scope.

## Neutral, two-sided by design

Where RoomWitness had to be pushed toward serving both landlord and tenant,
AssetWitness starts there deliberately — DAD (asset owner) and the occupant
(government agency or commercial tenant) are meant to see the same condition record,
not an adversarial one-sided complaint. Concretely:

- **Occupant-facing view.** Both the condition certification report and, when
  relevant, the liability summary should be visible to the occupant, not just DAD's
  internal team — mostly a read-only view onto Agent 03's existing `ItemVerdict`
  output, no new backend logic needed.
- **Mutual responsibility acknowledgment.** Today Agent 03 outputs a responsibility
  verdict and `responsibility_confidence_pct` but no signed acknowledgment flow. A
  feature where both DAD and the occupant see the estimated cost, the
  condition/policy assessment, and can both sign off (or flag disagreement, which is
  exactly what routes a case to `needs_dispute_resolution`) turns the certification
  report from a one-sided record into a settlement instrument — the direct analog to
  RoomWitness's mutual damage-price agreement idea, and still the single
  highest-leverage feature on this list.
- **DAD certification / compliance signal.** A rollup, computable from data
  AssetWitness already collects (handover report signed y/n, dispute rate by
  building, responsibility-split consistency), that could support DAD's own
  compliance reporting to oversight bodies — a natural consumer of the Portfolio
  Condition Dashboard's aggregate data, not a new agent.

## Data strategy (product-facing, not monetization)

- **Benchmark data: typical remediation cost by item type and space category.**
  Needed to sanity-check `estimated_cost_thb` inputs and to eventually flag outlier
  claims the way RoomWitness's proportionality doctrine did — without a reference
  distribution for, say, "carpet replacement in a co-working suite," there's nothing
  to benchmark against.
- **Aggregate data from prior handovers.** The Portfolio Condition Dashboard (see
  [technical-overview.md](technical-overview.md)) is the first cut of this — as
  handover volume grows through the 2027 occupancy wave, it accumulates exactly the
  dataset needed for the benchmark above, plus signal for flagging buildings or
  tenant types with unusually high dispute rates. Scope any expansion as additional
  dashboard aggregation, not a new agent.

## Product & technical requirements

- **Photo detail / quality requirements.** Agent 01's condition-comparison confidence
  directly gates whether a hard rule can fire (`confidence < 0.60` forces
  `DISPUTED` — see [technical-overview.md](technical-overview.md)), so photo quality
  has a direct, visible effect on outcome. Worth defining: minimum resolution,
  requirement to photograph the *same angle/framing* at baseline and at handover, and
  in-app guidance (an overlay showing the baseline framing during handover capture)
  rather than leaving this to chance — this matters more at DAD's scale than it did
  for a single consumer case, since a facilities team is doing this repeatedly.
- **Multimodal input support.** Beyond static photos: video walkthroughs for larger
  commercial or office spaces, where a single photo pair per item doesn't scale well
  across, e.g., an entire floor. Should reduce the `unverifiable_by_cv` /
  low-confidence rate that currently forces items to `DISPUTED` by default.
- **App system updates.** Mechanism for shipping corpus updates (real DAD policy
  documents replacing the current placeholder chunks — see
  [asset-policy-methodology.md](asset-policy-methodology.md) — or amended MOF
  regulations) without a full app release, since the placeholder-to-real-policy
  transition is the single most consequential content update this product will need.

## Compliance & legal research

- **Thai data protection law (PDPA) research.** AssetWitness handles condition photos
  of government and commercial premises and occupancy agreements — personal/business
  data under Thailand's PDPA, with added sensitivity given the government-tenant
  context. Needs explicit research before wider rollout: lawful basis for
  processing, retention limits for uploaded photos, and requirements around
  cross-border storage if the LLM providers (Groq, Typhoon) process data outside
  Thailand.
- **DAD policy confirmation.** The single highest-priority research item overall —
  see [asset-policy-methodology.md](asset-policy-methodology.md)'s explicit
  placeholder chunks. Getting DAD's actual condition/wear/fit-out standards (even in
  draft form) and replacing the placeholders is worth more to reasoning quality than
  any other roadmap item here.

## Infrastructure cost estimation

See [cloud-cost-architecture.md](cloud-cost-architecture.md) for a concrete AWS
deployment architecture (Lambda + Amplify + RDS for the Portfolio Condition
Dashboard) and cost estimate. Short version: AWS infrastructure cost is effectively
low-double-digits/month through pilot and into early traction — the actual cost
driver is per-handover Groq/Typhoon token usage, which is worth instrumenting before
it needs optimizing.

## Phasing

Recommended sequencing, matching `docs/AssetWitness.md`'s own Go-to-Market phases:

- **MVP (current):** Handover Certification — condition comparison, agreement
  parsing, asset policy reasoning, report generation, plus the Portfolio Condition
  Dashboard. This is what's built today.
- **Phase 1 (Pilot):** embed in the live handover wave at Building C and Pod Duang —
  a real, current, time-bound opportunity through 2026–2027, not a hypothetical
  rollout. Priority: replace the DAD-policy placeholder chunks with real DAD
  documents as they become available.
- **Phase 2 (Portfolio-wide):** extend to DAD's other managed buildings, including
  the older Government Complex buildings A and B and their existing commercial
  tenant base. Mutual responsibility acknowledgment and occupant-facing views become
  worth building once volume justifies it.
- **Phase 3 (Beyond DAD):** license to other Thai state enterprises and ministries
  managing their own real estate, positioning AssetWitness as shared national
  infrastructure for state-asset handover documentation rather than a single-client
  tool. Benchmark data and DAD-side certification/compliance signals are natural
  additions once there's enough cross-portfolio volume to make them meaningful.

## Long-term vision

Per `docs/AssetWitness.md`'s SO3 framing: the condition data AssetWitness collects
could eventually support material reuse and circularity tracking during fit-outs and
renovations (BCG model building management) — a smaller, honest claim worth
mentioning as a future direction rather than a current strength, and explicitly not
part of the pilot or MVP scope.
