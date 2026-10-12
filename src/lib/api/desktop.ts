import {apiRequest, baseUrl} from "./client";

export type DesktopTicket = {ticket: string; path: string; expiresInSeconds: number};

export function requestDesktopTicket(token: string, sessionId: string) {
  return apiRequest<DesktopTicket>(`/sessions/${encodeURIComponent(sessionId)}/desktop-ticket`, {method: "POST", token});
}

export function desktopSocketUrl(apiOrigin: string, sessionId: string, ticket: DesktopTicket): string {
  const base = new URL(apiOrigin);
  if (base.username || base.password || base.search || base.hash ||
      !(base.protocol === "https:" || base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) {
    throw new Error("Desktop requires a secure API origin");
  }
  if (ticket.path !== `/sessions/${encodeURIComponent(sessionId)}/desktop` ||
      typeof ticket.ticket !== "string" || !ticket.ticket || ticket.ticket.length > 2048 ||
      !Number.isFinite(ticket.expiresInSeconds) || ticket.expiresInSeconds <= 0) throw new Error("Invalid desktop ticket response");
  const socket = new URL(`${apiOrigin.replace(/\/$/, "")}${ticket.path}`);
  socket.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  socket.searchParams.set("ticket", ticket.ticket);
  return socket.href;
}

export function configuredDesktopSocketUrl(sessionId: string, ticket: DesktopTicket) {
  return desktopSocketUrl(baseUrl(), sessionId, ticket);
}
