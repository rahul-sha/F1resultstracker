"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_SECTIONS: { label: string; href: string }[] = [
  { label: "Results", href: "/results" },
  { label: "Standing", href: "/standings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-52 shrink-0 border-r px-4 py-6 flex flex-col gap-6"
      style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
    >
      <div>
        <Link href="/results" className="block leading-tight">
          <span className="block text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            F1
          </span>
          <span className="block text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Results
            <br />
            Tracker
          </span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {NAV_SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="rounded px-2 py-1.5 transition-colors"
              style={{
                background: active ? "var(--gridline)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <ThemeToggle />
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Data via Jolpica F1 API
        </div>
      </div>
    </aside>
  );
}
