import type {ReactNode} from "react";

import {SiteFooter} from "@/components/landing/site-footer";
import {SiteHeader} from "@/components/landing/site-header";

export function MarketingShell({children}: {children: ReactNode}) {
  return (
    <main id="top" className="min-h-screen bg-black" style={{color: "#E1E0CC"}}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </main>
  );
}
