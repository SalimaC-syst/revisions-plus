import "@fontsource-variable/lexend";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSetting } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const b = await getSetting("branding");
  return { title: { default: b.shortName, template: `%s · ${b.shortName}` }, description: b.tagline, robots: { index: false, follow: false } };
}
// Tarifs, charte et mentions légales sont modifiables dans l'admin : aucune page n'est figée au build.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f3a68" };

const HEX = /^#[0-9a-fA-F]{6}$/;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const b = await getSetting("branding");
  const primary = HEX.test(b.primary) ? b.primary : "#1f3a68";
  const accent = HEX.test(b.accent) ? b.accent : "#d99a1e";
  return (
    <html lang="fr">
      <head>
        <style>{`:root{--brand:${primary};--accent:${accent};}`}</style>
      </head>
      <body>
        <a className="skip" href="#contenu">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
