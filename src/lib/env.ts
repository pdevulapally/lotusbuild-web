const env = import.meta.env as Record<string, string | undefined>;

// Accepts VITE_* or the NEXT_PUBLIC_* names the deployment already uses.
export function publicEnv(name: string): string | undefined {
  return env[`VITE_${name}`] || env[`NEXT_PUBLIC_${name}`] || undefined;
}
