# RoomWitness — Cloud Deployment Architecture & Cost Estimate

Concrete follow-up to the "cost estimation for overall cloud prices" item in
[product-roadmap.md](product-roadmap.md). Covers a deployable AWS architecture for the
current stack and a real cost estimate, not just a framework.

> **Pricing source note:** the AWS Pricing API tool available in this session hit
> `AccessDeniedException` on `pricing:GetProducts`/`pricing:DescribeServices` for the
> AWS user configured on this machine (account `556088722017`, user `Chirayu`) — that
> IAM user isn't currently allowed to query the Pricing API. Numbers below are AWS's
> published on-demand list prices for `ap-southeast-1` (Singapore — closest region to
> Bangkok) as of this session, not a live API pull. If you want live-verified pricing
> in future sessions, add the `pricing:GetProducts`, `pricing:DescribeServices`, and
> `pricing:GetAttributeValues` actions to that IAM user/role.

## Stage context (assumed)

Pre-revenue hackathon project, one person touching infra (Tuey), no production traffic
yet. That means: favor fully-managed/serverless services over anything needing
ops (no Kubernetes, no self-managed databases), optimize for near-zero idle cost over
raw throughput, and don't build in multi-AZ/HA — nothing here needs five-nines yet.
Correct me if any of that's wrong (e.g. if there's already a budget ceiling or AWS
Activate credit grant to design around).

## Recommended architecture

```
Next.js frontend  ──────────────►  AWS Amplify Hosting  (CDN + SSR, managed CI/CD)
                                              │
                                              ▼
                                  Express backend (Lambda + Function URL)
                                              │
                    ┌─────────────┬───────────┼───────────┬─────────────┐
                    ▼             ▼           ▼           ▼             ▼
              Agent 01 CV   Agent 02 parse  Agent 03 legal  Agent 04 docgen
              (Lambda,       (Lambda,        (Lambda,        (Lambda,
               container      container       container       container
               image)         image)          image, chroma_db  image)
                    │             │           baked in read-only)  │
                    ▼             ▼               │                ▼
                Groq API     Typhoon v2 API  Typhoon v2 API   Typhoon v2 API
                                              (no external
                                               vector DB call)
                                              │
              S3 (photos, screenshots, lease PDFs, generated legal PDFs)
```

**Why Lambda over ECS/Fargate, given each agent is a standing FastAPI service today:**
the pipeline runs per case, not continuously — traffic is bursty and low-volume at
this stage, which is exactly what pay-per-invocation compute is for. Fargate would
mean paying for 5 always-on tasks (Express + 4 agents) 24/7 whether or not anyone is
using the app; Lambda costs ~$0 when idle. The one real risk with Lambda here — vector
search needing a persistent store — turns out not to apply: `chroma_db/` in this repo
is a **build-time artifact** (`seed_corpus.py` populates it from the corpus JSON files;
nothing writes to it at request time). So it can be baked read-only into Agent 03's
container image and copied to `/tmp` on cold start, with no EFS, no RDS, and no VPC
needed at all — which also means **no NAT Gateway** (the ~$32-45/month tax that
catches a lot of early-stage teams by surprise when Lambda needs outbound internet
access from inside a VPC). Lambda functions without VPC config reach the public
internet — including Groq's and Typhoon's APIs — by default.

The one thing to watch: don't put agents behind API Gateway. API Gateway's proxy
integration hard-caps requests at 29 seconds, and Agent 03 chains one Typhoon v2 call
per claim — a multi-claim case can easily exceed that. Use **Lambda Function URLs**
instead (only Express's needs to be public; the four agent Lambdas can be invoked
directly via the AWS SDK from Express, no public endpoint needed at all) — Function
URLs carry the full Lambda timeout (up to 15 minutes), so this isn't a constraint in
practice.

## What this defers, and when to revisit

- **Multi-AZ / high availability** — not needed pre-launch; revisit once there's paying
  usage where downtime has real cost.
- **Managed vector DB** (OpenSearch/pgvector/Pinecone) — only needed if the legal
  corpus grows large enough or starts being updated at runtime rather than at build
  time; today's corpus is ~20 chunks / 774KB, nowhere near that point.
- **Autoscaling tuning / reserved concurrency** — default Lambda concurrency limits are
  fine until there's real concurrent traffic; add reserved concurrency only if a noisy
  demo audience causes throttling.
- **CloudFront + WAF in front of Amplify/Function URLs** — worth adding before any
  public marketing push, not needed for a hackathon demo or closed pilot.

## AWS cost estimate

Assumptions per case: 3 claims average, 2 photos/claim, 1 lease PDF, 3 generated
output PDFs (~21MB total object storage per case). Per-case Lambda compute is
dominated by wait time on external LLM calls, not CPU work:

| Function | Memory | Typical duration | GB-seconds/case |
|---|---|---|---|
| Express orchestrator | 512MB | ~60s (wall-clock while awaiting downstream calls) | ~31 |
| Agent 01 CV (×3 claims) | 1024MB | ~10s each | ~30 |
| Agent 02 contract parser (×1) | 512MB | ~8s | ~4 |
| Agent 03 legal reasoning (×3 claims) | 512MB | ~6s each | ~9 |
| Agent 04 doc generator (×1) | 1024MB | ~15s | ~15 |
| **Total** | | | **~89 GB-s, 9 invocations** |

Lambda on-demand pricing (`ap-southeast-1`): **$0.0000166667/GB-second**,
**$0.20/million requests**, with an always-on free tier of **400,000 GB-s** and
**1M requests/month**.

| Volume | GB-s/month | Requests/month | Lambda compute cost | Notes |
|---|---|---|---|---|
| Hackathon demo (~20 cases) | ~1,780 | ~180 | **$0** | Nowhere near free tier |
| Pilot (200 cases/mo) | ~17,800 | ~1,800 | **$0** | Still under free tier |
| Early traction (2,000 cases/mo) | ~178,000 | ~18,000 | **$0** | Still under 400k GB-s free tier |
| ~4,500 cases/mo | ~400,000 | ~40,500 | **~$0** (right at the edge) | Free tier boundary |
| 10,000 cases/mo | ~890,000 | ~90,000 | **~$8/month** | First tier where compute cost is non-trivial |

Other line items, all similarly small at these volumes:

| Service | Rate (ap-southeast-1) | Estimated cost |
|---|---|---|
| S3 storage (photos/PDFs, ~21MB/case) | ~$0.025/GB-month | ~$1.25/month at 200 cases/mo after 12 months of accumulation |
| S3 requests (PUT/GET) | ~$0.0055 / ~$0.00047 per 1,000 | Cents/month at this volume |
| ECR (container images for 5 functions, incl. onnxruntime for ChromaDB embeddings) | ~$0.10/GB-month | ~$0.50/month for ~5GB of images |
| Amplify Hosting (build + serve Next.js) | ~$0.01/build-min, ~$0.15/GB served | A few dollars/month at demo/pilot traffic |
| CloudWatch Logs | Free tier: 5GB ingestion+storage/month | **$0** at this volume |

**Bottom line: AWS infrastructure cost is effectively $0–10/month through pilot and
into early traction** — it is not the cost driver for this product. If a BDI/AWS
Activate credit grant is available for the team, this architecture would run
comfortably within it for a long time regardless.

## The actual cost driver: LLM API calls

Per case, the pipeline makes roughly 3 Groq vision calls (Agent 01) plus 1 contract
parse + 3 legal reasoning calls + 1 doc-gen call to Typhoon v2 (Agent 02–04) — 5
external LLM calls per case, not counting evidence-screenshot extraction.

- **Groq (Llama-4-Scout, vision):** Groq's published per-token rate for Llama 4 Scout
  is inexpensive relative to closed-model vision APIs, but rates change and image
  inputs consume meaningfully more tokens than text — check current pricing at
  console.groq.com before modeling this at scale rather than trusting a number here.
- **Typhoon v2:** this is the higher-volume caller (4 of the 5 calls per case) and its
  per-token rate isn't one we have reliable current figures for in this session —
  check typhoon.apps.opentyphoon.ai for current pricing. Given call volume, **this is
  the line item most likely to actually matter** as usage grows, and the one worth
  instrumenting first (log token counts per call now, so cost-per-case is measurable
  before it needs to be optimized).

## Recommendation

Ship on Lambda + Amplify as above — it's the cheapest path that also happens to
require the least new infrastructure code, since it matches how the agents already
run (independent request/response services with no shared runtime state beyond the
build-time corpus). Track Groq + Typhoon token usage per case from day one; that's
the number that will actually move as the product scales, not the AWS bill.
