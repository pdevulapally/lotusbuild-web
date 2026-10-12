import {ArrowRight} from "lucide-react";
import {useEffect, useState, type FormEvent} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {checkDisplayName, checkEmail, checkNewPassword, LIMITS, safeNextPath} from "@/lib/security/validation";

import {AuthError, AuthShell, authInputClass, authPrimaryButtonClass, GoogleButton, OrDivider} from "@/components/auth/auth-shell";
import {FullScreenMessage} from "@/components/full-screen-message";
import {authErrorMessage, completeGoogleRedirect, signInWithGoogle, signUpWithEmail} from "@/lib/firebase/auth-actions";
import {useWorkspaceAccount} from "@/lib/workspace/use-account";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const account = useWorkspaceAccount();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account.status === "ready") navigate(safeNextPath(searchParams.get("next")), {replace: true});
  }, [account, navigate, searchParams]);

  useEffect(() => {
    void completeGoogleRedirect().then(message => { if (message) setError(message); });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = checkDisplayName(String(form.get("name") ?? ""));
    if (!name.ok) { setError(name.error); return; }
    const email = checkEmail(String(form.get("email") ?? ""));
    if (!email.ok) { setError(email.error); return; }
    const password = checkNewPassword(String(form.get("password") ?? ""), email.value);
    if (!password.ok) { setError(password.error); return; }
    setBusy(true);
    setError(null);
    try {
      await signUpWithEmail(email.value, password.value, name.value);
    } catch (failure) {
      setError(authErrorMessage(failure));
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (failure) {
      setError(authErrorMessage(failure));
      setBusy(false);
    }
  }

  if (account.status === "loading" || account.status === "ready") return <FullScreenMessage>Loading…</FullScreenMessage>;

  return (
    <AuthShell title="Start building.">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input name="name" autoComplete="name" maxLength={LIMITS.displayName} placeholder="Your name" aria-label="Your name" required className={authInputClass} />
        <input name="email" type="email" autoComplete="email" maxLength={LIMITS.email} placeholder="Email" aria-label="Email" required className={authInputClass} />
        <input name="password" type="password" autoComplete="new-password" maxLength={LIMITS.passwordMax} placeholder="Password" aria-label="Password" minLength={8} required className={authInputClass} />
        <button type="submit" disabled={busy} className={`mt-2 ${authPrimaryButtonClass}`}>
          Create account <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <OrDivider />
      <GoogleButton label="Sign up with Google" disabled={busy} onClick={google} />
      <AuthError message={error ?? (account.status === "error" ? account.message : null)} />
      <p className="text-sm text-gray-400">
        Already have an account? <Link to="/sign-in" className="text-primary underline underline-offset-4">Sign in</Link>
      </p>
    </AuthShell>
  );
}
