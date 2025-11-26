import { TenantId, UserId } from "../core/types";

export type AuthRole = "tenant_admin" | "tenant_user";

export type AuthTokenPayload = {
  tenantId: TenantId;
  userId: UserId;
  role: AuthRole;
  iat: number;
  exp: number;
};

export type AuthContext = {
  tenantId: TenantId;
  userId: UserId;
  role: AuthRole;
};
