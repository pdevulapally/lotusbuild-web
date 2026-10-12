import {motion} from "framer-motion";
import type {ReactNode} from "react";
import {Navigate, useLocation} from "react-router-dom";

import {auth} from "@/lib/firebase/client";
import {EASE} from "@/lib/motion";
import {useWorkspaceAccount, type WorkspaceAccount} from "@/lib/workspace/use-account";

export type ReadyAccount = Extract<WorkspaceAccount, {status: "ready"}>;

function Gate({children}: {children: ReactNode}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <motion.div initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: 0.5, delay: 0.15, ease: EASE}}
        className="flex flex-col items-center gap-4 text-center">
        {children}
      </motion.div>
    </main>
  );
}

// Protected pages render only after Firebase and the backend have both
// confirmed the account. There is no optimistic render and no cached fallback.
export function RequireAccount({children}: {children: (account: ReadyAccount) => ReactNode}) {
  const account = useWorkspaceAccount();
  const location = useLocation();

  if (account.status === "signed-out") {
    return <Navigate to={`/sign-in?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  }
  if (account.status === "loading") {
    return (
      <Gate>
        <span aria-hidden className="relative flex h-3 w-3 items-center justify-center">
          <span className="orb-halo absolute inset-[-4px] rounded-full" />
          <span className="orb-core relative h-3 w-3 rounded-full" />
        </span>
        <p role="status" className="text-shimmer text-sm">Verifying your session</p>
      </Gate>
    );
  }
  if (account.status === "error") {
    return (
      <Gate>
        <p role="alert" className="max-w-sm text-sm leading-6 text-gray-400">{account.message}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90">Try again</button>
          <button type="button" onClick={() => void import("firebase/auth").then(({signOut}) => signOut(auth))}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-[#E1E0CC] transition-colors hover:bg-white/5">Sign out</button>
        </div>
      </Gate>
    );
  }
  return <>{children(account)}</>;
}
