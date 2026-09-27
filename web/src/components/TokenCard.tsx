import Link from "next/link";
import type { RadarItem } from "@/lib/radar";

const VERDICT_STYLE: Record<
  RadarItem["verdict"],
  { emoji: string; color: string; bar: string }
> = {
  SAFE: { emoji: "🔵", color: "text-safe", bar: "bg-safe" },
  CAUTION: { emoji: "⚠️", color: "text-caution", bar: "bg-caution" },
  RISKY: { emoji: "🟠", color: "text-risky", bar: "bg-risky" },
  AVOID: { emoji: "🔴", color: "text-avoid", bar: "bg-avoid" },
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

function fmtPrice(n: number): string {
  if (n === 0) return "—";
  if (n < 0.00001) return n.toExponential(1);
  if (n < 0.01) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  return n.toFixed(2);
}

function Delta({ v }: { v: number | null }) {
  if (v === null || Number.isNaN(v))
    return <span className="text-secondary">—</span>;
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
    <span className={`tabular font-medium ${color}`}>
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
      className="block bg-card border border-border rounded-2xl p-4 hover:border-secondary/50 transition-all active:scale-[0.99] shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt=""
              className="w-11 h-11 rounded-full bg-border object-cover shrink-0 ring-1 ring-border"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-border flex items-center justify-center text-sm font-semibold shrink-0">
              {item.symbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate text-[15px]">
              ${item.symbol}
            </div>
            <div className="text-xs text-secondary truncate">{item.name}</div>
            <div className="text-[11px] text-secondary/80 tabular mt-0.5">
              ${fmtPrice(item.price_usd)}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className={`text-sm font-bold ${v.color}`}>
            {v.emoji} {item.combined_score}
          </div>
          <div className={`text-[10px] font-semibold tracking-wide ${v.color}`}>
            {item.verdict}
          </div>
        </div>
      </div>

      <div className="h-1 rounded-full bg-border mb-3 overflow-hidden">
        <div
          className={`h-full ${v.bar} transition-all`}
          style={{ width: `${Math.max(4, item.combined_score)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-secondary mb-0.5">
            Exit $500
          </div>
          <Delta v={item.exit_delta_500} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-secondary mb-0.5">
            Liq
          </div>
          <span className="tabular font-medium">
            {fmtUsd(item.liquidity_usd)}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-secondary mb-0.5">
            Age
          </div>
          <span className="tabular font-medium">
            {fmtAge(item.age_minutes)}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-secondary">
        <span>
          Vol 1h{" "}
          <span className="text-primary tabular font-medium">
            {fmtUsd(item.volume_1h_usd)}
          </span>
          {item.price_change_h1 !== null && (
            <>
              <span className="mx-1.5 opacity-30">·</span>
              1h <Delta v={item.price_change_h1} />
            </>
          )}
        </span>
        <span className="tabular">
          Rug{" "}
          <span className="text-primary font-semibold">
            {item.rug_probability}%
          </span>
        </span>
      </div>
    </Link>
  );
}
