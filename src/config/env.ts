import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import os from "os";

const envFilePath = path.join(os.homedir(), "Documents", "Backend-Secrets", "backend.env");

dotenv.config({ path: envFilePath });

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_PROJECT: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.1"),
  OPENAI_FALLBACK_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_SUMMARY_MODEL: z.string().default("gpt-5-mini")
});

const parsed = EnvSchema.parse(process.env);

export const env = {
  ...parsed,
  PORT: parsed.PORT ? Number(parsed.PORT) : 3000
};
