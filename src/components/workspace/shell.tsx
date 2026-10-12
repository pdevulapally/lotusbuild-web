import {AnimatePresence, motion} from "framer-motion";
import {CreditCard, LogOut, Trash2} from "lucide-react";
import {useCallback, useEffect, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {Link, useLocation, useNavigate} from "react-router-dom";

import type {ReadyAccount} from "@/components/require-account";
import {ApiError} from "@/lib/api/client";
import {getUsage, type UsageMeter} from "@/lib/api/me";
import {deleteProject, listProjects, type Project} from "@/lib/api/projects";
import {auth} from "@/lib/firebase/client";
import {EASE} from "@/lib/motion";
import {isDocumentId, LIMITS} from "@/lib/security/validation";
import {workspacePath} from "@/lib/workspace/slug";

type Listing = {status: "loading"} | {status: "error"} | {status: "ready"; projects: Project[]};

const AVATAR_COLORS = ["#5178ef", "#b4532a", "#3f6b4e", "#8a6d3b", "#6b5b95"];

function avatarColor(uid: string) {
  const sum = [...uid].reduce((total, character) => total + character.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("");
}

export function fullName(account: ReadyAccount) {
  return (account.me.displayName || account.user.displayName || "").trim();
}

export function errorText(failure: unknown, fallback: string) {
  if (failure instanceof ApiError) {
    if (failure.code === "auth/email-not-verified") return "Verify your email address to create projects.";
    if (failure.status === 429) return "Too many requests. Wait a moment and try again.";
    return failure.message;
  }
  return fallback;
}

export function PanelIcon({filled}: {filled?: boolean}) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2.3" />
      <path d="M5.8 2.5v11" />
      <rect x="1.5" y="2.5" width="4.3" height="11" rx="2.3" fill="currentColor" stroke="none"
        className={`transition-opacity duration-200 ${filled ? "opacity-100" : "opacity-0"}`} />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" /><path d="M12.5 12.5L16 16" />
    </svg>
  );
}

export const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-[#E1E0CC]";

function Avatar({account}: {account: ReadyAccount}) {
  if (account.user.photoURL?.startsWith("https://")) {
    return <img src={account.user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden style={{backgroundColor: avatarColor(account.me.uid)}}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white">
      {initials(fullName(account) || account.me.email)}
    </span>
  );
}

const compact = new Intl.NumberFormat("en-GB", {notation: "compact", maximumFractionDigits: 1});

function Meter({label, used, limit}: {label: string; used: number; limit: number | null}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="text-gray-400">{label}</span>
        <span className="tabular-nums text-gray-500">{compact.format(used)}{limit !== null && ` / ${compact.format(limit)}`}</span>
      </div>
      {limit !== null && limit > 0 && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div className="h-full rounded-full bg-primary" initial={{width: 0}} animate={{width: `${Math.min(100, (used / limit) * 100)}%`}} transition={{duration: 0.8, ease: EASE}} />
        </div>
      )}
    </div>
  );
}

// The menu stays short: only the metered allowances closest to their limit.
function keyMeters(meters: UsageMeter[]) {
  return meters
    .filter(meter => meter.limit !== null && meter.limit > 0)
    .map((meter, index) => ({meter, index, ratio: meter.used / (meter.limit as number)}))
    .sort((a, b) => b.ratio - a.ratio || a.index - b.index)
    .slice(0, 3)
    .map(entry => entry.meter);
}

type Usage = {status: "loading"} | {status: "error"} | {status: "ready"; meters: UsageMeter[]};

function AccountMenu({account, projectCount, isCollapsed, onSignOut}: {account: ReadyAccount; projectCount: number | null; isCollapsed: boolean; onSignOut: () => void}) {
  const [isOpen, setIsOpen] = useState(false);
  const [usage, setUsage] = useState<Usage>({status: "loading"});
  const limit = account.me.capabilities.find(item => item.key === "projects.max")?.value;
  const maxProjects = typeof limit === "number" && limit > 0 ? limit : null;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setUsage({status: "loading"});
    void (async () => {
      try {
        const meters = await getUsage(await account.user.getIdToken());
        if (!cancelled) setUsage({status: "ready", meters});
      } catch {
        if (!cancelled) setUsage({status: "error"});
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, account.user]);

  const item = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-gray-300 transition-colors hover:bg-white/[0.05] hover:text-[#E1E0CC]";

  return (
    <div className="relative"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
      onKeyDown={event => { if (event.key === "Escape") setIsOpen(false); }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div role="menu" initial={{opacity: 0, y: 8, scale: 0.98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: 8, scale: 0.98}} transition={{duration: 0.22, ease: EASE}}
            className={`absolute bottom-full z-20 mb-3 origin-bottom-left overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414]/95 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)] backdrop-blur-2xl ${isCollapsed ? "left-0 w-72" : "inset-x-0"}`}>
            <div className="flex items-center gap-3 p-4">
              <Avatar account={account} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-[#E1E0CC]">{fullName(account) || account.username}</p>
                <p className="truncate text-[12px] text-gray-500">{account.me.email}</p>
              </div>
              <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{account.me.plan.name}</span>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4">
              {projectCount !== null && <Meter label="Projects" used={projectCount} limit={maxProjects} />}
              {usage.status === "loading" && [0, 1].map(n => <span key={n} className="h-3 animate-pulse rounded bg-white/[0.06]" />)}
              {usage.status === "error" && <p className="text-[12px] text-gray-500">Usage couldn't be loaded.</p>}
              {usage.status === "ready" && keyMeters(usage.meters).map(meter => <Meter key={meter.meterKey} label={meter.label} used={meter.used} limit={meter.limit} />)}
              <Link to="/pricing" role="menuitem" className="mt-1 flex h-9 items-center justify-center rounded-full bg-primary text-[13px] font-medium text-black transition-opacity hover:opacity-90">
                Upgrade plan
              </Link>
            </div>

            <div className="flex flex-col gap-0.5 border-t border-white/[0.06] p-2">
              <Link to="/pricing" role="menuitem" className={item}><CreditCard aria-hidden className="h-4 w-4 text-gray-500" /> Plans and billing</Link>
              <button type="button" role="menuitem" onClick={onSignOut} className={`${item} text-left`}><LogOut aria-hidden className="h-4 w-4 text-gray-500" /> Sign out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" aria-haspopup="menu" aria-expanded={isOpen} aria-label="Account" onClick={() => setIsOpen(open => !open)}
        className={isCollapsed
          ? "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/[0.06]"
          : `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-white/[0.04] ${isOpen ? "bg-white/[0.04]" : ""}`}>
        <Avatar account={account} />
        {!isCollapsed && (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] leading-snug text-[#E1E0CC]">{fullName(account) || account.username}</span>
            <span className="text-[12px] text-gray-500">{account.me.plan.name} plan</span>
          </span>
        )}
      </button>
    </div>
  );
}

function CommandPalette({isOpen, onClose, username, projects}: {isOpen: boolean; onClose: () => void; username: string; projects: Project[]}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = projects.filter(project => isDocumentId(project.id) && project.name.toLowerCase().includes(needle));
  useEffect(() => { if (!isOpen) setQuery(""); }, [isOpen]);
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.2, ease: EASE}}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[18vh] backdrop-blur-sm" onMouseDown={onClose}>
          <motion.div role="dialog" aria-label="Search projects" initial={{opacity: 0, y: 12, scale: 0.98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: 8, scale: 0.98}}
            transition={{duration: 0.3, ease: EASE}} onMouseDown={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") onClose(); }}
            className="flex w-full max-w-xl flex-col gap-3 rounded-3xl border border-white/[0.08] bg-[#1d1c1a]/90 p-4 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-gray-500">
              <SearchIcon />
              <input autoFocus type="search" value={query} maxLength={LIMITS.projectName} onChange={event => setQuery(event.target.value)} placeholder="Search projects"
                className="w-full bg-transparent text-[15px] text-[#E1E0CC] outline-none placeholder:text-gray-600" />
              <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-gray-500 sm:block">Esc</kbd>
            </div>
            <div className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto">
              {matches.length > 0
                ? matches.map(project => (
                  <Link key={project.id} to={workspacePath(username, project.id)} onClick={onClose}
                    className="truncate rounded-xl px-4 py-2.5 text-[14px] text-gray-300 transition-colors hover:bg-white/[0.05] hover:text-[#E1E0CC]">{project.name}</Link>
                ))
                : <p className="px-4 py-2.5 text-[14px] text-gray-600">{projects.length ? "No results." : "No projects yet."}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProjectRow({project, href, isActive, onDelete, onNavigate}: {project: Project; href: string; isActive: boolean; onDelete: () => Promise<void>; onNavigate: () => void}) {
  const [menu, setMenu] = useState<"closed" | "open" | "confirming">("closed");
  const [deleting, setDeleting] = useState(false);
  const [position, setPosition] = useState<{left: number; top: number} | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menu !== "open") { setPosition(null); return; }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPosition({left: Math.min(rect.right + 10, window.innerWidth - 220), top: Math.min(rect.top, window.innerHeight - 52)});
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setMenu("closed");
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu("closed"); };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);

  return (
    <li className="group relative">
      <Link to={href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={`flex items-center rounded-lg py-2 pl-3 pr-9 transition-colors duration-150 hover:bg-white/[0.05] hover:text-[#E1E0CC] ${isActive ? "bg-white/[0.06] text-[#E1E0CC]" : "text-gray-400"}`}>
        <span className="truncate text-[13px] leading-snug">{project.name}</span>
      </Link>
      <button ref={triggerRef} type="button" aria-label={`Actions for ${project.name}`} aria-haspopup="menu" aria-expanded={menu !== "closed"}
        onClick={() => setMenu(state => (state === "closed" ? "open" : "closed"))}
        className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-[#E1E0CC] ${menu === "closed" ? "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" : ""}`}>
        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.1" /><circle cx="7" cy="7" r="1.1" /><circle cx="11" cy="7" r="1.1" /></svg>
      </button>

      {menu === "open" && position && createPortal(
        <div ref={menuRef} role="menu" style={position} className="fixed z-50 w-52 rounded-xl border border-white/[0.08] bg-[#141414] p-1.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.7)]">
          <button type="button" role="menuitem" onClick={() => setMenu("confirming")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[#E1E0CC] transition-colors hover:bg-white/[0.05]">
            <Trash2 aria-hidden className="h-[15px] w-[15px] text-gray-500" /> Delete project
          </button>
        </div>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {menu === "confirming" && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.2, ease: EASE}}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onMouseDown={() => !deleting && setMenu("closed")}>
              <motion.div role="alertdialog" aria-modal aria-labelledby={`delete-${project.id}`} initial={{opacity: 0, y: 12, scale: 0.98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: 8, scale: 0.98}}
                transition={{duration: 0.3, ease: EASE}} onMouseDown={event => event.stopPropagation()}
                className="w-full max-w-[440px] rounded-3xl border border-white/[0.08] bg-[#1d1c1a] p-6">
                <h2 id={`delete-${project.id}`} className="text-lg text-[#E1E0CC]">Delete this project?</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">“{project.name}” and its entire conversation history will be permanently removed. This can't be undone.</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" disabled={deleting} onClick={() => setMenu("closed")} className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-[#E1E0CC] transition-colors hover:bg-white/5">Cancel</button>
                  <button type="button" disabled={deleting} onClick={async () => { setDeleting(true); await onDelete(); setDeleting(false); setMenu("closed"); }}
                    className="rounded-full bg-rose-400/90 px-5 py-2.5 text-sm font-medium text-black disabled:opacity-60">{deleting ? "Deleting…" : "Delete project"}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </li>
  );
}

type SidebarProps = {
  account: ReadyAccount;
  activeProjectId?: string;
  listing: Listing;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: () => void;
  onNewProject: () => void;
  onDelete: (project: Project) => Promise<void>;
  onRetry: () => void;
  onSignOut: () => void;
};

function Sidebar({account, activeProjectId, listing, isOpen, onOpenChange, onSearch, onNewProject, onDelete, onRetry, onSignOut}: SidebarProps) {
  const [isListOpen, setIsListOpen] = useState(true);
  const closeOnMobile = () => { if (window.matchMedia("(max-width: 767px)").matches) onOpenChange(false); };
  const projects = listing.status === "ready" ? [...listing.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  return (
    <aside className={`fixed bottom-3 left-0 top-3 z-40 ml-3 flex w-[min(18rem,calc(100vw-1.5rem))] min-w-0 flex-col gap-5 rounded-[28px] border border-white/[0.06] bg-[#0e0e0e] p-4 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:sticky md:bottom-auto md:top-3 md:h-[calc(100vh-1.5rem)] md:w-auto ${
      isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)] md:translate-x-0 md:items-center"}`}>
      <div className={`flex items-center gap-2 ${isOpen ? "justify-between" : "flex-col"}`}>
        <Link to="/" onClick={closeOnMobile} aria-label="LotusBuild home" className={`flex w-fit items-center pl-1 ${isOpen ? "" : "hidden"}`}>
          <img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-6 w-auto invert" />
        </Link>
        <div className={`flex items-center gap-1 ${isOpen ? "" : "flex-col gap-2"}`}>
          <button type="button" onClick={onSearch} aria-label="Search projects" className={iconButton}><SearchIcon /></button>
          <button type="button" aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={isOpen} onClick={() => onOpenChange(!isOpen)} className={iconButton}>
            <PanelIcon filled={isOpen} />
          </button>
        </div>
      </div>

      <button type="button" aria-label="New project" onClick={() => { closeOnMobile(); onNewProject(); }}
        className={isOpen
          ? "flex items-center gap-3 rounded-full bg-primary px-4 py-2.5 text-[14px] font-medium text-black transition-opacity duration-200 hover:opacity-90"
          : iconButton}>
        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg>
        {isOpen && <span>New project</span>}
      </button>

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        {isOpen && (
          <>
            <button type="button" onClick={() => setIsListOpen(open => !open)} aria-expanded={isListOpen}
              className="flex items-center gap-1.5 px-1 text-[13px] text-gray-500 transition-colors duration-150 hover:text-[#E1E0CC]">
              <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${isListOpen ? "" : "-rotate-90"}`}><path d="M3 4.5l3 3 3-3" /></svg>
              Projects
            </button>
            {isListOpen && (
              <>
                {listing.status === "loading" && [0, 1, 2].map(n => <span key={n} className="mx-3 my-1.5 h-3 animate-pulse rounded bg-white/[0.06]" />)}
                {listing.status === "error" && (
                  <p className="px-1 text-[13px] text-gray-500">Could not load your projects. <button type="button" onClick={onRetry} className="text-primary hover:opacity-80">Retry</button></p>
                )}
                {listing.status === "ready" && projects.length === 0 && <p className="px-1 text-[13px] text-gray-600">No projects yet.</p>}
                <ul className="flex flex-col gap-0.5 overflow-y-auto">
                  {projects.map(project => isDocumentId(project.id) && (
                    <ProjectRow key={project.id} project={project} href={workspacePath(account.username, project.id)} isActive={project.id === activeProjectId} onDelete={() => onDelete(project)} onNavigate={closeOnMobile} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <AccountMenu account={account} projectCount={listing.status === "ready" ? listing.projects.length : null} isCollapsed={!isOpen} onSignOut={onSignOut} />
    </aside>
  );
}

type ShellProps = {
  account: ReadyAccount;
  activeProjectId?: string;
  /** Bumped by a page when it knows the project list changed. */
  refreshKey?: number;
  /** Pages that render their own top bar get the mobile sidebar opener instead of the default bar. */
  children: ReactNode | ((controls: {openSidebar: () => void}) => ReactNode);
};

// Shared chrome for every workspace page: the collapsible sidebar (same
// pattern as the Next.js workspace), project search and the account menu.
export function WorkspaceShell({account, activeProjectId, refreshKey = 0, children}: ShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState<Listing>({status: "loading"});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const sync = (event?: MediaQueryListEvent) => setIsSidebarOpen(event?.matches ?? desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(open => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const load = useCallback(async () => {
    try { setListing({status: "ready", projects: await listProjects(await account.user.getIdToken())}); }
    catch { setListing(previous => previous.status === "ready" ? previous : {status: "error"}); }
  }, [account.user]);
  useEffect(() => { void load(); }, [load, location.pathname, refreshKey]);

  async function signOutNow() {
    const {signOut} = await import("firebase/auth");
    await signOut(auth);
    navigate("/", {replace: true});
  }

  async function remove(project: Project) {
    await deleteProject(await account.user.getIdToken(), project.id);
    setListing(previous => previous.status === "ready" ? {status: "ready", projects: previous.projects.filter(item => item.id !== project.id)} : previous);
    if (project.id === activeProjectId) navigate(workspacePath(account.username), {replace: true});
  }

  function newProject() {
    const home = workspacePath(account.username);
    if (location.pathname !== home) navigate(home);
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>("main textarea")?.focus(), 300);
  }

  const ownBar = typeof children === "function";

  return (
    <div className="relative isolate h-[100dvh] overflow-hidden bg-[#131211]" style={{color: "#E1E0CC"}}>
      <div className={`relative grid h-full grid-cols-[minmax(0,1fr)] ${isSidebarOpen ? "md:grid-cols-[18rem_minmax(0,1fr)]" : "md:grid-cols-[5rem_minmax(0,1fr)]"}`}>
        <Sidebar account={account} activeProjectId={activeProjectId} listing={listing} isOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}
          onSearch={() => setIsSearchOpen(true)} onRetry={() => void load()} onSignOut={() => void signOutNow()} onNewProject={newProject}
          onDelete={async project => {
            try { await remove(project); }
            catch (failure) { window.alert(errorText(failure, `We couldn't delete “${project.name}”. Try again.`)); }
          }} />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div key="scrim" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.3, ease: EASE}}
              onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" />
          )}
        </AnimatePresence>

        <div className="flex min-h-0 min-w-0 flex-col">
          {!ownBar && (
            <div className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#131211]/90 px-4 backdrop-blur-xl md:hidden">
              <button type="button" aria-label="Open sidebar" aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(true)} className={iconButton}>
                <PanelIcon />
              </button>
              <img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-6 w-auto invert" />
            </div>
          )}
          <main className="relative flex min-h-0 flex-1 flex-col">
            {typeof children === "function" ? children({openSidebar: () => setIsSidebarOpen(true)}) : children}
          </main>
        </div>
      </div>

      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} username={account.username} projects={listing.status === "ready" ? listing.projects : []} />
    </div>
  );
}
