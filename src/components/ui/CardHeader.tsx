import type { ReactNode } from "react";

interface CardHeaderProps {
  title: string;
  subtitle: string;
  // A control at the right of the header (a CardToggle).
  actions?: ReactNode;
  // A second graphic lower in the same card: the header gets a hairline
  // above it and some room.
  subsection?: boolean;
}

// CardHeader: a card's (or subsection's) title and one-line subtitle.
export default function CardHeader({ title, subtitle, actions, subsection }: CardHeaderProps) {
  const classes = ["ui-card-header"];
  if (actions) classes.push("ui-card-head");
  if (subsection) classes.push("ui-subsection");
  return (
    <div className={classes.join(" ")}>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
