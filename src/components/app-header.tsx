import {LogOut} from "lucide-react";
import type {ReactNode} from "react";
import {Link, useNavigate} from "react-router-dom";

import {auth} from "@/lib/firebase/client";

export function AppHeader({children, name}: {children?: ReactNode; name?: string | null}) {
  const navigate = useNavigate();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/5 px-4 sm:px-6">
      <Link to="/" className="text-lg tracking-[-0.04em]" style={{color: "#E1E0CC"}}>LotusBuild<span className="align-super text-xs">*</span></Link>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      {name && <span className="hidden truncate text-xs text-gray-500 sm:block">{name}</span>}
      <button type="button" aria-label="Sign out" onClick={async () => {
        const {signOut} = await import("firebase/auth");
        await signOut(auth);
        navigate("/");
      }} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-[#E1E0CC]">
        <LogOut aria-hidden className="h-4 w-4" />
      </button>
    </header>
  );
}
