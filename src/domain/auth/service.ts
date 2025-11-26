import { AuthContext, AuthTokenPayload } from "./types";
import { TenantId, UserId } from "../core/types";

export function parseAuthHeader(header?: string | null): string | null {
  if (!header) {
    return null;
  }
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.substring("Bearer ".length).trim() || null;
}

export async function verifyAuthToken(_token: string): Promise<AuthContext> {
  throw new Error(
    "verifyAuthToken is not implemented yet. It should validate the token and return an AuthContext."
  );
}

export function buildAnonymousContext(_tenantId: TenantId | null): AuthContext | null {
  return null;
}

export function mapPayloadToContext(payload: AuthTokenPayload): AuthContext {
  return {
    tenantId: payload.tenantId,
    userId: payload.userId,
    role: payload.role
  };
}
