import {AnimatePresence, motion} from "framer-motion";
import {Check, Copy, PencilLine} from "lucide-react";
import {useRef, useState} from "react";

import {EASE} from "@/lib/motion";

const action = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC] focus-visible:text-[#E1E0CC] disabled:opacity-40";

// A sent prompt with ChatGPT-style copy and edit. Editing sends the revised text as a new message.
export function UserMessage({content, canEdit, onEdit}: {content: string; canEdit: boolean; onEdit: (text: string) => Promise<boolean>}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [sending, setSending] = useState(false);
  const field = useRef<HTMLTextAreaElement | null>(null);

  const fit = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 320)}px`; };
  // The editor mounts after the exit animation, so it is sized and focused when it attaches.
  const attach = (el: HTMLTextAreaElement | null) => {
    if (el && field.current !== el) { fit(el); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    field.current = el;
  };

  async function copy() {
    try { await navigator.clipboard.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked: nothing copied, no false confirmation */ }
  }
  async function save() {
    const text = draft.trim();
    if (!text || text === content.trim()) { setEditing(false); setDraft(content); return; }
    setSending(true);
    const accepted = await onEdit(text);
    setSending(false);
    if (accepted) setEditing(false);
  }

  return (
    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{duration: 0.45, ease: EASE}} className="group ml-auto flex w-full flex-col items-end">
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" initial={{opacity: 0, scale: 0.98}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0}} transition={{duration: 0.2, ease: EASE}}
            className="w-full max-w-[85%] rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            <label className="sr-only" htmlFor={`edit-${content.length}`}>Edit message</label>
            <textarea id={`edit-${content.length}`} ref={attach} value={draft} onChange={event => { setDraft(event.target.value); fit(event.target); }} rows={1}
              onKeyDown={event => { if (event.key === "Escape") { setEditing(false); setDraft(content); } if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void save(); }}
              className="chat-scroll w-full resize-none bg-transparent px-1 text-[15px] leading-6 text-[#E1E0CC] outline-none" />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setEditing(false); setDraft(content); }} className="h-8 rounded-full px-3.5 text-[13px] text-gray-300 hover:bg-white/[0.06]">Cancel</button>
              <button type="button" onClick={() => void save()} disabled={sending || !draft.trim()} className="h-8 rounded-full bg-[#E1E0CC] px-3.5 text-[13px] text-black hover:bg-white disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.15}}
            className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-white/[0.06] px-4 py-2.5 text-[15px] leading-6">{content}</motion.div>
        )}
      </AnimatePresence>
      {!editing && (
        <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button type="button" onClick={() => void copy()} aria-label={copied ? "Copied" : "Copy message"} title={copied ? "Copied" : "Copy"} className={action}>
            {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
          </button>
          {canEdit && <button type="button" onClick={() => { setDraft(content); setEditing(true); }} aria-label="Edit message" title="Edit" className={action}><PencilLine aria-hidden className="h-4 w-4" /></button>}
          <span aria-live="polite" className="sr-only">{copied ? "Copied to clipboard" : ""}</span>
        </div>
      )}
    </motion.div>
  );
}
