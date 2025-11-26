import { MemoryWriteRequest } from "./types";
import { IngestEmailBody, IngestDmBody, IngestReviewBody } from "../ingest/schema";

export function mapEmailToMemory(input: IngestEmailBody): MemoryWriteRequest {
  return {
    tenantId: input.tenantId,
    type: "email",
    content: input.body,
    metadata: {
      externalId: input.externalId,
      from: input.from,
      to: input.to,
      subject: input.subject ?? null,
      channel: input.channel ?? null,
      metadata: input.metadata ?? null
    },
    sourceId: input.externalId,
    createdAt: new Date()
  };
}

export function mapDmToMemory(input: IngestDmBody): MemoryWriteRequest {
  return {
    tenantId: input.tenantId,
    type: "dm",
    content: input.body,
    metadata: {
      externalId: input.externalId,
      platform: input.platform,
      from: input.from,
      to: input.to ?? null,
      channel: input.channel ?? null,
      metadata: input.metadata ?? null
    },
    sourceId: input.externalId,
    createdAt: new Date()
  };
}

export function mapReviewToMemory(input: IngestReviewBody): MemoryWriteRequest {
  return {
    tenantId: input.tenantId,
    type: "review",
    content: input.body,
    metadata: {
      externalId: input.externalId,
      sourcePlatform: input.sourcePlatform,
      rating: input.rating,
      authorName: input.authorName ?? null,
      createdAtRaw: input.createdAt ?? null,
      metadata: input.metadata ?? null
    },
    sourceId: input.externalId,
    createdAt: input.createdAt ? new Date(input.createdAt) : new Date()
  };
}
