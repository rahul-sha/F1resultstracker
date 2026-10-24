import Link from "next/link";
import type { ReactNode } from "react";

function Mark() {
  return (
    <span className="ui-logo-mark" aria-hidden="true">
      <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor">
        <path d="M0 14L6 0h4L4 14H0z" />
        <path d="M7 14L13 0h4L11 14H7z" />
        <path d="M14 14L20 0h2L16 14h-2z" />
      </svg>
    </span>
  );
}

interface LogoProps {
  // Where the logo takes you: a route (rendered as a link) or an action
  // (rendered as a button). Grid Walk uses the action to return to the
  // first card; every other page links home.
  href?: string;
  onClick?: () => void;
  label: string;
  className?: string;
}

// Logo: the Grid Walk mark and wordmark as one island. The wordmark is a
// separate span so narrow layouts can hide it and keep the mark.
export default function Logo({ href, onClick, label, className }: LogoProps) {
  const classes = "ui-island ui-logo" + (className ? " " + className : "");
  const inner: ReactNode = (
    <>
      <Mark />
      <span className="ui-logo-text">Grid Walk</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} aria-label={label} onClick={onClick}>
      {inner}
    </button>
  );
}
