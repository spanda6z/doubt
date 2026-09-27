"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyVerdictRedirect() {
  const params = useParams();
  const router = useRouter();
  const mint = String(params?.mint || "");
  useEffect(() => {
    if (mint) router.replace(`/token/${mint}`);
  }, [mint, router]);
  return (
    <main className="min-h-dvh flex items-center justify-center text-secondary text-sm">
      Opening case file…
    </main>
  );
}
