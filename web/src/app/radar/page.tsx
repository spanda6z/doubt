import Link from "next/link";
import { DiscoveryFeed } from "@/components/DiscoveryFeed";

export default function RadarPage() {
  return (
    <main className="min-h-dvh max-w-lg mx-auto px-4 py-4">
      <Link href="/" className="text-xs text-secondary hover:text-primary">
        ← Doubt
      </Link>
      <div className="mt-3">
        <DiscoveryFeed
          initialTab="radar"
          title="Radar"
          subtitle="Tokens with observable market conditions. Not recommendations."
        />
      </div>
    </main>
  );
}
