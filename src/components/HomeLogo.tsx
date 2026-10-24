import { Logo } from "./ui";

// The Grid Walk logo as its own island, linking back to the home page.
// Used on About in place of a nav bar (Grid Walk has its own).
export default function HomeLogo() {
  return <Logo href="/" className="home-logo" label="Grid Walk: back to the home page" />;
}
