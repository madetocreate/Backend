import { AuthContext, AuthTokenPayload } from "./types";
import { TenantId, UserId } from "../core/types";
import { env } from "../../config/env";
import crypto from "crypto";

export function parseAuthHeader(header?: string | null): string | null {
  if (!header) {
    return null;
  }
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.substring("Bearer ".length).trim() || null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function decodePayloadFromToken(token: string): AuthTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("invalid_auth_token_format");
  }

  const payloadB64 = parts[0];
  const signatureB64 = parts[1];

  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, "base64").toString("utf8");
  } catch {
    throw new Error("invalid_auth_token_payload_encoding");
  }

  let payloadRaw: unknown;
  try {
    payloadRaw = JSON.parse(payloadJson);
  } catch {
    throw new Error("invalid_auth_token_payload_json");
  }

  const payload = payloadRaw as any;

  if (typeof payload.tenantId !== "string") {
    throw new Error("invalid_auth_token_tenant");
  }
  if (typeof payload.userId !== "string") {
    throw new Error("invalid_auth_token_user");
  }
  if (payload.role !== "tenant_admin" && payload.role !== "tenant_user") {
    throw new Error("invalid_auth_token_role");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < nowSec) {
    throw new Error("auth_token_expired");
  }

  const secret = process.env.AUTH_SECRET || env.AUTH_SECRET || "";
  if (secret && secret.length > 0) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64");

    if (!timingSafeEqual(signatureB64, expectedSignature)) {
      throw new Error("invalid_auth_token_signature");
    }
  }

  return {
    tenantId: payload.tenantId,
    userId: payload.userId,
    role: payload.role,
    iat: typeof payload.iat === "number" ? payload.iat : nowSec,
    exp: typeof payload.exp === "number" ? payload.exp : nowSec + 3600
  };
}

export async function verifyAuthToken(token: string): Promise<AuthContext> {
  if (!token || token.trim().length === 0) {
    throw new Error("missing_auth_token");
  }

  const payload = decodePayloadFromToken(token);
  return mapPayloadToContext(payload);
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
