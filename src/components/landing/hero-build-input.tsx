import {checkPrompt} from "@/lib/security/validation";
import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";

import {Composer} from "@/components/composer";
import {BuildStartError, startBuild} from "@/lib/api/build";
import {ApiError} from "@/lib/api/client";
import {composerModels} from "@/lib/api/me";
import {useWorkspaceAccount} from "@/lib/workspace/use-account";

// Signed out: sends the visitor to sign in. Signed in: creates a real project
// and its first session from the prompt, then opens the workspace.
export function HeroBuildInput() {
  const navigate = useNavigate();
  const account = useWorkspaceAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(prompt: string, model: string, options: Parameters<typeof startBuild>[3]) {
    if (account.status !== "ready") { navigate("/sign-in"); return false; }
    const checked = checkPrompt(prompt);
    if (!checked.ok) { setError(checked.error); return false; }
    prompt = checked.value;
    setBusy(true);
    setError(null);
    setCreatedId(null);
    try {
      const projectId = await startBuild(await account.user.getIdToken(), prompt, model, options);
      navigate(`/projects/${encodeURIComponent(projectId)}`);
    } catch (failure) {
      if (failure instanceof BuildStartError) setCreatedId(failure.projectId);
      setError(failure instanceof BuildStartError || failure instanceof ApiError ? failure.message : "Could not confirm the build. Check your projects before trying again.");
      setBusy(false);
      return false;
    }
  }

  return (
    <div className="w-full">
      <Composer
        size="hero"
        label="Describe a project to build"
        placeholder="Describe the app you want, e.g. a booking site for a dental clinic"
        onSubmit={submit}
        isDisabled={busy || account.status === "loading"}
        allowWithoutModel={account.status !== "ready"}
        models={account.status === "ready" ? composerModels(account.me) : []}
        modelHint={account.status === "ready" ? undefined : "Sign in to choose a model"}
        error={error}
      />
      {createdId && <Link to={`/projects/${encodeURIComponent(createdId)}`} className="mt-2 block text-center text-sm text-primary underline">Open created project</Link>}
    </div>
  );
}
