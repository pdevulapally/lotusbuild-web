import {AnimatePresence, motion} from "framer-motion";
import {Check, Copy, Globe, Link2, Lock, RotateCw} from "lucide-react";
import {useEffect, useState} from "react";

import type {ReadyAccount} from "@/components/require-account";
import {getShare, setVisibility, type Share, type Visibility} from "@/lib/api/projects";
import {EASE} from "@/lib/motion";

const OPTIONS: {value: Visibility; label: string; body: string; Icon: typeof Lock}[] = [
  {value: "private", label: "Private", body: "Only you can open this project.", Icon: Lock},
  {value: "link", label: "Link only", body: "Anyone with the secret link can view it, read-only.", Icon: Link2},
  {value: "public", label: "Public", body: "Anyone with the project URL can view it, read-only.", Icon: Globe},
];

export function shareUrl(projectId: string, share: Share) {
  const base = `${window.location.origin}/share/${encodeURIComponent(projectId)}`;
  return share.visibility === "link" && share.shareToken ? `${base}#t=${share.shareToken}` : base;
}

// Owner-only visibility control. Every change is made and enforced by the backend.
export function ShareMenu({account, projectId}: {account: ReadyAccount; projectId: string}) {
  const [isOpen, setIsOpen] = useState(false);
  const [share, setShare] = useState<Share | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    void account.user.getIdToken().then(token => getShare(token, projectId))
      .then(value => !cancelled && setShare(value), () => !cancelled && setError("Sharing settings couldn't be loaded."));
    return () => { cancelled = true; };
  }, [isOpen, account.user, projectId]);

  async function change(visibility: Visibility, rotateLink = false) {
    setBusy(true); setError(null);
    try { setShare(await setVisibility(await account.user.getIdToken(), projectId, visibility, rotateLink)); }
    catch { setError("That change wasn't saved. Try again."); }
    finally { setBusy(false); }
  }

  const current = OPTIONS.find(option => option.value === share?.visibility);
  const Icon = current?.Icon ?? Lock;
  return (
    <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}>
      <button type="button" aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setIsOpen(open => !open)}
        aria-label="Share"
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-[#E1E0CC] sm:w-auto sm:gap-1.5 sm:border sm:border-white/10 sm:px-3 sm:text-[12px] sm:text-[#E1E0CC]">
        <Icon aria-hidden strokeWidth={1.75} className="h-4 w-4 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline">Share</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div role="dialog" aria-label="Share project" initial={{opacity: 0, y: -6, scale: 0.98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: -6, scale: 0.98}} transition={{duration: 0.2, ease: EASE}}
            className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-xl border border-white/[0.09] bg-[#1d1c1a] p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)]">
            <p className="px-2.5 pb-1 pt-1.5 text-[13px]">Who can view this project</p>
            {OPTIONS.map(option => (
              <button key={option.value} type="button" disabled={busy || !share} onClick={() => option.value !== share?.visibility && void change(option.value)} aria-pressed={option.value === share?.visibility}
                className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-60">
                <option.Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                <span className="min-w-0 flex-1"><span className="block text-[13px]">{option.label}</span><span className="block text-[12px] text-gray-500">{option.body}</span></span>
                {option.value === share?.visibility && <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
            {share && share.visibility !== "private" && (
              <div className="mt-1 flex items-center gap-1 border-t border-white/[0.06] px-1 pt-2">
                <span className="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-gray-400">{shareUrl(projectId, share)}</span>
                <button type="button" aria-label="Copy link" onClick={() => void navigator.clipboard.writeText(shareUrl(projectId, share)).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06]">{copied ? <Check aria-hidden className="h-3.5 w-3.5 text-primary" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}</button>
                {share.visibility === "link" && <button type="button" aria-label="Reset link" title="Reset link (the old one stops working)" disabled={busy} onClick={() => void change("link", true)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06]"><RotateCw aria-hidden className="h-3.5 w-3.5" /></button>}
              </div>
            )}
            {error && <p role="alert" className="px-2.5 py-1.5 text-[12px] text-rose-200/80">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
