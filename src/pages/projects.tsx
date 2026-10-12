import {motion} from "framer-motion";
import {useState} from "react";
import {useNavigate} from "react-router-dom";

import {Composer} from "@/components/composer";
import {RequireOwnWorkspace, type ReadyAccount} from "@/components/require-account";
import {errorText, fullName, iconButton, PanelIcon, WorkspaceShell} from "@/components/workspace/shell";
import {BuildStartError, startBuild} from "@/lib/api/build";
import {summarizeApiFailure} from "@/lib/api/client";
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
      if (failure instanceof BuildStartError) {
        // The project already exists, and a timed-out session request may also
        // have succeeded. Open the canonical workspace so its session list can
        // reconcile the result instead of leaving the user on the create form.
        navigate(workspacePath(account.username, failure.projectId), {
          replace: true,
          state: {buildStartFailure: summarizeApiFailure(failure.failure, "The build could not start. Try again from this project.")},
        });
        return true;
      }
      setBuildError(errorText(failure, "We couldn't confirm the build. Check your projects before trying again."));
      setBuilding(false);
      setRefreshKey(key => key + 1);
      return false;
    }
  }

  return (
    <WorkspaceShell account={account} refreshKey={refreshKey}>
      {({openSidebar}) => (
        <>
          <header className="relative z-20 flex h-14 shrink-0 items-center border-b border-white/[0.055] bg-[#151412]/95 px-2.5 backdrop-blur-xl md:hidden">
            <button type="button" aria-label="Open sidebar" onClick={openSidebar} className={iconButton}><PanelIcon /></button>
            <div className="pointer-events-none absolute inset-x-14 flex min-w-0 items-baseline justify-center gap-1.5">
              <span className="max-w-[9rem] truncate text-[14px] font-medium text-[#E1E0CC]">{account.username}</span>
              <span aria-hidden className="text-[13px] text-gray-600">/</span>
              <h1 className="text-[14px] text-gray-400">Projects</h1>
            </div>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 sm:px-8">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(45%_70%_at_50%_0%,rgba(225,224,204,0.08),transparent)]" />
            <motion.section initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, delay: 0.1, ease: EASE}}
              className="relative flex w-full max-w-3xl flex-1 flex-col justify-center py-16 md:pb-[18vh]">
              <h2 className="text-center text-3xl tracking-[-0.02em] sm:text-[40px] sm:leading-[1.15]">{firstName ? `What should we build, ${firstName}?` : "What should we build today?"}</h2>
              <div className="mt-8">
                <Composer size="hero" label="Describe a project to build" placeholder="Describe the app you want, e.g. a booking site for a dental clinic"
                  onSubmit={build} isDisabled={building} models={composerModels(account.me)} error={buildError} />
              </div>
            </motion.section>
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}

export default function ProjectsPage() {
  return <RequireOwnWorkspace>{account => <Projects account={account} />}</RequireOwnWorkspace>;
}
