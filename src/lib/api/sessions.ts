import {apiRequest} from "./client";

// Shapes confirmed by the backend audit (sessions/routes.ts toResponse / toMessageResponse).
export type SessionStatus = "QUEUED" | "RUNNING" | "IDLE" | "FAILED";
export type AiEffort = "low" | "standard" | "high" | "xhigh";
export type SessionMode = "build" | "plan";

export type Session = {
  id: string;
  projectId: string;
  status: SessionStatus;
  model: string;
  effort: AiEffort;
  mode: SessionMode;
  sandboxId: string | null;
  error: string | null;
  messageCount: number;
  createdAt: string;
};

export type Message = {
  seq: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export async function listSessions(token: string, projectId: string): Promise<Session[]> {
  const {sessions} = await apiRequest<{sessions: Session[]}>(
    `/projects/${encodeURIComponent(projectId)}/sessions?limit=100`,
    {token},
  );
  return sessions;
}

export async function listMessages(token: string, sessionId: string): Promise<Message[]> {
  const {messages} = await apiRequest<{messages: Message[]}>(
    `/sessions/${encodeURIComponent(sessionId)}/messages?limit=100`,
    {token},
  );
  return messages;
}

export type QueuedMessage = {id: string; sessionId: string; prompt: string; createdAt: string};
export type FollowUpResponse =
  | {steered: true; sessionId: string}
  | {queued: true; queuedMessage: QueuedMessage}
  | {queued: false; session: Session};

export function parseFollowUpResponse(value: unknown): FollowUpResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid message acceptance response");
  const result = value as Record<string, unknown>;
  if (result.steered === true && typeof result.sessionId === "string") return value as FollowUpResponse;
  if (result.queued === true && result.queuedMessage && typeof result.queuedMessage === "object") {
    const message = result.queuedMessage as Record<string, unknown>;
    if ([message.id, message.sessionId, message.prompt, message.createdAt].every(item => typeof item === "string")) return value as FollowUpResponse;
  }
  if (result.queued === false && result.session && typeof result.session === "object") {
    const session = result.session as Record<string, unknown>;
    if (typeof session.id === "string" && typeof session.model === "string" &&
        ["QUEUED", "RUNNING", "IDLE", "FAILED"].includes(session.status as string)) return value as FollowUpResponse;
  }
  throw new Error("Invalid message acceptance response");
}

export async function listQueuedMessages(token: string, sessionId: string): Promise<QueuedMessage[]> {
  const {queuedMessages} = await apiRequest<{queuedMessages: QueuedMessage[]}>(
    `/sessions/${encodeURIComponent(sessionId)}/queued-messages?limit=100`, {token},
  );
  return queuedMessages;
}

export function deleteQueuedMessage(token: string, sessionId: string, messageId: string) {
  return apiRequest<void>(
    `/sessions/${encodeURIComponent(sessionId)}/queued-messages/${encodeURIComponent(messageId)}`, {method: "DELETE", token},
  );
}

export function cancelSession(token: string, sessionId: string) {
  return apiRequest<Session>(`/sessions/${encodeURIComponent(sessionId)}/cancel`, {method: "POST", token});
}

// Sends a follow-up prompt into an existing session.
// `mode` switches an idle session (e.g. an approved plan moves to build) for its next turn.
export async function sendFollowUp(token: string, sessionId: string, prompt: string, steer = false, mode?: SessionMode) {
  const response = await apiRequest<unknown>(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    token,
    body: {prompt, ...(steer ? {steer: true} : {}), ...(mode ? {mode} : {})},
  });
  return parseFollowUpResponse(response);
}

// Confirmed by sessions/routes.ts: 201 returns the full session resource.
export function createSession(token: string, projectId: string, input: {
  prompt: string;
  model: string;
  effort?: AiEffort;
  mode?: SessionMode;
}) {
  return apiRequest<Session>(`/projects/${encodeURIComponent(projectId)}/sessions`, {
    method: "POST",
    token,
    body: input,
  });
}

export type RunUsage = {meterKey: string; unit: string; label: string; settled: number; open: number};

// Source: backend src/server.ts `/sessions/:sessionId/usage` (owner-only).
export async function getSessionUsage(token: string, sessionId: string): Promise<RunUsage[]> {
  const body = await apiRequest<{meters?: unknown}>(`/sessions/${encodeURIComponent(sessionId)}/usage`, {token});
  if (!Array.isArray(body.meters)) throw new Error("Invalid usage");
  return body.meters.filter((item): item is RunUsage => !!item && typeof item === "object"
    && typeof (item as RunUsage).label === "string" && Number.isFinite((item as RunUsage).settled) && Number.isFinite((item as RunUsage).open));
}
