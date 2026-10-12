import {ArrowRight} from "lucide-react";
import {useEffect, useState, type FormEvent} from "react";
import {Link, useNavigate} from "react-router-dom";

import {AuthError, AuthShell, authInputClass, authPrimaryButtonClass, GoogleButton, OrDivider} from "@/components/auth/auth-shell";
import {FullScreenMessage} from "@/components/full-screen-message";
import {authErrorMessage, completeGoogleRedirect, signInWithGoogle, signUpWithEmail} from "@/lib/firebase/auth-actions";
import {useWorkspaceAccount} from "@/lib/workspace/use-account";

export default function SignUpPage() {
  const navigate = useNavigate();
  const account = useWorkspaceAccount();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account.status === "ready") navigate("/projects", {replace: true});
  }, [account, navigate]);

  useEffect(() => {
    void completeGoogleRedirect().then(message => { if (message) setError(message); });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await signUpWithEmail(String(form.get("email")), String(form.get("password")), String(form.get("name")).trim());
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
        <input name="name" autoComplete="name" placeholder="Your name" aria-label="Your name" required className={authInputClass} />
        <input name="email" type="email" autoComplete="email" placeholder="Email" aria-label="Email" required className={authInputClass} />
        <input name="password" type="password" autoComplete="new-password" placeholder="Password" aria-label="Password" minLength={8} required className={authInputClass} />
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
