"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isValidMint } from "@/lib/api";
import type { VerdictResponse } from "@/lib/types";
import { VerdictView } from "@/components/VerdictView";

export default function VerdictPage() {
  const params = useParams();
  const mint = String(params?.mint || "").trim();
  const [data, setData] = useState<VerdictResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mint || !isValidMint(mint)) {
      setError("Invalid mint address");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const res = await fetch(`/api/v1/verdict/${mint}`, {
          headers: { accept: "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (body as { detail?: string }).detail ||
              `Failed to fetch verdict (${res.status})`
          );
        }
        if (!cancelled) setData(body as VerdictResponse);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Source unavailable");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mint]);

  if (!mint || !isValidMint(mint)) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center space-y-3">
          <p className="text-secondary text-sm">Invalid mint address</p>
          <Link href="/" className="text-safe text-sm hover:underline">
            ← Back to discovery
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-dvh max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-10 w-24 rounded-lg bg-card animate-pulse" />
        <div className="h-16 w-40 mx-auto rounded-xl bg-card animate-pulse" />
        <div className="h-8 w-48 mx-auto rounded bg-card animate-pulse" />
        <div className="h-40 rounded-2xl bg-card animate-pulse" />
        <div className="h-32 rounded-2xl bg-card animate-pulse" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-4xl">❓</p>
          <h1 className="text-xl font-semibold">Could not load verdict</h1>
          <p className="text-secondary text-sm">
            {error || "Source unavailable"}
          </p>
          <p className="text-secondary text-xs">
            Treat as unsafe until data is available.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-safe text-sm hover:underline"
            >
              Retry
            </button>
            <Link href="/" className="text-secondary text-sm hover:underline">
              ← Back to discovery
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <VerdictView data={data} />;
}
