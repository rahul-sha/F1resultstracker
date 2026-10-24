// Divider: the 1px hairline between groups inside an island.
export default function Divider({ className }: { className?: string }) {
  return <span className={"ui-divider" + (className ? " " + className : "")} aria-hidden="true" />;
}
