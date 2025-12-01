import { createResponse } from "../src/domain/orchestrator/service";

async function main() {
  const tenantId = process.env.SMOKE_TENANT_ID || "test-tenant-shopping";
  const sessionId = "shopping-smoke-" + Date.now().toString();

  const res = await createResponse({
    tenantId,
    sessionId,
    channel: "smoke",
    message: "Mach mir bitte einen Wocheneinkauf für zwei Erwachsene und ein Kind. Budget 80 Euro. Ich kaufe normalerweise bei Mercadona ein.",
    metadata: {
      tool: "shopping_query",
      language: "de",
      countryCode: "ES",
      preferredStore: "Mercadona",
      mode: "shopping",
      memoryMode: "ephemeral",
      projectId: "shopping-smoke"
    }
  } as any);

  console.log(JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
