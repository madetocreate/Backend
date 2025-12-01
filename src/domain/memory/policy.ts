import { MemoryItemType, MemoryMetadata } from "./types";

export function shouldStoreLocally(type: MemoryItemType): boolean {
  if (type === "business_profile") return true;
  if (type === "conversation_message") return true;
  if (type === "email") return true;
  if (type === "dm") return true;
  if (type === "review") return true;
  if (type === "document") return true;
  if (type === "custom") return true;
  return false;
}

export function shouldStoreInVector(
  type: MemoryItemType,
  metadata?: MemoryMetadata
): boolean {
  if (metadata?.flags?.includes("no_vector")) return false;
  if (type === "business_profile") return true;
  if (type === "document") return true;
  if (type === "email") return true;
  if (type === "dm") return true;
  if (type === "review") return true;
  return false;
}
