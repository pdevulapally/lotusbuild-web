import {ArrowUp, Check, FilePen, Monitor, Terminal} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";

const TOOL_OUTPUT: Record<string, string> = {
  "Writing file": 'export default function Page() {\n  return <Hero title="Fresh coffee, roasted weekly" />;\n}',
  "Running command": "▲ Compiling app/page.tsx\n✓ Compiled in 2.1s\n✓ Ready on localhost:3000",
  "Editing file": '- <Hero tone="light" />\n+ <Hero tone="dark" cta="Order now" />',
  "Running validation": "✓ Types checked\n✓ Build succeeded",
};

function useTyped(text: string, active: boolean, speed = 16) {
  const [length, setLength] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) { setLength(text.length); return; }
    setLength(0);
    const id = setInterval(() => setLength(value => {
      if (value >= text.length) { clearInterval(id); return value; }
      return value + 1;
    }), speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return {text: text.slice(0, length), done: length >= text.length};
}

function Orb() {
  return (
    <span aria-hidden className="relative flex h-2.5 w-2.5 items-center justify-center">
      <span className="orb-halo absolute inset-[-3px] rounded-full" />
      <span className="orb-core relative h-2.5 w-2.5 rounded-full" />
    </span>
  );
}

function Streamed({text, active, className}: {text: string; active: boolean; className: string}) {
  const typed = useTyped(text, active, 12);
  return <p className={className}>{typed.text}{active && !typed.done && <span className="stream-caret" aria-hidden />}</p>;
}

function ToolOutput({text, terminal}: {text: string; terminal: boolean}) {
  const typed = useTyped(text, true, 14);
  return (
    <motion.pre
      initial={{opacity: 0, height: 0}}
      animate={{opacity: 1, height: "auto"}}
      exit={{opacity: 0, height: 0}}
      transition={{duration: 0.35, ease: [0.22, 1, 0.36, 1]}}
      style={{fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"}}
      className="ml-5 mt-2 overflow-hidden whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 px-3 py-2 font-mono text-[11px] leading-5 text-primary/70">
      {typed.text.split("\n").map((line, n) => (
        <span key={n} className={`block ${line.startsWith("+") ? "text-emerald-300/80" : line.startsWith("-") ? "text-rose-300/70" : terminal && line.startsWith("✓") ? "text-primary/90" : ""}`}>{line || " "}</span>
      ))}
      {!typed.done && <span className="stream-caret" aria-hidden />}
    </motion.pre>
  );
}

type Item =
  | {kind: "user"; text: string; queued?: boolean}
  | {kind: "plan"; title: string; steps: string[]}
  | {kind: "tool"; icon: "file" | "terminal"; label: string; detail: string}
  | {kind: "status"; text: string}
  | {kind: "assistant"; text: string};

// Scripted illustration of a session, labelled as sample data in the UI.
const ITEMS: Item[] = [
  {kind: "user", text: "Build a landing page for a coffee roaster."},
  {kind: "plan", title: "Plan", steps: ["Hero with the brand promise", "Product section and order button", "Preview in the sandbox"]},
  {kind: "tool", icon: "file", label: "Writing file", detail: "app/page.tsx"},
  {kind: "tool", icon: "terminal", label: "Running command", detail: "npm run build"},
  {kind: "status", text: "Preview started"},
  {kind: "user", text: "Make the hero darker and add an order button.", queued: true},
  {kind: "tool", icon: "file", label: "Editing file", detail: "app/page.tsx"},
  {kind: "tool", icon: "terminal", label: "Running validation", detail: "npm run build"},
  {kind: "assistant", text: "Done. The hero is darker and the order button is in place. Project changes saved."},
];
const DARK_AT = 7;

export function WorkflowDemo() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const [fading, setFading] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    void (async () => {
      while (!cancelled) {
        for (let index = 0; index < ITEMS.length && !cancelled; index++) {
          await wait(index === 0 ? 700 : ITEMS[index - 1].kind === "tool" ? 2100 : ITEMS[index - 1].kind === "user" ? 1500 : 1100);
          if (!cancelled) setCount(index + 1);
        }
        await wait(2800);
        if (cancelled) return;
        setFading(true);
        await wait(400);
        if (cancelled) return;
        setCount(0);
        await wait(300);
        setFading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reduced]);

  const visible = reduced ? ITEMS.length : count;
  const working = visible < ITEMS.length;
  const dark = visible >= DARK_AT;
  const current = ITEMS[visible - 1];

  useEffect(() => { list.current?.scrollTo({top: list.current.scrollHeight, behavior: "smooth"}); }, [visible]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] text-left shadow-[0_40px_120px_-40px_rgba(0,0,0,1)] md:rounded-[1.5rem]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="flex-1 text-center text-xs text-gray-500">LotusBuild · sample session</span>
        <span className="w-12" />
      </div>
      <div className={`grid h-[560px] transition-opacity duration-300 md:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1fr)] ${fading ? "opacity-0" : "opacity-100"}`}>
        <aside className="hidden flex-col gap-1 border-r border-white/5 p-3 md:flex">
          <span className="mb-3 rounded-full bg-primary px-3 py-2 text-center text-xs font-medium text-black">New project</span>
          <span className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">Sessions</span>
          {["Coffee roaster site", "Dental booking flow", "Support dashboard"].map((name, index) => (
            <span key={name} className={`truncate rounded-xl px-3 py-2 text-xs ${index === 0 ? "bg-white/5 text-[#E1E0CC]" : "text-gray-500"}`}>{name}</span>
          ))}
          <span className="mt-auto px-3 text-[10px] text-gray-600">Illustrative sample data</span>
        </aside>

        <section className="flex min-h-0 flex-col border-white/5 md:border-r">
          <header className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <span className="truncate text-sm text-[#E1E0CC]">Coffee roaster site</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] text-primary/70">
              {working ? <><Orb /> <span className="text-shimmer">{current?.kind === "tool" ? current.label : current?.kind === "user" ? "Thinking" : "Working"}</span></> : <><Check aria-hidden className="h-3 w-3" /> Worked</>}
            </span>
          </header>
          <ol ref={list} className="scrollbar-none flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5" aria-live="polite">
            {ITEMS.slice(0, visible).map((item, index) => (
              <li key={index} className="animate-[fadeUp_0.4s_ease-out]">
                {item.kind === "user" && (
                  <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
                    <p className="rounded-2xl bg-white/[0.07] px-4 py-2 text-[13px] leading-5 text-[#E1E0CC]">{item.text}</p>
                    {item.queued && <span className="text-[11px] text-gray-500">Queued for the next turn</span>}
                  </div>
                )}
                {item.kind === "plan" && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{item.title}</p>
                    <ol className="mt-2 space-y-1">{item.steps.map((step, n) => <li key={step} className="text-[13px] text-primary/80"><span className="mr-2 text-gray-600">{n + 1}</span>{step}</li>)}</ol>
                  </div>
                )}
                {item.kind === "tool" && (() => {
                  const active = working && index === visible - 1 && !reduced;
                  return (
                    <div>
                      <div className="flex items-center gap-2 text-[13px] text-gray-400">
                        {item.icon === "file" ? <FilePen aria-hidden className={`h-3.5 w-3.5 ${active ? "tool-icon-active" : "text-primary/60"}`} /> : <Terminal aria-hidden className={`h-3.5 w-3.5 ${active ? "tool-icon-active" : "text-primary/60"}`} />}
                        <span className={active ? "text-shimmer" : ""}>{item.label}</span>
                        <code className="truncate rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-primary/70">{item.detail}</code>
                        {!active && <Check aria-hidden className="ml-auto h-3.5 w-3.5 animate-[checkIn_0.35s_ease-out] text-primary/60" />}
                      </div>
                      <AnimatePresence initial={false}>
                        {active && TOOL_OUTPUT[item.label] && <ToolOutput key="out" text={TOOL_OUTPUT[item.label]} terminal={item.icon === "terminal"} />}
                      </AnimatePresence>
                    </div>
                  );
                })()}
                {item.kind === "status" && <p className="text-[12px] text-gray-500">{item.text}</p>}
                {item.kind === "assistant" && <Streamed text={item.text} active={!reduced && index === visible - 1} className="text-[13px] leading-6 text-[#E1E0CC]" />}
              </li>
            ))}
            {working && current?.kind === "user" && !reduced && (
              <li key={`thinking-${visible}`} className="flex animate-[fadeUp_0.4s_ease-out] items-center gap-2 text-[13px]">
                <Orb /><span className="text-shimmer">Thinking</span>
              </li>
            )}
          </ol>
          <div className="p-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#101010] py-1.5 pl-4 pr-1.5">
              <span className="flex-1 truncate text-[13px] text-gray-500">Ask LotusBuild to change the project</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-black"><ArrowUp aria-hidden className="h-3.5 w-3.5" /></span>
            </div>
          </div>
        </section>

        <section className="hidden min-h-0 flex-col md:flex">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-xs">
            <Monitor aria-hidden className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-[#E1E0CC]">Desktop</span>
            <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">{visible >= 3 ? "Live · view only" : "Waiting for desktop"}</span>
          </div>
          <div className="flex min-h-0 flex-1 p-4">
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/5">
              <div className="border-b border-white/5 bg-white/[0.03] px-3 py-2 text-center font-mono text-[10px] text-gray-500">localhost:3000</div>
              <div className={`flex flex-1 flex-col items-start justify-center gap-4 px-8 transition-colors duration-700 ${visible < 3 ? "bg-[#111]" : dark ? "bg-[#1d140e]" : "bg-[#efe9dd]"}`}>
                {visible >= 3 && <>
                  <h3 className={`text-2xl leading-tight transition-colors duration-700 sm:text-3xl ${dark ? "text-[#E1E0CC]" : "text-[#2a211b]"}`}>Fresh coffee, roasted weekly</h3>
                  {dark && <span className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-black">Order now</span>}
                </>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
