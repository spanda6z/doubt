import type { VerdictResponse } from "./types";

/** Prefer same-origin Next API; override with NEXT_PUBLIC_API_BASE for external FastAPI. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export async function fetchVerdict(mint: string): Promise<VerdictResponse> {
  const url = `${API_BASE}/api/v1/verdict/${mint}`;
  const res = await fetch(url, {
    next: { revalidate: 30 },
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
