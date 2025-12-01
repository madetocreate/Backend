import { randomUUID } from "crypto";
import {
  OfferPreview,
  WunschTrack,
  AudienceType,
  AiBuilderAgentSessionState,
} from "./types";

type SimpleContext = {
  track?: WunschTrack;
  audience?: AudienceType;
};

function baseId(prefix: string): string {
  return prefix + "_" + randomUUID();
}

function marketingOffers(): OfferPreview[] {
  return [
    {
      id: baseId("offer_marketing_starter"),
      title: "Marketing-Starter Setup",
      description:
        "Schnellstart für Leads und Sichtbarkeit: einfache Lead-Erfassung, Willkommensnachricht und Basis-Tracking für 1–2 Kanäle.",
      priceHint: "ab 49 €",
      deliveryTimeHint: "ca. 1–3 Tage",
      tier: "starter",
      metadata: {
        includes: ["Lead-Formular oder Chat", "1 Willkommens-Sequenz", "Basis-Tracking"],
      },
    },
    {
      id: baseId("offer_marketing_growth"),
      title: "Marketing-Growth Kit",
      description:
        "Mehrkanal-Marketing mit Automatisierung für Leads, Newsletter und Social Media – ideal zum Skalieren.",
      priceHint: "ab 199 €",
      deliveryTimeHint: "ca. 3–7 Tage",
      tier: "growth",
      metadata: {
        includes: [
          "Mehrere Kanäle (z. B. Website, Social, E-Mail)",
          "Newsletter- oder Follow-up-Flows",
          "Reporting-Grundlage",
        ],
      },
    },
  ];
}

function automationOffers(): OfferPreview[] {
  return [
    {
      id: baseId("offer_automation_starter"),
      title: "Alltags-Automatisierung Starter",
      description:
        "Eine klare Automatisierung für deine täglichen Abläufe (z. B. Erinnerungen, Inbox-Aufräumen oder To-Do-Flows).",
      priceHint: "ab 29 €",
      deliveryTimeHint: "ca. 1–3 Tage",
      tier: "basic",
      metadata: {
        includes: ["1 Haupt-Automation", "Feinschliff nach Testlauf"],
      },
    },
    {
      id: baseId("offer_automation_copilot"),
      title: "Alltags-CoPilot",
      description:
        "Mehrere verknüpfte Automatisierungen für Alltag oder Business (z. B. Inbox, Erinnerungen, kleine Routinen).",
      priceHint: "ab 79 €",
      deliveryTimeHint: "ca. 3–5 Tage",
      tier: "pro",
      metadata: {
        includes: ["bis zu 3 Flows", "Priorisierung nach Impact", "kurze Übergabe-Session"],
      },
    },
  ];
}

function funOffers(): OfferPreview[] {
  return [
    {
      id: baseId("offer_fun_free"),
      title: "Fun-Starter Pack",
      description:
        "Vorlagen für kleine Spielereien (z. B. Daily Challenge, Meme-Bot, kleine Quizfragen) zum direkten Ausprobieren.",
      priceHint: "kostenlos",
      deliveryTimeHint: "sofort",
      tier: "free",
      metadata: {
        includes: ["Vorlagenpaket", "Beispiele für Prompts", "Tipps für sichere Nutzung"],
      },
    },
    {
      id: baseId("offer_fun_custom"),
      title: "Custom Fun-Setup",
      description:
        "Wir setzen eine individuelle Fun- oder Gaming-Automation für dich oder deine Community auf.",
      priceHint: "ab 39 €",
      deliveryTimeHint: "ca. 2–4 Tage",
      tier: "starter",
      metadata: {
        includes: ["1 individuelle Automation", "Test & Anpassung"],
      },
    },
  ];
}

function genericOffers(ctx: SimpleContext): OfferPreview[] {
  return [
    {
      id: baseId("offer_generic_idea_to_setup"),
      title: "Von der Idee zum Setup",
      description:
        "Wir bringen deine Wunsch-Automation von der Beschreibung in ein fertiges Setup – inkl. Strukturierung, Planung und technischer Umsetzung.",
      priceHint: "ab 49 €",
      deliveryTimeHint: "ca. 2–5 Tage",
      tier: "basic",
      metadata: {
        audience: ctx.audience ?? null,
        track: ctx.track ?? null,
      },
    },
  ];
}

export function generateOffersForState(state: AiBuilderAgentSessionState): OfferPreview[] {
  const ctx: SimpleContext = {
    track: state.track,
    audience: state.audience,
  };

  if (ctx.track === "marketing") {
    return marketingOffers();
  }

  if (ctx.track === "automation") {
    return automationOffers();
  }

  if (ctx.track === "fun") {
    return funOffers();
  }

  if (!ctx.track && ctx.audience === "business") {
    return marketingOffers();
  }

  if (!ctx.track && ctx.audience === "private") {
    return automationOffers();
  }

  return genericOffers(ctx);
}
