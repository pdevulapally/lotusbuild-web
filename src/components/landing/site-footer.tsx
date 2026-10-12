import {openConsentSettings} from "@/components/cookie-banner";
import {ArrowUpRight} from "lucide-react";
import {Link} from "react-router-dom";

const COLUMNS = [
  {
    title: "Product",
    links: [
      {label: "How it works", href: "/#demo"},
      {label: "Agent", href: "/#how"},
      {label: "Features", href: "/#features"},
      {label: "Pricing", href: "/pricing"},
    ],
  },
  {
    title: "Account",
    links: [
      {label: "Sign in", href: "/sign-in"},
      {label: "Create account", href: "/sign-up"},
      {label: "Projects", href: "/projects"},
    ],
  },
  {
    title: "Legal",
    links: [
      {label: "Terms", href: "/terms"},
      {label: "Privacy", href: "/privacy"},
      {label: "Cookie policy", href: "/privacy#cookies"},
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="px-4 pb-6 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-[#201f1d] ring-1 ring-white/5 md:rounded-[2rem]">
        <div className="grid gap-12 px-6 py-12 sm:px-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:py-16">
          <div className="flex flex-col gap-5">
            <Link to="/" aria-label="LotusBuild home" className="w-fit">
              <img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-7 w-auto invert" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-gray-400">
              An AI agent that plans, writes and runs your app in its own sandbox, while you watch every step.
            </p>
            <Link to="/sign-up" className="group inline-flex w-fit items-center gap-1.5 text-sm text-primary transition-colors hover:text-[#E1E0CC]">
              Start building
              <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
          {COLUMNS.map(column => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{column.title}</p>
              <ul className="flex flex-col gap-3 text-sm">
                {column.links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith("#")
                      ? <a href={link.href} className="text-gray-300 transition-colors hover:text-[#E1E0CC]">{link.label}</a>
                      : <Link to={link.href} className="text-gray-300 transition-colors hover:text-[#E1E0CC]">{link.label}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div aria-hidden className="select-none px-4 text-center text-[19vw] font-medium leading-[0.8] tracking-[-0.07em] text-white/[0.04] md:text-[15rem]">
          LotusBuild
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 px-6 py-5 text-xs text-gray-500 sm:flex-row sm:px-10">
          <span>© {new Date().getFullYear()} LotusBuild. All rights reserved.</span>
          <div className="flex items-center gap-5"><button type="button" onClick={openConsentSettings} className="transition-colors hover:text-[#E1E0CC]">Cookie settings</button><a href="#top" className="transition-colors hover:text-[#E1E0CC]">Back to top ↑</a></div>
        </div>
      </div>
    </footer>
  );
}
