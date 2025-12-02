#!/usr/bin/env bash
set -e

PG_HOST_ENV="${PG_HOST:-localhost}"
PG_PORT_ENV="${PG_PORT:-5433}"
PG_USER_ENV="${PG_USER:-aklow}"
PG_PASSWORD_ENV="${PG_PASSWORD:-aklow_password}"
PG_DATABASE_ENV="${PG_DATABASE:-aklow}"

export PGHOST="$PG_HOST_ENV"
export PGPORT="$PG_PORT_ENV"
export PGUSER="$PG_USER_ENV"
export PGPASSWORD="$PG_PASSWORD_ENV"
export PGDATABASE="$PG_DATABASE_ENV"

echo "pg smokebomb: basic connectivity and vector search"
node - << 'NODE'
const { Pool } = require("pg")

const host = process.env.PGHOST || "localhost"
const port = Number(process.env.PGPORT || "5433")
const user = process.env.PGUSER || "aklow"
const password = process.env.PGPASSWORD || "aklow_password"
const database = process.env.PGDATABASE || "aklow"

async function main() {
  const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
    ssl: false
  })

  try {
    console.log("step 1: select version()")
    const v = await pool.query("SELECT version()")
    console.log("version:", v.rows[0].version)

    console.log("step 2: insert into memory_entries")
    const insertEntry = await pool.query(
      "INSERT INTO memory_entries (tenant_id, kind, content, metadata, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at",
      [
        "smokebomb-tenant",
        "test",
        "pgvector smokebomb entry",
        { source: "smokebomb_pg" },
        "active"
      ]
    )
    const entry = insertEntry.rows[0]
    console.log("inserted entry id:", entry.id)

    console.log("step 3: insert into memory_vectors with dummy embedding")
    const dim = 1536
    const embedding = new Array(dim).fill(0)
    const literal = "[" + embedding.join(",") + "]"

    await pool.query(
      "INSERT INTO memory_vectors (tenant_id, domain, entry_id, embedding, content) VALUES ($1, $2, $3, $4::vector, $5)",
      [
        "smokebomb-tenant",
        "test-domain",
        entry.id,
        literal,
        "pgvector smokebomb entry"
      ]
    )

    console.log("step 4: search nearest vector for same embedding")
    const search = await pool.query(
      "SELECT id, tenant_id, domain, entry_id, content, embedding <-> $1::vector AS distance FROM memory_vectors WHERE tenant_id = $2 ORDER BY embedding <-> $1::vector ASC LIMIT 1",
      [literal, "smokebomb-tenant"]
    )

    if (search.rows.length === 0) {
      throw new Error("no rows returned from memory_vectors search")
    }

    const row = search.rows[0]
    console.log("nearest vector row:", {
      id: row.id,
      tenant_id: row.tenant_id,
      domain: row.domain,
      entry_id: row.entry_id,
      content: row.content,
      distance: row.distance
    })

    await pool.end()
    console.log("pg smokebomb: success")
    process.exit(0)
  } catch (error) {
    console.error("pg smokebomb: error", error)
    process.exit(1)
  }
}

main()
NODE
