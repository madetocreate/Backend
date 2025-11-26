import fs from "fs";
import path from "path";
import os from "os";
import { TenantProfile } from "./types";

const tenantDir = path.join(os.homedir(), "Documents", "Backend-Data");
const tenantFilePath = path.join(tenantDir, "tenants.jsonl");

const tenantProfiles: TenantProfile[] = [];

function ensureTenantDir() {
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }
}

function loadTenantProfiles() {
  try {
    ensureTenantDir();
    if (!fs.existsSync(tenantFilePath)) {
      return;
    }
    const raw = fs.readFileSync(tenantFilePath, "utf-8");
    if (!raw.trim()) {
      return;
    }
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as any;
        if (parsed && typeof parsed.tenantId === "string" && typeof parsed.businessName === "string") {
          const profile: TenantProfile = {
            tenantId: parsed.tenantId,
            businessName: parsed.businessName,
            industry: parsed.industry ?? undefined,
            toneOfVoice: parsed.toneOfVoice ?? undefined,
            description: parsed.description ?? undefined,
            createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date()
          };
          tenantProfiles.push(profile);
        }
      } catch {
      }
    }
  } catch {
  }
}

function appendTenantProfile(profile: TenantProfile) {
  try {
    ensureTenantDir();
    const line = JSON.stringify({
      tenantId: profile.tenantId,
      businessName: profile.businessName,
      industry: profile.industry ?? null,
      toneOfVoice: profile.toneOfVoice ?? null,
      description: profile.description ?? null,
      createdAt: profile.createdAt.toISOString()
    });
    fs.appendFileSync(tenantFilePath, line + "\n", "utf-8");
  } catch {
  }
}

loadTenantProfiles();

export function getTenantProfile(tenantId: string): TenantProfile | undefined {
  return tenantProfiles.find((p) => p.tenantId === tenantId);
}

export function upsertTenantProfile(input: {
  tenantId: string;
  businessName: string;
  industry?: string;
  toneOfVoice?: string;
  description?: string;
}) {
  const existing = tenantProfiles.find((p) => p.tenantId === input.tenantId);
  const now = new Date();
  if (existing) {
    existing.businessName = input.businessName;
    if (input.industry !== undefined) {
      existing.industry = input.industry;
    }
    if (input.toneOfVoice !== undefined) {
      existing.toneOfVoice = input.toneOfVoice;
    }
    if (input.description !== undefined) {
      existing.description = input.description;
    }
    return;
  }
  const profile: TenantProfile = {
    tenantId: input.tenantId,
    businessName: input.businessName,
    industry: input.industry,
    toneOfVoice: input.toneOfVoice,
    description: input.description,
    createdAt: now
  };
  tenantProfiles.push(profile);
  appendTenantProfile(profile);
}
