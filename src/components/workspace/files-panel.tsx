import {AnimatePresence, motion} from "framer-motion";
import {ChevronRight, File, Folder, FolderOpen} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import type {ProjectFile, ProjectTree} from "@/lib/api/projects";
import {EASE} from "@/lib/motion";

type Node = {name: string; path: string; children?: Node[]; size?: number};

function build(files: ProjectTree["files"]): Node[] {
  const root: Node = {name: "", path: "", children: []};
  for (const file of files) {
    let current = root;
    file.path.split("/").forEach((part, index, parts) => {
      const path = parts.slice(0, index + 1).join("/");
      const leaf = index === parts.length - 1;
      let next = current.children!.find(child => child.name === part && !!child.children === !leaf);
      if (!next) {
        next = leaf ? {name: part, path, size: file.size} : {name: part, path, children: []};
        current.children!.push(next);
      }
      current = next;
    });
  }
  const sort = (nodes: Node[]): Node[] => nodes
    .sort((a, b) => Number(!a.children) - Number(!b.children) || a.name.localeCompare(b.name))
    .map(node => node.children ? {...node, children: sort(node.children)} : node);
  return sort(root.children!);
}

const mono = {fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"};

function Tree({nodes, depth, open, toggle, selected, onSelect}: {nodes: Node[]; depth: number; open: Set<string>; toggle: (path: string) => void; selected: string | null; onSelect: (path: string) => void}) {
  return (
    <ul role={depth ? "group" : "tree"} aria-label={depth ? undefined : "Project files"}>
      {nodes.map(node => {
        const isOpen = open.has(node.path);
        return (
          <li key={node.path} role="treeitem" aria-expanded={node.children ? isOpen : undefined} aria-selected={node.path === selected}>
            <button type="button" onClick={() => node.children ? toggle(node.path) : onSelect(node.path)} style={{paddingLeft: 8 + depth * 14}}
              className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[12.5px] transition-colors duration-150 ${node.path === selected ? "bg-white/[0.07] text-[#E1E0CC]" : "text-gray-400 hover:bg-white/[0.04] hover:text-[#E1E0CC]"}`}>
              {node.children
                ? <><ChevronRight aria-hidden className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />{isOpen ? <FolderOpen aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary/60" /> : <Folder aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary/60" />}</>
                : <><span className="w-3 shrink-0" /><File aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-600" /></>}
              <span className="truncate">{node.name}</span>
            </button>
            <AnimatePresence initial={false}>
              {node.children && isOpen && (
                <motion.div initial={{height: 0, opacity: 0}} animate={{height: "auto", opacity: 1}} exit={{height: 0, opacity: 0}} transition={{duration: 0.25, ease: EASE}} className="overflow-hidden">
                  <Tree nodes={node.children} depth={depth + 1} open={open} toggle={toggle} selected={selected} onSelect={onSelect} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

type Loaded<T> = {status: "loading"} | {status: "error"; message: string} | {status: "ready"; value: T};

// Folder tree plus a read-only viewer for the project's last saved version.
export function FilesPanel({tree, loadFile, refKey}: {tree: Loaded<ProjectTree>; loadFile: (path: string) => Promise<ProjectFile>; refKey: string}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<Loaded<ProjectFile> | null>(null);
  const nodes = useMemo(() => tree.status === "ready" ? build(tree.value.files) : [], [tree]);

  useEffect(() => { setSelected(null); setFile(null); }, [refKey]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setFile({status: "loading"});
    loadFile(selected).then(value => !cancelled && setFile({status: "ready", value}),
      () => !cancelled && setFile({status: "error", message: "This file couldn't be opened."}));
    return () => { cancelled = true; };
  }, [selected, loadFile]);

  if (tree.status === "loading") return <div role="status" aria-label="Loading files" className="flex flex-col gap-2 p-4">{[60, 44, 52, 38].map(w => <span key={w} style={{width: `${w}%`}} className="h-3 animate-pulse rounded bg-white/[0.05]" />)}</div>;
  if (tree.status === "error") return <p role="alert" className="p-6 text-sm text-rose-200/80">{tree.message}</p>;
  if (tree.value.files.length === 0) return <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center"><Folder aria-hidden className="h-5 w-5 text-gray-600" /><p className="text-sm">No saved files yet</p><p className="text-[13px] text-gray-500">Files appear here after the agent saves the project.</p></div>;

  return (
    <div className="flex h-full min-h-0 flex-col sm:flex-row">
      <div className="max-h-[40%] min-h-0 shrink-0 overflow-y-auto border-b border-white/[0.06] p-2 sm:max-h-none sm:w-56 sm:border-b-0 sm:border-r">
        <Tree nodes={nodes} depth={0} open={open} selected={selected} onSelect={setSelected}
          toggle={path => setOpen(current => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next; })} />
        {tree.value.truncated && <p className="px-2 py-2 text-[11px] text-gray-500">Showing the first {tree.value.files.length} files.</p>}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {!file && <p className="p-6 text-[13px] text-gray-500">Select a file to view it.</p>}
        {file?.status === "loading" && <div role="status" aria-label="Loading file" className="flex flex-col gap-2 p-4">{[80, 64, 72].map(w => <span key={w} style={{width: `${w}%`}} className="h-3 animate-pulse rounded bg-white/[0.05]" />)}</div>}
        {file?.status === "error" && <p role="alert" className="p-6 text-sm text-rose-200/80">{file.message}</p>}
        {file?.status === "ready" && (
          <motion.div key={file.value.path} initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.3, ease: EASE}}>
            <div className="sticky top-0 border-b border-white/[0.06] bg-[#181716]/95 px-4 py-2 text-[12px] text-gray-400 backdrop-blur font-mono" style={mono}>{file.value.path}</div>
            {file.value.binary ? <p className="p-6 text-[13px] text-gray-500">Binary file, {file.value.size} bytes. Not shown.</p> : (
              <pre style={mono} className="font-mono [&_*]:font-mono p-4 text-[12px] leading-5 text-primary/80">
                {(file.value.content ?? "").split("\n").map((line, n) => (
                  <span key={n} className="flex"><span aria-hidden className="mr-4 w-8 shrink-0 select-none text-right text-gray-700">{n + 1}</span><span className="whitespace-pre-wrap break-all">{line || " "}</span></span>
                ))}
              </pre>
            )}
            {file.value.truncated && <p className="px-4 pb-4 text-[11px] text-gray-500">File truncated for display.</p>}
          </motion.div>
        )}
      </div>
    </div>
  );
}
