import {AnimatePresence, motion} from "framer-motion";
import {ArrowUpRight, CreditCard, FolderPlus, LayoutGrid, LogOut, Menu, Plus, Search, Trash2, X} from "lucide-react";
import {useCallback, useEffect, useMemo, useState, type FormEvent} from "react";
import {Link, useNavigate} from "react-router-dom";

import {Composer} from "@/components/composer";
import {RequireOwnWorkspace, type ReadyAccount} from "@/components/require-account";
import {BuildStartError, startBuild} from "@/lib/api/build";
import {ApiError} from "@/lib/api/client";
import {composerModels} from "@/lib/api/me";
import {createProject, deleteProject, listProjects, type Project} from "@/lib/api/projects";
import {auth} from "@/lib/firebase/client";
import {EASE} from "@/lib/motion";
import {checkProjectName, checkPrompt, isDocumentId, LIMITS} from "@/lib/security/validation";
import {workspacePath} from "@/lib/workspace/slug";

type Listing = {status: "loading"} | {status: "error"} | {status: "ready"; projects: Project[]};

function errorText(failure: unknown, fallback: string) {
  if (failure instanceof ApiError) {
    if (failure.code === "auth/email-not-verified") return "Verify your email address to create projects.";
    if (failure.status === 429) return "Too many requests. Wait a moment and try again.";
    return failure.message;
  }
  return fallback;
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"});
}

function greeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function focusComposer() {
  window.scrollTo({top: 0, behavior: "smooth"});
  window.setTimeout(() => document.querySelector<HTMLTextAreaElement>("main textarea")?.focus(), 300);
}

type SidebarProps = {
  account: ReadyAccount;
  listing: Listing;
  limit: unknown;
  onNavigate?: () => void;
  onSignOut: () => void;
};

function Sidebar({account, listing, limit, onNavigate, onSignOut}: SidebarProps) {
  const name = (account.me.displayName || account.user.displayName || "").trim() || account.me.email;
  const count = listing.status === "ready" ? listing.projects.length : null;
  const max = typeof limit === "number" && limit > 0 ? limit : null;
  const recent = listing.status === "ready" ? listing.projects.slice(0, 8) : [];

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link to="/" onClick={onNavigate} aria-label="LotusBuild home" className="flex items-center px-2">
        <img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-6 w-auto invert" />
      </Link>

      <button type="button" onClick={() => { onNavigate?.(); focusComposer(); }}
        className="group mt-7 flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-black transition-all duration-300 hover:gap-3">
        <Plus aria-hidden className="h-4 w-4" /> New build
      </button>

      <nav aria-label="Workspace" className="mt-6 flex flex-col gap-0.5 text-sm">
        <Link to={workspacePath(account.username)} onClick={onNavigate} aria-current="page"
          className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2 text-[#E1E0CC]">
          <LayoutGrid aria-hidden className="h-4 w-4 text-primary" /> Projects
        </Link>
        <Link to="/pricing" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-400 transition-colors duration-300 hover:bg-white/[0.04] hover:text-[#E1E0CC]">
          <CreditCard aria-hidden className="h-4 w-4" /> Plans and billing
        </Link>
      </nav>

      <p className="mt-8 px-3 text-[11px] text-gray-600">Recent</p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto text-[13px]">
        {listing.status === "loading" && [0, 1, 2].map(n => <span key={n} className="mx-3 my-1.5 h-3 animate-pulse rounded bg-white/[0.06]" />)}
        {listing.status === "ready" && recent.length === 0 && <p className="px-3 py-1.5 text-gray-600">No projects yet</p>}
        {recent.map(project => isDocumentId(project.id) && (
          <Link key={project.id} to={workspacePath(account.username, project.id)} onClick={onNavigate}
            className="truncate rounded-lg px-3 py-1.5 text-gray-400 transition-colors duration-300 hover:bg-white/[0.04] hover:text-[#E1E0CC]">
            {project.name}
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#E1E0CC]">{account.me.plan.name} plan</span>
          <Link to="/pricing" onClick={onNavigate} className="text-primary transition-opacity hover:opacity-80">Compare plans</Link>
        </div>
        {count !== null && max !== null && (
          <>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full rounded-full bg-primary" initial={{width: 0}} animate={{width: `${Math.min(100, (count / max) * 100)}%`}} transition={{duration: 0.9, ease: EASE}} />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">{count} of {max} projects used</p>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl px-2 py-2">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/5 text-sm text-primary">
          {name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-[#E1E0CC]">{name}</p>
          <p className="truncate text-[11px] text-gray-500">{account.me.email}</p>
        </div>
        <button type="button" aria-label="Sign out" onClick={onSignOut}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-[#E1E0CC]">
          <LogOut aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Projects({account}: {account: ReadyAccount}) {
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing>({status: "loading"});
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);

  const token = useCallback(() => account.user.getIdToken(), [account.user]);
  const load = useCallback(async () => {
    setListing({status: "loading"});
    try { setListing({status: "ready", projects: await listProjects(await token())}); }
    catch { setListing({status: "error"}); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const limit = account.me.capabilities.find(item => item.key === "projects.max")?.value;
  const firstName = (account.me.displayName || account.user.displayName || "").trim().split(/\s+/)[0];
  const hello = greeting(new Date().getHours());
  const visible = useMemo(() => {
    if (listing.status !== "ready") return [];
    const needle = query.trim().toLowerCase();
    return needle ? listing.projects.filter(p => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(needle)) : listing.projects;
  }, [listing, query]);

  async function signOutNow() {
    const {signOut} = await import("firebase/auth");
    await signOut(auth);
    navigate("/", {replace: true});
  }

  async function build(prompt: string, model: string, options: Parameters<typeof startBuild>[3]) {
    const checked = checkPrompt(prompt);
    if (!checked.ok) { setBuildError(checked.error); return false; }
    setBuilding(true);
    setBuildError(null);
    try {
      const id = await startBuild(await token(), checked.value, model, options);
      navigate(workspacePath(account.username, id));
    } catch (failure) {
      setBuildError(failure instanceof BuildStartError ? failure.message : errorText(failure, "We couldn't confirm the build. Check your projects before trying again."));
      setBuilding(false);
      void load();
      return false;
    }
  }

  async function createBlank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = checkProjectName(String(new FormData(event.currentTarget).get("name") ?? ""));
    if (!name.ok) { setNameError(name.error); return; }
    setNameError(null);
    setCreating(true);
    try {
      const project = await createProject(await token(), {name: name.value});
      navigate(workspacePath(account.username, project.id));
    } catch (failure) {
      setNameError(errorText(failure, "We couldn't create the project. Try again."));
      setCreating(false);
    }
  }

  async function remove(project: Project) {
    setDeleting(project.id);
    setNotice(null);
    try {
      await deleteProject(await token(), project.id);
      setListing(previous => previous.status === "ready" ? {status: "ready", projects: previous.projects.filter(item => item.id !== project.id)} : previous);
      setNotice(`Deleted ${project.name}.`);
    } catch (failure) {
      setNotice(errorText(failure, `We couldn't delete ${project.name}. Try again.`));
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  const sidebar = {account, listing, limit, onSignOut: () => void signOutNow()};

  return (
    <div className="min-h-screen bg-[#070707]" style={{color: "#E1E0CC"}}>
      <motion.aside initial={{opacity: 0, x: -12}} animate={{opacity: 1, x: 0}} transition={{duration: 0.6, ease: EASE}}
        className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-white/[0.06] bg-[#0b0b0b] lg:block">
        <Sidebar {...sidebar} />
      </motion.aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div key="scrim" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.3, ease: EASE}}
              onClick={() => setDrawer(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />
            <motion.aside key="drawer" role="dialog" aria-label="Workspace menu" initial={{x: "-100%"}} animate={{x: 0}} exit={{x: "-100%"}} transition={{duration: 0.45, ease: EASE}}
              className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] border-r border-white/[0.06] bg-[#0b0b0b] lg:hidden">
              <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/5">
                <X aria-hidden className="h-4 w-4" />
              </button>
              <Sidebar {...sidebar} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.05] bg-[#070707]/80 px-4 backdrop-blur-xl sm:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white/5 lg:hidden">
            <Menu aria-hidden className="h-4 w-4" />
          </button>
          <p className="truncate text-[13px] text-gray-500"><span className="text-gray-400">{account.username}</span> <span className="px-1 text-gray-700">/</span> Projects</p>
          <label className="ml-auto flex h-9 w-full max-w-[260px] items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 text-sm transition-colors focus-within:border-primary/40">
            <Search aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value.slice(0, LIMITS.projectName))} placeholder="Search projects" aria-label="Search projects"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-gray-600" />
          </label>
        </header>

        <main className="relative mx-auto max-w-5xl px-4 pb-24 sm:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(50%_70%_at_50%_0%,rgba(225,224,204,0.07),transparent)]" />
          <motion.section initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, delay: 0.1, ease: EASE}} className="relative pt-14 sm:pt-20">
            <h1 className="text-3xl tracking-[-0.02em] sm:text-4xl">{firstName ? `${hello}, ${firstName}` : hello}</h1>
            <p className="mt-2 text-[15px] text-gray-500">What should we build today?</p>
            <div className="mt-7">
              <Composer size="hero" label="Describe a project to build" placeholder="Describe the app you want, e.g. a booking site for a dental clinic"
                onSubmit={build} isDisabled={building} models={composerModels(account.me)} error={buildError} />
            </div>
          </motion.section>

          <motion.section initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, delay: 0.2, ease: EASE}} aria-labelledby="your-projects" className="relative mt-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="your-projects" className="text-xl tracking-[-0.01em]">Your projects</h2>
                {listing.status === "ready" && <p className="mt-1 text-[13px] text-gray-500">{query ? `${visible.length} matching` : `${listing.projects.length} in total`}</p>}
              </div>
              <form onSubmit={createBlank} noValidate className="flex flex-col gap-1 sm:items-end">
                <div className="flex gap-2">
                  <input name="name" maxLength={LIMITS.projectName} aria-label="New project name" placeholder="Blank project name" aria-invalid={nameError ? true : undefined}
                    className="h-9 w-full rounded-full border border-white/[0.07] bg-white/[0.03] px-4 text-[13px] outline-none transition-colors placeholder:text-gray-600 focus:border-primary/40 sm:w-56" />
                  <button type="submit" disabled={creating} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[13px] transition-colors hover:bg-white/[0.12] disabled:opacity-50">
                    <FolderPlus aria-hidden className="h-3.5 w-3.5" />{creating ? "Creating…" : "Create"}
                  </button>
                </div>
                {nameError && <p role="alert" className="text-xs text-rose-300/80">{nameError}</p>}
              </form>
            </div>

            {notice && <p role="status" className="mt-4 text-sm text-gray-400">{notice}</p>}

            {listing.status === "loading" && (
              <div role="status" aria-label="Loading projects" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map(n => <div key={n} className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />)}
              </div>
            )}
            {listing.status === "error" && (
              <div role="alert" className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                <p className="text-sm text-gray-400">We couldn't load your projects.</p>
                <button type="button" onClick={() => void load()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-black">Try again</button>
              </div>
            )}
            {listing.status === "ready" && visible.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-gray-500">
                {query ? "No projects match your search." : "No projects yet. Describe one above and the agent will start building it."}
              </div>
            )}
            {visible.length > 0 && (
              <motion.ul layout className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {visible.map((project, index) => {
                    const linkable = isDocumentId(project.id);
                    return (
                      <motion.li key={project.id} layout initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, scale: 0.96}}
                        transition={{duration: 0.5, delay: Math.min(index, 8) * 0.04, ease: EASE}}
                        className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.04]">
                        {linkable
                          ? <Link to={workspacePath(account.username, project.id)} className="flex h-full flex-col p-5"><ProjectCardBody project={project} /></Link>
                          : <div className="flex h-full flex-col p-5 opacity-60"><ProjectCardBody project={project} /></div>}
                        <button type="button" aria-label={`Delete ${project.name}`} onClick={() => setConfirming(project.id)}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 opacity-0 transition-all hover:bg-white/5 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100">
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {confirming === project.id && (
                            <motion.div role="alertdialog" aria-label={`Delete ${project.name}?`} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.25, ease: EASE}}
                              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-5 text-center backdrop-blur-sm">
                              <p className="text-sm">Delete <span className="text-primary">{project.name}</span>? This can't be undone.</p>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirming(null)} className="rounded-full border border-white/15 px-4 py-2 text-xs transition-colors hover:bg-white/5">Cancel</button>
                                <button type="button" disabled={deleting === project.id} onClick={() => void remove(project)} className="rounded-full bg-rose-400/90 px-4 py-2 text-xs font-medium text-black disabled:opacity-50">
                                  {deleting === project.id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            )}
          </motion.section>
        </main>
      </div>
    </div>
  );
}

function ProjectCardBody({project}: {project: Project}) {
  return (
    <>
      <div className="flex items-center gap-2 pr-8 text-[11px] text-gray-500">
        <span className="rounded-full bg-white/5 px-2 py-0.5 capitalize">{project.platform.toLowerCase()}</span>
        <span className="capitalize">{project.status.toLowerCase()}</span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-[15px] text-[#E1E0CC]">{project.name}</h3>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-gray-500">{project.description || "No description"}</p>
      <div className="mt-auto flex items-center justify-between pt-6 text-[11px] text-gray-600">
        <span>{date(project.createdAt)}</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return <RequireOwnWorkspace>{account => <Projects account={account} />}</RequireOwnWorkspace>;
}
