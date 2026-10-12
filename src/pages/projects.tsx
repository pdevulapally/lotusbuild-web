import {AnimatePresence, motion} from "framer-motion";
import {ArrowUpRight, FolderPlus, LogOut, Trash2} from "lucide-react";
import {useCallback, useEffect, useState, type FormEvent} from "react";
import {Link, useNavigate} from "react-router-dom";

import {Composer} from "@/components/composer";
import {RequireAccount, type ReadyAccount} from "@/components/require-account";
import {BuildStartError, startBuild} from "@/lib/api/build";
import {ApiError} from "@/lib/api/client";
import {composerModels} from "@/lib/api/me";
import {createProject, deleteProject, listProjects, type Project} from "@/lib/api/projects";
import {auth} from "@/lib/firebase/client";
import {EASE} from "@/lib/motion";
import {checkProjectName, checkPrompt, isDocumentId, LIMITS} from "@/lib/security/validation";

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

  const token = useCallback(() => account.user.getIdToken(), [account.user]);
  const load = useCallback(async () => {
    setListing({status: "loading"});
    try { setListing({status: "ready", projects: await listProjects(await token())}); }
    catch { setListing({status: "error"}); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const limit = account.me.capabilities.find(item => item.key === "projects.max")?.value;
  const count = listing.status === "ready" ? listing.projects.length : null;
  const firstName = (account.me.displayName ?? "").trim().split(/\s+/)[0];

  async function build(prompt: string, model: string, options: Parameters<typeof startBuild>[3]) {
    const checked = checkPrompt(prompt);
    if (!checked.ok) { setBuildError(checked.error); return false; }
    setBuilding(true);
    setBuildError(null);
    try {
      const id = await startBuild(await token(), checked.value, model, options);
      navigate(`/projects/${encodeURIComponent(id)}`);
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
      navigate(`/projects/${encodeURIComponent(project.id)}`);
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

  return (
    <main className="min-h-screen bg-black" style={{color: "#E1E0CC"}}>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[30rem] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(225,224,204,0.09),transparent)]" />
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link to="/" aria-label="LotusBuild home"><img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-6 w-auto invert" /></Link>
          <nav aria-label="App" className="flex items-center gap-1 text-sm">
            <Link to="/projects" aria-current="page" className="rounded-full bg-white/[0.06] px-4 py-1.5 text-[#E1E0CC]">Projects</Link>
            <Link to="/pricing" className="rounded-full px-4 py-1.5 text-gray-400 transition-colors hover:text-[#E1E0CC]">Pricing</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-3 py-1 text-[11px] text-gray-400 sm:inline">{account.me.plan.name} plan</span>
            <span title={account.me.email} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">{(firstName || account.me.email)[0]?.toUpperCase()}</span>
            <button type="button" aria-label="Sign out" onClick={async () => { const {signOut} = await import("firebase/auth"); await signOut(auth); navigate("/", {replace: true}); }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-[#E1E0CC]">
              <LogOut aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-6xl px-6 pb-24">
        <motion.section initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, ease: EASE}} className="mx-auto max-w-3xl pt-16 text-center sm:pt-20">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</p>
          <h1 className="mt-4 text-balance text-4xl tracking-[-0.02em] sm:text-5xl">What should we build next?</h1>
          <div className="mt-8 text-left">
            <Composer size="hero" label="Describe a project to build" placeholder="Describe the app you want, e.g. a booking site for a dental clinic"
              onSubmit={build} isDisabled={building} models={composerModels(account.me)} error={buildError} />
          </div>
        </motion.section>

        <section aria-labelledby="your-projects" className="mt-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="your-projects" className="text-2xl tracking-[-0.01em]">Your projects</h2>
              {count !== null && <p className="mt-1 text-sm text-gray-500">{typeof limit === "number" ? `${count} of ${limit} on your ${account.me.plan.name} plan` : `${count} total`}</p>}
            </div>
            <form onSubmit={createBlank} noValidate className="flex flex-col gap-1 sm:items-end">
              <div className="flex gap-2">
                <input name="name" maxLength={LIMITS.projectName} aria-label="New project name" placeholder="Blank project name" aria-invalid={nameError ? true : undefined}
                  className="h-10 w-full rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm outline-none transition-colors placeholder:text-gray-600 focus:border-primary/40 sm:w-60" />
                <button type="submit" disabled={creating} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 text-sm transition-colors hover:bg-white/15 disabled:opacity-50">
                  <FolderPlus aria-hidden className="h-4 w-4" />{creating ? "Creating…" : "Create"}
                </button>
              </div>
              {nameError && <p role="alert" className="text-xs text-rose-300/80">{nameError}</p>}
            </form>
          </div>

          {notice && <p role="status" className="mt-4 text-sm text-gray-400">{notice}</p>}

          {listing.status === "loading" && (
            <div role="status" aria-label="Loading projects" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map(n => <div key={n} className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />)}
            </div>
          )}
          {listing.status === "error" && (
            <div role="alert" className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-sm text-gray-400">We couldn't load your projects.</p>
              <button type="button" onClick={() => void load()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-black">Try again</button>
            </div>
          )}
          {listing.status === "ready" && listing.projects.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-gray-500">No projects yet. Describe one above and the agent will start building it.</div>
          )}
          {listing.status === "ready" && listing.projects.length > 0 && (
            <motion.ul layout className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence initial={false}>
                {listing.projects.map((project, index) => {
                  const linkable = isDocumentId(project.id);
                  return (
                    <motion.li key={project.id} layout initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, scale: 0.96}}
                      transition={{duration: 0.5, delay: Math.min(index, 8) * 0.04, ease: EASE}}
                      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.04]">
                      {linkable
                        ? <Link to={`/projects/${encodeURIComponent(project.id)}`} className="flex h-full flex-col p-5">
                            <ProjectCardBody project={project} />
                          </Link>
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
        </section>
      </div>
    </main>
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
  return <RequireAccount>{account => <Projects account={account} />}</RequireAccount>;
}
