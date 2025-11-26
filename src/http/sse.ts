import { FastifyReply } from "fastify";

export function writeSse(reply: FastifyReply, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  reply.raw.write(payload);
}
