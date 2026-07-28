import { sql } from "drizzle-orm";
import { db } from "@/db";
import crypto from "node:crypto";

// Serializes git writes per novel using a Postgres session-level advisory
// lock, so two concurrent commits to the same novel can't race and corrupt
// the bundle in Blob storage. Keyed off a 63-bit hash of the novel's uuid.
function lockKey(novelId: string): bigint {
  const hash = crypto.createHash("sha256").update(novelId).digest();
  const mask = BigInt("0x7fffffffffffffff");
  return hash.readBigInt64BE(0) & mask;
}

export async function withRepoLock<T>(
  novelId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = lockKey(novelId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${key})`);
    return fn();
  });
}
