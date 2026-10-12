// Turns a display name into the "username" URL segment of a workspace path.
// Falls back to a short slice of the uid (always present, unlike a display
// name) so every signed-in account resolves to some workspace URL.
export function usernameSlug(displayName: string | null | undefined, uid: string): string {
  const slug = (displayName ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || uid.slice(0, 8);
}

// The one place a workspace URL is assembled, so every caller (redirects,
// links, route guards) builds and reads the same shape.
export function workspacePath(username: string, projectId?: string): string {
  return projectId ? `/workspace/${username}/${projectId}` : `/workspace/${username}`;
}
