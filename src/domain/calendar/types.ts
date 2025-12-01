import { TenantId } from "../core/types";

export type CalendarEventType = "meeting" | "task" | "reminder" | "block" | "other";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  type?: CalendarEventType;
  metadata?: Record<string, unknown>;
};

export type CalendarTimeRange = {
  from: string;
  to: string;
};

export type CalendarQueryRequest = {
  tenantId: TenantId;
  sessionId: string;
  question: string;
  events: CalendarEvent[];
  timeRange?: CalendarTimeRange;
  timezone?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
};

export type CalendarPlanBlock = {
  label: string;
  startsAt: string;
  endsAt: string;
  metadata?: Record<string, unknown>;
};

export type CalendarPlan = {
  blocks: CalendarPlanBlock[];
  notes?: string;
};

export type CalendarQueryResponse = {
  tenantId: TenantId;
  sessionId: string;
  channel: string;
  answer: string;
  plan?: CalendarPlan;
};
