import { handleShoppingQuery } from "../src/domain/shopping/service";
import { buildShoppingAutomationPayload } from "../src/domain/shopping/automation";

async function runScenario(name: string, params: {
  tenantId: string;
  sessionId: string;
  message: string;
  language?: string;
  countryCode?: string | null;
  preferredStore?: string | null;
}) {
  const res = await handleShoppingQuery({
    tenantId: params.tenantId,
    sessionId: params.sessionId,
    message: params.message,
    language: params.language,
    countryCode: params.countryCode,
    preferredStore: params.preferredStore,
    metadata: {}
  });

  console.log("==== " + name + " – ShoppingResult.content ====");
  console.log(res.content);
  console.log("");

  console.log("==== " + name + " – ShoppingResult.job ====");
  console.log(JSON.stringify(res.job, null, 2));
  console.log("");

  const automationPayload = buildShoppingAutomationPayload({
    job: res.job,
    countryCode: params.countryCode ?? null
  });

  console.log("==== " + name + " – AutomationPayload ====");
  console.log(JSON.stringify(automationPayload, null, 2));
  console.log("");
}

async function main() {
  const now = Date.now().toString();

  await runScenario("ES / Mercadona", {
    tenantId: "test-tenant-shopping-es",
    sessionId: "shopping-es-" + now,
    message: "Mach mir bitte einen Wocheneinkauf für zwei Erwachsene und ein Kind. Budget 80 Euro. Ich kaufe normalerweise bei Mercadona ein.",
    language: "de",
    countryCode: "ES",
    preferredStore: "Mercadona"
  });

  await runScenario("DE / Aggregator", {
    tenantId: "test-tenant-shopping-de",
    sessionId: "shopping-de-" + now,
    message: "Erstelle mir eine Einkaufsliste für eine Woche für zwei Erwachsene. Günstig einkaufen, viel Basislebensmittel, keine Fertiggerichte.",
    language: "de",
    countryCode: "DE",
    preferredStore: ""
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
