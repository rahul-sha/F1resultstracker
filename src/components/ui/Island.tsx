import type { HTMLAttributes } from "react";

// Island: a floating container (the nav bar, the logo, the zoom island).
// Translucent on desktop and solid on phones; the look lives in ui.css as
// .ui-island, this just applies it. Position and layout come from the
// caller's own class.
export default function Island({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={"ui-island" + (className ? " " + className : "")} {...rest} />;
}
