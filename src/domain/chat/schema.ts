import { z } from "zod";

export const ChatRequestSchema = z.object({
  tenantId: z.string(),
  sessionId: z.string(),
  channel: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type ChatRequestBody = z.infer<typeof ChatRequestSchema>;
