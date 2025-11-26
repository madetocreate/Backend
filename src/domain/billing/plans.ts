import { ModuleDefinition, ModuleId, PlanDefinition, PlanId } from "./types";

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  base: {
    id: "base",
    name: "Basis-Abo",
    description: "Zentraler Firmen-Operator, Firmenprofil und Grundfunktionen."
  },
  communications: {
    id: "communications",
    name: "Kommunikationsmodul",
    description: "E-Mail- und DM-Handling über Gmail, Outlook, Instagram, Facebook, Telegram (über Make)."
  },
  reviews: {
    id: "reviews",
    name: "Bewertungsmodul",
    description: "Eingehende Bewertungen (z.B. Google) sammeln, analysieren und Antworten vorschlagen."
  },
  marketing: {
    id: "marketing",
    name: "Marketingmodul",
    description: "Social-Posts planen, generieren und über Kalender/Automatisierung ausspielen."
  },
  website_assistant: {
    id: "website_assistant",
    name: "Website-Assistent",
    description: "Chat-Assistent für die Website, eingebettet als Widget."
  }
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  base_plan: {
    id: "base_plan",
    name: "Aklow Basis",
    description: "Ein zentrales Abo mit Operator-Funktionen; Module können flexibel dazugebucht werden.",
    monthlyPriceCents: 4900,
    modules: ["base"]
  }
};

export function getPlanById(planId: PlanId): PlanDefinition | null {
  return PLANS[planId] ?? null;
}

export function getModulesForPlan(planId: PlanId): ModuleDefinition[] {
  const plan = PLANS[planId];
  if (!plan) {
    return [];
  }
  return plan.modules.map((moduleId) => MODULES[moduleId]);
}
