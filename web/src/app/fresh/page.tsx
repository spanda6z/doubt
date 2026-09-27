import Link from "next/link";
import { DiscoveryFeed } from "@/components/DiscoveryFeed";

export default function FreshPage() {
  return (
    <main className="min-h-dvh max-w-lg mx-auto px-4 py-4">
      <Link href="/" className="text-xs text-secondary hover:text-primary">
        ← Doubt
      </Link>
      <div className="mt-3">
        <DiscoveryFeed
          initialTab="fresh"
          title="Fresh"
          subtitle="Recently seen pairs. Fresh does not mean good."
        />
      </div>
    </main>
  );
}
