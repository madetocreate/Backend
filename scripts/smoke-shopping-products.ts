import { runShoppingProductResearch } from "../src/domain/shopping/productResearch";

async function main() {
  const tenantId = process.env.SMOKE_TENANT_ID || "test-tenant-shopping-products";
  const sessionId = "shopping-products-" + Date.now().toString();

  const query =
    "schwarzes Herren T-Shirt Größe M aus Baumwolle bei Amazon, gute Bewertungen, Prime";

  const items = await runShoppingProductResearch({
    tenantId,
    sessionId,
    query,
    maxResults: 5
  });

  console.log("==== Shopping Product Search ====");
  console.log("Query:", query);
  console.log("");
  console.log(JSON.stringify(items, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
