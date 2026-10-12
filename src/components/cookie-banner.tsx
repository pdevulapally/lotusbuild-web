import {AnimatePresence, motion} from "framer-motion";
import {Cookie} from "lucide-react";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";

const STORAGE_KEY = "lb.consent.v1";
export const OPEN_CONSENT_EVENT = "lb:open-consent";

export type Consent = {version: 1; essential: true; optional: boolean; decidedAt: string};

export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Consent>;
    if (value.version !== 1 || value.essential !== true || typeof value.optional !== "boolean" || typeof value.decidedAt !== "string") return null;
    return value as Consent;
  } catch {
    return null;
  }
}

function saveConsent(optional: boolean) {
  const consent: Consent = {version: 1, essential: true, optional, decidedAt: new Date().toISOString()};
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent)); } catch { /* storage blocked: ask again next visit */ }
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  function decide(optional: boolean) {
    saveConsent(optional);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-live="polite"
          aria-label="Cookie preferences"
          initial={{opacity: 0, y: 24}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: 24}}
          transition={{duration: 0.45, ease: [0.22, 1, 0.36, 1]}}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#141210]/85 p-5 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Cookie aria-hidden className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] text-[#E1E0CC]">Your privacy, your choice</h2>
              <p className="mt-1.5 text-[13px] leading-6 text-gray-400">
                We use essential storage to keep you signed in and secure. Optional analytics stay off unless you allow them.{" "}
                <Link to="/privacy#cookies" className="text-primary underline underline-offset-4 hover:text-[#E1E0CC]">Cookie policy</Link>
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => decide(false)}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-[#E1E0CC] transition-colors hover:bg-white/5">
              Essential only
            </button>
            <button type="button" onClick={() => decide(true)}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90">
              Accept all
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
