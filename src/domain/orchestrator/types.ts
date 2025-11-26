export type OrchestratorInput = {
  tenantId: string;
  sessionId: string;
  channel: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type OrchestratorOutputAction = {
  type: string;
  payload: unknown;
};

export type OrchestratorOutput = {
  content: string;
  actions?: OrchestratorOutputAction[];
};
