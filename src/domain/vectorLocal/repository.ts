import { db } from "../../infra/db";
import type { VectorDomain } from "./types";

export interface VectorDbRow {
  id: string;
  tenant_id: string;
  domain: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  embedding: Buffer;
  content: string;
  metadata: string | null;
  created_at: string;
}

const insertStmt = db.prepare(`
  insert into memory_vectors (
    id,
    tenant_id,
    domain,
    source_type,
    source_id,
    chunk_index,
    embedding,
    content,
    metadata,
    created_at
  ) values (
    @id,
    @tenant_id,
    @domain,
    @source_type,
    @source_id,
    @chunk_index,
    @embedding,
    @content,
    @metadata,
    @created_at
  )
`);

const selectByTenantDomainStmt = db.prepare(`
  select
    id,
    tenant_id,
    domain,
    source_type,
    source_id,
    chunk_index,
    embedding,
    content,
    metadata,
    created_at
  from memory_vectors
  where tenant_id = ? and domain = ?
`);

const selectByTenantSourceStmt = db.prepare(`
  select
    id,
    metadata
  from memory_vectors
  where tenant_id = ? and source_type = ? and source_id = ?
`);

const updateMetadataStmt = db.prepare(`
  update memory_vectors
  set metadata = @metadata
  where id = @id
`);

export function insertVectorRow(row: {
  id: string;
  tenantId: string;
  domain: VectorDomain;
  sourceType: "memory" | "file";
  sourceId: string;
  chunkIndex: number;
  embedding: Buffer;
  content: string;
  metadataJson: string | null;
  createdAt: string;
}): void {
  insertStmt.run({
    id: row.id,
    tenant_id: row.tenantId,
    domain: row.domain,
    source_type: row.sourceType,
    source_id: row.sourceId,
    chunk_index: row.chunkIndex,
    embedding: row.embedding,
    content: row.content,
    metadata: row.metadataJson,
    created_at: row.createdAt
  });
}

export function getVectorsForTenantAndDomain(
  tenantId: string,
  domain: VectorDomain
): VectorDbRow[] {
  return selectByTenantDomainStmt.all(tenantId, domain) as VectorDbRow[];
}

export function updateVectorStatusForMemory(
  tenantId: string,
  sourceId: string,
  status: "active" | "archived" | "deleted" | "suppressed"
): void {
  const rows = selectByTenantSourceStmt.all(
    tenantId,
    "memory",
    sourceId
  ) as { id: string; metadata: string | null }[];

  for (const row of rows) {
    let meta: any = null;
    if (row.metadata && row.metadata.length > 0) {
      try {
        meta = JSON.parse(row.metadata);
      } catch {
        meta = null;
      }
    }
    if (!meta || typeof meta !== "object") {
      meta = {};
    }
    (meta as any).status = status;
    const metadataJson = JSON.stringify(meta);
    updateMetadataStmt.run({
      id: row.id,
      metadata: metadataJson
    });
  }
}
