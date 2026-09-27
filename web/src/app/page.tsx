"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isValidMint } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [ca, setCa] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const mint = ca.trim();
    if (!isValidMint(mint)) {
      setError("That doesn't look like a Solana mint address.");
      return;
    }
    setError("");
    router.push(`/t/${mint}`);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Doubt</h1>
          <p className="text-secondary text-lg">
            The exit math before the entry.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ca"
              className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2"
            >
              Paste a Solana token CA
            </label>
            <input
              id="ca"
              type="text"
              value={ca}
              onChange={(e) => {
                setCa(e.target.value);
                setError("");
              }}
              placeholder="e.g. 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-safe/40 font-mono text-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {error && (
              <p className="mt-2 text-sm text-avoid">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-safe hover:bg-safe/90 text-white font-semibold rounded-xl py-3.5 transition-colors"
          >
            Check exit math
          </button>
        </form>

        <p className="text-center text-xs text-secondary leading-relaxed">
          Discovery only. No wallet. No swaps. No custody.
          <br />
          Not financial advice.
        </p>
      </div>
    </main>
  );
}
