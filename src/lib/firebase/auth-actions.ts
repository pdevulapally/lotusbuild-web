import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "firebase/auth";

import {auth, googleRedirectResult} from "@/lib/firebase/client";

// Firebase codes mapped to messages. Anything unmapped gets one generic message,
// so no internal detail reaches the page.
const messages: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Choose a stronger password.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};
const GENERIC_ERROR = "Something went wrong. Try again.";

// Returns the message to show, or null when the user simply closed the Google popup.
export function authErrorMessage(error: unknown): string | null {
  const code = (error as {code?: string}).code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  return (code && messages[code]) ?? GENERIC_ERROR;
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

// Creates the account, sets its display name (the backend's /me copies it from
// the token onto the user doc, and it's what a workspace URL's username is
// derived from), and sends the verification link. The backend requires a
// verified email before a build can start.
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, {displayName});
  await sendEmailVerification(credential.user);
}

// Codes that mean "a popup genuinely can't be used here" — fall back to a
// full-page redirect for these. Anything else (e.g. the user closing the
// popup) is a real result, not a reason to retry a different way.
const POPUP_UNAVAILABLE_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
]);

// Popup is tried first: it completes via postMessage back to this tab, so it
// still works under the storage partitioning that breaks a redirect's
// iframe-based handoff (third-party cookies blocked, Incognito, etc.) — the
// exact case where a redirect can silently land the user back on this page
// still signed out. Only falls back to a redirect when the popup itself is
// unusable (blocked, or unsupported in this environment).
export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    const code = (error as {code?: string}).code;
    if (code && POPUP_UNAVAILABLE_CODES.has(code)) {
      await signInWithRedirect(auth, new GoogleAuthProvider());
      return;
    }
    throw error;
  }
}

// Call once on mount of any page that offers Google sign-in, to surface an
// error from the redirect this page may have just been sent back from. Reads
// the one shared getRedirectResult() call (lib/firebase/client.ts) rather
// than issuing a second one. Success doesn't need handling here —
// onAuthStateChanged already fires regardless of who awaits this.
export async function completeGoogleRedirect(): Promise<string | null> {
  try {
    await googleRedirectResult;
    return null;
  } catch (error) {
    return authErrorMessage(error);
  }
}
