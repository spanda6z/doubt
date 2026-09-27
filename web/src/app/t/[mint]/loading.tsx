export default function VerdictLoading() {
  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="h-14 flex items-center px-4 border-b border-border">
        <span className="text-secondary text-sm">← Back</span>
      </header>
      <main className="flex-1 px-4 py-10 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-48 rounded-lg bg-card animate-pulse" />
          <div className="h-8 w-32 rounded-lg bg-card animate-pulse" />
          <div className="h-5 w-40 rounded bg-card animate-pulse" />
        </div>
        <div className="h-48 rounded-2xl bg-card animate-pulse" />
        <div className="h-36 rounded-2xl bg-card animate-pulse" />
        <p className="text-center text-secondary text-sm pt-4">
          Computing exit math…
        </p>
      </main>
    </div>
  );
}
