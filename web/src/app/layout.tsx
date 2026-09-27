import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Doubt — The exit math before the entry",
    template: "%s · Doubt",
  },
  description:
    "Solana meme-token discovery with honest exit math. Radar, Fresh, and Fading feeds. Not financial advice. No wallet. No swaps.",
  applicationName: "Doubt",
  keywords: [
    "Solana",
    "meme token",
    "exit liquidity",
    "token discovery",
    "rug check",
    "Doubt",
  ],
  openGraph: {
    title: "Doubt",
    description: "The exit math before the entry.",
    type: "website",
    siteName: "Doubt",
  },
  twitter: {
    card: "summary",
    title: "Doubt",
    description: "The exit math before the entry.",
  },
  robots: {
    index: true,
    follow: true,
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
