export type OrchestratorInput = {
  tenantId: string;
  sessionId: string;
  channel: string;
  message: string;
  metadata?: Record<string, unknown>;
};
