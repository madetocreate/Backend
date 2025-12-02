const fs = require("fs")
const path = require("path")
const readline = require("readline")
const { Pool } = require("pg")

const defaultUrl = "postgres://aklow:aklow_password@localhost:5433/aklow"
const connectionString = process.env.DATABASE_URL || defaultUrl

const memoryPath =
  process.env.MEMORY_JSONL_PATH ||
  path.join(process.cwd(), "data", "memory.jsonl")

function toVectorLiteral(values) {
  return "[" + values.join(",") + "]"
}

async function run() {
  console.log("migrate_memory_to_pg: start")
  console.log("database:", connectionString)
  console.log("memory file:", memoryPath)

  if (!fs.existsSync(memoryPath)) {
    console.error("migrate_memory_to_pg: file not found:", memoryPath)
    process.exit(1)
  }

  const pool = new Pool({ connectionString })

  let total = 0
  let imported = 0
  let skipped = 0

  const stream = fs.createReadStream(memoryPath, { encoding: "utf8" })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  for await (const line of rl) {
    total += 1
    const trimmed = line.trim()
    if (!trimmed) {
      skipped += 1
      continue
    }

    let obj
    try {
      obj = JSON.parse(trimmed)
    } catch (error) {
      console.error("migrate_memory_to_pg: invalid json line", { line, error })
      skipped += 1
      continue
    }

    const tenantId = obj.tenantId || obj.tenant_id || "default-tenant"
    const kind = obj.type || obj.kind || "other"
    const content = obj.content || obj.text || ""
    const metadata = obj.metadata || null
    const status = obj.status || "active"

    if (!content) {
      skipped += 1
      continue
    }

    try {
      const insertEntry = await pool.query(
        "INSERT INTO memory_entries (tenant_id, kind, content, metadata, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [tenantId, kind, content, metadata, status]
      )
      const entryId = insertEntry.rows[0].id

      const embedding =
        Array.isArray(obj.embedding) && obj.embedding.length > 0
          ? obj.embedding
          : null
      const domain = obj.domain || kind

      if (embedding) {
        const literal = toVectorLiteral(embedding)
        await pool.query(
          "INSERT INTO memory_vectors (tenant_id, domain, entry_id, embedding, content) VALUES ($1, $2, $3, $4::vector, $5)",
          [tenantId, domain, entryId, literal, content]
        )
      }

      imported += 1
    } catch (error) {
      console.error("migrate_memory_to_pg: insert error", {
        tenantId,
        kind,
        error
      })
      skipped += 1
    }
  }

  await pool.end()

  console.log("migrate_memory_to_pg: done", {
    total,
    imported,
    skipped
  })

  process.exit(0)
}

run().catch((error) => {
  console.error("migrate_memory_to_pg: fatal", error)
  process.exit(1)
})
