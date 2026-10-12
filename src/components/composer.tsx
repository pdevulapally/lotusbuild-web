import {LIMITS} from "@/lib/security/validation";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowUp, Check, ChevronDown, CornerDownRight, Gauge, Hammer, ListChecks, Loader2, Square, type LucideIcon} from "lucide-react";
import {useEffect, useId, useRef, useState, type KeyboardEvent} from "react";

import type {AgentModel} from "@/lib/api/me";
import type {AiEffort, SessionMode} from "@/lib/api/sessions";
import {EASE} from "@/lib/motion";

export type ComposerOptions = {effort?: AiEffort; mode: SessionMode; steer?: boolean};
type Option = {value: string; label: string; description?: string; Icon?: LucideIcon};

const EFFORT_COPY: Record<AiEffort, string> = {
  low: "Fastest, lowest token use",
  standard: "Balanced depth and speed",
  high: "More thorough on complex tasks",
  xhigh: "Deepest reasoning",
};

const chip = "flex h-8 max-w-52 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors";

function Picker({label, value, options, onChange, Icon}: {label: string; value: string; options: Option[]; onChange: (value: string) => void; Icon?: LucideIcon}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    if (!open) { setOpen(true); return; }
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return (
    <div className="relative" onKeyDown={onKeyDown} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={trigger} type="button" aria-label={`${label}: ${options.find(option => option.value === value)?.label ?? value}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen(current => !current)}
        className={`${chip} ${open ? "border-white/15 bg-white/[0.08] text-[#E1E0CC]" : "border-white/[0.08] bg-white/[0.03] text-[#E1E0CC]/80 hover:border-white/15 hover:bg-white/[0.06] hover:text-[#E1E0CC]"}`}>
        {(() => { const Shown = options.find(option => option.value === value)?.Icon ?? Icon; return Shown && <Shown aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0 text-[#E1E0CC]/60" />; })()}
        <span className="truncate">{options.find(option => option.value === value)?.label ?? value}</span>
        <ChevronDown aria-hidden strokeWidth={1.75} className={`h-3.5 w-3.5 shrink-0 text-[#E1E0CC]/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id={id} ref={menu} role="menu" aria-label={label}
            initial={{opacity: 0, y: 6, scale: 0.97}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: 4, scale: 0.98}} transition={{duration: 0.18, ease: EASE}}
            className="absolute bottom-full left-0 z-40 mb-2 w-72 max-w-[calc(100vw-3rem)] origin-bottom-left rounded-2xl border border-white/[0.08] bg-[#23211f] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
            <p className="px-3 pb-1.5 pt-2 text-[12px] text-gray-500">{label}</p>
            {options.map(option => (
              <button key={option.value} type="button" role="menuitemradio" aria-checked={option.value === value}
                onClick={() => { onChange(option.value); close(); }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[#E1E0CC]/75 transition-colors hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none aria-checked:text-[#E1E0CC]">
                {option.Icon && <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]"><option.Icon strokeWidth={1.75} className="h-4 w-4" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-5">{option.label}</span>
                  {option.description && <span className="mt-0.5 block text-[12px] leading-4 text-gray-500">{option.description}</span>}
                </span>
                {option.value === value && <Check aria-hidden strokeWidth={2} className="h-4 w-4 shrink-0 text-[#E1E0CC]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MODES: {value: SessionMode; label: string; hint: string; Icon: LucideIcon}[] = [
  {value: "build", label: "Build", hint: "Edit files, run tools, build the project", Icon: Hammer},
  {value: "plan", label: "Plan", hint: "Explore and return a read-only plan", Icon: ListChecks},
];

export type ComposerProps = {
  label: string;
  placeholder?: string;
  onSubmit?: (prompt: string, model: string, options: ComposerOptions) => boolean | void | Promise<boolean | void>;
  models?: AgentModel[];
  /** A running session's fixed settings; pickers are hidden when set. */
  session?: {model: string; effort?: AiEffort; mode: SessionMode};
  isDisabled?: boolean;
  isWorking?: boolean;
  isStopping?: boolean;
  onStop?: () => void;
  announcement?: string | null;
  error?: string | null;
  /** Lets a signed-out visitor submit (the caller then sends them to sign in). */
  allowWithoutModel?: boolean;
  modelHint?: string;
  size?: "hero" | "dock";
  className?: string;
};

export function Composer({
  label, placeholder = "Describe what you want to build", onSubmit, models = [], session, isDisabled = false,
  isWorking = false, isStopping = false, onStop, announcement, error, allowWithoutModel = false,
  modelHint, size = "dock", className = "",
}: ComposerProps) {
  const [value, setValue] = useState("");
  const [chosenModel, setChosenModel] = useState("");
  const [chosenEffort, setChosenEffort] = useState<AiEffort>();
  const [mode, setMode] = useState<SessionMode>("build");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const model = session?.model ?? (models.some(item => item.id === chosenModel) ? chosenModel : models[0]?.id ?? "");
  const efforts = models.find(item => item.id === model)?.efforts ?? [];
  const effort = chosenEffort && efforts.includes(chosenEffort) ? chosenEffort : efforts.at(-1);
  const modelName = (id: string) => models.find(item => item.id === id)?.name ?? id;
  const disabled = isDisabled || submitting || !onSubmit || (!model && !allowWithoutModel);

  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }, [value]);

  async function submit(steer = false) {
    const prompt = value.trim();
    if (!prompt || busy.current || disabled || !onSubmit) return;
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const accepted = await onSubmit(prompt, model, {mode: session?.mode ?? mode, ...(session || !effort ? {} : {effort}), ...(steer ? {steer} : {})});
      if (accepted !== false) setValue("");
    } catch {
      setSubmitError("Could not confirm delivery. Check the conversation before sending again.");
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  const hero = size === "hero";
  return (
    <div className={`w-full text-left ${className}`}>
      <form
        aria-label={label}
        onSubmit={event => { event.preventDefault(); void submit(); }}
        className={`rounded-[1.75rem] border p-2 transition-colors ${hero ? "border-white/15 bg-[#1b1712]/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 focus-within:border-white/30 sm:p-3" : "border-white/10 bg-[#201f1d]/90 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl focus-within:border-primary/30"}`}>
        <label className="sr-only" htmlFor={`${label}-input`}>{label}</label>
        <textarea
          id={`${label}-input`}
          ref={textarea}
          rows={hero ? 3 : 2}
          maxLength={LIMITS.prompt}
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(isWorking && !!session && (event.metaKey || event.ctrlKey)); }
          }}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`block w-full resize-none bg-transparent px-3 pt-2 text-[#E1E0CC] outline-none disabled:opacity-60 ${hero ? "text-base placeholder:text-[#E1E0CC]/70 sm:text-lg" : "placeholder:text-gray-500"} ${hero ? "text-base sm:text-lg" : "text-sm sm:text-[15px]"}`}
        />
        <div className="mt-1 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pl-1">
            {session ? (
              <>
                <span className={`${chip} border-white/[0.06] text-[#E1E0CC]/70`}><span className="truncate">{modelName(session.model)}</span></span>
                {(() => { const current = MODES.find(item => item.value === session.mode) ?? MODES[0]; return <span className={`${chip} border-white/[0.06] text-[#E1E0CC]/70`}><current.Icon aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />{current.label}</span>; })()}
                {session.effort && efforts.length > 0 && <span className={`${chip} border-white/[0.06] capitalize text-[#E1E0CC]/70`}><Gauge aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />{session.effort}</span>}
              </>
            ) : models.length > 0 ? (
              <>
                <Picker label="Model" value={model} onChange={setChosenModel}
                  options={models.map(item => ({value: item.id, label: item.name, description: item.efforts.length ? "Adjustable reasoning" : "Default reasoning"}))} />
                <Picker label="Mode" value={mode} onChange={value => setMode(value as SessionMode)} options={MODES.map(item => ({value: item.value, label: item.label, description: item.hint, Icon: item.Icon}))} />
                {effort && <Picker label="Reasoning effort" value={effort} onChange={value => setChosenEffort(value as AiEffort)} Icon={Gauge}
                  options={efforts.map(item => ({value: item, label: `${item[0].toUpperCase()}${item.slice(1)}`, description: EFFORT_COPY[item]}))} />}
              </>
            ) : (
              <span className="px-2.5 py-1.5 text-xs text-gray-500">{modelHint ?? "Available models could not be loaded."}</span>
            )}
          </div>
          {isWorking && session && value.trim() && (
            <button type="button" onClick={() => void submit(true)} disabled={disabled} title="Send into the current run (Ctrl/⌘ + Enter)"
              className={`${chip} shrink-0 border-white/[0.08] text-[#E1E0CC]/80 hover:border-white/20 hover:text-[#E1E0CC] disabled:opacity-40`}>
              <CornerDownRight aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />Steer
            </button>
          )}
          {isWorking && onStop && !value.trim() ? (
            <button type="button" onClick={onStop} disabled={isStopping} aria-label={isStopping ? "Stopping agent" : "Stop agent"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black transition-transform hover:scale-105 disabled:opacity-50">
              {isStopping ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Square aria-hidden className="h-3.5 w-3.5 fill-current" />}
            </button>
          ) : (
            <button type="submit" disabled={disabled || !value.trim()} aria-label={submitting ? "Sending" : isWorking ? "Add to queue" : "Send"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100">
              {submitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArrowUp aria-hidden className="h-4 w-4" />}
            </button>
          )}
        </div>
      </form>
      <span role="status" aria-live="polite" className="sr-only">{submitting ? "Sending" : announcement}</span>
      {(error || submitError) && <p role="alert" className="mt-2 px-2 text-sm text-red-300">{error || submitError}</p>}
    </div>
  );
}
