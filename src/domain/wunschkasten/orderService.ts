import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  CreateWunschOrderInput,
  WunschOrder,
  AutomationBlueprint,
} from "./types";
import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { createBlueprintForKasten } from "./blueprintService";

const ORDERS_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(ORDERS_DIR, "wunsch_orders.jsonl");

export async function createWunschOrder(
  input: CreateWunschOrderInput
): Promise<WunschOrder> {
  const nowIso = new Date().toISOString();
  const id = randomUUID();

  let blueprint: AutomationBlueprint | undefined = input.blueprint;
  let blueprintSummary = input.blueprintSummary;
  let researchSummary: string | undefined;
  let analysisSummary: string | undefined;

  if (!blueprint && (input.stateSnapshot || blueprintSummary)) {
    try {
      const idea =
        blueprintSummary ??
        input.offer.description ??
        input.offer.title;

      const result = await createBlueprintForKasten({
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        channel: "app" as any,
        idea,
        state: input.stateSnapshot,
      });

      blueprint = result.blueprint;
      researchSummary = result.researchSummary;
      analysisSummary = result.analysisSummary;

      if (!blueprintSummary) {
        blueprintSummary = result.blueprint.description;
      }
    } catch (e) {
      blueprint = undefined;
      researchSummary = undefined;
      analysisSummary = undefined;
    }
  }

  const order: WunschOrder = {
    id,
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    audience: input.audience,
    track: input.track,
    offerId: input.offer.id,
    offerTitle: input.offer.title,
    offerDescription: input.offer.description,
    priceHint: input.offer.priceHint,
    deliveryTimeHint: input.offer.deliveryTimeHint,
    tier: input.offer.tier,
    blueprintSummary,
    blueprint,
    researchSummary,
    analysisSummary,
    stateSnapshot: input.stateSnapshot,
    status: "requested",
    createdAt: nowIso,
    updatedAt: nowIso,
    metadata: input.metadata ?? {},
  };

  await fs.mkdir(ORDERS_DIR, { recursive: true });
  await fs.appendFile(ORDERS_FILE, JSON.stringify(order) + "\n", "utf8");

  const usageType: UsageEventType = "wunschkasten_order" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/wunschkasten/order",
    timestamp: new Date(),
    metadata: {
      track: order.track ?? null,
      tier: order.tier ?? null,
      hasBlueprint: !!order.blueprint,
    },
  });

  return order;
}
