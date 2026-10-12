import {useEffect, useState} from "react";

export type AuthState = "unknown" | "signed-in" | "signed-out";

// Firebase is loaded lazily so the landing page never blocks on it.
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("unknown");
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("firebase/auth"), import("@/lib/firebase/client")])
      .then(([{onAuthStateChanged}, {auth}]) => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, user => setState(user ? "signed-in" : "signed-out"));
      })
      .catch(() => setState("signed-out"));
    return () => {cancelled = true; unsubscribe?.();};
  }, []);
  return state;
}
