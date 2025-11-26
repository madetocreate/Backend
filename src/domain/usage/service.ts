import { randomUUID } from "crypto";
import { UsageEvent } from "./types";
import { db } from "../../infra/db";

export async function recordUsageEvent(event: UsageEvent): Promise<void> {
  const id = randomUUID();
  const metadataString =
    event.metadata && Object.keys(event.metadata).length > 0 ? JSON.stringify(event.metadata) : null;
  db.prepare(
    "INSERT INTO usage_events (id, tenant_id, type, route, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, event.tenantId, event.type, event.route, event.timestamp.toISOString(), metadataString);
}
