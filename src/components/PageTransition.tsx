"use client";

import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Re-keying on the route restarts the CSS animation below on every
  // navigation, giving each page its own fade-and-rise entrance instead of
  // just snapping to the new content.
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
