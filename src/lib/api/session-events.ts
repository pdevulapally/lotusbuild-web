import {apiStream} from "./client";

export type SessionEvent = {id: string; type: string; data: Record<string, unknown>};

export class StreamClosedError extends Error {
  constructor(readonly reason: string) { super("Session stream closed"); }
}

// One SSE frame -> a typed event, or null for a heartbeat/comment frame
// (`: keep-alive`, no `event:`/`id:`). Hand-rolled because the backend's
// stream needs a bearer header, which native EventSource can't send.
export function parseEventFrame(frame: string): SessionEvent | null {
  let id = "";
  let type = "";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("id:")) id = line.slice(3).trim();
    if (line.startsWith("event:")) type = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  const payload: unknown = JSON.parse(data.join("\n"));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid event data");
  if (type === "stream.closing") {
    const reason = (payload as Record<string, unknown>).reason;
    throw new StreamClosedError(typeof reason === "string" ? reason : "stream-error");
  }
  if (!/^\d{1,20}-\d{1,20}$/.test(id) || !type) throw new Error("Invalid session event");
  return {id, type, data: payload as Record<string, unknown>};
}

// Reads a session's SSE stream until it ends or disconnects. `lastEventId`
// resumes after a reconnect (the id is a Redis stream id, safe to replay from).
export async function readSessionEvents(
  token: string,
  sessionId: string,
  signal: AbortSignal,
  onEvent: (event: SessionEvent) => void,
  onConnected: () => void,
  lastEventId?: string,
) {
  const body = await apiStream(`/sessions/${encodeURIComponent(sessionId)}/events`, token, signal, lastEventId);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    signal.throwIfAborted();
    onConnected();
    while (true) {
      const {done, value} = await reader.read();
      signal.throwIfAborted();
      if (done) throw new Error("Session stream disconnected");
      buffer += decoder.decode(value, {stream: true});
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        signal.throwIfAborted();
        if (boundary > 1_000_000) throw new Error("Session event exceeded the display limit");
        const event = parseEventFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event) onEvent(event);
      }
      if (buffer.length > 1_000_000) throw new Error("Session event exceeded the display limit");
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
