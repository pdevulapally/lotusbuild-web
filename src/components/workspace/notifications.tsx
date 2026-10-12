import {AnimatePresence, motion} from "framer-motion";
import {Bell, CircleAlert, CircleCheck, ClipboardList, Inbox} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link} from "react-router-dom";

import type {ReadyAccount} from "@/components/require-account";
import {listProjects} from "@/lib/api/projects";
import {listRecentSessions, type RecentSession} from "@/lib/api/sessions";
import {EASE} from "@/lib/motion";

const POLL_MS = 30_000;
const isWorking = (run: RecentSession) => run.status === "RUNNING" || run.status === "QUEUED";
const at = (run: RecentSession) => run.heartbeatAt ?? run.createdAt;
const relative = new Intl.RelativeTimeFormat(undefined, {numeric: "auto", style: "short"});
function ago(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86_400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  return "just now";
}
function describe(run: RecentSession) {
  if (isWorking(run)) return {title: run.status === "QUEUED" ? "Starting up" : "Working", Icon: null};
  if (run.status === "FAILED") return {title: "Build failed", Icon: CircleAlert, tone: "text-rose-300/80"};
  if (run.mode === "plan") return {title: "Plan ready to review", Icon: ClipboardList, tone: "text-[#E1E0CC]"};
  return {title: "Build finished", Icon: CircleCheck, tone: "text-[#E1E0CC]"};
}

// Inbox of the account's runs across projects, read from the backend. Browser alerts are opt-in.
export function NotificationsMenu({account}: {account: ReadyAccount}) {
  const seenKey = `lb.inbox.seen.${account.user.uid}`;
  const alertsKey = `lb.inbox.alerts.${account.user.uid}`;
  const canAlert = typeof window !== "undefined" && "Notification" in window;
  const [isOpen, setIsOpen] = useState(false);
  const [runs, setRuns] = useState<RecentSession[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(seenKey) ?? "");
  const [shownSeenAt, setShownSeenAt] = useState(seenAt);
  const [alerts, setAlerts] = useState(() => canAlert && Notification.permission === "granted" && localStorage.getItem(alertsKey) === "on");
  const [alertNote, setAlertNote] = useState<string | null>(null);
  const previous = useRef<Map<string, RecentSession["status"]> | null>(null);
  const namesRef = useRef(names);
  namesRef.current = names;
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const poll = useCallback(async () => {
    try {
      const token = await account.user.getIdToken();
      const recent = (await listRecentSessions(token)).filter(run => run.messageCount > 0);
      let known = namesRef.current;
      if (recent.some(run => !(run.projectId in known))) {
        known = Object.fromEntries((await listProjects(token)).map(project => [project.id, project.name]));
        setNames(known);
      }
      const visible = recent.filter(run => run.projectId in known);
      const before = previous.current;
      if (before && alertsRef.current && document.visibilityState === "hidden") {
        for (const run of visible) {
          const was = before.get(run.id);
          if ((was === "RUNNING" || was === "QUEUED") && !isWorking(run)) {
            const note = new Notification(describe(run).title, {body: known[run.projectId], tag: run.id, icon: "/images/lotusbuild-logo.png"});
            note.onclick = () => { window.focus(); window.location.assign(`/${account.username}/projects/${run.projectId}`); note.close(); };
          }
        }
      }
      previous.current = new Map(visible.map(run => [run.id, run.status]));
      setRuns(visible);
      setFailed(false);
    } catch { setFailed(true); }
  }, [account]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" || alertsRef.current) void poll(); }, POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [poll]);

  const unread = useMemo(() => (runs ?? []).filter(run => !isWorking(run) && at(run) > seenAt).length, [runs, seenAt]);

  function open() {
    if (isOpen) { setIsOpen(false); return; }
    setShownSeenAt(seenAt);
    const now = new Date().toISOString();
    localStorage.setItem(seenKey, now);
    setSeenAt(now);
    setIsOpen(true);
    void poll();
  }

  async function toggleAlerts() {
    setAlertNote(null);
    if (alerts) { localStorage.setItem(alertsKey, "off"); setAlerts(false); return; }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted") { setAlertNote("Notifications are blocked for this site in your browser settings."); return; }
    localStorage.setItem(alertsKey, "on");
    setAlerts(true);
  }

  return (
    <div className="relative" onKeyDown={event => { if (event.key === "Escape") setIsOpen(false); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}>
      <button type="button" onClick={open} aria-haspopup="dialog" aria-expanded={isOpen} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC] aria-expanded:bg-white/[0.06] aria-expanded:text-[#E1E0CC]">
        <Bell aria-hidden strokeWidth={1.75} className="h-4 w-4" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span initial={{scale: 0}} animate={{scale: 1}} exit={{scale: 0}} transition={{duration: 0.2, ease: EASE}}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E1E0CC] px-1 text-[10px] font-bold leading-none text-[#131211] ring-2 ring-[#131211]">
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div role="dialog" aria-label="Notifications" initial={{opacity: 0, y: -6, scale: 0.98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: -6, scale: 0.98}} transition={{duration: 0.2, ease: EASE}}
            className="absolute right-0 top-full z-40 mt-2 flex max-h-[min(32rem,calc(100vh-5rem))] w-[22rem] max-w-[calc(100vw-1.5rem)] origin-top-right flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#23211f]/95 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
              <p className="text-[14px] text-[#E1E0CC]">Notifications</p>
              {runs && runs.length > 0 && <p className="text-[12px] text-gray-500">{runs.filter(isWorking).length ? `${runs.filter(isWorking).length} running` : "All caught up"}</p>}
            </div>
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {runs === null && !failed && [0, 1, 2].map(key => <div key={key} className="mx-2 my-2 h-11 animate-pulse rounded-xl bg-white/[0.04]" />)}
              {failed && runs === null && <p role="alert" className="px-3 py-6 text-center text-[13px] text-gray-400">Notifications couldn't be loaded.</p>}
              {runs && runs.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-6 py-9 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]"><Inbox aria-hidden strokeWidth={1.5} className="h-[18px] w-[18px] text-gray-400" /></span>
                  <p className="text-[13px] text-[#E1E0CC]">No notifications yet</p>
                  <p className="text-[12px] text-gray-500">Finished, failed and plan-ready builds show up here.</p>
                </div>
              )}
              {runs?.map((run, position) => {
                const {title, Icon, tone} = describe(run);
                const fresh = !isWorking(run) && at(run) > shownSeenAt;
                return (
                  <motion.div key={run.id} initial={{opacity: 0, y: 4}} animate={{opacity: 1, y: 0}} transition={{duration: 0.25, ease: EASE, delay: Math.min(position, 8) * 0.02}}>
                    <Link to={`/${account.username}/projects/${run.projectId}`} onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.05]">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                        {Icon ? <Icon aria-hidden strokeWidth={1.75} className={`h-[15px] w-[15px] ${tone}`} /> : <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-[#E1E0CC]/80" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] ${Icon ? "text-[#E1E0CC]" : "text-shimmer"}`}>{title}</span>
                        <span className="block truncate text-[12px] text-gray-500">{names[run.projectId]} · {ago(at(run))}</span>
                      </span>
                      {fresh && <span aria-label="Unread" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E1E0CC]" />}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {canAlert && (
              <div className="border-t border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-[#E1E0CC]">Desktop alerts</span>
                    <span className="block text-[12px] text-gray-500">When a build ends while LotusBuild is in the background.</span>
                  </span>
                  <button type="button" role="switch" aria-checked={alerts} aria-label="Desktop alerts" onClick={() => void toggleAlerts()}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${alerts ? "bg-[#E1E0CC]" : "bg-white/[0.12]"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-all duration-200 ${alerts ? "left-[18px] bg-[#131211]" : "left-0.5 bg-[#E1E0CC]"}`} />
                  </button>
                </div>
                {alertNote && <p role="alert" className="mt-2 text-[12px] text-rose-200/80">{alertNote}</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
