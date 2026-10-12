import {motion} from "framer-motion";
import {signOut} from "firebase/auth";
import {Loader2, MailCheck} from "lucide-react";
import {useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent} from "react";

import type {ReadyAccount} from "@/components/require-account";
import {ApiError} from "@/lib/api/client";
import {requestVerificationCode, verifyEmailCode} from "@/lib/api/email-verification";
import {auth} from "@/lib/firebase/client";
import {EASE} from "@/lib/motion";

const CODE_LENGTH = 6;
const FALLBACK_COOLDOWN_S = 60;

function storageKey(uid: string, name: string) {
  return `lb.verify.${uid}.${name}`;
}

function remaining(uid: string, name: string) {
  const deadline = Number(sessionStorage.getItem(storageKey(uid, name)) ?? 0);
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function VerifyEmail({account}: {account: ReadyAccount}) {
  const [digits, setDigits] = useState(() => Array<string>(CODE_LENGTH).fill(""));
  const [wait, setWait] = useState(() => remaining(account.user.uid, "resendAt"));
  const [expires, setExpires] = useState(() => remaining(account.user.uid, "expiresAt"));
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<{tone: "ok" | "error"; text: string} | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const requested = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWait(remaining(account.user.uid, "resendAt"));
      setExpires(remaining(account.user.uid, "expiresAt"));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [account.user.uid]);

  async function send() {
    if (sending || wait > 0) return;
    setSending(true);
    setNote(null);
    sessionStorage.setItem(storageKey(account.user.uid, "resendAt"), String(Date.now() + FALLBACK_COOLDOWN_S * 1000));
    setWait(FALLBACK_COOLDOWN_S);
    try {
      const result = await requestVerificationCode(await account.user.getIdToken());
      if (result.verified) {
        await account.recheck();
        return;
      }
      const now = Date.now();
      sessionStorage.setItem(storageKey(account.user.uid, "resendAt"), String(now + result.resendAfterSeconds * 1000));
      sessionStorage.setItem(storageKey(account.user.uid, "expiresAt"), String(now + result.expiresInSeconds * 1000));
      setWait(result.resendAfterSeconds);
      setExpires(result.expiresInSeconds);
      setDigits(Array<string>(CODE_LENGTH).fill(""));
      setNote({tone: "ok", text: "Code sent. Check your inbox and spam folder."});
      window.setTimeout(() => inputs.current[0]?.focus(), 0);
    } catch (failure) {
      const cooldown = failure instanceof ApiError ? failure.retryAfterSeconds : undefined;
      if (cooldown !== undefined) {
        sessionStorage.setItem(storageKey(account.user.uid, "resendAt"), String(Date.now() + cooldown * 1000));
        setWait(cooldown);
      } else {
        sessionStorage.removeItem(storageKey(account.user.uid, "resendAt"));
        setWait(0);
      }
      setNote({tone: "error", text: failure instanceof ApiError ? failure.message : "We couldn't send the code. Try again."});
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (requested.current || wait > 0) return;
    requested.current = true;
    void send();
  }, []);

  function applyCode(value: string) {
    const next = value.replace(/\D/g, "").slice(0, CODE_LENGTH).split("");
    setDigits(Array.from({length: CODE_LENGTH}, (_, index) => next[index] ?? ""));
    window.setTimeout(() => inputs.current[Math.min(next.length, CODE_LENGTH - 1)]?.focus(), 0);
  }

  function change(index: number, value: string) {
    if (value.replace(/\D/g, "").length > 1) {
      applyCode(value);
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits(current => current.map((item, position) => position === index ? digit : item));
    if (digit && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (event.key === "Enter" && digits.every(Boolean)) void verify();
  }

  function paste(event: ClipboardEvent<HTMLDivElement>) {
    const value = event.clipboardData.getData("text");
    if (!/\d/.test(value)) return;
    event.preventDefault();
    applyCode(value);
  }

  async function verify() {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH || checking) return;
    setChecking(true);
    setNote(null);
    try {
      await verifyEmailCode(await account.user.getIdToken(), code);
      setNote({tone: "ok", text: "Email verified. Opening your workspace…"});
      await account.recheck();
    } catch (failure) {
      setDigits(Array<string>(CODE_LENGTH).fill(""));
      setNote({tone: "error", text: failure instanceof ApiError ? failure.message : "We couldn't verify that code."});
      window.setTimeout(() => inputs.current[0]?.focus(), 0);
    } finally {
      setChecking(false);
    }
  }

  const complete = digits.every(Boolean);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#131211] px-5 text-[#E1E0CC]">
      <motion.section aria-labelledby="verify-title" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
        transition={{duration: 0.5, ease: EASE}}
        className="w-full max-w-[420px] rounded-[1.75rem] border border-white/[0.07] bg-[#181716] p-6 sm:p-8">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
          <MailCheck strokeWidth={1.6} className="h-5 w-5" />
        </span>
        <h1 id="verify-title" className="mt-6 text-[22px] font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-[14px] leading-6 text-gray-400">
          Enter the six-digit code sent to <span className="break-all text-[#E1E0CC]">{account.me.email}</span>.
        </p>

        <div role="group" aria-label="Six-digit verification code" onPaste={paste} className="mt-7 grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input key={index} ref={element => { inputs.current[index] = element; }} value={digit}
              onChange={event => change(index, event.target.value)} onKeyDown={event => keyDown(index, event)}
              inputMode="numeric" pattern="[0-9]*" maxLength={1} autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
              className="h-12 min-w-0 rounded-xl border border-white/[0.09] bg-white/[0.035] text-center text-[20px] font-semibold tabular-nums outline-none transition-colors focus:border-[#E1E0CC]/45 focus:bg-white/[0.055] sm:h-14" />
          ))}
        </div>

        <button type="button" onClick={() => void verify()} disabled={!complete || checking}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
          {checking && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          Verify email
        </button>

        <div className="mt-4 flex min-h-8 items-center justify-between gap-3 text-[13px]">
          <span className="text-gray-500">
            {expires > 0 ? `Code expires in ${Math.ceil(expires / 60)} min` : "Request a new code"}
          </span>
          <button type="button" onClick={() => void send()} disabled={wait > 0 || sending}
            className="shrink-0 text-[#E1E0CC] underline-offset-4 hover:underline disabled:text-gray-600 disabled:no-underline">
            {sending ? "Sending…" : wait > 0 ? `Resend in ${wait}s` : "Resend code"}
          </button>
        </div>

        <p role={note?.tone === "error" ? "alert" : "status"} aria-live="polite"
          className={`mt-3 min-h-5 text-center text-[13px] ${note?.tone === "error" ? "text-red-300" : "text-gray-400"}`}>
          {note?.text}
        </p>
        <p className="mt-4 border-t border-white/[0.06] pt-4 text-center text-[13px] text-gray-500">
          Wrong address? <button type="button" onClick={() => void signOut(auth)}
            className="text-[#E1E0CC] underline-offset-4 hover:underline">Sign out</button>
        </p>
      </motion.section>
    </main>
  );
}
