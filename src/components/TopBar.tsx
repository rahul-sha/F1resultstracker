"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import AccentToggle from "./AccentToggle";
import SeasonSelector from "./SeasonSelector";
import type { ReactNode } from "react";
import { ResultsIcon, PositionsIcon, AboutIcon } from "./nav-icons";

const NAV_SECTIONS: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Results", href: "/results", icon: <ResultsIcon /> },
  { label: "Positions", href: "/positions", icon: <PositionsIcon /> },
  { label: "About", href: "/about", icon: <AboutIcon /> },
];

export default function TopBar({ initialSeason }: { initialSeason: number }) {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-nav">
        <Link href="/results" className="topbar-brand">
          F1<span> Results Tracker</span>
        </Link>
        <nav className="navlist">
          {NAV_SECTIONS.map((section) => {
            const active = pathname === section.href;
            return (
              <Link
                key={section.href}
                href={section.href}
                className={"navitem" + (active ? " active" : "")}
              >
                {section.icon}
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="topbar-controls flex items-center gap-2">
        <SeasonSelector initialSeason={initialSeason} />
        <AccentToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
