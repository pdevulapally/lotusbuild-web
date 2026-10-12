import {motion} from "framer-motion";
import {Eye, FolderGit2, GitBranch} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import ReactMarkdown from "react-markdown";
import {Link, useParams} from "react-router-dom";
import remarkGfm from "remark-gfm";

import {FilesPanel} from "@/components/workspace/files-panel";
import {getSharedFile, getSharedProject, getSharedTree, type ProjectTree, type SharedProject} from "@/lib/api/projects";
import {EASE} from "@/lib/motion";
import {isDocumentId} from "@/lib/security/validation";

type Loaded<T> = {status: "loading"} | {status: "error"; message: string} | {status: "ready"; value: T};

// Read-only view for link-only and public projects. The token lives in the URL
// fragment so it never reaches server logs or referrers; the backend checks it.
export default function SharedProjectPage() {
  const {projectId = ""} = useParams();
  const shareToken = /^#t=([A-Za-z0-9_-]{32})$/.exec(window.location.hash)?.[1];
  const valid = isDocumentId(projectId);
  const [shared, setShared] = useState<Loaded<SharedProject>>(valid ? {status: "loading"} : {status: "error", message: ""});
  const [branch, setBranch] = useState<string | undefined>();
  const [tree, setTree] = useState<Loaded<ProjectTree>>({status: "loading"});
  const [tab, setTab] = useState<"conversation" | "files">("conversation");

  useEffect(() => {
    if (!valid) return;
    getSharedProject(projectId, shareToken).then(value => setShared({status: "ready", value}), () => setShared({status: "error", message: ""}));
  }, [projectId, shareToken, valid]);
  useEffect(() => {
    if (shared.status !== "ready") return;
    setTree({status: "loading"});
    getSharedTree(projectId, shareToken, branch).then(value => setTree({status: "ready", value}), () => setTree({status: "error", message: "Files couldn't be loaded."}));
  }, [shared.status, projectId, shareToken, branch]);
  const loadFile = useCallback((path: string) => getSharedFile(projectId, path, shareToken, branch), [projectId, shareToken, branch]);

  if (shared.status !== "ready") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-black px-6 text-center text-[#E1E0CC]">
        {shared.status === "loading" ? <p role="status" className="text-shimmer text-sm">Opening project…</p> : <>
          <p className="text-lg">This project isn't available</p>
          <p className="max-w-sm text-sm text-gray-500">It may be private, the link may have been reset, or it doesn't exist.</p>
          <Link to="/" className="mt-2 rounded-full bg-[#E1E0CC] px-4 py-2 text-sm text-black">Go to LotusBuild</Link>
        </>}
      </main>
    );
  }
  const {project, messages} = shared.value;
  return (
    <main className="flex h-dvh flex-col bg-black text-[#E1E0CC]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 sm:px-5">
        <Link to="/" aria-label="LotusBuild home"><img src="/images/lotusbuild-logo.png" alt="" className="h-6 w-6" /></Link>
        <div className="flex min-w-0 items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.02] py-1 pl-2.5 pr-1 text-[13px]">
          <FolderGit2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <h1 className="min-w-0 max-w-[12rem] truncate">{project.name}</h1>
          {tree.status === "ready" && tree.value.branches.length > 0 && (
            <label className="ml-1 flex items-center gap-1 rounded-full bg-white/[0.05] py-0.5 pl-2 pr-1 text-[12px] text-gray-300">
              <GitBranch aria-hidden className="h-3 w-3" /><span className="sr-only">Branch</span>
              <select value={branch ?? tree.value.ref ?? ""} onChange={event => setBranch(event.target.value)} className="max-w-[7rem] appearance-none bg-transparent outline-none">
                {tree.value.branches.map(name => <option key={name} value={name} className="bg-[#141414]">{name}</option>)}
              </select>
            </label>
          )}
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-gray-400"><Eye aria-hidden className="h-3 w-3" />View only</span>
      </header>
      <div role="tablist" aria-label="View" className="flex shrink-0 gap-1 border-b border-white/[0.06] px-3 py-2 lg:hidden">
        {(["conversation", "files"] as const).map(name => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`rounded-full px-3 py-1 text-[12px] capitalize ${tab === name ? "bg-white/[0.07]" : "text-gray-500"}`}>{name}</button>)}
      </div>
      <div className="flex min-h-0 flex-1">
        <section aria-label="Conversation" className={`min-h-0 flex-1 overflow-y-auto ${tab === "conversation" ? "block" : "hidden"} lg:block`}>
          <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
            {messages.length === 0 && <p className="text-center text-sm text-gray-500">No conversation yet.</p>}
            {messages.map((message, index) => (
              <motion.div key={message.seq} initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: 0.4, delay: Math.min(index, 8) * 0.03, ease: EASE}}
                className={message.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-white/[0.06] px-4 py-2.5 text-[14px]" : "prose-chat text-[14px] leading-relaxed text-primary/85"}>
                {message.role === "user" ? message.content : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}
              </motion.div>
            ))}
          </div>
        </section>
        <aside aria-label="Files" className={`min-h-0 flex-1 border-white/[0.06] bg-[#0a0a0a] lg:block lg:max-w-[52%] lg:border-l ${tab === "files" ? "block" : "hidden"}`}>
          <FilesPanel tree={tree} loadFile={loadFile} refKey={branch ?? ""} />
        </aside>
      </div>
    </main>
  );
}
