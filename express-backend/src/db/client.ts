// Windows Application Control policies can block Prisma's native schema-engine
// binary (migrations must then be hand-applied, see prisma/migrations/), but
// the driver-adapter runtime below never shells out to a native engine — it
// talks to Postgres directly via the `pg` driver, so it isn't affected.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

let _client: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!_client) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    _client = new PrismaClient({ adapter });
  }
  return _client;
}
