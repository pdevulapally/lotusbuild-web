import {useEffect, useState} from "react";
import {onAuthStateChanged, signOut, type User} from "firebase/auth";

import {ApiError} from "@/lib/api/client";
import {getMe, type Me} from "@/lib/api/me";
import {auth} from "@/lib/firebase/client";
import {usernameSlug} from "./slug";

export type WorkspaceAccount =
  | {status: "loading"}
  | {status: "signed-out"}
  | {status: "error"; message: string}
  | {status: "ready"; user: User; me: Me; username: string};

const REFRESH_MS = 60_000;

// The signed-in account, resolved from both Firebase and the backend's /me.
// Nothing is "ready" until the backend has verified the token: a Firebase
// session alone never unlocks a page. A 401 from the backend ends the session.
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
      setState(previous => previous.status === "ready" && previous.user.uid === user.uid ? previous : {status: "loading"});
      let inFlight = false;
      const refresh = async (background: boolean) => {
        if (inFlight) return;
        inFlight = true;
        try {
          const me = await getMe(await user.getIdToken(background));
          if (current !== generation) return;
          if (me.uid !== user.uid) throw new ApiError(401, "auth/mismatch", "Account mismatch.");
          setState({status: "ready", user, me, username: usernameSlug(me.displayName, me.uid)});
        } catch (failure) {
          if (current !== generation) return;
          if (failure instanceof ApiError && failure.status === 401) {
            await signOut(auth);
            return;
          }
          if (!background) setState({status: "error", message: "We couldn't verify your account. Check your connection and try again."});
        } finally {
          inFlight = false;
        }
      };
      void refresh(false);
      timer = setInterval(() => { void refresh(true); }, REFRESH_MS);
    });
    return () => { generation++; unsubscribe(); if (timer) clearInterval(timer); };
  }, []);

  return state;
}
