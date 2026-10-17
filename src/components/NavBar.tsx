"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import AccentToggle from "./AccentToggle";
import SeasonSelector from "./SeasonSelector";
import { ResultsIcon, PositionsIcon, AboutIcon, MenuIcon, CloseIcon } from "./nav-icons";

const NAV_TABS = [
  { label: "Results", href: "/results", icon: <ResultsIcon /> },
  { label: "Positions", href: "/positions", icon: <PositionsIcon /> },
  { label: "About", href: "/about", icon: <AboutIcon /> },
];

// One nav bar, same look on every screen size: a content-hugging pill
// fixed to the bottom, Results/Positions/About scrollable on the left
// (hidden scrollbar), the season selector pinned on the right, and a
// hamburger that grows the bar itself upward into a panel holding the
// theme and palette toggles, rather than opening a separate sheet.
export default function NavBar({ initialSeason }: { initialSeason: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  return (
    <nav className="navbar" ref={navRef}>
      <div className={"navbar-menu" + (menuOpen ? " open" : "")}>
        <div className="navbar-menu-controls">
          <ThemeToggle />
          <AccentToggle />
        </div>
      </div>

      <div className="navbar-row">
        <div className="navbar-tabs">
          {NAV_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href} className={"navbar-tab" + (active ? " active" : "")}>
                {tab.icon}
                <span className="navbar-tab-label">{tab.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="navbar-season">
          <SeasonSelector initialSeason={initialSeason} />
        </div>

        <button
          type="button"
          className={"navbar-menu-btn" + (menuOpen ? " menu-open" : "")}
          aria-label={menuOpen ? "Close appearance menu" : "Open appearance menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
    </nav>
  );
}
