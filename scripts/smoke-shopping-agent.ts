import { runShoppingProductAgent } from "../src/domain/shopping/service";

async function main() {
  const tenantId = "test-tenant-shopping-product-agent";
  const sessionId = "shopping-product-agent-" + Date.now().toString();

  const text =
    "schwarzes Herren T-Shirt Größe M aus Baumwolle, gute Bewertungen, Prime bei Amazon";

  const result = await runShoppingProductAgent({
    tenantId,
    sessionId,
    text,
    maxResults: 5,
    preferredStore: "Amazon"
  });

  console.log("==== Shopping Product Agent Result.content ====");
  console.log(result.content);
  console.log("");
  console.log("==== Shopping Product Agent Result.job ====");
  console.log(JSON.stringify(result.job, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
