import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import os from "os";
import fs from "fs";

const defaultEnvPath = path.join(process.cwd(), ".env");
const legacyEnvPath = path.join(os.homedir(), "Documents", "Backend-Secrets", "backend.env");
const customEnvPath = process.env.BACKEND_ENV_PATH;

const envPathsToTry: string[] = [];

if (customEnvPath && customEnvPath.length > 0) {
  envPathsToTry.push(customEnvPath);
}

if (fs.existsSync(legacyEnvPath)) {
  envPathsToTry.push(legacyEnvPath);
}

if (fs.existsSync(defaultEnvPath)) {
  envPathsToTry.push(defaultEnvPath);
}

if (envPathsToTry.length > 0) {
  for (const p of envPathsToTry) {
    dotenv.config({ path: p });
  }
} else {
  dotenv.config();
}

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
