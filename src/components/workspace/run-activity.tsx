import {AnimatePresence, motion} from "framer-motion";
import {Check, ChevronRight, FilePen, Monitor, Search, Terminal, X} from "lucide-react";
import {useEffect, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {EASE} from "@/lib/motion";
import type {Activity} from "@/lib/workspace/activity";

export function Markdown({text, streaming}: {text: string; streaming?: boolean}) {
  return (
    <div className={`markdown ${streaming ? "streaming" : ""} text-[15px] leading-7 text-[#E1E0CC]/90 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h3]:mt-3 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>}}>{text}</ReactMarkdown>
    </div>
  );
}

function iconFor(label: string) {
  if (/command|validation/i.test(label)) return Terminal;
  if (/file/i.test(label)) return FilePen;
  if (/search|list/i.test(label)) return Search;
  if (/desktop|preview|workspace/i.test(label)) return Monitor;
  return Check;
}

function duration(ms: number) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

type Entry = Activity["entries"][number];

function Step({entry}: {entry: Entry}) {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(entry.label);
  const output = entry.output ?? (entry.failed ? entry.detail : undefined);
  return (
    <motion.li layout initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} transition={{duration: 0.35, ease: EASE}}>
      <button type="button" disabled={!output} onClick={() => setOpen(value => !value)} aria-expanded={output ? open : undefined}
        className="group flex w-full min-w-0 items-center gap-2.5 rounded-lg py-1 text-left text-[13px] disabled:cursor-default">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {entry.running ? <Icon aria-hidden className="tool-icon-active h-3.5 w-3.5" />
            : entry.failed ? <X aria-hidden className="h-3.5 w-3.5 text-rose-300/80" />
            : <Icon aria-hidden className="h-3.5 w-3.5 text-gray-500" />}
        </span>
        <span className={`shrink-0 ${entry.running ? "text-shimmer" : entry.failed ? "text-rose-200/80" : "text-gray-400"}`}>{entry.label}</span>
        {entry.detail && !entry.failed && <span className="min-w-0 truncate font-mono text-[12px] text-gray-600" style={{fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"}}>{entry.detail}</span>}
        {!entry.running && !entry.failed && <Check aria-hidden className="check-in ml-auto h-3 w-3 shrink-0 text-primary/60" />}
        {output && <ChevronRight aria-hidden className={`h-3 w-3 shrink-0 text-gray-600 transition-transform duration-300 ${open ? "rotate-90" : ""} ${entry.running || entry.failed ? "ml-auto" : ""}`} />}
      </button>
      <AnimatePresence initial={false}>
        {open && output && (
          <motion.pre initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: "auto"}} exit={{opacity: 0, height: 0}} transition={{duration: 0.35, ease: EASE}}
            style={{fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"}}
            className="ml-6 mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-[11px] leading-5 text-primary/70">
            {output.split("\n").map((line, n) => (
              <span key={n} className={`block ${line.startsWith("+") ? "text-emerald-300/80" : line.startsWith("-") ? "text-rose-300/70" : ""}`}>{line || " "}</span>
            ))}
          </motion.pre>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// One agent run, rendered like the landing demo: a breathing orb with a
// shimmering status while working, then the steps fold into a summary.
export function RunActivity({activity, working}: {activity: Activity; working: boolean}) {
  const [expanded, setExpanded] = useState(false);
  const now = useNow(working);
  const steps = activity.entries.filter(entry => !/^Step \d+$/.test(entry.label));
  const elapsed = activity.startedAt ? (activity.finishedAt ?? now) - activity.startedAt : null;
  const status = activity.phase === "cancel" ? "Stopping" : activity.currentAction ?? (activity.text ? "Writing" : "Thinking");
  const showSteps = working || expanded;

  return (
    <div className="flex flex-col gap-2">
      {working ? (
        <div className="flex items-center gap-2.5 text-[13px]">
          <span aria-hidden className="relative flex h-2.5 w-2.5"><span className="orb-halo absolute inset-[-3px] rounded-full" /><span className="orb-core relative h-2.5 w-2.5 rounded-full" /></span>
          <span className="text-shimmer">{status}</span>
          {elapsed !== null && <span className="tabular-nums text-gray-600">{duration(elapsed)}</span>}
        </div>
      ) : steps.length > 0 && (
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}
          className="flex w-fit items-center gap-1.5 text-[13px] text-gray-500 transition-colors hover:text-[#E1E0CC]">
          <ChevronRight aria-hidden className={`h-3.5 w-3.5 transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
          {elapsed !== null ? `Worked for ${duration(elapsed)}` : "Worked"} · {steps.length} {steps.length === 1 ? "step" : "steps"}
        </button>
      )}
      <AnimatePresence initial={false}>
        {showSteps && steps.length > 0 && (
          <motion.ul initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: "auto"}} exit={{opacity: 0, height: 0}} transition={{duration: 0.4, ease: EASE}}
            className="ml-1 flex flex-col gap-0.5 overflow-hidden border-l border-white/[0.06] pl-3">
            {steps.map(entry => <Step key={entry.id} entry={entry} />)}
          </motion.ul>
        )}
      </AnimatePresence>
      {working && activity.text && <div className="mt-1"><Markdown text={activity.text} streaming /></div>}
      {activity.phase === "failed" && activity.error && (
        <p role="alert" className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-100/80">{activity.error}</p>
      )}
    </div>
  );
}
