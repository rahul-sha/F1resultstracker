import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import PageTransition from "@/components/PageTransition";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";

export const metadata: Metadata = {
  title: "F1 Results Tracker",
  description: "Formula 1 race results, points and standings tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSeason = (await resolvePersistedSeason()) ?? currentSeason();

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          // Runs before paint so the stored theme choice applies without a
          // light-mode flash on first load.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("f1-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}var a=localStorage.getItem("f1-accent");if(a==="coffee"||a==="red"){document.documentElement.setAttribute("data-accent",a);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <div className="page-shell flex min-h-screen flex-col gap-6 p-4">
          <main className="min-w-0 flex-1 navbar-spacer">
            <PageTransition>{children}</PageTransition>
          </main>
          <NavBar initialSeason={initialSeason} />
        </div>
      </body>
    </html>
  );
}
