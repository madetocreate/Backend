import { randomUUID } from "crypto";
import { db } from "../../infra/db";
import { ModuleId, PlanId } from "./types";
import { getModulesForPlan } from "./plans";

export type SubscriptionStatus = "active" | "trialing" | "canceled";

export function ensureTenantRow(tenantId: string, businessName: string | null) {
  const existing = db
    .prepare("SELECT tenant_id FROM tenants WHERE tenant_id = ?")
    .get(tenantId) as { tenant_id: string } | undefined;

  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  db.prepare("INSERT INTO tenants (tenant_id, business_name, created_at) VALUES (?, ?, ?)").run(
    tenantId,
    businessName,
    now
  );
}

export function upsertBaseSubscription(params: {
  tenantId: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM subscriptions WHERE tenant_id = ?")
    .get(params.tenantId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE subscriptions SET status = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = ? WHERE id = ?"
    ).run(
      params.status,
      params.stripeCustomerId ?? null,
      params.stripeSubscriptionId ?? null,
      now,
      existing.id
    );
    return existing.id;
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO subscriptions (id, tenant_id, status, stripe_customer_id, stripe_subscription_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    params.tenantId,
    params.status,
    params.stripeCustomerId ?? null,
    params.stripeSubscriptionId ?? null,
    now,
    now
  );
  return id;
}

export function setModuleStatus(params: {
  tenantId: string;
  moduleKey: ModuleId;
  status: "active" | "inactive";
}) {
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM subscription_modules WHERE tenant_id = ? AND module_key = ?")
    .get(params.tenantId, params.moduleKey) as { id: string } | undefined;

  if (existing) {
    db.prepare("UPDATE subscription_modules SET status = ?, updated_at = ? WHERE id = ?").run(
      params.status,
      now,
      existing.id
    );
    return existing.id;
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO subscription_modules (id, tenant_id, module_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, params.tenantId, params.moduleKey, params.status, now, now);
  return id;
}

export function isModuleEnabled(tenantId: string, moduleKey: ModuleId): boolean {
  const row = db
    .prepare(
      "SELECT status FROM subscription_modules WHERE tenant_id = ? AND module_key = ? ORDER BY updated_at DESC LIMIT 1"
    )
    .get(tenantId, moduleKey) as { status: string } | undefined;
  if (!row) {
    if (moduleKey === "base") {
      return false;
    }
    return false;
  }
  return row.status === "active";
}
export function applyStripeCheckoutSession(input: {
  tenantId: string;
  planId: PlanId;
  status?: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const now = new Date().toISOString();
  const status: SubscriptionStatus = input.status ?? "active";

  ensureTenantRow(input.tenantId, null);

  const subscriptionId = randomUUID();
  db.prepare(
    "INSERT INTO subscriptions (id, tenant_id, status, stripe_customer_id, stripe_subscription_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    subscriptionId,
    input.tenantId,
    status,
    input.stripeCustomerId ?? null,
    input.stripeSubscriptionId ?? null,
    now,
    now
  );

  const modules = getModulesForPlan(input.planId);
  const stmtModule = db.prepare(
    "INSERT INTO subscription_modules (id, tenant_id, module_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const m of modules) {
    stmtModule.run(randomUUID(), input.tenantId, m.id, status, now, now);
  }
}

