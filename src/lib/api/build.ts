import {createProject} from "./projects";
import {createSession, type AiEffort, type SessionMode} from "./sessions";

const MAX_NAME_LENGTH = 100;

export class BuildStartError extends Error {
  constructor(readonly projectId: string, readonly failure: unknown) {
    super("The project was created, but its session could not be confirmed. Open the project to check before trying again.");
  }
}

// Projects need a name (required, non-whitespace, <=100 chars); there is no
// separate "name" field in the composer, so one is derived from the prompt.
function projectNameFromPrompt(prompt: string): string {
  const collapsed = prompt.trim().replace(/\s+/g, " ");
  if (collapsed.length <= MAX_NAME_LENGTH) return collapsed;
  return `${collapsed.slice(0, MAX_NAME_LENGTH - 1)}…`;
}

// Creates a project and starts its first session from a prompt. Shared by
// every "describe what to build" entry point (landing hero, workspace empty
// state) so they create projects the same way. Returns the new project id.
export async function startBuild(
  token: string,
  prompt: string,
  model: string,
  options?: {effort?: AiEffort; mode?: SessionMode},
): Promise<string> {
  const project = await createProject(token, {name: projectNameFromPrompt(prompt)});
  try {
    await createSession(token, project.id, {prompt, model, ...options});
  } catch (error) {
    // A timed-out POST may have succeeded. Preserve the project and allow
    // reconciliation instead of deleting a possibly running build.
    throw new BuildStartError(project.id, error);
  }
  return project.id;
}
