import type {User} from "firebase/auth";

// Every authenticated API call needs a fresh ID token off the current user.
// One place to ask for it, so "not signed in" is reported the same way everywhere.
export function requireIdToken(user: User | null): Promise<string> {
  if (!user) throw new Error("Not signed in");
  return user.getIdToken();
}
