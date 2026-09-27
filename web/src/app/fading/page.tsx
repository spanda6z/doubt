import Link from "next/link";
import { DiscoveryFeed } from "@/components/DiscoveryFeed";

export default function FadingPage() {
  return (
    <main className="min-h-dvh max-w-lg mx-auto px-4 py-4">
      <Link href="/" className="text-xs text-secondary hover:text-primary">
        ← Doubt
      </Link>
      <div className="mt-3">
        <DiscoveryFeed
          initialTab="fading"
          title="Fading"
          subtitle="Exit conditions deteriorating or elevated sell pressure."
        />
      </div>
    </main>
  );
}
