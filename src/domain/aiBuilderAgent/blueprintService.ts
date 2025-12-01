import { randomUUID } from "crypto";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import { handleResearchQuery } from "../research/service";
import { handleAnalysisQuery } from "../analysis/service";
import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import {
  CreateBlueprintInput,
  CreateBlueprintResult,
  AutomationBlueprint,
} from "./types";

export async function createBlueprintForKasten(
  input: CreateBlueprintInput
): Promise<CreateBlueprintResult> {
  const model = getSummaryModel();
  const channel = input.channel;

  let researchSummary = "";
  try {
    const research = await handleResearchQuery({
      tenantId: input.tenantId as any,
      sessionId: input.sessionId,
      question:
        input.idea && input.idea.length > 0
          ? input.idea
          : "Entwirf einen sinnvollen Automations-Blueprint basierend auf dem aktuellen AI-Kasten-Status.",
      scope: "tech",
      maxSources: 4,
      channel: "ai_kasten_blueprint",
      metadata: {
        source: "ai_kasten_blueprint",
        track: input.state?.track ?? null,
        audience: input.state?.audience ?? null,
      },
    } as any);
    researchSummary = (research as any).answer ?? "";
  } catch {
    researchSummary = "";
  }

  let analysisSummary = "";
  try {
    const analysis = await handleAnalysisQuery({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      message:
        "Fasse in 3–5 Sätzen zusammen, welche vorhandenen Daten, Dokumente oder Analysen für eine neue Automation relevant sein könnten.",
    } as any);
    analysisSummary = (analysis as any).content ?? "";
  } catch {
    analysisSummary = "";
  }

  const payload = {
    kind: "aiBuilderAgent_blueprint",
    idea: input.idea ?? null,
    state: input.state ?? null,
    researchSummary,
    analysisSummary,
  };

  const response = await openai.responses.create({
    model,
    instructions:
      "Du bist der Blueprint-Agent für den AI-Kasten von Aklow. " +
      "Du bekommst den aktuellen AiBuilderAgent-Status, eine Wunschbeschreibung (idea), " +
      "sowie kurze Zusammenfassungen aus Research- und Analyse-Agent. " +
      "Deine Aufgabe ist es, einen klaren Automations-Blueprint zu erstellen. " +
      "Gib NUR minifizierte JSON-Antwort im folgenden Schema zurück: " +
      "{\\\"id\\\": string, \\\"name\\\": string, \\\"description\\\": string, " +
      "\\\"audience\\\"?: string, \\\"track\\\"?: string, \\\"goals\\\"?: string[], \\\"platforms\\\"?: string[], " +
      "\\\"trigger\\\": { \\\"type\\\": string, \\\"source\\\"?: string, \\\"event\\\"?: string, " +
      "\\\"schedule\\\"?: { \\\"cron\\\"?: string, \\\"frequency\\\"?: string, \\\"timeOfDay\\\"?: string }, " +
      "\\\"conditions\\\"?: string[] }, " +
      "\\\"actions\\\": { \\\"id\\\": string, \\\"kind\\\"?: string, \\\"channel\\\"?: string, \\\"description\\\": string, \\\"requiresHumanReview\\\"?: boolean, \\\"metadata\\\"?: object }[], " +
      "\\\"estimatedComplexity\\\"?: string, \\\"estimatedSystems\\\"?: string[], \\\"notes\\\"?: string[], \\\"metadata\\\"?: object }. " +
      "Verwende für track nur 'marketing', 'automation', 'fun' oder 'custom', wenn du es setzt.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(payload),
          },
        ],
      },
    ],
  } as any);

  const text = (response as any).output_text as string | undefined;

  let blueprint: AutomationBlueprint;

  if (text) {
    try {
      const parsed = JSON.parse(text) as any;
      blueprint = {
        id:
          parsed.id && typeof parsed.id === "string"
            ? parsed.id
            : "bp_" + randomUUID(),
        name:
          parsed.name && typeof parsed.name === "string"
            ? parsed.name
            : input.idea && input.idea.length > 0
            ? input.idea.slice(0, 80)
            : "AI-Kasten Automation",
        description:
          parsed.description && typeof parsed.description === "string"
            ? parsed.description
            : input.idea ?? "Automations-Blueprint aus dem AI-Kasten.",
        audience: input.state?.audience,
        track: input.state?.track,
        goals: Array.isArray(parsed.goals)
          ? parsed.goals.filter((g: any) => typeof g === "string")
          : input.state?.goals,
        platforms: Array.isArray(parsed.platforms)
          ? parsed.platforms.filter((p: any) => typeof p === "string")
          : input.state?.platforms,
        trigger: {
          type:
            parsed.trigger &&
            parsed.trigger.type &&
            typeof parsed.trigger.type === "string"
              ? parsed.trigger.type
              : "event",
          source:
            parsed.trigger && typeof parsed.trigger.source === "string"
              ? parsed.trigger.source
              : undefined,
          event:
            parsed.trigger && typeof parsed.trigger.event === "string"
              ? parsed.trigger.event
              : undefined,
          schedule:
            parsed.trigger && typeof parsed.trigger.schedule === "object"
              ? parsed.trigger.schedule
              : undefined,
          conditions: Array.isArray(parsed.trigger?.conditions)
            ? parsed.trigger.conditions.filter((c: any) => typeof c === "string")
            : [],
        },
        actions: Array.isArray(parsed.actions)
          ? parsed.actions.map((a: any, index: number) => ({
              id:
                typeof a.id === "string" && a.id.trim().length > 0
                  ? a.id
                  : "act_" + index + "_" + randomUUID(),
              kind:
                typeof a.kind === "string" && a.kind.trim().length > 0
                  ? a.kind
                  : "custom",
              channel:
                typeof a.channel === "string" && a.channel.trim().length > 0
                  ? a.channel
                  : undefined,
              description:
                typeof a.description === "string" && a.description.trim().length > 0
                  ? a.description
                  : "Aktion " + (index + 1),
              requiresHumanReview:
                typeof a.requiresHumanReview === "boolean"
                  ? a.requiresHumanReview
                  : false,
              metadata:
                a.metadata && typeof a.metadata === "object" ? a.metadata : undefined,
            }))
          : [],
        estimatedComplexity:
          typeof parsed.estimatedComplexity === "string"
            ? parsed.estimatedComplexity
            : "medium",
        estimatedSystems: Array.isArray(parsed.estimatedSystems)
          ? parsed.estimatedSystems.filter((s: any) => typeof s === "string")
          : [],
        notes: Array.isArray(parsed.notes)
          ? parsed.notes.filter((n: any) => typeof n === "string")
          : [],
        metadata:
          parsed.metadata && typeof parsed.metadata === "object"
            ? parsed.metadata
            : {},
      };
    } catch {
      blueprint = {
        id: "bp_" + randomUUID(),
        name:
          input.idea && input.idea.length > 0
            ? input.idea.slice(0, 80)
            : "AI-Kasten Automation",
        description: input.idea ?? "Automations-Blueprint aus dem AI-Kasten.",
        audience: input.state?.audience,
        track: input.state?.track,
        goals: input.state?.goals,
        platforms: input.state?.platforms,
        trigger: {
          type: "event",
          source: undefined,
          event: "custom",
          schedule: undefined,
          conditions: [],
        },
        actions: [],
        estimatedComplexity: "medium",
        estimatedSystems: [],
        notes: [
          "Fallback-Blueprint, weil das Modell keine gültige JSON-Antwort geliefert hat.",
        ],
        metadata: {
          fallback: true,
        },
      };
    }
  } else {
    blueprint = {
      id: "bp_" + randomUUID(),
      name:
        input.idea && input.idea.length > 0
          ? input.idea.slice(0, 80)
          : "AI-Kasten Automation",
      description: input.idea ?? "Automations-Blueprint aus dem AI-Kasten.",
      audience: input.state?.audience,
      track: input.state?.track,
      goals: input.state?.goals,
      platforms: input.state?.platforms,
      trigger: {
        type: "event",
        source: undefined,
        event: "custom",
        schedule: undefined,
        conditions: [],
      },
      actions: [],
      estimatedComplexity: "medium",
      estimatedSystems: [],
      notes: [
        "Fallback-Blueprint, weil keine Antwort vom Modell vorlag.",
      ],
      metadata: {
        fallback: true,
      },
    };
  }

  const result: CreateBlueprintResult = {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    blueprint,
    researchSummary: researchSummary || undefined,
    analysisSummary: analysisSummary || undefined,
  };

  const usageType: UsageEventType = "aiBuilderAgent_blueprint" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/aiBuilderAgent/blueprint",
    timestamp: new Date(),
    metadata: {
      track: input.state?.track ?? null,
      audience: input.state?.audience ?? null,
    },
  });

  return result;
}
