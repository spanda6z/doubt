import Link from "next/link";
import type { RadarItem } from "@/lib/radar";

const VERDICT_STYLE: Record<
  RadarItem["verdict"],
  { emoji: string; color: string }
> = {
  SAFE: { emoji: "🔵", color: "text-safe" },
  CAUTION: { emoji: "⚠️", color: "text-caution" },
  RISKY: { emoji: "🟠", color: "text-risky" },
  AVOID: { emoji: "🔴", color: "text-avoid" },
};

function fmtAge(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function Delta({ v }: { v: number | null }) {
  if (v === null || Number.isNaN(v)) return null;
  const color =
    v <= -20
      ? "text-avoid"
      : v < 0
        ? "text-risky"
        : v > 5
          ? "text-safe"
          : "text-secondary";
  const sign = v > 0 ? "+" : "";
  return (
    <span className={`tabular ${color}`}>
      {sign}
      {v.toFixed(0)}%
    </span>
  );
}

export function TokenCard({ item }: { item: RadarItem }) {
  const v = VERDICT_STYLE[item.verdict];
  return (
    <Link
      href={`/t/${item.mint}`}
      className="block bg-card border border-border rounded-2xl p-4 hover:border-secondary/40 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt=""
              className="w-10 h-10 rounded-full bg-border object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center text-sm shrink-0">
              {item.symbol.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">${item.symbol}</div>
            <div className="text-xs text-secondary truncate">{item.name}</div>
          </div>
        </div>
        <div className={`text-sm font-semibold shrink-0 ${v.color}`}>
          {v.emoji} {item.combined_score}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <div className="text-secondary">
          Exit $500{" "}
          <span className="text-primary">
            <Delta v={item.exit_delta_500} />
          </span>
        </div>
        <div className="text-secondary text-right">
          Age{" "}
          <span className="text-primary tabular">{fmtAge(item.age_minutes)}</span>
        </div>
        <div className="text-secondary">
          Liq{" "}
          <span className="text-primary tabular">
            {fmtUsd(item.liquidity_usd)}
          </span>
        </div>
        <div className="text-secondary text-right">
          Vol 1h{" "}
          <span className="text-primary tabular">
            {fmtUsd(item.volume_1h_usd)}
          </span>
        </div>
        {item.price_change_h1 !== null && (
          <div className="text-secondary col-span-2">
            1h <Delta v={item.price_change_h1} />
            {item.price_change_m5 !== null && (
              <>
                {" "}· 5m <Delta v={item.price_change_m5} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs text-secondary">
        <span>
          Rug prob{" "}
          <span className="text-primary tabular font-medium">
            {item.rug_probability}%
          </span>
        </span>
        <span className={v.color}>{item.verdict}</span>
      </div>
    </Link>
  );
}
