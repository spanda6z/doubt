import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchVerdict, isValidMint } from "@/lib/api";
import { VerdictView } from "@/components/VerdictView";

export const dynamic = "force-dynamic";
export const revalidate = 30;

interface Props {
  params: { mint: string };
}

export default async function VerdictPage({ params }: Props) {
  const mint = params.mint?.trim();
  if (!mint || !isValidMint(mint)) {
    notFound();
  }

  let data;
  try {
    data = await fetchVerdict(mint);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Source unavailable";
    return (
      <main className="min-h-dvh flex items-center justify-center px-5">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-4xl">❓</p>
          <h1 className="text-xl font-semibold">Could not load verdict</h1>
          <p className="text-secondary text-sm">{message}</p>
          <p className="text-secondary text-xs">
            Treat as unsafe until data is available.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={`/t/${mint}`}
              className="text-safe text-sm hover:underline"
            >
              Retry
            </Link>
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
