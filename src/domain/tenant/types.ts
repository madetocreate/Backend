import { TenantId } from "../core/types";

export type TenantProfile = {
  tenantId: TenantId;
  businessName: string;
  industry?: string;
  toneOfVoice?: string;
  description?: string;
  createdAt: Date;
};
