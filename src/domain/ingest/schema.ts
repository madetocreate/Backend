import { z } from "zod";

export const IngestEmailBodySchema = z.object({
  tenantId: z.string(),
  externalId: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  channel: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type IngestEmailBody = z.infer<typeof IngestEmailBodySchema>;

export const IngestDmBodySchema = z.object({
  tenantId: z.string(),
  externalId: z.string(),
  platform: z.string(),
  from: z.string(),
  to: z.string().optional(),
  body: z.string(),
  channel: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type IngestDmBody = z.infer<typeof IngestDmBodySchema>;

export const IngestReviewBodySchema = z.object({
  tenantId: z.string(),
  externalId: z.string(),
  sourcePlatform: z.string(),
  rating: z.number(),
  authorName: z.string().optional(),
  body: z.string(),
  createdAt: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type IngestReviewBody = z.infer<typeof IngestReviewBodySchema>;
