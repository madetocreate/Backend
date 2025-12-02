import { FastifyReply, FastifyRequest } from "fastify"
import jwt from "jsonwebtoken"

type AuthPayload = {
  tenantId: string
  [key: string]: unknown
}

const AUTH_SECRET = process.env.AUTH_SECRET || ""
const REQUIRE_SIGNED = (process.env.AUTH_REQUIRE_SIGNED_TOKENS || "true").toLowerCase() === "true"

export function signAuthToken(payload: AuthPayload): string {
  if (!AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not configured")
  }
  return jwt.sign(payload, AUTH_SECRET, { algorithm: "HS256" })
}

export function verifyAuthToken(token: string): AuthPayload {
  if (!token) {
    throw new Error("Missing token")
  }
  if (!AUTH_SECRET) {
    if (REQUIRE_SIGNED) {
      throw new Error("Missing AUTH_SECRET while AUTH_REQUIRE_SIGNED_TOKENS=true")
    }
    const parts = token.split(".")
    if (parts.length < 2) {
      throw new Error("Invalid unsigned token format")
    }
    const payloadJson = Buffer.from(parts[1], "base64").toString("utf8")
    const payload = JSON.parse(payloadJson || "{}")
    return payload as AuthPayload
  }
  const verified = jwt.verify(token, AUTH_SECRET, { algorithms: ["HS256"] })
  return verified as AuthPayload
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthPayload
  }
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization || ""
  const parts = header.split(" ")
  const token = parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : ""
  if (!token) {
    reply.code(401)
    reply.send({ error: "missing_auth_token" })
    return
  }
  try {
    const payload = verifyAuthToken(token)
    if (!payload || !payload.tenantId) {
      throw new Error("Token payload missing tenantId")
    }
    request.auth = payload
  } catch (error) {
    reply.code(401)
    reply.send({ error: "invalid_auth_token" })
  }
}
