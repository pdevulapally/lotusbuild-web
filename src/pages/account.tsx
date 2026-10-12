import {AnimatePresence, motion} from "framer-motion";
import {sendPasswordResetEmail} from "firebase/auth";
import {ArrowLeft, BadgeCheck, Download, KeyRound, Loader2, Trash2, type LucideIcon} from "lucide-react";
import {useEffect, useState, type ReactNode} from "react";
import {Link} from "react-router-dom";

import type {ReadyAccount} from "@/components/require-account";
import {errorText} from "@/components/workspace/shell";
import {authErrorMessage} from "@/lib/firebase/auth-actions";
import {auth} from "@/lib/firebase/client";
import {listPrivacyRequests, submitPrivacyRequest, type PrivacyKind, type PrivacyRequest} from "@/lib/api/privacy";
import {EASE} from "@/lib/motion";
import {workspacePath} from "@/lib/workspace/slug";

const KIND_LABEL: Record<PrivacyKind, string> = {access: "Data export", erasure: "Account deletion", rectification: "Correction", complaint: "Complaint"};
const STATUS_LABEL = {RECEIVED: "Received", IN_PROGRESS: "In progress", COMPLETED: "Completed"} as const;
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric"});

function Section({title, description, children}: {title: string; description?: string; children: ReactNode}) {
  return (
    <section className="rounded-3xl border border-white/[0.07] bg-[#181716] p-5 sm:p-6">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {description && <p className="mt-1 text-[13px] leading-5 text-gray-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({Icon, title, body, action}: {Icon: LucideIcon; title: string; body: string; action: ReactNode}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
        <Icon strokeWidth={1.6} className="h-4 w-4 text-[#E1E0CC]/80" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px]">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-gray-500">{body}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

const button = "flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-[13px] transition-colors hover:bg-white/[0.05] disabled:opacity-50 disabled:hover:bg-transparent";

export default function AccountPage({account}: {account: ReadyAccount}) {
  const [requests, setRequests] = useState<PrivacyRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PrivacyKind | "password" | null>(null);
  const [note, setNote] = useState<{tone: "ok" | "error"; text: string} | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const usesPassword = account.user.providerData.some(item => item.providerId === "password");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listPrivacyRequests(await account.user.getIdToken());
        if (!cancelled) setRequests(list);
      } catch (failure) {
        if (!cancelled) setLoadError(errorText(failure, "Your requests couldn't be loaded."));
      }
    })();
    return () => { cancelled = true; };
  }, [account.user]);

  const open = (kind: PrivacyKind) => requests?.find(item => item.kind === kind && item.status !== "COMPLETED");

  async function request(kind: PrivacyKind) {
    setBusy(kind); setNote(null);
    try {
      const {request: created, message} = await submitPrivacyRequest(await account.user.getIdToken(), kind);
      setRequests(list => [created, ...(list ?? []).filter(item => item.kind !== kind)]);
      setNote({tone: "ok", text: message});
      setConfirming(false); setTyped("");
    } catch (failure) {
      setNote({tone: "error", text: errorText(failure, "Your request couldn't be sent. Try again.")});
    } finally { setBusy(null); }
  }

  async function resetPassword() {
    setBusy("password"); setNote(null);
    try {
      await sendPasswordResetEmail(auth, account.me.email);
      setNote({tone: "ok", text: `We sent a password reset link to ${account.me.email}.`});
    } catch (failure) {
      setNote({tone: "error", text: authErrorMessage(failure) ?? "We couldn't send the email. Try again."});
    } finally { setBusy(null); }
  }

  const exportOpen = open("access");
  const erasureOpen = open("erasure");
  const name = account.me.displayName || account.user.displayName || account.username;

  return (
    <main className="min-h-screen bg-[#131211] px-4 py-8 text-[#E1E0CC] sm:px-6 sm:py-12">
      <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{duration: 0.45, ease: EASE}} className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link to={workspacePath(account.username)} className="mb-2 flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-gray-400 transition-colors hover:text-[#E1E0CC]">
          <ArrowLeft aria-hidden className="h-4 w-4" /> Projects
        </Link>
        <h1 className="px-1 text-[28px] font-bold tracking-tight">Account</h1>

        <Section title="Profile">
          <dl className="grid gap-4 text-[14px] sm:grid-cols-[120px_1fr]">
            <dt className="text-gray-500">Name</dt><dd className="truncate">{name}</dd>
            <dt className="text-gray-500">Email</dt>
            <dd className="flex min-w-0 items-center gap-2"><span className="truncate">{account.me.email}</span>
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-primary"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Verified</span></dd>
            <dt className="text-gray-500">Plan</dt>
            <dd className="flex items-center gap-3">{account.me.plan.name}<Link to="/pricing" className="text-[13px] text-gray-400 underline-offset-4 hover:text-[#E1E0CC] hover:underline">Change plan</Link></dd>
          </dl>
        </Section>

        {usesPassword && (
          <Section title="Security">
            <Row Icon={KeyRound} title="Password" body="Get a secure link by email to set a new password."
              action={<button type="button" onClick={() => void resetPassword()} disabled={busy !== null} className={button}>
                {busy === "password" && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}Reset password</button>} />
          </Section>
        )}

        <Section title="Your data" description="Requests are checked by our team to protect your account. We reply by email, normally within one month, as UK GDPR requires.">
          <div className="divide-y divide-white/[0.06]">
            <Row Icon={Download} title="Export your data" body="A copy of your profile, projects, conversations and usage."
              action={<button type="button" onClick={() => void request("access")} disabled={busy !== null || !requests || !!exportOpen} className={button}>
                {busy === "access" && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}{exportOpen ? "Requested" : "Request export"}</button>} />
            <Row Icon={Trash2} title="Delete your account" body="Removes your account, projects and saved files for good. Billing records we must keep by law stay separate."
              action={<button type="button" onClick={() => setConfirming(value => !value)} disabled={busy !== null || !requests || !!erasureOpen}
                aria-expanded={confirming} aria-controls="delete-confirm"
                className={`${button} border-red-400/25 text-red-300 hover:bg-red-400/[0.06]`}>{erasureOpen ? "Requested" : "Delete account"}</button>} />
          </div>
          <AnimatePresence initial={false}>
            {confirming && !erasureOpen && (
              <motion.form id="delete-confirm" initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: "auto"}} exit={{opacity: 0, height: 0}} transition={{duration: 0.3, ease: EASE}}
                onSubmit={event => { event.preventDefault(); if (typed.trim().toLowerCase() === account.me.email.toLowerCase()) void request("erasure"); }}
                className="overflow-hidden">
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4">
                  <label htmlFor="confirm-email" className="text-[13px] leading-5 text-gray-300">
                    This can't be undone once it's carried out. Type <span className="text-[#E1E0CC]">{account.me.email}</span> to confirm.
                  </label>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input id="confirm-email" type="email" autoComplete="off" spellCheck={false} value={typed} maxLength={320} onChange={event => setTyped(event.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-[#131211] px-4 text-[14px] outline-none focus:border-red-300/40" />
                    <button type="submit" disabled={busy !== null || typed.trim().toLowerCase() !== account.me.email.toLowerCase()}
                      className="flex h-10 items-center justify-center gap-2 rounded-full bg-red-400/90 px-5 text-[13px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40">
                      {busy === "erasure" && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}Request deletion</button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          <p role={note?.tone === "error" ? "alert" : "status"} aria-live="polite" className={`text-[13px] leading-5 ${note ? "mt-4" : ""} ${note?.tone === "error" ? "text-red-300" : "text-gray-400"}`}>{note?.text}</p>

          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <h3 className="text-[13px] text-gray-500">Your requests</h3>
            {loadError ? <p role="alert" className="mt-2 text-[13px] text-red-300">{loadError}</p>
              : !requests ? <span className="mt-3 block h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
              : requests.length === 0 ? <p className="mt-2 text-[13px] text-gray-500">None yet.</p>
              : (
                <ul className="mt-2 flex flex-col">
                  {requests.map(item => (
                    <li key={item.reference} className="flex items-center gap-3 py-2 text-[13px]">
                      <span className="flex-1">{KIND_LABEL[item.kind]}<span className="ml-2 text-gray-500">{date(item.receivedAt)}</span></span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[12px] ${item.status === "COMPLETED" ? "border-primary/25 text-primary" : "border-white/10 text-gray-400"}`}>{STATUS_LABEL[item.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </Section>
      </motion.div>
    </main>
  );
}
