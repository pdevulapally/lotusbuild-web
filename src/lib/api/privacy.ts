import {apiRequest} from "./client";

export const PRIVACY_KINDS = ["access", "erasure", "rectification", "complaint"] as const;
export type PrivacyKind = (typeof PRIVACY_KINDS)[number];
export type PrivacyStatus = "RECEIVED" | "IN_PROGRESS" | "COMPLETED";
export type PrivacyRequest = {reference: string; kind: PrivacyKind; status: PrivacyStatus; receivedAt: string};

const STATUSES: PrivacyStatus[] = ["RECEIVED", "IN_PROGRESS", "COMPLETED"];

function parse(value: unknown): PrivacyRequest | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.reference !== "string" || typeof item.receivedAt !== "string") return null;
  if (!PRIVACY_KINDS.includes(item.kind as PrivacyKind) || !STATUSES.includes(item.status as PrivacyStatus)) return null;
  return {reference: item.reference, kind: item.kind as PrivacyKind, status: item.status as PrivacyStatus, receivedAt: item.receivedAt};
}

// Source: backend src/privacy/requests.ts. Requests are reviewed by an operator;
// nothing here exports or erases data directly.
export async function listPrivacyRequests(token: string): Promise<PrivacyRequest[]> {
  const body = await apiRequest<{requests?: unknown}>("/me/privacy-requests", {token});
  if (!Array.isArray(body.requests)) throw new Error("Invalid privacy requests response");
  return body.requests.flatMap(entry => { const parsed = parse(entry); return parsed ? [parsed] : []; });
}

export async function submitPrivacyRequest(token: string, kind: PrivacyKind): Promise<{request: PrivacyRequest; message: string}> {
  const body = await apiRequest<{request?: unknown; message?: unknown}>("/me/privacy-requests", {method: "POST", token, body: {kind}});
  const request = parse(body.request);
  if (!request) throw new Error("Invalid privacy request response");
  return {request, message: typeof body.message === "string" ? body.message : "Your request has been recorded for review."};
}
