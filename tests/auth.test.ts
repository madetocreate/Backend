import crypto from "crypto";
import { parseAuthHeader, verifyAuthToken } from "../src/domain/auth/service";
import { AuthTokenPayload } from "../src/domain/auth/types";

function createTestToken(payload: AuthTokenPayload, secret: string | null): string {
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64");
  if (secret && secret.length > 0) {
    const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64");
    return payloadB64 + "." + sig;
  }
  return payloadB64 + ".nosignature";
}

describe("auth service", () => {
  it("parses Bearer header", () => {
    const token = parseAuthHeader("Bearer abc.def");
    expect(token).toBe("abc.def");
  });

  it("rejects non-Bearer header", () => {
    const token = parseAuthHeader("Token xxx");
    expect(token).toBeNull();
  });

  it("verifies a valid token", async () => {
    process.env.AUTH_SECRET = "test-secret";
    const nowSec = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      tenantId: "test-tenant",
      userId: "test-user",
      role: "tenant_admin",
      iat: nowSec,
      exp: nowSec + 3600
    };
    const token = createTestToken(payload, process.env.AUTH_SECRET || null);
    const ctx = await verifyAuthToken(token);
    expect(ctx.tenantId).toBe(payload.tenantId);
    expect(ctx.userId).toBe(payload.userId);
    expect(ctx.role).toBe(payload.role);
  });

  it("fails on invalid signature when AUTH_SECRET set", async () => {
    process.env.AUTH_SECRET = "test-secret";
    const nowSec = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      tenantId: "test-tenant",
      userId: "test-user",
      role: "tenant_admin",
      iat: nowSec,
      exp: nowSec + 3600
    };
    const token = createTestToken(payload, "other-secret");
    await expect(verifyAuthToken(token)).rejects.toThrow();
  });
});
