import type {SessionEvent} from "../api/session-events";

export type Activity = {
  text: string;
  phase: "waiting" | "working" | "finished" | "cancel" | "failed";
  entries: {id: string; label: string; failed: boolean; detail?: string; callId?: string; running?: boolean; output?: string}[];
  save: "unknown" | "saved" | "failed";
  currentAction: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
};
export const initialActivity: Activity = {text: "", phase: "waiting", entries: [], save: "unknown", currentAction: null, startedAt: null, finishedAt: null, error: null};

const TOOL_LABELS: Record<string, string> = {
  run_command: "Running command", write_file: "Writing file", edit_file: "Editing file",
  read_file: "Reading file", list_files: "Listing files", search_files: "Searching files",
  start_preview: "Starting preview", run_validation: "Running validation",
};
const TOOL_RESULTS: Record<string, [string, string]> = {
  run_command: ["Command completed", "Command failed"],
  write_file: ["File written", "Could not write file"],
  edit_file: ["File edited", "Could not edit file"],
  read_file: ["File read", "Could not read file"],
  list_files: ["Files listed", "Could not list files"],
  search_files: ["Search completed", "Search failed"],
  start_preview: ["Preview started", "Could not start preview"],
  run_validation: ["Validation passed", "Validation failed"],
};
export function toolLabel(name: string): string { return TOOL_LABELS[name] ?? `Using ${name.replace(/[_.-]/g, " ")}`; }

export function reduceActivity(state: Activity, event: SessionEvent): Activity {
  const {type, data, id} = event;
  const timestamp = Number(id.split('-')[0]);
  const at = Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : null;
  const entry = (label: string, failed = false, detail?: string): Activity => ({
    ...state, entries: [...state.entries, {id, label, failed, ...(detail ? {detail: detail.slice(0, 4000)} : {})}].slice(-80),
  });
  switch (type) {
    case "session.running": return {...initialActivity, phase: "working", startedAt: at};
    case "session.queued": return {...initialActivity, startedAt: at};
    case "sandbox.started": return {...entry('Preparing workspace'), currentAction: 'Preparing workspace'};
    case "project.restored": return {...entry(data.outcome === 'restored' ? 'Project restored' : 'Workspace ready'), currentAction: null};
    case "desktop.ready": return {...entry('Desktop ready'), currentAction: null};
    case "agent.text": return typeof data.delta === "string" ? {...state, text: (state.text + data.delta).slice(-200_000)} : state;
    case "agent.step": return Number.isInteger(data.number) ? entry(`Step ${data.number}`) : state;
    case "agent.tool_call": {
      if (typeof data.name !== "string") return state;
      const input = data.input && typeof data.input === "object" ? data.input as Record<string, unknown> : {};
      // Display only documented command/path fields, never arbitrary input objects.
      const detail = data.name === "run_command" && typeof input.command === "string" ? input.command :
        typeof input.path === "string" ? input.path : undefined;
      const next = entry(toolLabel(data.name), false, detail);
      const last = next.entries.at(-1)!;
      return {...next, entries: [...next.entries.slice(0, -1), {...last, running: true,
        ...(typeof data.callId === 'string' ? {callId: data.callId} : {})}], currentAction: toolLabel(data.name)};
    }
    case "agent.tool_result": {
      if (typeof data.name !== "string" || typeof data.isError !== "boolean") return state;
      const result = TOOL_RESULTS[data.name];
      const label = result?.[data.isError ? 1 : 0] ?? `${data.name.replace(/[_.-]/g, " ")} ${data.isError ? "failed" : "completed"}`;
      const index = typeof data.callId === 'string' ? state.entries.findIndex(item => item.callId === data.callId) : -1;
      if (index < 0) return {...entry(label, data.isError, typeof data.text === "string" ? data.text : undefined), currentAction: null};
      const entries = state.entries.map((item, position) => position === index ? {...item, label, running: false, failed: data.isError as boolean,
        ...(typeof data.text === 'string' ? {output: data.text.slice(0, 4000)} : {})} : item);
      return {...state, entries, currentAction: entries.findLast(item => item.running)?.label ?? null};
    }
    case "agent.specialist_started": return typeof data.label === "string" ? entry(`${data.label} started`) : state;
    case "agent.specialist_completed": return typeof data.label === "string" ? entry(`${data.label} completed`) : state;
    case "agent.blocked": return entry("Agent reported a blocker. See its reply.");
    case "agent.finished":
    case "session.idle": return {...state, phase: "finished", finishedAt: at, currentAction: null};
    case "session.cancel_requested": return {...state, phase: "cancel"};
    case "session.failed": return {...state, phase: "failed", finishedAt: at, currentAction: null,
      entries: state.entries.map(item => ({...item, running: false})),
      error: typeof data.error === 'string' ? data.error : 'The session could not finish. Try starting a new session.'};
    case "project.saved": return {...state, save: "saved"};
    case "project.save_failed": return {...state, save: "failed"};
    default: return state;
  }
}
