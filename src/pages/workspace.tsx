import {AnimatePresence, motion} from "framer-motion";
import {CornerDownRight, FolderGit2, GitBranch, History as HistoryIcon, Monitor, PanelRightClose, X} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";
import {Link, useParams} from "react-router-dom";

import {Composer, type ComposerOptions} from "@/components/composer";
import type {ReadyAccount} from "@/components/require-account";
import {ChangesPanel} from "@/components/workspace/changes-panel";
import {DesktopPanel} from "@/components/workspace/desktop-panel";
import {FilesPanel} from "@/components/workspace/files-panel";
import {parsePlan, PlanTool} from "@/components/workspace/plan-tool";
import {ShareMenu} from "@/components/workspace/share-menu";
import {UserMessage} from "@/components/workspace/user-message";
import {Markdown, RunActivity} from "@/components/workspace/run-activity";
import {errorText, iconButton, PanelIcon, WorkspaceShell} from "@/components/workspace/shell";
import {ApiError} from "@/lib/api/client";
import {composerModels} from "@/lib/api/me";
import {getProject, getProjectFile, getProjectTree, type Project, type ProjectTree} from "@/lib/api/projects";
import {readSessionEvents, StreamClosedError} from "@/lib/api/session-events";
import {cancelSession, createSession, deleteQueuedMessage, listMessages, listQueuedMessages, listSessions, sendFollowUp, type Message, type QueuedMessage, type Session} from "@/lib/api/sessions";
import {EASE} from "@/lib/motion";
import {checkPrompt} from "@/lib/security/validation";
import {initialActivity, reduceActivity, type Activity} from "@/lib/workspace/activity";
import {workspacePath} from "@/lib/workspace/slug";

type Loaded = {status: "loading"} | {status: "missing"} | {status: "error"; message: string} | {status: "ready"; project: Project};

const isLive = (session: Session | null) => session?.status === "RUNNING" || session?.status === "QUEUED";

function Workspace({account, projectId}: {account: ReadyAccount; projectId: string}) {
  const [loaded, setLoaded] = useState<Loaded>({status: "loading"});
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [queued, setQueued] = useState<QueuedMessage[]>([]);
  const [queueBusy, setQueueBusy] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity>(initialActivity);
  const [desktopReady, setDesktopReady] = useState(false);
  const [stream, setStream] = useState<"idle" | "live" | "reconnecting">("idle");
  const [stopping, setStopping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showDesktop, setShowDesktop] = useState(true);
  const [approving, setApproving] = useState(false);
  const [pane, setPane] = useState<"files" | "changes" | "desktop">("desktop");
  const [tab, setTab] = useState<"chat" | "files" | "changes" | "desktop">("chat");
  const [branch, setBranch] = useState<string | undefined>();
  const [tree, setTree] = useState<{status: "loading"} | {status: "error"; message: string} | {status: "ready"; value: ProjectTree}>({status: "loading"});
  const [refreshKey, setRefreshKey] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const token = useCallback(() => account.user.getIdToken(), [account.user]);

  const [runs, setRuns] = useState<Session[]>([]);
  const [pickedRun, setPickedRun] = useState<string | null>(null);
  useEffect(() => setPickedRun(null), [projectId]);

  const refresh = useCallback(async () => {
    const auth = await token();
    const project = await getProject(auth, projectId);
    const all = [...await listSessions(auth, projectId)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = pickedRun === "new" ? null : all.find(item => item.id === pickedRun) ?? all[0] ?? null;
    setRuns(all);
    const [history, waiting] = latest ? await Promise.all([listMessages(auth, latest.id), listQueuedMessages(auth, latest.id)]) : [[], []];
    setLoaded({status: "ready", project});
    setSession(latest);
    setMessages([...history].sort((a, b) => a.seq - b.seq));
    setQueued(waiting);
  }, [projectId, token, pickedRun]);

  useEffect(() => {
    if (session) setRuns(list => list.some(item => item.id === session.id) ? list.map(item => item.id === session.id ? session : item) : [session, ...list]);
  }, [session]);

  useEffect(() => {
    setLoaded({status: "loading"});
    setActivity(initialActivity);
    setDesktopReady(false);
    refresh().catch(failure => setLoaded(failure instanceof ApiError && failure.status === 404
      ? {status: "missing"} : {status: "error", message: errorText(failure, "We couldn't load this project.")}));
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setTree({status: "loading"});
    token().then(auth => getProjectTree(auth, projectId, branch)).then(value => !cancelled && setTree({status: "ready", value}),
      failure => !cancelled && setTree({status: "error", message: errorText(failure, "Project files couldn't be loaded.")}));
    return () => { cancelled = true; };
  }, [projectId, branch, token, activity.save, session?.status]);
  const loadFile = useCallback(async (path: string) => getProjectFile(await token(), projectId, path, branch), [token, projectId, branch]);

  const sessionId = session?.id ?? null;
  const live = isLive(session);
  useEffect(() => {
    if (!sessionId || !live) { setStream("idle"); return; }
    const controller = new AbortController();
    let lastId: string | undefined;
    void (async () => {
      for (let attempt = 0; !controller.signal.aborted; attempt++) {
        try {
          await readSessionEvents(await token(), sessionId, controller.signal, event => {
            lastId = event.id;
            attempt = 0;
            setActivity(state => reduceActivity(state, event));
            if (event.type === "desktop.ready") setDesktopReady(true);
            if (["session.idle", "session.failed"].includes(event.type)) {
              setDesktopReady(false);
              setStopping(false);
              void refresh();
            }
          }, () => setStream("live"), lastId);
        } catch (failure) {
          if (controller.signal.aborted) return;
          if (failure instanceof StreamClosedError) { void refresh(); return; }
          setStream("reconnecting");
          await new Promise(resolve => window.setTimeout(resolve, Math.min(10_000, 1000 * 2 ** attempt)));
        }
      }
    })();
    return () => controller.abort();
  }, [sessionId, live, token, refresh]);

  useEffect(() => {
    const element = scroller.current;
    if (element && pinned.current) element.scrollTo({top: element.scrollHeight, behavior: "smooth"});
  }, [messages, activity, queued]);

  const working = live && activity.phase !== "finished" && activity.phase !== "failed";

  async function submit(prompt: string, model: string, options: ComposerOptions) {
    const checked = checkPrompt(prompt);
    if (!checked.ok) { setSendError(checked.error); return false; }
    setSendError(null);
    pinned.current = true;
    const echo = (content: string): Message => ({seq: Number.MAX_SAFE_INTEGER - messages.length, role: "user", content, createdAt: new Date().toISOString()});
    try {
      if (!session) {
        const {steer: _steer, ...settings} = options;
        const created = await createSession(await token(), projectId, {prompt: checked.value, model, ...settings});
        setActivity(initialActivity);
        setMessages([echo(checked.value)]);
        setSession(created);
        return;
      }
      const result = await sendFollowUp(await token(), session.id, checked.value, options.steer === true);
      if ("steered" in result) setMessages(list => [...list, echo(checked.value)]);
      else if (result.queued) setQueued(list => [...list, result.queuedMessage]);
      else {
        setActivity(initialActivity);
        setMessages(list => [...list, echo(checked.value)]);
        setSession(result.session);
      }
    } catch (failure) {
      setSendError(errorText(failure, "We couldn't confirm your message. Check the conversation before sending again."));
      return false;
    }
  }

  async function removeQueued(id: string) {
    if (!session) return;
    setQueueBusy(id); setSendError(null);
    try {
      await deleteQueuedMessage(await token(), session.id, id);
      setQueued(list => list.filter(item => item.id !== id));
    } catch (failure) {
      setSendError(errorText(failure, "That message couldn't be removed. Try again."));
    } finally { setQueueBusy(null); }
  }

  // Steering sends a queued message into the current run, then drops it from the queue.
  async function steerQueued(item: QueuedMessage) {
    if (!session) return;
    setQueueBusy(item.id); setSendError(null);
    try {
      const auth = await token();
      const result = await sendFollowUp(auth, session.id, item.prompt, true);
      if (!("steered" in result) && result.queued) {
        await deleteQueuedMessage(auth, session.id, result.queuedMessage.id);
        setSendError("The agent hasn't started yet. This message will run next.");
        return;
      }
      await deleteQueuedMessage(auth, session.id, item.id).catch(() => undefined);
      setQueued(list => list.filter(entry => entry.id !== item.id));
      pinned.current = true;
      setMessages(list => [...list, {seq: Number.MAX_SAFE_INTEGER - list.length, role: "user", content: item.prompt, createdAt: new Date().toISOString()}]);
      if (!("steered" in result)) { setActivity(initialActivity); setSession(result.session); }
    } catch (failure) {
      setSendError(errorText(failure, "Couldn't steer with that message. Try again."));
    } finally { setQueueBusy(null); }
  }

  // Approving switches this session to Build for its next turn, keeping the conversation together.
  async function approvePlan(plan: string) {
    if (!session) return;
    const checked = checkPrompt(`Implement this approved plan:\n\n${plan}`);
    if (!checked.ok) { setSendError(checked.error); return; }
    setApproving(true); setSendError(null);
    try {
      const result = await sendFollowUp(await token(), session.id, checked.value, false, "build");
      if ("steered" in result || result.queued) { setSendError("The agent is still busy. Approve again once it finishes."); return; }
      pinned.current = true;
      setActivity(initialActivity);
      setMessages(list => [...list, {seq: Number.MAX_SAFE_INTEGER - list.length, role: "user", content: checked.value, createdAt: new Date().toISOString()}]);
      setSession(result.session);
    } catch (failure) {
      setSendError(errorText(failure, "The build couldn't start. Try again."));
    } finally { setApproving(false); }
  }

  async function stop() {
    if (!session) return;
    setStopping(true);
    try { await cancelSession(await token(), session.id); }
    catch (failure) { setStopping(false); setSendError(errorText(failure, "We couldn't stop the agent. Try again.")); }
  }

  const lastUser = messages.map(message => message.role).lastIndexOf("user");
  const lastAssistant = messages.map(message => message.role).lastIndexOf("assistant");
  const runVisible = activity.entries.length > 0 || working || activity.phase === "failed";
  const project = loaded.status === "ready" ? loaded.project : null;

  // Undo is carried out by the agent in the project's sandbox, as a normal follow-up the user can see.
  const undoChange = (commit: {sha: string}) => {
    if (!session || working) return;
    void submit(`Undo the changes saved in version ${commit.sha.slice(0, 12)}: run \`git revert --no-edit ${commit.sha}\`, resolve any conflicts, and tell me what was reverted.`, session.model, {mode: "build"});
  };
  const changesPanel = <ChangesPanel projectId={projectId} token={token} refreshKey={refreshKey + messages.length} canUndo={!!session && !working} onUndo={undoChange} />;

  return (
    <WorkspaceShell account={account} activeProjectId={projectId} refreshKey={refreshKey}>
      {({openSidebar}) => (
        <>
          <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#131211]/80 px-3 backdrop-blur-xl sm:px-5">
            <button type="button" aria-label="Open sidebar" onClick={openSidebar} className={`${iconButton} md:hidden`}><PanelIcon /></button>
            <div className="flex min-w-0 items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.02] py-1 pl-2.5 pr-1 text-[13px]">
              <FolderGit2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <h1 className="min-w-0 max-w-[10rem] truncate text-[#E1E0CC] sm:max-w-[16rem]">{project?.name ?? (loaded.status === "loading" ? "" : "Project")}</h1>
              {tree.status === "ready" && tree.value.branches.length > 0 && (
                <label className="relative ml-1 flex items-center gap-1 rounded-full bg-white/[0.05] py-0.5 pl-2 pr-1 text-[12px] text-gray-300">
                  <GitBranch aria-hidden className="h-3 w-3" /><span className="sr-only">Branch</span>
                  <select value={branch ?? tree.value.ref ?? ""} onChange={event => setBranch(event.target.value)} className="max-w-[7rem] cursor-pointer appearance-none truncate bg-transparent pr-1 outline-none">
                    {tree.value.branches.map(name => <option key={name} value={name} className="bg-[#141414]">{name}</option>)}
                  </select>
                </label>
              )}
              {runs.length > 0 && (
                <label className="relative ml-1 hidden items-center gap-1 rounded-full bg-white/[0.05] py-0.5 pl-2 pr-1 text-[12px] text-gray-300 sm:flex">
                  <HistoryIcon aria-hidden className="h-3 w-3" /><span className="sr-only">Run</span>
                  <select value={session?.id ?? "new"} onChange={event => setPickedRun(event.target.value)} disabled={working} className="max-w-[9rem] cursor-pointer appearance-none truncate bg-transparent pr-1 outline-none disabled:cursor-not-allowed">
                    {!session && <option value="new" className="bg-[#141414]">New run</option>}
                    {runs.map((run, index) => (
                      <option key={run.id} value={run.id} className="bg-[#141414]">
                        Run {runs.length - index} · {new Date(run.createdAt).toLocaleDateString(undefined, {day: "numeric", month: "short"})}{run.status === "FAILED" ? " · failed" : ""}
                      </option>
                    ))}
                    {session && <option value="new" className="bg-[#141414]">+ New run</option>}
                  </select>
                </label>
              )}
            </div>
            <AnimatePresence mode="wait">
              {session && (working || session.status === "FAILED") && (
                <motion.span key={working ? "working" : session.status} initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0}} transition={{duration: 0.25, ease: EASE}}
                  className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] px-2.5 py-0.5 text-[11px] text-gray-400 sm:flex">
                  <span className={working ? "text-shimmer" : "text-rose-200/80"}>{working ? (stream === "reconnecting" ? "Reconnecting" : "Working") : "Failed"}</span>
                </motion.span>
              )}
            </AnimatePresence>
            {activity.save !== "unknown" && <span className={`hidden text-[11px] sm:block ${activity.save === "saved" ? "text-gray-500" : "text-rose-300/80"}`}>{activity.save === "saved" ? "Changes saved" : "Save failed"}</span>}
            <div className="ml-auto flex items-center gap-1.5">
              {project && <ShareMenu account={account} projectId={projectId} />}
              <div role="tablist" aria-label="View" className="flex rounded-full border border-white/[0.07] p-0.5 text-[12px] lg:hidden">
                {(["chat", "files", "changes", "desktop"] as const).map(name => (
                  <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}
                    className={`rounded-full px-2.5 py-1 capitalize transition-colors duration-300 ${tab === name ? "bg-white/[0.08] text-[#E1E0CC]" : "text-gray-500"}`}>{name}</button>
                ))}
              </div>
              <button type="button" onClick={() => setShowDesktop(value => !value)} aria-pressed={showDesktop} aria-label={showDesktop ? "Hide desktop" : "Show desktop"} className={`${iconButton} hidden lg:flex`}>
                {showDesktop ? <PanelRightClose aria-hidden className="h-4 w-4" /> : <Monitor aria-hidden className="h-4 w-4" />}
              </button>
            </div>
          </header>

          {loaded.status === "loading" && (
            <div role="status" aria-label="Loading project" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pt-12">
              {[72, 48, 60].map(width => <span key={width} style={{width: `${width}%`}} className="h-4 animate-pulse rounded bg-white/[0.05]" />)}
            </div>
          )}
          {(loaded.status === "missing" || loaded.status === "error") && (
            <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-lg">{loaded.status === "missing" ? "Project not found" : "Something went wrong"}</p>
              <p className="max-w-sm text-sm text-gray-500">{loaded.status === "missing" ? "It may have been deleted, or it belongs to another account." : loaded.message}</p>
              <div className="flex gap-2">
                {loaded.status === "error" && <button type="button" onClick={() => { setLoaded({status: "loading"}); void refresh().catch(() => setLoaded({status: "error", message: "We couldn't load this project."})); }} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-black">Try again</button>}
                <Link to={workspacePath(account.username)} className="rounded-full border border-white/15 px-5 py-2.5 text-sm transition-colors hover:bg-white/5">All projects</Link>
              </div>
            </div>
          )}

          {project && (
            <div className="flex min-h-0 flex-1">
              <section aria-label="Conversation" className={`relative min-w-0 flex-1 flex-col ${tab === "chat" ? "flex" : "hidden"} lg:flex`}>
                <div ref={scroller} onScroll={event => { const el = event.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}
                  className="chat-scroll min-h-0 flex-1 overflow-y-auto">
                  {!session ? (
                    <motion.div initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} transition={{duration: 0.6, ease: EASE}} className="flex h-full items-center justify-center px-6">
                      <h2 className="text-center text-2xl tracking-[-0.02em] sm:text-3xl">What should we build in {project.name}?</h2>
                    </motion.div>
                  ) : (
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6">
                      {messages.map((message, index) => (
                        <div key={`${message.seq}-${index}`} className="contents">
                          {message.role === "user" ? (
                            <UserMessage content={message.content} canEdit={!working} onEdit={async text => (await submit(text, session.model, {...(session.effort ? {effort: session.effort} : {}), mode: session.mode})) !== false} />
                          ) : session.mode === "plan" && index === lastAssistant ? (
                            <PlanTool plan={parsePlan(message.content)} approved={false} approving={approving} onApprove={working ? undefined : () => void approvePlan(message.content)} />
                          ) : (
                            <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{duration: 0.45, ease: EASE}} className="min-w-0"><Markdown text={message.content} /></motion.div>
                          )}
                          {index === lastUser && runVisible && <RunActivity activity={activity} working={working} />}
                        </div>
                      ))}
                      {lastUser < 0 && runVisible && <RunActivity activity={activity} working={working} />}
                      {session.status === "FAILED" && !runVisible && session.error && (
                        <p role="alert" className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-100/80">{session.error}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative mx-auto w-full max-w-3xl px-3 pb-3 sm:px-6 sm:pb-5">
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-[#131211] to-transparent" />
                  <AnimatePresence initial={false}>
                    {queued.length > 0 && (
                      <motion.section key="queue" aria-label="Queued messages" initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: 6}} transition={{duration: 0.25, ease: EASE}}
                        className="mx-4 -mb-px rounded-t-2xl border border-b-0 border-white/[0.07] bg-[#1a1918] px-1.5 pb-1.5 pt-2">
                        <p className="px-2.5 pb-1 text-[11.5px] text-gray-500">Queued <span className="tabular-nums">{queued.length}</span></p>
                        <ul>
                          <AnimatePresence initial={false}>
                            {queued.map(item => (
                              <motion.li key={item.id} layout initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: "auto"}} exit={{opacity: 0, height: 0}} transition={{duration: 0.25, ease: EASE}} className="overflow-hidden">
                                <div className="group flex items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-1 hover:bg-white/[0.03]">
                                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#E1E0CC]/80" title={item.prompt}>{item.prompt}</span>
                                  {working && (
                                    <button type="button" onClick={() => void steerQueued(item)} disabled={queueBusy !== null} aria-label={`Steer with: ${item.prompt}`}
                                      className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC] disabled:opacity-40">
                                      <CornerDownRight aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />Steer
                                    </button>
                                  )}
                                  <button type="button" onClick={() => void removeQueued(item.id)} disabled={queueBusy !== null} aria-label={`Remove queued message: ${item.prompt}`}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC] disabled:opacity-40">
                                    <X aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      </motion.section>
                    )}
                  </AnimatePresence>
                  <Composer label="Message the agent" placeholder={session ? (working ? "Queue a follow-up, or steer the current run…" : "Ask for a change…") : "Describe what to build"}
                    models={composerModels(account.me)} session={session ? {model: session.model, effort: session.effort, mode: session.mode} : undefined}
                    onSubmit={async (prompt, model, options) => { const accepted = await submit(prompt, model, options); setRefreshKey(key => key + 1); return accepted; }}
                    isWorking={working} isStopping={stopping || activity.phase === "cancel"} onStop={() => void stop()} error={sendError} />
                </div>
              </section>

              <AnimatePresence initial={false}>
                {showDesktop && (
                  <motion.aside key="desktop" aria-label="Desktop" initial={{opacity: 0, width: 0}} animate={{opacity: 1, width: "46%"}} exit={{opacity: 0, width: 0}} transition={{duration: 0.5, ease: EASE}}
                    className="hidden min-h-0 shrink-0 overflow-hidden border-l border-white/[0.06] bg-[#181716] lg:block">
                    <div className="flex h-full flex-col">
                      <div role="tablist" aria-label="Panel" className="flex h-11 shrink-0 items-center gap-1 border-b border-white/[0.06] px-3">
                        {(["files", "changes", "desktop"] as const).map(name => (
                          <button key={name} type="button" role="tab" aria-selected={pane === name} onClick={() => setPane(name)}
                            className={`relative rounded-full px-3 py-1 text-[12px] capitalize transition-colors duration-300 ${pane === name ? "text-[#E1E0CC]" : "text-gray-500 hover:text-gray-300"}`}>
                            {pane === name && <motion.span layoutId="pane-pill" transition={{duration: 0.35, ease: EASE}} className="absolute inset-0 rounded-full bg-white/[0.07]" />}
                            <span className="relative">{name}</span>
                          </button>
                        ))}
                        {pane === "files" && <span className="ml-auto text-[11px] text-gray-600">Last saved version</span>}
                      </div>
                      <div className="min-h-0 flex-1">
                        {pane === "files" ? <FilesPanel tree={tree} loadFile={loadFile} refKey={branch ?? ""} /> : pane === "changes" ? changesPanel : <DesktopPanel account={account} sessionId={sessionId} running={live} ready={desktopReady} />}
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
              <section aria-label="Files" className={`min-h-0 flex-1 bg-[#181716] lg:hidden ${tab === "files" ? "block" : "hidden"}`}>
                {tab === "files" && <FilesPanel tree={tree} loadFile={loadFile} refKey={branch ?? ""} />}
              </section>
              <section aria-label="Changes" className={`min-h-0 flex-1 bg-[#181716] lg:hidden ${tab === "changes" ? "block" : "hidden"}`}>
                {tab === "changes" && changesPanel}
              </section>
              <section aria-label="Desktop" className={`min-h-0 flex-1 bg-[#181716] lg:hidden ${tab === "desktop" ? "block" : "hidden"}`}>
                {tab === "desktop" && <DesktopPanel account={account} sessionId={sessionId} running={live} ready={desktopReady} />}
              </section>
            </div>
          )}
        </>
      )}
    </WorkspaceShell>
  );
}

export default function WorkspacePage({account}: {account: ReadyAccount}) {
  const {projectId = ""} = useParams();
  return <Workspace key={projectId} account={account} projectId={projectId} />;
}
