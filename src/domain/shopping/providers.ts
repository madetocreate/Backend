import type {
  ShoppingJob,
  ShoppingProviderKey,
  ShoppingProviderPreference
} from "./types";

export type ShoppingProviderContext = {
  countryCode?: string | null;
  preferredStore?: string | null;
};

function buildOnlineLabel(storeName: string): string {
  if (!storeName) {
    return "Online-Suche";
  }
  return "Online-Suche (" + storeName + ")";
}

function decideKeyAndLabel(
  pref: ShoppingProviderPreference,
  preferredStore?: string | null
): { key: ShoppingProviderKey; label: string } {
  const storeName = (preferredStore ?? "").trim();
  const lower = storeName.toLowerCase();

  if (lower.includes("amazon")) {
    return {
      key: "online_search",
      label: buildOnlineLabel(storeName || "Amazon")
    };
  }

  if (!storeName && pref === "list_only") {
    return {
      key: "list_only",
      label: "Nur Einkaufsliste (ohne Shop-Anbindung)"
    };
  }

  if (!storeName && (pref === "unknown" || pref === "aggregator" || pref === "local_store")) {
    return {
      key: "list_only",
      label: "Nur Einkaufsliste (ohne Shop-Anbindung)"
    };
  }

  if (storeName) {
    return {
      key: "online_search",
      label: buildOnlineLabel(storeName)
    };
  }

  return {
    key: "list_only",
    label: "Nur Einkaufsliste (ohne Shop-Anbindung)"
  };
}

export function decideProviderForJob(
  job: ShoppingJob,
  ctx: ShoppingProviderContext
): ShoppingJob {
  const decision = decideKeyAndLabel(job.providerPreference, ctx.preferredStore);

  return {
    ...job,
    providerKey: decision.key,
    providerLabel: decision.label
  };
}
