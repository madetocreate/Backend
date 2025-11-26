import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import {
  CalendarQueryRequest,
  CalendarQueryResponse,
  CalendarPlan,
} from "./types";

export async function handleCalendarQuery(input: CalendarQueryRequest): Promise<CalendarQueryResponse> {
  const channel = input.channel ?? "agent_calendar";
  const now = new Date();

  const model = getSummaryModel();

  let answer = "";
  let plan: CalendarPlan | undefined;

  try {
    const response = await openai.responses.create({
      model,
      instructions:
        "You are a calendar and planning assistant. " +
        "You receive a list of events, an optional time range and a user question. " +
        "You answer in the user's language. " +
        "Return ONLY minified JSON without markdown, comments or extra text. " +
        'Schema: {"answer": string, "plan"?: {"blocks": [{"label": string, "startsAt": string, "endsAt": string, "metadata"?: object}], "notes"?: string}}. ' +
        "Do not invent events that are not in the list, but you may propose new time blocks for focus work, breaks or tasks.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                question: input.question,
                events: input.events,
                timeRange: input.timeRange,
                timezone: input.timezone,
                metadata: input.metadata,
              }),
            },
          ],
        },
      ],
    } as any);

    const text = (response as any).output_text as string | undefined;

    if (text) {
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (parsed && typeof parsed.answer === "string") {
        answer = parsed.answer;
      }

      if (parsed && parsed.plan && Array.isArray(parsed.plan.blocks)) {
        plan = {
          blocks: parsed.plan.blocks.map((b: any) => ({
            label: typeof b.label === "string" ? b.label : "Block",
            startsAt: String(b.startsAt ?? ""),
            endsAt: String(b.endsAt ?? ""),
            metadata: typeof b.metadata === "object" && b.metadata !== null ? b.metadata : undefined,
          })),
          notes: typeof parsed.plan.notes === "string" ? parsed.plan.notes : undefined,
        };
      }
    }
  } catch {
    answer =
      "Ich konnte deine Termine gerade nicht intelligent auswerten. Bitte versuche es später erneut oder prüfe deine Anfrage.";
  }

  if (!answer) {
    answer = "Hier ist eine Übersicht deiner Termine und möglichen freien Zeiten, basierend auf den übergebenen Daten.";
  }

  const usageType: UsageEventType = "calendar_query" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/calendar/query",
    timestamp: now,
    metadata: {
      events: input.events.length,
      hasTimeRange: Boolean(input.timeRange),
      timezone: input.timezone,
      channel,
    },
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    answer,
    plan,
  };
}
