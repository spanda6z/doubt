import type { ExitMath } from "@/lib/types";

function Delta({ value }: { value: number }) {
  const color =
    value <= -30 ? "text-avoid" : value <= -15 ? "text-risky" : "text-caution";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`tabular font-semibold ${color}`}>
      {sign}
      {value.toFixed(0)}%
    </span>
  );
}

export function ExitMathCard({ exit }: { exit: ExitMath }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
        If you buy $500 now
      </h2>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-secondary text-sm">You actually exit at</span>
          <span className="tabular text-2xl font-semibold">
            ${exit.buy_500.exit_value.toFixed(0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-secondary text-sm">That&apos;s</span>
          <Delta value={exit.buy_500.delta_pct} />
        </div>

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-secondary text-sm">
              If top-10 holders sell
            </span>
            <span className="tabular text-lg font-medium">
              ${exit.cascade_500.exit_value.toFixed(0)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-secondary text-sm">That&apos;s</span>
            <Delta value={exit.cascade_500.delta_pct} />
          </div>
        </div>

        <div className="border-t border-border pt-3 flex items-baseline justify-between gap-3">
          <span className="text-secondary text-sm">Exit liquidity lasts</span>
          <span className="tabular font-medium">
            ~{exit.time_to_exit_minutes} min
          </span>
        </div>

        {exit.mev_tax_pct > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-secondary text-sm">MEV tax (est.)</span>
            <span className="tabular text-caution">
              {exit.mev_tax_pct.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
