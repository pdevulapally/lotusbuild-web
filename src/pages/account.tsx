import {AnimatePresence, motion} from "framer-motion";
import {Button} from "@astryxdesign/core/Button";
import {TextInput} from "@astryxdesign/core/TextInput";
import {Token} from "@astryxdesign/core/Token";
import {sendPasswordResetEmail} from "firebase/auth";
import {ArrowLeft} from "lucide-react";
import {useEffect, useState} from "react";
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

export default function AccountPage({account}: {account: ReadyAccount}) {
  const [requests, setRequests] = useState<PrivacyRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PrivacyKind | "password" | null>(null);
  const [note, setNote] = useState<{tone: "ok" | "error"; text: string} | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [section, setSection] = useState<"general" | "security" | "data">("general");
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
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("");
  const sections = [
    {id: "general" as const, label: "General"},
    {id: "security" as const, label: "Security"},
    {id: "data" as const, label: "Data and privacy"},
  ];

  return (
    <main className="min-h-screen bg-[#131211] text-[#E1E0CC]">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link to={workspacePath(account.username)} className="flex items-center gap-1.5 text-[13px] text-gray-400 transition-colors hover:text-[#E1E0CC]">
            <ArrowLeft aria-hidden className="h-4 w-4" /> Projects
          </Link>
          <span className="mx-auto pr-14 text-[14px] font-medium">Account settings</span>
        </div>
      </header>
      <motion.div initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: 0.4, ease: EASE}}
        className="mx-auto grid max-w-5xl gap-8 px-4 py-7 sm:px-6 sm:py-10 md:grid-cols-[180px_minmax(0,1fr)] md:gap-14">
        <aside>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] md:mb-6">Account</h1>
          <nav aria-label="Account settings" className="mt-5 flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-2 md:mt-0 md:flex-col md:border-0 md:pb-0">
            {sections.map(item => (
              <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined}
                className={`shrink-0 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${section === item.id ? "bg-white/[0.07] text-[#E1E0CC]" : "text-gray-500 hover:bg-white/[0.035] hover:text-gray-300"}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 max-w-2xl">
          {section === "general" && (
            <section>
              <h2 className="text-[20px] font-semibold">General</h2>
              <p className="mt-1 text-[13px] text-gray-500">Your LotusBuild identity and current plan.</p>
              <div className="mt-7 flex items-center gap-4 border-b border-white/[0.07] pb-7">
                {account.user.photoURL?.startsWith("https://")
                  ? <img src={account.user.photoURL} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" />
                  : <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2a2926] text-[16px] font-semibold">{initials}</span>}
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium">{name}</p>
                  <p className="mt-0.5 truncate text-[13px] text-gray-500">@{account.username}</p>
                </div>
              </div>
              <dl className="divide-y divide-white/[0.07]">
                <div className="grid gap-2 py-5 sm:grid-cols-[150px_1fr] sm:items-center">
                  <dt className="text-[13px] text-gray-500">Email address</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-[14px]"><span className="truncate">{account.me.email}</span><Token label="Verified" size="sm" color="green" /></dd>
                </div>
                <div className="grid gap-3 py-5 sm:grid-cols-[150px_1fr] sm:items-center">
                  <dt className="text-[13px] text-gray-500">Plan</dt>
                  <dd className="flex items-center justify-between gap-4 text-[14px]"><span>{account.me.plan.name}</span><Button label="View plans" href="/pricing" variant="secondary" size="sm" /></dd>
                </div>
              </dl>
            </section>
          )}

          {section === "security" && (
            <section>
              <h2 className="text-[20px] font-semibold">Security</h2>
              <p className="mt-1 text-[13px] text-gray-500">Manage how you access your account.</p>
              <div className="mt-7 flex flex-col gap-4 border-y border-white/[0.07] py-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{usesPassword ? "Password" : "Sign-in provider"}</p>
                  <p className="mt-1 text-[13px] leading-5 text-gray-500">
                    {usesPassword ? "We’ll email you a secure link to set a new password." : "Your account is secured through your verified Google sign-in."}
                  </p>
                </div>
                {usesPassword
                  ? <Button label="Reset password" variant="secondary" size="sm" isLoading={busy === "password"} isDisabled={busy !== null} onClick={() => void resetPassword()} />
                  : <Token label="Google" size="sm" color="gray" />}
              </div>
              <p role={note?.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mt-4 text-[13px] leading-5 ${note?.tone === "error" ? "text-red-300" : "text-gray-400"}`}>{note?.text}</p>
            </section>
          )}

          {section === "data" && (
            <section>
              <h2 className="text-[20px] font-semibold">Data and privacy</h2>
              <p className="mt-1 max-w-xl text-[13px] leading-5 text-gray-500">Export your LotusBuild data or request account deletion. Requests are verified and answered by email.</p>
              <div className="mt-7 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">Export your data</p><p className="mt-1 text-[13px] leading-5 text-gray-500">Download a copy of your profile, projects, conversations, and usage.</p></div>
                  <Button label={exportOpen ? "Requested" : "Request export"} variant="secondary" size="sm" isLoading={busy === "access"} isDisabled={busy !== null || !requests || !!exportOpen} onClick={() => void request("access")} />
                </div>
                <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">Delete your account</p><p className="mt-1 text-[13px] leading-5 text-gray-500">Permanently removes your account, projects, and saved files.</p></div>
                  <Button label={erasureOpen ? "Requested" : "Delete account"} variant="destructive" size="sm" isDisabled={busy !== null || !requests || !!erasureOpen} onClick={() => setConfirming(value => !value)} />
                </div>
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
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <TextInput label="Confirm email" isLabelHidden type="email" value={typed} onChange={setTyped} placeholder={account.me.email} />
                    </div>
                    <Button label="Request deletion" type="submit" variant="destructive" isLoading={busy === "erasure"} isDisabled={busy !== null || typed.trim().toLowerCase() !== account.me.email.toLowerCase()} />
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          <p role={note?.tone === "error" ? "alert" : "status"} aria-live="polite" className={`text-[13px] leading-5 ${note ? "mt-4" : ""} ${note?.tone === "error" ? "text-red-300" : "text-gray-400"}`}>{note?.text}</p>

          <div className="mt-8">
            <h3 className="text-[14px] font-medium">Request history</h3>
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
            </section>
          )}
        </div>
      </motion.div>
    </main>
  );
}
