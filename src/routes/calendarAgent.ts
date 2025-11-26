import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleCalendarQuery } from "../domain/calendar/service";

const CalendarEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  type: z.enum(["meeting", "task", "reminder", "block", "other"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CalendarTimeRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const CalendarQueryBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  question: z.string().min(1),
  events: z.array(CalendarEventSchema),
  timeRange: CalendarTimeRangeSchema.optional(),
  timezone: z.string().optional(),
  channel: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerCalendarAgentRoutes(app: FastifyInstance) {
  app.post("/agent/calendar/query", async (request, reply) => {
    const parseResult = CalendarQueryBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "invalid_request_body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await handleCalendarQuery({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      question: body.question,
      events: body.events,
      timeRange: body.timeRange,
      timezone: body.timezone,
      channel: body.channel,
      metadata: body.metadata,
    });

    return result;
  });
}
