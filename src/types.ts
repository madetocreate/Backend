export interface AgentRequest {
  query: string;
  [key: string]: any;
}

export interface AgentResponse {
  answer: string;
  [key: string]: any;
}
