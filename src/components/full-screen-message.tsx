import type {ReactNode} from "react";

export function FullScreenMessage({children}: {children: ReactNode}) {
  return <main className="flex min-h-screen items-center justify-center bg-[#131211] px-6 text-center text-sm text-gray-400">{children}</main>;
}
