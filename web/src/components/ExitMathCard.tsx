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

function Row({
  label,
  value,
  delta,
  large,
}: {
  label: string;
  value: string;
  delta?: number;
  large?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-secondary text-sm">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={`tabular font-semibold ${large ? "text-2xl" : "text-lg"}`}
        >
          {value}
        </span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
    </div>
  );
}

export function ExitMathCard({ exit }: { exit: ExitMath }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
        If you buy $500 now
      </h2>

      <div className="space-y-3">
        <Row
          label="You actually exit at"
          value={`$${exit.buy_500.exit_value.toFixed(0)}`}
          delta={exit.buy_500.delta_pct}
          large
        />

        <div className="border-t border-border pt-3 space-y-3">
          <Row
            label="If top-10 holders sell"
            value={`$${exit.cascade_500.exit_value.toFixed(0)}`}
            delta={exit.cascade_500.delta_pct}
          />
          <Row
            label="Exit liquidity lasts"
            value={`~${exit.time_to_exit_minutes} min`}
          />
          {exit.mev_tax_pct > 0 && (
            <Row
              label="MEV tax (est.)"
              value={`${exit.mev_tax_pct.toFixed(0)}%`}
            />
          )}
        </div>

        <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-secondary text-xs mb-0.5">Buy $100</div>
            <div className="tabular">
              ${exit.buy_100.exit_value.toFixed(0)}{" "}
              <Delta value={exit.buy_100.delta_pct} />
            </div>
          </div>
          <div>
            <div className="text-secondary text-xs mb-0.5">Buy $5,000</div>
            <div className="tabular">
              ${exit.buy_5000.exit_value.toFixed(0)}{" "}
              <Delta value={exit.buy_5000.delta_pct} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
