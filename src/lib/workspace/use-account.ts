
import {useEffect, useState} from "react";
import {onAuthStateChanged, type User} from "firebase/auth";

import {getMe, type Me} from "@/lib/api/me";
import {auth} from "@/lib/firebase/client";
import {usernameSlug} from "./slug";

export type WorkspaceAccount =
  | {status: "loading"}
  | {status: "signed-out"}
  | {status: "error"; message: string}
  | {status: "ready"; user: User; me: Me; username: string};

// Single source of truth for "who is this, and what does their account look
// like" — the Firebase auth state plus the backend's /me, resolved together.
// Every page that needs the signed-in account reads this instead of each
// re-subscribing to auth state and re-fetching /me on its own.
export function useWorkspaceAccount(): WorkspaceAccount {
  const [state, setState] = useState<WorkspaceAccount>({status: "loading"});

  useEffect(() => {
    let generation = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const unsubscribe = onAuthStateChanged(auth, user => {
      const current = ++generation;
      if (timer) clearInterval(timer);
      if (!user) {
        setState({status: "signed-out"});
        return;
      }
      let inFlight = false;
      const refresh = async (background = false) => {
        if (inFlight) return;
        inFlight = true;
        try {
          const me = await getMe(await user.getIdToken());
          if (current !== generation) return;
          setState({status: "ready", user, me, username: usernameSlug(me.displayName, me.uid)});
        } catch {
          if (current !== generation) return;
          if (background) setState(previous => previous.status === 'ready' ? {...previous, me: {...previous.me, models: []}} : previous);
          else setState({status: "error", message: "Could not load your account. Refresh the page to try again."});
        } finally {inFlight = false;}
      };
      void refresh();
      timer = setInterval(() => {void refresh(true);}, 60_000);
    });
    return () => {generation++; unsubscribe(); if (timer) clearInterval(timer);};
  }, []);

  return state;
}
