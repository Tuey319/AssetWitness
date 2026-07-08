# RoomWitness — Product & Platform Roadmap (Advisor Notes)

This captures advisor feedback on product direction, platform design, data strategy,
compliance research, and phasing. **Monetization and growth items are intentionally
excluded** (subscription vs. per-use pricing/ROI, commission fees, selling rental-price
data to agencies, user acquisition, advertising) — those belong in the business plan,
not here.

## Market positioning

The advisor flagged the current focus — Bangkok renters disputing deposit deductions —
as a strong, defensible niche: narrow enough to build real legal + CV depth into (see
[legal-methodology.md](legal-methodology.md)), rather than a shallow "general tenant
app." The roadmap below treats that niche as the wedge, with landlord-side and
ecosystem features as expansion *after* the tenant-side dispute flow is solid, not a
parallel v1 scope.

## Two-sided platform: supporting the landlord

RoomWitness currently only serves the tenant. The advisor's pushback: a tool that only
ever tells landlords they're wrong will struggle to get landlord buy-in, adoption by
property managers, or credibility as a neutral arbiter. Concretely:

- **Landlord-facing view.** Landlords should be able to see the same claim
  assessment tenants see — CV comparison, legal classification, reasoning — rather
  than receiving a one-sided demand letter out of nowhere. This is mostly a read-only
  view onto Agent 03's existing `ClaimVerdict` output; no new backend logic needed,
  just a landlord-scoped frontend surface.
- **Mutual damage-price agreement feature.** Today Agent 03 outputs a verdict and
  `claim_validity_pct` but no negotiated number. A feature where both parties see the
  claimed amount, the CV/legal assessment, and a system-suggested fair amount (e.g.
  depreciated value per the CCC §222/§562 proportionality doctrine already in the
  corpus), and both can accept/counter/approve, turns RoomWitness from a one-sided
  complaint generator into a settlement tool. This is the single highest-leverage new
  feature on this list — it's what actually resolves disputes instead of just
  escalating them.
- **Middleman / agreement broker role.** A logical extension of the above: RoomWitness
  hosts the negotiation and produces a signed settlement record (a natural 4th
  document type alongside the OCPB complaint, demand letter, and evidence summary that
  Agent 04 already generates) rather than only arming the tenant for a formal dispute.
- **RoomWitness certification / endorsement.** A badge a landlord earns for using
  signed move-in inspection reports, fair deposit terms, and timely returns — directly
  computable from data RoomWitness already collects (move-in report signed y/n,
  deposit-return timeliness, dispute rate). This gives landlords a reason to opt in
  rather than only being on the receiving end of complaints, and gives tenants a signal
  when choosing a unit.

## Data strategy (product-facing, not monetization)

- **Benchmark data: average deposits and claim costs by room/rental tier.** Needed to
  power the "fair amount" suggestion above — without a reference distribution for,
  say, "paint touch-up in a 1BR condo," the settlement feature has nothing to
  benchmark against. This is a data-collection dependency for the negotiation feature,
  not a standalone deliverable.
- **Aggregate data from prior cases.** As case volume grows, RoomWitness accumulates
  exactly the dataset needed for the benchmark above, plus signal for flagging
  repeat-offender landlords or unusually aggressive claim patterns. Scope this as an
  internal analytics store fed by existing `Agent03Output` records, not a new agent.

## Product & technical requirements

- **Photo detail / quality requirements.** Agent 01's CV confidence directly gates
  whether a hard rule can fire (`confidence < 0.60` forces `DISPUTED` — see
  [technical-overview.md](technical-overview.md)), so photo quality has a direct,
  visible effect on outcome. Worth defining: minimum resolution, requirement to
  photograph the *same angle/framing* at move-in and move-out, and in-app guidance
  (e.g. an overlay showing the move-in framing during move-out capture) rather than
  leaving this to chance.
- **Multimodal input support.** Beyond static photos: video walkthroughs, audio notes,
  or voice-described damage. Video in particular would let Agent 01 sample multiple
  frames per item instead of relying on a single photo pair, which should reduce the
  `unverifiable_by_cv` / low-confidence rate that currently forces claims to
  `DISPUTED` by default.
- **App system updates.** Mechanism for shipping corpus updates (new OCPB
  notifications, amended CCC provisions) and model/prompt changes without a full app
  release — relevant because the legal corpus is a moving target (see next section).

## Compliance & legal research

- **Thai data protection law (PDPA) research.** RoomWitness handles photos of private
  residences, chat screenshots (which may contain third-party names/numbers), and
  lease documents — all personal data under Thailand's PDPA. Needs explicit research
  before wider rollout: lawful basis for processing, retention limits for uploaded
  photos/screenshots, and requirements around cross-border storage if S3 (currently
  `ap-southeast-1`, per `shared/config.py`) or the LLM providers (Groq, Typhoon)
  process data outside Thailand.

## Infrastructure cost estimation

See [cloud-cost-architecture.md](cloud-cost-architecture.md) for a concrete AWS
deployment architecture (Lambda + Amplify) and cost estimate. Short version: AWS
infrastructure cost is effectively $0–10/month through pilot and into early traction —
the actual cost driver is per-case Groq/Typhoon token usage, which is worth
instrumenting before it needs optimizing.

## Phasing

Recommended sequencing, given the two-sided-platform push above:

- **MVP (current):** tenant-only flow — CV comparison, contract parsing, legal
  classification, document generation. This is what's built today.
- **Feature 1:** landlord-facing read view + mutual settlement/negotiation feature.
  Highest-leverage addition; turns the product from "complaint generator" into
  "dispute resolver," which is also the strongest pitch differentiator.
- **Feature 2:** certification/endorsement program + benchmark data (deposit/claim
  averages by tier) to power fair-amount suggestions in the negotiation feature.
- **Later:** multimodal input (video walkthroughs), broader landlord tooling
  (portfolio-level dispute analytics), PDPA-compliant data retention pipeline.

## Long-term vision

Advisor note: expand beyond deposit disputes into a general rental app/ecosystem
(listings, lease management, ongoing landlord-tenant communication) once the dispute
resolution core has traction. Treat this as a post-PMF direction, not part of the
hackathon or MVP scope — the value of the current niche is depth on one hard problem,
and broadening too early would dilute that.
