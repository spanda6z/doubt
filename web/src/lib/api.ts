import type { VerdictResponse } from "./types";

/**
 * Resolve API origin for both browser and server (Vercel SSR).
 * Relative /api paths break on the server without a host.
 */
async function getApiBase(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_API_BASE;
  if (explicit) return explicit.replace(/\/$/, "");

  // Browser: same origin
  if (typeof window !== "undefined") {
    return "";
  }

  // Server: prefer Vercel-provided host
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers() unavailable outside request context */
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://127.0.0.1:3000";
}

export async function fetchVerdict(mint: string): Promise<VerdictResponse> {
  const base = await getApiBase();
  const url = `${base}/api/v1/verdict/${mint}`;

  const res = await fetch(url, {
    next: { revalidate: 30 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ||
        `Failed to fetch verdict (${res.status})`
    );
  }

  return res.json();
}

export function isValidMint(mint: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint.trim());
}
