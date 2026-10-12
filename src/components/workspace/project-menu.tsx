import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown, Download, Plus} from "lucide-react";
import {useEffect, useRef, useState, type FormEvent} from "react";

import type {ReadyAccount} from "@/components/require-account";
import {renameProject, type Project} from "@/lib/api/projects";
import type {Session} from "@/lib/api/sessions";
import {EASE} from "@/lib/motion";
import {checkProjectName} from "@/lib/security/validation";

type Props = {
  account: ReadyAccount;
  project: Project | null;
  runs: Session[];
  currentRunId: string | null;
  working: boolean;
  onPickRun: (id: string) => void;
  onRenamed: (project: Project) => void;
  onDownload: (() => void) | null;
  downloading: boolean;
};


function Dot({run}: {run: Session}) {
  const tone = run.status === "FAILED" ? "bg-rose-400/80" : run.status === "RUNNING" || run.status === "QUEUED" ? "bg-[#E1E0CC] animate-pulse" : "bg-gray-500";
  return <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />;
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, {hour: "numeric", minute: "2-digit"});
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, {day: "numeric", month: "short"});
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

// Title of the open project: holds rename, the run list and download in one menu.
export function ProjectMenu({account, project, runs, currentRunId, working, onPickRun, onRenamed, onDownload, downloading}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (!isOpen) { setEditing(false); setError(null); } }, [isOpen]);
  useEffect(() => { if (editing) input.current?.select(); }, [editing]);

  const name = project?.name ?? "";
  const index = runs.findIndex(run => run.id === currentRunId);
  const runLabel = index >= 0 ? `/ Run ${runs.length - index}` : runs.length > 0 ? "/ New run" : null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!project) return;
    const checked = checkProjectName(draft);
    if (!checked.ok) { setError(checked.error); return; }
    if (checked.value === project.name) { setEditing(false); return; }
    setSaving(true); setError(null);
    try { onRenamed(await renameProject(await account.user.getIdToken(), project.id, checked.value)); setEditing(false); }
    catch { setError("The name wasn't saved. Try again."); }
    finally { setSaving(false); }
  }

  const row = "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-[#E1E0CC] transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="relative min-w-0" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setIsOpen(false); } }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}>
      <button type="button" aria-haspopup="dialog" aria-expanded={isOpen} disabled={!project} onClick={() => setIsOpen(open => !open)}
        className="flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-white/[0.05] aria-expanded:bg-white/[0.06]">
        <h1 className="min-w-0 max-w-[10rem] truncate text-[14px] text-[#E1E0CC] sm:max-w-[18rem]">{name || <span className="inline-block h-3 w-24 animate-pulse rounded bg-white/[0.08] align-middle" />}</h1>
        {runLabel && <span className="hidden shrink-0 text-[13px] text-gray-500 sm:inline">{runLabel}</span>}
        <ChevronDown aria-hidden strokeWidth={2} className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && project && (
          <motion.div role="dialog" aria-label="Project" initial={{opacity: 0, y: -4, scale: 0.98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: -4, scale: 0.98}} transition={{duration: 0.18, ease: EASE}}
            className="absolute left-0 top-full z-40 mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] origin-top-left rounded-xl border border-white/[0.09] bg-[#1d1c1a] p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)]">
            <div className="px-2.5 pb-2 pt-2">
              {editing ? (
                <form onSubmit={event => void save(event)}>
                  <label htmlFor="project-rename" className="sr-only">Project name</label>
                  <input id="project-rename" ref={input} value={draft} maxLength={120} onChange={event => { setDraft(event.target.value); setError(null); }}
                    onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setEditing(false); setError(null); } }}
                    aria-invalid={!!error} aria-describedby={error ? "project-rename-error" : undefined}
                    className="h-8 w-full rounded-md border border-white/15 bg-black/25 px-2 text-[14px] text-[#E1E0CC] outline-none focus:border-white/30" />
                  <div className="mt-1.5 flex items-center justify-between text-[12px]">
                    {error ? <span id="project-rename-error" role="alert" className="text-rose-200/80">{error}</span> : <span className="text-gray-500">Enter to save · Esc to cancel</span>}
                    <span className="flex gap-1">
                      <button type="button" onClick={() => { setEditing(false); setError(null); }} className="rounded-md px-2 py-1 text-gray-400 hover:bg-white/[0.06] hover:text-[#E1E0CC]">Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-md bg-[#E1E0CC] px-2 py-1 text-[#131211] disabled:opacity-50">Save</button>
                    </span>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-[#E1E0CC]">{name}</p>
                    <p className="text-[12px] text-gray-500">Created {day(project.createdAt)}</p>
                  </div>
                  <button type="button" onClick={() => { setDraft(name); setEditing(true); }} className="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC]">Rename</button>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.07] pt-1">
              <div className="chat-scroll max-h-56 overflow-y-auto">
                {runs.map((run, position) => {
                  const current = run.id === currentRunId;
                  return (
                    <button key={run.id} type="button" disabled={working && !current} onClick={() => { onPickRun(run.id); setIsOpen(false); }} aria-current={current}
                      className={`${row} ${current ? "bg-white/[0.05]" : ""}`}>
                      <Dot run={run} />
                      <span className="min-w-0 flex-1 truncate">Run {runs.length - position}{run.mode === "plan" && <span className="text-gray-500"> · Plan</span>}{run.status === "FAILED" && <span className="text-rose-300/70"> · Failed</span>}</span>
                      <span className="shrink-0 text-[12px] text-gray-500">{sameDay(run.createdAt, new Date().toISOString()) ? clock(run.createdAt) : day(run.createdAt)}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={working || currentRunId === null} title={working ? "Wait for the agent to finish" : undefined} onClick={() => { onPickRun("new"); setIsOpen(false); }} className={row}>
                <Plus aria-hidden strokeWidth={2} className="h-3.5 w-3.5 text-gray-400" /> New run
              </button>
            </div>

            {onDownload && (
              <div className="mt-1 border-t border-white/[0.07] pt-1">
                <button type="button" disabled={downloading} onClick={onDownload} className={row}>
                  <Download aria-hidden strokeWidth={1.75} className={`h-3.5 w-3.5 text-gray-400 ${downloading ? "animate-pulse" : ""}`} /> {downloading ? "Preparing zip…" : "Download as zip"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
