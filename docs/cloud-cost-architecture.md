# AssetWitness — Cloud Deployment Architecture & Cost Estimate

Concrete follow-up to the "cost estimation for overall cloud prices" item in
[product-roadmap.md](product-roadmap.md). Covers a deployable AWS architecture for the
current stack and a real cost estimate, not just a framework.

> **Pricing source note:** the AWS Pricing API tool available in an earlier session
> hit `AccessDeniedException` on `pricing:GetProducts`/`pricing:DescribeServices` for
> the AWS user configured on that machine — that IAM user wasn't allowed to query the
> Pricing API. Numbers below are AWS's published on-demand list prices for
> `ap-southeast-1` (Singapore — closest region to Bangkok), not a live API pull. If you
> want live-verified pricing in a future session, add the `pricing:GetProducts`,
> `pricing:DescribeServices`, and `pricing:GetAttributeValues` actions to that IAM
> user/role.

## Stage context (assumed)

Pre-partnership build stage, one person touching infra (Tuey), no production traffic
yet — the pilot described in `docs/AssetWitness.md`'s Go-to-Market Phase 1 hasn't
started. That means: favor fully-managed/serverless services over anything needing
ops, optimize for near-zero idle cost over raw throughput, and don't build in
multi-AZ/HA — nothing here needs five-nines yet. Correct me if any of that's wrong
(e.g. if there's already a budget ceiling or AWS Activate credit grant to design
around).

## Recommended architecture

```
Next.js frontend  ──────────────►  AWS Amplify Hosting  (CDN + SSR, managed CI/CD)
                                              │
                                              ▼
                                  Express backend (Lambda + Function URL)
                                              │
                    ┌─────────────┬───────────┼───────────┬─────────────┐
                    ▼             ▼           ▼           ▼             ▼
              Agent 01 Cond.  Agent 02 parse  Agent 03 policy  Agent 04 report
              (Lambda,       (Lambda,        (Lambda,        (Lambda,
               container      container       container       container
               image)         image)          image, chroma_db  image)
                    │             │           baked in read-only)  │
                    ▼             ▼               │                ▼
                Groq API     Typhoon v2 API  Typhoon v2 API   Typhoon v2 API
                                              (no external
                                               vector DB call)
                                              │
              S3 (photos, agreement PDFs, generated handover PDFs)
                                              │
                                              ▼
                              Aurora Serverless v2 (Postgres)
                              Portfolio Condition Dashboard rollup
```

**Why Lambda over ECS/Fargate, given each agent is a standing FastAPI service today:**
the pipeline runs per handover, not continuously — traffic is bursty and low-volume at
this stage, which is exactly what pay-per-invocation compute is for. Fargate would
mean paying for 5 always-on tasks (Express + 4 agents) 24/7 whether or not anyone is
using the app; Lambda costs ~$0 when idle. The one real risk with Lambda here — vector
search needing a persistent store — turns out not to apply: `chroma_db/` in this repo
is a **build-time artifact** (`seed_corpus.py` populates it from the corpus JSON files;
nothing writes to it at request time). So it can be baked read-only into Agent 03's
container image and copied to `/tmp` on cold start, with no EFS and no VPC needed for
that piece — which also means **no NAT Gateway** for the agent Lambdas (the
~$32-45/month tax that catches a lot of early-stage teams by surprise when Lambda
needs outbound internet access from inside a VPC). Lambda functions without VPC
config reach the public internet — including Groq's and Typhoon's APIs — by default.

The one thing to watch: don't put agents behind API Gateway. API Gateway's proxy
integration hard-caps requests at 29 seconds, and Agent 03 chains one Typhoon v2 call
per condition item — a multi-item handover can easily exceed that. Use **Lambda
Function URLs** instead (only Express's needs to be public; the four agent Lambdas can
be invoked directly via the AWS SDK from Express, no public endpoint needed at all) —
Function URLs carry the full Lambda timeout (up to 15 minutes), so this isn't a
constraint in practice.

## The one new non-serverless-by-default piece: the Portfolio Condition Dashboard

RoomWitness's architecture had no persistence layer at all — every case was stateless
request/response. AssetWitness's Portfolio Condition Dashboard changes that: Express
now writes one summary row per completed handover to Postgres and serves an
aggregation endpoint. A single always-on `db.t4g.micro` RDS instance would be the
simplest option but sits awkwardly against this architecture's own "favor
serverless, near-zero idle cost" principle — **Aurora Serverless v2** is the better
fit here: it scales down to a fraction of an ACU (Aurora Capacity Unit) when idle
(this dashboard's write volume — one row per handover — is nowhere near sustained
load) and is still wire-compatible with the existing Prisma + `pg` driver-adapter
client (`express-backend/src/db/client.ts`), so no application code changes beyond
the connection string. The local dev setup (`docker-compose.yml`, hand-applied
migrations — see `CONTRIBUTING.md`) carries over unchanged; only the deployed target
differs.

## What this defers, and when to revisit

- **Multi-AZ / high availability** — not needed pre-launch; revisit once DAD is in
  production/pilot use where downtime has real cost.
- **Managed vector DB** (OpenSearch/pgvector/Pinecone) — only needed if the asset
  policy corpus grows large enough or starts being updated at runtime rather than at
  build time; today's corpus is a handful of chunks, nowhere near that point. (If real
  DAD policy documents replace the placeholder chunks with a much larger corpus, this
  is worth revisiting.)
- **Autoscaling tuning / reserved concurrency** — default Lambda concurrency limits are
  fine until there's real concurrent traffic; add reserved concurrency only if a noisy
  demo audience causes throttling.
- **CloudFront + WAF in front of Amplify/Function URLs** — worth adding before any
  pilot rollout to DAD's actual users, not needed for a hackathon demo.

## AWS cost estimate

Assumptions per handover: 3 condition items average, 2 photos/item, 1 agreement PDF,
up to 3 generated output PDFs (~21MB total object storage per handover). Per-handover
Lambda compute is dominated by wait time on external LLM calls, not CPU work:

| Function | Memory | Typical duration | GB-seconds/handover |
|---|---|---|---|
| Express orchestrator | 512MB | ~60s (wall-clock while awaiting downstream calls) | ~31 |
| Agent 01 condition (×3 items) | 1024MB | ~10s each | ~30 |
| Agent 02 agreement parser (×1) | 512MB | ~8s | ~4 |
| Agent 03 asset policy reasoning (×3 items) | 512MB | ~6s each | ~9 |
| Agent 04 report generator (×1) | 1024MB | ~15s | ~15 |
| **Total** | | | **~89 GB-s, 9 invocations** |

Lambda on-demand pricing (`ap-southeast-1`): **$0.0000166667/GB-second**,
**$0.20/million requests**, with an always-on free tier of **400,000 GB-s** and
**1M requests/month**.

| Volume | GB-s/month | Requests/month | Lambda compute cost | Notes |
|---|---|---|---|---|
| Hackathon/pilot demo (~20 handovers) | ~1,780 | ~180 | **$0** | Nowhere near free tier |
| Early pilot (200 handovers/mo) | ~17,800 | ~1,800 | **$0** | Still under free tier |
| Building C + Pod Duang scale (2,000 handovers/mo) | ~178,000 | ~18,000 | **$0** | Still under 400k GB-s free tier |
| ~4,500 handovers/mo | ~400,000 | ~40,500 | **~$0** (right at the edge) | Free tier boundary |
| 10,000 handovers/mo (full portfolio-wide) | ~890,000 | ~90,000 | **~$8/month** | First tier where compute cost is non-trivial |

Other line items:

| Service | Rate (ap-southeast-1) | Estimated cost |
|---|---|---|
| S3 storage (photos/PDFs, ~21MB/handover) | ~$0.025/GB-month | ~$1.25/month at 200 handovers/mo after 12 months of accumulation |
| S3 requests (PUT/GET) | ~$0.0055 / ~$0.00047 per 1,000 | Cents/month at this volume |
| ECR (container images for 5 functions, incl. onnxruntime for ChromaDB embeddings) | ~$0.10/GB-month | ~$0.50/month for ~5GB of images |
| Amplify Hosting (build + serve Next.js) | ~$0.01/build-min, ~$0.15/GB served | A few dollars/month at demo/pilot traffic |
| **Aurora Serverless v2 (Portfolio Dashboard Postgres)** | ~$0.12/ACU-hour, min 0.5 ACU | **~$5–15/month** at pilot volume (scales to ~0 during idle hours, unlike a fixed-size RDS instance) |
| CloudWatch Logs | Free tier: 5GB ingestion+storage/month | **$0** at this volume |

**Bottom line: AWS infrastructure cost is roughly $5–25/month through pilot and into
early traction** — the Portfolio Dashboard's Postgres is now the largest fixed line
item (previously $0, since RoomWitness had no persistence layer at all), but it's
still not the cost driver for this product. If a Sustainnovation/AWS Activate credit
grant is available for the team, this architecture would run comfortably within it
for a long time regardless.

## The actual cost driver: LLM API calls

Per handover, the pipeline makes roughly 3 Groq vision calls (Agent 01) plus 1
agreement parse + 3 policy reasoning calls + 1 report-gen call to Typhoon v2 (Agent
02–04) — 5 external LLM calls per handover.

- **Groq (Llama-4-Scout, vision):** Groq's published per-token rate for Llama 4 Scout
  is inexpensive relative to closed-model vision APIs, but rates change and image
  inputs consume meaningfully more tokens than text — check current pricing at
  console.groq.com before modeling this at scale rather than trusting a number here.
- **Typhoon v2:** this is the higher-volume caller (4 of the 5 calls per handover) and
  its per-token rate isn't one we have reliable current figures for in this session —
  check typhoon.apps.opentyphoon.ai for current pricing. Given call volume, **this is
  the line item most likely to actually matter** as usage scales with DAD's 2027
  occupancy timeline, and the one worth instrumenting first (log token counts per call
  now, so cost-per-handover is measurable before it needs to be optimized).

## Recommendation

Ship on Lambda + Amplify + Aurora Serverless v2 as above — it's the cheapest path that
also happens to require the least new infrastructure code, since it matches how the
agents already run (independent request/response services with no shared runtime
state beyond the build-time corpus) and the dashboard already speaks Postgres via
Prisma. Track Groq + Typhoon token usage per handover from day one; that's the number
that will actually move as the product scales with DAD's onboarding timeline, not the
AWS bill.
