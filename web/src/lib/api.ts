import type { VerdictResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function fetchVerdict(mint: string): Promise<VerdictResponse> {
  const res = await fetch(`${API_BASE}/v1/verdict/${mint}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.detail || `Failed to fetch verdict (${res.status})`
    );
  }

  return res.json();
}

export function isValidMint(mint: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint.trim());
}
