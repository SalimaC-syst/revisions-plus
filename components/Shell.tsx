import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { logoutAction } from "@/app/actions/auth";

type NavItem = { href: string; label: string };

export async function Shell({ nav, children, right }: { nav: NavItem[]; children: React.ReactNode; right?: React.ReactNode }) {
  const b = await getSetting("branding");
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link className="brand" href="/">
            <span className="brand-logo" aria-hidden="true">
              {b.logoKey && b.logoAuthorized ? <img src="/api/branding/logo" alt="" /> : "SJ"}
            </span>
            <span>
              {b.shortName}
              <small>{b.schoolName}</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Navigation principale">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}>{n.label}</Link>
            ))}
            {right}
            <form action={logoutAction}>
              <button type="submit">Se déconnecter</button>
            </form>
          </nav>
        </div>
      </header>
      <main id="contenu">{children}</main>
      <Footer />
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <a href="/mentions-legales">Mentions légales</a>
      <a href="/cgv">Conditions de vente</a>
      <a href="/confidentialite">Confidentialité</a>
      <a href="/accessibilite">Accessibilité</a>
      <p className="small">Sans publicité · Données hébergées dans l'Union européenne</p>
    </footer>
  );
}
