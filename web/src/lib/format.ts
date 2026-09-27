export function fmtUsd(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(digits)}K`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(4)}`;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtAge(min: number | null | undefined): string {
  if (min == null) return "—";
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}

export function shortCa(ca: string, n = 4): string {
  if (!ca || ca.length < 10) return ca;
  return `${ca.slice(0, n)}…${ca.slice(-n)}`;
}
