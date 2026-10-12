import {LIMITS} from "@/lib/security/validation";
import {Selector} from "@astryxdesign/core/Selector";
import {Token} from "@astryxdesign/core/Token";
import {ArrowUp, CornerDownRight, Loader2, Square} from "lucide-react";
import {useEffect, useRef, useState} from "react";

import type {AgentModel} from "@/lib/api/me";
import type {AiEffort, SessionMode} from "@/lib/api/sessions";

export type ComposerOptions = {effort?: AiEffort; mode: SessionMode; steer?: boolean};

const EFFORT_COPY: Record<AiEffort, string> = {
  low: "Fastest, lowest token use",
  standard: "Balanced depth and speed",
  high: "More thorough on complex tasks",
  xhigh: "Deepest reasoning",
};

const chip = "flex h-8 max-w-52 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors";

const MODES: {value: SessionMode; label: string; hint: string}[] = [
  {value: "build", label: "Build", hint: "Edit files, run tools, and build the project"},
  {value: "plan", label: "Plan", hint: "Explore the request and return a read-only plan"},
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
                <Token label={modelName(session.model)} size="sm" color="gray" />
                <Token label={(MODES.find(item => item.value === session.mode) ?? MODES[0]).label} size="sm" color="gray" />
                {session.effort && efforts.length > 0 && <Token label={`${session.effort[0].toUpperCase()}${session.effort.slice(1)}`} size="sm" color="gray" />}
              </>
            ) : models.length > 0 ? (
              <>
                <Selector label="Model" isLabelHidden value={model} onChange={value => setChosenModel(value)}
                  options={models.map(item => ({value: item.id, label: item.name, description: item.efforts.length ? "Adjustable reasoning" : "Default reasoning"}))}
                  variant="ghost" size="sm" width={160} placement="above" presentation="adaptive" />
                <Selector label="Mode" isLabelHidden value={mode} onChange={value => setMode(value as SessionMode)}
                  options={MODES.map(item => ({value: item.value, label: item.label, description: item.hint}))}
                  variant="ghost" size="sm" width={104} placement="above" presentation="adaptive" />
                {effort && <Selector label="Reasoning effort" isLabelHidden value={effort} onChange={value => setChosenEffort(value as AiEffort)}
                  options={efforts.map(item => ({value: item, label: `${item[0].toUpperCase()}${item.slice(1)}`, description: EFFORT_COPY[item]}))}
                  variant="ghost" size="sm" width={132} placement="above" presentation="adaptive" />}
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
