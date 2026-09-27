"use client";

import { useState } from "react";
import type { Reason } from "@/lib/types";

export function ReasonsList({ reasons }: { reasons: Reason[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reasons : reasons.slice(0, 3);
  const redCount = reasons.filter((r) => r.severity === "red").length;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <span className="text-avoid">🔴</span>
        {redCount > 0
          ? `${redCount} reason${redCount > 1 ? "s" : ""} not to buy`
          : "Flags"}
      </h2>

      <ul className="space-y-3 animate-stagger">
        {visible.map((r, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-snug">
            <span className="shrink-0 mt-0.5">
              {r.severity === "red" ? "•" : "·"}
            </span>
            <div>
              <span
                className={
                  r.severity === "red" ? "text-primary" : "text-secondary"
                }
              >
                {r.text}
              </span>
              {r.evidence && (
                <a
                  href={r.evidence}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-evidence mt-0.5 hover:underline"
                >
                  → view on solscan
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {reasons.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-secondary hover:text-primary transition-colors"
        >
          {expanded ? "Collapse ▲" : "Expand all ▼"}
        </button>
      )}
    </section>
  );
}
