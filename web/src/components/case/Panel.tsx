export function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/60">
        <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-secondary">
          {title}
        </h2>
        {right}
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

export function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[13px]">
      <span className="text-secondary shrink-0">{label}</span>
      <span
        className={`tabular text-right font-medium ${
          muted ? "text-secondary" : "text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function Unavailable({ reason }: { reason?: string }) {
  return (
    <p className="text-[13px] text-secondary leading-relaxed">
      <span className="text-caution font-medium">DATA UNAVAILABLE</span>
      {reason ? (
        <span className="block mt-1 text-xs opacity-80">{reason}</span>
      ) : null}
    </p>
  );
}
