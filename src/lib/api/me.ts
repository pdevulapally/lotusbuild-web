import {apiRequest} from "./client";
import type {AiEffort} from "./sessions";

export type AgentModel = {id: string; name: string; efforts: AiEffort[]; maxOutputTokens: number};

// The fields the sign-in page shows. Source: GET /me in the backend's server.ts.
export type Me = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  plan: {key: string; name: string};
  capabilities: {key: string; kind: string; value: unknown}[];
  models?: AgentModel[];
};

export function allowedModels(me: Me): string[] {
  return [...new Set(me.models?.map(model => model.id) ?? [])];
}

const AI_EFFORTS = ["low", "standard", "high", "xhigh"] as const;

export function allowedEfforts(me: Me, model?: string): (typeof AI_EFFORTS)[number][] {
  const capability = me.capabilities?.find(item => item.key === "ai.effort");
  if (capability?.kind !== "string" || typeof capability.value !== "string") return [];
  const maximum = AI_EFFORTS.indexOf(capability.value as (typeof AI_EFFORTS)[number]);
  const permitted = maximum < 0 ? [] : AI_EFFORTS.slice(0, maximum + 1);
  if (model === undefined) return permitted;
  return permitted.filter(effort => me.models?.find(item => item.id === model)?.efforts.includes(effort));
}

// Requires a Firebase ID token. The backend verifies it on every call.
export function getMe(token: string) {
  return apiRequest<Me>("/me", {token});
}

// Models with only the efforts both the provider model and the account plan allow.
export function composerModels(me: Me): AgentModel[] {
  return (me.models ?? []).map(model => ({...model, efforts: allowedEfforts(me, model.id)}));
}

export type UsageMeter = {meterKey: string; label: string; unit: string; used: number; limit: number | null};

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

// GET /me/usage, schema-checked: malformed meters are dropped, never guessed.
export async function getUsage(token: string): Promise<UsageMeter[]> {
  const body = await apiRequest<{meters?: unknown}>("/me/usage", {token});
  if (!Array.isArray(body.meters)) throw new Error("Usage is unavailable");
  return body.meters.flatMap((entry: Record<string, unknown>) => {
    const used = count(entry?.totalUsed);
    if (typeof entry?.meterKey !== "string" || typeof entry.label !== "string" || used === null) return [];
    return [{meterKey: entry.meterKey, label: entry.label, unit: typeof entry.unit === "string" ? entry.unit : "", used,
      limit: count(entry.hardLimit) ?? count(entry.includedAllowance)}];
  });
}
