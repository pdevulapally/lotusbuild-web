import {apiRequest} from "./client";

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
