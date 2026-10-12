import {motion} from "framer-motion";
import {sendEmailVerification, signOut} from "firebase/auth";
import {Loader2, MailCheck} from "lucide-react";
import {useEffect, useState} from "react";

import type {ReadyAccount} from "@/components/require-account";
import {authErrorMessage} from "@/lib/firebase/auth-actions";
import {auth} from "@/lib/firebase/client";
import {EASE} from "@/lib/motion";

const COOLDOWN_S = 60;
const POLL_MS = 6000;
const SENT_KEY = "lb.verify.sentAt";

function secondsLeft() {
  const sent = Number(sessionStorage.getItem(SENT_KEY) ?? 0);
  return Math.max(0, Math.ceil((sent + COOLDOWN_S * 1000 - Date.now()) / 1000));
}

// Shown instead of the workspace until the backend sees a verified email.
// Verification is only trusted from the backend's /me, never from local state.
export function VerifyEmail({account}: {account: ReadyAccount}) {
  const [wait, setWait] = useState(secondsLeft);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<{tone: "ok" | "error"; text: string} | null>(null);
  const {recheck} = account;

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait(secondsLeft()), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void recheck(); }, POLL_MS);
    const onFocus = () => void recheck();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [recheck]);

  async function resend() {
    if (wait > 0 || sending) return;
    setSending(true); setNote(null);
    try {
      await sendEmailVerification(account.user);
      sessionStorage.setItem(SENT_KEY, String(Date.now()));
      setWait(COOLDOWN_S);
      setNote({tone: "ok", text: "Sent. It can take a minute, so check spam too."});
    } catch (failure) {
      setNote({tone: "error", text: authErrorMessage(failure) ?? "We couldn't send the email. Try again."});
    } finally { setSending(false); }
  }

  async function check() {
    setChecking(true); setNote(null);
    await recheck();
    setChecking(false);
    setNote({tone: "error", text: "Not verified yet. Open the link in the email, then try again."});
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#131211] px-5 text-[#E1E0CC]">
      <motion.section aria-labelledby="verify-title" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{duration: 0.5, ease: EASE}}
        className="w-full max-w-[400px] rounded-[1.75rem] border border-white/[0.07] bg-[#181716] p-7 sm:p-8">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
          <MailCheck strokeWidth={1.6} className="h-5 w-5" />
        </span>
        <h1 id="verify-title" className="mt-6 text-[22px] font-bold tracking-tight">Verify your email</h1>
        <p className="mt-2 text-[14px] leading-6 text-gray-400">
          We sent a link to <span className="break-all text-[#E1E0CC]">{account.me.email}</span>. Open it, and this page continues on its own.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <button type="button" onClick={() => void check()} disabled={checking}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-60">
            {checking && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}I've verified
          </button>
          <button type="button" onClick={() => void resend()} disabled={wait > 0 || sending}
            className="h-11 rounded-full border border-white/10 text-[14px] transition-colors hover:bg-white/[0.04] disabled:text-gray-500 disabled:hover:bg-transparent">
            {sending ? "Sending…" : wait > 0 ? `Resend in ${wait}s` : "Resend email"}
          </button>
        </div>
        <p role={note?.tone === "error" ? "alert" : "status"} aria-live="polite"
          className={`mt-4 min-h-5 text-center text-[13px] ${note?.tone === "error" ? "text-red-300" : "text-gray-400"}`}>{note?.text}</p>
        <p className="mt-4 border-t border-white/[0.06] pt-4 text-center text-[13px] text-gray-500">
          Wrong address? <button type="button" onClick={() => void signOut(auth)} className="text-[#E1E0CC] underline-offset-4 hover:underline">Sign out</button>
        </p>
      </motion.section>
    </main>
  );
}
