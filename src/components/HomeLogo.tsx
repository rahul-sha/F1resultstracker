import Link from "next/link";

// The Grid Walk logo as its own glass island, linking back to the home
// page. Used on About in place of a nav bar (Grid Walk has its own).
export default function HomeLogo() {
  return (
    <Link href="/" className="home-logo ui-island" aria-label="Grid Walk: back to the home page">
      <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor" aria-hidden="true">
        <path d="M0 14L6 0h4L4 14H0z" />
        <path d="M7 14L13 0h4L11 14H7z" />
        <path d="M14 14L20 0h2L16 14h-2z" />
      </svg>
      <span>Grid Walk</span>
    </Link>
  );
}
