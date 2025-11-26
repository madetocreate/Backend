export type ModuleId =
  | "base"
  | "communications"
  | "reviews"
  | "marketing"
  | "website_assistant";

export type PlanId = "starter" | "growth" | "pro";

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  description: string;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceCents: number;
  modules: ModuleId[];
};
