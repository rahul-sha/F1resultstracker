"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import AccentToggle from "./AccentToggle";
import SeasonSelector from "./SeasonSelector";
import { ResultsIcon, PositionsIcon, AboutIcon, MenuIcon, CloseIcon } from "./nav-icons";

const DOCK_TABS = [
  { label: "Results", href: "/results", icon: <ResultsIcon /> },
  { label: "Positions", href: "/positions", icon: <PositionsIcon /> },
];

export default function BottomDock({ initialSeason }: { initialSeason: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      <nav className="dock">
        {DOCK_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href} className={"dock-tab" + (active ? " active" : "")}>
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}

        <div className="dock-season">
          <SeasonSelector initialSeason={initialSeason} />
        </div>

        <Link href="/about" className="dock-icon-btn" aria-label="About">
          <AboutIcon />
        </Link>

        <button
          type="button"
          className={"dock-icon-btn" + (menuOpen ? " menu-open" : "")}
          aria-label="Open appearance menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MenuIcon />
        </button>
      </nav>

      {menuOpen ? (
        <>
          <div className="dock-scrim" onClick={() => setMenuOpen(false)} />
          <div className="dock-sheet" ref={menuRef}>
            <div className="dock-sheet-header">
              <span>Appearance</span>
              <button
                type="button"
                className="dock-sheet-close"
                aria-label="Close"
                onClick={() => setMenuOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="dock-sheet-controls">
              <AccentToggle />
              <ThemeToggle />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
