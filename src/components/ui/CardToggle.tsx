import type { MouseEvent } from "react";

interface CardToggleProps {
  // The name of the view the toggle switches to ("Teams", "Qualifying").
  label: string;
  onToggle: () => void;
  // Identifies the toggle to the snapshot capture script.
  name: string;
}

// CardToggle: the small accent pill at the top right of a card with two
// views. The click stops here so the card beneath doesn't also dive.
export default function CardToggle({ label, onToggle, name }: CardToggleProps) {
  function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onToggle();
  }
  return (
    <button type="button" className="ui-card-toggle" data-toggle={name} onClick={onClick}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5.5h8.5L8 3M14 10.5H5.5L8 13" />
      </svg>
      {label}
    </button>
  );
}
