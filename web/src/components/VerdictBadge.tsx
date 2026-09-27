import type { VerdictType } from "@/lib/types";

const STYLES: Record<
  VerdictType,
  { emoji: string; color: string; label: string }
> = {
  SAFE: { emoji: "🔵", color: "text-safe", label: "SAFE" },
  CAUTION: { emoji: "⚠️", color: "text-caution", label: "CAUTION" },
  RISKY: { emoji: "🟠", color: "text-risky", label: "RISKY" },
  AVOID: { emoji: "🔴", color: "text-avoid", label: "AVOID" },
};

const HEADLINES: Record<VerdictType, string> = {
  SAFE: "Looks clean. Still your call.",
  CAUTION: "Some red flags. Read before you buy.",
  RISKY: "Multiple warning signs.",
  AVOID: "Hard pass.",
};

export function VerdictBadge({ verdict }: { verdict: VerdictType }) {
  const s = STYLES[verdict];
  return (
    <div className="text-center animate-fade-in space-y-1">
      <div className={`text-verdict ${s.color}`}>
        {s.emoji} {s.label}
      </div>
      <p className="text-secondary text-sm">{HEADLINES[verdict]}</p>
    </div>
  );
}
