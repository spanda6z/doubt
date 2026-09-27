import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        card: "#121214",
        border: "#1C1C1F",
        primary: "#F5F5F7",
        secondary: "#8A8A8E",
        safe: "#3B82F6",
        caution: "#E5A00D",
        risky: "#E5720D",
        avoid: "#D93025",
        "buy-btn": "#2A2A2E",
        evidence: "#5A9FD4",
      },
      fontSize: {
        verdict: ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        ticker: ["32px", { lineHeight: "1.2", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
export default config;
