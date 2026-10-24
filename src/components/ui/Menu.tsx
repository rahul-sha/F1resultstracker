import type { ReactNode, Ref } from "react";

// Menu: a floating tonal list that drops from a pill (the season menu).
// Rendered inside a MenuAnchor so it hangs off its trigger.
export function MenuAnchor({
  open,
  className,
  children,
  ref,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={"ui-menu-anchor" + (open ? " open" : "") + (className ? " " + className : "")}>
      {children}
    </div>
  );
}

export function Menu({ children, ...rest }: { children: ReactNode; role?: string; "aria-label"?: string }) {
  return (
    <div className="ui-menu" {...rest}>
      {children}
    </div>
  );
}

interface MenuOptionProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function MenuOption({ active, onClick, children }: MenuOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={"ui-menu-option" + (active ? " active" : "")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
