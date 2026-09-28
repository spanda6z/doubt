"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Market", icon: "⌁" },
  { href: "/discover", label: "Discover", icon: "◈" },
  { href: "/watch", label: "Watch", icon: "☆" },
  { href: "/more", label: "More", icon: "•••" },
];

export function TerminalNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg/95 backdrop-blur-xl">
      <div className="mx-auto max-w-lg grid grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={"flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium " + (active ? "text-primary" : "text-secondary")}>
              <span className={"text-[15px] leading-none " + (active ? "opacity-100" : "opacity-60")}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
