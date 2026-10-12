import {LIMITS} from "@/lib/security/validation";
import {ArrowUp, Check, ChevronDown, Loader2, Square} from "lucide-react";
import {useEffect, useId, useRef, useState, type KeyboardEvent} from "react";

import type {AgentModel} from "@/lib/api/me";
import type {AiEffort, SessionMode} from "@/lib/api/sessions";

export type ComposerOptions = {effort?: AiEffort; mode: SessionMode};
type Option = {value: string; label: string; description?: string};

const EFFORT_COPY: Record<AiEffort, string> = {
  low: "Fastest, lowest token use",
  standard: "Balanced depth and speed",
  high: "More thorough on complex tasks",
  xhigh: "Deepest reasoning",
};

function Picker({label, value, options, onChange}: {label: string; value: string; options: Option[]; onChange: (value: string) => void}) {
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
      <button ref={trigger} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen(current => !current)}
        className={`flex max-w-48 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-colors ${open ? "bg-white/10 text-[#E1E0CC]" : "text-primary/60 hover:bg-white/5 hover:text-[#E1E0CC]"}`}>
        <span className="truncate">{options.find(option => option.value === value)?.label ?? value}</span>
        <ChevronDown aria-hidden className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={id} ref={menu} role="menu" aria-label={label}
          className="absolute bottom-full left-0 z-40 mb-2 w-64 max-w-[calc(100vw-3rem)] rounded-2xl border border-white/10 bg-[#161616] p-1.5 shadow-2xl">
          <p className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
          {options.map(option => (
            <button key={option.value} type="button" role="menuitemradio" aria-checked={option.value === value}
              onClick={() => { onChange(option.value); close(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-primary/70 hover:bg-white/5 focus:bg-white/5 focus:outline-none aria-checked:text-[#E1E0CC]">
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{option.label}</span>
                {option.description && <span className="mt-0.5 block text-[11px] text-gray-500">{option.description}</span>}
              </span>
              {option.value === value && <Check aria-hidden className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  queuedCount?: number;
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
  isWorking = false, isStopping = false, onStop, queuedCount = 0, announcement, error, allowWithoutModel = false,
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

  async function submit() {
    const prompt = value.trim();
    if (!prompt || busy.current || disabled || !onSubmit) return;
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const accepted = await onSubmit(prompt, model, {mode: session?.mode ?? mode, ...(session || !effort ? {} : {effort})});
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
        className={`rounded-[1.75rem] border p-2 transition-colors ${hero ? "border-white/15 bg-[#1b1712]/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 focus-within:border-white/30 sm:p-3" : "border-white/10 bg-[#101010]/90 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl focus-within:border-primary/30"}`}>
        <label className="sr-only" htmlFor={`${label}-input`}>{label}</label>
        <textarea
          id={`${label}-input`}
          ref={textarea}
          rows={hero ? 3 : 2}
          maxLength={LIMITS.prompt}
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }
          }}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`block w-full resize-none bg-transparent px-3 pt-2 text-[#E1E0CC] outline-none disabled:opacity-60 ${hero ? "text-base placeholder:text-[#E1E0CC]/70 sm:text-lg" : "placeholder:text-gray-500"} ${hero ? "text-base sm:text-lg" : "text-sm sm:text-[15px]"}`}
        />
        <div className="mt-1 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
            {session ? (
              <>
                <span className="truncate px-2.5 py-1.5 text-xs text-primary/60">{modelName(session.model)}</span>
                <span className="px-2.5 py-1.5 text-xs capitalize text-gray-500">{session.mode}</span>
                {session.effort && efforts.length > 0 && <span className="px-2.5 py-1.5 text-xs capitalize text-gray-500">{session.effort} effort</span>}
              </>
            ) : models.length > 0 ? (
              <>
                <Picker label="Model" value={model} onChange={setChosenModel}
                  options={models.map(item => ({value: item.id, label: item.name, description: item.efforts.length ? "Adjustable reasoning" : "Default reasoning"}))} />
                <Picker label="Mode" value={mode} onChange={value => setMode(value as SessionMode)} options={[
                  {value: "build", label: "Build", description: "Edit files, run tools, build the project"},
                  {value: "plan", label: "Plan", description: "Explore and return a read-only plan"},
                ]} />
                {effort && <Picker label="Effort" value={effort} onChange={value => setChosenEffort(value as AiEffort)}
                  options={efforts.map(item => ({value: item, label: `${item[0].toUpperCase()}${item.slice(1)} effort`, description: EFFORT_COPY[item]}))} />}
              </>
            ) : (
              <span className="px-2.5 py-1.5 text-xs text-gray-500">{modelHint ?? "Available models could not be loaded."}</span>
            )}
            {queuedCount > 0 && <span className="px-2.5 py-1.5 text-xs text-gray-500">{queuedCount} queued</span>}
          </div>
          {isWorking && onStop && !value.trim() ? (
            <button type="button" onClick={onStop} disabled={isStopping} aria-label={isStopping ? "Stopping agent" : "Stop agent"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black transition-transform hover:scale-105 disabled:opacity-50">
              {isStopping ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Square aria-hidden className="h-3.5 w-3.5 fill-current" />}
            </button>
          ) : (
            <button type="submit" disabled={disabled || !value.trim()} aria-label={submitting ? "Sending" : isWorking ? "Queue follow-up" : "Send"}
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
