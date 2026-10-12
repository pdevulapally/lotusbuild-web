import type {ReactNode} from "react";
import {Navigate} from "react-router-dom";

import {FullScreenMessage} from "@/components/full-screen-message";
import {useWorkspaceAccount, type WorkspaceAccount} from "@/lib/workspace/use-account";

export type ReadyAccount = Extract<WorkspaceAccount, {status: "ready"}>;

export function RequireAccount({children}: {children: (account: ReadyAccount) => ReactNode}) {
  const account = useWorkspaceAccount();
  if (account.status === "signed-out") return <Navigate to="/sign-in" replace />;
  if (account.status === "loading") return <FullScreenMessage>Loading your account…</FullScreenMessage>;
  if (account.status === "error") return <FullScreenMessage>{account.message}</FullScreenMessage>;
  return <>{children(account)}</>;
}
