import {AnimatePresence, motion} from "framer-motion";
import {ChevronRight, GitCommitHorizontal, RotateCcw} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {getChanges, listChanges, type ProjectChanges, type ProjectCommit} from "@/lib/api/projects";
import {EASE} from "@/lib/motion";
import {errorText} from "./shell";

const mono = {fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"};
const when = (iso: string) => new Date(iso).toLocaleString(undefined, {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});

// Splits a unified diff into per-file hunks keyed by the new path.
function splitPatch(patch: string): Map<string, string[]> {
  const files = new Map<string, string[]>();
  for (const chunk of patch.split(/^(?=diff --git )/m)) {
    const lines = chunk.split("\n");
    const target = lines.find(line => line.startsWith("+++ "))?.slice(4) ?? lines.find(line => line.startsWith("rename to "))?.slice(10);
    const path = target === "/dev/null" ? lines.find(line => line.startsWith("--- "))?.slice(4) : target;
    if (!path) continue;
    const start = lines.findIndex(line => line.startsWith("@@"));
    files.set(path.replace(/^[ab]\//, ""), start < 0 ? [] : lines.slice(start).filter(line => line !== "\\ No newline at end of file"));
  }
  return files;
}

function Diff({lines}: {lines: string[]}) {
  if (lines.length === 0) return <p className="px-4 py-3 text-[12px] text-gray-500">No text changes to show (binary or renamed file).</p>;
  return (
    <pre className="chat-scroll overflow-x-auto py-1 text-[12px] leading-5" style={mono}>
      {lines.map((line, index) => (
        <div key={index} className={line.startsWith("+") ? "bg-emerald-400/[0.08] text-emerald-200" : line.startsWith("-") ? "bg-red-400/[0.08] text-red-200" : line.startsWith("@@") ? "text-sky-300/70" : "text-gray-400"}>
          <span className="px-4">{line || " "}</span>
        </div>
      ))}
    </pre>
  );
}

export function ChangesPanel({projectId, token, refreshKey, canUndo, onUndo}: {
  projectId: string; token: () => Promise<string>; refreshKey: number; canUndo: boolean; onUndo: (commit: ProjectCommit) => void;
}) {
  const [commits, setCommits] = useState<ProjectCommit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [changes, setChanges] = useState<ProjectChanges | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listChanges(await token(), projectId);
        if (cancelled) return;
        setCommits(list); setError(null);
        setSelected(current => current && list.some(item => item.sha === current) ? current : list[0]?.sha ?? null);
      } catch (failure) { if (!cancelled) setError(errorText(failure, "Saved changes couldn't be loaded.")); }
    })();
    return () => { cancelled = true; };
  }, [projectId, token, refreshKey]);

  useEffect(() => {
    if (!selected) { setChanges(null); return; }
    let cancelled = false;
    setChanges(null);
    void (async () => {
      try {
        const loaded = await getChanges(await token(), projectId, selected);
        if (!cancelled) { setChanges(loaded); setOpen(new Set(loaded.files.slice(0, 3).map(file => file.path))); }
      } catch (failure) { if (!cancelled) setError(errorText(failure, "These changes couldn't be loaded.")); }
    })();
    return () => { cancelled = true; };
  }, [projectId, token, selected]);

  const hunks = useMemo(() => changes ? splitPatch(changes.patch) : new Map<string, string[]>(), [changes]);
  const commit = commits?.find(item => item.sha === selected);
  const totals = changes?.files.reduce((sum, file) => ({add: sum.add + (file.additions ?? 0), del: sum.del + (file.deletions ?? 0)}), {add: 0, del: 0});

  if (error) return <p role="alert" className="p-5 text-[13px] text-red-300">{error}</p>;
  if (!commits) return <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map(n => <span key={n} className="h-9 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>;
  if (commits.length === 0) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <GitCommitHorizontal aria-hidden className="h-5 w-5 text-gray-500" />
      <p className="text-[14px]">No saved changes yet</p>
      <p className="max-w-xs text-[13px] text-gray-500">Each run's changes show up here once the agent saves them.</p>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <label htmlFor="change-select" className="sr-only">Saved version</label>
        <select id="change-select" value={selected ?? ""} onChange={event => setSelected(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-full border border-white/[0.08] bg-[#131211] px-3 text-[12.5px] text-[#E1E0CC] outline-none focus:border-white/20">
          {commits.map((item, index) => <option key={item.sha} value={item.sha}>{index === 0 ? "Latest · " : ""}{when(item.committedAt)} · {item.sha.slice(0, 7)}</option>)}
        </select>
        {commit && (
          <button type="button" onClick={() => onUndo(commit)} disabled={!canUndo} title={canUndo ? "Ask the agent to revert this version" : "Wait for the agent to finish"}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] px-3 text-[12.5px] text-gray-300 transition-colors hover:bg-white/[0.05] hover:text-[#E1E0CC] disabled:opacity-40">
            <RotateCcw aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />Undo
          </button>
        )}
      </div>
      {totals && changes && (
        <p className="px-4 pb-1 pt-3 text-[12px] text-gray-500">
          {changes.files.length} {changes.files.length === 1 ? "file" : "files"} · <span className="text-emerald-300/80">+{totals.add}</span> <span className="text-red-300/80">−{totals.del}</span>
          {changes.truncated && " · large change, diff shortened"}
        </p>
      )}
      <ul className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {!changes ? [0, 1].map(n => <li key={n} className="mx-2 mt-2 h-9 animate-pulse rounded-xl bg-white/[0.04]" />) : changes.files.map(file => {
          const isOpen = open.has(file.path);
          return (
            <li key={file.path} className="mt-1.5 overflow-hidden rounded-xl border border-white/[0.06] bg-[#131211]/60">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(set => { const next = new Set(set); if (isOpen) next.delete(file.path); else next.add(file.path); return next; })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-white/[0.03]">
                <ChevronRight aria-hidden className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <span className="min-w-0 flex-1 truncate" style={mono} title={file.path}>{file.previousPath ? `${file.previousPath} → ` : ""}{file.path}</span>
                {file.additions === null ? <span className="text-gray-500">binary</span> : (
                  <span className="shrink-0 tabular-nums"><span className="text-emerald-300/80">+{file.additions}</span> <span className="text-red-300/80">−{file.deletions}</span></span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{height: 0, opacity: 0}} animate={{height: "auto", opacity: 1}} exit={{height: 0, opacity: 0}} transition={{duration: 0.25, ease: EASE}} className="overflow-hidden border-t border-white/[0.05]">
                    <Diff lines={hunks.get(file.path) ?? []} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
