import {AnimatePresence, motion} from "framer-motion";
import {Monitor, RotateCw} from "lucide-react";
import {useEffect, useRef, useState} from "react";

import type {ReadyAccount} from "@/components/require-account";
import {ApiError} from "@/lib/api/client";
import {configuredDesktopSocketUrl, requestDesktopTicket} from "@/lib/api/desktop";
import {EASE} from "@/lib/motion";

type View = "offline" | "waiting" | "connecting" | "live" | "unavailable";

// Live view of the sandbox desktop. A ticket is only requested after the
// session reports `desktop.ready`; before that, the backend has nothing to serve.
export function DesktopPanel({account, sessionId, running, ready}: {account: ReadyAccount; sessionId: string | null; running: boolean; ready: boolean}) {
  const target = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("offline");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionId || !running) { setView("offline"); return; }
    if (!ready) { setView("waiting"); return; }
    let cancelled = false;
    let rfb: {disconnect(): void} | null = null;
    setView("connecting");
    void (async () => {
      try {
        const ticket = await requestDesktopTicket(await account.user.getIdToken(), sessionId);
        const url = configuredDesktopSocketUrl(sessionId, ticket);
        const {default: RFB} = await import("@novnc/novnc");
        if (cancelled || !target.current) return;
        const client = new RFB(target.current, url);
        client.scaleViewport = true;
        client.resizeSession = false;
        client.background = "transparent";
        client.addEventListener("connect", () => !cancelled && setView("live"));
        client.addEventListener("disconnect", () => !cancelled && setView("unavailable"));
        client.addEventListener("securityfailure", () => !cancelled && setView("unavailable"));
        rfb = client;
      } catch (failure) {
        if (cancelled) return;
        setView(failure instanceof ApiError && failure.status === 409 ? "offline" : "unavailable");
      }
    })();
    return () => { cancelled = true; rfb?.disconnect(); };
  }, [account.user, sessionId, running, ready, attempt]);

  const overlay: Record<Exclude<View, "live">, {title: string; body: string}> = {
    offline: {title: "No desktop running", body: "The desktop starts while the agent is working on this project."},
    waiting: {title: "Starting the desktop", body: "It appears here as soon as the sandbox is ready."},
    connecting: {title: "Connecting", body: "Opening a secure stream to the sandbox."},
    unavailable: {title: "Desktop unavailable", body: "The stream couldn't be opened or was closed."},
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div ref={target} className={`min-h-0 flex-1 transition-opacity duration-500 [&_canvas]:!outline-none ${view === "live" ? "opacity-100" : "opacity-0"}`} />
      <AnimatePresence>
        {view !== "live" && (
          <motion.div key={view} initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} transition={{duration: 0.4, ease: EASE}}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              {view === "waiting" || view === "connecting"
                ? <span aria-hidden className="relative flex h-3 w-3"><span className="orb-halo absolute inset-[-4px] rounded-full" /><span className="orb-core relative h-3 w-3 rounded-full" /></span>
                : <Monitor aria-hidden className="h-5 w-5 text-gray-500" />}
            </span>
            <p className={`text-sm ${view === "waiting" || view === "connecting" ? "text-shimmer" : "text-[#E1E0CC]"}`}>{overlay[view].title}</p>
            <p className="max-w-xs text-[13px] leading-5 text-gray-500">{overlay[view].body}</p>
            {view === "unavailable" && (
              <button type="button" onClick={() => setAttempt(n => n + 1)} className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs transition-colors hover:bg-white/5">
                <RotateCw aria-hidden className="h-3.5 w-3.5" /> Try again
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
