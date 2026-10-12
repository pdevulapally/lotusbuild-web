// Client-side checks mirror the backend's request schemas so a bad input is
// caught before it is sent. The backend still validates everything itself.

export const LIMITS = {
  email: 254,
  passwordMin: 8,
  passwordMax: 128,
  displayName: 60,
  projectName: 100,
  projectDescription: 500,
  prompt: 8000,
} as const;

export type Checked<T> = {ok: true; value: T} | {ok: false; error: string};

const LINE_CONTROL = /[\u0000-\u001F\u007F]/;
const PROMPT_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const PLAN_KEY = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const ok = <T,>(value: T): Checked<T> => ({ok: true, value});
const fail = (error: string): Checked<never> => ({ok: false, error});

export function checkEmail(raw: string): Checked<string> {
  const value = raw.trim();
  if (!value) return fail("Enter your email address.");
  if (value.length > LIMITS.email || !EMAIL.test(value)) return fail("Enter a valid email address.");
  return ok(value);
}

export function checkSignInPassword(raw: string): Checked<string> {
  if (!raw) return fail("Enter your password.");
  if (raw.length > LIMITS.passwordMax) return fail(`Passwords are at most ${LIMITS.passwordMax} characters.`);
  return ok(raw);
}

export function checkNewPassword(raw: string, email: string): Checked<string> {
  if (raw.length < LIMITS.passwordMin) return fail(`Use at least ${LIMITS.passwordMin} characters.`);
  if (raw.length > LIMITS.passwordMax) return fail(`Use at most ${LIMITS.passwordMax} characters.`);
  if (!/[A-Za-z]/.test(raw) || !/\d/.test(raw)) return fail("Include at least one letter and one number.");
  if (email && raw.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) {
    return fail("Don't include your email name in your password.");
  }
  return ok(raw);
}

function singleLine(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function checkDisplayName(raw: string): Checked<string> {
  const value = singleLine(raw);
  if (!value) return fail("Enter your name.");
  if (value.length > LIMITS.displayName) return fail(`Names are at most ${LIMITS.displayName} characters.`);
  if (LINE_CONTROL.test(value) || /[<>]/.test(value)) return fail("Names can't contain < or > or control characters.");
  return ok(value);
}

export function checkProjectName(raw: string): Checked<string> {
  const value = singleLine(raw);
  if (!value) return fail("Give the project a name.");
  if (value.length > LIMITS.projectName) return fail(`Project names are at most ${LIMITS.projectName} characters.`);
  if (LINE_CONTROL.test(value)) return fail("Project names can't contain control characters.");
  return ok(value);
}

export function checkPrompt(raw: string): Checked<string> {
  const value = raw.normalize("NFC").replace(/\r\n?/g, "\n").replace(PROMPT_CONTROL, "").trim();
  if (!value) return fail("Describe what you want to build.");
  if (value.length > LIMITS.prompt) return fail(`Keep it under ${LIMITS.prompt.toLocaleString("en-GB")} characters.`);
  return ok(value);
}

export function isDocumentId(value: string): boolean {
  return DOCUMENT_ID.test(value);
}

export function isPlanKey(value: string): boolean {
  return PLAN_KEY.test(value);
}

const NEXT_PREFIXES = ["/projects", "/pricing"];
const WORKSPACE_PATH = /^\/[a-z0-9-]{1,64}\/projects(?:\/[A-Za-z0-9_-]{1,128})?$/;

// Only same-origin app paths are accepted as a post-sign-in destination, so a
// crafted ?next= can never send someone to another site.
export function safeNextPath(raw: string | null | undefined): string {
  const fallback = "/projects";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    if (!NEXT_PREFIXES.some(prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) && !WORKSPACE_PATH.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

// A redirect target returned by the API is followed only if it is HTTPS on an
// expected host.
export function trustedRedirect(raw: unknown, hosts: readonly string[]): string {
  if (typeof raw !== "string") throw new Error("The server returned no redirect address.");
  const url = new URL(raw);
  if (url.protocol !== "https:" || !hosts.includes(url.hostname)) throw new Error("The server returned an unexpected redirect address.");
  return url.toString();
}
