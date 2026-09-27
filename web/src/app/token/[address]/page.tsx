"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { isValidMint } from "@/lib/api";
import { CaseFile } from "@/components/case/CaseFile";

export default function TokenCasePage() {
  const params = useParams();
  const address = String(params?.address || "").trim();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isValidMint(address)) {
      setError("Invalid Solana mint address");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/token/${address}`);
        const body = await res.json();
        if (!res.ok && res.status === 400) {
          throw new Error(body.error || "Invalid address");
        }
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load case");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!isValidMint(address)) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-secondary">Invalid Solana mint address</p>
          <Link href="/" className="text-safe text-sm">
            ← Home
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-dvh max-w-lg mx-auto px-4 py-6 space-y-3">
        <div className="h-8 w-20 bg-card animate-pulse rounded" />
        <div className="h-14 bg-card animate-pulse rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-card animate-pulse rounded-xl" />
        ))}
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-secondary">{error || "Unavailable"}</p>
          <Link href="/" className="text-safe text-sm">
            ← Home
          </Link>
        </div>
      </main>
    );
  }

  return <CaseFile data={data as never} />;
}
