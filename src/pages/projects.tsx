import {motion} from "framer-motion";
import {useState} from "react";
import {useNavigate} from "react-router-dom";

import {Composer} from "@/components/composer";
import {RequireOwnWorkspace, type ReadyAccount} from "@/components/require-account";
import {errorText, fullName, WorkspaceShell} from "@/components/workspace/shell";
import {BuildStartError, startBuild} from "@/lib/api/build";
import {composerModels} from "@/lib/api/me";
import {EASE} from "@/lib/motion";
import {checkPrompt} from "@/lib/security/validation";
import {workspacePath} from "@/lib/workspace/slug";

function Projects({account}: {account: ReadyAccount}) {
  const navigate = useNavigate();
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const firstName = fullName(account).split(/\s+/)[0];

  async function build(prompt: string, model: string, options: Parameters<typeof startBuild>[3]) {
    const checked = checkPrompt(prompt);
    if (!checked.ok) { setBuildError(checked.error); return false; }
    setBuilding(true);
    setBuildError(null);
    try {
      const id = await startBuild(await account.user.getIdToken(), checked.value, model, options);
      navigate(workspacePath(account.username, id));
    } catch (failure) {
      setBuildError(failure instanceof BuildStartError ? failure.message : errorText(failure, "We couldn't confirm the build. Check your projects before trying again."));
      setBuilding(false);
      setRefreshKey(key => key + 1);
      return false;
    }
  }

  return (
    <WorkspaceShell account={account} refreshKey={refreshKey}>
      <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(45%_70%_at_50%_0%,rgba(225,224,204,0.08),transparent)]" />
        <motion.section initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, delay: 0.1, ease: EASE}}
          className="relative flex w-full max-w-3xl flex-1 flex-col justify-center py-16 md:pb-[18vh]">
          <h1 className="text-center text-3xl tracking-[-0.02em] sm:text-[40px] sm:leading-[1.15]">{firstName ? `What should we build, ${firstName}?` : "What should we build today?"}</h1>
          <div className="mt-8">
            <Composer size="hero" label="Describe a project to build" placeholder="Describe the app you want, e.g. a booking site for a dental clinic"
              onSubmit={build} isDisabled={building} models={composerModels(account.me)} error={buildError} />
          </div>
        </motion.section>
      </div>
    </WorkspaceShell>
  );
}

export default function ProjectsPage() {
  return <RequireOwnWorkspace>{account => <Projects account={account} />}</RequireOwnWorkspace>;
}
