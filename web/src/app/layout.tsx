import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doubt — The exit math before the entry",
  description:
    "Honest exit math, reverse flow analysis, and narrative death prediction for Solana meme tokens. Discovery only. Not financial advice.",
  openGraph: {
    title: "Doubt",
    description: "The exit math before the entry.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-bg text-primary antialiased min-h-dvh">
        {children}
      </body>
    </html>
  );
}
