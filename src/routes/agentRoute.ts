// src/routes/agentRoute.ts
import { SupervisorAgent } from "../agents/SupervisorAgent";

export default async function agentRoutes(fastify: any, opts: any) {
  const supervisor = new SupervisorAgent();

  fastify.post("/agent", async (request: any, reply: any) => {
    const userInput = request.body?.query;
    if (!userInput) {
      reply.status(400).send({ error: "No query provided" });
      return;
    }
    try {
      const answer = await supervisor.handleRequest(userInput);
      reply.send({ answer });
    } catch (e: any) {
      reply.status(500).send({ error: e.message });
    }
  });
}
