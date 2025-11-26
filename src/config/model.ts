import { env } from "./env";

export function getChatModel(): string {
  if (env.OPENAI_MODEL && env.OPENAI_MODEL.length > 0) {
    return env.OPENAI_MODEL;
  }
  return "gpt-5.1";
}

export function getFallbackModel(): string {
  if (env.OPENAI_FALLBACK_MODEL && env.OPENAI_FALLBACK_MODEL.length > 0) {
    return env.OPENAI_FALLBACK_MODEL;
  }
  if (env.OPENAI_MODEL && env.OPENAI_MODEL.length > 0) {
    return env.OPENAI_MODEL;
  }
  return "gpt-5-mini";
}

export function getSummaryModel(): string {
  if (env.OPENAI_SUMMARY_MODEL && env.OPENAI_SUMMARY_MODEL.length > 0) {
    return env.OPENAI_SUMMARY_MODEL;
  }
  if (env.OPENAI_MODEL && env.OPENAI_MODEL.length > 0) {
    return env.OPENAI_MODEL;
  }
  return getFallbackModel();
}
