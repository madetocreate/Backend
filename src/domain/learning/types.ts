import type { TenantId } from "../core/types";

export type LearningMode = "summary" | "lesson" | "quiz" | "flashcards";

export type LearningDifficulty = "beginner" | "intermediate" | "advanced";

export interface LearningContentRequest {
  tenantId: TenantId;
  sessionId: string;
  mode: LearningMode;
  message: string;
  difficulty?: LearningDifficulty;
  questionCount?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface LearningContentResponse {
  tenantId: TenantId;
  sessionId: string;
  mode: LearningMode;
  content: string;
}
