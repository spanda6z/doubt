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
  } catch {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-4xl">❓</p>
          <h1 className="text-xl font-semibold">Could not load verdict</h1>
          <p className="text-secondary text-sm">
            Source unavailable. Treat as unsafe.
          </p>
          <a
            href="/"
            className="inline-block mt-2 text-safe text-sm hover:underline"
          >
            ← Try another CA
          </a>
        </div>
      </main>
    );
  }

  return <VerdictView data={data} />;
}
