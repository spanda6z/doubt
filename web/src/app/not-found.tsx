import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-5">
      <div className="max-w-sm text-center space-y-4">
        <p className="text-4xl">❓</p>
        <h1 className="text-xl font-semibold">
          That doesn&apos;t look like a Solana mint address.
        </h1>
        <Link
          href="/"
          className="inline-block mt-2 text-safe text-sm hover:underline"
        >
          Paste again
        </Link>
      </div>
    </main>
  );
}
