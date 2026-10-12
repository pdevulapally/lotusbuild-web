import {publicEnv} from "@/lib/env";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_GET_ATTEMPTS = 3;
const RETRY_BASE_MS = 300;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Firebase ID token. Sent as a bearer token, never as a cookie. */
  token?: string;
};

export function baseUrl(): string {
  const value = publicEnv("API_BASE_URL");
  if (!value) throw new Error("VITE_API_BASE_URL is not set");
  return value.replace(/\/$/, "");
}

// Streaming reads share the API origin and bearer authentication with JSON requests.
export async function apiStream(path: string, token: string, signal: AbortSignal, lastEventId?: string) {
  const headers = new Headers({Accept: "text/event-stream", Authorization: `Bearer ${token}`});
  if (lastEventId) headers.set("Last-Event-ID", lastEventId);
  const response = await fetch(`${baseUrl()}${path}`, {headers, signal, cache: "no-store"});
  if (!response.ok) throw new ApiError(response.status, undefined, "Could not connect to session activity.");
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Invalid session event stream");
  }
  return response.body;
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// One request. Throws ApiError for an HTTP error response, and a TypeError for a
// network failure or a timeout.
async function send<T>(path: string, init: ApiRequestInit): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);

  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: {code?: unknown; message?: unknown};
      code?: unknown;
      message?: unknown;
    };
    const nested = payload.error && typeof payload.error === "object" ? payload.error : undefined;
    const code = typeof nested?.code === "string" ? nested.code : typeof payload.code === "string" ? payload.code : undefined;
    const message = typeof nested?.message === "string" ? nested.message : typeof payload.message === "string" ? payload.message : undefined;
    throw new ApiError(response.status, code, message ?? `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Only reads are retried, and only on server errors or network failures. A write
// is never retried, since the server may already have applied it.
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const isRead = (init.method ?? "GET").toUpperCase() === "GET";
  const attempts = isRead ? MAX_GET_ATTEMPTS : 1;

  for (let attempt = 1; ; attempt++) {
    try {
      return await send<T>(path, init);
    } catch (error) {
      const retryable = error instanceof ApiError ? error.status >= 500 : true;
      if (!isRead || !retryable || attempt >= attempts) throw error;
      await wait(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
}
