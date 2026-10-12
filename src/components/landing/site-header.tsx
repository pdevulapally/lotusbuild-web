import {ArrowRight} from "lucide-react";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";

import {useAuthState} from "@/lib/auth/use-auth-state";

const NAV = [
  {label: "How it works", href: "/#demo"},
  {label: "Agent", href: "/#how"},
  {label: "Features", href: "/#features"},
  {label: "Pricing", href: "/pricing"},
];

export function SiteHeader() {
  const auth = useAuthState();
  const signedIn = auth === "signed-in";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, {passive: true});
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6 pt-6 md:px-10 md:pt-9">
      <div className={`mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-full border pl-5 pr-2 transition-all duration-300 ${
        scrolled ? "border-white/10 bg-black/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,1)] backdrop-blur-xl" : "border-white/10 bg-black/25 backdrop-blur-md"
      }`}>
        <Link to="/" aria-label="LotusBuild home" className="flex shrink-0 items-center">
          <img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-6 w-auto invert" />
        </Link>
        <nav aria-label="Primary" className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map(item => (
              <li key={item.label}>
                <Link to={item.href} className="rounded-full px-4 py-2 text-primary/70 transition-colors duration-300 hover:bg-white/5 hover:text-[#E1E0CC]">{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {auth === "unknown" ? <span role="status" aria-label="Checking sign-in" className="h-10 w-36 animate-pulse rounded-full bg-white/10" /> : <>{!signedIn && <Link to="/sign-in" className="hidden rounded-full px-4 py-2 text-sm text-primary/70 transition-colors hover:text-[#E1E0CC] sm:block">Sign in</Link>}
          <Link to={signedIn ? "/projects" : "/sign-up"}
            className="group inline-flex h-10 items-center gap-2 rounded-full bg-primary pl-4 pr-1 text-sm font-medium text-black transition-all hover:gap-3">
            {signedIn ? "Open app" : "Start building"}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-105">
              <ArrowRight aria-hidden className="h-3.5 w-3.5" style={{color: "#E1E0CC"}} />
            </span>
          </Link></>}
        </div>
      </div>
    </header>
  );
}
