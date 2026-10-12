import {ApiError, apiRequest, baseUrl} from "./client";

// One project as returned by GET /projects (toResponse in the backend's projects/routes.ts).
export type Project = {
  id: string;
  name: string;
  description?: string;
  platform: string;
  status: string;
  publicPreviewEnabled: boolean;
  createdAt: string;
};

// One project the signed-in account owns. The backend answers 404 for projects it does not own.
export function getProject(token: string, projectId: string) {
  return apiRequest<Project>(`/projects/${encodeURIComponent(projectId)}`, {token});
}

// Lists the signed-in account's projects. The backend caps a page at 100.
export async function listProjects(token: string): Promise<Project[]> {
  const {projects} = await apiRequest<{projects: Project[]}>("/projects?limit=100", {token});
  return projects;
}

// Creates a project. Requires a verified email (requireVerifiedEmail gate) and
// returns the full created project, same shape as a list item.
export function createProject(token: string, input: {name: string; description?: string}) {
  return apiRequest<Project>("/projects", {method: "POST", token, body: input});
}

// Explicit deletion from the sidebar's project action.
export function deleteProject(token: string, projectId: string) {
  return apiRequest<void>(`/projects/${encodeURIComponent(projectId)}`, {method: "DELETE", token});
}

export type Visibility = "private" | "link" | "public";
export type ProjectTree = {head: string | null; ref: string | null; branches: string[]; files: {path: string; size: number}[]; truncated: boolean};
export type ProjectFile = {path: string; size: number; binary: boolean; content: string | null; truncated: boolean};
export type Share = {visibility: Visibility; shareToken: string | null};

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined));
  return search.size ? `?${search}` : "";
};

// The last saved version of the project, read by the backend from its git snapshot.
export function getProjectTree(token: string, projectId: string, ref?: string) {
  return apiRequest<ProjectTree>(`/projects/${encodeURIComponent(projectId)}/files${query({ref})}`, {token});
}
export function getProjectFile(token: string, projectId: string, path: string, ref?: string) {
  return apiRequest<ProjectFile>(`/projects/${encodeURIComponent(projectId)}/files/content${query({path, ref})}`, {token});
}

// Owner-only. Leaving "link" revokes the old link; rotateLink issues a new one.
export function getShare(token: string, projectId: string) {
  return apiRequest<Share>(`/projects/${encodeURIComponent(projectId)}/share`, {token});
}
export function setVisibility(token: string, projectId: string, visibility: Visibility, rotateLink = false) {
  return apiRequest<Share>(`/projects/${encodeURIComponent(projectId)}/visibility`, {method: "PATCH", token, body: {visibility, ...(rotateLink ? {rotateLink} : {})}});
}

// Anonymous, read-only views. The backend answers 404 for anything not shared with this token.
export type SharedProject = {project: {id: string; name: string; visibility: Visibility; createdAt: string}; messages: {seq: number; role: "user" | "assistant"; content: string; createdAt: string}[]};
export function getSharedProject(projectId: string, shareToken?: string) {
  return apiRequest<SharedProject>(`/shared/projects/${encodeURIComponent(projectId)}${query({token: shareToken})}`);
}
export function getSharedTree(projectId: string, shareToken?: string, ref?: string) {
  return apiRequest<ProjectTree>(`/shared/projects/${encodeURIComponent(projectId)}/files${query({token: shareToken, ref})}`);
}
export function getSharedFile(projectId: string, path: string, shareToken?: string, ref?: string) {
  return apiRequest<ProjectFile>(`/shared/projects/${encodeURIComponent(projectId)}/files/content${query({token: shareToken, path, ref})}`);
}

export type ProjectCommit = {sha: string; parent: string | null; committedAt: string; sessionId: string | null; message: string};
export type ChangedFile = {path: string; previousPath: string | null; additions: number | null; deletions: number | null};
export type ProjectChanges = {sha: string; files: ChangedFile[]; patch: string; truncated: boolean};

const SHA = /^[0-9a-f]{40,64}$/;

// Source: backend src/projects/content-routes.ts (owner-only, read from the saved git snapshot).
export async function listChanges(token: string, projectId: string): Promise<ProjectCommit[]> {
  const body = await apiRequest<{commits?: unknown}>(`/projects/${encodeURIComponent(projectId)}/changes`, {token});
  if (!Array.isArray(body.commits)) throw new Error("Invalid change history");
  return body.commits.filter((item): item is ProjectCommit =>
    !!item && typeof item === "object" && SHA.test((item as ProjectCommit).sha) && typeof (item as ProjectCommit).committedAt === "string");
}

export async function getChanges(token: string, projectId: string, sha: string): Promise<ProjectChanges> {
  if (!SHA.test(sha)) throw new Error("Invalid change");
  const body = await apiRequest<ProjectChanges>(`/projects/${encodeURIComponent(projectId)}/changes/${sha}`, {token});
  if (!Array.isArray(body.files) || typeof body.patch !== "string") throw new Error("Invalid changes");
  return body;
}

// Owner-only zip of the saved version; fetched with the token, then handed to the browser as a download.
export async function downloadProjectZip(token: string, projectId: string, fallbackName: string, ref?: string): Promise<void> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const response = await fetch(`${baseUrl()}/projects/${encodeURIComponent(projectId)}/archive${query}`, {
    headers: {Authorization: `Bearer ${token}`}, cache: "no-store",
  });
  if (!response.ok || response.headers.get("content-type") !== "application/zip") {
    throw new ApiError(response.status, "project/archive-failed", response.status === 404 ? "There's no saved version to download yet." : "The download couldn't be prepared. Try again.");
  }
  const match = /filename="([a-z0-9-]{1,60})\.zip"/.exec(response.headers.get("content-disposition") ?? "");
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), {href: url, download: `${match?.[1] ?? fallbackName}.zip`});
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function renameProject(token: string, projectId: string, name: string) {
  return apiRequest<Project>(`/projects/${encodeURIComponent(projectId)}`, {method: "PATCH", token, body: {name}});
}
