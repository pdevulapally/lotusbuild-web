import {getApp, getApps, initializeApp} from "firebase/app";
import {getAuth, getRedirectResult} from "firebase/auth";
import {publicEnv} from "@/lib/env";

// Each variable is read by its literal name so the bundler can inline it.
// A missing value throws here; there is no fallback configuration.
function requireValue(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: requireValue("VITE_FIREBASE_API_KEY", publicEnv("FIREBASE_API_KEY")),
      authDomain: requireValue("VITE_FIREBASE_AUTH_DOMAIN", publicEnv("FIREBASE_AUTH_DOMAIN")),
      projectId: requireValue("VITE_FIREBASE_PROJECT_ID", publicEnv("FIREBASE_PROJECT_ID")),
      appId: requireValue("VITE_FIREBASE_APP_ID", publicEnv("FIREBASE_APP_ID")),
    });

export const auth = getAuth(app);

// Resolved exactly once per page load, as early as possible and outside any
// React effect — a Google sign-in redirect must be processed before this
// module's first consumer even mounts, so it can never race against an
// effect's mount/cleanup timing (React Strict Mode's double-invoke included).
// onAuthStateChanged reflects the result regardless of whether anything
// awaits this promise; callers await it only to surface a redirect error.
export const googleRedirectResult = getRedirectResult(auth);
// Only sign-in/sign-up actually read this (via completeGoogleRedirect); every
// other page still creates it on load just by importing this module, so it
// needs its own handler to avoid an unhandled-rejection warning there.
void googleRedirectResult.catch(() => {});
