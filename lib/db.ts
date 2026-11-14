import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Dates stay as "YYYY-MM-DD" strings; numeric and bigint become numbers.
types.setTypeParser(1082, (value) => value);
types.setTypeParser(1700, (value) => Number(value));
types.setTypeParser(20, (value) => Number(value));

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function getPool() {
  if (!globalForDb.pgPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return globalForDb.pgPool;
}

export type Db = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db?: Db,
): Promise<T[]> {
  const result = await (db ?? getPool()).query<T>(text, params);
  return result.rows;
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await globalForDb.pgPool?.end();
  globalForDb.pgPool = undefined;
}
