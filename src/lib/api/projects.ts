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
