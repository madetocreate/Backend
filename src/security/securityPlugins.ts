import { FastifyInstance } from "fastify"
import fastifyHelmet from "@fastify/helmet"
import fastifyCors from "@fastify/cors"

const rawOrigins = process.env.CORS_ORIGIN || "http://localhost:3000"

function parseOrigins(): string[] {
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false
  })
  await app.register(fastifyCors, {
    origin: parseOrigins(),
    credentials: true
  })
}
