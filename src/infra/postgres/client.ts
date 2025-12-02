import { Pool, QueryResult } from "pg"

const connectionString = process.env.DATABASE_URL || "postgres://aklow:aklow_password@localhost:5433/aklow"

export const pgPool = new Pool({
  connectionString
})

export async function pgQuery<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  return pgPool.query<T>(text, params)
}
