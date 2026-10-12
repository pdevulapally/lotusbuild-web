import {AnimatePresence, motion} from "framer-motion";
import {ArrowRight, Check, ChevronsDown, ChevronsUp, FileText} from "lucide-react";
import {useId, useState} from "react";

import {Markdown} from "@/components/workspace/run-activity";
import {EASE} from "@/lib/motion";

export type Plan = {title: string; body: string};

// The agent's plan-mode answer: a heading (or first line) titles the plan, the rest is its detail.
export function parsePlan(text: string): Plan {
  const lines = text.trim().split("\n");
  const first = lines.findIndex(line => line.trim() !== "");
  const title = (lines[first] ?? "").replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").trim();
  return {title: title || "Plan", body: lines.slice(first + 1).join("\n").trim()};
}

// Plan card adapted from the plan-tool reference: file chip header, collapsible
// detail with a fade, and one approve action that starts a real build session.
export function PlanTool({plan, pending = false, approved, approving, onApprove}: {plan: Plan; pending?: boolean; approved: boolean; approving: boolean; onApprove?: () => void}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const hasBody = plan.body.length > 0;
  const approve = onApprove && !approved && (
    <button type="button" onClick={onApprove} disabled={approving}
      className="flex h-8 items-center gap-1.5 rounded-full bg-[#E1E0CC] px-3.5 text-[12.5px] text-black transition-[background-color,transform] duration-150 hover:bg-white active:scale-[0.98] disabled:opacity-60">
      {approving ? "Starting build…" : <>Approve and build <ArrowRight aria-hidden className="h-3.5 w-3.5" /></>}
    </button>
  );

  return (
    <motion.section aria-label={`Plan: ${plan.title}`} initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: 0.45, ease: EASE}}
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1d1c1a]">
      <header className="flex h-10 items-center justify-between gap-2 pl-3.5 pr-2 sm:pl-4">
        <span className="flex min-w-0 items-center gap-2 text-[12px] text-gray-400">
          {pending ? <span aria-hidden className="relative flex h-3.5 w-3.5 items-center justify-center"><span className="orb-halo absolute inset-0 rounded-full" /><span className="orb-core h-2 w-2 rounded-full" /></span> : <FileText aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          <span className={`truncate ${pending ? "text-shimmer" : ""}`}>{pending ? "Writing plan" : "plan.md"}</span>
          {approved && <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-300"><Check aria-hidden className="h-3 w-3" />Approved</span>}
        </span>
        {hasBody && (
          <button type="button" onClick={() => setExpanded(open => !open)} aria-expanded={expanded} aria-controls={bodyId} aria-label={expanded ? "Collapse plan" : "Expand plan"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC]">
            {expanded ? <ChevronsUp aria-hidden className="h-4 w-4" /> : <ChevronsDown aria-hidden className="h-4 w-4" />}
          </button>
        )}
      </header>
      <div className="border-t border-white/[0.06] bg-[#181716] px-4 pb-3.5 pt-3.5 sm:px-5 sm:pb-4 sm:pt-4">
        <h3 className="text-[16px] leading-6 tracking-[-0.01em] text-[#E1E0CC] sm:text-[17px] sm:leading-7">{plan.title}</h3>
        {hasBody ? (
          <div id={bodyId} className="relative mt-1">
            <motion.div initial={false} animate={{height: expanded ? "auto" : 120}} transition={{duration: 0.4, ease: EASE}} className="overflow-hidden">
              <Markdown text={plan.body} />
            </motion.div>
            <AnimatePresence>
              {!expanded && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#181716]" />}
            </AnimatePresence>
          </div>
        ) : <p className="mt-1 text-[13px] text-gray-500">No plan detail provided.</p>}
      </div>
      {(hasBody || approve) && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2.5">
          {hasBody ? <button type="button" onClick={() => setExpanded(open => !open)} aria-controls={bodyId}
            className="h-8 rounded-full px-2.5 text-[12.5px] text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-[#E1E0CC]">{expanded ? "Hide detailed plan" : "Read detailed plan"}</button> : <span />}
          {approve}
        </footer>
      )}
    </motion.section>
  );
}
