-- Hand-written to match prisma/schema.prisma, applied directly via
-- `docker compose exec -T db psql` because Windows Application Control on this
-- dev machine blocks Prisma's native schema-engine binary (used by
-- `prisma migrate dev`/`diff`). `prisma generate` and the driver-adapter
-- runtime client are unaffected — see src/db/client.ts. Recorded into
-- _prisma_migrations below so `prisma migrate` on an unrestricted machine
-- recognizes this migration as already applied instead of re-running it.

CREATE TABLE "handover_cases" (
    "id" SERIAL NOT NULL,
    "building" TEXT NOT NULL,
    "case_type" TEXT NOT NULL,
    "needs_dispute_resolution" BOOLEAN NOT NULL DEFAULT false,
    "total_estimated_cost_thb" DOUBLE PRECISION NOT NULL,
    "total_dad_responsibility_thb" DOUBLE PRECISION NOT NULL,
    "total_occupant_responsibility_thb" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "handover_cases_pkey" PRIMARY KEY ("id")
);
