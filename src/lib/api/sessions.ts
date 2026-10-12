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

export function cancelSession(token: string, sessionId: string) {
  return apiRequest<Session>(`/sessions/${encodeURIComponent(sessionId)}/cancel`, {method: "POST", token});
}

// Sends a follow-up prompt into an existing session.
export async function sendFollowUp(token: string, sessionId: string, prompt: string, steer = false) {
  const response = await apiRequest<unknown>(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    token,
    body: {prompt, ...(steer ? {steer: true} : {})},
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
