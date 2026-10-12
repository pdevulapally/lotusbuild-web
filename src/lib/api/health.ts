import {apiRequest} from "./client";

export type HealthStatus = {
  status: string;
  revision?: string;
};

// GET /health. Public, no token. The backend answers 500 when its configuration
// cannot be read, so a 200 here means the API is serving.
export function getHealth() {
  return apiRequest<HealthStatus>("/health");
}
